import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WordEntry {
  word: string;
  start_sec: number;
  end_sec: number;
  word_order: number;
  chunk_id: string;
}

interface ChunkEntry {
  id: string;
  start_sec: number;
  end_sec: number;
  english_text: string;
  sasl_gloss: string | null;
}

interface KaraokePlayerProps {
  lessonId: string;
  videoUrl: string;
  title: string;
}

export function KaraokePlayer({ lessonId, videoUrl, title }: KaraokePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [chunks, setChunks] = useState<ChunkEntry[]>([]);
  const [words, setWords] = useState<WordEntry[]>([]);

  useEffect(() => {
    async function load() {
      const { data: chunkData } = await supabase
        .from('saslgloss_chunks')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order');

      if (chunkData) {
        setChunks(chunkData.map(c => ({
          id: c.id,
          start_sec: Number(c.start_sec),
          end_sec: Number(c.end_sec),
          english_text: c.english_text,
          sasl_gloss: c.sasl_gloss,
        })));

        const chunkIds = chunkData.map(c => c.id);
        const { data: wordData } = await supabase
          .from('eng_words')
          .select('*')
          .in('chunk_id', chunkIds)
          .order('word_order');

        if (wordData) {
          setWords(wordData.map(w => ({
            word: w.word,
            start_sec: Number(w.start_sec),
            end_sec: Number(w.end_sec),
            word_order: w.word_order,
            chunk_id: w.chunk_id,
          })));
        }
      }
    }
    load();
  }, [lessonId]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const restart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setPlaying(true);
  };

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setSpeed(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
  };

  // Find current chunk
  const activeChunk = chunks.find(
    c => currentTime >= c.start_sec && currentTime < c.end_sec
  );

  // Get words for active chunk
  const activeWords = activeChunk
    ? words.filter(w => w.chunk_id === activeChunk.id)
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        <h1 className="mb-6 text-3xl font-bold text-foreground">{title}</h1>

        {/* Video */}
        <div className="overflow-hidden rounded-2xl bg-foreground/5 shadow-xl">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full"
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button onClick={restart} variant="outline" size="lg">
            <RotateCcw className="mr-2 h-5 w-5" />
            Restart
          </Button>
          <Button onClick={togglePlay} size="lg" className="h-14 w-14 rounded-full p-0">
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button onClick={changeSpeed} variant="outline" size="lg" className="min-w-[5rem]">
            {speed}x
          </Button>
        </div>

        {/* SASL Gloss */}
        {activeChunk?.sasl_gloss && (
          <div className="mt-6 text-center">
            <p className="font-mono text-xl font-bold tracking-wider text-muted-foreground">
              {activeChunk.sasl_gloss}
            </p>
          </div>
        )}

        {/* Karaoke Text */}
        <div className="mt-6 rounded-2xl bg-card p-8 shadow-lg ring-1 ring-border">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {activeWords.length > 0 ? (
              activeWords.map((w, i) => {
                const isActive = currentTime >= w.start_sec && currentTime < w.end_sec;
                const isPast = currentTime >= w.end_sec;
                return (
                  <span
                    key={i}
                    className={`inline-block text-3xl font-bold transition-all duration-200 sm:text-4xl ${
                      isActive
                        ? 'scale-110 text-primary'
                        : isPast
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'
                    }`}
                  >
                    {w.word}
                  </span>
                );
              })
            ) : (
              <p className="text-2xl text-muted-foreground">
                {chunks.length > 0 ? 'Play the video to see karaoke text...' : 'No segments available for this lesson.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
