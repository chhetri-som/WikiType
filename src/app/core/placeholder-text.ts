const POOL =
  'The harbor town woke slowly each morning, as fishing boats nudged against the old stone quay ' +
  'and gulls argued over scraps left on the cobbles. Merchants rolled barrels along the waterfront, ' +
  'calling out prices in voices worn smooth by years of habit. Above the market, a clock tower ' +
  'kept its own stubborn time, a few minutes behind the sun. Children ran between the stalls ' +
  'carrying messages, bread, and the occasional rumor. By noon the fog had lifted, revealing ' +
  'a line of ships waiting beyond the breakwater for the tide to turn. Nobody in the town ' +
  'could say exactly when the harbor had been built, but everyone agreed that it would outlast ' +
  'the lot of them. In the evening, lamps were lit one by one along the quay, and the water ' +
  'held their reflections like a second, quieter town below the first.';

const WORDS = POOL.split(/\s+/);

export function placeholderText(wordCount: number): string {
  const start = Math.floor(Math.random() * WORDS.length);
  const out: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    out.push(WORDS[(start + i) % WORDS.length]);
  }
  return out.join(' ');
}
