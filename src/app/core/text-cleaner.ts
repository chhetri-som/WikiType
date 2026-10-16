const NOISE_SELECTORS: readonly string[] = [
  'sup.reference', 'sup.noprint', '.mw-editsection', '.mw-heading', '.mw-cite-backlink',
  'table', 'figure', '.thumb', '.gallery',
  '.hatnote', '.shortdescription', '.navbox', '.sidebar', '.infobox', '.ambox', '.metadata',
  '.reflist', '.refbegin', '.mw-references-wrap', '.sistersitebox', '.noprint',
  '.mw-empty-elt', '.toc', '#toc', '.mwe-math-element', 'math',
  'style', 'script', 'ul', 'ol', 'dl',
];

const MIN_WORDS = 15;
const MIN_LETTER_RATIO = 0.7;

const CITATION = /\[(?:\d+|[a-z]|note \d+|[^\]]*\bneeded\b[^\]]*)\]/gi;
const PRONUNCIATION = /\s*\([^()]*[\u0250-\u02FF][^()]*\)/g;
const LISTEN = /\s*\(\s*listen\s*\)/gi;
const EMPTY_PARENS = /\s*\(\s*[;,]?\s*\)/g;

const LETTER_MAP: Readonly<Record<string, string>> = {
  'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'ø': 'o', 'Ø': 'O', 'ß': 'ss',
  'đ': 'd', 'Đ': 'D', 'ł': 'l', 'Ł': 'L', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'Th', 'ı': 'i',
};

function prefold(raw: string): string {
    return raw
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
    .replace(CITATION, '')
    .replace(PRONUNCIATION, '')
    .replace(LISTEN, '')
    .replace(EMPTY_PARENS, '');
}

function finish(text: string): string {
    return text
    .replace(/[æÆœŒøØßđĐłŁðÐþÞı]/g, c => LETTER_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

export function normalize(raw: string): string {
    return finish(prefold(raw));
}

function isUsable(text: string): boolean {
    if (text.split(' ').length < MIN_WORDS) return false;
    const visible = text.replace(/ /g, '').length;
    const letters = (text.match(/[A-Za-z]/g) ?? []).length;
    return visible > 0 && letters / visible >= MIN_LETTER_RATIO;
}

export interface CleanedArticle {
    paragraphs: string[];
    nonAsciiRatio: number;
}

export function cleanArticle(html: string): CleanedArticle {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const selector of NOISE_SELECTORS) {
        doc.querySelectorAll(selector).forEach(n => n.remove());
    }

    const paragraphs: string[] = [];
    let total = 0;
    let nonAscii = 0;

    for (const p of [...doc.querySelectorAll('p')]) {
        const pre = prefold(p.textContent ?? '');
        const text = finish(pre);
        if (!isUsable(text)) continue;
        paragraphs.push(text);
        total += pre.length;
        nonAscii += (pre.match(/[^\x00-\x7F]/g) ?? []).length;
    }

    return { paragraphs, nonAsciiRatio: total === 0 ? 0 : nonAscii / total };
}

export function cleanText(html: string): string[] {
    return cleanArticle(html).paragraphs;
}