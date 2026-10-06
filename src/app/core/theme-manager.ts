import { Service, computed, effect, signal } from '@angular/core';
import {DEFAULT_THEME, THEMES, ThemeId } from './themes';

const STORAGE_KEY = 'wt:theme';

@Service()
export class ThemeManager {
  readonly themes = THEMES;

  private readonly _id = signal<ThemeId>(this.load());
  readonly id = this._id.asReadonly();
  readonly current = computed(
    () => THEMES.find(t => t.id === this._id()) ?? THEMES[0],
  );

  constructor() {
    effect(() => {
      const theme = this.current();
      const root = document.documentElement;
      for (const[name, value] of Object.entries(theme.tokens)) {
        root.style.setProperty(`--wt-${name}`, value);
      }
      root.style.colorScheme = theme.scheme;
      this.save(theme.id);
    });
  }

  select(id: ThemeId): void {
    this._id.set(id);
  }

  private load(): ThemeId {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.find(t => t.id === saved)?.id ?? DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }

  private save(id: ThemeId): void {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */}
  }
}
