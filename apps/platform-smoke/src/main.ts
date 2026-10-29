import { createEngineeringState } from '../../../packages/core/test/fixtures/state.js';
import { registerEngineeringClick } from '../../../packages/dom/test/fixtures/listener.js';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw Error(`Missing probe element ${id}`);
  return found as T;
}
const domScenario = location.pathname === '/dom';
const selectionScenario = location.pathname === '/selection';
const layersScenario = location.pathname === '/layers';
document.querySelector('main')!.innerHTML = layersScenario ? '<section id="layers-example"></section>' : selectionScenario
  ? '<h2>Core public selection API</h2><section data-selection-instance="first"></section><section data-selection-instance="second"></section>'
  : domScenario
  ? '<h2>DOM listener fixture</h2><p>Clicks: <output id="click-count" aria-label="Click count">0</output></p><p>Listener: <output id="listener-state" aria-label="Listener state">waiting</output></p><button id="trigger" disabled>Trigger click</button><button id="dispose" disabled>Dispose listener</button>'
  : '<h2>Core state fixture</h2><p>First: <output id="first-count" aria-label="First count">0</output></p><p>Second: <output id="second-count" aria-label="Second count">0</output></p><button id="first" disabled>Increment first</button><button id="second" disabled>Increment second</button>';

try {
  // Real public dist entry points must resolve and execute before any fixture starts.
  const [core, dom] = await Promise.all([import('@zoom-design/core'), import('@zoom-design/dom')]);
  if (layersScenario) {
    const { mountLayersExample } = await import('./examples/layers.js'); mountLayersExample(element('layers-example'), dom);
  } else if (selectionScenario) {
    const { mountSelectionExample } = await import('./examples/selection.js');
    for (const root of document.querySelectorAll<HTMLElement>('[data-selection-instance]')) mountSelectionExample(root, core);
  } else if (domScenario) {
    let count = 0; const trigger = element<HTMLButtonElement>('trigger');
    const dispose = registerEngineeringClick(trigger, () => { element('click-count').textContent = String(++count); });
    element('listener-state').textContent = 'registered';
    element('dispose').addEventListener('click', () => { dispose(); element('listener-state').textContent = 'disposed'; });
    window.addEventListener('pagehide', dispose, { once: true });
  } else {
    const first = createEngineeringState(0, 9); const second = createEngineeringState(0, 9);
    for (const [name, state] of [['first', first], ['second', second]] as const) {
      element(`${name}-count`).textContent = String(state.snapshot().value);
      element(name).addEventListener('click', () => {
        state.update(value => value + 1); element(`${name}-count`).textContent = String(state.snapshot().value);
      });
    }
  }
  for (const button of document.querySelectorAll('button')) button.disabled = false;
  document.querySelector('[role="status"]')!.textContent = 'Core and DOM package imports ready';
} catch (error) {
  const alert = document.createElement('p'); alert.setAttribute('role', 'alert');
  alert.textContent = error instanceof Error ? error.message : String(error); document.body.append(alert);
  document.querySelector('[role="status"]')!.textContent = 'Package imports failed';
  throw error;
}
