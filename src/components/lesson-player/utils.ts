import type { Chunk, EngWord } from './types';

export function getActiveChunk(chunks: Chunk[], currentTime: number) {
  return chunks.find((chunk) => currentTime >= chunk.start_sec && currentTime < chunk.end_sec) ?? null;
}

export function getActiveWord(words: EngWord[], currentTime: number) {
  return words.find((word) => currentTime >= word.start_sec && currentTime < word.end_sec) ?? null;
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