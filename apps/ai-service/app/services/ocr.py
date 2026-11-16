from dataclasses import dataclass


@dataclass
class OcrResult:
    graduate_name: str
    school_name: str
    attestat_average: float
    attestat_issued_on: str
    low_confidence_fields: list[str]


def recognize_attestat(storage_key: str | None = None) -> OcrResult:
    _ = storage_key
    return OcrResult(
        graduate_name="Иванов Иван Иванович",
        school_name="ГУО «Гимназия № 1 г. Минска»",
        attestat_average=9.0,
        attestat_issued_on="2025-06-20",
        low_confidence_fields=["schoolName"],
    )
