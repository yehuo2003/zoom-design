import { afterEach, describe, expect, it } from 'vitest';
import { acquireModal, createModalContext, trapFocus } from '../src/index.js';
import type { Cleanup } from '../src/index.js';

const releases: Cleanup[] = [];
afterEach(() => {
  for (const release of releases.splice(0).reverse()) release();
  document.body.replaceChildren(); document.body.removeAttribute('style'); document.documentElement.removeAttribute('style');
});
const tab = (shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  document.activeElement!.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
};

describe('F1 cross-scope focus navigation', () => {
  it.each(['before', 'after'])('keeps forward and reverse Tab within a portal %s the panel', position => {
    const portal = document.createElement('button'); portal.textContent = 'C';
    const panel = document.createElement('div'); panel.innerHTML = '<button>A</button><button>B</button>';
    document.body.append(...(position === 'before' ? [portal, panel] : [panel, portal]));
    const [a, b] = [...panel.querySelectorAll('button')];
    const context = createModalContext(document);
    releases.push(acquireModal(context, { scope: panel, allowedNodes: [portal] }), trapFocus(context, panel));
    a!.focus();
    for (const next of [b, portal, a]) { tab(); expect(document.activeElement).toBe(next); }
    for (const next of [portal, b, a]) { tab(true); expect(document.activeElement).toBe(next); }
    portal.disabled = true; tab(true); expect(document.activeElement).toBe(b);
  });

  it('preserves positive tabindex, checked radio and open shadow-tree candidates', () => {
    const panel = document.createElement('div');
    panel.innerHTML = '<input type="radio" name="choice"><input type="radio" name="choice" checked><button tabindex="2">Positive</button><div id="shadow"></div>';
    const portal = document.createElement('button'); portal.tabIndex = 1;
    document.body.append(portal, panel);
    const shadow = panel.querySelector('#shadow')!.attachShadow({ mode: 'open' });
    const deep = document.createElement('button'); shadow.append(deep);
    const context = createModalContext(document);
    releases.push(acquireModal(context, { scope: panel, allowedNodes: [portal] }), trapFocus(context, panel));
    expect(document.activeElement).toBe(portal);
    tab(); expect(document.activeElement).toBe(panel.querySelector('button'));
    tab(); expect(document.activeElement).toBe(panel.querySelector('input:checked'));
    tab(); expect(shadow.activeElement).toBe(deep);
    tab(); expect(document.activeElement).toBe(portal);
  });
});
