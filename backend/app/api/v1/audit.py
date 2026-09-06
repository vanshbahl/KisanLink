from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_operator, get_db
from app.models import OperatorAuditLog, User
from app.schemas.audit import OperatorAuditLogCreate, OperatorAuditLogOut

router = APIRouter()


@router.post("/operator-logs", response_model=OperatorAuditLogOut, status_code=status.HTTP_201_CREATED)
async def create_operator_audit_log(
    payload: OperatorAuditLogCreate,
    current_user: User = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Record an operator proxy action performed on behalf of a farmer."""
    log_entry = OperatorAuditLog(
        operator_user_id=current_user.id,
        farmer_user_id=payload.farmer_user_id,
        action_type=payload.action_type,
        entity_id=payload.entity_id,
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    return OperatorAuditLogOut(
        id=log_entry.id,
        operator_user_id=log_entry.operator_user_id,
        farmer_user_id=log_entry.farmer_user_id,
        action_type=log_entry.action_type,
        entity_id=log_entry.entity_id,
        created_at=log_entry.created_at,
    )


@router.get("/operator-logs", response_model=List[OperatorAuditLogOut])
async def get_operator_audit_logs(
    current_user: User = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve audit history of operator proxy actions."""
    stmt = select(OperatorAuditLog).order_by(OperatorAuditLog.created_at.desc())
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        OperatorAuditLogOut(
            id=l.id,
            operator_user_id=l.operator_user_id,
            farmer_user_id=l.farmer_user_id,
            action_type=l.action_type,
            entity_id=l.entity_id,
            created_at=l.created_at,
        )
        for l in logs
    ]
