# WikiType

A Monkeytype-style typing test where the passages are **real paragraphs from hand-picked Wikipedia sections** instead of random words. After each test you get the story behind the passage, a link to the source article, a WPM graph, and rule-based feedback on how you typed.

Built with **Angular only**. No backend, no database, no accounts. Everything runs in the browser.

---

## Table of contents

1. [Goals and non-goals](#1-goals-and-non-goals)
2. [Feature list](#2-feature-list)
3. [Architecture](#3-architecture)
4. [Tech stack](#4-tech-stack)
5. [Project structure](#5-project-structure)
6. [Data models](#6-data-models)
7. [Topic manifest](#7-topic-manifest)
8. [Wikipedia pipeline](#8-wikipedia-pipeline)
9. [Typing engine](#9-typing-engine)
10. [Modes and presets](#10-modes-and-presets)
11. [Metrics](#11-metrics)
12. [Results graph](#12-results-graph)
13. [Feedback engine](#13-feedback-engine)
14. [UI and UX notes](#14-ui-and-ux-notes)
15. [Licensing and attribution](#15-licensing-and-attribution)
16. [Error handling and edge cases](#16-error-handling-and-edge-cases)
17. [Testing strategy](#17-testing-strategy)
18. [Build roadmap](#18-build-roadmap)
19. [Setup](#19-setup)
20. [Future ideas](#20-future-ideas)

---

## 1. Goals and non-goals

### Goals
- Practice typing on **meaningful, curated text** rather than random words.
- Make every test feel like a small reading reward: after finishing, you learn what you just typed.
- Give **useful feedback**, not just a WPM number.
- Learn Angular properly: components, signals, services, routing, testing, and charting.

### Non-goals
- User accounts, auth, or leaderboards.
- Any server-side code or database. The app is stateless.
- Competing with Monkeytype on features such as multiplayer or a large theme library. WikiType ships exactly four curated themes and one bundled font.
- Auto-generated topic selection. Topics are intentionally chosen by hand.

---

## 2. Feature list

| Area | Feature | Phase |
|---|---|---|
| Typing | Per-character correct/wrong/pending highlighting, cursor, backspace | 1 |
| Typing | Keystroke log (timestamp, expected, typed, correct) | 1 |
| Theming | Four curated themes, switchable at runtime, defined in one palette file (CSS variables) | 1 |
| Theming | Bundled local `.ttf` font applied app-wide | 1 |
| Modes | Words mode: 20 / 40 / 60 / 120 / custom | 2 |
| Modes | Time mode: 20 / 40 / 60 / 120 / custom | 2 |
| Modes | Snap slider with notches, plus a "Custom" notch revealing a number input | 2 |
| Metrics | Live WPM, accuracy, timer | 2 |
| Results | WPM-over-time line chart with error markers | 2 |
| Content | Curated topics manifest | 3 |
| Content | Fetch, clean, and assemble Wikipedia passages | 3 |
| Content | Caching (memory + sessionStorage) | 3 |
| Context | Intro blurb, source title, link to the Wikipedia section | 4 |
| Feedback | Rule-based insights (consistency, fatigue, problem keys, etc.) | 5 |
| Polish | Restart shortcuts, topic/category filter, responsive layout | 5 |

---

## 3. Architecture

```
┌──────────────────────────────── Angular (browser) ────────────────────────────────┐
│                                                                                   │
│  ModeSelector ──► TypingArena ──► ContextPanel ──► ResultsView (chart + feedback) │
│       │               │                                   ▲                       │
│       │        TypingEngine (signals, state machine)      │                       │
│       │               │  keystroke log                    │                       │
│       │               └────────► Metrics ──► Feedback ────┘                       │
│       ▼                                                                           │
│  PassageService ──► WikipediaService ──► cleanText()                              │
│       │                    │                                                      │
│  topics.json          Cache (Map + sessionStorage)                                │
└───────────────────────────┬───────────────────────────────────────────────────────┘
                            ▼
                  Wikipedia Action API (CORS via origin=*)
```

### Design principles
1. **Stateless:** nothing is persisted across sessions. `sessionStorage` is used only as a fetch cache. The one exception is the selected theme id, kept in `localStorage` under `wt:theme` so your choice survives a reload.
2. **Pure functions for analysis:** metrics and feedback are plain TypeScript functions that take the keystroke log and return data. No Angular dependencies, so they are trivial to unit test.
3. **Engine is a service, not a component:** it has no DOM knowledge, so it works for both words and time mode and can be tested alone.
4. **The log is the source of truth:** the graph, accuracy, and feedback are all derived from it.

### Test lifecycle (state machine)

```
idle ──first keystroke──► running ──(last char typed | timer hits 0)──► finished
  ▲                                                                         │
  └──────────────────────────── restart / new passage ◄─────────────────────┘
```

---

## 4. Tech stack

| Concern | Choice |
|---|---|
| Framework | Angular (latest stable), standalone components, signals |
| Language | TypeScript (strict mode) |
| Styling | SCSS |
| Theming | CSS custom properties (`--wt-*`) driven by a typed palette in `core/themes.ts` |
| Font | Local `.ttf` bundled through `@font-face` in `styles.scss` |
| Charts | Chart.js via `ng2-charts` |
| HTTP | Angular `HttpClient` |
| Text parsing | Browser `DOMParser` (no extra library) |
| Testing | Jasmine/Karma or Jest (whichever the CLI generates), plus Angular TestBed |
| Data source | Wikipedia Action API |

> Angular's signal and template syntax has changed across versions. Run `ng version` and keep the generated project's conventions when copying snippets.

> This project is on Angular 22. Services use `@Service()` (the short form of a root-provided `@Injectable`), components are `OnPush` and the app is zoneless by default, so reactive state belongs in signals.

---

## 5. Project structure

```
wikitype/
├── public/                         # (or src/assets/ on older Angular versions)
│   └── topics.json                 # curated topic manifest
├── src/
│   ├── fonts/                      # local .ttf files, referenced from styles.scss
│   ├── styles.scss                 # global: @font-face, base styles
│   └── app/
│       ├── core/
│       │   ├── models.ts           # shared types
│       │   ├── themes.ts           # THE palette file: all theme colors live here
│       │   ├── theme-manager.ts    # applies the active theme, persists the choice
│       │   ├── typing-engine.service.ts
│       │   ├── wikipedia.service.ts
│       │   ├── passage.service.ts
│       │   ├── cache.service.ts
│       │   ├── text-cleaner.ts     # pure functions
│       │   ├── metrics.ts          # pure functions
│       │   └── feedback.ts         # pure functions
│       ├── features/
│       │   ├── mode-selector/
│       │   ├── typing-arena/
│       │   ├── context-panel/
│       │   ├── theme-picker/
│       │   └── results/
│       ├── app.ts
│       └── app.routes.ts
└── README.md
```

---

## 6. Data models

```ts
export type Status = 'idle' | 'running' | 'finished';
export type CharState = 'pending' | 'correct' | 'wrong';
export type Mode = 'words' | 'time';

export interface Keystroke {
  t: number;               // ms since the first key
  expected: string | null; // char you should have typed (null for Backspace)
  typed: string;           // key pressed ('Backspace' for deletes)
  correct: boolean;
}

export interface TestConfig {
  mode: Mode;
  words?: number;          // words mode
  seconds?: number;        // time mode
}

export interface Topic {
  id: string;
  page: string;            // Wikipedia article title
  section: string;         // section heading to pull from
  category: string;        // e.g. "Medieval", "Ancient", "Modern"
  context: string;         // hand-written intro blurb
}

export interface Passage {
  topicId: string;
  title: string;
  section: string;
  text: string;
  wordCount: number;
  context: string;
  sourceUrl: string;       // link to the page + section anchor
  revisionId?: number;
}

export interface TestResult {
  config: TestConfig;
  passage: Passage;
  durationMs: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;        // 0-100
  consistency: number;     // 0-100
  log: Keystroke[];
}
```

---

## 7. Topic manifest

`topics.json` is where the "intentional topics" control lives. You curate it by hand.

```json
[
  {
    "id": "fall-of-constantinople",
    "page": "Fall of Constantinople",
    "section": "Siege",
    "category": "Medieval",
    "context": "In 1453, Ottoman forces under Mehmed II ended the Byzantine Empire after a siege of roughly fifty days. The fall of the city is often used to mark the end of the Middle Ages."
  }
]
```

### Curation checklist for each topic
- [ ] The section is mostly **prose paragraphs** (not lists or tables).
- [ ] The section has enough text for your longest test. Rough target: 400+ words for time-mode presets, and at least a few paragraphs.
- [ ] The text is free of heavy foreign-language names, equations, or symbols.
- [ ] You wrote a 2-4 sentence `context` blurb that adds value beyond the passage.
- [ ] The section heading matches Wikipedia **exactly** (case and punctuation).

### Tips
- Start with 15-20 topics in one or two categories, then grow.
- Add an optional `approxWords` field later if you want to filter topics by length without fetching.

---

## 8. Wikipedia pipeline

### 8.1 Endpoints

Base: `https://en.wikipedia.org/w/api.php`

| Step | Request |
|---|---|
| List sections | `?action=parse&page={page}&prop=sections&format=json&formatversion=2&origin=*` |
| Fetch a section | `?action=parse&page={page}&section={index}&prop=text|revid&format=json&formatversion=2&origin=*` |

- `origin=*` enables CORS for anonymous requests, so the browser can call the API directly.
- The `parse` API needs a section **index**, not a name, so you first fetch the section list and match `line === topic.section` to get the index.
- Wikimedia asks clients to identify themselves. Browsers cannot set `User-Agent`, but the API accepts an `Api-User-Agent` header. Adding a custom header triggers a CORS preflight, so verify it works and check Wikimedia's current API etiquette docs when you implement this.

### 8.2 Flow

```
PassageService.getPassage(config)
  1. pick a topic (random, or filtered by category)
  2. check cache for cleaned paragraphs of that topic
  3. on miss: WikipediaService.getSectionHtml(page, section)
  4. cleanText(html) → string[] of clean paragraphs
  5. store in cache
  6. assemble(paragraphs, targetWords) → text
  7. return Passage { text, context, sourceUrl, ... }
```

### 8.3 Text cleaning (`text-cleaner.ts`)

Parse the HTML with `DOMParser`, remove noise **structurally**, then normalize the text.

**Remove from the DOM:**
- `sup.reference` (citation markers)
- `.mw-editsection` (edit links)
- `table`, `figure`, `.thumb`, `.hatnote`, `style`, `.mw-empty-elt`
- Lists (`ul`, `ol`) unless you decide to include them

**Normalize the text:**

| Problem | Fix |
|---|---|
| Curly quotes `" " ' '` | Straight quotes `" '` |
| En/em dashes `–` `—` | Hyphen `-` |
| Non-breaking spaces | Regular space |
| Leftover `[1]`, `[a]`, `[citation needed]` | Remove with regex |
| Pronunciation/IPA parentheticals | Remove parentheses containing IPA characters |
| Diacritics (é, ö, ñ) | Fold to ASCII with `normalize('NFD')` and strip combining marks |
| Multiple spaces/newlines | Collapse to a single space |

**Filter out paragraphs that are:**
- Shorter than about 15 words
- Mostly digits or symbols
- Empty after cleaning

Sketch:

```ts
export function cleanText(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(
    'sup.reference, .mw-editsection, table, figure, .thumb, .hatnote, style, .mw-empty-elt'
  ).forEach(n => n.remove());

  return [...doc.querySelectorAll('p')]
    .map(p => normalize(p.textContent ?? ''))
    .filter(isUsable);
}
```

### 8.4 Passage assembly

Goal: turn an array of paragraphs into exactly the text a test needs.

**Words mode**
1. Pick a random starting paragraph.
2. Chain forward until you have at least `N` words.
3. Trim to `N` words.
4. Optional polish: if a sentence ends within about ±15% of `N`, cut there instead so the passage ends cleanly.

**Time mode**
The app cannot know how fast you type, so over-provision and let the timer end the test:

```
wordsNeeded = (seconds / 60) * 250     // assumes a very fast 250 WPM ceiling
```

| Seconds | Words fetched |
|---|---|
| 15 | ~63 |
| 30 | ~125 |
| 60 | ~250 |
| 120 | ~500 |

**If the section is too short:**
1. Wrap around to the section's first paragraph, or
2. Pull the next adjacent section of the same page, or
3. Pick a different topic that has enough text (preferred for long tests).

### 8.5 Caching (`cache.service.ts`)

- **Layer 1:** in-memory `Map<string, CachedEntry>` for the current session.
- **Layer 2:** `sessionStorage` under keys like `wt:v1:{page}:{section}`.
- Cache the **cleaned paragraphs** (not the final passage), so each test can still pick a different slice.
- Store `revisionId` alongside, and include a version prefix (`v1`) so you can invalidate when cleaning rules change.
- Wrap storage access in `try/catch` (it can be disabled or full).

---

## 9. Typing engine

Implemented in `typing-engine.service.ts`.

### State (signals)

| Signal | Meaning |
|---|---|
| `text` | the target passage |
| `typed` | everything typed so far (single source of truth) |
| `status` | `idle`, `running`, or `finished` |
| `cursor` | computed: `typed().length` |
| `chars` | computed: per-character `{ ch, state }` for rendering |

`log: Keystroke[]` is a plain array, not a signal, because nothing needs to react to it live.

### Behaviors
- First keystroke moves `idle → running` and starts the clock (`performance.now()`).
- Backspace removes the last character and is logged.
- Words mode finishes when `typed.length === text.length`.
- Time mode finishes when the timer reaches 0 (to be added in Phase 2).
- Keys with Ctrl, Meta, or Alt are ignored so browser shortcuts still work.
- `preventDefault()` on handled keys stops Space from scrolling the page.

### Planned engine extensions
- A `config` signal and `remainingMs` signal for time mode.
- A `finish()` method that freezes the log and emits a `TestResult`.
- Stop accepting input past the end of the text.
- Optional: stop-on-error or "must correct" mode.

---

## 10. Modes and presets

```ts
export const WORD_PRESETS = [20, 40, 60, 120] as const;
export const TIME_PRESETS = [20, 40, 60, 120] as const;   // seconds

export const CUSTOM_LIMITS = {
  words:   { min: 5, max: 500 },
  seconds: { min: 5, max: 600 },
};
```

### Selector behavior
1. A toggle chooses **Words** or **Time**.
2. A **snap slider** moves between notches: the four presets, plus a final **Custom** notch.
3. Landing on Custom reveals a number input, validated against `CUSTOM_LIMITS`.
4. Changing mode or value loads a fresh passage and resets to `idle`.

> Time presets are in **seconds**, matching Monkeytype. Change `TIME_PRESETS` in one place if you want minutes instead.

---

## 11. Metrics

All functions live in `metrics.ts` and are pure.

| Metric | Formula |
|---|---|
| **Net WPM** | `(correctChars / 5) / minutes` |
| **Raw WPM** | `(totalTypedChars / 5) / minutes` |
| **Accuracy** | `correctKeystrokes / totalKeystrokes × 100` |
| **Consistency** | based on the coefficient of variation of per-second WPM: `max(0, 100 - CV × 100)` |

- A "word" is 5 characters, the standard typing-test convention.
- `correctChars` is measured on the **final** typed text (what remains after corrections).
- `accuracy` is measured on **all keystrokes** (including ones later corrected), so it reflects mistakes you actually made.
- Exclude Backspace keystrokes from the accuracy denominator, or count them separately. Decide once and document it in the code.

---

## 12. Results graph

Chart.js line chart rendered with `ng2-charts`.

### Datasets
1. **Net WPM** per second (main line)
2. **Raw WPM** per second (lighter line)
3. **Errors** as red points on the timeline (a scatter dataset or point styling)

Colors come from the active theme: net WPM = `accent`, raw WPM = `muted`, errors = `wrong`. Chart.js draws on a canvas and cannot read `var(--wt-*)`, so read `ThemeManager.current().tokens` and build the chart options inside a `computed()`. The chart then recolors itself when the theme changes.

### Computing the series
1. Bucket the log by whole seconds from `t`.
2. For each second `s`, compute WPM from characters typed.
3. Use a **rolling window** (for example 5 seconds) for the plotted line. Cumulative averages are too flat and per-second values are too noisy.
4. Mark seconds containing at least one incorrect keystroke as error points.

### Below the chart
Stat cards: WPM, raw WPM, accuracy, consistency, time, characters (correct/wrong/corrected).

---

## 13. Feedback engine

Rule-based. Each rule is a pure function `(log, series) => Insight | null`. Show the top 3-4 insights by severity.

```ts
export interface Insight {
  id: string;
  severity: 'info' | 'tip' | 'warning';
  title: string;
  message: string;
}
```

| Rule | Signal | Example message |
|---|---|---|
| **Consistency** | High CV of per-second WPM | "Your speed swung a lot. A steadier rhythm will lift your average." |
| **Fatigue / warm-up** | Second-half WPM vs first-half WPM | "You slowed about 15% in the second half." / "You started slow and sped up." |
| **Problem keys** | Error rate per expected character, minimum sample size | "You miss 'q' and 'z' most often." |
| **Problem bigrams** | Error rate per two-letter pair | "Transitions like 'th' and 'ou' cost you the most." |
| **Hesitation** | Inter-key gaps above a threshold (for example >500 ms, or 3× your median) | "You paused before capital letters and numbers." |
| **Error bursts** | Several errors inside a short window | "Most mistakes happened between 0:35 and 0:42." |
| **Accuracy vs speed** | Raw WPM minus net WPM gap | "Slowing down a little would cost you less than your corrections do." |
| **Positive feedback** | High accuracy or improving trend | "Clean run: 98% accuracy." |

### Guidelines
- Always require a **minimum sample size** before reporting (a 12-word test cannot support a "fatigue" insight).
- Keep thresholds in a single constants object so they are easy to tune.
- Include at least one positive insight when the data supports it.
- Tests with the same passage text can later be compared for a fairer signal.

---

## 14. UI and UX notes

### Layout (top to bottom)
1. Mode selector (toggle + slider)
2. Typing arena
3. Context panel
4. Results (replaces or follows the arena after finishing)

### Context panel
- **During the test:** dimmed or collapsed. Reading about the passage mid-test is distracting.
- **After the test:** expands with the hand-written blurb, article title, section name, and a prominent **"Read on Wikipedia"** link to the section anchor.
- This is a design choice, so make it a setting if you prefer it always visible.

### Interaction
- The arena is focusable (`tabindex="0"`) and auto-focuses on load.
- Clicking away shows a "click to focus" hint.
- Shortcuts to consider: `Tab` to restart, `Esc` to load a new passage.
- Responsive: the arena keeps a readable max width and wraps cleanly on small screens.

### Theming

One palette file, many themes. Components never contain a hex color. They only use CSS variables, and a single TypeScript file defines what those variables are.

**How it fits together**

```
core/themes.ts          THEMES array: id, label, scheme, six color tokens each
        │
core/theme-manager.ts   signal holding the selected id
        │               effect() writes tokens to <html> as --wt-* variables
        │               saves/loads the id in localStorage (wt:theme)
        ▼
component SCSS          color: var(--wt-text);  background: var(--wt-bg);
features/theme-picker   renders one swatch button per theme, calls select(id)
```

**Tokens**

| Token | CSS variable | Used for |
|---|---|---|
| `bg` | `--wt-bg` | page background |
| `surface` | `--wt-surface` | panels, cards, chart background, context panel |
| `text` | `--wt-text` | correct characters, headings, body text |
| `muted` | `--wt-muted` | pending characters, secondary text, raw WPM line |
| `accent` | `--wt-accent` | cursor, active controls, links, net WPM line |
| `wrong` | `--wt-wrong` | wrong characters, error markers |

A seventh value, `scheme` (`'light'` or `'dark'`), is set as `color-scheme` on `<html>` so scrollbars and form controls match the theme.

**The four themes**

| Id | Label | Scheme | bg | surface | text | muted | accent | wrong |
|---|---|---|---|---|---|---|---|---|
| `dusk` (default) | Dusk | dark | `#323437` | `#2c2e31` | `#d1d0c5` | `#646669` | `#e2b714` | `#ca4754` |
| `paper` | Paper | light | `#f4efe6` | `#e9e2d3` | `#2b2b2b` | `#9a9488` | `#b4540a` | `#c0392b` |
| `frost` | Frost | dark | `#2e3440` | `#3b4252` | `#eceff4` | `#6c7a96` | `#88c0d0` | `#bf616a` |
| `forest` | Forest | dark | `#10201a` | `#172c24` | `#cfe8d5` | `#4f7a62` | `#8fd694` | `#e0645c` |

**Rules**
- To add a theme, add one object to `THEMES`. The picker, the CSS variables, and the chart all pick it up with no other change.
- To add a token, add it to `ThemeTokens` and to every theme (TypeScript will refuse to compile until you do), then use it as `var(--wt-name)`.
- No hard-coded colors in component SCSS. Everything goes through `var(--wt-*)`.
- Only the theme id is persisted. If storage is unavailable, fall back to `dusk` silently.
- Respect `prefers-reduced-motion`: the background/color transition on theme change is disabled for those users.

**Font**
- Place the `.ttf` in `src/fonts/` and declare it with `@font-face` in `styles.scss` using a relative `url()`, so the Angular build bundles it and rewrites the path (this also keeps working under a sub-path such as GitHub Pages).
- Expose it as `--wt-font` with a monospace fallback stack, and use `var(--wt-font)` everywhere, including form controls (`button { font: inherit; }`).
- Prefer a monospace face so characters align with the cursor. Use `font-display: swap` so text is visible while the font loads.

### Accessibility
- Do not rely on color alone for wrong characters (the underline helps).
- Provide an `aria-live` region for the results summary.
- Respect `prefers-reduced-motion` for animations.
- Every theme must keep `text` on `bg` at 4.5:1 contrast or better. `muted` (pending text) is dimmer by design, but check it and `wrong` by eye in each theme. The underline on wrong characters covers cases where color is not enough.
- The theme picker is a `radiogroup` of buttons with `aria-checked`, and is fully keyboard operable.

---

## 15. Licensing and attribution

Wikipedia text is licensed under **CC BY-SA 4.0**. To stay compliant:

- Show clear attribution: article title, section, and a link to the source page.
- Link to the page's history or license (Wikipedia's page footer has these).
- Note that content is under CC BY-SA 4.0, for example in the footer.
- Your own hand-written context blurbs are yours. Keep them visually distinct from Wikipedia text.
- The text is lightly modified (cleaned and trimmed), and the attribution makes that transparent. Consider noting "modified for typing."

Double-check Wikimedia's current reuse guidelines before publishing.

---

## 16. Error handling and edge cases

| Case | Handling |
|---|---|
| Network failure | Retry once, then show an error with a "Try another topic" button |
| Section not found in section list | Log a warning, skip topic, pick another |
| Cleaned section too short | Pull adjacent text or pick another topic |
| Wikipedia returns changed content | Cached `revisionId` helps debugging. Cleaning rules should be defensive. |
| `sessionStorage` unavailable or full | Fall back to the in-memory cache silently |
| Non-ASCII characters slipping through | Final sanitizer pass: replace or drop anything outside printable ASCII |
| Rate limiting | Serve from cache, avoid refetching on every test |
| Very fast or very slow typists | Time-mode over-provisioning (250 WPM ceiling) and wrap-around cover this |
| Window loses focus mid-test | Optionally pause or show a banner |

---

## 17. Testing strategy

**Unit tests (highest value, easiest):**
- `cleanText`: feed sample Wikipedia HTML snippets and assert output.
- `normalize`: quotes, dashes, diacritics, citation markers, IPA.
- `assemble`: word-count trimming, sentence-boundary preference, wrap-around.
- `metrics`: known logs produce known WPM, accuracy, and consistency.
- `feedback`: each rule fires, and does not fire, on crafted logs.

**Service tests:**
- `TypingEngine`: idle-to-running transition, backspace, finish condition, log contents.
- `WikipediaService`: use `HttpTestingController` to mock the API.

**Component tests:**
- Arena renders the right classes for correct, wrong, and pending characters.
- Mode selector emits the right config for each slider notch.

**Manual QA checklist:**
- [ ] Type a full passage with no mistakes
- [ ] Type with deliberate errors and backspaces
- [ ] Switch modes mid-session
- [ ] Offline behavior after one successful fetch
- [ ] Mobile viewport

---

## 18. Build roadmap

### Phase 1: Typing engine (Angular only)
- [x] Scaffold project: `ng new wikitype --style=scss`
- [x] `models.ts`, `TypingEngine` service, `TypingArena` component
- [x] Verify typing, backspace, cursor, and keystroke log in the browser
- [x] Challenge: live correct/wrong counts with `computed()`
- [ ] Bundle a local `.ttf` and apply it globally with `@font-face`
- [ ] `core/themes.ts` palette, `ThemeManager` service, `ThemePicker` component
- [ ] Replace every hard-coded color in component SCSS with `var(--wt-*)`
- [ ] Replace the boilerplate `.spec.ts` files with real tests for `TypingEngine`

### Phase 2: Modes, metrics, graph
- [ ] Timer and `remainingMs` signal for time mode
- [ ] Live WPM and accuracy display
- [ ] Mode selector with snap slider and custom input
- [ ] `metrics.ts` with unit tests
- [ ] Results view with Chart.js line chart and stat cards

### Phase 3: Wikipedia pipeline
- [ ] Write 10-20 entries in `topics.json`
- [ ] `WikipediaService` (section list, then section HTML)
- [ ] `cleanText()` and `normalize()` with tests
- [ ] `PassageService` with assembly logic
- [ ] `CacheService` (memory + sessionStorage)

### Phase 4: Context and source
- [ ] Context panel (dimmed during test, expanded after)
- [ ] Source link with section anchor
- [ ] Attribution footer (CC BY-SA 4.0)
- [ ] Category filter (optional)

### Phase 5: Feedback and polish
- [ ] `feedback.ts` rules and thresholds
- [ ] Insight cards in the results view
- [ ] Restart and new-passage shortcuts
- [ ] Responsive layout and accessibility pass
- [ ] Deploy as a static site (GitHub Pages, Netlify, Vercel, or Cloudflare Pages)

---

## 19. Setup

### Prerequisites
- Node.js (LTS)
- Angular CLI: `npm install -g @angular/cli`
- A code editor (VS Code with the Angular Language Service extension works well)

### Create and run

```bash
ng new wikitype --style=scss
cd wikitype
ng generate service core/typing-engine
ng generate component features/typing-arena
ng serve
```

Open `http://localhost:4200`.

### Later dependencies

```bash
npm install chart.js ng2-charts
```

### Production build

```bash
ng build
```

The output in `dist/` is a static site you can host anywhere.

---

## 20. Future ideas (Currently Out-of-scope)

- Topic picker UI by category or era
- "Retry the same passage" to measure improvement
- Per-word timing heatmap on the finished passage
- Compare against your previous test in the same session
- Punctuation and capitalization focus drills
- Keyboard layout awareness (Dvorak, Colemak)
- Export results as an image or JSON
- Offline PWA mode with a bundled snapshot of passages
- Support for other Wikipedia languages
- Quote-of-the-passage: highlight an interesting sentence in the context panel

---
