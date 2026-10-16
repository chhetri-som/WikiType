import { Service, computed, inject, signal } from '@angular/core';
import { buildResult, wpm } from './metrics';
import { CharView, Keystroke, Passage, Status, TestConfig, TestResult } from './models';
import { DEFAULT_CONFIG, wordsNeeded } from './modes';
import { PassageError, PassageService, PassageSource } from './passage.service';
import { placeholderText } from './placeholder-text';

const TICK_MS = 100;
const LIVE_WPM_AFTER_MS = 1000;

@Service()
export class TypingEngine {

    readonly config = signal<TestConfig>(DEFAULT_CONFIG);
    readonly text = signal('');
    readonly passage = signal<Passage | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
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
    private readonly passages = inject(PassageService);
    private requestId = 0;
    private source: PassageSource | null = null;
    private controller: AbortController | null = null;
    private startTime = 0;
    private timer: ReturnType<typeof setInterval> | null = null;

    handleKey(e: KeyboardEvent): void {
        if (this.loading() || this.text().length === 0) return;
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
      if (this.loading()) return;
      if (this.source) {
        this.applyPassage(this.passages.assemblePassage(this.source, config));
      } else {
        this.reset(placeholderText(wordsNeeded(config)));
      }
    }

    newPassage(): void {
      void this.loadPassage();
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
    private applyPassage(passage: Passage): void {
      this.passage.set(passage);
      this.reset(passage.text);
    }

    private async loadPassage(): Promise<void> {
      this.controller?.abort();
      const controller = new AbortController();
      this.controller = controller;
      const id = ++this.requestId;

      this.source = null;
      this.reset('');
      this.passage.set(null);
      this.error.set(null);
      this.loading.set(true);

      try {
        const source = await this.passages.fetchSource(this.config(), controller.signal);
        if (id !== this.requestId) return;
        this.source = source;
        this.applyPassage(this.passages.assemblePassage(source, this.config()));
      } catch (err) {
        if (id !== this.requestId) return;
        console.warn('Passage load failed, using sample text', err);
        this.error.set(
          err instanceof PassageError && err.kind === 'quality'
            ? "Couldn't find a suitable article, so this is a sample text."
            : "Couldn't reach Wikipedia, so this is a sample text.",
        );
        this.reset(placeholderText(wordsNeeded(this.config())));
      } finally {
        if (id === this.requestId) this.loading.set(false);
      }
    }

    private finish(durationMs: number): void {
      this.stopTicker();
      this.elapsedMs.set(durationMs);
      this.status.set('finished');
      this.result.set(buildResult(this.config(), this.log, durationMs, this.passage()));
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
