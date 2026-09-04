"""
TEMPORARY ISOLATED LOGISTICS PROTOTYPE BACKEND

Notice for future developers / AI coding agents:
Arshdeep has not yet implemented the real Logistics backend.
To preserve the fully functional frontend Logistics dashboard (pickups, deliveries,
routes, vehicles, checklist, and issue workflows) without contaminating the
canonical PostgreSQL/PostGIS architecture, this module temporarily encapsulates
the prototype state and API routes for Logistics only.

All other domains (Farmer, Consumer, Bulk Buyer) are strictly backed by the
canonical PostgreSQL/PostGIS models and /api/v1 routers.

NEXT DEVELOPER TASK:
Migrate this module to the canonical architecture:
- Implement PostGIS shipment routing in `app/models/logistics.py`
- Implement schemas in `app/schemas/logistics.py`
- Implement real async router in `app/api/v1/logistics.py`
- Remove this temporary module and associated SQLite store.
"""

from pathlib import Path
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, Integer, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.seed import fresh_seed

# Isolated SQLite database specifically scoped for temporary Logistics prototype state
DATABASE_PATH = Path(__file__).resolve().parents[2] / "kisanlink.db"
_engine = create_engine(f"sqlite:///{DATABASE_PATH}", connect_args={"check_same_thread": False})
_SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)


class _LegacyBase(DeclarativeBase):
    pass


class PrototypeState(_LegacyBase):
    __tablename__ = "prototype_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)


# Initialize tables and seed if missing
_LegacyBase.metadata.create_all(bind=_engine)
with _SessionLocal() as _db:
    _state = _db.get(PrototypeState, 1)
    if _state is None:
        _db.add(PrototypeState(id=1, data=fresh_seed()))
        _db.commit()
    else:
        _defaults = fresh_seed()
        _missing = {k: v for k, v in _defaults.items() if k not in _state.data}
        if _missing:
            _state.data = {**_state.data, **_missing}
            _db.add(_state)
            _db.commit()


class StatePayload(BaseModel):
    """Validated contract for temporary prototype state."""
    model_config = ConfigDict(extra="ignore")

    listings: list[dict[str, Any]] = Field(default_factory=list)
    orders: list[dict[str, Any]] = Field(default_factory=list)
    pickups: list[dict[str, Any]] = Field(default_factory=list)
    earnings: list[dict[str, Any]] = Field(default_factory=list)
    notifications: list[dict[str, Any]] = Field(default_factory=list)
    profile: dict[str, Any] = Field(default_factory=dict)
    consumerOrders: list[dict[str, Any]] = Field(default_factory=list)
    rfqs: list[dict[str, Any]] = Field(default_factory=list)
    bulkOrders: list[dict[str, Any]] = Field(default_factory=list)
    consumerProfile: dict[str, Any] = Field(default_factory=dict)
    bulkProfile: dict[str, Any] = Field(default_factory=dict)
    logisticsPickups: list[dict[str, Any]] = Field(default_factory=list)
    deliveries: list[dict[str, Any]] = Field(default_factory=list)
    logisticsRoutes: list[dict[str, Any]] = Field(default_factory=list)
    vehicles: list[dict[str, Any]] = Field(default_factory=list)
    logisticsProfile: dict[str, Any] = Field(default_factory=dict)
    savedListingIds: list[str] = Field(default_factory=list)
    savedFarmNames: list[str] = Field(default_factory=list)


router = APIRouter(tags=["Legacy Logistics Prototype (Temporary)"])


def _get_current_state() -> PrototypeState:
    with _SessionLocal() as db:
        state = db.get(PrototypeState, 1)
        if state is None:
            raise HTTPException(status_code=500, detail="Prototype state is unavailable")
        return state


@router.get("/api/state", response_model=StatePayload)
def get_state():
    with _SessionLocal() as db:
        state = db.get(PrototypeState, 1)
        return state.data if state else fresh_seed()


@router.put("/api/state", response_model=StatePayload)
def put_state(payload: StatePayload):
    with _SessionLocal() as db:
        state = db.get(PrototypeState, 1)
        if state is None:
            state = PrototypeState(id=1, data=payload.model_dump())
        else:
            state.data = payload.model_dump()
        db.add(state)
        db.commit()
        db.refresh(state)
        return state.data


@router.post("/api/reset", response_model=StatePayload)
def reset_state():
    with _SessionLocal() as db:
        state = db.get(PrototypeState, 1)
        if state is None:
            state = PrototypeState(id=1, data=fresh_seed())
        else:
            state.data = fresh_seed()
        db.add(state)
        db.commit()
        db.refresh(state)
        return state.data


@router.get("/api/logistics/pickups")
def list_logistics_pickups():
    return _get_current_state().data.get("logisticsPickups", [])


@router.get("/api/logistics/deliveries")
def list_deliveries():
    return _get_current_state().data.get("deliveries", [])


@router.get("/api/logistics/routes")
def list_routes():
    return _get_current_state().data.get("logisticsRoutes", [])


@router.get("/api/logistics/vehicles")
def list_vehicles():
    return _get_current_state().data.get("vehicles", [])
