import { acquireModal } from '@zoom-design/dom';
import type { Cleanup, ManagedModalContext, ModalHandle } from '@zoom-design/dom';
import type { OverlayModalDemand } from './owner';
import { activateOverlayTrap } from './focus';
import { containsComposed, deepActiveElement } from './focus';

export class OverlayModal {
  readonly scope: HTMLElement;
  private readonly handle: ModalHandle;
  private stopTrap: Cleanup | null = null;
  private disposed = false;
  private trapped = false;
  private allowedNodes: readonly HTMLElement[];

  constructor(private readonly context: ManagedModalContext, private readonly demand: OverlayModalDemand, suspended = false) {
    this.scope = demand.scope;
    this.allowedNodes = demand.allowedNodes ?? [];
    this.handle = acquireModal(context, { scope: demand.scope, allowedNodes: demand.allowedNodes });
    try { if (!suspended) this.resumeTrap(); }
    catch (error) { this.handle(); throw error; }
  }

  update(demand: OverlayModalDemand) {
    this.updateAllowedNodes(demand.allowedNodes ?? []);
  }

  updateAllowedNodes(nodes: readonly HTMLElement[]) {
    if (!this.disposed) { this.handle.updateAllowedNodes(nodes); this.allowedNodes = nodes; }
  }

  suspendTrap() { this.stopTrap?.(); this.stopTrap = null; }

  resumeTrap() {
    if (this.disposed || this.stopTrap) return;
    const current = deepActiveElement(this.context.ownerDocument);
    const legal = current && [this.scope, ...this.allowedNodes].some(root => containsComposed(root, current));
    this.stopTrap = activateOverlayTrap(this.context, { ...this.demand,
      initialFocus: this.trapped ? (legal ? current : null) : this.demand.initialFocus });
    this.trapped = true;
  }

  cleanup() {
    if (this.disposed) return;
    this.disposed = true;
    this.suspendTrap();
    this.handle();
  }
}
