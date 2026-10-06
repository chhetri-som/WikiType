import { Component, inject } from '@angular/core';
import { ThemeManager } from '../../core/theme-manager';

@Component({
  selector: 'app-theme-picker',
  styleUrl: './theme-picker.scss',
  templateUrl: './theme-picker.html',
})
export class ThemePicker {
  protected readonly theme = inject(ThemeManager);
}
