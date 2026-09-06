from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.models import Dispute, LedgerEntryTypeEnum, Order, OrderFarmerAllocation, PaymentsLedger, User, UserRoleEnum
from app.schemas.dispute import DisputeCreate, DisputeOut, DisputeResolve

router = APIRouter()


@router.post("", response_model=DisputeOut, status_code=status.HTTP_201_CREATED)
async def create_dispute(
    payload: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Raise a dispute with escrow withholding for an order."""
    stmt_order = (
        select(Order)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.allocations),
        )
        .where(Order.id == payload.order_id)
    )
    res_order = await db.execute(stmt_order)
    order = res_order.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    user_is_buyer = order.buyer and order.buyer.user_id == current_user.id
    user_is_farmer = current_user.farmer_profile and any(
        alloc.farmer_id == current_user.farmer_profile.id for alloc in order.allocations
    )

    if not (user_is_buyer or user_is_farmer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to raise a dispute for this order.",
        )

    dispute = Dispute(
        order_id=payload.order_id,
        raised_by=current_user.id,
        dispute_reason=payload.dispute_reason,
        withheld_amount_rupees=payload.withheld_amount_rupees,
        is_resolved=False,
    )
    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)

    return DisputeOut(
        id=dispute.id,
        order_id=dispute.order_id,
        raised_by=dispute.raised_by,
        dispute_reason=dispute.dispute_reason,
        withheld_amount_rupees=float(dispute.withheld_amount_rupees),
        is_resolved=dispute.is_resolved,
        resolution_notes=dispute.resolution_notes,
        created_at=dispute.created_at,
    )


@router.put("/{id}/resolve", response_model=DisputeOut)
async def resolve_dispute(
    id: UUID,
    payload: DisputeResolve,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve an open dispute and reconcile withheld escrow amount."""
    stmt = (
        select(Dispute)
        .options(
            selectinload(Dispute.order).selectinload(Order.buyer),
            selectinload(Dispute.order).selectinload(Order.allocations).selectinload(OrderFarmerAllocation.farmer),
        )
        .where(Dispute.id == id)
    )
    res = await db.execute(stmt)
    dispute = res.scalar_one_or_none()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found.")

    if dispute.is_resolved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dispute already resolved.")

    # Authorization guard: Only order participants or operator can resolve dispute
    user_is_buyer = dispute.order.buyer and dispute.order.buyer.user_id == current_user.id
    user_is_operator = current_user.role == UserRoleEnum.OPERATOR_PROXY

    if not (user_is_buyer or user_is_operator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to resolve this dispute.",
        )

    dispute.is_resolved = True
    dispute.resolution_notes = payload.resolution_notes

    # Reconcile withheld escrow entry in PaymentsLedger.
    # REFUND returns the withheld amount to the buyer; FARMER_PAYOUT releases it to the
    # farmer(s) on the order instead — never to the buyer, regardless of settlement_action.
    if float(dispute.withheld_amount_rupees) > 0:
        if payload.settlement_action == "REFUND":
            entry_type = LedgerEntryTypeEnum.REFUND
            beneficiary_id = dispute.order.buyer.user_id if dispute.order.buyer else current_user.id
            db.add(PaymentsLedger(
                order_id=dispute.order_id,
                beneficiary_user_id=beneficiary_id,
                entry_type=entry_type,
                amount_rupees=dispute.withheld_amount_rupees,
                gateway_reference_id=f"SIM_DISPUTE_SETTLE_{dispute.id.hex[:6].upper()}",
                is_settled=True,
            ))
        else:
            entry_type = LedgerEntryTypeEnum.FARMER_PAYOUT
            farmer_allocs = [a for a in dispute.order.allocations if a.farmer]
            if farmer_allocs:
                # Split the withheld amount across the order's farmers, weighted by their
                # original payout share, so a multi-farmer order doesn't pay the full
                # withheld amount to a single farmer.
                total_payout = sum(float(a.farmer_payout_amount_rupees) for a in farmer_allocs) or 1.0
                withheld = float(dispute.withheld_amount_rupees)
                remaining = withheld
                for i, alloc in enumerate(farmer_allocs):
                    if i == len(farmer_allocs) - 1:
                        share = round(remaining, 2)
                    else:
                        share = round(withheld * (float(alloc.farmer_payout_amount_rupees) / total_payout), 2)
                        remaining = round(remaining - share, 2)
                    if share > 0:
                        db.add(PaymentsLedger(
                            order_id=dispute.order_id,
                            beneficiary_user_id=alloc.farmer.user_id,
                            entry_type=entry_type,
                            amount_rupees=share,
                            gateway_reference_id=f"SIM_DISPUTE_SETTLE_{dispute.id.hex[:6].upper()}_{i}",
                            is_settled=True,
                        ))
            else:
                # No farmer on the order to pay out to; fall back to a refund so the
                # amount is never silently dropped or mis-attributed to the buyer.
                db.add(PaymentsLedger(
                    order_id=dispute.order_id,
                    beneficiary_user_id=dispute.order.buyer.user_id if dispute.order.buyer else current_user.id,
                    entry_type=LedgerEntryTypeEnum.REFUND,
                    amount_rupees=dispute.withheld_amount_rupees,
                    gateway_reference_id=f"SIM_DISPUTE_SETTLE_{dispute.id.hex[:6].upper()}",
                    is_settled=True,
                ))

    await db.commit()
    await db.refresh(dispute)

    return DisputeOut(
        id=dispute.id,
        order_id=dispute.order_id,
        raised_by=dispute.raised_by,
        dispute_reason=dispute.dispute_reason,
        withheld_amount_rupees=float(dispute.withheld_amount_rupees),
        is_resolved=dispute.is_resolved,
        resolution_notes=dispute.resolution_notes,
        created_at=dispute.created_at,
    )
