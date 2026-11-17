from __future__ import annotations

import base64
import json
import re
from typing import Any

import httpx

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL

PROMPT = """\
Ты распознаёшь белорусский аттестат об общем среднем образовании по фото.
Верни ТОЛЬКО JSON без markdown со схемой:
{
  "graduateName": "ФИО как в аттестате",
  "schoolName": "полное название учреждения",
  "attestatAverage": 9.0,
  "attestatIssuedOn": "YYYY-MM-DD",
  "lowConfidenceFields": ["schoolName"]
}
Правила:
- attestatAverage — число от 1.0 до 10.0 (запятую в числе замени на точку).
- attestatIssuedOn — дата выдачи аттестата, не дата рождения.
- Если поле неуверенно — всё равно заполни лучшую гипотезу и добавь ключ в lowConfidenceFields.
- Не выдумывай чужие демо-данные вроде «Иванов Иван Иванович» / «Гимназия № 1 г. Минска».
"""


def recognize_with_vision(
    image_bytes: bytes,
    content_type: str,
) -> dict[str, Any]:
    if content_type == "application/pdf":
        raise ValueError(
            "PDF через Vision пока не поддержан — загрузите JPG/PNG скан"
        )

    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{content_type};base64,{b64}"

    payload = {
        "model": OPENAI_MODEL,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
    }

    with httpx.Client(timeout=90.0) as client:
        res = client.post(
            f"{OPENAI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if res.is_error:
            # Prefer API error payload for clearer upstream messages.
            detail = res.text
            try:
                err = res.json().get("error") or {}
                if isinstance(err, dict):
                    detail = err.get("code") or err.get("message") or detail
                    msg = err.get("message")
                    code = err.get("code")
                    if code and msg:
                        detail = f"{code}: {msg}"
            except Exception:
                pass
            raise RuntimeError(f"HTTP {res.status_code}: {detail}") from None
        body = res.json()

    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return _normalize(parsed)


def _normalize(raw: dict[str, Any]) -> dict[str, Any]:
    name = str(raw.get("graduateName") or "").strip()
    school = str(raw.get("schoolName") or "").strip()
    issued = str(raw.get("attestatIssuedOn") or "").strip()

    average_raw = raw.get("attestatAverage")
    average: float | None
    if average_raw is None or average_raw == "":
        average = None
    else:
        average = float(str(average_raw).replace(",", "."))
        if average < 1 or average > 10:
            average = None

    # Accept DD.MM.YYYY → YYYY-MM-DD
    m = re.fullmatch(r"(\d{2})\.(\d{2})\.(\d{4})", issued)
    if m:
        issued = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"

    low = raw.get("lowConfidenceFields") or []
    if not isinstance(low, list):
        low = []

    return {
        "graduateName": name,
        "schoolName": school,
        "attestatAverage": average,
        "attestatIssuedOn": issued,
        "lowConfidenceFields": [str(x) for x in low],
        "stub": False,
    }
