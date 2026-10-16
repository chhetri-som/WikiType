import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

const REST_RANDOM_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';
const ACTION_API = 'https://en.wikipedia.org/w/api.php';

export interface WikiSummary {
    type: string;
    title: string;
    description?: string;
    extract: string;
    url: string;
}

export interface WikiArticle {
    title: string;
    revisionId: number,
    html: string;
}

interface RestSummaryResponse {
    type: string;
    title: string;
    description?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
}

interface ParseResponse {
    parse?: { title: string; revid: number; text: string };
    error?: { code: string; info?: string };
}

@Service()
export class WikipediaService {
    private readonly http = inject(HttpClient);

    randomSummary(): Observable<WikiSummary> {
        return this.http.get<RestSummaryResponse>(REST_RANDOM_SUMMARY).pipe(
            map(r => ({
                type: r.type,
                title: r.title,
                description: r.description,
                extract: r.extract ?? '',
                url: 
                  r.content_urls?.desktop?.page ??
                  `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replaceAll(' ', '_'))}`,
            })),
        );
    }

    article(title: string): Observable<WikiArticle> {
        const params = new HttpParams({
            fromObject: {
                action: 'parse',
                page: title,
                prop: 'text|revid',
                redirects: '1',
                disablelimitreport: '1',
                format: 'json',
                formatversion: '2',
                origin: '*',
            },
        });
        return this.http.get<ParseResponse>(ACTION_API, { params }).pipe(
            map(res => {
                if (!res.parse) throw new Error(res.error?.code ?? 'parse-failed');
                return { title: res.parse.title, revisionId: res.parse.revid, html: res.parse.text};
            }),
        );
    }
}