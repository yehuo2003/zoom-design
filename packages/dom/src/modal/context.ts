import type { Cleanup, ManagedModalContext, ModalContext, ModalHandle } from '../types.js';
import { browserDocument } from '../internal/environment.js';

export interface ModalEntry { readonly scope: HTMLElement; allowed: HTMLElement[]; readonly cleanup: ModalHandle }
export interface TrapEntry { activate(): void; deactivate(): void; redirect(): void; cleanup(): void }

export class ModalState implements ManagedModalContext {
  readonly entries: ModalEntry[] = [];
  readonly traps = new Map<HTMLElement, TrapEntry>();
  readonly isolated = new Map<Element, readonly [string | null, string | null]>();
  readonly foreignStyles = new Map<Element, Cleanup>();
  stopGuards: Cleanup | undefined;
  unlock: Cleanup | undefined;
  observer: MutationObserver | undefined;
  private depth = 0;
  private flushing = false;
  private resourcesDirty = false;
  private notificationPending = false;
  private readonly callbacks: (() => void)[] = [];

  constructor(readonly ownerDocument: Document, private readonly reconcile: (state: ModalState) => void) {}

  get isBatching(): boolean { return this.depth > 0; }

  batch<T>(action: () => T, afterCommit?: () => void): T {
    const callbackStart = this.callbacks.length;
    if (this.depth === 0) {
      for (const trap of this.traps.values()) trap.deactivate();
      this.notificationPending = true;
    }
    this.depth++;
    let result!: T;
    let actionError: unknown;
    let failed = false;
    try {
      result = action();
      if (result && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function') {
        throw Error('Modal batch action must be synchronous');
      }
      if (afterCommit) this.callbacks.push(afterCommit);
    } catch (error) {
      actionError = error;
      failed = true;
      this.callbacks.splice(callbackStart);
    } finally {
      this.depth--;
      if (this.depth === 0) {
        try { this.flush(); } catch (error) { if (!failed) { actionError = error; failed = true; } }
      }
    }
    if (failed) throw actionError;
    return result;
  }

  requestResources(): void {
    this.resourcesDirty = true;
    this.notificationPending = true;
    this.flush();
  }

  notify(): void {
    this.notificationPending = true;
    this.flush();
  }

  private flush(): void {
    if (this.depth || this.flushing) return;
    this.flushing = true;
    let callbackError: unknown;
    let callbackFailed = false;
    try {
      while (this.resourcesDirty || this.callbacks.length || this.notificationPending) {
        if (this.resourcesDirty) {
          this.resourcesDirty = false;
          this.reconcile(this);
        }
        if (this.callbacks.length) {
          const callback = this.callbacks.shift()!;
          try { callback(); } catch (error) { if (!callbackFailed) { callbackError = error; callbackFailed = true; } }
          continue;
        }
        if (this.notificationPending) {
          this.notificationPending = false;
          const scope = this.entries.at(-1)?.scope;
          for (const [target, trap] of this.traps) {
            if (target === scope) trap.activate(); else trap.deactivate();
            if (this.resourcesDirty || this.notificationPending) break;
          }
        }
      }
    } finally { this.flushing = false; }
    if (callbackFailed) throw callbackError;
  }
}
export function modalState(context: ModalContext): ModalState {
  browserDocument(context?.ownerDocument);
  if (!(context instanceof ModalState)) throw Error('Use createModalContext to create the modal context');
  return context;
}
