from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models import User, PaymentsLedger, Order
from app.schemas.payment import PaymentsLedgerOut

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/ledger/{order_id}", response_model=List[PaymentsLedgerOut])
async def get_payments_ledger_for_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve transparent multi-split payment ledger reconciliation entries for an order."""
    stmt_order = select(Order).where(Order.id == order_id)
    res_order = await db.execute(stmt_order)
    order = res_order.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    stmt = select(PaymentsLedger).where(PaymentsLedger.order_id == order_id).order_by(PaymentsLedger.created_at.asc())
    res = await db.execute(stmt)
    entries = res.scalars().all()

    output = []
    for entry in entries:
        output.append(
            PaymentsLedgerOut(
                id=entry.id,
                order_id=entry.order_id,
                beneficiary_user_id=entry.beneficiary_user_id,
                entry_type=entry.entry_type,
                amount_rupees=float(entry.amount_rupees),
                gateway_reference_id=entry.gateway_reference_id,
                is_settled=entry.is_settled,
                settled_at=entry.settled_at,
                created_at=entry.created_at,
            )
        )

    return output
