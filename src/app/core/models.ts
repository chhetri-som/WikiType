export type Status = 'idle' | 'running' | 'finished';
export type CharState = 'pending' | 'correct' | 'wrong';
export type Mode = 'words' | 'time';

export interface Keystroke {
    t: number; // ms since first key
    expected: string | null;
    typed: string;
    correct: boolean;
}

export interface CharView {
    ch: string;
    state: CharState;
}

export type TestConfig =
  | { mode: 'words'; words: number }
  | { mode: 'time'; seconds: number };

export interface SeriesPoint {
  second: number;
  net: number;
  raw: number;
  errors: number;
}

export interface CharCounts {
  correct: number;
  wrong: number;
  corrected: number;
}

export interface TestResult {
  config: TestConfig;
  durationMs: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  chars: CharCounts;
  series: SeriesPoint[],
  log: Keystroke[];
  // todo: passage
}
