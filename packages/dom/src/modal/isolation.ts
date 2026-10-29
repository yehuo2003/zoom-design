import type { Cleanup, ModalContext, ModalOptions } from '../types.js';
import { browserDocument, elementDocument, restoreStyles, containsComposed, renderedChildren, observeTree } from '../internal/environment.js';
import { ModalState, modalState, type ModalEntry } from './context.js';

// A token for a live resource owner, never a module-level Document/stack cache.
const modalOwner = Symbol('zoom-modal-owner');
type OwnedDocument = Document & { [modalOwner]?: ModalState };
function restoreIsolation(state: ModalState) {
  for (const [node, [inert, aria]] of state.isolated) {
    if (inert === null) node.removeAttribute('inert'); else node.setAttribute('inert', inert);
    if (aria === null) node.removeAttribute('aria-hidden'); else node.setAttribute('aria-hidden', aria);
  }
  state.isolated.clear();
  for (const restore of state.foreignStyles.values()) restore();
  state.foreignStyles.clear();
}
function refreshIsolation(state: ModalState) {
  restoreIsolation(state);
  const top = state.entries.at(-1); if (!top) return;
  const allowed = [top.scope, ...top.allowed].filter(node => node.isConnected && node.ownerDocument === state.ownerDocument);
  const visit = (container: Element | ShadowRoot) => {
    for (const child of renderedChildren(container)) {
      if (allowed.some(node => containsComposed(node, child))) continue;
      if (allowed.some(node => containsComposed(child, node))) { visit(child); continue; }
      if (!(child instanceof state.ownerDocument.defaultView!.HTMLElement)) {
        // SVG/MathML lack native HTML inert. Keep framework-owned topology intact;
        // aria-hidden plus scoped event/focus guards provide the fallback.
        const styled = child as HTMLElement;
        state.foreignStyles.set(child, restoreStyles(styled, ['pointer-events']));
        styled.style.setProperty('pointer-events', 'none', 'important');
      }
      state.isolated.set(child, [child.getAttribute('inert'), child.getAttribute('aria-hidden')]);
      child.setAttribute('inert', ''); child.setAttribute('aria-hidden', 'true');
    }
  };
  visit(state.ownerDocument.body);
}
function unlockIfEmpty(state: ModalState) {
  if (state.entries.length) return;
  state.observer?.disconnect(); state.observer = undefined;
  restoreIsolation(state); state.unlock?.(); state.unlock = undefined;
  state.stopGuards?.(); state.stopGuards = undefined;
  const owner = state.ownerDocument as OwnedDocument; if (owner[modalOwner] === state) delete owner[modalOwner];
}
export function createModalContext(ownerDocument: Document): ModalContext { return new ModalState(browserDocument(ownerDocument)); }
export function acquireModal(context: ModalContext, options: ModalOptions): Cleanup {
  const state = modalState(context); const owner = state.ownerDocument as OwnedDocument;
  elementDocument(options.scope, true, owner);
  for (const node of options.allowedNodes ?? []) elementDocument(node, true, owner);
  if (owner[modalOwner] && owner[modalOwner] !== state) throw Error('Use one shared ModalContext for active scopes in the same document');
  let active = true;
  const cleanup = () => {
    if (!active) return; active = false;
    const index = state.entries.indexOf(entry); if (index >= 0) state.entries.splice(index, 1);
    if (!state.entries.some(item => item.scope === entry.scope)) state.traps.get(entry.scope)?.cleanup();
    refreshIsolation(state); unlockIfEmpty(state); state.notify();
  };
  const entry: ModalEntry = { scope: options.scope, allowed: [...(options.allowedNodes ?? [])], cleanup };
  state.entries.push(entry);
  try {
    if (state.entries.length === 1) {
      owner[modalOwner] = state;
      const body = owner.body; const html = owner.documentElement;
      const restoreBody = restoreStyles(body, ['overflow', 'padding-inline-end']); const restoreHtml = restoreStyles(html, ['overflow']);
      state.unlock = () => { restoreBody(); restoreHtml(); };
      const events = ['pointerdown', 'pointerup', 'click', 'dblclick', 'contextmenu', 'keydown', 'focusin'];
      const guard = (event: Event) => {
        const target = event.target; const path = event.composedPath();
        if (![...state.foreignStyles.keys()].some(node => path.includes(node) || (target instanceof owner.defaultView!.Node && containsComposed(node, target)))) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.type === 'focusin') {
          (target as HTMLElement).blur?.();
          const scope = state.entries.at(-1)?.scope;
          const trap = scope && state.traps.get(scope);
          if (trap) trap.redirect();
          else if (scope?.isConnected && scope.ownerDocument === owner) scope.focus({ preventScroll: true });
        }
      };
      state.stopGuards = () => { for (const name of events) owner.removeEventListener(name, guard, true); };
      for (const name of events) owner.addEventListener(name, guard, true);
      const gap = Math.max(0, owner.defaultView!.innerWidth - html.clientWidth);
      const padding = parseFloat(owner.defaultView!.getComputedStyle(body).paddingInlineEnd) || 0;
      body.style.overflow = 'hidden'; html.style.overflow = 'hidden';
      if (gap > 0) body.style.paddingInlineEnd = `${padding + gap}px`;
      state.observer = new owner.defaultView!.MutationObserver(() => {
        for (const item of [...state.entries]) if (!item.scope.isConnected || item.scope.ownerDocument !== owner) item.cleanup();
        if (state.observer) observeTree(owner, state.observer, { childList: true, subtree: true });
        refreshIsolation(state);
      });
      observeTree(owner, state.observer, { childList: true, subtree: true });
    }
    refreshIsolation(state); state.notify();
  } catch (error) { cleanup(); throw error; }
  return cleanup;
}
