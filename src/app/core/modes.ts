import { Mode, TestConfig } from './models';

export const WORD_PRESETS = [20, 40, 60, 120] as  const;
export const TIME_PRESETS = [20, 40, 60, 120] as const;

export const CUSTOM_LIMITS = {
  words: { min: 5, max: 500 },
  seconds: { min: 5, max: 600},
} as const;

export const DEFAULT_CONFIG: TestConfig = { mode: 'words', words: 40 };

export const ASSUMED_MAX_WPM = 250;

export function presetsFor(mode: Mode): readonly number[] {
  return mode === 'words' ? WORD_PRESETS: TIME_PRESETS;
}

export function limitsFor(mode: Mode): { min: number; max: number } {
  return mode === 'words' ? CUSTOM_LIMITS.words : CUSTOM_LIMITS.seconds;
}

export function clampCustom(mode: Mode, value: number): number {
  const { min, max } = limitsFor(mode);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function buildConfig(mode: Mode, value: number): TestConfig {
  return mode === 'words' ? { mode, words: value} : { mode, seconds: value };
}

export function configValue(config: TestConfig): number {
  return config.mode === 'words' ? config.words : config.seconds;
}

export function wordsNeeded(config: TestConfig): number {
  return config.mode === 'words'
      ? config.words
      : Math.ceil((config.seconds / 60) * ASSUMED_MAX_WPM);
}
