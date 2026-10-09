import { Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { TypingEngine } from '../../core/typing-engine';

const CURSOR_ROW = 2;

@Component({
  imports: [],
  selector: 'app-typing-arena',
  styleUrl: './typing-arena.scss',
  templateUrl: './typing-arena.html',
})
export class TypingArena {
  protected readonly engine = inject(TypingEngine);
  private readonly destroyRef = inject(DestroyRef);
  private readonly arena = viewChild.required<ElementRef<HTMLElement>>('arena');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly width = signal(0);

  protected readonly lead = computed(() => {
    const cfg = this.engine.config();
    if (cfg.mode === 'time') {
      return String(Math.ceil((this.engine.remainingMs() ?? 0) / 1000));
    }
    return `${Math.min(this.engine.wordsTyped(), cfg.words)}/${cfg.words}`;
  });

  constructor() {
    afterNextRender(() => {
      const el = this.arena().nativeElement;
      el.focus();

      const observer = new ResizeObserver(() => this.width.set(el.clientWidth));
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    afterRenderEffect(() => {
      const cursor = this.engine.cursor();
      void this.engine.text();
      void this.width();
      this.rollToCursor(cursor);
    });
  }

  private rollToCursor(cursor: number): void {
    const track = this.track().nativeElement;
    const chars = track.children;
    if (chars.length === 0) return;

    const first = chars[0] as HTMLElement;
    const current = chars[Math.min(cursor, chars.length - 1)] as HTMLElement;
    const lineHeight = parseFloat(getComputedStyle(track).lineHeight);
    if (!lineHeight) return;

    const line = Math.round((current.offsetTop - first.offsetTop) / lineHeight);
    const shift = Math.max(0, line - CURSOR_ROW);
    track.style.transform = `translateY(${-shift * lineHeight}px)`;
  }
}
