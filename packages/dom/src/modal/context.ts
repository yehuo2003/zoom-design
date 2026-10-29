import type { ModalContext, Cleanup } from '../types.js';
import { browserDocument } from '../internal/environment.js';
export interface ModalEntry { readonly scope: HTMLElement; readonly allowed: readonly HTMLElement[]; readonly cleanup: Cleanup }
export interface TrapEntry { activate(): void; deactivate(): void; redirect(): void; cleanup(): void }
export class ModalState implements ModalContext {
  readonly entries: ModalEntry[] = [];
  readonly traps = new Map<HTMLElement, TrapEntry>();
  readonly isolated = new Map<Element, readonly [string | null, string | null]>();
  readonly foreignStyles = new Map<Element, Cleanup>();
  stopGuards: Cleanup | undefined;
  unlock: Cleanup | undefined;
  observer: MutationObserver | undefined;
  constructor(readonly ownerDocument: Document) {}
  notify() { const scope = this.entries.at(-1)?.scope; for (const [target, trap] of this.traps) if (target === scope) trap.activate(); else trap.deactivate(); }
}
export function modalState(context: ModalContext): ModalState {
  browserDocument(context?.ownerDocument);
  if (!(context instanceof ModalState)) throw Error('Use createModalContext to create the modal context');
  return context;
}
