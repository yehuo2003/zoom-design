import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';

/** Private native compilation fixture. Never exported by the product package. */
@Component({
  selector: 'zoom-build-probe',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="zoom-engineering-probe">
      <p data-testid="probe-label">{{ label() }}</p>
      <p data-testid="count">{{ count() }}</p>
      <button type="button" (click)="increment()">Increment</button>
    </section>
  `,
})
export class BuildProbe {
  readonly label = input.required<string>();
  readonly onCleanup = input<() => void>(() => {});
  readonly countChanged = output<number>();
  readonly count = signal(0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.onCleanup()());
  }

  increment(): void {
    this.count.update((value) => value + 1);
    this.countChanged.emit(this.count());
  }
}
