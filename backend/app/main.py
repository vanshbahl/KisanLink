from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import PrototypeState
from .schemas import StatePayload
from .seed import fresh_seed


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        state = db.get(PrototypeState, 1)
        if state is None:
            db.add(PrototypeState(id=1, data=fresh_seed()))
            db.commit()
        else:
            defaults = fresh_seed()
            missing = {key: value for key, value in defaults.items() if key not in state.data}
            if missing:
                state.data = {**state.data, **missing}
                db.add(state)
                db.commit()
    yield


app = FastAPI(title="KisanLink SIH Prototype API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/state", response_model=StatePayload)
def get_state(db: Session = Depends(get_db)):
    return db.get(PrototypeState, 1).data


@app.put("/api/state", response_model=StatePayload)
def put_state(payload: StatePayload, db: Session = Depends(get_db)):
    state = db.get(PrototypeState, 1)
    state.data = payload.model_dump()
    db.add(state)
    db.commit()
    db.refresh(state)
    return state.data


@app.post("/api/reset", response_model=StatePayload)
def reset_state(db: Session = Depends(get_db)):
    state = db.get(PrototypeState, 1)
    state.data = fresh_seed()
    db.add(state)
    db.commit()
    db.refresh(state)
    return state.data


def _state(db: Session) -> PrototypeState:
    state = db.get(PrototypeState, 1)
    if state is None:
        raise HTTPException(status_code=500, detail="Prototype state is unavailable")
    return state


@app.get("/api/listings")
def list_listings(db: Session = Depends(get_db)):
    return _state(db).data["listings"]


@app.post("/api/listings", status_code=201)
def create_listing(listing: dict, db: Session = Depends(get_db)):
    state = _state(db)
    data = dict(state.data)
    data["listings"] = [listing, *data["listings"]]
    state.data = data
    db.commit()
    return listing


@app.patch("/api/listings/{listing_id}")
def update_listing(listing_id: str, patch: dict, db: Session = Depends(get_db)):
    state = _state(db)
    data = dict(state.data)
    for index, listing in enumerate(data["listings"]):
        if listing["id"] == listing_id:
            data["listings"][index] = {**listing, **patch}
            state.data = data
            db.commit()
            return data["listings"][index]
    raise HTTPException(status_code=404, detail="Listing not found")


@app.delete("/api/listings/{listing_id}", status_code=204)
def delete_listing(listing_id: str, db: Session = Depends(get_db)):
    state = _state(db)
    data = dict(state.data)
    before = len(data["listings"])
    data["listings"] = [item for item in data["listings"] if item["id"] != listing_id]
    if len(data["listings"]) == before:
        raise HTTPException(status_code=404, detail="Listing not found")
    state.data = data
    db.commit()


@app.get("/api/orders")
def list_orders(db: Session = Depends(get_db)):
    return _state(db).data["orders"]


@app.patch("/api/orders/{order_id}")
def update_order(order_id: str, patch: dict, db: Session = Depends(get_db)):
    state = _state(db)
    data = dict(state.data)
    for index, order in enumerate(data["orders"]):
        if order["id"] == order_id:
            data["orders"][index] = {**order, **patch}
            state.data = data
            db.commit()
            return data["orders"][index]
    raise HTTPException(status_code=404, detail="Order not found")


@app.get("/api/pickups")
def list_pickups(db: Session = Depends(get_db)):
    return _state(db).data["pickups"]


@app.get("/api/earnings")
def list_earnings(db: Session = Depends(get_db)):
    return _state(db).data["earnings"]


@app.get("/api/logistics/pickups")
def list_logistics_pickups(db: Session = Depends(get_db)):
    return _state(db).data.get("logisticsPickups", [])


@app.get("/api/logistics/deliveries")
def list_deliveries(db: Session = Depends(get_db)):
    return _state(db).data.get("deliveries", [])


@app.get("/api/logistics/routes")
def list_routes(db: Session = Depends(get_db)):
    return _state(db).data.get("logisticsRoutes", [])


@app.get("/api/logistics/vehicles")
def list_vehicles(db: Session = Depends(get_db)):
    return _state(db).data.get("vehicles", [])
