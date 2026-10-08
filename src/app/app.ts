import { Component, inject, signal } from '@angular/core';
import { TypingArena } from './features/typing-arena/typing-arena';
import { ThemePicker } from './features/theme-picker/theme-picker';
import { TypingEngine } from './core/typing-engine';
import { ModeSelector } from './features/mode-selector/mode-selector';
import { Results } from './features/results/results';

@Component({
  imports: [TypingArena, ThemePicker, ModeSelector, Results],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('wikitype');
  protected readonly engine = inject(TypingEngine);
}
