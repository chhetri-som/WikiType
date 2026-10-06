import { Component, signal } from '@angular/core';
import { TypingArena } from './features/typing-arena/typing-arena';
import { ThemePicker } from './features/theme-picker/theme-picker';

@Component({
  imports: [TypingArena, ThemePicker],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('wikitype');
}
