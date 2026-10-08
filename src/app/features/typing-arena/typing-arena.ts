import { Component, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { TypingEngine } from '../../core/typing-engine';

@Component({
  imports: [],
  selector: 'app-typing-arena',
  styleUrl: './typing-arena.scss',
  templateUrl: './typing-arena.html',
})
export class TypingArena {
  protected readonly engine = inject(TypingEngine);
  private readonly arena = viewChild.required<ElementRef<HTMLElement>>('arena');

  protected readonly lead = computed(() => {
    const cfg = this.engine.config();
    if (cfg.mode === 'time') {
      return String(Math.ceil((this.engine.remainingMs() ?? 0) / 1000));
    }
    return `${Math.min(this.engine.wordsTyped(), cfg.words)}/${cfg.words}`;
  });

  constructor() {
    afterNextRender(() => this.arena().nativeElement.focus());
  }
}
