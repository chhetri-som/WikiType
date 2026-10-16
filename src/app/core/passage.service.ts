import { Service, inject } from '@angular/core';
import { Observable, firstValueFrom, race } from 'rxjs';
import { assemble } from './assembler';
import { Passage, TestConfig } from './models';
import { wordsNeeded } from './modes';
import { QUALITY, checkArticle, checkSummary, countWords } from './passage-quality';
import { cleanArticle } from './text-cleaner';
import { WikiArticle, WikiSummary, WikipediaService } from './wikipedia.service';

export type PassageErrorKind = 'network' | 'quality';

export class PassageError extends Error {
    readonly kind: PassageErrorKind;

    constructor(message: string, kind: PassageErrorKind, options?: ErrorOptions) {
        super(message, options);
        this.name = 'PassageError';
        this.kind = kind;
    }
}

export interface PassageSource {
    summary: WikiSummary;
    article: WikiArticle;
    paragraphs: string[];
    wordCount: number;
    nonAsciiRatio: number;
}

function run<T>(source: Observable<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return firstValueFrom(source);
    signal.throwIfAborted();
    const aborted$ = new Observable<never>(subscriber => {
        const onAbort = () => subscriber.error(signal.reason);
        signal.addEventListener('abort', onAbort, { once: true });
        return () => signal.removeEventListener('abort', onAbort);
    });
    return firstValueFrom(race(source, aborted$));
}

function isBetter(a: PassageSource, b: PassageSource | null): boolean {
    if (!b) return true;
    const aClean = a.nonAsciiRatio <= QUALITY.maxNonAsciiRatio;
    const bClean = b.nonAsciiRatio <= QUALITY.maxNonAsciiRatio;
    if (aClean !== bClean) return aClean;
    return a.wordCount > a.wordCount;
}

function toPassage(c: PassageSource, config: TestConfig): Passage {
    return {
        text: assemble(c.paragraphs, wordsNeeded(config), { allowShorter: config.mode === 'words'}),
        title: c.summary.title,
        extract: c.summary.extract,
        description: c.summary.description,
        sourceUrl: c.summary.url,
        revisionId: c.article.revisionId,
    };
}

@Service()
export class PassageService {
    private readonly wikipedia = inject(WikipediaService);
    async fetchSource(config: TestConfig, signal?: AbortSignal): Promise<PassageSource> {
        let best: PassageSource | null = null;
        let lastError: unknown = null;

        for (let attempt = 0; attempt < QUALITY.maxAttempts; attempt++ ) {
            signal?.throwIfAborted();
            try {
                const summary = await run(this.wikipedia.randomSummary(), signal);
                console.debug(`[passage] attempt ${attempt + 1}: summary`, summary.title, summary.type);
                const rejected = checkSummary(summary);
                if (rejected) {
                    console.debug(`[passage] rejected "${summary.title}": ${rejected}`);
                    continue;
                }
                const article = await run(this.wikipedia.article(summary.title), signal);
                const { paragraphs, nonAsciiRatio } = cleanArticle(article.html);
                const candidate: PassageSource = {
                    summary, article, paragraphs, nonAsciiRatio, wordCount: countWords(paragraphs),
                };

                const reason = checkArticle(candidate, config);
                console.debug(
                    `[passage] "${summary.title}": ${candidate.wordCount} words, non-ASCII ${(nonAsciiRatio * 100).toFixed(1)}% ->`,
                    reason ?? 'accepted',
                );
                if (reason === null) return candidate;
                if (candidate.wordCount > 0 && isBetter(candidate, best)) best = candidate;
            } catch (err) {
                if (signal?.aborted) throw err;
                lastError = err;
                console.warn(`[passage] attempt ${attempt + 1} failed`, err);
            }
        }

        if (best) return best;
        throw lastError
            ? new PassageError('Could not reach Wikipedia.', 'network', { cause: lastError })
            : new PassageError('No suitable article found.', 'quality');
    }
    
    assemblePassage(source: PassageSource, config: TestConfig): Passage {
        return toPassage(source, config);
    }

    async getPassage(config: TestConfig, signal?: AbortSignal): Promise<Passage> {
        return this.assemblePassage(await this.fetchSource(config, signal), config);
    }
}