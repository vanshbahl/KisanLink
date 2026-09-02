from typing import Any

from pydantic import BaseModel, ConfigDict


class StatePayload(BaseModel):
    """Validated top-level contract; nested demo entities stay intentionally flexible."""

    model_config = ConfigDict(extra="forbid")
    listings: list[dict[str, Any]]
    orders: list[dict[str, Any]]
    pickups: list[dict[str, Any]]
    earnings: list[dict[str, Any]]
    notifications: list[dict[str, Any]]
    profile: dict[str, Any]
