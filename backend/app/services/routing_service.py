import math
from typing import List, Tuple, Dict, Any
from uuid import UUID

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great Circle distance between two lat/lon points in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class RouteOptimizationService:
    @staticmethod
    def solve_vrp_route(
        stops: List[Dict[str, Any]],
        vehicle_capacity_kg: float = 1500.0,
    ) -> Dict[str, Any]:
        """
        Solves Capacitated Vehicle Routing Problem (CVRP) for multi-farm pickup -> delivery hub using OR-Tools.

        `stops` is a list of dicts:
          [
            {"id": "depot", "name": "Sonipat Hub", "lat": 28.9931, "lon": 77.0151, "demand_kg": 0, "type": "DEPOT"},
            {"id": farmer_id_1, "name": "Farm A", "lat": 29.0120, "lon": 77.0310, "demand_kg": 400, "type": "PICKUP"},
            ...
            {"id": buyer_id, "name": "Main Delivery Hub", "lat": 28.6139, "lon": 77.2090, "demand_kg": 0, "type": "DELIVERY"}
          ]
        """
        if not stops or len(stops) < 2:
            return {
                "sequence": list(range(len(stops))),
                "total_distance_km": 0.0,
                "estimated_duration_minutes": 0,
                "utilization_pct": 0.0,
                "trips_reduced": 0,
            }

        num_locations = len(stops)

        # 1. Create Distance Matrix (in meters for OR-Tools integer solver)
        distance_matrix = []
        for i in range(num_locations):
            row = []
            for j in range(num_locations):
                if i == j:
                    row.append(0)
                else:
                    d_km = haversine_distance_km(
                        stops[i]["lat"], stops[i]["lon"], stops[j]["lat"], stops[j]["lon"]
                    )
                    row.append(int(d_km * 1000))  # convert km to meters
            distance_matrix.append(row)

        # 2. Setup OR-Tools Routing Model
        manager = pywrapcp.RoutingIndexManager(num_locations, 1, 0)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add Capacity Constraint if demands are provided
        demands = [int(s.get("demand_kg", 0)) for s in stops]

        def demand_callback(from_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimension(
            demand_callback_index,
            0,  # null capacity slack
            int(vehicle_capacity_kg),  # vehicle max capacity
            True,  # start count at zero
            "Capacity",
        )


        # Set Search Parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )

        # Solve
        solution = routing.SolveWithParameters(search_parameters)

        ordered_sequence = []
        total_distance_meters = 0

        if solution:
            index = routing.Start(0)
            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                ordered_sequence.append(node)
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                total_distance_meters += routing.GetArcCostForVehicle(previous_index, index, 0)

            # Append final end node if not present
            end_node = manager.IndexToNode(index)
            if end_node not in ordered_sequence:
                ordered_sequence.append(end_node)
        else:
            ordered_sequence = list(range(num_locations))
            total_distance_meters = sum(distance_matrix[i][i + 1] for i in range(num_locations - 1))

        total_dist_km = round(total_distance_meters / 1000.0, 2)
        # Estimate average speed 40 km/h -> duration minutes = dist * 1.5 + 15 mins stop time per pickup
        pickup_stops_count = sum(1 for s in stops if s.get("type") == "PICKUP")
        duration_minutes = int(total_dist_km * 1.5) + (pickup_stops_count * 15)

        total_pickup_kg = sum(s.get("demand_kg", 0) for s in stops)
        utilization_pct = round(min(100.0, (total_pickup_kg / max(1.0, vehicle_capacity_kg)) * 100.0), 1)
        trips_reduced = max(0, pickup_stops_count - 1)

        return {
            "sequence": ordered_sequence,
            "total_distance_km": total_dist_km,
            "estimated_duration_minutes": duration_minutes,
            "utilization_pct": utilization_pct,
            "trips_reduced": trips_reduced,
        }


routing_service = RouteOptimizationService()
