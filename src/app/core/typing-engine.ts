import { Service, computed, signal } from '@angular/core';
import { CharView, Keystroke, Status } from './models';

@Service()
export class TypingEngine {

    readonly text = signal('The quick brown fox jumps over the lazy dog.');
    readonly typed = signal('');
    readonly status = signal<Status>('idle');

    readonly cursor = computed(() => this.typed().length);

    readonly chars = computed<CharView[]>(() => {
        const typed = this.typed();
        return [...this.text()].map((ch, i) => ({
            ch,
            state: i >= typed.length ? 'pending' : typed[i] === ch ? 'correct' : 'wrong'
        }));
    });

    log: Keystroke[] = [];
    private startTime = 0;

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
        }
        const t = performance.now() - this.startTime;
    
        if (isBackspace) {
            this.log.push({t, expected: null, typed: 'Backspace', correct: true});
            this.typed.set(typed.slice(0, -1));
            return;
        }

        const expected = this.text()[typed.length];
        this.log.push({ t, expected, typed: e.key, correct: e.key === expected });
        this.typed.set(typed + e.key);

        if (this.typed().length === this.text().length) {
            this.status.set('finished');
            console.table(this.log);
        }
    }

    reset(text = this.text()): void {
        this.text.set(text);
        this.typed.set('');
        this.status.set('idle');
        this.log = [];
    }
}
