import type { Cleanup, FocusTrapOptions, ModalContext } from '../types.js';
import { browserDocument, elementDocument, parentElement, containsComposed, renderedChildren } from '../internal/environment.js';
import { modalState } from '../modal/context.js';
function available(node: HTMLElement): boolean {
  if (!node.isConnected || node.matches(':disabled')) return false;
  for (let cursor: HTMLElement | null = node; cursor; cursor = parentElement(cursor)) {
    const style = cursor.ownerDocument.defaultView!.getComputedStyle(cursor);
    if (cursor.hidden || cursor.hasAttribute('inert') || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (cursor.tagName === 'DETAILS' && !(cursor as HTMLDetailsElement).open && cursor !== node) {
      const summary = [...cursor.children].find(child => child.tagName === 'SUMMARY');
      if (!summary?.contains(node)) return false;
    }
  }
  return true;
}
function activeElement(owner: Document): Element | null { let current = owner.activeElement; while (current?.shadowRoot?.activeElement) current = current.shadowRoot.activeElement; return current; }
function tabbables(scopes: readonly HTMLElement[]): HTMLElement[] {
  const scope = scopes[0]!;
  const nodes: HTMLElement[] = [];
  const seen = new Set<Element>();
  const visit = (root: HTMLElement | ShadowRoot) => {
    for (const element of renderedChildren(root)) {
      if (!(element instanceof scope.ownerDocument.defaultView!.HTMLElement)) continue;
      if (seen.has(element)) continue; seen.add(element);
      if (available(element) && (element.tabIndex >= 0 || (element.isContentEditable && !element.hasAttribute('tabindex')))) nodes.push(element);
      visit(element);
    }
  };
  for (const root of scopes) {
    if (root !== scope && !seen.has(root)) { seen.add(root); if (available(root) && root.tabIndex >= 0) nodes.push(root); }
    visit(root);
  }
  const candidates = nodes.filter(node => {
    if (!(node instanceof scope.ownerDocument.defaultView!.HTMLInputElement) || node.type !== 'radio' || !node.name) return true;
    const group = nodes.filter((item): item is HTMLInputElement => item instanceof scope.ownerDocument.defaultView!.HTMLInputElement && item.type === 'radio' && item.name === node.name && item.form === node.form && item.getRootNode() === node.getRootNode());
    return node === (group.find(item => item.checked) ?? group[0]);
  });
  return candidates.map((node, index) => ({ node, index })).sort((a, b) => {
    const first = a.node.tabIndex > 0 ? a.node.tabIndex : Infinity; const second = b.node.tabIndex > 0 ? b.node.tabIndex : Infinity;
    return first - second || a.index - b.index;
  }).map(item => item.node);
}
export function focusElement(target: HTMLElement | null, options?: FocusOptions): boolean {
  browserDocument(target?.ownerDocument);
  if (!target) return false;
  elementDocument(target);
  if (!available(target)) return false;
  try { target.focus(options); const active = activeElement(target.ownerDocument); return active !== null && containsComposed(target, active); } catch { return false; }
}
export function restoreFocus(preferred: HTMLElement | null, fallback?: HTMLElement | null): boolean { browserDocument(preferred?.ownerDocument ?? fallback?.ownerDocument); return focusElement(preferred) || (fallback ? focusElement(fallback) : false); }
export function trapFocus(context: ModalContext, scope: HTMLElement, options: FocusTrapOptions = {}): Cleanup {
  const state = modalState(context); const owner = elementDocument(scope, true, state.ownerDocument);
  if (!state.entries.some(entry => entry.scope === scope) || state.traps.has(scope)) throw Error('A focus trap needs one registered modal scope');
  const previousTabindex = scope.getAttribute('tabindex');
  if (previousTabindex === null && scope.tabIndex < 0) scope.setAttribute('tabindex', '-1');
  let disposed = false; let active = false; let initialized = false; let redirecting = false; let last: HTMLElement | null = null;
  const scopes = () => [scope, ...([...state.entries].reverse().find(entry => entry.scope === scope)?.allowed ?? []).filter(node => node.isConnected && node.ownerDocument === owner)];
  const inside = (target: Node) => scopes().some(node => containsComposed(node, target));
  const initial = () => {
    if (last && inside(last) && focusElement(last)) return;
    if (!initialized && options.initialFocus && inside(options.initialFocus) && focusElement(options.initialFocus)) return;
    for (const candidate of tabbables(scopes())) if (focusElement(candidate)) return;
    focusElement(scope);
  };
  const keydown = (event: KeyboardEvent) => {
    if (!active || disposed || event.key !== 'Tab') return;
    const nodes = tabbables(scopes()); const current = activeElement(owner); const index = nodes.findIndex(node => node === current);
    if (!nodes.length || index < 0 || (event.shiftKey ? index === 0 : index === nodes.length - 1)) {
      event.preventDefault(); focusElement(nodes[event.shiftKey ? nodes.length - 1 : 0] ?? scope);
    }
  };
  const focusin = (event: FocusEvent) => {
    if (!active || disposed || redirecting) return;
    const target = activeElement(owner);
    if (target && inside(target)) { last = target as HTMLElement; return; }
    if (scopes().some(node => event.composedPath().includes(node))) return;
    redirecting = true; try { initial(); } finally { redirecting = false; }
  };
  const cleanup = () => {
    if (disposed) return; disposed = true; active = false;
    owner.removeEventListener('keydown', keydown, true); owner.removeEventListener('focusin', focusin, true);
    state.traps.delete(scope);
    if (previousTabindex === null) scope.removeAttribute('tabindex'); else scope.setAttribute('tabindex', previousTabindex);
  };
  const trap = { activate() { if (active || disposed) return; active = true; initial(); initialized = true; }, deactivate() { active = false; }, redirect() { if (active && !disposed) initial(); }, cleanup };
  try { owner.addEventListener('keydown', keydown, true); owner.addEventListener('focusin', focusin, true); state.traps.set(scope, trap); state.notify(); } catch (error) { cleanup(); throw error; }
  return cleanup;
}
