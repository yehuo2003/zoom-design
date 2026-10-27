import { Component } from '@angular/core';
import { BuildProbe } from '../fixtures/build-probe';

@Component({
  selector: 'zoom-invalid-consumer',
  standalone: true,
  imports: [BuildProbe],
  template: `<zoom-build-probe [label]="42" (countChanged)="acceptString($event)" />`,
})
export class InvalidConsumer {
  acceptString(_value: string): void {}
}
