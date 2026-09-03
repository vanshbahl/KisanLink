import math
from datetime import datetime, timezone
from typing import List, Tuple
from uuid import UUID

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    BuyerRequirement,
    CropListing,
    FarmerProfile,
    CropType,
    DynamicCluster,
    ClusterItem,
    ClusterStatusEnum,
    ListingStatusEnum,
)
from app.schemas.match import DynamicClusterOut, FarmerMatchItem


class MatchingEngine:
    """
    KisanLink Phase 3 Multi-Criteria Matching & Dynamic Cluster Formulation Engine.
    Implements 5-Factor Weighted Utility Scoring:
    Score = 0.30*S_dist + 0.25*S_price + 0.20*S_time + 0.15*S_rel + 0.10*S_quality
    """

    @staticmethod
    async def find_candidate_listings(
        db: AsyncSession,
        requirement: BuyerRequirement,
    ) -> List[Tuple[CropListing, FarmerProfile, str, float, float, float]]:
        """
        Queries active crop listings compatible with buyer requirement.
        Returns list of tuples: (listing, farmer_profile, crop_name, lat, lon, distance_km).
        """
        ref_geom = requirement.delivery_location

        stmt = (
            select(
                CropListing,
                FarmerProfile,
                CropType.name_en.label("crop_name"),
                func.ST_X(CropListing.location.cast(Geometry)).label("lon"),
                func.ST_Y(CropListing.location.cast(Geometry)).label("lat"),
                (func.ST_Distance(CropListing.location, ref_geom) / 1000.0).label("dist_km"),
            )
            .join(FarmerProfile, CropListing.farmer_id == FarmerProfile.id)
            .join(CropType, CropListing.crop_type_id == CropType.id)
            .where(
                CropListing.crop_type_id == requirement.crop_type_id,
                CropListing.status == ListingStatusEnum.ACTIVE,
                CropListing.available_quantity_kg > 0,
                CropListing.expected_price_per_kg <= requirement.max_price_per_kg,
            )
        )

        if requirement.acceptable_grades:
            stmt = stmt.where(CropListing.quality_grade.in_(requirement.acceptable_grades))

        stmt = stmt.order_by("dist_km")
        res = await db.execute(stmt)
        rows = res.all()

        output = []
        for listing, farmer, c_name, item_lon, item_lat, dist_km in rows:
            output.append((listing, farmer, c_name, float(item_lat), float(item_lon), float(dist_km)))
        return output

    @staticmethod
    def calculate_match_score(
        listing: CropListing,
        farmer: FarmerProfile,
        distance_km: float,
        requirement: BuyerRequirement,
        min_price: float,
        max_price: float,
    ) -> float:
        """Calculates 5-factor weighted match score (0.0 to 1.0)."""
        # 1. Distance Score (0.30 weight, max 100km)
        s_dist = max(0.0, 1.0 - (distance_km / 100.0))

        # 2. Price Score (0.25 weight)
        if max_price > min_price:
            s_price = max(0.0, 1.0 - ((float(listing.expected_price_per_kg) - min_price) / (max_price - min_price + 0.01)))
        else:
            s_price = 1.0

        # 3. Time Score (0.20 weight)
        req_deadline_date = (
            requirement.delivery_deadline.date()
            if isinstance(requirement.delivery_deadline, datetime)
            else requirement.delivery_deadline
        )
        if listing.harvest_date <= req_deadline_date:
            s_time = 1.0
        else:
            s_time = 0.5

        # 4. Reputation Score (0.15 weight)
        s_rel = float(farmer.reputation_score or 5.0) / 5.0

        # 5. Quality Score (0.10 weight)
        grade_weights = {"GRADE_A": 1.0, "GRADE_B": 0.8, "PROCESSING_GRADE": 0.6}
        s_quality = grade_weights.get(listing.quality_grade.value if hasattr(listing.quality_grade, "value") else str(listing.quality_grade), 0.8)

        total_score = 0.30 * s_dist + 0.25 * s_price + 0.20 * s_time + 0.15 * s_rel + 0.10 * s_quality
        return round(total_score, 4)

    @classmethod
    async def generate_and_save_cluster(
        cls,
        db: AsyncSession,
        requirement: BuyerRequirement,
    ) -> DynamicClusterOut:
        """Generates dynamic cluster for requirement and persists to database."""
        candidates = await cls.find_candidate_listings(db, requirement)

        if not candidates:
            raise ValueError(f"No suitable active farmer listings found for requirement {requirement.id}")

        prices = [float(c[0].expected_price_per_kg) for c in candidates]
        min_p = min(prices)
        max_p = max(prices)

        scored_candidates = []
        for listing, farmer, c_name, item_lat, item_lon, dist_km in candidates:
            score = cls.calculate_match_score(
                listing, farmer, dist_km, requirement, min_p, max_p
            )
            scored_candidates.append((score, listing, farmer, c_name, item_lat, item_lon, dist_km))

        # Rank by match score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        target_kg = float(requirement.target_quantity_kg)
        accumulated_kg = 0.0
        allocated_items = []
        cluster_farmers = []
        lat_sum = 0.0
        lon_sum = 0.0
        total_farm_cost = 0.0

        for index, (score, listing, farmer, c_name, item_lat, item_lon, dist_km) in enumerate(scored_candidates):
            if accumulated_kg >= target_kg:
                break

            needed_kg = target_kg - accumulated_kg
            available_kg = float(listing.available_quantity_kg)
            allocated_kg = min(available_kg, needed_kg)

            if allocated_kg <= 0:
                continue

            accumulated_kg += allocated_kg
            unit_price = float(listing.expected_price_per_kg)
            payout = allocated_kg * unit_price
            total_farm_cost += payout

            lat_sum += item_lat * allocated_kg
            lon_sum += item_lon * allocated_kg

            allocated_items.append({
                "listing": listing,
                "farmer": farmer,
                "allocated_kg": allocated_kg,
                "unit_price": unit_price,
                "pickup_index": len(allocated_items) + 1,
            })

            cluster_farmers.append(
                FarmerMatchItem(
                    farmer_id=farmer.id,
                    name=farmer.full_name,
                    location=farmer.district,
                    distance_km=round(dist_km, 1),
                    listing_id=listing.id,
                    crop_name=c_name,
                    quality_grade=listing.quality_grade.value if hasattr(listing.quality_grade, "value") else str(listing.quality_grade),
                    available_kg=available_kg,
                    allocated_kg=allocated_kg,
                    unit_price=unit_price,
                    payout_rupees=round(payout, 2),
                    match_score=score,
                )
            )

        if accumulated_kg <= 0:
            raise ValueError(f"Could not allocate any quantity for requirement {requirement.id}")

        avg_farm_price = round(total_farm_cost / accumulated_kg, 2)
        estimated_freight_rupees = round(accumulated_kg * 2.20, 2)
        total_delivered_price_per_kg = round(avg_farm_price + 2.20, 2)
        traditional_wholesale = round(total_delivered_price_per_kg * 1.18, 2)
        buyer_savings_pct = round(((traditional_wholesale - total_delivered_price_per_kg) / traditional_wholesale) * 100.0, 1)

        centroid_lat = lat_sum / accumulated_kg
        centroid_lon = lon_sum / accumulated_kg

        # Persist DynamicCluster to PostgreSQL
        cluster = DynamicCluster(
            requirement_id=requirement.id,
            total_quantity_kg=accumulated_kg,
            average_farm_price_per_kg=avg_farm_price,
            estimated_freight_rupees=estimated_freight_rupees,
            total_delivered_price_per_kg=total_delivered_price_per_kg,
            cluster_centroid=WKTElement(f"POINT({centroid_lon} {centroid_lat})", srid=4326),
            status=ClusterStatusEnum.PROPOSED,
        )
        db.add(cluster)
        await db.flush()

        # Persist ClusterItem records
        for item_data in allocated_items:
            c_item = ClusterItem(
                cluster_id=cluster.id,
                listing_id=item_data["listing"].id,
                farmer_id=item_data["farmer"].id,
                allocated_quantity_kg=item_data["allocated_kg"],
                agreed_price_per_kg=item_data["unit_price"],
                pickup_order_index=item_data["pickup_index"],
            )
            db.add(c_item)

        requirement.status = "MATCHED"
        await db.commit()

        # Fetch crop name
        stmt_crop = select(CropType.name_en).where(CropType.id == requirement.crop_type_id)
        res_crop = await db.execute(stmt_crop)
        crop_name = res_crop.scalar_one_or_none() or "Produce"

        fulfillment_pct = round((accumulated_kg / target_kg) * 100.0, 1)

        explanations = [
            f"Fulfills {fulfillment_pct}% of requested {target_kg} kg target volume.",
            f"Geographic compactness: Farm cluster centered near ({round(centroid_lat, 2)}, {round(centroid_lon, 2)}).",
            f"Direct sourcing delivers {buyer_savings_pct}% cost savings over APMC wholesale benchmarks.",
        ]

        return DynamicClusterOut(
            cluster_id=cluster.id,
            requirement_id=requirement.id,
            crop_name=crop_name,
            total_quantity_kg=accumulated_kg,
            fulfillment_percentage=fulfillment_pct,
            average_farm_price_per_kg=avg_farm_price,
            estimated_freight_rupees=estimated_freight_rupees,
            total_delivered_price_per_kg=total_delivered_price_per_kg,
            traditional_wholesale_benchmark=traditional_wholesale,
            buyer_savings_percentage=buyer_savings_pct,
            status=cluster.status,
            farmers=cluster_farmers,
            explanation=explanations,
            created_at=cluster.created_at or datetime.now(timezone.utc),
        )
