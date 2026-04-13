import os
from datetime import datetime
from typing import Any, Dict, List

import requests

from supabase_client import insert_row

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8080/predict")
AI_REQUEST_TIMEOUT = 20


def request_sasl_segments(video_id: str, start_sec: float = 0.0, end_sec: float = 0.0) -> List[Dict[str, Any]]:
    if not AI_SERVICE_URL:
        return []

    payload = {"video_id": video_id, "start_sec": start_sec, "end_sec": end_sec}
    response = requests.post(AI_SERVICE_URL, json=payload, timeout=AI_REQUEST_TIMEOUT)
    response.raise_for_status()
    data = response.json()

    return data.get("segments") or data.get("predictions") or []


def save_ai_suggestions(video_id: str, segments: List[Dict[str, Any]]) -> int:
    inserted = 0
    for segment in segments:
        if not isinstance(segment, dict):
            continue

        start_sec = segment.get("start_sec") or segment.get("start") or 0.0
        end_sec = segment.get("end_sec") or segment.get("end") or 0.0
        ai_saslgloss = segment.get("ai_saslgloss") or segment.get("saslgloss")
        ai_english = segment.get("ai_english") or segment.get("english") or ""
        confidence = segment.get("confidence")

        insert_row(
            "ai_suggestions",
            {
                "video_id": video_id,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "ai_saslgloss": ai_saslgloss,
                "ai_english": ai_english,
                "confidence": confidence,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
            },
        )
        inserted += 1

    return inserted


def run_sasl_recognition_and_store(video_id: str, start_sec: float, end_sec: float) -> int:
    segments = request_sasl_segments(video_id, start_sec, end_sec)
    if not segments:
        return 0
    return save_ai_suggestions(video_id, segments)
