import type { Chunk, EngWord } from './types';

const MIN_ACTIVE_WINDOW_SEC = 0.35;

function resolveTimingWindow(start: number, end: number, nextStart?: number, fallbackEnd?: number) {
  const safeStart = Number.isFinite(start) ? start : 0;
  const explicitEnd = Number.isFinite(end) ? end : safeStart;

  if (explicitEnd > safeStart + 0.01) {
    return explicitEnd;
  }

  const candidates = [nextStart, fallbackEnd].filter(
    (value): value is number => Number.isFinite(value) && value > safeStart + 0.01
  );

  if (candidates.length > 0) {
    return Math.max(safeStart + MIN_ACTIVE_WINDOW_SEC, Math.min(...candidates));
  }

  return safeStart + MIN_ACTIVE_WINDOW_SEC;
}

export function normalizeChunks(chunks: Chunk[], duration = 0) {
  const orderedChunks = [...chunks].sort(
    (a, b) => a.sort_order - b.sort_order || a.start_sec - b.start_sec || a.end_sec - b.end_sec
  );

  return orderedChunks.map((chunk, index) => ({
    ...chunk,
    start_sec: Number(chunk.start_sec) || 0,
    end_sec: resolveTimingWindow(
      Number(chunk.start_sec) || 0,
      Number(chunk.end_sec) || 0,
      orderedChunks[index + 1]?.start_sec,
      duration > (Number(chunk.start_sec) || 0) ? duration : undefined
    ),
  }));
}

export function normalizeWords(words: EngWord[], chunks: Chunk[], duration = 0) {
  const orderedWords = [...words].sort(
    (a, b) => a.start_sec - b.start_sec || a.word_order - b.word_order || a.end_sec - b.end_sec
  );
  const chunkEndMap = new Map(chunks.map((chunk) => [chunk.id, chunk.end_sec]));

  return orderedWords.map((word, index) => {
    const safeStart = Number(word.start_sec) || 0;
    const nextWord = orderedWords[index + 1];
    const nextStart = nextWord?.chunk_id === word.chunk_id ? Number(nextWord.start_sec) || undefined : undefined;

    return {
      ...word,
      start_sec: safeStart,
      end_sec: resolveTimingWindow(
        safeStart,
        Number(word.end_sec) || 0,
        nextStart,
        chunkEndMap.get(word.chunk_id) ?? (duration > safeStart ? duration : undefined)
      ),
    };
  });
}

export function getActiveChunk(chunks: Chunk[], currentTime: number) {
  return chunks.find((chunk) => currentTime >= chunk.start_sec && currentTime < chunk.end_sec) ?? null;
}

export function getActiveWord(words: EngWord[], currentTime: number) {
  return words.find((word) => currentTime >= word.start_sec && currentTime < word.end_sec) ?? null;
}

export function getDisplayChunk(chunks: Chunk[], currentTime: number) {
  return getActiveChunk(chunks, currentTime) ?? chunks.find((chunk) => currentTime < chunk.start_sec) ?? chunks.at(-1) ?? null;
}

export function getChunkWords(words: EngWord[], chunkId: string | null | undefined) {
  if (!chunkId) return [];
  return words
    .filter((word) => word.chunk_id === chunkId)
    .sort((a, b) => a.word_order - b.word_order || a.start_sec - b.start_sec);
}

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function formatTimestamp(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildFallbackWords(chunk: Chunk | null) {
  if (!chunk?.english_text) return [];

  return chunk.english_text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => ({
      id: `${chunk.id}-fallback-${index}`,
      word,
      start_sec: chunk.start_sec,
      end_sec: chunk.end_sec,
      word_order: index,
      chunk_id: chunk.id,
    }));
}