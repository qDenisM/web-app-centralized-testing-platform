import os

from dotenv import load_dotenv

load_dotenv()


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


PORT = int(os.getenv("PORT", "3010"))
HOST = os.getenv("HOST", "0.0.0.0")

# OpenAI-compatible Vision API (optional). Without a key OCR stays a stub.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip(
    "/"
)
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000").replace(
    "http://", ""
).replace("https://", "")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "abiturent")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "abiturent_secret")
MINIO_BUCKET_DOCUMENTS = os.getenv("MINIO_BUCKET_DOCUMENTS", "documents")
MINIO_SECURE = _bool(os.getenv("MINIO_SECURE"), False)

VISION_ENABLED = bool(OPENAI_API_KEY)
