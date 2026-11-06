import { inject, onBeforeUnmount, provide } from 'vue';
import type { InjectionKey } from 'vue';
import type { LayerHandle } from '@zoom-design/dom';
import { OverlayLayer } from './layers';
import { OverlayModal } from './modal';
import { acquireOverlaySession, type OverlaySession } from './session';

export interface OverlayModalDemand {
  readonly scope: HTMLElement;
  readonly allowedNodes?: readonly HTMLElement[];
  readonly initialFocus?: HTMLElement | null;
}
export interface OverlayDemand {
  readonly document: Document;
  readonly nodes: readonly HTMLElement[];
  readonly visual: HTMLElement;
  readonly modal?: OverlayModalDemand;
  readonly onDismiss: (reason: 'escape' | 'outside', event: KeyboardEvent | PointerEvent) => void;
  readonly onActivate?: () => void;
  readonly onError?: (error: unknown) => void;
}

const ownerKey: InjectionKey<OverlayOwner> = Symbol('zoom-overlay-owner');

export class OverlayOwner {
  private requested: OverlayDemand | null = null;
  private session: OverlaySession | null = null;
  private layerLease: OverlayLayer | null = null;
  private modalLease: OverlayModal | null = null;
  private modalSequence = 0;
  private sequence = 0;
  private disposed = false;
  private relocating = false;

  constructor(readonly parent: OverlayOwner | null) {}

  get demand(): OverlayDemand | null { return this.requested; }
  get active(): boolean { return this.layerLease !== null; }
  get pending(): boolean { return this.requested !== null && !this.active; }
  get layer(): LayerHandle | null { return this.layerLease?.handle ?? null; }
  get zIndex(): number { return this.layerLease?.zIndex ?? 0; }
  get order(): number { return this.sequence; }
  get depth(): number { let depth = 0; for (let cursor = this.parent; cursor; cursor = cursor.parent) depth++; return depth; }
  get modalScope(): HTMLElement | null { return this.modalLease?.scope ?? null; }
  get modalOrder(): number { return this.modalSequence; }
  get relocatingInChain(): boolean {
    for (let cursor: OverlayOwner | null = this; cursor; cursor = cursor.parent) if (cursor.relocating) return true;
    return false;
  }

  setRelocating(value: boolean) { this.relocating = value; }

  setDemand(demand: OverlayDemand) {
    if (this.disposed) return;
    if (this.session && this.session.ownerDocument !== demand.document) this.clear();
    if (!this.session) {
      this.session = acquireOverlaySession(demand.document, this);
      this.sequence = this.session.nextOrder();
    }
    this.requested = demand;
    this.session.schedule();
  }

  clear() {
    this.requested = null;
    if (!this.session) return;
    const session = this.session;
    this.session = null;
    session.withdraw(this);
  }

  dispose() { if (this.disposed) return; this.disposed = true; this.relocating = false; this.clear(); }

  belongsTo(session: OverlaySession): boolean { return this.session === session; }
  hasAncestor(ancestor: OverlayOwner): boolean { for (let cursor = this.parent; cursor; cursor = cursor.parent) if (cursor === ancestor) return true; return false; }

  ready(session: OverlaySession): boolean {
    const demand = this.requested;
    if (!demand || demand.document !== session.ownerDocument || !demand.nodes.length) return false;
    const valid = (node: HTMLElement) => node instanceof session.ownerDocument.defaultView!.HTMLElement && node.ownerDocument === session.ownerDocument && node.isConnected;
    return demand.nodes.every(valid) && valid(demand.visual) && (!demand.modal || (valid(demand.modal.scope) && (demand.modal.allowedNodes ?? []).every(valid)));
  }

  ancestorsReady(session: OverlaySession): boolean {
    for (let cursor = this.parent; cursor; cursor = cursor.parent) if (!cursor.belongsTo(session) || !cursor.ready(session)) return false;
    return true;
  }

  ancestorsActive(session: OverlaySession): boolean {
    for (let cursor = this.parent; cursor; cursor = cursor.parent) if (!cursor.belongsTo(session) || !cursor.active) return false;
    return true;
  }

  activate(session: OverlaySession): boolean {
    const demand = this.requested;
    if (!demand || this.active) return false;
    try {
      const parent = this.parent?.layer ?? undefined;
      this.layerLease = new OverlayLayer(session.layers, demand, parent, session.nextZIndex(), (reason, event) => this.requested?.onDismiss(reason, event));
      if (demand.modal) this.acquireModal(session, demand.modal);
      return true;
    } catch (error) { this.deactivate(); demand.onError?.(error); return false; }
  }

  update(session: OverlaySession) {
    const demand = this.requested;
    if (!demand || !this.layerLease) return;
    try {
      if (this.modalLease && (!demand.modal || this.modalLease.scope !== demand.modal.scope)) {
        this.releaseModal();
      }
      this.layerLease.update(demand);
      if (demand.modal) {
        if (this.modalLease) this.modalLease.update(demand.modal);
        else this.acquireModal(session, demand.modal);
      }
    } catch (error) { this.deactivate(); demand.onError?.(error); }
  }

  deactivate() {
    this.releaseModal();
    this.layerLease?.cleanup(); this.layerLease = null;
  }

  releaseModal() {
    this.modalLease?.cleanup(); this.modalLease = null; this.modalSequence = 0;
  }

  updateModalAllowedNodes(nodes: readonly HTMLElement[]) {
    this.modalLease?.updateAllowedNodes(nodes);
  }

  acquireModal(session: OverlaySession, demand: OverlayModalDemand, initialFocus: HTMLElement | null = demand.initialFocus ?? null) {
    this.modalLease = new OverlayModal(session.modals, { ...demand, initialFocus });
    this.modalSequence = session.nextModalOrder();
  }
}

export function useOverlayOwner(): OverlayOwner {
  const owner = new OverlayOwner(inject(ownerKey, null));
  provide(ownerKey, owner);
  onBeforeUnmount(() => owner.dispose());
  return owner;
}
