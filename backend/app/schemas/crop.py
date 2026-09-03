from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.models.crop import QualityGradeEnum, ListingStatusEnum


class CropTypeOut(BaseModel):
    id: UUID
    name_en: str
    name_hi: str
    category: str
    shelf_life_days: int
    standard_mandi_unit: str

    model_config = ConfigDict(from_attributes=True)


class CropListingCreate(BaseModel):
    crop_name: str = Field(..., min_length=2, max_length=64, example="Tomato")
    variety: Optional[str] = Field(default="Desi")
    quantity_kg: float = Field(..., gt=0)
    expected_price_per_kg: float = Field(..., gt=0)
    quality_grade: QualityGradeEnum = Field(default=QualityGradeEnum.GRADE_A)
    is_pre_harvest: bool = False
    harvest_date: date
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    photos: Optional[List[str]] = Field(default_factory=list)


class CropListingUpdate(BaseModel):
    variety: Optional[str] = None
    quantity_kg: Optional[float] = Field(None, gt=0)
    available_quantity_kg: Optional[float] = Field(None, ge=0)
    expected_price_per_kg: Optional[float] = Field(None, gt=0)
    quality_grade: Optional[QualityGradeEnum] = None
    is_pre_harvest: Optional[bool] = None
    harvest_date: Optional[date] = None
    status: Optional[ListingStatusEnum] = None
    photos: Optional[List[str]] = None


class CropListingOut(BaseModel):
    id: UUID
    farmer_id: UUID
    farmer_name: Optional[str] = None
    farmer_village: Optional[str] = None
    farmer_district: Optional[str] = None
    crop_type_id: UUID
    crop_name: str
    variety: Optional[str] = None
    quantity_kg: float
    available_quantity_kg: float
    expected_price_per_kg: float
    quality_grade: QualityGradeEnum
    is_pre_harvest: bool
    harvest_date: date
    status: ListingStatusEnum
    latitude: float
    longitude: float
    distance_km: Optional[float] = None
    photos: Optional[List[str]] = None
    is_urgent_rescue: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
