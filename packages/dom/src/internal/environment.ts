export function browserDocument(candidate?: Document): Document {
  const owner = candidate ?? (typeof document === 'undefined' ? undefined : document);
  if (!owner || owner.nodeType !== 9 || !owner.defaultView?.HTMLElement) throw Error('Unsupported browser environment: a live browser Document is required');
  return owner;
}
export function elementDocument(node: HTMLElement, connected = false, expected?: Document): Document {
  const owner = browserDocument(node?.ownerDocument);
  if (!(node instanceof owner.defaultView!.HTMLElement) || (expected && owner !== expected) || (connected && !node.isConnected)) throw Error('Expected a connected HTMLElement in the same document');
  return owner;
}
export function parentElement(node: Element): HTMLElement | null {
  return node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? null;
}
export function renderedChildren(node: Element | ShadowRoot): Element[] {
  if (node instanceof node.ownerDocument.defaultView!.HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    if (assigned.length) return assigned;
  }
  return [...(('shadowRoot' in node && node.shadowRoot) || node).children];
}
// Document observers do not cross shadow boundaries. Observe every reachable open
// root as well, including roots in newly inserted subtrees.
export function observeTree(owner: Document, observer: MutationObserver, options: MutationObserverInit): void {
  observer.observe(owner.documentElement, options);
  const visit = (root: Element | ShadowRoot) => {
    for (const child of root.children) {
      if (child.shadowRoot) { observer.observe(child.shadowRoot, options); visit(child.shadowRoot); }
      visit(child);
    }
  };
  visit(owner.documentElement);
}
export function containsComposed(ancestor: Element, node: Node): boolean {
  if (ancestor.contains(node)) return true;
  let element = node.nodeType === 1 ? node as Element : node.parentElement;
  while (element) { if (element === ancestor) return true; element = parentElement(element); }
  return false;
}
export function restoreStyles(node: HTMLElement, properties: readonly string[]): () => void {
  const present = node.hasAttribute('style');
  const before = properties.map(property => [property, node.style.getPropertyValue(property), node.style.getPropertyPriority(property)] as const);
  return () => {
    for (const [property, value, priority] of before) { if (value) node.style.setProperty(property, value, priority); else node.style.removeProperty(property); }
    if (!present && !node.style.cssText) node.removeAttribute('style');
  };
}
