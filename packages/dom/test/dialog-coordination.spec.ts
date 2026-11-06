import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireModal, createLayerContext, createModalContext, registerLayer, trapFocus } from '../src/index.js';
import type { Cleanup } from '../src/index.js';

const releases: Cleanup[] = [];
afterEach(() => {
  for (const release of releases.splice(0).reverse()) release();
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});
function fixture() {
  document.body.innerHTML = '<button id="outside">Outside</button><div id="parent"><button id="first">First</button><button id="second">Second</button><div id="child"><button id="nested">Nested</button></div></div><button id="portal">Portal</button>';
  return {
    outside: document.querySelector<HTMLButtonElement>('#outside')!,
    parent: document.querySelector<HTMLElement>('#parent')!,
    child: document.querySelector<HTMLElement>('#child')!,
    first: document.querySelector<HTMLButtonElement>('#first')!,
    second: document.querySelector<HTMLButtonElement>('#second')!,
    nested: document.querySelector<HTMLButtonElement>('#nested')!,
    portal: document.querySelector<HTMLButtonElement>('#portal')!,
  };
}
const pointer = (node: HTMLElement) => node.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));

describe('Task13.3 Dialog DOM coordination', () => {
  it('T13.3.1 updates layer nodes in place without changing top order or logical parent', () => {
    const f = fixture(); const context = createLayerContext(document);
    const parentDismiss = vi.fn(); const childDismiss = vi.fn();
    const parent = registerLayer(context, { nodes: [f.parent], onDismiss: parentDismiss });
    const child = registerLayer(context, { nodes: [f.child], parent, onDismiss: childDismiss });
    releases.push(() => parent.cleanup(), () => child.cleanup());
    child.updateNodes([f.portal, f.portal]);
    pointer(f.portal); expect(childDismiss).not.toHaveBeenCalled();
    pointer(f.child); expect(childDismiss).toHaveBeenCalledExactlyOnceWith('outside', expect.any(MouseEvent));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(childDismiss).toHaveBeenCalledTimes(2); expect(parentDismiss).not.toHaveBeenCalled();
    child.cleanup(); pointer(f.portal); expect(parentDismiss).toHaveBeenCalledTimes(1);
  });

  it('T13.3.2 rejects a whole layer or modal update if any node is detached or foreign', () => {
    const f = fixture(); const dismiss = vi.fn();
    const layer = registerLayer(createLayerContext(document), { nodes: [f.first], onDismiss: dismiss }); releases.push(() => layer.cleanup());
    const modalContext = createModalContext(document);
    const modal = acquireModal(modalContext, { scope: f.parent, allowedNodes: [f.portal] }); releases.push(modal);
    const detached = document.createElement('button');
    const foreign = document.implementation.createHTMLDocument().createElement('button');
    for (const bad of [detached, foreign]) {
      expect(() => layer.updateNodes([f.second, bad])).toThrow();
      expect(() => modal.updateAllowedNodes([f.second, bad])).toThrow();
    }
    pointer(f.first); expect(dismiss).not.toHaveBeenCalled();
    expect(f.portal.hasAttribute('inert')).toBe(false);
    expect(f.second.hasAttribute('inert')).toBe(false);
  });

  it('T13.3.3 updates allowed popup isolation and keeps a legal focused input', () => {
    const f = fixture(); const context = createModalContext(document);
    const release = acquireModal(context, { scope: f.parent }); releases.push(release);
    const stop = trapFocus(context, f.parent); releases.push(stop);
    expect(document.activeElement).toBe(f.first);
    release.updateAllowedNodes([f.portal]);
    expect(f.portal.hasAttribute('inert')).toBe(false);
    f.second.focus(); release.updateAllowedNodes([f.portal, f.portal]);
    expect(document.activeElement).toBe(f.second);
    f.portal.focus(); expect(document.activeElement).toBe(f.portal);
    release.updateAllowedNodes([]);
    expect(f.portal.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).not.toBe(f.portal);
    expect(f.parent.contains(document.activeElement)).toBe(true);
  });

  it('T13.3.4 releases parent and child in one batch without an intermediate focus jump or lock leak', () => {
    const f = fixture(); const context = createModalContext(document);
    const parent = acquireModal(context, { scope: f.parent }); const parentTrap = trapFocus(context, f.parent);
    const child = acquireModal(context, { scope: f.child }); const childTrap = trapFocus(context, f.child);
    releases.push(parent, parentTrap, child, childTrap);
    expect(document.activeElement).toBe(f.nested);
    const focused = vi.fn(); document.addEventListener('focusin', focused);
    context.batch(() => { childTrap(); child(); parentTrap(); parent(); });
    document.removeEventListener('focusin', focused);
    expect(focused).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
    expect(f.outside.hasAttribute('inert')).toBe(false);
    expect(() => context.batch(() => Promise.resolve())).toThrow('synchronous');
  });

  it('T13.3.5 commits nested batches once, then runs callbacks in registration order before latest-stack notify', () => {
    const f = fixture(); const context = createModalContext(document); const order: string[] = [];
    context.batch(() => {
      const parent = acquireModal(context, { scope: f.parent }); releases.push(parent);
      context.batch(() => {
        const child = acquireModal(context, { scope: f.child }); releases.push(child);
        const stop = trapFocus(context, f.child, { initialFocus: f.nested }); releases.push(stop);
      }, () => { order.push('inner'); expect(f.first.hasAttribute('inert')).toBe(true); });
      order.push('action');
      expect(document.body.style.overflow).toBe('');
    }, () => { order.push('outer'); expect(document.body.style.overflow).toBe('hidden'); });
    expect(order).toEqual(['action', 'inner', 'outer']);
    expect(document.activeElement).toBe(f.nested);
  });

  it('T13.3.6 preserves action/afterCommit errors while reentry leaves final resources consistent', () => {
    const f = fixture(); const context = createModalContext(document); const actionError = Error('action failed');
    const skipped = vi.fn();
    let caught: unknown;
    try { context.batch(() => {
      const release = acquireModal(context, { scope: f.parent }); releases.push(release);
      context.batch(() => {}, skipped);
      throw actionError;
    }, skipped); } catch (error) { caught = error; }
    expect(caught).toBe(actionError);
    expect(skipped).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('hidden');
    const callbackError = Error('callback failed');
    caught = undefined;
    try { context.batch(() => {}, () => {
      context.batch(() => { releases.pop()!(); }, () => { expect(document.body.style.overflow).toBe(''); });
      throw callbackError;
    }); } catch (error) { caught = error; }
    expect(caught).toBe(callbackError);
    expect(document.body.style.overflow).toBe('');
    expect(f.outside.hasAttribute('inert')).toBe(false);
  });

  it('T13.3.7 uses initialFocus only for new traps and keeps a legal focus on reactivation', () => {
    const f = fixture(); const context = createModalContext(document);
    const parent = acquireModal(context, { scope: f.parent }); const parentTrap = trapFocus(context, f.parent, { initialFocus: f.second });
    releases.push(parent, parentTrap); expect(document.activeElement).toBe(f.second);
    const child = acquireModal(context, { scope: f.child }); const childTrap = trapFocus(context, f.child, { initialFocus: f.nested });
    releases.push(child, childTrap); expect(document.activeElement).toBe(f.nested);
    context.batch(() => { childTrap(); child(); }, () => { f.first.focus(); });
    expect(document.activeElement).toBe(f.first);
    const styles = new MutationObserver(() => {});
    styles.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    styles.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    context.batch(() => {});
    expect(document.activeElement).toBe(f.first);
    expect(styles.takeRecords()).toEqual([]);
    styles.disconnect();
  });

  it('T13.3.8 keeps old cleanup shapes and makes updates inert after repeated cleanup', () => {
    const f = fixture(); const layers = createLayerContext(document); const modals = createModalContext(document);
    const layer = registerLayer(layers, { nodes: [f.parent], onDismiss() {} });
    const release: Cleanup = acquireModal(modals, { scope: f.parent });
    layer.cleanup(); layer.cleanup(); release(); release();
    expect(() => layer.updateNodes([document.createElement('button')])).not.toThrow();
    expect(() => (release as typeof release & { updateAllowedNodes(nodes: HTMLElement[]): void }).updateAllowedNodes([document.createElement('button')])).not.toThrow();
    expect(document.body.style.overflow).toBe('');
  });

  it('T13.3 focusin reentry activates the latest registered modal', () => {
    const f = fixture(); const context = createModalContext(document);
    const parent = acquireModal(context, { scope: f.parent }); releases.push(parent);
    const onFocus = () => {
      document.removeEventListener('focusin', onFocus);
      const child = acquireModal(context, { scope: f.child }); releases.push(child);
      const childTrap = trapFocus(context, f.child, { initialFocus: f.nested }); releases.push(childTrap);
    };
    document.addEventListener('focusin', onFocus);
    const parentTrap = trapFocus(context, f.parent); releases.push(parentTrap);
    expect(document.activeElement).toBe(f.nested);
    expect(f.first.hasAttribute('inert')).toBe(true);
  });
});
