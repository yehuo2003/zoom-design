import * as core from '@zoom-design/core';
import * as dom from '@zoom-design/dom';
import { createEngineeringState, type EngineeringState } from '../../../.artifacts/fixtures/platform/packages/core/test/fixtures/state.js';
import { registerEngineeringClick } from '../../../.artifacts/fixtures/platform/packages/dom/test/fixtures/listener.js';

const state: EngineeringState<number | 'idle'> = createEngineeringState<number | 'idle'>(0, 'idle');
state.update(value => typeof value === 'number' ? value + 1 : 0);
const snapshot = state.snapshot();
if (snapshot.status === 'ready') {
  const value: number | 'idle' = snapshot.value;
  void value;
}
// @ts-expect-error Callback must preserve the state value type.
state.update(() => false);
const cleanup: () => void = registerEngineeringClick(new EventTarget(), () => {});
// @ts-expect-error Browser registration requires an EventTarget.
registerEngineeringClick({}, () => {});
void [core, dom, cleanup];
