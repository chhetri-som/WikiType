import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
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

  constructor() {
    afterNextRender(() => this.arena().nativeElement.focus());
  }
}
