import { Component, inject, signal } from '@angular/core';
import { ThemeManager } from '../../core/theme-manager';
import { ThemeId } from '../../core/themes';

@Component({
  selector: 'app-theme-picker',
  styleUrl: './theme-picker.scss',
  templateUrl: './theme-picker.html',
})
export class ThemePicker {
  protected readonly theme = inject(ThemeManager);
  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update(o => !o);
  }

  protected pick(id: ThemeId): void {
    this.theme.select(id);
    this.open.set(false);
  }
}
