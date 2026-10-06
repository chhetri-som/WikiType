export interface ThemeTokens {
  bg: string; //background
  surface: string; // panels and cards
  text: string; // correct characters, body text
  muted: string; // pending characters, secondary text
  accent: string; // cursor, active controls, net WPM line
  wrong: string; // wrong characters, error markers
}

export interface ThemeDef {
  id: string;
  label: string;
  scheme: 'light' | 'dark';
  tokens: ThemeTokens;
}

export const THEMES = [
  { id: 'main', label: 'Main', scheme: 'light',
    tokens: {bg: '#FFF6DC', surface: '#FF95A5', text: '#425B9A', muted: '#76C0EC', accent: '#FF95A5', wrong: '#ff0000' } },
  { id: 'sage', label: 'Sage', scheme: 'light',
    tokens: {bg: '#D1EDD3', surface: '#ACC5A6', text: '#5C7057', muted: '#89A482', accent: '#ACC5A6', wrong: '#ff0000' } },
  { id: 'rage', label: 'Rage', scheme: 'dark',
    tokens: {bg: '#A14646', surface: '#DA6556', text: '#FDB773', muted: '#EB895B', accent: '#DA6556', wrong: '#000000' } },
  { id: 'dull', label: 'Dull', scheme: 'light',
    tokens: {bg: '#524646', surface: '#EC5B3B', text: '#FCF2E5', muted: '#A8A492', accent: '#EC5B3B', wrong: '#ff0000' } }
] as const satisfies readonly ThemeDef[];

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'main';
