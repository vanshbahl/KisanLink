import random
import string
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user, require_buyer, require_farmer
from app.models import (
    User,
    Order,
    OrderStatusEnum,
    OrderFarmerAllocation,
    DynamicCluster,
    ClusterItem,
    ClusterStatusEnum,
    BuyerRequirement,
    RequirementStatusEnum,
    CropListing,
    CropType,
    PaymentsLedger,
    LedgerEntryTypeEnum,
)
from app.schemas.order import OrderOut, OrderFarmerAllocationOut, LockEscrowRequest
from app.schemas.payment import PaymentsLedgerOut

router = APIRouter(prefix="/orders", tags=["Orders"])


import uuid

def generate_order_code() -> str:
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"ORD-2026-{unique_suffix}"


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=4))


@router.post("/from-cluster/{cluster_id}", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order_from_cluster(
    cluster_id: UUID,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """
    Buyer accepts procurement plan and converts Dynamic Cluster into a confirmed Order.
    Atomic transaction block with row-level locks on crop listings to prevent over-allocation.
    """
    if not current_user.buyer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer profile required.")

    # Load cluster with requirement and cluster items
    stmt = (
        select(DynamicCluster)
        .options(
            selectinload(DynamicCluster.requirement),
            selectinload(DynamicCluster.cluster_items),
        )
        .where(DynamicCluster.id == cluster_id)
    )
    res = await db.execute(stmt)
    cluster = res.scalar_one_or_none()

    if not cluster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dynamic supply cluster not found.")

    if cluster.requirement.buyer_id != current_user.buyer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to place an order for this cluster.",
        )

    if cluster.status == ClusterStatusEnum.CONFIRMED or cluster.status == ClusterStatusEnum.FULFILLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An order has already been created for this supply cluster.",
        )

    # Calculate total gross amount
    gross_amount = round(
        float(cluster.total_quantity_kg) * float(cluster.total_delivered_price_per_kg), 2
    )

    # 1. Create Order record
    order = Order(
        order_code=generate_order_code(),
        buyer_id=current_user.buyer_profile.id,
        cluster_id=cluster.id,
        crop_type_id=cluster.requirement.crop_type_id,
        total_quantity_kg=cluster.total_quantity_kg,
        gross_amount_rupees=gross_amount,
        status=OrderStatusEnum.CONFIRMED,
        delivery_otp=generate_otp(),
    )
    db.add(order)
    await db.flush()

    # 2. Iterate cluster items, row-lock crop listings, create allocations, and update available stock
    for item in cluster.cluster_items:
        # Row-level lock to prevent concurrency double-allocation
        stmt_listing = select(CropListing).where(CropListing.id == item.listing_id).with_for_update()
        res_listing = await db.execute(stmt_listing)
        listing = res_listing.scalar_one_or_none()

        if not listing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Crop listing {item.listing_id} no longer exists.",
            )

        allocated_kg = float(item.allocated_quantity_kg)
        if float(listing.available_quantity_kg) < allocated_kg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient available stock for listing {listing.id}. Requested {allocated_kg}kg, available {listing.available_quantity_kg}kg.",
            )

        # Deduct available stock
        listing.available_quantity_kg = float(listing.available_quantity_kg) - allocated_kg

        payout = round(allocated_kg * float(item.agreed_price_per_kg), 2)
        allocation = OrderFarmerAllocation(
            order_id=order.id,
            farmer_id=item.farmer_id,
            listing_id=item.listing_id,
            allocated_kg=allocated_kg,
            farmer_payout_amount_rupees=payout,
            pickup_verification_otp=generate_otp(),
        )
        db.add(allocation)

    # 3. Update Cluster and Requirement status
    cluster.status = ClusterStatusEnum.CONFIRMED
    cluster.requirement.status = RequirementStatusEnum.ORDER_CREATED

    await db.commit()

    return await get_order_by_id(id=order.id, current_user=current_user, db=db)


@router.get("/my-orders", response_model=List[OrderOut])
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns orders for current user.
    - Buyer: Returns orders placed by buyer.
    - Farmer: Returns orders containing allocations for farmer.
    """
    output = []

    if current_user.buyer_profile:
        stmt = (
            select(Order)
            .options(
                selectinload(Order.crop_type),
                selectinload(Order.buyer),
                selectinload(Order.allocations).selectinload(OrderFarmerAllocation.farmer),
                selectinload(Order.allocations).selectinload(OrderFarmerAllocation.listing),
            )
            .where(Order.buyer_id == current_user.buyer_profile.id)
            .order_by(Order.created_at.desc())
        )
        res = await db.execute(stmt)
        orders = res.scalars().all()
        for ord_obj in orders:
            output.append(format_order_out(ord_obj))

    elif current_user.farmer_profile:
        stmt = (
            select(Order)
            .join(OrderFarmerAllocation, Order.id == OrderFarmerAllocation.order_id)
            .options(
                selectinload(Order.crop_type),
                selectinload(Order.buyer),
                selectinload(Order.allocations).selectinload(OrderFarmerAllocation.farmer),
                selectinload(Order.allocations).selectinload(OrderFarmerAllocation.listing),
            )
            .where(OrderFarmerAllocation.farmer_id == current_user.farmer_profile.id)
            .order_by(Order.created_at.desc())
        )
        res = await db.execute(stmt)
        orders = res.scalars().all()
        for ord_obj in orders:
            output.append(format_order_out(ord_obj, filter_farmer_id=current_user.farmer_profile.id))

    return output


@router.get("/{id}", response_model=OrderOut)
async def get_order_by_id(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed order information."""
    stmt = (
        select(Order)
        .options(
            selectinload(Order.crop_type),
            selectinload(Order.buyer),
            selectinload(Order.allocations).selectinload(OrderFarmerAllocation.farmer),
            selectinload(Order.allocations).selectinload(OrderFarmerAllocation.listing),
        )
        .where(Order.id == id)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    user_is_buyer = current_user.buyer_profile and current_user.buyer_profile.id == order.buyer_id
    user_is_farmer = (
        current_user.farmer_profile
        and any(alloc.farmer_id == current_user.farmer_profile.id for alloc in order.allocations)
    )

    if not (user_is_buyer or user_is_farmer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this order.",
        )

    filter_farmer = current_user.farmer_profile.id if (user_is_farmer and not user_is_buyer) else None
    return format_order_out(order, filter_farmer_id=filter_farmer)


@router.post("/{id}/lock-escrow", response_model=PaymentsLedgerOut)
async def lock_escrow_for_order(
    id: UUID,
    payload: LockEscrowRequest,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """Buyer locks funds in simulated escrow custody."""
    if not current_user.buyer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer profile required.")

    stmt = select(Order).where(Order.id == id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.buyer_id != current_user.buyer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to lock escrow for this order.",
        )

    order.status = OrderStatusEnum.ESCROW_LOCKED

    # Create Escrow Lock entry in PaymentsLedger
    ledger = PaymentsLedger(
        order_id=order.id,
        beneficiary_user_id=current_user.id,
        entry_type=LedgerEntryTypeEnum.ESCROW_LOCK,
        amount_rupees=payload.amount_rupees,
        gateway_reference_id=f"SIM_PAY_{generate_order_code()}",
        is_settled=True,
    )
    db.add(ledger)
    await db.commit()

    return PaymentsLedgerOut(
        id=ledger.id,
        order_id=ledger.order_id,
        beneficiary_user_id=ledger.beneficiary_user_id,
        entry_type=ledger.entry_type,
        amount_rupees=float(ledger.amount_rupees),
        gateway_reference_id=ledger.gateway_reference_id,
        is_settled=ledger.is_settled,
        settled_at=ledger.settled_at,
        created_at=ledger.created_at,
    )


def format_order_out(order: Order, filter_farmer_id: Optional[UUID] = None) -> OrderOut:
    allocations_out = []
    for alloc in order.allocations:
        if filter_farmer_id and alloc.farmer_id != filter_farmer_id:
            continue

        allocations_out.append(
            OrderFarmerAllocationOut(
                id=alloc.id,
                order_id=alloc.order_id,
                farmer_id=alloc.farmer_id,
                farmer_name=alloc.farmer.full_name if alloc.farmer else "Farmer",
                farmer_village=alloc.farmer.village if alloc.farmer else None,
                listing_id=alloc.listing_id,
                allocated_kg=float(alloc.allocated_kg),
                unit_price=round(float(alloc.farmer_payout_amount_rupees) / float(alloc.allocated_kg), 2) if float(alloc.allocated_kg) > 0 else 0.0,
                farmer_payout_amount_rupees=float(alloc.farmer_payout_amount_rupees),
                pickup_verification_otp=alloc.pickup_verification_otp,
                is_picked_up=alloc.is_picked_up,
                is_settled=alloc.is_settled,
            )
        )

    return OrderOut(
        id=order.id,
        order_code=order.order_code,
        buyer_id=order.buyer_id,
        buyer_name=order.buyer.business_name if order.buyer else "Buyer",
        cluster_id=order.cluster_id,
        crop_type_id=order.crop_type_id,
        crop_name=order.crop_type.name_en if order.crop_type else "Crop",
        total_quantity_kg=float(order.total_quantity_kg),
        gross_amount_rupees=float(order.gross_amount_rupees),
        status=order.status,
        delivery_otp=order.delivery_otp,
        created_at=order.created_at,
        updated_at=order.updated_at,
        allocations=allocations_out,
    )
