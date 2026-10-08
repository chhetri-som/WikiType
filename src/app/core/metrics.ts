import { CharCounts, Keystroke, SeriesPoint, TestConfig, TestResult } from './models';

const CHARS_PER_WORD = 5;
export const ROLLING_WINDOW_SECONDS = 5;

const isBackspace = (k: Keystroke): boolean => k.typed === 'Backspace';
const round1 = (n: number): number => Math.round(n * 10) / 10;

export function wpm(chars: number, ms:number): number {
  if (ms <= 0) return 0;
  return chars / CHARS_PER_WORD / (ms / 60_000);
}

export function accuracy(log: readonly Keystroke[]): number {
  let total = 0;
  let correct = 0;
  for (const k of log) {
    if (isBackspace(k)) continue;
    total++;
    if (k.correct) correct++;
  }
  return total === 0 ? 100 : round1((correct / total) * 100);
}

export function finalChars(log: readonly Keystroke[]): { correct: number; wrong: number } {
  const stack: boolean[] = [];
  for (const k of log) {
    if (isBackspace(k)) stack.pop();
    else stack.push(k.correct);
  }
  const correct = stack.filter(Boolean).length;
  return { correct, wrong: stack.length - correct };
}

export function consistency(log: readonly Keystroke[], durationMs: number): number {
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 2) return 100;

  const counts = new Array<number>(seconds).fill(0);
  for (const k of log) {
    if (isBackspace(k)) continue;
    const bucket = Math.floor(k.t / 1000);
    if (bucket < seconds) counts[bucket]++;
  }

  const rates = counts.map(c => c * 12);
  const mean = rates.reduce((a, b) => a + b, 0) / seconds;
  if (mean === 0) return 0;

  const variance = rates.reduce((a, r) => a + (r - mean) ** 2, 0) / seconds;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(Math.max(0, 100 - cv * 100));
}

export function buildSeries(
  log: readonly Keystroke[],
  durationMs: number,
  windowSeconds = ROLLING_WINDOW_SECONDS,
): SeriesPoint[] {
  const n = Math.max(1, Math.ceil(durationMs / 1000));

  const cumNet: number[] = [];
  const cumRaw: number[] = [];
  const errors: number[] = [];
  const stack: boolean[] = [];
  let net = 0;
  let raw = 0;
  let k = 0;

  for (let i = 0; i < n; i++) {
    const end = i === n - 1 ? Infinity : (i + 1) * 1000;
    let errs = 0;
    for (; k < log.length && log[k].t < end; k++) {
      const key = log[k];
      if (isBackspace(key)) {
        if (stack.pop()) net--;
      } else {
        raw++;
        stack.push(key.correct);
        if (key.correct) net++;
        else errs++;
      }
    }
    cumNet.push(net);
    cumRaw.push(raw);
    errors.push(errs);
  }

  return cumNet.map((_, i) => {
    const from = Math.max(0, i + 1 - windowSeconds);
    const spanMs = Math.min((i + 1) * 1000, durationMs) - from * 1000;
    const netChars = cumNet[i] - (from === 0 ? 0 : cumNet[from - 1]);
    const rawChars = cumRaw[i] - (from === 0 ? 0 : cumRaw[from - 1]);
    return {
      second: i + 1,
      net: round1(Math.max(0, wpm(netChars, spanMs))),
      raw: round1(wpm(rawChars, spanMs)),
      errors: errors[i],
    };
  });
}

export interface Summary {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  chars: CharCounts;
}

export function summarize(log: readonly Keystroke[], durationMs: number): Summary {
  const { correct, wrong } = finalChars(log);
  const printable = log.filter(k => !isBackspace(k));
  const incorrect  = printable.filter(k => !k.correct).length;

  return {
    wpm: round1(wpm(correct, durationMs)),
    rawWpm: round1(wpm(printable.length, durationMs)),
    accuracy: accuracy(log),
    consistency: consistency(log, durationMs),
    chars: { correct, wrong, corrected: incorrect - wrong },
  };
}

export function buildResult(
  config: TestConfig,
  log: readonly Keystroke[],
  durationMs: number,
): TestResult {
  return {
    config,
    durationMs,
    ...summarize(log, durationMs),
    series: buildSeries(log, durationMs),
    log: [...log],
  };
}
