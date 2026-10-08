import { Component, computed, output, signal } from '@angular/core';
import { Mode, TestConfig } from '../../core/models';
import { DEFAULT_CONFIG, buildConfig, clampCustom, configValue, limitsFor, presetsFor } from '../../core/modes';

const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'words', label: 'Words' },
  { id: 'time', label: 'Time' },
];

@Component({
  selector: 'app-mode-selector',
  styleUrl: './mode-selector.scss',
  templateUrl: './mode-selector.html',
})
export class ModeSelector {
  readonly configChange = output<TestConfig>();
  protected readonly modes = MODES;
  protected readonly mode = signal<Mode>(DEFAULT_CONFIG.mode);
  protected readonly index = signal(presetsFor(DEFAULT_CONFIG.mode).indexOf(configValue(DEFAULT_CONFIG)));
  protected readonly customValue = signal(clampCustom(DEFAULT_CONFIG.mode, configValue(DEFAULT_CONFIG)));

  protected readonly presets = computed(() => presetsFor(this.mode()));
  protected readonly notches = computed(() => [...this.presets().map(String), 'Custom']);
  protected readonly isCustom = computed(() => this.index() === this.presets().length);
  protected readonly limits = computed(() => limitsFor(this.mode()));
  protected readonly unit = computed(() => (this.mode() === 'words' ? 'words' : 'seconds'));
  protected readonly value = computed(() => (this.isCustom() ? this.customValue() : this.presets()[this.index()]));
  protected readonly valueText = computed(() => `${this.value()} ${this.unit()}`);

  protected setMode(mode: Mode): void {
    if (mode === this.mode()) return;
    this.mode.set(mode);
    this.customValue.set(clampCustom(mode, this.customValue()));
    this.emit();
  }

  protected setIndex(raw: string): void {
    this.index.set(Number(raw));
    this.emit();
  }

  protected setCustom(input: HTMLInputElement): void {
    const raw = input.valueAsNumber;
    const value = Number.isNaN(raw) ? this.customValue() : clampCustom(this.mode(), raw);
    input.value = String(value);
    this.customValue.set(value);
    this.emit();
  }

  private emit(): void {
    this.configChange.emit(buildConfig(this.mode(), this.value()));
  }
}
