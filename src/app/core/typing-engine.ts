import { Service, computed, signal } from '@angular/core';
import { buildResult, wpm } from './metrics';
import { CharView, Keystroke, Status, TestConfig, TestResult } from './models';
import { DEFAULT_CONFIG, wordsNeeded } from './modes';
import { placeholderText } from './placeholder-text';

const TICK_MS = 100;
const LIVE_WPM_AFTER_MS = 1000;

@Service()
export class TypingEngine {

    readonly config = signal<TestConfig>(DEFAULT_CONFIG);
    readonly text = signal(placeholderText(wordsNeeded(DEFAULT_CONFIG)));
    readonly typed = signal('');
    readonly status = signal<Status>('idle');
    readonly elapsedMs = signal(0);
    readonly result = signal<TestResult | null>(null);

    private readonly totalKeys = signal(0);
    private readonly wrongKeys = signal(0);

    readonly cursor = computed(() => this.typed().length);

    readonly chars = computed<CharView[]>(() => {
        const typed = this.typed();
        return [...this.text()].map((ch, i) => ({
            ch,
            state: i >= typed.length ? 'pending' : typed[i] === ch ? 'correct' : 'wrong'
        }));
    });

    readonly correctChars = computed(() => this.chars().filter(c => c.state === 'correct').length);
    readonly wordsTyped = computed(() => this.typed().split(' ').length - 1);

    readonly limitMs = computed(() => {
      const c = this.config();
      return c.mode === 'time' ? c.seconds * 1000 : null;
    });

    readonly remainingMs = computed(() => {
      const limit = this.limitMs();
      return limit === null ? null : Math.max(0, limit - this.elapsedMs());
    });

    readonly liveWpm = computed(() =>
        this.elapsedMs() < LIVE_WPM_AFTER_MS ? 0 : Math.round(wpm(this.correctChars(), this.elapsedMs()))
    );

    readonly liveAccuracy = computed(() => {
      const total = this.totalKeys();
      return total === 0 ? 100 : Math.round(((total - this.wrongKeys()) / total) * 100);
    });

    log: Keystroke[] = [];
    private startTime = 0;
    private timer: ReturnType<typeof setInterval> | null = null;

    handleKey(e: KeyboardEvent): void {
        if (this.status() === 'finished') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const isBackspace = e.key === 'Backspace';
        const isPrintable = e.key.length === 1;
        if (!isBackspace && !isPrintable) return;

        e.preventDefault();

        const typed = this.typed();
        if (isBackspace && typed.length === 0) return;

        if (this.status() === 'idle') {
            this.status.set('running');
            this.startTime = performance.now();
            this.startTicker();
        }
        const t = performance.now() - this.startTime;

        const limit = this.limitMs();
        if (limit !== null && t >= limit) {
          this.finish(limit);
          return;
        }

        if (isBackspace) {
            this.log.push({t, expected: null, typed: 'Backspace', correct: true});
            this.typed.set(typed.slice(0, -1));
            return;
        }

        const expected = this.text()[typed.length];
        const correct = e.key === expected;
        this.log.push({ t, expected, typed: e.key, correct });
        this.typed.set(typed + e.key);
        this.totalKeys.update(n => n + 1);
        if (!correct) this.wrongKeys.update(n => n + 1);

        if (this.typed().length === this.text().length) {
            this.finish(t);
        }
    }

    configure(config: TestConfig): void {
      this.config.set(config);
      // todo: replace with PassageService
      this.reset(placeholderText(wordsNeeded(config)));
    }

    reset(text = this.text()): void {
        this.stopTicker();
        this.text.set(text);
        this.typed.set('');
        this.status.set('idle');
        this.elapsedMs.set(0);
        this.totalKeys.set(0);
        this.wrongKeys.set(0);
        this.result.set(null);
        this.log = [];
    }

    // helpers
    private finish(durationMs: number): void {
      this.stopTicker();
      this.elapsedMs.set(durationMs);
      this.status.set('finished');
      this.result.set(buildResult(this.config(), this.log, durationMs));
    }

    private startTicker(): void {
      this.stopTicker();
      this.timer = setInterval(() => this.tick(), TICK_MS);
    }

    private stopTicker(): void {
      if (this.timer != null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }

    private tick(): void {
      const elapsed = performance.now() - this.startTime;
      const limit = this.limitMs();
      if (limit !== null && elapsed >= limit) {
        this.finish(limit);
        return;
      }
      this.elapsedMs.set(elapsed);
    }
}
