import { afterEach, describe, it, expect, vi } from 'vitest';
import { createLayerContext, registerLayer, isWithin } from '../src/index.js';
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); });
function button() { const node = document.createElement('button'); document.body.append(node); return node; }
const pointer = (node: Element) => node.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));
describe('T10.5–8 document-local layers', () => {
  it('routes one request per intention, retains a rejected close and cleans up idempotently', () => {
    const context = createLayerContext(document); const trigger = button(); const popup = button(); const clear = button(); const outside = button();
    const dismiss = vi.fn(); const handle = registerLayer(context, { nodes: [trigger, popup, clear], onDismiss: dismiss }); cleanups.push(handle.cleanup);
    pointer(trigger); pointer(popup); pointer(clear); expect(dismiss).not.toHaveBeenCalled();
    pointer(outside); pointer(outside); expect(dismiss.mock.calls.map(call => call[0])).toEqual(['outside', 'outside']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(dismiss).toHaveBeenCalledTimes(3);
    handle.cleanup(); handle.cleanup(); pointer(outside); expect(dismiss).toHaveBeenCalledTimes(3);
  });
  it('only routes the top layer, counts portaled children as inside, and does not dismiss a lower layer when top opts out', () => {
    const context = createLayerContext(document); const parentNode = button(); const childNode = button(); const outside = button(); const parentDismiss = vi.fn(); const childDismiss = vi.fn();
    const parent = registerLayer(context, { nodes: [parentNode], onDismiss: parentDismiss }); cleanups.push(parent.cleanup);
    const child = registerLayer(context, { nodes: [childNode], parent, onDismiss: childDismiss, closeOnEscape: false, closeOnOutside: false }); cleanups.push(child.cleanup);
    pointer(childNode); pointer(outside); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); expect(parentDismiss).not.toHaveBeenCalled(); expect(childDismiss).not.toHaveBeenCalled();
    child.cleanup(); pointer(outside); expect(parentDismiss).toHaveBeenCalledTimes(1);
  });
  it('respects composedPath for a registered node inside a shadow tree', () => {
    const host = document.createElement('div'); document.body.append(host); const shadow = host.attachShadow({ mode: 'open' }); const node = document.createElement('button'); shadow.append(node);
    const context = createLayerContext(document); const dismiss = vi.fn(); const handle = registerLayer(context, { nodes: [node], onDismiss: dismiss }); cleanups.push(handle.cleanup);
    pointer(node); expect(dismiss).not.toHaveBeenCalled();
    let result = false; document.addEventListener('pointerdown', event => { result = isWithin([node], event.target, event); }, { once: true }); pointer(node); expect(result).toBe(true);
    expect(isWithin([host], node)).toBe(true); expect(isWithin([host], null)).toBe(false); expect(isWithin([], node)).toBe(false);
  });
  it('prevalidates empty, foreign, detached nodes and invalid parents without listeners', () => {
    const context = createLayerContext(document); const node = button(); const other = createLayerContext(document);
    const parent = registerLayer(other, { nodes: [node], onDismiss() {} }); cleanups.push(parent.cleanup);
    for (const nodes of [[], [document.createElement('button')], [document.implementation.createHTMLDocument().createElement('div')]]) {
      expect(() => registerLayer(context, { nodes, onDismiss() {} })).toThrow();
    }
    expect(() => registerLayer(context, { nodes: [node], parent, onDismiss() {} })).toThrow();
  });
  it('allows native focusout between trigger and popup without interpreting it as outside', () => {
    const trigger = button(); const popup = button(); const context = createLayerContext(document); const dismiss = vi.fn();
    const handle = registerLayer(context, { nodes: [trigger, popup], onDismiss: dismiss }); cleanups.push(handle.cleanup);
    trigger.focus(); popup.focus(); expect(isWithin([trigger, popup], document.activeElement)).toBe(true); expect(dismiss).not.toHaveBeenCalled();
  });
});
