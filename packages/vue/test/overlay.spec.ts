import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createSSRApp, defineComponent, h, nextTick, onMounted, shallowRef, watch } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Select from '../src/select/Select.vue';
import Combobox from '../src/combobox/Combobox.vue';
import { useOverlayOwner, type OverlayOwner } from '../src/overlay/owner';
import { peekOverlaySession } from '../src/overlay/session';

const wrappers: ReturnType<typeof mount>[] = [];
const owners = new Map<string, OverlayOwner>();
const mounted: string[] = [];
const dismisses: string[] = [];
const errors: unknown[] = [];

const Probe = defineComponent({
  props: { name: { type: String, required: true }, open: Boolean, modal: Boolean },
  setup(props, { slots }) {
    const owner = useOverlayOwner(); owners.set(props.name, owner);
    const element = shallowRef<HTMLElement | null>(null);
    onMounted(() => mounted.push(props.name));
    watch([() => props.open, () => props.modal, element], () => {
      if (!props.open || !element.value) { owner.clear(); return; }
      const node = element.value;
      owner.setDemand({ document: node.ownerDocument, nodes: [node], visual: node,
        onDismiss: reason => dismisses.push(`${props.name}:${reason}`),
        onError: error => errors.push(error),
        ...(props.modal ? { modal: { scope: node } } : {}),
      });
    }, { immediate: true, flush: 'post' });
    return () => h('section', { ref: element, 'data-probe': props.name, tabindex: -1 }, slots.default?.());
  },
});

const settle = async () => { await nextTick(); await nextTick(); await Promise.resolve(); };
function probe(name: string, open = true, modal = false, children?: () => unknown) {
  const wrapper = mount(Probe, { props: { name, open, modal }, slots: children ? { default: children } : {}, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount());
  owners.clear(); mounted.length = 0; dismisses.length = 0; errors.length = 0;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  expect(peekOverlaySession(document)).toBeNull();
});

describe('Task13.4 private Vue overlay session', () => {
  it('T13.4.1 waits for the parent when a nested child mounts first', async () => {
    probe('parent', true, false, () => h(Probe, { name: 'child', open: true }));
    await settle();
    expect(mounted).toEqual(['child', 'parent']);
    expect(owners.get('parent')?.active).toBe(true);
    expect(owners.get('child')?.active).toBe(true);
    expect(owners.get('child')?.parent).toBe(owners.get('parent'));
    expect(owners.get('child')!.zIndex).toBeGreaterThan(owners.get('parent')!.zIndex);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismisses).toEqual(['child:escape']);
  });

  it('T13.4.2 shares one Document context across apps and leaves an independent nonmodal root pending behind a modal', async () => {
    probe('existing', true, false); await settle();
    const existingLayer = owners.get('existing')!.layer;
    probe('modal-a', true, true); await settle();
    const session = peekOverlaySession(document)!;
    expect(owners.get('existing')!.layer).toBe(existingLayer);
    expect(owners.get('existing')!.active).toBe(true);
    probe('outside', true, false); await settle();
    expect(peekOverlaySession(document)).toBe(session);
    expect(owners.get('outside')?.active).toBe(false);
    expect(owners.get('outside')?.pending).toBe(true);
    probe('modal-b', true, true); await settle();
    expect(owners.get('modal-b')?.active).toBe(true);
    expect(session.leaseCount).toBe(4);
    expect(errors).toEqual([]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismisses).toEqual(['modal-b:escape']);
    owners.get('modal-b')!.clear(); await settle();
    expect(owners.get('outside')?.pending).toBe(true);
    owners.get('modal-a')!.clear(); await settle();
    expect(owners.get('outside')?.active).toBe(true);
    expect(owners.get('existing')!.layer).toBe(existingLayer);
  });

  it('T13.4.3 removes leases, listeners, observer and Document property after the last close', async () => {
    const first = probe('first'); const second = probe('second'); await settle();
    const session = peekOverlaySession(document)!;
    expect(session.leaseCount).toBe(2);
    await first.setProps({ open: false }); await settle();
    expect(session.leaseCount).toBe(1);
    await second.setProps({ open: false }); await settle();
    expect(session.leaseCount).toBe(0);
    expect(session.observerActive).toBe(false);
    expect(peekOverlaySession(document)).toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismisses).toEqual([]);

    const last = probe('unmount'); await settle();
    const finalSession = peekOverlaySession(document)!;
    last.unmount(); wrappers.splice(wrappers.indexOf(last), 1);
    await settle();
    expect(finalSession.leaseCount).toBe(0);
    expect(finalSession.observerActive).toBe(false);
    expect(peekOverlaySession(document)).toBeNull();
  });

  it('T13.4.4 does not allocate a browser session during independent SSR requests', async () => {
    const htmlA = await renderToString(createSSRApp({ render: () => h(Probe, { name: 'ssr-a', open: true }) }));
    const htmlB = await renderToString(createSSRApp({ render: () => h(Probe, { name: 'ssr-b', open: false }) }));
    expect(htmlA).toContain('ssr-a'); expect(htmlB).toContain('ssr-b');
    expect(peekOverlaySession(document)).toBeNull();
  });

  it('T13.4.5 keeps an active owner, parent and layer order stable on node and callback updates', async () => {
    probe('first'); probe('second'); await settle();
    const first = owners.get('first')!; const layer = first.layer;
    const replacement = document.createElement('button'); document.body.append(replacement);
    first.setDemand({ document, nodes: [replacement], visual: replacement, onDismiss: reason => dismisses.push(`updated:${reason}`) });
    await settle();
    expect(first.layer).toBe(layer);
    expect(owners.get('second')!.zIndex).toBeGreaterThan(first.zIndex);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismisses).toEqual(['second:escape']);
    owners.get('second')!.clear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismisses).toEqual(['second:escape', 'updated:escape']);
  });

  it('T13.4.6 keeps standalone Select/Combobox value, query and form behavior on the shared session', async () => {
    const select = mount(Select, { props: { modelValue: null, name: 'selected', options: [{ value: 0, label: 'Zero' }] }, attachTo: document.body }); wrappers.push(select);
    const combo = mount(Combobox, { props: { modelValue: null, name: 'searched', options: [{ value: 1, label: 'One' }] }, attachTo: document.body }); wrappers.push(combo);
    await select.get('[role="combobox"]').trigger('click'); await combo.get('input[role="combobox"]').setValue('O'); await settle();
    const session = peekOverlaySession(document)!;
    expect(session.leaseCount).toBe(2);
    expect(combo.emitted('query-change')?.at(-1)?.[0]).toMatchObject({ query: 'O', reason: 'input' });
    await select.get('[role="option"]').trigger('click'); await settle();
    expect(select.emitted('change')?.at(-1)?.[0]).toMatchObject({ value: 0, reason: 'option' });
    expect((select.get('input[type="hidden"]').element as HTMLInputElement).name).toBe('selected');
    expect((combo.get('input[type="hidden"]').element as HTMLInputElement).name).toBe('searched');
  });

  it('T13.4.7 deactivates descendants first and reopens a still requested child behind its parent', async () => {
    const parent = probe('parent', true, true, () => h(Probe, { name: 'child', open: true })); await settle();
    const child = owners.get('child')!;
    expect(child.active).toBe(true);
    await parent.setProps({ open: false }); await settle();
    expect(owners.get('parent')?.active).toBe(false);
    expect(child.active).toBe(false); expect(child.pending).toBe(true);
    await parent.setProps({ open: true }); await settle();
    expect(owners.get('parent')?.active).toBe(true); expect(child.active).toBe(true);
    expect(child.zIndex).toBeGreaterThan(owners.get('parent')!.zIndex);
  });

  it('T13.4.8 assigns internal layer order and keeps public z-index overrides ahead of it', async () => {
    probe('one'); probe('two'); await settle();
    const one = document.querySelector<HTMLElement>('[data-probe="one"]')!;
    const two = document.querySelector<HTMLElement>('[data-probe="two"]')!;
    expect(Number(two.style.getPropertyValue('--_zoom-overlay-layer-z'))).toBeGreaterThan(Number(one.style.getPropertyValue('--_zoom-overlay-layer-z')));
    one.style.setProperty('--zoom-dialog-z-index', '7000');
    expect(one.style.getPropertyValue('--zoom-dialog-z-index')).toBe('7000');
    const selectionCss = readFileSync(resolve('design/styles/components/_selection.scss'), 'utf8');
    expect(selectionCss).toContain('var(--zoom-#{$component}-z-index, var(--_zoom-overlay-layer-z, 1000))');
    expect(readFileSync(resolve('packages/vue/src/dialog/style.scss'), 'utf8')).toContain('var(--zoom-dialog-z-index, var(--_zoom-overlay-layer-z, 1000))');
    expect(Object.keys(JSON.parse(readFileSync(resolve('packages/vue/package.json'), 'utf8')).exports)).not.toContain('./overlay');
  });
});
