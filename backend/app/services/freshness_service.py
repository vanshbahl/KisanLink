"""Reusable local-CV inspection provider and safe image handling."""

from __future__ import annotations

import io
import json
import warnings
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import TYPE_CHECKING, Any, Mapping, Protocol
from uuid import uuid4

from app.core.config import settings

if TYPE_CHECKING:
    from PIL.Image import Image


class InvalidInspectionImage(ValueError):
    pass


class InspectionProviderUnavailable(RuntimeError):
    pass


class InspectionInferenceError(RuntimeError):
    pass


@dataclass(frozen=True)
class DecodedInspectionImage:
    image: Image
    suffix: str


@dataclass(frozen=True)
class InspectionPrediction:
    predicted_class: str
    confidence: float
    model: str
    source: str
    probabilities: Mapping[str, float]


class InspectionProvider(Protocol):
    def predict(self, image: Image) -> InspectionPrediction: ...


def decode_inspection_image(
    image_bytes: bytes,
    *,
    max_pixels: int | None = None,
) -> DecodedInspectionImage:
    """Fully decode a supported image and normalize orientation/color safely."""
    try:
        from PIL import Image, ImageOps, UnidentifiedImageError
    except ImportError as exc:
        raise InspectionProviderUnavailable(
            "Image decoding is unavailable because Pillow is not installed."
        ) from exc

    pixel_limit = max_pixels or settings.INSPECTION_MAX_IMAGE_PIXELS
    format_suffixes = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(image_bytes)) as source:
                image_format = source.format
                if image_format not in format_suffixes:
                    raise InvalidInspectionImage(
                        "Upload a valid JPEG, PNG, or WebP image."
                    )
                width, height = source.size
                if width <= 0 or height <= 0 or width * height > pixel_limit:
                    raise InvalidInspectionImage(
                        f"Decoded image exceeds the {pixel_limit:,}-pixel safety limit."
                    )
                source.load()
                image = ImageOps.exif_transpose(source).convert("RGB").copy()
    except InvalidInspectionImage:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise InvalidInspectionImage(
            "Upload a valid, non-corrupt JPEG, PNG, or WebP image."
        ) from exc

    return DecodedInspectionImage(image=image, suffix=format_suffixes[image_format])


def save_inspection_image(image_bytes: bytes, suffix: str, upload_dir: Path) -> str:
    """Persist original evidence bytes under a generated, traversal-safe filename."""
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{suffix}"
    destination = upload_dir / filename
    if destination.resolve().parent != upload_dir.resolve():
        raise RuntimeError("Generated inspection image path escaped its upload directory.")
    with destination.open("xb") as output:
        output.write(image_bytes)
    return f"/uploads/freshness/{filename}"


class LocalFreshnessProvider:
    """Lazy, process-local EfficientNet-B2 provider for a binary AI signal."""

    def __init__(
        self,
        *,
        model_path: str | Path | None = None,
        config_path: str | Path | None = None,
        class_names_path: str | Path | None = None,
    ) -> None:
        self._model_path = Path(model_path or settings.LOCAL_CV_MODEL_PATH)
        self._config_path = Path(config_path or settings.LOCAL_CV_MODEL_CONFIG_PATH)
        self._class_names_path = Path(
            class_names_path or settings.LOCAL_CV_CLASS_NAMES_PATH
        )
        self._model: Any = None
        self._transform: Any = None
        self._class_names: list[str] = []
        self._load_error: str | None = None
        self._load_lock = Lock()
        self._inference_lock = Lock()

    def _load(self) -> None:
        if self._model is not None:
            return
        if self._load_error is not None:
            raise InspectionProviderUnavailable(self._load_error)

        with self._load_lock:
            if self._model is not None:
                return
            if self._load_error is not None:
                raise InspectionProviderUnavailable(self._load_error)

            try:
                config = self._read_and_validate_config()
                class_names = json.loads(
                    self._class_names_path.read_text(encoding="utf-8")
                )
                if class_names != config["class_names"]:
                    raise ValueError("class_names.json does not match model_config.json")

                import timm
                import torch
                from torchvision import transforms
                from torchvision.transforms import InterpolationMode

                model = timm.create_model(
                    config["model_name"],
                    pretrained=False,
                    num_classes=len(class_names),
                )
                checkpoint = torch.load(
                    self._model_path,
                    map_location="cpu",
                    weights_only=True,
                )
                state_dict = self._extract_state_dict(checkpoint)
                state_dict = {
                    key.removeprefix("module."): value
                    for key, value in state_dict.items()
                }
                model.load_state_dict(state_dict, strict=True)
                model.eval()

                preprocessing = config["preprocessing"]
                interpolation_name = preprocessing["interpolation"].upper()
                interpolation = getattr(InterpolationMode, interpolation_name)
                transform = transforms.Compose(
                    [
                        transforms.Resize(
                            preprocessing["resize_shorter_side"],
                            interpolation=interpolation,
                            antialias=True,
                        ),
                        transforms.CenterCrop(preprocessing["crop_size"]),
                        transforms.ToTensor(),
                        transforms.Normalize(
                            mean=config["normalize"]["mean"],
                            std=config["normalize"]["std"],
                        ),
                    ]
                )
            except (ImportError, OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
                self._load_error = f"Local CV model is unavailable: {exc}"
                raise InspectionProviderUnavailable(self._load_error) from exc
            except Exception as exc:
                self._load_error = f"Local CV checkpoint could not be loaded: {exc}"
                raise InspectionProviderUnavailable(self._load_error) from exc

            self._model = model
            self._transform = transform
            self._class_names = class_names

    def _read_and_validate_config(self) -> dict[str, Any]:
        if not self._model_path.is_file():
            raise OSError(f"model checkpoint not found at {self._model_path}")
        if not self._config_path.is_file():
            raise OSError(f"model configuration not found at {self._config_path}")
        if not self._class_names_path.is_file():
            raise OSError(f"class mapping not found at {self._class_names_path}")

        config = json.loads(self._config_path.read_text(encoding="utf-8"))
        if config.get("model_name") != "efficientnet_b2":
            raise ValueError("only the efficientnet_b2 architecture is supported")
        if config.get("class_names") != ["fresh", "not_fresh"]:
            raise ValueError("model classes must be ['fresh', 'not_fresh']")

        preprocessing = config.get("preprocessing", {})
        if not isinstance(preprocessing.get("resize_shorter_side"), int):
            raise ValueError("resize_shorter_side must be configured")
        if not isinstance(preprocessing.get("crop_size"), int):
            raise ValueError("crop_size must be configured")
        if preprocessing["resize_shorter_side"] < preprocessing["crop_size"]:
            raise ValueError("resize_shorter_side must be at least crop_size")
        if preprocessing.get("interpolation") not in {"bilinear", "bicubic"}:
            raise ValueError("interpolation must be bilinear or bicubic")

        normalize = config.get("normalize", {})
        if len(normalize.get("mean", [])) != 3 or len(normalize.get("std", [])) != 3:
            raise ValueError("three-channel normalization must be configured")
        return config

    @staticmethod
    def _extract_state_dict(checkpoint: Any) -> dict[str, Any]:
        if not isinstance(checkpoint, dict):
            raise ValueError("checkpoint has an unsupported format")
        for key in ("model_state_dict", "state_dict", "model"):
            candidate = checkpoint.get(key)
            if isinstance(candidate, dict):
                return candidate
        if checkpoint and all(isinstance(key, str) for key in checkpoint):
            return checkpoint
        raise ValueError("checkpoint has no model state dictionary")

    def predict(self, image: Image) -> InspectionPrediction:
        self._load()
        try:
            import torch

            tensor = self._transform(image).unsqueeze(0)
            with self._inference_lock, torch.inference_mode():
                logits = self._model(tensor)
                scores = torch.softmax(logits, dim=1)[0]
            probabilities = {
                label: float(scores[index].item())
                for index, label in enumerate(self._class_names)
            }
            predicted_class = max(probabilities, key=probabilities.__getitem__)
            return InspectionPrediction(
                predicted_class=predicted_class,
                confidence=probabilities[predicted_class],
                model="efficientnet_b2",
                source="local_cv",
                probabilities=probabilities,
            )
        except InspectionProviderUnavailable:
            raise
        except Exception as exc:
            raise InspectionInferenceError(
                "Local CV inference failed for the uploaded image."
            ) from exc


local_freshness_provider = LocalFreshnessProvider()
