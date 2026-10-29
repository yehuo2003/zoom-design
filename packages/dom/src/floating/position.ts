import type { FloatingHandle, FloatingOptions } from '../types.js';
import { computePosition, autoUpdate, offset, flip, shift, size } from '@floating-ui/dom';
import { elementDocument, restoreStyles } from '../internal/environment.js';

export function mountFloating(trigger: HTMLElement, popup: HTMLElement, options: FloatingOptions = {}): FloatingHandle {
  const owner = elementDocument(trigger, true); elementDocument(popup, true, owner);
  const restore = restoreStyles(popup, ['position', 'left', 'top', 'width', 'max-height', 'box-sizing']);
  const priorMaximum = owner.defaultView!.getComputedStyle(popup).maxHeight;
  const maximum = priorMaximum.endsWith('px') ? parseFloat(priorMaximum) : Infinity;
  const placement = ['bottom-start', 'bottom-end', 'top-start', 'top-end'].includes(options.placement ?? '') ? options.placement! : 'bottom-start';
  const distance = typeof options.offset === 'number' && Number.isFinite(options.offset) && options.offset >= 0 ? options.offset : 4;
  let active = true; let request = 0; let stop: (() => void) | undefined;
  const cleanup = () => { if (!active) return; active = false; request++; try { stop?.(); } finally { restore(); } };
  const update = async () => {
    if (!active) return;
    const ticket = ++request; let availableHeight = Infinity; let width = trigger.getBoundingClientRect().width;
    try {
      const position = await computePosition(trigger, popup, { strategy: 'absolute', placement, middleware: [offset(distance), flip(), shift(), size({ apply(state) { availableHeight = state.availableHeight; width = state.rects.reference.width; } })] });
      if (!active || ticket !== request || !trigger.isConnected || !popup.isConnected || trigger.ownerDocument !== owner || popup.ownerDocument !== owner) return;
      popup.style.left = `${position.x}px`; popup.style.top = `${position.y}px`;
      if (options.matchTriggerWidth !== false) popup.style.width = `${width}px`;
      const height = Math.min(maximum, availableHeight);
      if (Number.isFinite(height)) popup.style.maxHeight = `${Math.max(0, height)}px`;
    } catch (error) {
      if (!active || ticket !== request) return;
      try { (options.onError ?? console.error)(error); } catch (reportError) { console.error(reportError); }
    }
  };
  popup.style.position = 'absolute'; popup.style.left = '0px'; popup.style.top = '0px'; popup.style.boxSizing = 'border-box';
  try { stop = autoUpdate(trigger, popup, () => { void update(); }); } catch (error) { cleanup(); throw error; }
  return { update, cleanup };
}
