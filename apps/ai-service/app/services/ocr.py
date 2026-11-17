from __future__ import annotations

import logging
from dataclasses import dataclass

from app.config import VISION_ENABLED
from app.services.storage import download_object
from app.services.vision_ocr import recognize_with_vision

logger = logging.getLogger(__name__)


@dataclass
class OcrResult:
    graduate_name: str
    school_name: str
    attestat_average: float | None
    attestat_issued_on: str
    low_confidence_fields: list[str]
    stub: bool = True
    error: str | None = None


def _stub(error: str | None = None) -> OcrResult:
    return OcrResult(
        graduate_name="",
        school_name="",
        attestat_average=None,
        attestat_issued_on="",
        low_confidence_fields=[
            "graduateName",
            "schoolName",
            "attestatAverage",
            "attestatIssuedOn",
        ],
        stub=True,
        error=error,
    )


def recognize_attestat(storage_key: str | None = None) -> OcrResult:
    """
    If OPENAI_API_KEY is set — download scan from MinIO and call Vision.
    Otherwise return an empty stub (manual fill).
    """
    if not storage_key:
        return _stub("Нет ключа файла скана")
    if not VISION_ENABLED:
        return _stub(
            "Vision OCR не настроен: задайте OPENAI_API_KEY в apps/ai-service/.env"
        )

    try:
        image_bytes, content_type = download_object(storage_key)
        data = recognize_with_vision(image_bytes, content_type)
        return OcrResult(
            graduate_name=data["graduateName"],
            school_name=data["schoolName"],
            attestat_average=data["attestatAverage"],
            attestat_issued_on=data["attestatIssuedOn"],
            low_confidence_fields=data["lowConfidenceFields"],
            stub=False,
            error=None,
        )
    except Exception as exc:
        logger.exception("vision OCR failed for %s", storage_key)
        detail = _friendly_error(exc)
        return _stub(detail)


def _friendly_error(exc: Exception) -> str:
    text = str(exc)
    lower = text.lower()
    if "unsupported_country_region_territory" in lower or (
        "403" in text and "country" in lower
    ):
        return (
            "OpenAI API недоступен в вашем регионе (403). "
            "Используйте прокси/OpenRouter: задайте OPENAI_BASE_URL и ключ провайдера."
        )
    if "401" in text or "incorrect api key" in lower or "invalid_api_key" in lower:
        return "Неверный OPENAI_API_KEY — проверьте Secret Key в .env"
    if "pdf" in lower:
        return "PDF через Vision не поддержан — загрузите JPG/PNG"
    return f"Vision OCR не удалось: {text[:180]}"
