import { Component, computed, inject, input, output } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TestResult } from '../../core/models';
import { ThemeManager } from '../../core/theme-manager';

@Component({
  imports: [BaseChartDirective],
  selector: 'app-results',
  styleUrl: './results.scss',
  templateUrl: './results.html',
})
export class Results {
  readonly result = input.required<TestResult>();
  readonly restart = output<void>();

  private readonly theme = inject(ThemeManager);

  protected readonly summary = computed(() => {
    const r = this.result();
    return `Test complete: ${Math.round(r.wpm)} words per minute at ${r.accuracy} percent accuracy.`;
  });

  protected readonly timeLabel = computed(() => `${(this.result().durationMs / 1000).toFixed(1)}s`);

  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const { series } = this.result();
    const t = this.theme.current().tokens;
    return {
      labels: series.map(p => p.second),
      datasets: [
        {
          label: 'Net WPM',
          data: series.map(p => p.net),
          borderColor: t.accent,
          backgroundColor: t.accent,
          borderWidth: 3,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Raw WPM',
          data: series.map(p => p.raw),
          borderColor: t.muted,
          backgroundColor: t.muted,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Errors',
          data: series.map(p => p.errors > 0 ? p.raw : null),
          showLine: false,
          borderColor: t.wrong,
          backgroundColor: t.wrong,
          pointStyle: 'crossRot',
          pointRadius: 6,
          pointBorderWidth: 3,
        },
      ],
    };
  });

  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const t = this.theme.current().tokens;
    const { series } = this.result();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grid = `${t.muted}33`;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 400},
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: { color: t.muted },
          grid: { color: grid },
          title: { display: true, text: 'seconds', color: t.muted },
        },
        y: {
          beginAtZero: true,
          ticks: { color: t.muted },
          grid: { color: grid },
          title: { display: true, text: 'wpm', color: t.muted },
        },
      },
      plugins: {
        legend: { labels: { color: t.text, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: ctx =>
              ctx.dataset.label === 'Errors'
                ? `${series[ctx.dataIndex].errors} error(s)`
                : `${ctx.dataset.label}: ${ctx.parsed.y}`,
          },
        },
      },
    };
  });
}
