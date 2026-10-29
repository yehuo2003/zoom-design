type DOMApi = typeof import('@zoom-design/dom');
export function mountModalExample(root: HTMLElement, api: DOMApi) {
  root.innerHTML = '<button id="modal-open">Open modal</button><button id="return-fallback">Return fallback</button><div id="theme-host" data-brand="purple"></div>';
  const context = api.createModalContext(document); const theme = root.querySelector<HTMLElement>('#theme-host')!;
  const opener = root.querySelector<HTMLButtonElement>('#modal-open')!; const fallback = root.querySelector<HTMLButtonElement>('#return-fallback')!;
  let close: (() => void) | undefined;
  opener.addEventListener('click', () => {
    if (close) return;
    const scope = document.createElement('div'); scope.id = 'modal-scope'; scope.setAttribute('role', 'dialog'); scope.setAttribute('aria-label', 'Parent modal'); scope.setAttribute('aria-modal', 'true');
    scope.innerHTML = '<button id="modal-first">Modal first</button><button id="nested-open">Open nested modal</button><button id="remove-return">Remove return target</button><button id="modal-detach">Detach modal</button><button id="modal-close">Close modal</button>';
    theme.append(scope);
    const release = api.acquireModal(context, { scope }); const stop = api.trapFocus(context, scope);
    close = () => { stop(); release(); scope.remove(); close = undefined; api.restoreFocus(opener, fallback); };
    scope.querySelector('#modal-close')!.addEventListener('click', () => close?.());
    scope.querySelector('#modal-detach')!.addEventListener('click', () => { scope.remove(); close = undefined; });
    scope.querySelector('#remove-return')!.addEventListener('click', () => opener.remove());
    scope.querySelector('#nested-open')!.addEventListener('click', () => {
      const nested = document.createElement('div'); nested.setAttribute('role', 'dialog'); nested.setAttribute('aria-label', 'Nested modal'); nested.id = 'nested-scope';
      nested.innerHTML = '<button id="nested-first">Nested first</button><button id="nested-parent-clean">Release parent first</button><button id="nested-close">Close nested modal</button>'; theme.append(nested);
      const unlock = api.acquireModal(context, { scope: nested }); const untrap = api.trapFocus(context, nested);
      nested.querySelector('#nested-parent-clean')!.addEventListener('click', () => { stop(); release(); scope.remove(); close = undefined; });
      nested.querySelector('#nested-close')!.addEventListener('click', () => { untrap(); unlock(); nested.remove(); if (scope.isConnected) api.restoreFocus(scope.querySelector<HTMLElement>('#nested-open'), scope); else api.restoreFocus(opener, fallback); });
    });
  });
  window.addEventListener('pagehide', () => close?.(), { once: true });
}
