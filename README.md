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
6. [Wikipedia pipeline](#6-wikipedia-pipeline)
7. [Error handling and edge cases](#7-error-handling-and-edge-cases)
8. [Build roadmap](#8-build-roadmap)

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

| Concern | Choice                                                                         |
|---|--------------------------------------------------------------------------------|
| Framework | Angular (22.2.1), standalone components, signals                               |
| Language | TypeScript (strict mode)                                                       |
| Styling | SCSS                                                                           |
| Font | Local `.ttf` bundled through `@font-face` in `styles.scss`                     |
| Charts | Chart.js via `ng2-charts`                                                      |
| HTTP | Angular `HttpClient`                                                           |
| Text parsing | Browser `DOMParser` (no extra library)                                         |
| Data source | Wikipedia Action API                                                           |

---

## 5. Project structure

```
wikitype/
├── public/                         # (or src/assets/ on older Angular versions)
│   └── topics.json                 # curated topic manifest
├── src/
│   ├── styles.scss                 # global: @font-face, base styles
│   ├── main.ts                     # config for bootstrap and app
│   ├── index.html                  # big daddy
│   ├── fonts/                      # local .ttf files, referenced from styles.scss
│   └── app/
│       ├── core/
│       │   ├── metrics.ts          # WPM, accuracy, consistency etc.
│       │   ├── modes.ts            # presets, custom limits, config, etc.
│       │   ├── models.ts           # shared types
│       │   ├── theme-manager.ts    # applies the active theme, persists the choice
│       │   ├── themes.ts           # THE palette file: all theme colors live here
│       │   ├── typing-engine.ts    # state machine, timer, live stats
│       ├── features/
│       │   ├── mode-selector/      
│       │   ├── results/
│       │   ├── theme-picker/
│       │   └── typing-arena/
│       ├── app.config.ts
│       ├── app.html
│       ├── app.scss
│       ├── app.routes.ts
│       └── app.ts
└── README.md
```

---

## 6. Wikipedia pipeline

### 6.1 Endpoints

Base: `https://en.wikipedia.org/w/api.php`

| Step | Request |
|---|---|
| List sections | `?action=parse&page={page}&prop=sections&format=json&formatversion=2&origin=*` |
| Fetch a section | `?action=parse&page={page}&section={index}&prop=text|revid&format=json&formatversion=2&origin=*` |

- `origin=*` enables CORS for anonymous requests, so the browser can call the API directly.
- The `parse` API needs a section **index**, not a name, so you first fetch the section list and match `line === topic.section` to get the index.
- Wikimedia asks clients to identify themselves. Browsers cannot set `User-Agent`, but the API accepts an `Api-User-Agent` header. Adding a custom header triggers a CORS preflight, so verify it works and check Wikimedia's current API etiquette docs when you implement this.

### 6.2 Flow

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

### 6.3 Text cleaning (`text-cleaner.ts`)

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

### 6.4 Passage assembly

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

### 6.5 Caching (`cache.service.ts`)

- **Layer 1:** in-memory `Map<string, CachedEntry>` for the current session.
- **Layer 2:** `sessionStorage` under keys like `wt:v1:{page}:{section}`.
- Cache the **cleaned paragraphs** (not the final passage), so each test can still pick a different slice.
- Store `revisionId` alongside, and include a version prefix (`v1`) so you can invalidate when cleaning rules change.
- Wrap storage access in `try/catch` (it can be disabled or full).

---

## 7. Error handling and edge cases

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

## 8. Build roadmap

### Phase 1: Typing engine (Angular only)
- [x] Scaffold project: `ng new wikitype --style=scss`
- [x] `models.ts`, `TypingEngine` service, `TypingArena` component
- [x] Verify typing, backspace, cursor, and keystroke log in the browser
- [x] Challenge: live correct/wrong counts with `computed()`
- [x] Bundle a local `.ttf` and apply it globally with `@font-face`
- [x] `core/themes.ts` palette, `ThemeManager` service, `ThemePicker` component
- [x] Replace every hard-coded color in component SCSS with `var(--wt-*)`
- [x] Replace the boilerplate `.spec.ts` files with real tests for `TypingEngine`

### Phase 2: Modes, metrics, graph
- [x] Timer and `remainingMs` signal for time mode
- [x] Live WPM and accuracy display
- [x] Mode selector with snap slider and custom input
- [x] `metrics.ts` with unit tests
- [x] Results view with Chart.js line chart and stat cards

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
