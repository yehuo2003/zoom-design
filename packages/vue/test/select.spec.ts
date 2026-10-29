import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createSSRApp, defineComponent, h, reactive } from 'vue';
import { renderToString } from '@vue/server-renderer';
import Select from '../src/select/Select.vue';
const options = [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty' }, { value: '0', label: 'String zero' }, { value: 'disabled', label: 'Disabled', disabled: true }];
const wrappers: ReturnType<typeof mount>[] = [];
function setup(props: Record<string, unknown> = {}) { const wrapper = mount(Select, { props: { options, ...props }, attachTo: document.body }); wrappers.push(wrapper); return wrapper; }
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('T11.1/2 value is controlled and preserves zero/empty/type identity without external-change events', async () => {
  const w = setup({ modelValue: 0, clearable: true, 'aria-label': 'Choice' }); expect(w.get('[role=combobox]').text()).toContain('Zero');
  await w.get('[role=combobox]').trigger('click'); await w.get('[role=option][data-value-type="string"]').trigger('click');
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['']); expect(w.get('[role=combobox]').text()).toContain('Zero');
  await w.setProps({ modelValue: '' }); expect(w.get('[role=combobox]').text()).toContain('Empty'); expect(w.emitted('update:modelValue')).toHaveLength(1);
  await w.setProps({ modelValue: '0' }); expect(w.get('[role=combobox]').text()).toContain('String zero');
});
it('T11.3/4 controlled open rejection retains popup and orders value/details before open request', async () => {
  const order: string[] = []; const w = setup({ modelValue: 0, open: true, 'onUpdate:modelValue': () => order.push('value'), onChange: () => order.push('change'), 'onUpdate:open': () => order.push('open'), onOpenChange: () => order.push('detail') });
  await w.findAll('[role=option]')[1]!.trigger('click'); expect(order).toEqual(['value', 'change', 'open', 'detail']); expect(w.find('[role=listbox]').exists()).toBe(true);
  await w.setProps({ options: [options[2], options[1], options[0]] }); expect(w.get('[role=combobox]').attributes('aria-activedescendant')).toBeTruthy();
});
it('T11.5/6 keyboard navigation changes highlight only, confirms once and Tab stays native', async () => {
  const w = setup(); const trigger = w.get('[role=combobox]'); await trigger.trigger('keydown', { key: 'ArrowDown' }); expect(w.findAll('[role=option][data-zoom-highlighted]').map(n => n.text())).toEqual(['Zero']);
  await trigger.trigger('keydown', { key: 'End' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('String zero'); expect(w.emitted('update:modelValue')).toBeUndefined();
  await trigger.trigger('keydown', { key: 'Enter' }); expect(w.emitted('update:modelValue')?.[0]).toEqual(['0']);
  await trigger.trigger('click'); const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); trigger.element.dispatchEvent(event); await nextTick(); expect(event.defaultPrevented).toBe(false); expect(w.find('[role=listbox]').exists()).toBe(false);
});
it('T11.7 disabled/readonly/loading prevent mutation but readonly/loading remain focusable and selected labels remain', async () => {
  const w = setup({ modelValue: 0, readonly: true }); expect(w.get('[role=combobox]').attributes('disabled')).toBeUndefined(); await w.get('[role=combobox]').trigger('click'); expect(w.find('[role=listbox]').exists()).toBe(false);
  await w.setProps({ readonly: false, loading: true }); expect(w.get('[role=combobox]').attributes('aria-busy')).toBe('true');
  await w.setProps({ loading: false, disabled: true }); expect(w.get('[role=combobox]').attributes('disabled')).toBeDefined(); expect(w.get('[role=combobox]').text()).toContain('Zero');
});
it('T11.8/9 owns critical attrs, roots class/data and exposes focus/blur without nesting clear buttons', async () => {
  const w = setup({ modelValue: 0, clearable: true, class: 'brand', 'data-custom': 'yes', 'aria-label': 'Top name', triggerAttrs: { role: 'link', 'aria-label': 'Ignored', 'aria-expanded': 'wrong', type: 'submit', 'data-zoom-size': 'wrong', title: 'Native title' } });
  expect(w.classes()).toContain('brand'); expect(w.attributes('data-custom')).toBe('yes'); const trigger = w.get('[role=combobox]'); expect(trigger.attributes('aria-label')).toBe('Top name'); expect(trigger.attributes('title')).toBe('Native title'); expect(trigger.attributes('type')).toBe('button'); expect(w.find('button button').exists()).toBe(false);
  (w.vm as unknown as { focus(): void }).focus(); expect(document.activeElement).toBe(trigger.element); (w.vm as unknown as { blur(): void }).blur(); expect(document.activeElement).not.toBe(trigger.element);
});
it('T11.9 pointer opening and option confirmation explicitly keep focus on the visible trigger', async () => {
  const w = setup(); const t = w.get('[role=combobox]'); await t.trigger('click'); expect(document.activeElement).toBe(t.element);
  const outside = document.createElement('button'); document.body.append(outside); outside.focus();
  const other = setup({ open: true }); await other.findAll('[role=option]')[1]!.trigger('click'); expect(document.activeElement).toBe(other.get('[role=combobox]').element);
});
it('T11.10/11 bridges a single successful field and restores proxy after rejected reset', async () => {
  vi.useFakeTimers(); const form = document.createElement('form'); form.id = 'owner'; document.body.append(form);
  const w = setup({ modelValue: '', name: 'choice', form: 'owner', required: true }); expect([...new FormData(form).entries()]).toEqual([['choice', '']]); expect(form.checkValidity()).toBe(true);
  form.reset(); await vi.runAllTimersAsync(); await nextTick(); expect(w.emitted('update:modelValue')?.[0]).toEqual([null]); expect(form.checkValidity()).toBe(true);
  await w.setProps({ modelValue: 'unknown' }); expect([...new FormData(form).entries()]).toEqual([]); expect(form.checkValidity()).toBe(false); expect(document.activeElement).toBe(w.get('[role=combobox]').element);
  vi.useRealTimers();
});
it('T11.3 keeps stable typed option IDs through reorder, removal and disabled selection', async () => {
  const w = setup({ modelValue: 0, open: true }); const zero = w.findAll('[role=option]')[0]!.attributes('id');
  await w.setProps({ options: [...options].reverse() }); expect(w.findAll('[role=option]').find(node => node.text() === 'Zero')!.attributes('id')).toBe(zero);
  await w.setProps({ options: options.slice(1) }); expect(w.get('[role=combobox]').text()).not.toContain('Zero'); expect(w.emitted('update:modelValue')).toBeUndefined();
  await w.setProps({ options, modelValue: 'disabled', name: 'choice' }); expect(w.get('[role=combobox]').text()).toContain('Disabled'); expect(w.get('input[type=hidden]').attributes('disabled')).toBeUndefined();
});
it('T11.4 freezes initial open control mode and warns without switching ownership', async () => {
  const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {}); const w = setup(); await w.setProps({ open: true }); expect(w.find('[role=listbox]').exists()).toBe(false); expect(warnings).toHaveBeenCalled();
  await w.get('[role=combobox]').trigger('click'); expect(w.find('[role=listbox]').exists()).toBe(true);
  const other = setup({ open: true }); await other.setProps({ open: undefined }); expect(other.find('[role=listbox]').exists()).toBe(false);
});
it('T11.5 typeahead and arrows loop only on explicit loop, ignore composing/modifier input', async () => {
  const w = setup({ options: [{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Apricot' }, { value: 'z', label: 'Zebra' }], loop: true }); const t = w.get('[role=combobox]');
  await t.trigger('keydown', { key: 'ArrowUp' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('Zebra');
  await t.trigger('keydown', { key: 'ArrowDown' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('Apple');
  await t.trigger('keydown', { key: 'a' }); await t.trigger('keydown', { key: 'a' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('Apricot');
  await t.trigger('keydown', { key: 'Enter', isComposing: true }); await t.trigger('keydown', { key: 'a', ctrlKey: true }); expect(w.emitted('update:modelValue')).toBeUndefined();
  await t.trigger('keydown', { key: 'Escape' }); expect(w.find('[role=listbox]').exists()).toBe(false);
});
it('T11.5 controlled opening accepts the same typeahead match as internal opening and discards rejected pending intents', async () => {
  const options = [{ value: 'a', label: 'Apple' }, { value: 'z', label: 'Zebra' }];
  const w = setup({ open: false, options, 'onUpdate:open': (open: boolean) => { void w.setProps({ open }); } });
  await w.get('[role=combobox]').trigger('keydown', { key: 'z' }); await nextTick(); expect(w.find('[data-zoom-highlighted]').text()).toBe('Zebra');
  const rejected = setup({ open: false, options }); await rejected.get('[role=combobox]').trigger('keydown', { key: 'z' }); await nextTick();
  await rejected.setProps({ open: true }); expect(rejected.find('[data-zoom-highlighted]').text()).toBe('Apple');
});
it('T11.4/7 blocked transitions request closure once and retain controlled open resources', async () => {
  const w = setup({ open: true }); await w.setProps({ readonly: true }); expect(w.emitted('open-change')?.[0]).toEqual([{ open: false, previousOpen: true, reason: 'disabled' }]);
  await w.findAll('[role=option]')[0]!.trigger('click'); expect(w.emitted('update:modelValue')).toBeUndefined(); expect(w.find('[role=listbox]').exists()).toBe(true);
});
it('T11.6 one outside pointer with resulting blur requests close only once even when rejected', async () => {
  const w = setup({ open: true }); const t = w.get('[role=combobox]'); (t.element as HTMLElement).focus(); await nextTick(); await nextTick();
  const outside = document.createElement('button'); document.body.append(outside); outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); outside.focus(); await nextTick();
  expect(w.emitted('update:open')).toEqual([[false]]);
});
it('T11.6 a mounted popup pointer is inside the logical layer after async setup', async () => {
  const w = setup({ open: true }); await nextTick(); await nextTick();
  w.get('[role=option]').element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true })); await nextTick();
  expect(w.emitted('update:open')).toBeUndefined();
});
it('T11.6 rejected Tab close and native focusout form one close request', async () => {
  const w = setup({ open: true }); const trigger = w.get('[role=combobox]'); (trigger.element as HTMLElement).focus();
  const outside = document.createElement('button'); document.body.append(outside);
  await trigger.trigger('keydown', { key: 'Tab' }); outside.focus(); await nextTick();
  expect(w.emitted('update:open')).toEqual([[false]]);
});
it('T11.9 clear appearing during controlled open joins the logical layer before its pointer intent', async () => {
  const w = setup({ open: true, clearable: true }); await nextTick(); await nextTick();
  await w.setProps({ modelValue: 0 }); await nextTick(); await nextTick();
  w.get('.zoom-select__clear').element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  expect(w.emitted('update:open')).toBeUndefined();
});
it('T11.3 replacing disabled option preserves selected label but marks the item and reconciles highlight', async () => {
  const w = setup({ open: true, modelValue: 0 }); await w.setProps({ options: options.map(option => ({ ...option, disabled: option.value === 0 || option.disabled })) });
  expect(w.findAll('[role=option]')[0]!.attributes('aria-disabled')).toBe('true'); expect(w.find('[data-zoom-highlighted]').text()).toBe('Empty');
});
it('T11.5 pointer highlight changes neither confirmed value nor disabled targets', async () => {
  const w = setup({ open: true, modelValue: 0 }); await w.findAll('[role=option]')[2]!.trigger('pointermove'); expect(w.find('[data-zoom-highlighted]').text()).toBe('String zero');
  await w.findAll('[role=option]')[3]!.trigger('pointermove'); expect(w.find('[data-zoom-highlighted]').text()).toBe('String zero'); expect(w.emitted('update:modelValue')).toBeUndefined();
  await w.setProps({ readonly: true }); await w.findAll('[role=option]')[0]!.trigger('pointermove'); expect(w.find('[data-zoom-highlighted]').text()).toBe('String zero');
});
it('T11.10/11 canceled reset requests nothing; readonly bypasses required and keeps successful value', async () => {
  vi.useFakeTimers(); const form = document.createElement('form'); form.id = 'owner'; document.body.append(form);
  const w = setup({ modelValue: 0, form: 'owner', name: 'choice', required: true }); form.addEventListener('reset', event => event.preventDefault()); form.reset(); await vi.runAllTimersAsync(); expect(w.emitted('update:modelValue')).toBeUndefined();
  await w.setProps({ modelValue: null, readonly: true }); expect(form.checkValidity()).toBe(true); expect([...new FormData(form)]).toEqual([]);
});
it('T11.8 handles empty/all disabled, stable IDs and clears without a nested button', async () => {
  const w = setup({ options: [], open: true, modelValue: 0, clearable: true }); expect(w.get('[role=combobox]').attributes('aria-activedescendant')).toBeUndefined(); expect(w.get('[role=listbox]').text()).toContain('暂无选项');
  await w.get('.zoom-select__clear').trigger('click'); expect(w.emitted('change')?.[0]).toEqual([{ value: null, previousValue: 0, option: null, reason: 'clear' }]);
  await w.setProps({ options: [{ value: 0, label: 'No', disabled: true }] }); expect(w.get('[role=combobox]').attributes('aria-activedescendant')).toBeUndefined();
});
it('T11.12/15 portal resolves only after mount and cleans the popup when unmounted; invalid hosts fall back', async () => {
  const host = document.createElement('div'); document.body.append(host); const w = setup({ open: true, portal: true, getPopupContainer: () => host }); await nextTick(); await nextTick(); expect(host.querySelector('[role=listbox]')).not.toBeNull();
  w.unmount(); wrappers.pop(); expect(host.querySelector('[role=listbox]')).toBeNull();
  const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {}); const other = setup({ open: true, portal: true, getPopupContainer: () => document.createElement('div') }); await nextTick(); expect(other.find('[role=listbox]').exists()).toBe(true); expect(warnings).toHaveBeenCalled();
});
it('T11.6 external value updates do not reorder two active sibling layers', async () => {
  const values = reactive<{ first: string | null }>({ first: null }); const requests: string[] = [];
  const Host = defineComponent({ setup: () => () => [h(Select, { options, modelValue: values.first, open: true, 'onUpdate:open': () => requests.push('first') }), h(Select, { options, open: true, 'onUpdate:open': () => requests.push('second') })] });
  const w = mount(Host, { attachTo: document.body }); wrappers.push(w); await nextTick(); await nextTick(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(requests).toEqual(['second']);
  requests.length = 0; values.first = ''; await nextTick(); await nextTick(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(requests).toEqual(['second']);
});
it('T11.8/13 arbitrary UTF-16 values have unique stable ARIA IDs and do not crash SSR', async () => {
  const options = [{ value: '\ud800', label: 'High surrogate' }, { value: '\ud801', label: 'Other surrogate' }, { value: '😀', label: 'Emoji' }];
  const html = await renderToString(createSSRApp({ render: () => h(Select, { options, open: true }) })); expect(html).toContain('High surrogate');
  const w = setup({ options, open: true }); const ids = w.findAll('[role=option]').map(node => node.attributes('id')); expect(new Set(ids).size).toBe(3);
});
