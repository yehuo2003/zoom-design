import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import { ZSelect } from '@zoom-design/vue/select';
import { ZCombobox } from '@zoom-design/vue/combobox';
import { acquireModal, createModalContext, trapFocus } from '@zoom-design/dom';
import '@zoom-design/vue/dialog/style.css';
import '@zoom-design/vue/select/style.css';
import '@zoom-design/vue/combobox/style.css';

declare global { interface Window { reviewReady: boolean; reviewTrace: string[] } }
const query = new URL(location.href).searchParams;
const scenario = query.get('scenario');
window.reviewTrace = [];
document.addEventListener('focusin', event => window.reviewTrace.push((event.target as HTMLElement).id));
const firstHost = document.createElement('div'); const secondHost = document.createElement('div');
firstHost.id = 'first-host'; secondHost.id = 'second-host';
document.body.prepend(firstHost); document.body.append(secondHost);

if (scenario === 'tab-order') {
  const c = document.createElement('button'); c.textContent = 'Portal C'; firstHost.append(c);
  const panel = document.createElement('div'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Tab scope');
  panel.innerHTML = '<button>A</button><button>B</button>';
  document.body.append(panel);
  if (query.get('position') === 'after') document.body.append(firstHost);
  const context = createModalContext(document);
  acquireModal(context, { scope: panel, allowedNodes: [c] }); trapFocus(context, panel);
} else {
  const child = ref(false);
  const parent = ref(true); const first = ref(true); const second = ref(false);
  const move = query.get('move') ?? 'inline-to-portal';
  const portal = ref(move !== 'inline-to-portal');
  const valid = ref(move !== 'invalid-to-valid');
  const destination = ref(firstHost);
  const getContainer = () => valid.value ? destination.value : null;
  const relocate = (event: KeyboardEvent) => {
    if (event.key !== 'F2') return;
    if (move === 'portal-to-inline') portal.value = false;
    else if (move === 'host-to-host') destination.value = secondHost;
    else { valid.value = true; portal.value = true; }
  };
  createApp(defineComponent({ setup: () => () => {
    if (scenario === 'return-batch') return h('section', [
      h('button', { id: 'outer-return' }, 'Outer return'),
      h(ZDialog, { open: parent.value, 'aria-label': 'Parent', returnFocus: () => document.getElementById('outer-return') }, {
        default: () => [h('button', { id: 'old-return' }, 'Old return'),
          h(ZDialog, { open: first.value, 'aria-label': 'First', returnFocus: () => document.getElementById('old-return') }, {
            default: () => h('button', { onClick: () => {
              first.value = false;
              if (query.get('action') === 'close-both') parent.value = false; else second.value = true;
            } }, 'Change active tree'),
          }),
          h(ZDialog, { open: second.value, 'aria-label': 'Second', initialFocus: () => document.getElementById('new-initial') }, {
            default: () => h('input', { id: 'new-initial', 'aria-label': 'New initial' }),
          })],
      }),
    ]);
    if (scenario === 'double-focus') return h(ZDialog, { open: true, 'aria-label': 'Parent' }, { default: () => [
      h('button', { id: 'invoker', onClick: () => { child.value = true; } }, 'Open child'),
      h('button', { id: 'return-target' }, 'Return target'),
      h(ZDialog, { open: child.value, 'aria-label': 'Child', returnFocus: () => document.getElementById('return-target'),
        'onUpdate:open': (open: boolean) => { child.value = open; } }),
    ] });
    if (scenario === 'portal-return') return h(ZDialog, { open: true, 'aria-label': 'Parent' }, { default: () => [
      h(ZDialog, { open: true, modal: false, portal: true, getContainer: () => firstHost, 'aria-label': 'First' }, {
        default: () => h('button', { id: 'portal-return', onClick: () => { child.value = true; } }, 'Open second'),
      }),
      h(ZDialog, { open: child.value, modal: false, portal: true, getContainer: () => firstHost, 'aria-label': 'Second',
        returnFocus: () => document.getElementById('portal-return'), 'onUpdate:open': (open: boolean) => { child.value = open; } }),
    ] });
    if (scenario === 'initial-choice') return h(ZDialog, { open: true, modal: false, 'aria-label': 'Initial',
      initialFocus: () => document.getElementById('initial-input') }, {
      default: () => [h('input', { id: 'initial-input', 'aria-label': 'Initial target' }),
        h(query.get('choice') === 'combobox' ? ZCombobox : ZSelect, {
          open: true, modelValue: 'a', options: [{ value: 'a', label: 'Alpha' }], 'aria-label': 'Initially open choice',
        })],
    });
    return h(ZDialog, { open: true, modal: query.get('modal') === 'true', portal: portal.value, getContainer, 'aria-label': 'Moving' }, {
      default: () => [h('p', 'Press F2 in the input to relocate the Dialog.'),
        h('input', { id: 'moving-input', 'aria-label': 'Moving target', onKeydown: relocate })],
    });
  } })).mount('#app');
}
await nextTick(); await nextTick(); await nextTick();
window.reviewReady = true;
