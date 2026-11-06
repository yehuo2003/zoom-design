import { trapFocus } from '@zoom-design/dom';
import type { Cleanup, ManagedModalContext } from '@zoom-design/dom';
import type { OverlayModalDemand } from './owner';

export function activateOverlayTrap(context: ManagedModalContext, demand: OverlayModalDemand): Cleanup {
  return trapFocus(context, demand.scope, { initialFocus: demand.initialFocus });
}
