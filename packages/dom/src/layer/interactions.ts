import type { LayerContext, LayerOptions, LayerHandle } from '../types.js';
import { browserDocument, elementDocument, containsComposed } from '../internal/environment.js';
interface Entry { readonly options: LayerOptions; readonly handle: LayerHandle; readonly parent?: Entry }
class LayerState implements LayerContext {
  readonly entries: Entry[] = [];
  constructor(readonly ownerDocument: Document) {}
  readonly pointer = (event: Event) => {
    const top = this.entries.at(-1); if (!top || top.options.closeOnOutside === false) return;
    const nodes = this.entries.filter(entry => { for (let cursor: Entry | undefined = entry; cursor; cursor = cursor.parent) if (cursor === top) return true; return false; }).flatMap(entry => entry.options.nodes);
    if (!isWithin(nodes, event.target, event)) top.options.onDismiss('outside', event as PointerEvent);
  };
  readonly keyboard = (event: KeyboardEvent) => {
    const top = this.entries.at(-1);
    if (event.key === 'Escape' && !event.isComposing && top && top.options.closeOnEscape !== false) top.options.onDismiss('escape', event);
  };
}
export function createLayerContext(ownerDocument: Document): LayerContext { return new LayerState(browserDocument(ownerDocument)); }
export function registerLayer(context: LayerContext, options: LayerOptions): LayerHandle {
  const owner = browserDocument(context?.ownerDocument);
  if (!(context instanceof LayerState)) throw Error('Use createLayerContext to create the layer context');
  if (!options.nodes.length) throw Error('A layer needs at least one node');
  for (const node of options.nodes) elementDocument(node, true, owner);
  const parent = context.entries.find(entry => entry.handle === options.parent);
  if (options.parent && !parent) throw Error('Parent layer must be active in the same context');
  let active = true;
  const handle: LayerHandle = { cleanup() {
    if (!active) return; active = false;
    const index = context.entries.indexOf(entry); if (index >= 0) context.entries.splice(index, 1);
    if (!context.entries.length) { owner.removeEventListener('pointerdown', context.pointer, true); owner.removeEventListener('keydown', context.keyboard, true); }
  } };
  const entry: Entry = { options: { ...options, nodes: [...options.nodes] }, handle, ...(parent ? { parent } : {}) };
  context.entries.push(entry);
  if (context.entries.length === 1) {
    try { owner.addEventListener('pointerdown', context.pointer, true); owner.addEventListener('keydown', context.keyboard, true); } catch (error) { handle.cleanup(); throw error; }
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
