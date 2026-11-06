import { acquireModal } from '@zoom-design/dom';
import type { Cleanup, ManagedModalContext, ModalHandle } from '@zoom-design/dom';
import type { OverlayModalDemand } from './owner';
import { activateOverlayTrap } from './focus';

export class OverlayModal {
  readonly scope: HTMLElement;
  private readonly handle: ModalHandle;
  private readonly stopTrap: Cleanup;
  private disposed = false;

  constructor(context: ManagedModalContext, demand: OverlayModalDemand) {
    this.scope = demand.scope;
    this.handle = acquireModal(context, { scope: demand.scope, allowedNodes: demand.allowedNodes });
    try { this.stopTrap = activateOverlayTrap(context, demand); }
    catch (error) { this.handle(); throw error; }
  }

  update(demand: OverlayModalDemand) {
    if (!this.disposed) this.handle.updateAllowedNodes(demand.allowedNodes ?? []);
  }

  cleanup() {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTrap();
    this.handle();
  }
}
