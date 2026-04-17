import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import type { Chunk, EngWord } from './types';

interface KaraokeCaptionProps {
  activeChunk: Chunk | null;
  activeWord: EngWord | null;
  visibleWords: EngWord[];
  segmentProgress: number;
  hasWordTiming: boolean;
}

export function KaraokeCaption({
  activeChunk,
  activeWord,
  visibleWords,
  segmentProgress,
  hasWordTiming,
}: KaraokeCaptionProps) {
  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-[0_24px_60px_-32px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Guided signing lesson
          </p>
          <h2 className="mt-1 text-2xl font-bold text-card-foreground sm:text-3xl">
            Follow each signed word in rhythm
          </h2>
        </div>
        <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-sm">
          {hasWordTiming ? 'Word sync' : 'Segment sync'}
        </Badge>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-muted/45 p-4 sm:p-6">
        {activeChunk?.sasl_gloss ? (
          <p className="text-center font-mono text-sm font-bold tracking-[0.24em] text-muted-foreground sm:text-base">
            {activeChunk.sasl_gloss}
          </p>
        ) : (
          <p className="text-center text-sm font-medium text-muted-foreground sm:text-base">
            The current SASL gloss will appear here while you watch.
          </p>
        )}

        <div className="mt-5 flex min-h-28 flex-wrap items-center justify-center gap-x-3 gap-y-4 sm:min-h-36 sm:gap-x-4">
          {visibleWords.length > 0 ? (
            visibleWords.map((word) => {
              const isActive = activeWord ? activeWord.id === word.id : Boolean(activeChunk);
              const isPast = activeWord ? word.end_sec <= activeWord.start_sec : false;

              return (
                <span
                  key={word.id}
                  className={cn(
                    'rounded-full px-3 py-2 text-2xl font-bold leading-none tracking-tight transition-all duration-200 ease-out sm:px-4 sm:py-3 sm:text-4xl',
                    isActive && 'scale-[1.06] bg-primary text-primary-foreground shadow-lg shadow-primary/25',
                    !isActive && isPast && 'bg-accent text-accent-foreground/85',
                    !isActive && !isPast && 'text-karaoke-inactive'
                  )}
                >
                  {word.word}
                </span>
              );
            })
          ) : (
            <p className="text-center text-lg text-muted-foreground sm:text-xl">
              Play the lesson to see the guided karaoke text.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Segment progress</span>
          <span>{Math.round(segmentProgress)}%</span>
        </div>
        <Progress value={segmentProgress} className="h-3 rounded-full bg-primary/15" />
      </div>
    </section>
  );
}