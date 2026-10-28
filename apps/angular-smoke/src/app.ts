import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BuildProbe } from '../../../packages/angular/test/fixtures/build-probe';

@Component({
  selector: 'zoom-smoke-root',
  standalone: true,
  imports: [BuildProbe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Angular engineering host</h1>
    <p data-testid="import-status" role="status" aria-label="Package readiness">@zoom-design/angular APF imported</p>
    @if (mounted()) {
      <zoom-build-probe [label]="label()" [onCleanup]="recordCleanup" (countChanged)="emitted.set($event)" />
      <button type="button" (click)="label.set('Updated')">Update label</button>
      <button type="button" (click)="mounted.set(false)">Unmount</button>
    } @else {
      <p data-testid="unmounted" role="status" aria-label="Probe mount status">unmounted</p>
    }
    <output data-testid="emitted-count" aria-label="Emitted count">{{ emitted() }}</output>
    <output data-testid="cleanup-count" aria-label="Cleanup count">{{ cleanup() }}</output>
  `,
})
export class SmokeApp {
  readonly mounted = signal(true);
  readonly label = signal('Initial');
  readonly emitted = signal(0);
  readonly cleanup = signal(0);
  readonly recordCleanup = (): void => this.cleanup.update((count) => count + 1);
}
