import type BuildProbe from '../../../../.artifacts/fixtures/vue/BuildProbe.vue';
import type * as PublicVue from '@zoom-design/vue';
import { createEngineeringState } from '../../../../.artifacts/fixtures/platform/packages/core/test/fixtures/state.js';
import { registerEngineeringClick } from '../../../../.artifacts/fixtures/platform/packages/dom/test/fixtures/listener.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type Probe = InstanceType<typeof BuildProbe>;
type LabelIsString = Expect<Equal<Probe['$props']['label'], string>>;
type PublicSurfaceIsApproved = Expect<Equal<keyof typeof PublicVue, 'ZButton' | 'ZSelect'>>;
// @ts-expect-error The exact public runtime surface must include Select.
type MissingSelectIsRejected = Expect<Equal<keyof typeof PublicVue, 'ZButton'>>;
// @ts-expect-error Private engineering components must never enter the runtime surface.
type AdditionalExportIsRejected = Expect<Equal<keyof typeof PublicVue, 'ZButton' | 'ZSelect' | 'BuildProbe'>>;
const props: Probe['$props'] = { label: 'Initial', onChanged: (count: number) => void count };
// @ts-expect-error Emitted fixture declarations must reject a numeric label.
const invalidProps: Probe['$props'] = { label: 3 };
declare const probe: Probe;
probe.$emit('changed', 1);
// @ts-expect-error Emitted fixture declarations must preserve the event payload.
probe.$emit('changed', 'invalid');
const state = createEngineeringState(0, 3);
state.update(value => value + 1);
// @ts-expect-error TS7 Core declarations must preserve numeric values under TS6.
state.update(() => 'invalid');
const cleanup: () => void = registerEngineeringClick(new EventTarget(), () => {});
// @ts-expect-error TS7 DOM declarations must retain the EventTarget constraint.
registerEngineeringClick({}, () => {});
void [props, invalidProps, cleanup];
export type { LabelIsString, PublicSurfaceIsApproved, MissingSelectIsRejected, AdditionalExportIsRejected };
