import { nextTick } from 'vue';
import { createLayerContext, createModalContext } from '@zoom-design/dom';
import type { LayerContext, ManagedModalContext } from '@zoom-design/dom';
import type { OverlayOwner } from './owner';
import { containsComposed } from './focus';

const sessionKey = Symbol('zoom-overlay-session');
type SessionDocument = Document & { [sessionKey]?: OverlaySession };

export class OverlaySession {
  readonly layers: LayerContext;
  readonly modals: ManagedModalContext;
  private readonly owners = new Set<OverlayOwner>();
  private readonly closeEvents = new WeakSet<Event>();
  private observer: MutationObserver | null;
  private scheduled = false;
  private flushing = false;
  private dirty = false;
  private disposed = false;
  private order = 0;
  private zIndex = 999;
  private activationVersion = 0;
  private modalOrder = 0;
  private returnScheduled = false;
  private readonly activations: OverlayOwner[] = [];
  private readonly returns: { owner: OverlayOwner; restore: (() => void) | null; current: () => boolean; version: number }[] = [];

  constructor(readonly ownerDocument: Document) {
    this.layers = createLayerContext(ownerDocument);
    this.modals = createModalContext(ownerDocument);
    this.observer = new ownerDocument.defaultView!.MutationObserver(() => this.schedule());
    this.observer.observe(ownerDocument.documentElement, { childList: true, subtree: true });
  }

  get leaseCount(): number { return this.owners.size; }
  get observerActive(): boolean { return this.observer !== null; }
  get focusDeferred(): boolean { return this.returnScheduled; }
  nextOrder(): number { return ++this.order; }
  nextZIndex(): number { return ++this.zIndex; }
  nextModalOrder(): number { return ++this.modalOrder; }
  claimCloseEvent(event: Event): boolean {
    if (this.closeEvents.has(event)) return false;
    this.closeEvents.add(event);
    return true;
  }

  /** Register before render finishes; restoration commits before surviving traps resume. */
  queueReturn(owner: OverlayOwner, restore: (() => void) | null, current: () => boolean): void {
    const foreground = [...this.owners].filter(candidate => candidate.active).sort((a, b) => b.zIndex - a.zIndex)[0];
    if (!foreground || (foreground !== owner && !foreground.hasAncestor(owner))) return;
    this.returns.push({ owner, restore, current, version: this.activationVersion });
    // Release trap listeners, while modal isolation and scroll ownership remain synchronous.
    for (const candidate of this.owners) candidate.suspendTrap();
    if (this.returnScheduled) return;
    this.returnScheduled = true;
    void nextTick(() => queueMicrotask(() => {
      this.modals.batch(() => { if (!this.disposed) this.flush(); }, () => {
        this.returnScheduled = false;
        try { this.restorePendingFocus(); }
        finally {
          if (!this.returnScheduled) {
            this.activatePendingFocus();
            for (const candidate of this.owners) candidate.resumeTrap();
          }
        }
      });
    }));
  }

  private restorePendingFocus(): void {
    const pending = this.returns.filter(item => item.current());
    // A prepared close may still be waiting for its post-render withdrawal.
    if (pending.some(item => item.owner.active)) return;
    this.returns.length = 0;
    if (!pending.length) return;
    let chosen = pending[0]!;
    for (const item of pending.slice(1)) {
      if (chosen.owner.hasAncestor(item.owner) || !item.owner.hasAncestor(chosen.owner)) chosen = item;
    }
    // A newly activated overlay owns its initial focus. An old close cannot take it back.
    if (chosen.version !== this.activationVersion) return;
    const replacement = peekOverlaySession(this.ownerDocument);
    if (replacement && replacement !== this) return;
    chosen.restore?.();
  }

  topModalFocusRoots(): readonly HTMLElement[] {
    const top = this.topModal();
    return top?.modalScope ? [top.modalScope, ...this.allowedNodes(top)] : [];
  }

  add(owner: OverlayOwner) { this.owners.add(owner); this.schedule(); }

  withdraw(owner: OverlayOwner) {
    if (!this.owners.has(owner)) return;
    if (this.flushing) {
      this.modals.batch(() => {
        for (const child of [...this.owners].filter(candidate => candidate.hasAncestor(owner) && candidate.active).sort((a, b) => b.depth - a.depth)) child.deactivate();
        owner.deactivate();
      });
      this.dirty = true;
    } else this.flush();
    this.owners.delete(owner);
    if (!this.owners.size) this.destroy(); else this.schedule();
  }

  schedule() {
    if (this.disposed || this.scheduled) return;
    this.scheduled = true;
    void nextTick(() => {
      this.scheduled = false;
      if (!this.disposed) this.flush();
    });
  }

  private topModal(): OverlayOwner | undefined {
    return [...this.owners].filter(owner => owner.active && owner.modalScope).sort((a, b) => b.zIndex - a.zIndex)[0];
  }

  private blocked(owner: OverlayOwner): boolean {
    if (owner.demand?.modal) return false;
    const top = this.topModal();
    if (!top || top === owner || owner.hasAncestor(top)) return false;
    const scope = top.modalScope;
    const roots = [scope, ...(top.demand?.modal?.allowedNodes ?? [])].filter((node): node is HTMLElement => !!node);
    return !(owner.demand?.nodes.every(node => roots.some(root => containsComposed(root, node))) ?? false);
  }

  private reconcileModalOrder() {
    const ordered = [...this.owners].filter(owner => owner.active && owner.modalScope).sort((a, b) => a.zIndex - b.zIndex);
    if (!ordered.some((owner, index) => index > 0 && owner.modalOrder < ordered[index - 1]!.modalOrder)) return;
    let active = this.ownerDocument.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const focused = active instanceof this.ownerDocument.defaultView!.HTMLElement ? active : null;
    for (const owner of [...ordered].reverse()) owner.releaseModal();
    for (const owner of ordered) {
      const demand = owner.demand?.modal;
      if (!demand) continue;
      const initial = focused && containsComposed(demand.scope, focused) ? focused : demand.initialFocus ?? null;
      try { owner.acquireModal(this, demand, initial); }
      catch (error) { owner.deactivate(); owner.demand?.onError?.(error); this.dirty = true; }
    }
  }

  private allowedNodes(modal: OverlayOwner): HTMLElement[] {
    const scope = modal.modalScope!;
    const allowed = new Set(modal.demand?.modal?.allowedNodes ?? []);
    for (const descendant of this.owners) {
      if (!descendant.active || descendant === modal || descendant.modalScope || !descendant.hasAncestor(modal)) continue;
      let nearest = descendant.parent;
      while (nearest && !nearest.modalScope) nearest = nearest.parent;
      if (nearest !== modal) continue;
      for (const node of descendant.demand?.nodes ?? []) {
        if (node.isConnected && node.ownerDocument === this.ownerDocument && !containsComposed(scope, node)) allowed.add(node);
      }
    }
    return [...allowed];
  }

  private reconcileAllowedNodes() {
    for (const modal of this.owners) if (modal.active && modal.modalScope) modal.updateModalAllowedNodes(this.allowedNodes(modal));
  }

  private activatePendingFocus() {
    const foreground = [...this.owners].filter(owner => owner.active).sort((a, b) => b.zIndex - a.zIndex)[0];
    const latest = this.activations.splice(0).filter(owner => owner.active && owner.demand?.onActivate && !owner.demand.modal &&
      (owner === foreground || foreground?.hasAncestor(owner)) && !this.blocked(owner)).at(-1);
    latest?.demand?.onActivate?.();
  }

  private flush() {
    if (this.disposed) return;
    if (this.flushing) { this.dirty = true; return; }
    this.flushing = true;
    try {
      do {
        this.dirty = false;
        this.modals.batch(() => {
          const descendantsFirst = [...this.owners].filter(owner => owner.active).sort((a, b) => b.depth - a.depth || b.order - a.order);
          for (const owner of descendantsFirst) if (!owner.ready(this) || !owner.ancestorsReady(this)) owner.deactivate();
          const parentsFirst = [...this.owners].sort((a, b) => a.depth - b.depth || a.order - b.order);
          for (const owner of parentsFirst) {
            if (!owner.ready(this) || !owner.ancestorsActive(this)) continue;
            if (owner.active) owner.update(this);
            else if (!this.blocked(owner) && owner.activate(this)) { this.activationVersion++; this.activations.push(owner); }
          }
          this.reconcileModalOrder();
          this.reconcileAllowedNodes();
        }, () => {
          // Selection popups delegate initial focus to their newly activated Dialog ancestor.
          if (!this.returnScheduled) this.activatePendingFocus();
        });
      } while (this.dirty);
    } finally { this.flushing = false; }
  }

  private destroy() {
    this.disposed = true;
    this.observer?.disconnect(); this.observer = null;
    const owner = this.ownerDocument as SessionDocument;
    if (owner[sessionKey] === this) delete owner[sessionKey];
  }
}

export function peekOverlaySession(ownerDocument: Document): OverlaySession | null {
  return (ownerDocument as SessionDocument)[sessionKey] ?? null;
}

export function acquireOverlaySession(ownerDocument: Document, owner: OverlayOwner): OverlaySession {
  if (ownerDocument?.nodeType !== 9 || !ownerDocument.defaultView?.HTMLElement) throw Error('An overlay needs a live browser Document');
  const documentWithSession = ownerDocument as SessionDocument;
  const session = documentWithSession[sessionKey] ?? new OverlaySession(ownerDocument);
  documentWithSession[sessionKey] = session;
  session.add(owner);
  return session;
}
