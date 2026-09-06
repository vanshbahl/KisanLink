from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.models.crop import CropListing
from app.models.logistics import RouteWaypoint, Shipment, ShipmentStatusEnum
from app.models.order import Order, OrderFarmerAllocation, OrderStatusEnum
from app.models.user import User
from app.schemas.logistics import (
    OTPVerificationOut,
    OptimizeRouteRequest,
    OptimizeRouteResponse,
    RouteWaypointOut,
    ShipmentDetailOut,
    ShipmentOut,
    ShipmentStatusUpdate,
    VerifyDeliveryOTPRequest,
    VerifyPickupOTPRequest,
)
from app.services.routing_service import routing_service


router = APIRouter()


@router.get("/shipments", response_model=List[ShipmentOut])
async def get_shipments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all shipments for logistics overview."""
    stmt = (
        select(Shipment)
        .options(
            selectinload(Shipment.order).selectinload(Order.crop_type),
            selectinload(Shipment.order).selectinload(Order.allocations),
            selectinload(Shipment.transporter),
        )
        .order_by(Shipment.created_at.desc())
    )
    res = await db.execute(stmt)
    shipments = res.scalars().all()

    output = []
    for s in shipments:
        crop_name = s.order.crop_type.name_en if s.order and s.order.crop_type else "Produce"
        order_code = s.order.order_code if s.order else str(s.order_id)
        qty = float(s.order.total_quantity_kg) if s.order else 0.0
        transporter_name = s.transporter.company_name if s.transporter else "KisanLink Express"

        output.append(
            ShipmentOut(
                id=s.id,
                order_id=s.order_id,
                order_code=order_code,
                transporter_id=s.transporter_id,
                transporter_name=transporter_name,
                crop_name=crop_name,
                total_quantity_kg=qty,
                total_distance_km=float(s.total_distance_km),
                freight_payout_rupees=float(s.freight_payout_rupees),
                status=s.status.value,
                created_at=s.created_at,
            )
        )
    return output


@router.get("/shipments/{shipment_id}", response_model=ShipmentDetailOut)
async def get_shipment_detail(
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve detailed shipment including sequence of route waypoints."""
    stmt = (
        select(Shipment)
        .options(
            selectinload(Shipment.order).selectinload(Order.crop_type),
            selectinload(Shipment.waypoints),
            selectinload(Shipment.transporter),
        )
        .where(Shipment.id == shipment_id)
    )
    res = await db.execute(stmt)
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    crop_name = s.order.crop_type.name_en if s.order and s.order.crop_type else "Produce"
    order_code = s.order.order_code if s.order else str(s.order_id)
    qty = float(s.order.total_quantity_kg) if s.order else 0.0
    transporter_name = s.transporter.company_name if s.transporter else "KisanLink Express"

    waypoints_out = [
        RouteWaypointOut(
            id=w.id,
            shipment_id=w.shipment_id,
            sequence_index=w.sequence_index,
            waypoint_type=w.waypoint_type,
            farmer_id=w.farmer_id,
            stop_name=w.stop_name,
            latitude=28.9931 + (i * 0.01),
            longitude=77.0151 + (i * 0.01),
            payload_weight_kg=float(w.payload_weight_kg),
            is_completed=w.is_completed,
        )
        for i, w in enumerate(sorted(s.waypoints, key=lambda x: x.sequence_index))
    ]

    return ShipmentDetailOut(
        id=s.id,
        order_id=s.order_id,
        order_code=order_code,
        transporter_id=s.transporter_id,
        transporter_name=transporter_name,
        crop_name=crop_name,
        total_quantity_kg=qty,
        total_distance_km=float(s.total_distance_km),
        freight_payout_rupees=float(s.freight_payout_rupees),
        status=s.status.value,
        created_at=s.created_at,
        waypoints=waypoints_out,
    )


@router.post("/routes/optimize", response_model=OptimizeRouteResponse)
async def optimize_route(
    req: OptimizeRouteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run Google OR-Tools VRP solver to generate optimal multi-stop farmgate pickup route."""
    # Find orders to optimize
    stmt = (
        select(Order)
        .options(
            selectinload(Order.allocations).selectinload(OrderFarmerAllocation.farmer),
            selectinload(Order.crop_type),
        )
        .order_by(Order.created_at.desc())
    )
    if req.order_ids:
        stmt = stmt.where(Order.id.in_(req.order_ids))

    res = await db.execute(stmt)
    orders = res.scalars().all()
    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No orders found to optimize")

    target_order = orders[0]

    # Build stop locations for OR-Tools solver
    stops = [
        {
            "id": "depot",
            "name": "Sonipat Central Hub",
            "lat": 28.9931,
            "lon": 77.0151,
            "demand_kg": 0,
            "type": "DEPOT",
        }
    ]

    farmer_stops = []
    for alloc in target_order.allocations:
        f_name = alloc.farmer.full_name if alloc.farmer else "Farm"
        village = alloc.farmer.village if alloc.farmer else "Village"
        farmer_stops.append(
            {
                "id": str(alloc.farmer_id),
                "farmer_id": alloc.farmer_id,
                "name": f"{f_name} ({village})",
                "lat": 29.0120 + (len(farmer_stops) * 0.015),
                "lon": 77.0310 + (len(farmer_stops) * 0.012),
                "demand_kg": float(alloc.allocated_kg),
                "type": "PICKUP",
            }
        )

    if not farmer_stops:
        farmer_stops.append(
            {
                "id": "default_farm",
                "farmer_id": None,
                "name": "Green Field Farm",
                "lat": 29.0120,
                "lon": 77.0310,
                "demand_kg": float(target_order.total_quantity_kg),
                "type": "PICKUP",
            }
        )

    stops.extend(farmer_stops)
    stops.append(
        {
            "id": "buyer_delivery",
            "name": "Main Delivery Hub, Delhi",
            "lat": 28.6139,
            "lon": 77.2090,
            "demand_kg": 0,
            "type": "DELIVERY",
        }
    )

    # Solve via OR-Tools Engine. A solver failure (bad input geometry, infeasible
    # capacity, etc.) is reported as a clear 500 rather than crashing the request
    # or silently returning an empty/misleading route.
    try:
        solution = routing_service.solve_vrp_route(stops, vehicle_capacity_kg=req.vehicle_capacity_kg)
    except Exception as exc:  # noqa: BLE001 - surfaced deliberately, not swallowed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route optimization failed: {exc}",
        )

    # Create or update Shipment DB record
    stmt_shipment = select(Shipment).where(Shipment.order_id == target_order.id)
    existing_shipment = (await db.execute(stmt_shipment)).scalar_one_or_none()

    if existing_shipment:
        shipment = existing_shipment
        shipment.total_distance_km = solution["total_distance_km"]
        shipment.freight_payout_rupees = round(solution["total_distance_km"] * 45.0, 2)
        shipment.status = ShipmentStatusEnum.ASSIGNED
    else:
        shipment = Shipment(
            order_id=target_order.id,
            total_distance_km=solution["total_distance_km"],
            freight_payout_rupees=round(solution["total_distance_km"] * 45.0, 2),
            status=ShipmentStatusEnum.ASSIGNED,
        )
        db.add(shipment)

    await db.flush()

    # Clear old waypoints and create new ordered waypoints
    stmt_del_w = select(RouteWaypoint).where(RouteWaypoint.shipment_id == shipment.id)
    old_w = (await db.execute(stmt_del_w)).scalars().all()
    for w in old_w:
        await db.delete(w)

    waypoints_out = []
    for idx, stop_index in enumerate(solution["sequence"]):
        stop_info = stops[stop_index]
        point_wkt = f"POINT({stop_info['lon']} {stop_info['lat']})"

        waypoint = RouteWaypoint(
            shipment_id=shipment.id,
            sequence_index=idx,
            waypoint_type=stop_info["type"],
            farmer_id=stop_info.get("farmer_id"),
            location=point_wkt,
            stop_name=stop_info["name"],
            payload_weight_kg=stop_info.get("demand_kg", 0.0),
            is_completed=False,
        )
        db.add(waypoint)
        await db.flush()

        waypoints_out.append(
            RouteWaypointOut(
                id=waypoint.id,
                shipment_id=shipment.id,
                sequence_index=idx,
                waypoint_type=stop_info["type"],
                farmer_id=stop_info.get("farmer_id"),
                stop_name=stop_info["name"],
                latitude=stop_info["lat"],
                longitude=stop_info["lon"],
                payload_weight_kg=stop_info.get("demand_kg", 0.0),
                is_completed=False,
            )
        )

    # Update order status to PICKUP_SCHEDULED
    target_order.status = OrderStatusEnum.PICKUP_SCHEDULED
    await db.commit()

    return OptimizeRouteResponse(
        shipment_id=shipment.id,
        order_id=target_order.id,
        total_distance_km=solution["total_distance_km"],
        estimated_duration_minutes=solution["estimated_duration_minutes"],
        trips_reduced=solution["trips_reduced"],
        utilization_pct=solution["utilization_pct"],
        waypoints=waypoints_out,
    )


@router.post("/pickups/verify-otp", response_model=OTPVerificationOut)
async def verify_pickup_otp(
    req: VerifyPickupOTPRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify farmgate 6-digit OTP to complete produce pickup."""
    stmt = (
        select(OrderFarmerAllocation)
        .options(selectinload(OrderFarmerAllocation.order))
        .order_by(OrderFarmerAllocation.id.desc())
    )
    if req.allocation_id:
        stmt = stmt.where(OrderFarmerAllocation.id == req.allocation_id)

    res = await db.execute(stmt)
    allocations = res.scalars().all()

    matched_alloc = None
    for alloc in allocations:
        if alloc.pickup_verification_otp == req.otp:
            matched_alloc = alloc
            break

    if not matched_alloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit farmgate pickup OTP code.",
        )

    matched_alloc.is_picked_up = True

    if matched_alloc.order:
        matched_alloc.order.status = OrderStatusEnum.IN_TRANSIT

        # Update shipment status
        stmt_s = select(Shipment).where(Shipment.order_id == matched_alloc.order_id)
        s = (await db.execute(stmt_s)).scalar_one_or_none()
        if s:
            s.status = ShipmentStatusEnum.IN_TRANSIT

    await db.commit()

    return OTPVerificationOut(
        success=True,
        message="Farmgate pickup verified! Produce loaded and shipment marked in transit.",
        status="IN_TRANSIT",
        is_settled=False,
    )


@router.post("/deliveries/verify-otp", response_model=OTPVerificationOut)
async def verify_delivery_otp(
    req: VerifyDeliveryOTPRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify buyer 6-digit OTP to complete delivery and trigger escrow settlement."""
    stmt = select(Order).options(selectinload(Order.allocations)).where(Order.id == req.order_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        # Try matching by order_code or OTP across active orders
        stmt_all = select(Order).options(selectinload(Order.allocations))
        all_orders = (await db.execute(stmt_all)).scalars().all()
        for ord_item in all_orders:
            if ord_item.delivery_otp == req.otp:
                order = ord_item
                break

    if not order or order.delivery_otp != req.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit buyer delivery OTP code.",
        )

    order.status = OrderStatusEnum.DELIVERED

    # Settle allocations and payout escrow
    for alloc in order.allocations:
        alloc.is_settled = True

    # Update shipment status
    stmt_s = select(Shipment).where(Shipment.order_id == order.id)
    s = (await db.execute(stmt_s)).scalar_one_or_none()
    if s:
        s.status = ShipmentStatusEnum.DELIVERED

    await db.commit()

    return OTPVerificationOut(
        success=True,
        message="Buyer delivery verified! Shipment delivered and escrow payouts settled.",
        status="DELIVERED",
        is_settled=True,
    )


@router.patch("/shipments/{shipment_id}/status", response_model=ShipmentOut)
async def update_shipment_status(
    shipment_id: UUID,
    req: ShipmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update shipment operational status (UNASSIGNED, ASSIGNED, PICKUP_IN_PROGRESS, LOADED, IN_TRANSIT, DELIVERED)."""
    stmt = select(Shipment).options(selectinload(Shipment.order)).where(Shipment.id == shipment_id)
    res = await db.execute(stmt)
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    try:
        new_status = ShipmentStatusEnum(req.status.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status enum value. Must be one of {[e.value for e in ShipmentStatusEnum]}",
        )

    s.status = new_status
    await db.commit()

    order_code = s.order.order_code if s.order else str(s.order_id)
    qty = float(s.order.total_quantity_kg) if s.order else 0.0

    return ShipmentOut(
        id=s.id,
        order_id=s.order_id,
        order_code=order_code,
        transporter_id=s.transporter_id,
        transporter_name="KisanLink Express",
        crop_name="Produce",
        total_quantity_kg=qty,
        total_distance_km=float(s.total_distance_km),
        freight_payout_rupees=float(s.freight_payout_rupees),
        status=s.status.value,
        created_at=s.created_at,
    )
