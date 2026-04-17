import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { KaraokeCaption } from '@/components/lesson-player/KaraokeCaption';
import { PlayerControls } from '@/components/lesson-player/PlayerControls';
import type { Chunk, EngWord } from '@/components/lesson-player/types';
import {
  buildFallbackWords,
  clampProgress,
  getActiveChunk,
  getActiveWord,
  getChunkWords,
} from '@/components/lesson-player/utils';

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
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
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
        setVideoTime(0);
        setDuration(0);
        setIsPlaying(false);

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

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const seekToTime = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, time);
    setVideoTime(Math.max(0, time));
  }, []);

  // Mark lesson complete when video ends
  const handleVideoEnded = useCallback(async () => {
    setIsPlaying(false);
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

  const activeChunk = useMemo(() => getActiveChunk(chunks, videoTime), [chunks, videoTime]);
  const activeWord = useMemo(() => getActiveWord(engWords, videoTime), [engWords, videoTime]);
  const chunkWords = useMemo(
    () => getChunkWords(engWords, activeChunk?.id),
    [engWords, activeChunk?.id]
  );
  const visibleWords = chunkWords.length > 0 ? chunkWords : buildFallbackWords(activeChunk);
  const hasWordTiming = chunkWords.length > 0;
  const segmentProgress = activeChunk
    ? clampProgress(((videoTime - activeChunk.start_sec) / Math.max(activeChunk.end_sec - activeChunk.start_sec, 0.001)) * 100)
    : 0;
  const canStep = chunks.length > 0;

  const togglePlayback = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } catch {
      toast.error('Unable to control video playback');
    }
  }, []);

  const replayLesson = useCallback(async () => {
    if (!videoRef.current) return;

    seekToTime(0);

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      toast.error('Unable to restart the lesson');
    }
  }, [seekToTime]);

  const stepToChunk = useCallback((direction: 'backward' | 'forward') => {
    if (chunks.length === 0) return;

    const currentIndex = activeChunk
      ? chunks.findIndex((chunk) => chunk.id === activeChunk.id)
      : chunks.findIndex((chunk) => chunk.start_sec > videoTime);

    const fallbackIndex = currentIndex === -1 ? (direction === 'forward' ? 0 : chunks.length - 1) : currentIndex;
    const nextIndex = direction === 'forward'
      ? Math.min(fallbackIndex + (activeChunk ? 1 : 0), chunks.length - 1)
      : Math.max(fallbackIndex - 1, 0);

    seekToTime(chunks[nextIndex].start_sec);
    videoRef.current?.pause();
    setIsPlaying(false);
  }, [activeChunk, chunks, seekToTime, videoTime]);

  const cyclePlaybackRate = useCallback(() => {
    const speeds = [0.75, 1, 1.25];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextRate = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextRate);

    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

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
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">SASL Read lesson</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{lessonTitle}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Watch the signs, follow the highlighted English words, pause, replay, and practise each segment at your own pace.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_28px_80px_-40px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]">
        {videoUrl ? (
          <video
            ref={videoRef}
            controls
            className="w-full bg-muted"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onSeeked={handleTimeUpdate}
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

      <div className="mt-6">
        <KaraokeCaption
          activeChunk={activeChunk}
          activeWord={activeWord}
          visibleWords={visibleWords}
          segmentProgress={segmentProgress}
          hasWordTiming={hasWordTiming}
        />
      </div>

      <div className="mt-6">
        <PlayerControls
          completed={completed}
          canStep={canStep}
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          onReplay={replayLesson}
          onStepBackward={() => stepToChunk('backward')}
          onTogglePlay={togglePlayback}
          onStepForward={() => stepToChunk('forward')}
          onCyclePlaybackRate={cyclePlaybackRate}
        />
      </div>

      <div className="mt-8 text-center">
        <Button variant="outline" size="lg" asChild>
          <Link to="/lessons">← Back to Lessons</Link>
        </Button>
      </div>
    </main>
  );
};
