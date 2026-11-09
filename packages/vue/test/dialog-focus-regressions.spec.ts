import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import Dialog from '../src/dialog/Dialog.vue';
import Select from '../src/select/Select.vue';
import Combobox from '../src/combobox/Combobox.vue';
import { peekOverlaySession } from '../src/overlay/session';

const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => { for (let index = 0; index < 6; index++) await nextTick(); await Promise.resolve(); };
const find = (id: string) => document.getElementById(id)!;
const host = () => { const node = document.createElement('div'); document.body.append(node); return node; };
afterEach(async () => {
  for (const wrapper of wrappers.splice(0).reverse()) wrapper.unmount();
  await settle();
  expect(peekOverlaySession(document)).toBeNull();
  document.body.replaceChildren();
  document.body.removeAttribute('style'); document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('Dialog review focus regressions', () => {
  it('F2 restores a distinct explicit target once before reactivating the surviving parent trap', async () => {
    const child = ref(false);
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent' }, {
      default: () => [h('button', { id: 'invoker' }, 'Invoker'), h('button', { id: 'return-target' }, 'Return target'),
        h(Dialog, { open: child.value, 'aria-label': 'Child', returnFocus: () => find('return-target') })],
    }) }), { attachTo: document.body }));
    await settle(); find('invoker').focus(); child.value = true; await settle();
    const trace: string[] = [];
    const record = (event: FocusEvent) => trace.push((event.target as HTMLElement).id);
    document.addEventListener('focusin', record);
    try { child.value = false; await settle(); } finally { document.removeEventListener('focusin', record); }
    expect(document.activeElement).toBe(find('return-target'));
    expect(trace).toEqual(['return-target']);
  });

  it('F2 batches simultaneous parent/child closes into the outer return decision', async () => {
    const trigger = document.createElement('button'); trigger.id = 'outer-trigger'; document.body.append(trigger); trigger.focus();
    const alternative = document.createElement('button'); alternative.id = 'child-return'; document.body.append(alternative);
    const parent = ref(true); const child = ref(true);
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, { open: parent.value, 'aria-label': 'Parent' }, {
      default: () => h(Dialog, { open: child.value, 'aria-label': 'Child', returnFocus: () => alternative }),
    }) }), { attachTo: document.body }));
    await settle();
    const trace: string[] = []; const record = (event: FocusEvent) => trace.push((event.target as HTMLElement).id);
    document.addEventListener('focusin', record);
    try { child.value = false; parent.value = false; await settle(); } finally { document.removeEventListener('focusin', record); }
    expect(document.activeElement).toBe(trigger); expect(trace).toEqual(['outer-trigger']);
  });

  it('F2 lets a newly opened sibling modal take focus without visiting the old return target', async () => {
    const first = ref(true); const second = ref(false);
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent' }, {
      default: () => [h('button', { id: 'old-return' }, 'Old return'),
        h(Dialog, { open: first.value, 'aria-label': 'First', returnFocus: () => find('old-return') }),
        h(Dialog, { open: second.value, 'aria-label': 'Second', initialFocus: () => find('new-initial') }, {
          default: () => h('input', { id: 'new-initial' }),
        })],
    }) }), { attachTo: document.body }));
    await settle();
    const trace: string[] = []; const record = (event: FocusEvent) => trace.push((event.target as HTMLElement).id);
    document.addEventListener('focusin', record);
    try { first.value = false; second.value = true; await settle(); } finally { document.removeEventListener('focusin', record); }
    expect(document.activeElement).toBe(find('new-initial')); expect(trace).toEqual(['new-initial']);
  });

  it.each(['explicit', 'invoker', 'background'] as const)('F3 validates the full active modal boundary for %s restoration', async kind => {
    const portalHost = host(); const second = ref(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const background = document.createElement('button'); background.id = 'background'; document.body.append(background);
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent' }, {
      default: () => [
        h(Dialog, { open: true, modal: false, portal: true, getContainer: () => portalHost, 'aria-label': 'First' }, {
          default: () => h('button', { id: 'portal-return' }, 'Open second'),
        }),
        h(Dialog, { open: second.value, modal: false, portal: true, getContainer: () => portalHost, 'aria-label': 'Second',
          ...(kind === 'invoker' ? {} : { returnFocus: () => find(kind === 'explicit' ? 'portal-return' : 'background') }) }),
      ],
    }) }), { attachTo: document.body }));
    await settle(); const target = find('portal-return');
    expect(target.closest('[inert]')).toBeNull(); target.focus();
    second.value = true; await settle(); second.value = false; await settle();
    expect(document.activeElement).toBe(target);
    expect(background.hasAttribute('inert')).toBe(true);
    expect(warn.mock.calls.some(([message]) => String(message).includes('Invalid returnFocus'))).toBe(kind === 'background');
  });

  for (const modal of [false, true]) {
    it.each(['inline-to-portal', 'invalid-to-valid', 'portal-to-inline', 'host-to-host'] as const)(`F4 preserves node focus for modal=${modal} %s`, async move => {
      const first = host(); const second = host();
      const portal = ref(move !== 'inline-to-portal'); const destination = ref(move === 'invalid-to-valid' ? null : first);
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const initialFocus = vi.fn(() => find('moving-input'));
      wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, {
        open: true, modal, portal: portal.value, getContainer: () => destination.value, initialFocus, 'aria-label': 'Moving',
      }, { default: () => h('input', { id: 'moving-input' }) }) }), { attachTo: document.body }));
      await settle(); const input = find('moving-input'); input.focus();
      if (move === 'portal-to-inline') portal.value = false;
      else if (move === 'host-to-host') destination.value = second;
      else { destination.value = first; portal.value = true; }
      await settle();
      expect(document.activeElement).toBe(input);
      expect(find('moving-input')).toBe(input);
      expect((move === 'host-to-host' ? second : first).contains(input)).toBe(move !== 'portal-to-inline');
      expect(initialFocus).toHaveBeenCalledTimes(1);
    });
  }

  it('F4 does not take focus from an external control during nonmodal relocation', async () => {
    const portalHost = host(); const external = document.createElement('input'); document.body.append(external);
    const portal = ref(false);
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, {
      open: true, modal: false, portal: portal.value, getContainer: () => portalHost, 'aria-label': 'Moving',
    }, { default: () => h('input', { id: 'moving-input' }) }) }), { attachTo: document.body }));
    await settle(); external.focus(); portal.value = true; await settle();
    expect(document.activeElement).toBe(external);
  });

  it.each(['select', 'combobox', 'none'] as const)('F5 applies nonmodal initialFocus with an initially open %s descendant', async kind => {
    const initialFocus = vi.fn(() => find('initial-input'));
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, {
      open: true, modal: false, initialFocus, 'aria-label': 'Initial',
    }, { default: () => [h('input', { id: 'initial-input' }),
      ...(kind === 'none' ? [] : [h(kind === 'select' ? Select : Combobox, {
        open: true, modelValue: 'a', options: [{ value: 'a', label: 'Alpha' }], 'aria-label': 'Initially open choice',
      })])],
    }) }), { attachTo: document.body }));
    await settle(); expect(document.activeElement).toBe(find('initial-input'));
    expect(initialFocus).toHaveBeenCalledTimes(1);
  });

  it('F5 gives a higher modal initial focus instead of its newly activated nonmodal ancestor', async () => {
    wrappers.push(mount(defineComponent({ setup: () => () => h(Dialog, {
      open: true, modal: false, initialFocus: () => find('parent-input'), 'aria-label': 'Nonmodal parent',
    }, { default: () => [h('input', { id: 'parent-input' }), h(Dialog, {
      open: true, initialFocus: () => find('child-input'), 'aria-label': 'Modal child',
    }, { default: () => h('input', { id: 'child-input' }) })] }) }), { attachTo: document.body }));
    await settle(); expect(document.activeElement).toBe(find('child-input'));
  });
});
