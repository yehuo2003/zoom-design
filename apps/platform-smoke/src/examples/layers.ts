import type { FloatingHandle, LayerHandle } from '@zoom-design/dom';
import { mountModalExample } from './modal.js';
import { mountFormExample } from './form.js';
import { mountShadowExample } from './shadow.js';
type DOMApi = typeof import('@zoom-design/dom');

/** Public DOM primitives wired by an application. No framework/component state. */
export function mountLayersExample(root: HTMLElement, api: DOMApi) {
  root.innerHTML = `<h2>DOM primitives</h2>
    <section aria-label="Floating example"><button id="float-open">Open floating</button><button id="float-close">Close floating</button><button id="float-rtl">Toggle RTL</button><button id="float-resize">Resize trigger</button>
    <div id="scroll-area" style="height:180px;overflow:auto;border:1px solid;padding:8px;margin-top:8px"><div style="height:120px"></div><button id="float-trigger" style="width:170px">Floating trigger</button><div style="height:300px"></div></div></section>
    <section aria-label="Layer example"><button id="layer-parent">Register parent layer</button><button id="layer-child">Register child layer</button><button id="layer-clean">Clean layers</button><button id="outside">Outside target</button><output aria-label="Dismiss requests" id="requests"></output>
    <div id="parent-node"><button id="layer-trigger">Layer trigger</button><button id="clear-node">Clear control</button></div><button id="after-layer">After layer</button></section>
    <section id="modal-example" aria-label="Modal example"></section><section id="form-example" aria-label="Form example"></section>
    <svg width="200" height="70"><a href="#background" id="vector-link"><text x="10" y="30">Background vector link</text></a></svg>`;
  const byId = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const on = (id: string, handler: () => void) => byId(id).addEventListener('click', handler);
  const popup = document.createElement('div'); popup.id = 'floating-popup'; popup.textContent = 'Floating content';
  popup.style.cssText = 'background:white;border:1px solid;height:100px;overflow:auto;z-index:5';
  let floating: FloatingHandle | undefined;
  on('float-open', () => { if (floating) return; document.body.append(popup); floating = api.mountFloating(byId('float-trigger'), popup); });
  on('float-close', () => { floating?.cleanup(); floating = undefined; popup.remove(); });
  on('float-rtl', () => { byId('scroll-area').dir = byId('scroll-area').dir === 'rtl' ? 'ltr' : 'rtl'; popup.dir = byId('scroll-area').dir; void floating?.update(); });
  on('float-resize', () => { byId('float-trigger').style.width = '230px'; });
  const layerContext = api.createLayerContext(document); let parent: LayerHandle | undefined; let child: LayerHandle | undefined;
  const portal = document.createElement('div'); portal.id = 'layer-portal'; portal.innerHTML = '<button>Portaled child</button>';
  const shadowHost = document.createElement('div'); const shadow = shadowHost.attachShadow({ mode: 'open' }); shadow.innerHTML = '<button>Shadow inside</button>'; byId('parent-node').append(shadowHost);
  const requests: string[] = []; const dismiss = (name: string) => (reason: 'escape' | 'outside') => { requests.push(`${name}:${reason}`); byId('requests').textContent = requests.join('|'); };
  on('layer-parent', () => { parent?.cleanup(); parent = api.registerLayer(layerContext, { nodes: [byId('parent-node'), byId('clear-node')], onDismiss: dismiss('parent') }); });
  on('layer-child', () => { child?.cleanup(); document.body.append(portal); child = api.registerLayer(layerContext, { nodes: [portal], ...(parent ? { parent } : {}), onDismiss: dismiss('child') }); });
  const clean = () => { child?.cleanup(); parent?.cleanup(); child = parent = undefined; portal.remove(); };
  on('layer-clean', clean);
  mountModalExample(byId('modal-example'), api); mountFormExample(byId('form-example'), api);
  mountShadowExample(byId('modal-example'), api);
  window.addEventListener('pagehide', () => { clean(); floating?.cleanup(); }, { once: true });
}
