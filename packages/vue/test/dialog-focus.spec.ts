import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import Dialog from '../src/dialog/Dialog.vue';
import { peekOverlaySession } from '../src/overlay/session';

const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => { await nextTick(); await nextTick(); await Promise.resolve(); };
function dialog(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const wrapper = mount(Dialog, { props: { 'aria-label': 'Dialog', ...props }, slots, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}
function button(name: string) { return document.querySelector<HTMLButtonElement>(`[data-button="${name}"]`)!; }
function opener() {
  const node = document.createElement('button'); node.textContent = 'Open'; document.body.append(node); node.focus(); return node;
}
function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  document.dispatchEvent(event); return event;
}
afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount());
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
  expect(peekOverlaySession(document)).toBeNull();
});

describe('Task13.6 Dialog focus and modal lifecycle', () => {
  it('T13.6.1 resolves valid initialFocus once; invalid, thrown and detached targets fall back to first tabbable or panel', async () => {
    opener();
    const target = document.createElement('button'); target.dataset.button = 'target';
    const initialFocus = vi.fn(() => target);
    const valid = dialog({ open: true, initialFocus }, { default: () => h('div', { ref: (node: unknown) => { if (node instanceof HTMLElement && !node.contains(target)) node.append(target); } }) });
    await settle(); expect(document.activeElement).toBe(target); expect(initialFocus).toHaveBeenCalledTimes(1);
    await valid.setProps({ modal: false }); await valid.setProps({ modal: true }); await settle();
    expect(initialFocus).toHaveBeenCalledTimes(1);
    await valid.setProps({ open: false }); await settle();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outside = document.createElement('button'); document.body.append(outside);
    const invalid = dialog({ open: true, initialFocus: () => outside }, { default: () => h('button', { 'data-button': 'fallback' }, 'Fallback'), close: () => h('span') });
    await settle(); expect(document.activeElement).toBe(button('fallback'));
    expect(warn.mock.calls.some(([message]) => String(message).includes('initialFocus'))).toBe(true);
    await invalid.setProps({ open: false }); await settle();

    const thrown = dialog({ open: true, initialFocus: () => { throw Error('app error'); } }, { close: () => h('span') });
    await settle(); expect(document.activeElement).toBe(thrown.get('[role="dialog"]').element);
    await thrown.setProps({ open: false }); await settle();
    const detached = document.createElement('button');
    const gone = dialog({ open: true, initialFocus: () => detached }, { close: () => h('span') });
    await settle(); expect(document.activeElement).toBe(gone.get('[role="dialog"]').element);
    expect(warn.mock.calls.filter(([message]) => String(message).includes('initialFocus')).length).toBeGreaterThanOrEqual(3);
    gone.vm.focus(); expect(gone.emitted('update:open')).toBeUndefined();
  });

  it('T13.6.2 wraps Tab and Shift+Tab, handles empty or disabled content, and includes an open shadow root', async () => {
    const enabled = ref(true);
    const wrapper = mount(defineComponent({ setup() { return () => h(Dialog, { open: true, 'aria-label': 'Focus' }, {
      close: () => h('span'), default: () => [h('button', { 'data-button': 'first' }, 'First'), h('button', { 'data-button': 'last', disabled: !enabled.value }, 'Last'), h('div', { id: 'shadow-host' })],
    }); } }), { attachTo: document.body }); wrappers.push(wrapper);
    await settle(); expect(document.activeElement).toBe(button('first'));
    expect(tab(true).defaultPrevented).toBe(true); expect(document.activeElement).toBe(button('last'));
    expect(tab().defaultPrevented).toBe(true); expect(document.activeElement).toBe(button('first'));
    enabled.value = false; await settle();
    expect(tab().defaultPrevented).toBe(true); expect(document.activeElement).toBe(button('first'));
    button('first').remove(); await settle();
    expect(tab().defaultPrevented).toBe(true); expect(document.activeElement?.getAttribute('role')).toBe('dialog');
    const shadow = document.querySelector<HTMLElement>('#shadow-host')!.attachShadow({ mode: 'open' });
    const deep = document.createElement('button'); deep.textContent = 'Shadow'; shadow.append(deep); await settle();
    deep.focus(); expect(shadow.activeElement).toBe(deep);
    expect(tab().defaultPrevented).toBe(true); expect(shadow.activeElement).toBe(deep);
  });

  it('T13.6.3 preserves preexisting background attributes and exact inline lock styles', async () => {
    const background = document.createElement('aside'); background.setAttribute('inert', 'original'); background.setAttribute('aria-hidden', 'false'); document.body.append(background);
    document.body.style.setProperty('overflow', 'scroll', 'important'); document.body.style.paddingInlineEnd = '7px';
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    const bodyBefore = document.body.getAttribute('style'); const htmlBefore = document.documentElement.getAttribute('style');
    const wrapper = dialog({ open: true }); await settle();
    expect(background.getAttribute('aria-hidden')).toBe('true'); expect(background.getAttribute('inert')).toBe('');
    expect(document.body.style.overflow).toBe('hidden'); expect(document.documentElement.style.overflow).toBe('hidden');
    await wrapper.setProps({ open: false }); await settle();
    expect(background.getAttribute('aria-hidden')).toBe('false'); expect(background.getAttribute('inert')).toBe('original');
    expect(document.body.getAttribute('style')).toBe(bodyBefore); expect(document.documentElement.getAttribute('style')).toBe(htmlBefore);
  });

  it('T13.6.4 keeps trap, lock, isolation, content and focus when a close request is rejected', async () => {
    const background = opener(); const wrapper = dialog({ open: true }, { default: 'Unsaved' }); await settle();
    const panel = wrapper.get('[role="dialog"]').element;
    const focused = document.activeElement;
    await wrapper.get('.zoom-dialog__close').trigger('click'); await settle();
    expect(wrapper.emitted('update:open')).toHaveLength(1);
    expect(wrapper.get('[role="dialog"]').element).toBe(panel); expect(wrapper.text()).toContain('Unsaved');
    expect(document.activeElement).toBe(focused); expect(document.body.style.overflow).toBe('hidden'); expect(background.hasAttribute('inert')).toBe(true);
    background.focus(); expect(document.activeElement).toBe(focused);
  });

  it('T13.6.5 restores child then parent once, and closing a lower independent dialog does not steal top focus', async () => {
    const outside = opener(); const parentOpen = ref(true); const childOpen = ref(false);
    const host = mount(defineComponent({ setup() { return () => h(Dialog, { open: parentOpen.value, 'aria-label': 'Parent' }, {
      default: () => [h('button', { 'data-button': 'parent-invoker' }, 'Child'), h(Dialog, { open: childOpen.value, 'aria-label': 'Child' }, { default: () => h('button', { 'data-button': 'child' }, 'Inside') })],
    }); } }), { attachTo: document.body }); wrappers.push(host);
    await settle(); button('parent-invoker').focus(); childOpen.value = true; await settle();
    expect(document.activeElement?.closest('[aria-label="Child"]')).not.toBeNull();
    childOpen.value = false; await settle(); expect(document.activeElement).toBe(button('parent-invoker'));
    expect(document.body.style.overflow).toBe('hidden');
    childOpen.value = true; await settle();
    const outsideFocus = vi.spyOn(outside, 'focus');
    childOpen.value = false; parentOpen.value = false; await settle();
    expect(outsideFocus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(outside);
    expect(document.body.style.overflow).toBe('');
    const lower = dialog({ open: true }); const upper = dialog({ open: true }); await settle();
    const topFocus = document.activeElement; await lower.setProps({ open: false }); await settle();
    expect(document.activeElement).toBe(topFocus); expect(upper.get('[role="dialog"]').element.contains(topFocus)).toBe(true);
  });

  it('T13.6.6 skips explicit return when disabled or all targets vanish while a parent trap still constrains focus', async () => {
    const trigger = opener(); const unusedReturn = vi.fn(() => trigger);
    const wrapper = dialog({ open: true, restoreFocus: false, returnFocus: unusedReturn }); await settle();
    const focusSpy = vi.spyOn(trigger, 'focus'); await wrapper.setProps({ open: false }); await settle();
    expect(focusSpy).not.toHaveBeenCalled(); expect(unusedReturn).not.toHaveBeenCalled();
    trigger.focus(); const disconnected = document.createElement('button');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const missing = dialog({ open: true, returnFocus: () => disconnected }); await settle(); trigger.remove();
    const bodyFocus = vi.spyOn(document.body, 'focus'); await missing.setProps({ open: false }); await settle();
    expect(bodyFocus).not.toHaveBeenCalled();
    expect(warn.mock.calls.some(([message]) => String(message).includes('returnFocus'))).toBe(true);

    const preferred = document.createElement('button'); document.body.append(preferred);
    const businessReturn = vi.fn(() => preferred);
    const valid = dialog({ open: true, returnFocus: businessReturn }); await settle();
    await valid.setProps({ open: false }); await settle();
    expect(businessReturn).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(preferred);

    const parentOpen = ref(true); const childOpen = ref(true);
    const nested = mount(defineComponent({ setup() { return () => h(Dialog, { open: parentOpen.value, 'aria-label': 'Parent' }, {
      default: () => h(Dialog, { open: childOpen.value, restoreFocus: false, 'aria-label': 'Child' }),
    }); } }), { attachTo: document.body }); wrappers.push(nested); await settle();
    childOpen.value = false; await settle();
    const active = document.activeElement;
    expect(document.querySelector('[aria-label="Parent"]')?.contains(active)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('T13.6.7 toggles modal in place without replacing panel or layer identity or firing close events', async () => {
    const trigger = opener(); const initialFocus = vi.fn(() => null);
    const wrapper = dialog({ open: true, initialFocus }); await settle();
    const panel = wrapper.get('[role="dialog"]').element; const root = wrapper.get('.zoom-dialog').element as HTMLElement;
    const zIndex = root.style.getPropertyValue('--_zoom-overlay-layer-z');
    await wrapper.setProps({ modal: false }); await settle();
    expect(wrapper.get('[role="dialog"]').element).toBe(panel); expect(document.body.style.overflow).toBe('');
    expect(wrapper.find('.zoom-dialog__backdrop').exists()).toBe(false);
    (panel as HTMLElement).focus();
    await wrapper.setProps({ modal: true }); await settle();
    expect(wrapper.get('[role="dialog"]').element).toBe(panel); expect(root.style.getPropertyValue('--_zoom-overlay-layer-z')).toBe(zIndex);
    expect(document.body.style.overflow).toBe('hidden'); expect(initialFocus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(panel);
    expect(wrapper.emitted('close-request')).toBeUndefined();
    await wrapper.setProps({ open: false }); await settle(); expect(document.activeElement).toBe(trigger);
    const nonmodal = dialog({ open: true, modal: false }, { default: () => h('button', { 'data-button': 'nonmodal' }, 'Action'), close: () => h('span') });
    await settle(); expect(document.activeElement).toBe(button('nonmodal'));
    expect(document.body.style.overflow).toBe('');
    await nonmodal.setProps({ open: false }); await settle();

    const lower = dialog({ open: true, modal: false, 'aria-label': 'Lower' });
    const upper = dialog({ open: true, 'aria-label': 'Upper' }); await settle();
    const upperFocus = document.activeElement;
    await lower.setProps({ modal: true }); await settle();
    expect(document.activeElement).toBe(upperFocus);
    expect(upper.get('[role="dialog"]').element.contains(document.activeElement)).toBe(true);
    expect(lower.get('[role="dialog"]').element.closest('[inert]')).not.toBeNull();
    await lower.setProps({ modal: false }); await settle();
    expect(document.activeElement).toBe(upperFocus);
  });

  it('T13.6.8 cancels stale close work across rapid toggles and releases all resources on unmount', async () => {
    const trigger = opener(); const background = document.createElement('aside'); document.body.append(background);
    const wrapper = dialog({ open: true }); await settle();
    const panel = wrapper.get('[role="dialog"]').element;
    const closing = wrapper.setProps({ open: false }); const reopening = wrapper.setProps({ open: true });
    await Promise.all([closing, reopening]); await settle();
    expect(wrapper.get('[role="dialog"]').element).toBe(panel); expect(document.body.style.overflow).toBe('hidden');
    expect(background.hasAttribute('inert')).toBe(true);
    wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1); await settle();
    expect(document.body.style.overflow).toBe(''); expect(background.hasAttribute('inert')).toBe(false);
    expect(peekOverlaySession(document)).toBeNull(); expect(document.activeElement).toBe(trigger);
    expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))).not.toThrow();
  });
});
