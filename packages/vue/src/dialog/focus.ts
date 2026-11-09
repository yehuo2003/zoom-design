import { focusElement } from '@zoom-design/dom';
import { containsComposed } from '../overlay/focus';
export { containsComposed, deepActiveElement } from '../overlay/focus';

function parentElement(node: Element): HTMLElement | null {
  return node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? null;
}

/** Check callback values before giving them to the DOM trap. Actual focus is verified by focusElement. */
export function validInitialTarget(value: unknown, scope: HTMLElement): value is HTMLElement {
  const owner = scope.ownerDocument;
  if (!(value instanceof owner.defaultView!.HTMLElement) || value.ownerDocument !== owner || !value.isConnected || !containsComposed(scope, value)) return false;
  if (value.matches(':disabled') || (value.tabIndex < 0 && !value.hasAttribute('tabindex') && !value.isContentEditable)) return false;
  for (let node: HTMLElement | null = value; node && containsComposed(scope, node); node = parentElement(node)) {
    const style = owner.defaultView!.getComputedStyle(node);
    if (node.hidden || node.hasAttribute('inert') || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (node === scope) break;
  }
  return true;
}

function renderedChildren(node: Element | ShadowRoot): Element[] {
  if (node instanceof node.ownerDocument.defaultView!.HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    if (assigned.length) return assigned;
  }
  return [...(('shadowRoot' in node && node.shadowRoot) || node).children];
}

/** Nonmodal dialogs use the same composed-tree order; modal Tab navigation stays in DOM trapFocus. */
export function focusDialogInitial(scope: HTMLElement, preferred: HTMLElement | null): boolean {
  if (preferred && containsComposed(scope, preferred) && focusElement(preferred, { preventScroll: true })) return true;
  const candidates: HTMLElement[] = [];
  const seen = new Set<Element>();
  const visit = (root: Element | ShadowRoot) => {
    for (const node of renderedChildren(root)) {
      if (!(node instanceof scope.ownerDocument.defaultView!.HTMLElement) || seen.has(node)) continue;
      seen.add(node);
      if (node.tabIndex >= 0 || (node.isContentEditable && !node.hasAttribute('tabindex'))) candidates.push(node);
      visit(node);
    }
  };
  visit(scope);
  candidates.sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity));
  for (const candidate of candidates) if (focusElement(candidate, { preventScroll: true })) return true;
  return focusElement(scope, { preventScroll: true });
}

export function focusAllowed(value: unknown, owner: Document, modalRoots: readonly HTMLElement[], closingScope: HTMLElement | null): boolean {
  if (!(value instanceof owner.defaultView!.HTMLElement) || value.ownerDocument !== owner || !value.isConnected) return false;
  if (closingScope && containsComposed(closingScope, value)) return false;
  if (modalRoots.length && !modalRoots.some(root => containsComposed(root, value))) return false;
  return focusElement(value, { preventScroll: true });
}
