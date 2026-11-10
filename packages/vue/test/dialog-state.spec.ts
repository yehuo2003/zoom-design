import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import Dialog from '../src/dialog/Dialog.vue';
import { peekOverlaySession } from '../src/overlay/session';

const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => { await nextTick(); await nextTick(); };
function dialog(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const wrapper = mount(Dialog, { props: { open: true, 'aria-label': 'Example', ...props }, slots, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}
function pointer(node: Element) { node.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true, cancelable: true })); }
function escape(node: EventTarget = document) { node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })); }
afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  expect(peekOverlaySession(document)).toBeNull();
});

describe('Task13.5 controlled Dialog close requests', () => {
  it('T13.5.1 sends one ordered close-button request from the default and custom buttons', async () => {
    const standard = dialog(); await settle();
    await standard.get('.zoom-dialog__close').trigger('click');
    expect(standard.emitted('update:open')).toEqual([[false]]);
    expect(standard.emitted('close-request')).toEqual([[{ open: false, previousOpen: true, reason: 'close-button' }]]);
    await standard.setProps({ open: false }); await settle();
    const custom = dialog({}, { close: ({ requestClose }: { requestClose: () => void }) => h('button', { type: 'button', onClick: requestClose }, 'Custom close') });
    await settle(); await custom.get('.zoom-dialog__close-slot button').trigger('click');
    expect(custom.emitted('update:open')).toEqual([[false]]);
    expect(custom.emitted('close-request')).toEqual([[{ open: false, previousOpen: true, reason: 'close-button' }]]);
  });

  it('T13.5.2 preserves a rejected controlled dialog and accepts a later independent Escape request', async () => {
    const wrapper = dialog(); await settle();
    const session = peekOverlaySession(document);
    expect((wrapper.get('.zoom-dialog').element as HTMLElement).style.getPropertyValue('--_zoom-overlay-layer-z')).not.toBe('');
    await wrapper.get('.zoom-dialog__close').trigger('click');
    escape();
    expect(wrapper.emitted('close-request')).toEqual([
      [{ open: false, previousOpen: true, reason: 'close-button' }],
      [{ open: false, previousOpen: true, reason: 'escape' }],
    ]);
    expect(wrapper.get('[role="dialog"]').exists()).toBe(true);
    expect(peekOverlaySession(document)).toBe(session);
    expect(session?.leaseCount).toBe(1);
  });

  it('T13.5.3 completes both request events when the parent synchronously changes open', async () => {
    const events: string[] = [];
    const Host = defineComponent({
      setup() {
        const opened = ref(true);
        return () => h(Dialog, {
          open: opened.value, 'aria-label': 'Controlled',
          'onUpdate:open': () => { events.push('update'); opened.value = false; },
          onCloseRequest: () => events.push('request'),
        });
      },
    });
    const wrapper = mount(Host, { attachTo: document.body }); wrappers.push(wrapper); await settle();
    await wrapper.get('.zoom-dialog__close').trigger('click');
    expect(events).toEqual(['update', 'request']);
    await settle(); expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('T13.5.4 clears the layer when the parent directly closes without emitting a request', async () => {
    const wrapper = dialog(); await settle();
    const session = peekOverlaySession(document)!;
    expect(session.leaseCount).toBe(1);
    await wrapper.setProps({ open: false }); await settle();
    expect(wrapper.emitted('update:open')).toBeUndefined();
    expect(wrapper.emitted('close-request')).toBeUndefined();
    expect(session.leaseCount).toBe(0);
    expect(peekOverlaySession(document)).toBeNull();
  });

  it('T13.5.5 requests outside on backdrop pointerdown but not after an inside drag', async () => {
    const wrapper = dialog(); await settle();
    const panel = wrapper.get('.zoom-dialog__panel').element;
    const backdrop = wrapper.get('.zoom-dialog__backdrop').element;
    pointer(panel);
    backdrop.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, composed: true }));
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(wrapper.emitted('close-request')).toBeUndefined();
    pointer(backdrop);
    expect(wrapper.emitted('close-request')).toEqual([[{ open: false, previousOpen: true, reason: 'outside' }]]);
  });

  it.each([
    { modal: true, closeOnOutside: true, prevented: true, requests: 1 },
    { modal: true, closeOnOutside: false, prevented: true, requests: 0 },
    { modal: false, closeOnOutside: true, prevented: false, requests: 1 },
  ])('T14.3 modal outside pointer default is prevented=$prevented with modal=$modal closeOnOutside=$closeOnOutside', async ({ modal, closeOnOutside, prevented, requests }) => {
    const wrapper = dialog({ modal, closeOnOutside }); await settle();
    const target = modal ? wrapper.get('.zoom-dialog__backdrop').element : document.body;
    const event = new MouseEvent('pointerdown', { bubbles: true, composed: true, cancelable: true });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(prevented);
    expect(wrapper.emitted('close-request')?.length ?? 0).toBe(requests);
  });

  it('T13.5.6 keeps a disabled top route above its lower layer and reads switches without reordering', async () => {
    const lower = dialog({ 'aria-label': 'Lower' }); await settle();
    const top = dialog({ 'aria-label': 'Top', closeOnEscape: false, closeOnOutside: false }); await settle();
    const zIndex = top.get('.zoom-dialog').element.getAttribute('style');
    escape(); pointer(document.body);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(top.emitted('close-request')).toBeUndefined();
    expect(lower.emitted('close-request')).toBeUndefined();
    await top.setProps({ closeOnEscape: true }); await settle();
    expect(top.get('.zoom-dialog').element.getAttribute('style')).toBe(zIndex);
    escape();
    expect(top.emitted('close-request')).toEqual([[{ open: false, previousOpen: true, reason: 'escape' }]]);
    expect(lower.emitted('close-request')).toBeUndefined();
  });

  it('T13.5.7 ignores IME Escape and resumes after composition ends or its target disconnects', async () => {
    const wrapper = dialog({}, { default: () => h('input', { 'aria-label': 'Editor' }) }); await settle();
    const editor = wrapper.get('input').element;
    editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
    escape(editor);
    expect(wrapper.emitted('close-request')).toBeUndefined();
    editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true }));
    escape(editor);
    expect(wrapper.emitted('close-request')).toEqual([[{ open: false, previousOpen: true, reason: 'escape' }]]);
    editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
    editor.remove();
    escape(wrapper.get('.zoom-dialog__panel').element);
    expect(wrapper.emitted('close-request')).toHaveLength(2);
  });

  it('T13.5.8 does not close the newly opened layer with its opening pointer event or reuse a closed callback', async () => {
    const Host = defineComponent({
      setup() {
        const opened = ref(false);
        return () => h('div', [
          h('button', { onPointerdown: () => { opened.value = true; } }, 'Open'),
          h(Dialog, { open: opened.value, 'aria-label': 'New' }),
        ]);
      },
    });
    const host = mount(Host, { attachTo: document.body }); wrappers.push(host);
    pointer(host.get('button').element); await settle();
    expect(host.get('[role="dialog"]').exists()).toBe(true);

    let savedClose: (() => void) | undefined;
    const wrapper = dialog({}, { close: ({ requestClose }: { requestClose: () => void }) => {
      savedClose = requestClose;
      return h('button', { type: 'button', onClick: [requestClose, requestClose] }, 'Close twice');
    } });
    await settle(); await wrapper.get('.zoom-dialog__close-slot button').trigger('click');
    expect(wrapper.emitted('close-request')).toHaveLength(1);
    await wrapper.setProps({ open: false }); await settle();
    savedClose?.();
    expect(wrapper.emitted('close-request')).toHaveLength(1);
    const requests = wrapper.emitted('close-request')!;
    wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1);
    savedClose?.();
    expect(requests).toHaveLength(1);
  });
});
