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
  getDisplayChunk,
  getChunkWords,
  normalizeChunks,
  normalizeWords,
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
  const animationFrameRef = useRef<number | null>(null);

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
        setEngWords([]);

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
    if (!videoRef.current) return;

    const nextTime = videoRef.current.currentTime;
    setVideoTime((previousTime) => (Math.abs(previousTime - nextTime) > 0.01 ? nextTime : previousTime));
    setIsPlaying(!videoRef.current.paused && !videoRef.current.ended);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
      videoRef.current.playbackRate = playbackRate;
      handleTimeUpdate();
    }
  }, [handleTimeUpdate, playbackRate]);

  const seekToTime = useCallback((time: number) => {
    if (!videoRef.current) return;
    const boundedTime = Math.max(0, Math.min(time, duration || time));
    videoRef.current.currentTime = boundedTime;
    setVideoTime(boundedTime);
    setIsPlaying(!videoRef.current.paused && !videoRef.current.ended);
  }, [duration]);

  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    const syncPlaybackTime = () => {
      if (!videoRef.current) return;

      const nextTime = videoRef.current.currentTime;
      setVideoTime((previousTime) => (Math.abs(previousTime - nextTime) > 0.016 ? nextTime : previousTime));
      animationFrameRef.current = window.requestAnimationFrame(syncPlaybackTime);
    };

    animationFrameRef.current = window.requestAnimationFrame(syncPlaybackTime);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying]);

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

  const normalizedChunks = useMemo(() => normalizeChunks(chunks, duration), [chunks, duration]);
  const normalizedWords = useMemo(() => normalizeWords(engWords, normalizedChunks, duration), [engWords, normalizedChunks, duration]);
  const activeChunk = useMemo(() => getActiveChunk(normalizedChunks, videoTime), [normalizedChunks, videoTime]);
  const activeWord = useMemo(() => getActiveWord(normalizedWords, videoTime), [normalizedWords, videoTime]);
  const currentChunk = useMemo(() => getDisplayChunk(normalizedChunks, videoTime), [normalizedChunks, videoTime]);
  const chunkWords = useMemo(
    () => getChunkWords(normalizedWords, currentChunk?.id),
    [currentChunk?.id, normalizedWords]
  );
  const visibleWords = chunkWords.length > 0 ? chunkWords : buildFallbackWords(currentChunk);
  const hasWordTiming = chunkWords.length > 0;
  const segmentProgress = activeChunk
    ? clampProgress(((videoTime - activeChunk.start_sec) / Math.max(activeChunk.end_sec - activeChunk.start_sec, 0.001)) * 100)
    : 0;
  const canStep = normalizedChunks.length > 0;
  const currentChunkIndex = currentChunk ? normalizedChunks.findIndex((chunk) => chunk.id === currentChunk.id) + 1 : 0;

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
    if (normalizedChunks.length === 0) return;

    const activeIndex = activeChunk
      ? normalizedChunks.findIndex((chunk) => chunk.id === activeChunk.id)
      : -1;
    const upcomingIndex = normalizedChunks.findIndex((chunk) => chunk.start_sec > videoTime + 0.01);
    const previousIndex = [...normalizedChunks].reverse().findIndex((chunk) => chunk.start_sec < videoTime - 0.01);

    let nextIndex = 0;

    if (direction === 'forward') {
      if (activeIndex >= 0) {
        nextIndex = Math.min(activeIndex + 1, normalizedChunks.length - 1);
      } else {
        nextIndex = upcomingIndex >= 0 ? upcomingIndex : normalizedChunks.length - 1;
      }
    } else if (activeIndex >= 0) {
      nextIndex = Math.max(activeIndex - 1, 0);
    } else if (previousIndex >= 0) {
      nextIndex = normalizedChunks.length - 1 - previousIndex;
    }

    seekToTime(normalizedChunks[nextIndex].start_sec);
    videoRef.current?.pause();
    setIsPlaying(false);
  }, [activeChunk, normalizedChunks, seekToTime, videoTime]);

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
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Learner lesson view</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{lessonTitle}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Watch the sign on the left and follow the guided English karaoke track on the right as each word lights up in rhythm.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)] xl:items-start">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_28px_80px_-40px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]">
            {videoUrl ? (
              <video
                ref={videoRef}
                className="aspect-video w-full bg-muted object-cover"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleLoadedMetadata}
                onPlay={() => {
                  setIsPlaying(true);
                  handleTimeUpdate();
                }}
                onPause={() => {
                  setIsPlaying(false);
                  handleTimeUpdate();
                }}
                onSeeked={handleTimeUpdate}
                playsInline
                preload="metadata"
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

          <PlayerControls
            completed={completed}
            canStep={canStep}
            currentTime={videoTime}
            duration={duration}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            onReplay={replayLesson}
            onSeek={seekToTime}
            onStepBackward={() => stepToChunk('backward')}
            onTogglePlay={togglePlayback}
            onStepForward={() => stepToChunk('forward')}
            onCyclePlaybackRate={cyclePlaybackRate}
          />
        </section>

        <aside className="xl:sticky xl:top-24">
          <KaraokeCaption
            currentChunk={currentChunk}
            activeChunk={activeChunk}
            activeWord={activeWord}
            visibleWords={visibleWords}
            segmentProgress={segmentProgress}
            hasWordTiming={hasWordTiming}
            segmentIndex={currentChunkIndex}
            totalSegments={normalizedChunks.length}
          />
        </aside>
      </div>

      <div className="mt-8 text-center xl:text-left">
        <Button variant="outline" size="lg" asChild>
          <Link to="/lessons">← Back to Lessons</Link>
        </Button>
      </div>
    </main>
  );
};
