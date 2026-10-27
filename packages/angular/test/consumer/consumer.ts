import * as product from '@zoom-design/angular';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import type { BuildProbe } from '@zoom-design/angular-compilation-fixture';
import * as core from '@zoom-design/core';
import * as dom from '@zoom-design/dom';
import { createEngineeringState, type EngineeringState } from '../../../../.artifacts/fixtures/platform/packages/core/test/fixtures/state.js';
import { registerEngineeringClick } from '../../../../.artifacts/fixtures/platform/packages/dom/test/fixtures/listener.js';

declare const probe: BuildProbe;
const label: InputSignal<string> = probe.label;
const event: OutputEmitterRef<number> = probe.countChanged;
// @ts-expect-error The compiled APF declaration preserves the label type.
const invalidLabel: number = probe.label();
const state: EngineeringState<number | 'idle'> = createEngineeringState<number | 'idle'>(0, 'idle');
state.update((value) => typeof value === 'number' ? value + 1 : 0);
// @ts-expect-error The TS7 declaration keeps the state update return type.
state.update(() => false);
const cleanup: () => void = registerEngineeringClick(new EventTarget(), () => {});
// @ts-expect-error The TS7 DOM declaration requires an EventTarget.
registerEngineeringClick({}, () => {});
void [product, core, dom, label, event, invalidLabel, cleanup];
