from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.config import VISION_ENABLED
from app.services.ocr import recognize_attestat

app = FastAPI(title="ai-service", version="0.1.0")


class OcrAttestatRequest(BaseModel):
    storageKey: str | None = None


class OcrAttestatResponse(BaseModel):
    graduateName: str = ""
    schoolName: str = ""
    attestatAverage: float | None = Field(default=None, ge=1, le=10)
    attestatIssuedOn: str = ""
    lowConfidenceFields: list[str] = Field(default_factory=list)
    stub: bool = True
    error: str | None = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "visionEnabled": VISION_ENABLED,
    }


@app.post("/ocr/attestat", response_model=OcrAttestatResponse)
def ocr_attestat(body: OcrAttestatRequest):
    result = recognize_attestat(body.storageKey)
    return OcrAttestatResponse(
        graduateName=result.graduate_name,
        schoolName=result.school_name,
        attestatAverage=result.attestat_average,
        attestatIssuedOn=result.attestat_issued_on,
        lowConfidenceFields=result.low_confidence_fields,
        stub=result.stub,
        error=result.error,
    )
