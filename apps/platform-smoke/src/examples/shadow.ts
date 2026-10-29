type DOMApi = typeof import('@zoom-design/dom');
export function mountShadowExample(root: HTMLElement, api: DOMApi) {
  const opener = document.createElement('button'); opener.textContent = 'Open shadow modal'; root.append(opener);
  opener.addEventListener('click', () => {
    const host = document.createElement('div'); host.id = 'shadow-modal-host'; const shadow = host.attachShadow({ mode: 'open' }); shadow.innerHTML = '<slot></slot><aside>Shadow background</aside>';
    const scope = document.createElement('div'); scope.id = 'shadow-modal-scope'; scope.innerHTML = '<button>Shadow modal first</button><button>Move into shadow</button><button>Detach shadow modal</button>';
    const portal = document.createElement('button'); portal.textContent = 'Allowed modal portal'; portal.id = 'allowed-modal-portal';
    host.append(scope); root.append(host); document.body.append(portal);
    const context = api.createModalContext(document); const release = api.acquireModal(context, { scope, allowedNodes: [portal] }); const stop = api.trapFocus(context, scope);
    scope.querySelectorAll('button')[1]!.addEventListener('click', () => shadow.append(scope));
    scope.querySelectorAll('button')[2]!.addEventListener('click', () => { scope.remove(); portal.remove(); });
    window.addEventListener('pagehide', () => { stop(); release(); host.remove(); portal.remove(); }, { once: true });
  });
}
