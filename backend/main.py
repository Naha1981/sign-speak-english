from typing import List, Optional
from datetime import datetime
import os

import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from auth import require_admin, require_user
from sasl_client import run_sasl_recognition_and_store
from supabase_client import SERVICE_HEADERS, SUPABASE_URL, insert_row, query_table

# === Load environment variables ===
load_dotenv()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8080/predict")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# === Pydantic models (simple data shapes) ===
class VideoCreate(BaseModel):
    title: str
    grade_level: str
    storage_url: str
    duration_sec: float
    is_published: bool = False


class VideoOut(BaseModel):
    id: str
    title: str
    grade_level: str
    language: str
    is_published: bool
    storage_url: str
    duration_sec: float
    created_at: str


class SASLGlossChunkBase(BaseModel):
    start_sec: float
    end_sec: float
    saslgloss: Optional[str] = None
    english_text: str


class EngWordBase(BaseModel):
    eng_word: str
    start_sec: float
    end_sec: float
    saslgloss_id: str


class AIGlobalSuggestion(BaseModel):
    id: str
    video_id: str
    start_sec: float
    end_sec: float
    ai_saslgloss: Optional[str] = None
    ai_english: str
    confidence: Optional[float] = None
    status: str
    created_at: str


class LessonFullOut(BaseModel):
    lesson: dict
    chunks: List[SASLGlossChunkBase]
    eng_words: List[EngWordBase]
    ai_suggestions: List[AIGlobalSuggestion]


app = FastAPI(title="SASL Read FastAPI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://sasl-speak-english.lovable.app",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _insert_ai_suggestion(video_id: str, segment: dict):
    ai_data = {
        "video_id": video_id,
        "start_sec": segment.get("start_sec") or segment.get("start") or 0,
        "end_sec": segment.get("end_sec") or segment.get("end") or 0,
        "ai_saslgloss": segment.get("ai_saslgloss") or segment.get("saslgloss"),
        "ai_english": segment.get("ai_english") or segment.get("english") or "",
        "confidence": segment.get("confidence"),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }
    insert_row("ai_suggestions", ai_data)


def _simulate_ai_suggestions(video_id: str):
    segments = [
        {
            "start": 0.5,
            "end": 3.0,
            "ai_saslgloss": "[NAME] [MY]",
            "ai_english": "My name is",
            "confidence": 0.6,
        },
        {
            "start": 3.5,
            "end": 6.0,
            "ai_saslgloss": "[NAME] [THABISO]",
            "ai_english": "Thabiso",
            "confidence": 0.7,
        },
    ]

    for seg in segments:
        _insert_ai_suggestion(video_id, seg)


def _run_ai_pipeline(video_id: str, video: dict):
    start_sec = 0.0
    end_sec = video.get("duration_sec") or 0.0

    try:
        run_sasl_recognition_and_store(video_id, start_sec, end_sec)
    except Exception:
        # Keep the route working even if the AI service is not available.
        pass


@app.post("/videos/upload", response_model=VideoOut)
def upload_video(video: VideoCreate):
    video_data = {
        "title": video.title,
        "grade_level": video.grade_level,
        "language": "SASL",
        "is_published": video.is_published,
        "storage_url": video.storage_url,
        "duration_sec": video.duration_sec,
        "created_at": datetime.utcnow().isoformat(),
    }
    supabase_video = insert_row("videos", video_data)
    v = supabase_video[0]
    return VideoOut(
        id=v["id"],
        title=v["title"],
        grade_level=v["grade_level"],
        language=v["language"],
        is_published=v["is_published"],
        storage_url=v["storage_url"],
        duration_sec=v["duration_sec"],
        created_at=v["created_at"],
    )


@app.post("/videos/{video_id}/ai/run", status_code=202)
def trigger_ai_run(
    video_id: str,
    background_tasks: BackgroundTasks,
):
    video_res = query_table("videos", {"id": video_id})
    if not video_res:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_res[0]
    background_tasks.add_task(_run_ai_pipeline, video_id, video)
    return JSONResponse(
        {"message": "AI pipeline started; real model will be used when available.", "video_id": video_id}
    )


@app.get("/videos/{video_id}/ai_suggestions")
def get_ai_suggestions(video_id: str, status: Optional[str] = None, auth=Depends(require_user)):
    filters = {"video_id": video_id}
    if status:
        filters["status"] = status
    rows = query_table("ai_suggestions", filters)
    return [AIGlobalSuggestion(**r) for r in rows]


@app.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: str):
    lesson_rows = query_table("lessons", {"id": lesson_id})
    if not lesson_rows:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson = lesson_rows[0]

    chunks = query_table("saslgloss_chunks", {"lesson_id": lesson_id})
    chunk_objs = [SASLGlossChunkBase(**c) for c in chunks]

    saslgloss_ids = [c["id"] for c in chunks]
    if saslgloss_ids:
        params = {"saslgloss_id": "in.(" + ",".join(saslgloss_ids) + ")"}
        eng_words = requests.get(
            f"{SUPABASE_URL}/rest/v1/eng_words",
            headers=SERVICE_HEADERS,
            params=params,
            timeout=15,
        ).json()
    else:
        eng_words = []

    word_objs = [EngWordBase(**w) for w in eng_words]
    video_id = lesson["video_id"]
    suggestions = query_table("ai_suggestions", {"video_id": video_id, "status": "pending"})
    suggestion_objs = [AIGlobalSuggestion(**s) for s in suggestions]

    return LessonFullOut(
        lesson=lesson,
        chunks=chunk_objs,
        eng_words=word_objs,
        ai_suggestions=suggestion_objs,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
