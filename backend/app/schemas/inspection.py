from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InspectionCheckpoint(str, Enum):
    FARMER_GATE = "FARMER_GATE"
    LOGISTICS_PICKUP = "LOGISTICS_PICKUP"
    LOGISTICS_DROPOFF = "LOGISTICS_DROPOFF"
    WAREHOUSE_ENTRY = "WAREHOUSE_ENTRY"
    WAREHOUSE_EXIT = "WAREHOUSE_EXIT"


class LocalCVAnalysisOut(BaseModel):
    inspection_id: UUID
    checkpoint: InspectionCheckpoint
    predicted_class: Literal["fresh", "not_fresh"]
    confidence: float = Field(
        ge=0,
        le=1,
        description="Internal softmax confidence for predicted_class; not a freshness percentage.",
    )
    confidence_semantics: Literal["model_confidence_only"] = "model_confidence_only"
    model: Literal["efficientnet_b2"]
    source: Literal["local_cv"]
    sample_image_url: str
    analyzed_at: datetime
