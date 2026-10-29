import { afterEach, it, expect } from 'vitest';
import { createModalContext, acquireModal, trapFocus, focusElement, restoreFocus } from '../src/index.js';
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); document.body.replaceChildren(); document.body.removeAttribute('style'); document.documentElement.removeAttribute('style'); });
function fixture() {
  document.body.innerHTML = '<button id="return">Return</button><div id="brand"><aside id="background" aria-hidden="false">Background</aside><div id="parent"><button id="first">First</button><button id="last">Last</button><div id="child"><button id="nested">Nested</button></div></div></div>';
  const context = createModalContext(document); const parent = document.querySelector<HTMLElement>('#parent')!; const child = document.querySelector<HTMLElement>('#child')!;
  return { context, parent, child, first: document.querySelector<HTMLButtonElement>('#first')!, last: document.querySelector<HTMLButtonElement>('#last')!, nested: document.querySelector<HTMLButtonElement>('#nested')! };
}
it('T10.11/12 isolates siblings rather than active theme ancestors and restores exact prior styles/attributes', () => {
  const f = fixture(); document.body.style.setProperty('overflow', 'scroll', 'important'); document.body.style.paddingInlineEnd = '7px';
  const before = document.body.getAttribute('style'); const close = acquireModal(f.context, { scope: f.parent }); cleanups.push(close);
  expect(document.querySelector('#background')!.hasAttribute('inert')).toBe(true); expect(document.querySelector('#brand')!.hasAttribute('inert')).toBe(false);
  expect(f.parent.closest('[inert]')).toBeNull(); expect(document.body.style.overflow).toBe('hidden');
  close(); close(); expect(document.querySelector('#background')!.getAttribute('aria-hidden')).toBe('false'); expect(document.querySelector('#background')!.hasAttribute('inert')).toBe(false); expect(document.body.getAttribute('style')).toBe(before);
});
it('T10.11 nested locks survive either cleanup order and preserve a host original inert attribute', () => {
  const f = fixture(); document.querySelector('#background')!.setAttribute('inert', 'original');
  const parent = acquireModal(f.context, { scope: f.parent }); const child = acquireModal(f.context, { scope: f.child }); cleanups.push(parent, child);
  expect(f.first.hasAttribute('inert')).toBe(true); expect(f.child.closest('[inert]')).toBeNull();
  parent(); expect(document.body.style.overflow).toBe('hidden'); expect(f.child.closest('[inert]')).toBeNull(); child();
  expect(document.body.style.overflow).toBe(''); expect(document.querySelector('#background')!.getAttribute('inert')).toBe('original');
});
it('T10.9 traps only the top scope, resumes the parent and restores safe connected targets', () => {
  const f = fixture(); const parent = acquireModal(f.context, { scope: f.parent }); cleanups.push(parent);
  const parentTrap = trapFocus(f.context, f.parent); cleanups.push(parentTrap); expect(document.activeElement).toBe(f.first);
  const child = acquireModal(f.context, { scope: f.child }); cleanups.push(child); const childTrap = trapFocus(f.context, f.child); cleanups.push(childTrap); expect(document.activeElement).toBe(f.nested);
  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); document.dispatchEvent(tab); expect(tab.defaultPrevented).toBe(true); expect(document.activeElement).toBe(f.nested);
  child(); childTrap(); expect(document.activeElement).toBe(f.first); parentTrap(); parent();
  const removed = document.createElement('button'); expect(restoreFocus(removed, document.querySelector('#return'))).toBe(true); expect(document.activeElement?.id).toBe('return');
  expect(focusElement(null)).toBe(false); expect(restoreFocus(null)).toBe(false);
});
it('T10.9 no tabbable content falls back to scope, duplicate traps/foreign contexts are rejected and detached scopes auto-release', async () => {
  const f = fixture(); f.child.replaceChildren(); const close = acquireModal(f.context, { scope: f.child }); cleanups.push(close);
  const stop = trapFocus(f.context, f.child); cleanups.push(stop); expect(document.activeElement).toBe(f.child); expect(f.child.getAttribute('tabindex')).toBe('-1');
  expect(() => trapFocus(f.context, f.child)).toThrow(); expect(() => acquireModal(createModalContext(document), { scope: f.parent })).toThrow();
  f.child.remove(); await Promise.resolve(); await Promise.resolve(); expect(document.body.style.overflow).toBe(''); expect(f.child.hasAttribute('tabindex')).toBe(false);
});
it('T10.12 new background branches become inert, and allowed portaled content stays usable', async () => {
  const f = fixture(); const portal = document.createElement('div'); document.body.append(portal);
  const close = acquireModal(f.context, { scope: f.parent, allowedNodes: [portal] }); cleanups.push(close);
  const added = document.createElement('button'); document.body.append(added); await Promise.resolve(); expect(added.hasAttribute('inert')).toBe(true); expect(portal.hasAttribute('inert')).toBe(false);
  close(); expect(added.hasAttribute('inert')).toBe(false);
});
it('T10.6/9 logical portal nodes participate in focus containment and Tab wrapping', () => {
  const f = fixture(); const portal = document.createElement('button'); portal.textContent = 'Portal'; document.body.append(portal);
  cleanups.push(acquireModal(f.context, { scope: f.parent, allowedNodes: [portal] }), trapFocus(f.context, f.parent, { initialFocus: portal }));
  expect(document.activeElement).toBe(portal);
  const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }); document.dispatchEvent(tab);
  expect(tab.defaultPrevented).toBe(true); expect(document.activeElement).toBe(f.first);
  portal.focus(); expect(document.activeElement).toBe(portal);
});
it('T10.5/12 slotted active scopes never inherit inert and shadow removal releases all resources', async () => {
  const f = fixture(); const host = document.createElement('div'); const shadow = host.attachShadow({ mode: 'open' }); shadow.innerHTML = '<slot></slot><aside>Shadow background</aside>';
  document.body.append(host); host.append(f.parent);
  const close = acquireModal(f.context, { scope: f.parent }); cleanups.push(close);
  expect(shadow.querySelector('slot')!.hasAttribute('inert')).toBe(false); expect(shadow.querySelector('aside')!.hasAttribute('inert')).toBe(true);
  close(); shadow.append(f.parent); cleanups.push(acquireModal(f.context, { scope: f.parent })); f.parent.remove();
  await Promise.resolve(); await Promise.resolve(); expect(document.body.style.overflow).toBe(''); expect(document.querySelector('#return')!.hasAttribute('inert')).toBe(false);
});
it('T10.5 a scope adopted by another document releases its original document resources', async () => {
  const f = fixture(); cleanups.push(acquireModal(f.context, { scope: f.parent }), trapFocus(f.context, f.parent));
  const iframe = document.createElement('iframe'); document.body.append(iframe); iframe.contentDocument!.body.append(f.parent);
  await Promise.resolve(); await Promise.resolve(); expect(document.body.style.overflow).toBe(''); expect(f.parent.hasAttribute('tabindex')).toBe(false);
});
it('T10.2 rejects a forged modal context without resource writes', () => {
  const f = fixture(); expect(() => acquireModal({ ownerDocument: document }, { scope: f.parent })).toThrow('createModalContext');
  expect(document.body.style.overflow).toBe('');
});
it('T10.9 trap respects checked radio groups, closed details and duplicate allowed roots', () => {
  const f = fixture(); f.parent.innerHTML = '<input type="radio" name="group"><input id="checked" type="radio" name="group" checked><details><summary>Summary</summary><button id="hidden-detail">Hidden</button></details><button id="end">End</button>';
  const checked = f.parent.querySelector<HTMLInputElement>('#checked')!;
  cleanups.push(acquireModal(f.context, { scope: f.parent, allowedNodes: [checked, checked] }), trapFocus(f.context, f.parent));
  expect(document.activeElement).toBe(checked); expect(focusElement(f.parent.querySelector('#hidden-detail'))).toBe(false);
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true }); document.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true); expect(document.activeElement?.id).toBe('end');
});
it('T10.11/12 SVG background is hidden and guarded without reparenting framework-owned nodes', async () => {
  const f = fixture(); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const after = document.createElement('span'); document.body.append(svg, after);
  const link = document.createElementNS('http://www.w3.org/2000/svg', 'a'); link.setAttribute('href', '#background'); svg.append(link);
  const before = document.body.innerHTML; const close = acquireModal(f.context, { scope: f.parent }); cleanups.push(close);
  const stop = trapFocus(f.context, f.parent); cleanups.push(stop);
  expect(svg.hasAttribute('inert')).toBe(true); expect(svg.getAttribute('aria-hidden')).toBe('true'); expect(svg.style.pointerEvents).toBe('none');
  await Promise.resolve(); await Promise.resolve(); expect(svg.parentElement).toBe(document.body);
  const click = new MouseEvent('click', { bubbles: true, cancelable: true }); expect(svg.dispatchEvent(click)).toBe(false);
  link.focus(); expect(document.activeElement).toBe(f.first);
  close(); await Promise.resolve(); expect(svg.parentElement).toBe(document.body); expect(svg.nextSibling).toBe(after); expect(document.body.innerHTML).toBe(before);
  expect(svg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(true);
});
