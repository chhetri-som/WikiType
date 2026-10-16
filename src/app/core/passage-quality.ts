import { TestConfig } from './models';
import { wordsNeeded } from './modes';
import type { WikiSummary } from './wikipedia.service';

export const QUALITY = {
    maxAttempts: 5,
    maxNonAsciiRatio: 0.02,
    longTestWordFloor: 300,
} as const;

export type RejectReason = 'non-article' | 'list-page' | 'too-short' | 'non-ascii';

export function requiredWords(config: TestConfig): number {
    return Math.min(wordsNeeded(config), QUALITY.longTestWordFloor);
}

export function checkSummary(summary: Pick<WikiSummary, 'type' | 'title'>): RejectReason | null {
    if (summary.type !== 'standard') return 'non-article';
    if (/^lists? of /i.test(summary.title)) return 'list-page';
    return null;
}

export function checkArticle(
    stats: { wordCount: number; nonAsciiRatio: number },
    config: TestConfig,
): RejectReason | null {
    if (stats.wordCount < requiredWords(config)) return 'too-short';
    if (stats.nonAsciiRatio > QUALITY.maxNonAsciiRatio) return 'non-ascii';
    return null;
}

export function countWords(paragraphs: readonly string[]): number {
    return paragraphs.reduce((n, p) => n + p.split(' ').length, 0);
}