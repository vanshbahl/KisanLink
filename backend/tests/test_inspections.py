import io
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.api.v1 import freshness as freshness_api
from app.core.config import settings
from app.services.freshness_service import InspectionPrediction


class StaticProvider:
    def __init__(self, predicted_class: str = "fresh", confidence: float = 0.9):
        self.predicted_class = predicted_class
        self.confidence = confidence

    def predict(self, image):
        other = "not_fresh" if self.predicted_class == "fresh" else "fresh"
        return InspectionPrediction(
            predicted_class=self.predicted_class,
            confidence=self.confidence,
            model="efficientnet_b2",
            source="local_cv",
            probabilities={self.predicted_class: self.confidence, other: 1 - self.confidence},
        )


def make_jpeg() -> bytes:
    from PIL import Image

    output = io.BytesIO()
    Image.new("RGB", (32, 24), color=(60, 140, 90)).save(output, format="JPEG")
    return output.getvalue()


async def _create_bulk_listing(client: AsyncClient, farmer_token: str, container_count: int = 10) -> dict:
    payload = {
        "crop_name": "Okra",
        "quantity_kg": 250.0,
        "expected_price_per_kg": 22.0,
        "harvest_date": "2026-09-10",
        "latitude": 28.9912,
        "longitude": 77.0125,
        "packaging_type": "CRATE",
        "container_count": container_count,
        "unit_weight_kg": 25.0,
    }
    res = await client.post(
        "/api/v1/listings", json=payload, headers={"Authorization": f"Bearer {farmer_token}"}
    )
    assert res.status_code == 201
    return res.json()


@pytest.mark.asyncio
async def test_bulk_listing_gets_a_lot_code_and_packaging_fields(client: AsyncClient, farmer_token: str):
    listing = await _create_bulk_listing(client, farmer_token)
    assert listing["lot_code"] is not None
    assert listing["lot_code"].startswith("KL-OKR-")
    assert listing["packaging_type"] == "CRATE"
    assert listing["container_count"] == 10
    assert listing["unit_weight_kg"] == 25.0


@pytest.mark.asyncio
async def test_sample_assignment_requires_packaging_info(client: AsyncClient, farmer_token: str):
    res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Spinach",
            "quantity_kg": 40.0,
            "expected_price_per_kg": 15.0,
            "harvest_date": "2026-09-10",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    listing_id = res.json()["id"]

    assign_res = await client.post(
        "/api/v1/inspections/sample-assignment",
        json={"crop_listing_id": listing_id, "checkpoint": "LOGISTICS_PICKUP"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert assign_res.status_code == 400


@pytest.mark.asyncio
async def test_sample_assignment_is_random_but_persisted_on_reload(client: AsyncClient, farmer_token: str):
    listing = await _create_bulk_listing(client, farmer_token, container_count=10)
    auth = {"Authorization": f"Bearer {farmer_token}"}

    first = await client.post(
        "/api/v1/inspections/sample-assignment",
        json={"crop_listing_id": listing["id"], "checkpoint": "LOGISTICS_PICKUP"},
        headers=auth,
    )
    assert first.status_code == 200
    first_data = first.json()
    assert first_data["container_count"] == 10
    assert 1 <= first_data["sample_size"] <= 10
    assert len(first_data["selected_containers"]) == first_data["sample_size"]
    assert all(1 <= c <= 10 for c in first_data["selected_containers"])
    assert len(first_data["instructions"]) == first_data["sample_size"]

    # Re-requesting (simulating a screen refresh) must return the SAME draw, not a new one.
    second = await client.post(
        "/api/v1/inspections/sample-assignment",
        json={"crop_listing_id": listing["id"], "checkpoint": "LOGISTICS_PICKUP"},
        headers=auth,
    )
    assert second.status_code == 200
    assert second.json()["selected_containers"] == first_data["selected_containers"]
    assert second.json()["id"] == first_data["id"]

    fetched = await client.get(
        "/api/v1/inspections/sample-assignment",
        params={"crop_listing_id": listing["id"], "checkpoint": "LOGISTICS_PICKUP"},
    )
    assert fetched.status_code == 200
    assert fetched.json()["selected_containers"] == first_data["selected_containers"]

    # A different checkpoint gets its own independent draw.
    dropoff = await client.post(
        "/api/v1/inspections/sample-assignment",
        json={"crop_listing_id": listing["id"], "checkpoint": "WAREHOUSE_ENTRY"},
        headers=auth,
    )
    assert dropoff.status_code == 200
    assert dropoff.json()["id"] != first_data["id"]


@pytest.mark.asyncio
async def test_lot_trail_aggregates_checkpoints_conservatively(
    client: AsyncClient, farmer_token: str, tmp_path: Path, monkeypatch
):
    monkeypatch.setattr(settings, "INSPECTION_UPLOAD_DIR", str(tmp_path))
    listing = await _create_bulk_listing(client, farmer_token, container_count=6)
    listing_id = listing["id"]
    auth = {"Authorization": f"Bearer {farmer_token}"}

    # Farmer declaration photo - not a quality verdict, even though the model still runs.
    monkeypatch.setattr(freshness_api, "local_freshness_provider", StaticProvider("fresh", 0.95))
    farmer_photo = await client.post(
        "/api/v1/freshness/analyze",
        data={"checkpoint": "FARMER_GATE", "crop_listing_id": listing_id},
        files={"sample": ("lot.jpg", make_jpeg(), "image/jpeg")},
        headers=auth,
    )
    assert farmer_photo.status_code == 200

    # Random sample at pickup, then capture a mix of fresh/not_fresh across sampled crates.
    assignment = (
        await client.post(
            "/api/v1/inspections/sample-assignment",
            json={"crop_listing_id": listing_id, "checkpoint": "LOGISTICS_PICKUP"},
            headers=auth,
        )
    ).json()

    for i, container in enumerate(assignment["selected_containers"]):
        verdict = "not_fresh" if i == 0 else "fresh"
        monkeypatch.setattr(
            freshness_api, "local_freshness_provider", StaticProvider(verdict, 0.8)
        )
        capture = await client.post(
            "/api/v1/freshness/analyze",
            data={
                "checkpoint": "LOGISTICS_PICKUP",
                "crop_listing_id": listing_id,
                "sample_assignment_id": assignment["id"],
                "container_number": str(container),
            },
            files={"sample": (f"crate-{container}.jpg", make_jpeg(), "image/jpeg")},
            headers=auth,
        )
        assert capture.status_code == 200
        assert capture.json()["container_number"] == container

    trail_res = await client.get("/api/v1/inspections/trail", params={"crop_listing_id": listing_id})
    assert trail_res.status_code == 200
    trail = trail_res.json()
    assert trail["lot_code"] == listing["lot_code"]

    stages_by_checkpoint = {s["checkpoint"]: s for s in trail["stages"]}
    assert stages_by_checkpoint["FARMER_GATE"]["status"] == "declared"
    assert stages_by_checkpoint["FARMER_GATE"]["photo_count"] == 1

    pickup = stages_by_checkpoint["LOGISTICS_PICKUP"]
    assert pickup["photo_count"] == len(assignment["selected_containers"])
    assert pickup["sampled_containers"] == assignment["sample_size"]
    assert pickup["total_containers"] == 6
    # One not_fresh among several fresh sampled crates -> mixed, conservative "needs_review".
    assert pickup["status"] == "needs_review"
    # Raw model confidence must never leak into the trail.
    assert "confidence" not in str(trail)
