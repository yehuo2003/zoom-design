import { registerLayer } from '@zoom-design/dom';
import type { LayerContext, LayerHandle, RegisteredLayerHandle } from '@zoom-design/dom';
import type { OverlayDemand } from './owner';

function setLayerStyle(node: HTMLElement, zIndex: number) {
  const hadStyle = node.hasAttribute('style');
  const value = node.style.getPropertyValue('--_zoom-overlay-layer-z');
  const priority = node.style.getPropertyPriority('--_zoom-overlay-layer-z');
  node.style.setProperty('--_zoom-overlay-layer-z', String(zIndex));
  return () => {
    if (value) node.style.setProperty('--_zoom-overlay-layer-z', value, priority);
    else node.style.removeProperty('--_zoom-overlay-layer-z');
    if (!hadStyle && !node.style.cssText) node.removeAttribute('style');
  };
}

export class OverlayLayer {
  readonly handle: RegisteredLayerHandle;
  readonly zIndex: number;
  private visual: HTMLElement;
  private restoreVisual: () => void;
  private disposed = false;

  constructor(context: LayerContext, demand: OverlayDemand, parent: LayerHandle | undefined, zIndex: number, dismiss: (reason: 'escape' | 'outside', event: KeyboardEvent | PointerEvent) => void) {
    this.handle = registerLayer(context, { nodes: demand.nodes, ...(parent ? { parent } : {}), onDismiss: dismiss });
    this.zIndex = zIndex;
    this.visual = demand.visual;
    this.restoreVisual = setLayerStyle(this.visual, zIndex);
  }

  update(demand: OverlayDemand) {
    if (this.disposed) return;
    this.handle.updateNodes(demand.nodes);
    if (demand.visual !== this.visual) {
      this.restoreVisual();
      this.visual = demand.visual;
      this.restoreVisual = setLayerStyle(this.visual, this.zIndex);
    } else if (this.visual.style.getPropertyValue('--_zoom-overlay-layer-z') !== String(this.zIndex)) {
      this.visual.style.setProperty('--_zoom-overlay-layer-z', String(this.zIndex));
    }
  }

  cleanup() {
    if (this.disposed) return;
    this.disposed = true;
    this.handle.cleanup();
    this.restoreVisual();
  }
}
