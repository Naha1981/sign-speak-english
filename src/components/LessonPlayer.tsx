// src/components/LessonPlayer.tsx
import React, { useEffect, useState } from "react";
import { supabase } from '@/integrations/supabase/client';

interface EngWord {
  eng_word: string;
  start_sec: number;
  end_sec: number;
  saslgloss_id: string;
}

interface SASLGlossChunk {
  start_sec: number;
  end_sec: number;
  saslgloss?: string | null;
  english_text: string;
}

interface AIGlobalSuggestion {
  id: string;
  video_id: string;
  start_sec: number;
  end_sec: number;
  ai_saslgloss?: string | null;
  ai_english: string;
  confidence?: number | null;
  status: string;
  created_at: string;
}

interface LessonFullOut {
  lesson: {
    id: string;
    title: string;
    video_id: string;
    status: string;
    created_at: string;
  };
  chunks: SASLGlossChunk[];
  eng_words: EngWord[];
  ai_suggestions: AIGlobalSuggestion[];
}

type Props = {
  lessonId: string;
};

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const LessonPlayer: React.FC<Props> = ({ lessonId }) => {
  const [lessonData, setLessonData] = useState<LessonFullOut | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTime, setVideoTime] = useState<number>(0);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  // ===================
  // 1. Load lesson from backend
  // ===================
  useEffect(() => {
    const loadLesson = async () => {
      const response = await fetch(`${BASE_API_URL}/lessons/${lessonId}`);
      if (!response.ok) {
        throw new Error("Could not load lesson");
      }
      const data: LessonFullOut = await response.json();
      setLessonData(data);

      // Fetch video URL from Supabase
      const { data: video } = await supabase
        .from('videos')
        .select('storage_url')
        .eq('id', data.lesson.video_id)
        .single();
      setVideoUrl(video?.storage_url ?? null);
    };

    loadLesson();
  }, [lessonId]);

  // ===================
  // 2. Sync video time with video element
  // ===================
  useEffect(() => {
    const v = videoRef;
    if (!v) return;

    const handler = () => {
      setVideoTime(v.currentTime);
    };

    v.addEventListener("timeupdate", handler);
    return () => v.removeEventListener("timeupdate", handler);
  }, [videoRef]);

  // ===================
  // 3. Find current word to highlight
  // ===================
  const currentEngWordIndex = lessonData
    ? lessonData.eng_words.findIndex(
        w => videoTime >= w.start_sec && videoTime <= w.end_sec
      )
    : -1;

  if (!lessonData) {
    return <div>Loading lesson...</div>;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>{lessonData.lesson.title}</h1>

      {/* Video */}
      <div style={{ marginBottom: "20px" }}>
        {videoUrl ? (
          <video
            controls
            ref={(ref) => setVideoRef(ref)}
            style={{ width: "100%", maxHeight: "400px" }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div>Video not available</div>
        )}
      </div>

      {/* Karaoke-style English text */}
      <div
        style={{
          fontSize: "24px",
          lineHeight: "2",
          color: "#000",
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        {lessonData.eng_words.length > 0
          ? lessonData.eng_words.map((word, i) => (
              <span
                key={i}
                style={{
                  margin: "0 4px",
                  fontWeight:
                    i === currentEngWordIndex ? "bold" : "normal",
                  color:
                    i === currentEngWordIndex ? "#007acc" : "inherit",
                  transition: "color 0.2s",
                }}
              >
                {word.eng_word}
              </span>
            ))
          : "No words yet."}
      </div>

      {/* Optional: show AI suggestions (debug) */}
      {lessonData.ai_suggestions.length > 0 && (
        <div
          style={{
            fontSize: "14px",
            color: "#666",
            marginTop: "20px",
          }}
        >
          <h4>AI suggestions (dev only):</h4>
          {lessonData.ai_suggestions.map((s) => (
            <div key={s.id}>
              {s.start_sec.toFixed(1)}s–{s.end_sec.toFixed(1)}s →{" "}
              {s.ai_english}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};