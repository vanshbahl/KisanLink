import io
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_db, require_inspection_actor_or_local_demo
from app.api.v1 import freshness as freshness_api
from app.core.config import settings
from app.main import app
from app.services.freshness_service import (
    InspectionInferenceError,
    InspectionPrediction,
    InspectionProviderUnavailable,
    LocalFreshnessProvider,
)


class FakeSession:
    def __init__(self) -> None:
        self.added = []

    def add(self, value) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        for value in self.added:
            if value.id is None:
                value.id = uuid4()


class StaticProvider:
    def __init__(self, predicted_class: str = "fresh", confidence: float = 0.91):
        self.predicted_class = predicted_class
        self.confidence = confidence

    def predict(self, image):
        assert image.mode == "RGB"
        other_class = "not_fresh" if self.predicted_class == "fresh" else "fresh"
        return InspectionPrediction(
            predicted_class=self.predicted_class,
            confidence=self.confidence,
            model="efficientnet_b2",
            source="local_cv",
            probabilities={
                self.predicted_class: self.confidence,
                other_class: 1 - self.confidence,
            },
        )


class FailingProvider:
    def __init__(self, exc: Exception):
        self.exc = exc

    def predict(self, image):
        raise self.exc


def make_jpeg() -> bytes:
    from PIL import Image

    output = io.BytesIO()
    Image.new("RGB", (32, 24), color=(40, 160, 70)).save(output, format="JPEG")
    return output.getvalue()


@pytest.fixture
async def inspection_client(tmp_path: Path, monkeypatch):
    fake_db = FakeSession()

    async def override_db():
        yield fake_db

    async def override_actor():
        return None

    monkeypatch.setattr(settings, "INSPECTION_UPLOAD_DIR", str(tmp_path))
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_inspection_actor_or_local_demo] = override_actor
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client, fake_db, tmp_path
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_valid_image_analysis_is_categorical_and_persisted(
    inspection_client, monkeypatch
):
    client, fake_db, upload_dir = inspection_client
    image_bytes = make_jpeg()
    monkeypatch.setattr(
        freshness_api,
        "local_freshness_provider",
        StaticProvider(confidence=0.91234567),
    )

    response = await client.post(
        "/api/v1/freshness/analyze",
        data={"checkpoint": "LOGISTICS_PICKUP"},
        files={"sample": ("farmer-supplied-name.jpg", image_bytes, "image/jpeg")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["predicted_class"] == "fresh"
    assert data["confidence"] == pytest.approx(0.91235)
    assert data["confidence_semantics"] == "model_confidence_only"
    assert data["model"] == "efficientnet_b2"
    assert data["source"] == "local_cv"
    assert "freshness_score" not in data
    assert "%" not in str(data)
    saved_path = upload_dir / Path(data["sample_image_url"]).name
    assert saved_path.read_bytes() == image_bytes
    assert saved_path.name != "farmer-supplied-name.jpg"
    assert fake_db.added[0].analysis_status == "COMPLETED"
    assert fake_db.added[0].local_model_confidence == pytest.approx(0.91235)


@pytest.mark.asyncio
async def test_not_fresh_signal_does_not_reject_or_modify_a_listing(
    inspection_client, monkeypatch
):
    client, _, _ = inspection_client
    monkeypatch.setattr(
        freshness_api,
        "local_freshness_provider",
        StaticProvider(predicted_class="not_fresh", confidence=0.88),
    )

    response = await client.post(
        "/api/v1/freshness/analyze",
        files={"sample": ("sample.jpg", make_jpeg(), "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["predicted_class"] == "not_fresh"
    assert "crop_listing_id" not in response.json()


@pytest.mark.asyncio
async def test_corrupt_image_is_rejected_without_persistence(inspection_client):
    client, fake_db, upload_dir = inspection_client
    response = await client.post(
        "/api/v1/freshness/analyze",
        files={"sample": ("broken.jpg", b"not-an-image", "image/jpeg")},
    )

    assert response.status_code == 400
    assert fake_db.added == []
    assert list(upload_dir.iterdir()) == []


@pytest.mark.asyncio
async def test_oversized_image_is_rejected(inspection_client, monkeypatch):
    client, fake_db, upload_dir = inspection_client
    monkeypatch.setattr(settings, "INSPECTION_MAX_UPLOAD_BYTES", 8)
    response = await client.post(
        "/api/v1/freshness/analyze",
        files={"sample": ("sample.jpg", make_jpeg(), "image/jpeg")},
    )

    assert response.status_code == 413
    assert fake_db.added == []
    assert list(upload_dir.iterdir()) == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "provider_error,error_code",
    [
        (InspectionProviderUnavailable("checkpoint missing"), "provider_unavailable"),
        (InspectionInferenceError("inference failed"), "inference_failed"),
    ],
)
async def test_image_remains_saved_when_local_inference_fails(
    inspection_client, monkeypatch, provider_error, error_code
):
    client, fake_db, upload_dir = inspection_client
    monkeypatch.setattr(
        freshness_api,
        "local_freshness_provider",
        FailingProvider(provider_error),
    )

    response = await client.post(
        "/api/v1/freshness/analyze",
        files={"sample": ("sample.jpg", make_jpeg(), "image/jpeg")},
    )

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == error_code
    assert detail["image_saved"] is True
    assert (upload_dir / Path(detail["sample_image_url"]).name).is_file()
    assert fake_db.added[0].analysis_status == "FAILED"


def test_missing_model_file_is_reported_without_loading_dependencies(tmp_path: Path):
    provider = LocalFreshnessProvider(
        model_path=tmp_path / "missing.pth",
        config_path=tmp_path / "missing-config.json",
        class_names_path=tmp_path / "missing-classes.json",
    )

    with pytest.raises(InspectionProviderUnavailable, match="checkpoint not found"):
        provider._load()


@pytest.mark.asyncio
async def test_production_cannot_use_unauthenticated_inspection_bypass(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DEMO_AUTH_ENABLED", True)

    with pytest.raises(HTTPException) as exc_info:
        await require_inspection_actor_or_local_demo(credentials=None, db=None)

    assert exc_info.value.status_code == 401
