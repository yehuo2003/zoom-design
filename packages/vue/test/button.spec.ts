import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref, withModifiers } from 'vue';

const wrappers: VueWrapper[] = [];
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); });
async function button(options: Record<string, unknown> = {}) {
  const { default: Button } = await import('../src/button/Button.vue');
  const wrapper = mount(Button, options); wrappers.push(wrapper); return wrapper;
}

describe('ZButton native contract', () => {
  it('T7.1 renders one native button with safe defaults and no invented name/value', async () => {
    const wrapper = await button({ slots: { default: 'Save' } });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes()).toMatchObject({ type: 'button', 'data-zoom-variant': 'solid', 'data-zoom-size': 'md' });
    expect(wrapper.classes()).toContain('zoom-button');
    for (const key of ['disabled', 'aria-disabled', 'aria-busy', 'name', 'value']) expect(wrapper.attributes(key)).toBeUndefined();
    expect(wrapper.text()).toBe('Save');
  });
  it('T7.2 normalizes bad enums and nulls, including a submit-dangerous native type', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = await button({ props: { type: 'nonsense', size: {}, variant: null } });
    expect(wrapper.attributes()).toMatchObject({ type: 'button', 'data-zoom-variant': 'solid', 'data-zoom-size': 'md' });
    await wrapper.setProps({ type: 'reset', variant: 'text', size: 'lg' });
    expect(wrapper.attributes()).toMatchObject({ type: 'reset', 'data-zoom-variant': 'text', 'data-zoom-size': 'lg' });
    await wrapper.setProps({ type: null }); expect(wrapper.attributes('type')).toBe('button');
  });
  it('T7.3 honors Vue bare Boolean casting and guards invalid values', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = await button({ props: { disabled: '', block: '' } });
    expect((wrapper.element as HTMLButtonElement).disabled).toBe(true); expect(wrapper.attributes('data-zoom-block')).toBe('true');
    await wrapper.setProps({ disabled: 'false', block: {}, loading: null });
    expect((wrapper.element as HTMLButtonElement).disabled).toBe(true); expect(wrapper.attributes('data-zoom-block')).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    await wrapper.setProps({ disabled: false, loading: false }); expect((wrapper.element as HTMLButtonElement).disabled).toBe(false);
  });
  it('T7.6 emits exactly the same MouseEvent once and never manages loading', async () => {
    const onClick = vi.fn(); const wrapper = await button({ attrs: { onClick }, slots: { default: 'Run' } });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    wrapper.element.dispatchEvent(event);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(event); expect(wrapper.emitted('click')).toEqual([[event]]);
    expect(wrapper.attributes('aria-busy')).toBeUndefined();
  });
  it('T7.8–10 guards disabled/loading synthetic dispatch and updates them independently', async () => {
    const wrapper = await button({ props: { disabled: true, loading: true }, slots: { default: 'Save' } });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    wrapper.element.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); expect(wrapper.emitted('click')).toBeUndefined();
    expect(wrapper.attributes('aria-busy')).toBe('true'); expect(wrapper.text()).toBe('Save');
    expect(wrapper.find('.zoom-button__spinner').exists()).toBe(true);
    await wrapper.setProps({ loading: false }); expect(wrapper.attributes('disabled')).toBeDefined(); expect(wrapper.attributes('aria-busy')).toBeUndefined();
    await wrapper.setProps({ disabled: false }); wrapper.element.dispatchEvent(new MouseEvent('click')); expect(wrapper.emitted('click')).toHaveLength(1);
  });
  it('T7.10 disabled fieldsets suppress business emits and bubbling, including synthetic events', async () => {
    const fieldset = document.createElement('fieldset'); fieldset.disabled = true; document.body.append(fieldset);
    const capture = vi.fn(); const bubble = vi.fn(); fieldset.addEventListener('click', capture, true); fieldset.addEventListener('click', bubble);
    const wrapper = await button({ attachTo: fieldset });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true }); wrapper.element.dispatchEvent(event);
    expect(capture).toHaveBeenCalledTimes(1); expect(bubble).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(true); expect(wrapper.emitted('click')).toBeUndefined();
    fieldset.disabled = false; wrapper.element.dispatchEvent(new MouseEvent('click')); expect(wrapper.emitted('click')).toHaveLength(1);
  });
  it('T7.11 preserves once, prevent and stop without duplicating component listeners', async () => {
    const once = vi.fn(); const wrapper = await button({ attrs: { onClickOnce: once } });
    wrapper.element.dispatchEvent(new MouseEvent('click')); wrapper.element.dispatchEvent(new MouseEvent('click')); expect(once).toHaveBeenCalledTimes(1);
    const prevent = vi.fn(); await wrapper.setProps({ onClick: withModifiers(prevent, ['prevent', 'stop']) });
    const parent = document.createElement('div'); parent.append(wrapper.element); const bubble = vi.fn(); parent.addEventListener('click', bubble);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true }); wrapper.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); expect(bubble).not.toHaveBeenCalled(); expect(prevent).toHaveBeenCalledExactlyOnceWith(event);
  });
  it('T7.12–13 reads latest attrs/listeners on every render and protects owned state', async () => {
    const { default: Button } = await import('../src/button/Button.vue'); const version = ref(0); const old = vi.fn(); const current = vi.fn(); const capture = vi.fn();
    const wrapper = mount({ setup: () => () => h(Button, { class: `user-${version.value}`, style: { color: version.value ? 'red' : 'blue' }, id: `id-${version.value}`, 'aria-label': `name-${version.value}`, 'aria-busy': 'false', 'aria-disabled': 'false', 'data-zoom-size': 'hacked', 'data-custom': version.value, name: '', value: 0, loading: version.value === 0, onClick: version.value ? current : old, onClickCapture: capture }) }); wrappers.push(wrapper);
    expect(wrapper.attributes('aria-busy')).toBe('true'); expect(wrapper.attributes('data-zoom-size')).toBe('md');
    version.value++; await nextTick();
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['zoom-button', 'user-1']));
    expect(wrapper.attributes()).toMatchObject({ id: 'id-1', 'aria-label': 'name-1', 'data-custom': '1', name: '', value: '0' });
    expect((wrapper.element as HTMLElement).style.color).toBe('red');
    expect(wrapper.attributes('aria-disabled')).toBeUndefined(); expect(wrapper.attributes('aria-busy')).toBeUndefined();
    wrapper.element.dispatchEvent(new MouseEvent('click')); expect(current).toHaveBeenCalledTimes(1); expect(old).not.toHaveBeenCalled(); expect(capture).toHaveBeenCalledTimes(1);
  });
  it('T7.20 exposes only safe native focus/blur, including after unmount', async () => {
    const wrapper = await button({ attachTo: document.body }); const exposed = wrapper.vm as unknown as { focus(options?: FocusOptions): void; blur(): void };
    exposed.focus({ preventScroll: true }); expect(document.activeElement).toBe(wrapper.element);
    exposed.blur(); expect(document.activeElement).not.toBe(wrapper.element);
    wrapper.unmount(); wrappers.pop(); expect(() => { exposed.focus(); exposed.blur(); }).not.toThrow();
  });
  it('T7.13 rejects dynamic case-insensitive native attribute collisions', async () => {
    const { default: Button } = await import('../src/button/Button.vue');
    const extras = ref<Record<string, unknown>>({ TYPE: 'button', DISABLED: '', 'ARIA-BUSY': 'true', 'ARIA-DISABLED': 'true', 'DATA-ZOOM-SIZE': 'md' });
    const wrapper = mount({ setup: () => () => h(Button, { disabled: true, loading: true, ...extras.value }) }); wrappers.push(wrapper);
    extras.value = { TYPE: 'submit', DISABLED: null, 'ARIA-BUSY': 'false', 'ARIA-DISABLED': 'false', 'DATA-ZOOM-SIZE': 'hacked' }; await nextTick();
    expect((wrapper.element as HTMLButtonElement).type).toBe('button');
    expect((wrapper.element as HTMLButtonElement).disabled).toBe(true);
    expect(wrapper.attributes('aria-busy')).toBe('true'); expect(wrapper.attributes('aria-disabled')).toBe('true'); expect(wrapper.attributes('data-zoom-size')).toBe('md');
  });
  it('T7.14 dynamic uppercase TYPE cannot turn a default action into a submitter', async () => {
    const { default: Button } = await import('../src/button/Button.vue'); const type = ref('button'); const submit = vi.fn();
    const wrapper = mount({ setup: () => () => h('form', { onSubmit: withModifiers(submit, ['prevent']) }, [h(Button, { TYPE: type.value })]) }, { attachTo: document.body }); wrappers.push(wrapper);
    const native = wrapper.find('button').element as HTMLButtonElement;
    type.value = 'submit'; await nextTick(); native.click(); expect(submit).not.toHaveBeenCalled(); expect(native.type).toBe('button');
  });
  it('T7.24–26 keeps decorative slots hidden, custom loading content and instances isolated', async () => {
    const first = await button({ props: { loading: true }, slots: { default: 'First', icon: '★', loading: '…' } });
    const second = await button({ slots: { default: 'Second' } });
    expect(first.find('.zoom-button__loading').attributes('aria-hidden')).toBe('true');
    expect(first.find('.zoom-button__spinner').exists()).toBe(false); expect(first.text()).toContain('First');
    await first.setProps({ loading: false }); expect(first.find('.zoom-button__icon').attributes('aria-hidden')).toBe('true');
    expect(second.attributes('disabled')).toBeUndefined(); second.element.dispatchEvent(new MouseEvent('click')); expect(second.emitted('click')).toHaveLength(1);
  });
});
