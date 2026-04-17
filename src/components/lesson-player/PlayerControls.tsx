import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/components/lesson-player/utils';

interface PlayerControlsProps {
  completed: boolean;
  canStep: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  onReplay: () => void;
  onSeek: (time: number) => void;
  onStepBackward: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onCyclePlaybackRate: () => void;
}

export function PlayerControls({
  completed,
  canStep,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  onReplay,
  onSeek,
  onStepBackward,
  onTogglePlay,
  onStepForward,
  onCyclePlaybackRate,
}: PlayerControlsProps) {
  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_60px_-32px_color-mix(in_oklab,var(--color-primary)_30%,transparent)] sm:p-5">
      <div className="flex items-center justify-between gap-4 text-sm font-semibold text-muted-foreground">
        <span>Lesson progress</span>
        <span>
          {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.1)}
        step="0.01"
        value={Math.min(currentTime, Math.max(duration, 0.1))}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-primary"
        aria-label="Seek lesson playback"
      />

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <Button type="button" variant="outline" size="lg" className="rounded-full px-5" onClick={onReplay}>
          <RotateCcw className="mr-2 h-5 w-5" />
          Replay
        </Button>

        <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={onStepBackward} disabled={!canStep}>
          <SkipBack className="h-5 w-5" />
          <span className="sr-only">Previous segment</span>
        </Button>

        <Button type="button" size="icon" className="h-16 w-16 rounded-full shadow-lg shadow-primary/25" onClick={onTogglePlay}>
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
          <span className="sr-only">{isPlaying ? 'Pause lesson' : 'Play lesson'}</span>
        </Button>

        <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={onStepForward} disabled={!canStep}>
          <SkipForward className="h-5 w-5" />
          <span className="sr-only">Next segment</span>
        </Button>

        <Button type="button" variant="outline" size="lg" className="min-w-20 rounded-full px-5" onClick={onCyclePlaybackRate}>
          {playbackRate}x
        </Button>

        {completed && (
          <div className="rounded-full bg-success/15 px-4 py-2 text-sm font-semibold text-success">
            Lesson completed
          </div>
        )}
      </div>
    </section>
  );
}