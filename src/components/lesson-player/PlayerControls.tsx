import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PlayerControlsProps {
  completed: boolean;
  canStep: boolean;
  isPlaying: boolean;
  playbackRate: number;
  onReplay: () => void;
  onStepBackward: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onCyclePlaybackRate: () => void;
}

export function PlayerControls({
  completed,
  canStep,
  isPlaying,
  playbackRate,
  onReplay,
  onStepBackward,
  onTogglePlay,
  onStepForward,
  onCyclePlaybackRate,
}: PlayerControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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
  );
}