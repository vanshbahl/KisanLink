from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.models.crop import QualityGradeEnum
from app.models.requirement import RequirementStatusEnum


class BuyerRequirementCreate(BaseModel):
    crop_name: str = Field(..., min_length=2, max_length=64, example="Tomato")
    target_quantity_kg: float = Field(..., gt=0)
    max_price_per_kg: float = Field(..., gt=0)
    acceptable_grades: List[QualityGradeEnum] = Field(default_factory=lambda: [QualityGradeEnum.GRADE_A])
    delivery_deadline: datetime
    delivery_latitude: float = Field(..., ge=-90.0, le=90.0)
    delivery_longitude: float = Field(..., ge=-180.0, le=180.0)
    delivery_address: Optional[str] = None


class BuyerRequirementUpdate(BaseModel):
    target_quantity_kg: Optional[float] = Field(None, gt=0)
    max_price_per_kg: Optional[float] = Field(None, gt=0)
    acceptable_grades: Optional[List[QualityGradeEnum]] = None
    delivery_deadline: Optional[datetime] = None
    status: Optional[RequirementStatusEnum] = None


class BuyerRequirementOut(BaseModel):
    id: UUID
    buyer_id: UUID
    buyer_name: Optional[str] = None
    crop_type_id: UUID
    crop_name: str
    target_quantity_kg: float
    max_price_per_kg: float
    acceptable_grades: List[QualityGradeEnum]
    delivery_deadline: datetime
    delivery_latitude: float
    delivery_longitude: float
    status: RequirementStatusEnum
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
