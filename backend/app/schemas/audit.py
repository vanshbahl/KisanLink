from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OperatorAuditLogCreate(BaseModel):
    farmer_user_id: UUID
    action_type: str = Field(..., min_length=2, max_length=64)
    entity_id: UUID


class OperatorAuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    operator_user_id: UUID
    farmer_user_id: UUID
    action_type: str
    entity_id: UUID
    created_at: datetime
