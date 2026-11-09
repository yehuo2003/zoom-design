import { trapFocus } from '@zoom-design/dom';
import type { Cleanup, ManagedModalContext } from '@zoom-design/dom';
import type { OverlayModalDemand } from './owner';

export function containsComposed(ancestor: Element, node: Node): boolean {
  if (ancestor.contains(node)) return true;
  let cursor: Element | null = node.nodeType === 1 ? node as Element : node.parentElement;
  while (cursor) {
    if (cursor === ancestor) return true;
    cursor = cursor.assignedSlot ?? cursor.parentElement ?? ((cursor.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
  }
  return false;
}

export function deepActiveElement(owner: Document): HTMLElement | null {
  let active = owner.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active instanceof owner.defaultView!.HTMLElement && active !== owner.body ? active : null;
}

export function activateOverlayTrap(context: ManagedModalContext, demand: OverlayModalDemand): Cleanup {
  return trapFocus(context, demand.scope, { initialFocus: demand.initialFocus });
}
