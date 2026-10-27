import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BuildProbe } from '../../../packages/angular/test/fixtures/build-probe';

@Component({
  selector: 'zoom-smoke-root',
  standalone: true,
  imports: [BuildProbe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Angular engineering host</h1>
    <p data-testid="import-status">@zoom-design/angular APF imported</p>
    @if (mounted()) {
      <zoom-build-probe [label]="label()" [onCleanup]="recordCleanup" (countChanged)="emitted.set($event)" />
      <button type="button" (click)="label.set('Updated')">Update label</button>
      <button type="button" (click)="mounted.set(false)">Unmount</button>
    } @else {
      <p data-testid="unmounted">unmounted</p>
    }
    <p data-testid="emitted-count">{{ emitted() }}</p>
    <p data-testid="cleanup-count">{{ cleanup() }}</p>
  `,
})
export class SmokeApp {
  readonly mounted = signal(true);
  readonly label = signal('Initial');
  readonly emitted = signal(0);
  readonly cleanup = signal(0);
  readonly recordCleanup = (): void => this.cleanup.update((count) => count + 1);
}
