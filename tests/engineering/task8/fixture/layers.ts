// Minimal routing experiment; not the Task10 layer manager/modal implementation.
export function mountLayers(root: HTMLElement) {
  root.innerHTML = '<button type="button" id="outside">Outside</button><div id="parent-layer"><button type="button" id="parent-trigger">Parent</button><div id="child-layer"><button type="button" id="child-trigger">Child</button></div></div><div id="child-portal"><button type="button">Portaled child</button></div>';
  const events: string[] = [];
  const layers = [
    { name: 'parent', nodes: [root.querySelector('#parent-layer')!, root.querySelector('#child-portal')!] },
    { name: 'child', nodes: [root.querySelector('#child-layer')!, root.querySelector('#child-portal')!] },
  ];
  const outside = (event: PointerEvent) => {
    const top = layers.at(-1); if (!top) return;
    if (!top.nodes.some(node => event.composedPath().includes(node))) events.push(`${top.name}:outside`);
  };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && layers.length) events.push(`${layers.at(-1)!.name}:escape`); };
  root.ownerDocument.addEventListener('pointerdown', outside);
  root.ownerDocument.addEventListener('keydown', escape);
  return { events: () => [...events], pop: () => layers.pop(), cleanup() { root.ownerDocument.removeEventListener('pointerdown', outside); root.ownerDocument.removeEventListener('keydown', escape); } };
}
