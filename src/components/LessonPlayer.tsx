import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface EngWord {
  id: string;
  word: string;
  start_sec: number;
  end_sec: number;
  word_order: number;
  chunk_id: string;
}

interface Chunk {
  id: string;
  start_sec: number;
  end_sec: number;
  sasl_gloss: string | null;
  english_text: string;
  sort_order: number;
}

type Props = {
  lessonId: string;
};

export const LessonPlayer: React.FC<Props> = ({ lessonId }) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [engWords, setEngWords] = useState<EngWord[]>([]);
  const [videoTime, setVideoTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // Load lesson data directly from Supabase
  useEffect(() => {
    async function load() {
      try {
        // Get lesson + video
        const { data: lesson, error: lessonErr } = await supabase
          .from('lessons')
          .select('*, videos(*)')
          .eq('id', lessonId)
          .single();

        if (lessonErr || !lesson) {
          setError('Lesson not found');
          setLoading(false);
          return;
        }

        setLessonTitle(lesson.title);
        const video = lesson.videos as unknown as { video_url: string | null };
        setVideoUrl(video?.video_url ?? null);

        // Get chunks
        const { data: chunkData } = await supabase
          .from('saslgloss_chunks')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('sort_order');

        const loadedChunks = (chunkData ?? []).map(c => ({
          id: c.id,
          start_sec: Number(c.start_sec),
          end_sec: Number(c.end_sec),
          sasl_gloss: c.sasl_gloss,
          english_text: c.english_text,
          sort_order: c.sort_order,
        }));
        setChunks(loadedChunks);

        // Get eng_words for all chunks
        if (loadedChunks.length > 0) {
          const chunkIds = loadedChunks.map(c => c.id);
          const { data: wordData } = await supabase
            .from('eng_words')
            .select('*')
            .in('chunk_id', chunkIds)
            .order('start_sec');

          setEngWords((wordData ?? []).map(w => ({
            id: w.id,
            word: w.word,
            start_sec: Number(w.start_sec),
            end_sec: Number(w.end_sec),
            word_order: w.word_order,
            chunk_id: w.chunk_id,
          })));
        }

        // Check completion status
        if (user) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('completed')
            .eq('lesson_id', lessonId)
            .eq('user_id', user.id)
            .maybeSingle();
          setCompleted(progress?.completed ?? false);
        }
      } catch {
        setError('Failed to load lesson');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId, user]);

  // Sync video time
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setVideoTime(videoRef.current.currentTime);
  }, []);

  // Mark lesson complete when video ends
  const handleVideoEnded = useCallback(async () => {
    if (!user || completed) return;
    const { error: err } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
    if (!err) {
      setCompleted(true);
      toast.success('Lesson completed! 🎉');
    }
  }, [user, lessonId, completed]);

  // Find current active chunk and word
  const activeChunk = chunks.find(c => videoTime >= c.start_sec && videoTime < c.end_sec);
  const activeWordIndex = engWords.findIndex(w => videoTime >= w.start_sec && videoTime < w.end_sec);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-destructive">{error}</p>
        <Button asChild className="mt-4">
          <Link to="/lessons">Back to Lessons</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-center text-2xl font-bold text-foreground sm:text-3xl">{lessonTitle}</h1>

      {/* Video */}
      <div className="overflow-hidden rounded-xl bg-foreground/5">
        {videoUrl ? (
          <video
            ref={videoRef}
            controls
            className="w-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          >
            <source src={videoUrl} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="flex aspect-video items-center justify-center text-lg text-muted-foreground">
            Video not available
          </div>
        )}
      </div>

      {/* Karaoke display */}
      <div className="mt-6 rounded-xl bg-card p-6 shadow ring-1 ring-border">
        {engWords.length > 0 ? (
          <>
            {/* SASL Gloss line */}
            {activeChunk?.sasl_gloss && (
              <p className="mb-3 text-center font-mono text-base text-muted-foreground tracking-wider">
                {activeChunk.sasl_gloss}
              </p>
            )}
            {/* English words - karaoke style */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xl sm:text-2xl leading-relaxed">
              {engWords.map((word, i) => {
                const isActive = i === activeWordIndex;
                return (
                  <span
                    key={word.id}
                    className={`transition-all duration-200 rounded px-1 ${
                      isActive
                        ? 'font-bold text-primary bg-primary/10 scale-110'
                        : videoTime > word.end_sec
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                    }`}
                  >
                    {word.word}
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-center text-lg text-muted-foreground">
            No subtitles available for this lesson yet.
          </p>
        )}
      </div>

      {/* Completion badge */}
      {completed && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-base font-semibold text-primary">
            ✅ Lesson Completed
          </span>
        </div>
      )}

      <div className="mt-6 text-center">
        <Button variant="outline" size="lg" asChild>
          <Link to="/lessons">← Back to Lessons</Link>
        </Button>
      </div>
    </main>
  );
};
