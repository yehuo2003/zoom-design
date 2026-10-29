import type { FormBridgeHandle, FormBridgeOptions } from '../types.js';
import { elementDocument, browserDocument, observeTree } from '../internal/environment.js';
import { focusElement } from '../focus/focus.js';
export function getFormOwner(control: HTMLSelectElement | HTMLInputElement): HTMLFormElement | null {
  const owner = elementDocument(control);
  if (!(control instanceof owner.defaultView!.HTMLSelectElement || control instanceof owner.defaultView!.HTMLInputElement)) throw Error('Expected a native select/input form control');
  return control.form;
}
export function isFieldsetDisabled(control: HTMLElement): boolean {
  elementDocument(control);
  if (/^(BUTTON|INPUT|SELECT|TEXTAREA|FIELDSET|OPTION|OPTGROUP)$/.test(control.tagName)) return control.matches(':disabled');
  for (let ancestor = control.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.tagName !== 'FIELDSET' || !(ancestor as HTMLFieldSetElement).disabled) continue;
    const legend = [...ancestor.children].find(child => child.tagName === 'LEGEND'); if (!legend?.contains(control)) return true;
  }
  return false;
}
export function observeFormBridge(options: FormBridgeOptions): FormBridgeHandle {
  browserDocument(options?.proxy?.ownerDocument);
  const { proxy, submission, trigger } = options; const owner = elementDocument(proxy, true);
  elementDocument(submission, true, owner); elementDocument(trigger, true, owner);
  if (!(proxy instanceof owner.defaultView!.HTMLSelectElement) || !(submission instanceof owner.defaultView!.HTMLInputElement)) throw Error('Form bridge requires a native select proxy and input submission');
  const view = owner.defaultView!; const pending = new Set<number>(); let active = true; let form: HTMLFormElement | null | undefined;
  const cancelPending = () => { for (const task of pending) view.clearTimeout(task); pending.clear(); };
  const reset = (event: Event) => {
    const scheduledOwner = form;
    if (event.target !== scheduledOwner) return;
    const task = view.setTimeout(() => { pending.delete(task); if (active && !event.defaultPrevented && proxy.isConnected && getFormOwner(proxy) === scheduledOwner && form === scheduledOwner) options.onReset(event); }, 0);
    pending.add(task);
  };
  const invalid = (event: Event) => { if (!active || event.target !== proxy) return; event.preventDefault(); focusElement(trigger); options.onInvalid(event); };
  const cleanup = () => { if (!active) return; active = false; observer.disconnect(); cancelPending(); form?.removeEventListener('reset', reset); proxy.removeEventListener('invalid', invalid); form = null; };
  const refresh = () => {
    if (!active) return;
    if (![proxy, submission, trigger].every(node => node.isConnected && node.ownerDocument === owner)) { cleanup(); return; }
    const next = getFormOwner(proxy);
    if (next !== form) { cancelPending(); form?.removeEventListener('reset', reset); form = next; next?.addEventListener('reset', reset); options.onOwnerChange?.(next); }
  };
  const observation = { childList: true, subtree: true, attributes: true, attributeFilter: ['form', 'id', 'name', 'disabled'] };
  const observer = new view.MutationObserver(() => { try { refresh(); if (active) observeTree(owner, observer, observation); } catch (error) { cleanup(); console.error(error); } });
  try { browserDocument(owner); proxy.addEventListener('invalid', invalid); observeTree(owner, observer, observation); refresh(); } catch (error) { cleanup(); throw error; }
  return { refresh, cleanup };
}
