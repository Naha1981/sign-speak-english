from typing import List, Optional
from datetime import datetime
import os
import uuid
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, UUID4
from dotenv import load_dotenv
import requests
import json

# === Load environment variables ===
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env")

supabase_headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# === Simple helpers to talk to Supabase ===
def query_table(table: str, filters: dict = None) -> List[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    if filters:
        for k, v in filters.items():
            params[k] = f"eq.{v}"
    resp = requests.get(url, headers=supabase_headers, params=params)
    resp.raise_for_status()
    return resp.json()


def insert_row(table: str, data: dict) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=supabase_headers, json=data)
    resp.raise_for_status()
    return resp.json()


def update_row(table: str, row_id: str, data: dict) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"id": "eq." + row_id}
    resp = requests.patch(url, headers=supabase_headers, json=data, params=params)
    resp.raise_for_status()
    return resp.json()


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


# === FastAPI app ===
app = FastAPI(title="SASL Read FastAPI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/videos/upload", response_model=VideoOut)
def upload_video(video: VideoCreate):
    # Save to Supabase videos table
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
    # Check if video exists
    video_res = query_table("videos", {"id": video_id})
    if not video_res:
        raise HTTPException(404, "Video not found")
    video = video_res[0]

    # In the real world you'd call a SASL model here.
    # For now, just simulate AI suggestions by inserting fake ones.
    def _simulate_ai_suggestions():
        # Fake example: video is split into two segments
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
            ai_data = {
                "video_id": video_id,
                "start_sec": seg["start"],
                "end_sec": seg["end"],
                "ai_saslgloss": seg["ai_saslgloss"],
                "ai_english": seg["ai_english"],
                "confidence": seg["confidence"],
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
            }
            insert_row("ai_suggestions", ai_data)

    background_tasks.add_task(_simulate_ai_suggestions)
    return JSONResponse({"message": "AI pipeline simulated (fake suggestions created)", "video_id": video_id})


@app.get("/videos/{video_id}/ai_suggestions")
def get_ai_suggestions(video_id: str, status: Optional[str] = None):
    filters = {"video_id": video_id}
    if status:
        filters["status"] = status
    rows = query_table("ai_suggestions", filters)
    return [AIGlobalSuggestion(**r) for r in rows]


@app.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: str):
    lesson_rows = query_table("lessons", {"id": lesson_id})
    if not lesson_rows:
        raise HTTPException(404, "Lesson not found")
    lesson = lesson_rows[0]

    chunks = query_table("saslgloss_chunks", {"lesson_id": lesson_id})
    chunk_objs = [SASLGlossChunkBase(**c) for c in chunks]

    # Get all eng_words linked to these chunks
    saslgloss_ids = [c["id"] for c in chunks]
    if saslgloss_ids:
        # Supabase "in query" syntax
        params = {"saslgloss_id": "in.(" + ",".join(saslgloss_ids) + ")"}
        eng_words = requests.get(
            f"{SUPABASE_URL}/rest/v1/eng_words",
            headers=supabase_headers,
            params=params,
        ).json()
    else:
        eng_words = []

    word_objs = [EngWordBase(**w) for w in eng_words]

    # Get ai_suggestions for the video (via lesson.video_id)
    video_id = lesson["video_id"]
    suggestions = query_table("ai_suggestions", {"video_id": video_id, "status": "pending"})
    suggestion_objs = [AIGlobalSuggestion(**s) for s in suggestions]

    return LessonFullOut(
        lesson=lesson,
        chunks=chunk_objs,
        eng_words=word_objs,
        ai_suggestions=suggestion_objs,
    )