from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.inspection import InspectionCheckpoint

# Workflow status vocabulary shown to users, distinct from produce-condition status.
LotWorkflowStatus = str  # "pending" | "declared" | "fresh" | "needs_review" | "quality_concern" | "unable_to_assess"


class SampleAssignmentCreate(BaseModel):
    crop_listing_id: UUID
    checkpoint: InspectionCheckpoint


class SampleInstructionItem(BaseModel):
    container_number: int
    position: str
    note: str


class SampleAssignmentOut(BaseModel):
    id: UUID
    crop_listing_id: UUID
    checkpoint: InspectionCheckpoint
    container_count: int
    sample_size: int
    selected_containers: List[int]
    instructions: List[SampleInstructionItem]
    method: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrailInspectionItem(BaseModel):
    inspection_id: UUID
    container_number: Optional[int] = None
    analysis_status: str
    predicted_class: Optional[str] = None
    image_url: str
    created_at: datetime


class TrailCheckpointStage(BaseModel):
    checkpoint: InspectionCheckpoint
    status: LotWorkflowStatus
    photo_count: int
    sampled_containers: Optional[int] = None
    total_containers: Optional[int] = None
    selected_containers: Optional[List[int]] = None
    first_captured_at: Optional[datetime] = None
    last_captured_at: Optional[datetime] = None
    inspections: List[TrailInspectionItem]


class LotTrailOut(BaseModel):
    crop_listing_id: UUID
    lot_code: Optional[str] = None
    crop_name: str
    quantity_kg: float
    packaging_type: Optional[str] = None
    container_count: Optional[int] = None
    unit_weight_kg: Optional[float] = None
    declared_at: datetime
    stages: List[TrailCheckpointStage]
