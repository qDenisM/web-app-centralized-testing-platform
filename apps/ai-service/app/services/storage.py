from minio import Minio

from app.config import (
    MINIO_ACCESS_KEY,
    MINIO_BUCKET_DOCUMENTS,
    MINIO_ENDPOINT,
    MINIO_SECRET_KEY,
    MINIO_SECURE,
)


def download_object(storage_key: str) -> tuple[bytes, str]:
    """Download attestat scan from MinIO. Returns (bytes, content_type)."""
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE,
    )
    response = client.get_object(MINIO_BUCKET_DOCUMENTS, storage_key)
    try:
        data = response.read()
        content_type = (
            response.headers.get("Content-Type")
            or _guess_content_type(storage_key)
        )
        return data, content_type
    finally:
        response.close()
        response.release_conn()


def _guess_content_type(storage_key: str) -> str:
    lower = storage_key.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".pdf"):
        return "application/pdf"
    return "image/jpeg"
