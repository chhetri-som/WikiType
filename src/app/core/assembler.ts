export interface AssembleOptions {
    tolerance?: number;
    allowShorter?: boolean;
    rng?: () => number;
}

const SENTENCE_END = /[.!?]["')\]]*$/;
const ABBREVIATION = /^(?:[A-Z]|Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|No|Inc|Ltd)\.$/;

function endsSentence(word: string): boolean {
    return SENTENCE_END.test(word) && !ABBREVIATION.test(word);
}

export function assemble(
    paragraphs: readonly string[],
    target: number,
    { tolerance = 0.15, allowShorter = true, rng = Math.random }: AssembleOptions = {},
): string {
    const usable = paragraphs.map(p => p.trim()).filter(Boolean);
    if (usable.length === 0 || target < 1) return '';

    const maxWords = Math.ceil(target * (1 + tolerance));
    const start = Math.floor(rng() * usable.length);

    const words: string[] = [];
    for (let i = 0; words.length < maxWords; i++) {
        words.push(...usable[(start + i) % usable.length].split(/\s+/));
    }

    const lo = allowShorter ? Math.max(1, Math.floor(target * (1 - tolerance))) : target;
    let cut = target;
    let bestDistance = Infinity;
    for (let n = lo; n <= maxWords; n++) {
        if (!endsSentence(words[n - 1])) continue;
        const distance = Math.abs(n - target);
        if (distance <= bestDistance) {
            bestDistance = distance;
            cut = n;
        }
    }

    return words.slice(0, cut).join(' ');
}