import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import Dialog from '../src/dialog/Dialog.vue';
import Select from '../src/select/Select.vue';
import Combobox from '../src/combobox/Combobox.vue';
import { peekOverlaySession } from '../src/overlay/session';

const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => { await nextTick(); await nextTick(); await nextTick(); await Promise.resolve(); };
function host(id: string) { const node = document.createElement('div'); node.id = id; document.body.append(node); return node; }
function mounted(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body }); wrappers.push(wrapper); return wrapper;
}
function escape() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }

afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount());
  document.body.replaceChildren();
  document.body.removeAttribute('style'); document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
  expect(peekOverlaySession(document)).toBeNull();
});

describe('Task13.7 Dialog composition', () => {
  it('T13.7.1 routes consecutive Escape from a portaled Select to its Dialog', async () => {
    const overlay = host('selection-host'); const closes = vi.fn();
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent', onCloseRequest: closes }, {
      default: () => h(Select, { options, portal: true, getPopupContainer: () => overlay, 'aria-label': 'Pick' }),
    }) }));
    await settle(); document.querySelector<HTMLButtonElement>('[role="combobox"]')!.click(); await settle();
    expect(overlay.querySelector('[role="listbox"]')).not.toBeNull();
    escape(); await settle(); expect(overlay.querySelector('[role="listbox"]')).toBeNull(); expect(closes).not.toHaveBeenCalled();
    escape(); await settle(); expect(closes).toHaveBeenCalledOnce(); expect(closes.mock.calls[0]?.[0].reason).toBe('escape');
  });

  it('T13.7.2 keeps IME cancellation inside Combobox without submitting or closing Dialog', async () => {
    const closes = vi.fn(); const submits = vi.fn((event: Event) => event.preventDefault());
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent', onCloseRequest: closes }, {
      default: () => h('form', { onSubmit: submits }, [h(Combobox, { options, 'aria-label': 'Search' }), h('button', { type: 'submit' }, 'Save')]),
    }) }));
    await settle(); const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    input.click(); await settle();
    input.focus(); input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = 'B'; input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true }));
    await settle(); expect(closes).not.toHaveBeenCalled(); expect(submits).not.toHaveBeenCalled();
    await settle(); expect(document.querySelector('[role="listbox"]')).toBeNull();
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    input.click(); await settle(); expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle(); expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(closes).not.toHaveBeenCalled(); expect(submits).not.toHaveBeenCalled();
  });

  it('T13.7.3 allows precise active descendants across a nonmodal owner into a shared host', async () => {
    const overlay = host('shared-host'); const unrelated = document.createElement('button'); unrelated.textContent = 'Unrelated'; overlay.append(unrelated);
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent' }, {
      default: () => h(Dialog, { open: true, modal: false, portal: true, getContainer: () => overlay, 'aria-label': 'Child' }, {
        default: () => h(Select, { options, open: true, portal: true, getPopupContainer: () => overlay, 'aria-label': 'Pick' }),
      }),
    }) }));
    await settle(); const child = overlay.querySelector<HTMLElement>('[aria-label="Child"]')!;
    const popup = overlay.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(child).not.toBeNull(); expect(popup).not.toBeNull();
    expect(child.closest('[inert]')).toBeNull(); expect(popup.closest('[inert]')).toBeNull();
    expect(unrelated.closest('[inert]')).not.toBeNull();
    const trigger = child.querySelector<HTMLButtonElement>('[role="combobox"]')!; trigger.focus();
    expect(document.activeElement).toBe(trigger);
  });

  it('T13.7.4 applies only the top modal boundary through nonmodal and modal parents', async () => {
    const parentOpen = ref(true); const childOpen = ref(false);
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: parentOpen.value, modal: false, 'aria-label': 'Nonmodal parent' }, {
      default: () => [h('button', { id: 'child-invoker', onClick: () => { childOpen.value = true; } }, 'Open child'),
        h(Dialog, { open: childOpen.value, 'aria-label': 'Modal child', 'onUpdate:open': () => { childOpen.value = false; } }, { default: () => h('button', { id: 'child-action' }, 'Action') })],
    }) }));
    await settle(); expect(document.body.style.overflow).toBe('');
    document.querySelector<HTMLButtonElement>('#child-invoker')!.focus();
    document.querySelector<HTMLButtonElement>('#child-invoker')!.click(); await settle();
    expect(document.body.style.overflow).toBe('hidden'); expect(document.activeElement?.closest('[aria-label="Modal child"]')).not.toBeNull();
    childOpen.value = false; await settle(); expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(document.querySelector('#child-invoker'));
  });

  it('T13.7.4 pauses a modal parent while its portaled modal child is top, then returns to the parent', async () => {
    const overlay = host('nested-host'); const childOpen = ref(false);
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Modal parent' }, {
      default: () => [h('button', { id: 'nested-invoker', onClick: () => { childOpen.value = true; } }, 'Open child'),
        h(Dialog, { open: childOpen.value, portal: true, getContainer: () => overlay, 'aria-label': 'Modal child' })],
    }) }));
    await settle(); const invoker = document.querySelector<HTMLButtonElement>('#nested-invoker')!;
    invoker.focus(); invoker.click(); await settle();
    const parent = document.querySelector<HTMLElement>('[aria-label="Modal parent"]')!;
    const child = overlay.querySelector<HTMLElement>('[aria-label="Modal child"]')!;
    expect(child.closest('[inert]')).toBeNull(); expect(parent.closest('[inert]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    childOpen.value = false; await settle();
    expect(document.activeElement).toBe(invoker); expect(parent.closest('[inert]')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('T13.7.5 migrates and removes a late popup without replacing its layer or stealing input focus', async () => {
    const first = host('first-host'); const second = host('second-host'); const current = ref(first);
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Parent' }, {
      default: () => h(Combobox, { options, portal: true, getPopupContainer: () => current.value, 'aria-label': 'Search' }),
    }) }));
    await settle(); const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    input.click(); await settle(); const popup = first.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(popup).not.toBeNull(); expect(popup.closest('[inert]')).toBeNull();
    const z = popup.style.getPropertyValue('--_zoom-overlay-layer-z'); input.focus();
    current.value = second; await settle();
    expect(second.querySelector('[role="listbox"]')).toBe(popup); expect(popup.style.getPropertyValue('--_zoom-overlay-layer-z')).toBe(z);
    expect(document.activeElement).toBe(input); expect(popup.closest('[inert]')).toBeNull();
    second.remove(); await settle();
    expect(document.querySelector('.zoom-combobox [role="listbox"]')).toBe(popup);
    expect(document.activeElement).toBe(input); expect(popup.closest('[inert]')).toBeNull();
  });

  it('T13.7.6 warns and falls back inline for invalid Dialog targets, then restores inline when host is removed', async () => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outside = host('dialog-host'); const second = host('second-dialog-host');
    const foreignDocument = document.implementation.createHTMLDocument(); const foreign = foreignDocument.createElement('div'); foreignDocument.body.append(foreign);
    const mode = ref<'valid' | 'second' | 'foreign' | 'throw' | 'self' | 'missing'>('missing'); const modal = ref(true);
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, modal: modal.value, portal: true, 'aria-label': 'Portal', getContainer: () => {
      if (mode.value === 'throw') throw Error('host failure');
      if (mode.value === 'self') return document.querySelector<HTMLElement>('[aria-label="Portal"]');
      return mode.value === 'valid' ? outside : mode.value === 'second' ? second : mode.value === 'foreign' ? foreign : null;
    } }, { title: () => 'Portal title' }) }));
    await settle(); const panel = document.querySelector<HTMLElement>('[aria-label="Portal"]')!; const title = panel.querySelector('.zoom-dialog__title')!;
    expect(outside.contains(panel)).toBe(false); expect(warnings).toHaveBeenCalled();
    mode.value = 'throw'; await settle(); expect(outside.contains(panel)).toBe(false);
    mode.value = 'self'; await settle(); expect(outside.contains(panel)).toBe(false);
    mode.value = 'foreign'; await settle(); expect(outside.contains(panel)).toBe(false);
    mode.value = 'valid'; await settle(); expect(outside.contains(panel)).toBe(true);
    const z = panel.closest<HTMLElement>('.zoom-dialog')!.style.getPropertyValue('--_zoom-overlay-layer-z');
    const close = panel.querySelector<HTMLButtonElement>('.zoom-dialog__close')!; close.focus();
    mode.value = 'second'; await settle();
    expect(second.contains(panel)).toBe(true); expect(panel.querySelector('.zoom-dialog__title')).toBe(title);
    expect(document.activeElement).toBe(close);
    modal.value = false; await settle(); const outsideButton = document.createElement('button'); document.body.append(outsideButton); outsideButton.focus();
    mode.value = 'valid'; await settle(); expect(document.activeElement).toBe(outsideButton);
    mode.value = 'second'; await settle(); expect(document.activeElement).toBe(outsideButton);
    second.remove(); await settle(); expect(panel.isConnected).toBe(true);
    expect(second.contains(panel)).toBe(false); expect(panel.closest<HTMLElement>('.zoom-dialog')!.style.getPropertyValue('--_zoom-overlay-layer-z')).toBe(z);
  });

  it('T13.7.7 keeps native internal form owner for footer submit/reset and close never submits', async () => {
    const submits = vi.fn((event: Event) => event.preventDefault()); const closes = vi.fn();
    mounted(defineComponent({ setup: () => () => h(Dialog, { open: true, 'aria-label': 'Form', onCloseRequest: closes }, {
      default: () => h('form', { id: 'compose-form', onSubmit: submits }, [h('input', { name: 'title', value: 'Draft' }), h(Select, { options, modelValue: 'a', name: 'choice' })]),
      footer: () => [h('button', { type: 'submit', form: 'compose-form' }, 'Save'), h('button', { type: 'reset', form: 'compose-form' }, 'Reset')],
    }) }));
    await settle(); const form = document.querySelector<HTMLFormElement>('#compose-form')!;
    expect([...new FormData(form).entries()]).toEqual([['title', 'Draft'], ['choice', 'a']]);
    document.querySelector<HTMLButtonElement>('.zoom-dialog__close')!.click(); await settle(); expect(submits).not.toHaveBeenCalled(); expect(closes).toHaveBeenCalledOnce();
    document.querySelector<HTMLButtonElement>('.zoom-dialog__footer [type="submit"]')!.click(); expect(submits).toHaveBeenCalledOnce();
    expect((document.querySelector('.zoom-dialog__footer [type="reset"]') as HTMLButtonElement).form).toBe(form);
  });
});
