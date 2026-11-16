from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.services.ocr import recognize_attestat

app = FastAPI(title="ai-service", version="0.1.0")


class OcrAttestatRequest(BaseModel):
    storageKey: str | None = None


class OcrAttestatResponse(BaseModel):
    graduateName: str
    schoolName: str
    attestatAverage: float = Field(ge=1, le=10)
    attestatIssuedOn: str
    lowConfidenceFields: list[str]


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/ocr/attestat", response_model=OcrAttestatResponse)
def ocr_attestat(body: OcrAttestatRequest):
    result = recognize_attestat(body.storageKey)
    return OcrAttestatResponse(
        graduateName=result.graduate_name,
        schoolName=result.school_name,
        attestatAverage=result.attestat_average,
        attestatIssuedOn=result.attestat_issued_on,
        lowConfidenceFields=result.low_confidence_fields,
    )
