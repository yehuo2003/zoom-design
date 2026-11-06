import type { LayerContext, LayerOptions, LayerHandle, RegisteredLayerHandle } from '../types.js';
import { browserDocument, elementDocument, containsComposed } from '../internal/environment.js';
interface Entry { readonly options: LayerOptions; nodes: HTMLElement[]; readonly handle: LayerHandle; readonly parent?: Entry }
function validNodes(nodes: readonly HTMLElement[], owner: Document): HTMLElement[] {
  if (!Array.isArray(nodes) || !nodes.length) throw Error('A layer needs at least one node');
  for (const node of nodes) elementDocument(node, true, owner);
  return [...new Set(nodes)];
}
class LayerState implements LayerContext {
  readonly entries: Entry[] = [];
  private composingTarget: Node | null = null;
  constructor(readonly ownerDocument: Document) {}
  readonly compositionStart = (event: Event) => {
    const target = event.composedPath()[0] ?? event.target;
    this.composingTarget = target instanceof this.ownerDocument.defaultView!.Node ? target : null;
  };
  readonly compositionEnd = () => { this.composingTarget = null; };
  readonly pointer = (event: Event) => {
    const top = this.entries.at(-1); if (!top || top.options.closeOnOutside === false) return;
    const nodes = this.entries.filter(entry => { for (let cursor: Entry | undefined = entry; cursor; cursor = cursor.parent) if (cursor === top) return true; return false; }).flatMap(entry => entry.nodes);
    if (!isWithin(nodes, event.target, event)) top.options.onDismiss('outside', event as PointerEvent);
  };
  readonly keyboard = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const top = this.entries.at(-1);
    if (this.composingTarget && !this.composingTarget.isConnected) this.composingTarget = null;
    if (event.isComposing || event.keyCode === 229 || (this.composingTarget && event.composedPath().includes(this.composingTarget))) return;
    if (top && top.options.closeOnEscape !== false) top.options.onDismiss('escape', event);
  };
}
export function createLayerContext(ownerDocument: Document): LayerContext { return new LayerState(browserDocument(ownerDocument)); }
export function registerLayer(context: LayerContext, options: LayerOptions): RegisteredLayerHandle {
  const owner = browserDocument(context?.ownerDocument);
  if (!(context instanceof LayerState)) throw Error('Use createLayerContext to create the layer context');
  const nodes = validNodes(options.nodes, owner);
  const parent = context.entries.find(entry => entry.handle === options.parent);
  if (options.parent && !parent) throw Error('Parent layer must be active in the same context');
  let active = true;
  const handle: RegisteredLayerHandle = { cleanup() {
    if (!active) return; active = false;
    const index = context.entries.indexOf(entry); if (index >= 0) context.entries.splice(index, 1);
    if (!context.entries.length) {
      owner.removeEventListener('pointerdown', context.pointer, true); owner.removeEventListener('keydown', context.keyboard, true);
      owner.removeEventListener('compositionstart', context.compositionStart, true); owner.removeEventListener('compositionend', context.compositionEnd, true);
      context.compositionEnd();
    }
  }, updateNodes(next) {
    if (!active) return;
    entry.nodes = validNodes(next, owner);
  } };
  const entry: Entry = { options: { ...options }, nodes, handle, ...(parent ? { parent } : {}) };
  context.entries.push(entry);
  if (context.entries.length === 1) {
    try {
      owner.addEventListener('pointerdown', context.pointer, true); owner.addEventListener('keydown', context.keyboard, true);
      owner.addEventListener('compositionstart', context.compositionStart, true); owner.addEventListener('compositionend', context.compositionEnd, true);
    } catch (error) { handle.cleanup(); throw error; }
  }
  return handle;
}
export function isWithin(nodes: readonly HTMLElement[], target: EventTarget | null, event?: Event): boolean {
  const owner = browserDocument(nodes?.[0]?.ownerDocument);
  const path = event?.composedPath() ?? [];
  return nodes.some(node => {
    elementDocument(node, false, owner);
    return path.includes(node) || (target instanceof owner.defaultView!.Node && containsComposed(node, target));
  });
}
