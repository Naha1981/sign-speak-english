export interface EngWord {
  id: string;
  word: string;
  start_sec: number;
  end_sec: number;
  word_order: number;
  chunk_id: string;
}

export interface Chunk {
  id: string;
  start_sec: number;
  end_sec: number;
  sasl_gloss: string | null;
  english_text: string;
  sort_order: number;
}