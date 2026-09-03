from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class StatePayload(BaseModel):
    """Validated top-level contract; nested demo entities stay intentionally flexible."""

    model_config = ConfigDict(extra="forbid")
    listings: list[dict[str, Any]]
    orders: list[dict[str, Any]]
    pickups: list[dict[str, Any]]
    earnings: list[dict[str, Any]]
    notifications: list[dict[str, Any]]
    profile: dict[str, Any]
    consumerOrders: list[dict[str, Any]] = Field(default_factory=list)
    rfqs: list[dict[str, Any]] = Field(default_factory=list)
    bulkOrders: list[dict[str, Any]] = Field(default_factory=list)
    consumerProfile: dict[str, Any] = Field(default_factory=dict)
    bulkProfile: dict[str, Any] = Field(default_factory=dict)
    savedListingIds: list[str] = Field(default_factory=list)
    savedFarmNames: list[str] = Field(default_factory=list)
