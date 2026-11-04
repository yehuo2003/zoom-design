import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import Combobox from '../src/combobox/Combobox.vue';
const options = [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty' }, { value: '0', label: 'String zero' }, { value: 'd', label: 'Disabled', disabled: true }];
const wrappers: ReturnType<typeof mount>[] = [];
function setup(props: Record<string, unknown> = {}) { const w = mount(Combobox, { props: { options, ...props }, attachTo: document.body }); wrappers.push(w); return w; }
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); });
function input(w: ReturnType<typeof setup>) { return w.get<HTMLInputElement>('[role=combobox]'); }
it('T12.1/14 omitted matchTriggerWidth stays true after Vue Boolean casting and false remains an explicit opt-out', async () => {
  const w = setup({ open: true }); expect(w.props('matchTriggerWidth')).toBe(true); await w.setProps({ matchTriggerWidth: false }); expect(w.props('matchTriggerWidth')).toBe(false);
});
it('T12.7 clear pointerdown prevents native blur from running cancellation before the clear transaction', () => {
  const w = setup({ modelValue: 0, query: 'draft', open: true, clearable: true }); input(w).element.focus(); const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true }); w.get('button').element.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(input(w).element); expect(w.emitted('update:query')).toBeUndefined();
});
it('T12.11 touch pointerup confirms once even when compatibility click follows and all channels reject', async () => {
  const w = setup({ modelValue: 0, query: '', open: true }); const option = w.findAll('[role=option]')[1]!;
  await option.trigger('pointerdown', { pointerType: 'touch', isPrimary: true }); await option.trigger('pointerup', { pointerType: 'touch', isPrimary: true }); expect(w.emitted('update:modelValue')).toEqual([['']]);
  option.element.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true })); await nextTick(); expect(w.emitted('update:modelValue')).toHaveLength(1); expect(w.emitted('update:open')).toHaveLength(1);
  await option.trigger('pointerdown', { pointerType: 'touch', isPrimary: true }); await option.trigger('pointerup', { pointerType: 'touch', isPrimary: true }); expect(w.emitted('update:modelValue')).toHaveLength(2);
});
async function edit(w: ReturnType<typeof setup>, text: string) { input(w).element.value = text; await input(w).trigger('input'); }
it('T12.1/2 starts from confirmed label and edits only query with deterministic filtering', async () => {
  const w = setup({ modelValue: 0 }); expect(input(w).element.value).toBe('Zero');
  await edit(w, 'EM'); expect(w.emitted('update:query')).toEqual([['EM']]); expect(w.emitted('update:modelValue')).toBeUndefined();
  expect(w.findAll('[role=option]').map(n => n.text())).toEqual(['Empty']);
  await edit(w, ''); expect(w.findAll('[role=option]')).toHaveLength(4);
});
it('T12.4/5 requests query then value then open, preserving all three rejected channels', async () => {
  const order: string[] = []; const w = setup({ modelValue: 0, query: '', open: true, 'onUpdate:query': () => order.push('query'), onQueryChange: () => order.push('query-detail'), 'onUpdate:modelValue': () => order.push('value'), onChange: () => order.push('value-detail'), 'onUpdate:open': () => order.push('open'), onOpenChange: () => order.push('open-detail') });
  await w.findAll('[role=option]')[1]!.trigger('click'); expect(order).toEqual(['query', 'query-detail', 'value', 'value-detail', 'open', 'open-detail']);
  expect(input(w).element.value).toBe(''); expect(w.get('input[type=hidden]').element).toHaveProperty('value', '0'); expect(w.find('[role=listbox]').exists()).toBe(true);
});
it('T12.7/10 navigation highlights only and native editing keys remain native, Escape restores label', async () => {
  const w = setup({ modelValue: 0 }); await edit(w, 'Em'); const t = input(w);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', ' ', 'a']) { const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); t.element.dispatchEvent(event); expect(event.defaultPrevented).toBe(false); }
  await t.trigger('keydown', { key: 'ArrowDown' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('Empty'); expect(w.emitted('update:modelValue')).toBeUndefined();
  await t.trigger('keydown', { key: 'Escape' }); expect(t.element.value).toBe('Zero'); expect(w.find('[role=listbox]').exists()).toBe(false);
});
it('T12.8 IME draft does not filter or request until compositionend; trailing input commits once', async () => {
  const w = setup(); const t = input(w); await t.trigger('compositionstart'); t.element.value = 'Empty'; await t.trigger('input', { isComposing: true });
  expect(w.emitted('update:query')).toBeUndefined(); const enter = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }); t.element.dispatchEvent(enter); expect(enter.defaultPrevented).toBe(true);
  await t.trigger('compositionend'); await t.trigger('input'); expect(w.emitted('update:query')).toEqual([['Empty']]); expect(w.emitted('update:modelValue')).toBeUndefined();
});
it('T12.9 external reset invalidates composition so stale end/input cannot overwrite accepted value', async () => {
  const w = setup({ modelValue: 0 }); const t = input(w); await t.trigger('compositionstart'); t.element.value = 'old draft'; await t.trigger('input', { isComposing: true });
  await w.setProps({ modelValue: '' }); t.element.value = 'old draft'; await t.trigger('compositionend'); await t.trigger('input'); expect(t.element.value).toBe('Empty');
  expect(w.emitted('query-change')?.map(([d]) => d)).toEqual([{ query: 'Empty', previousQuery: 'Zero', reason: 'external-sync' }]);
});
it('T12.3 custom filter and minimum query never allow a free-text Enter value', async () => {
  const w = setup({ minQueryLength: 2, filterOption: (query: string, option: { value: unknown }) => query === String(option.value) }); await edit(w, 'x'); expect(w.findAll('[role=option]')).toHaveLength(0);
  const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); input(w).element.dispatchEvent(e); expect(e.defaultPrevented).toBe(true); expect(w.emitted('update:modelValue')).toBeUndefined();
  await w.setProps({ minQueryLength: 0 }); await edit(w, '0'); expect(w.findAll('[role=option]')).toHaveLength(2);
});
it('T12.12 native bridge submits confirmed empty/zero only, query has no name and reset honors rejection', async () => {
  vi.useFakeTimers(); const form = document.createElement('form'); form.id = 'owner'; document.body.append(form); const w = setup({ modelValue: '', name: 'choice', form: 'owner', required: true });
  await edit(w, 'free text'); expect(input(w).attributes('name')).toBeUndefined(); expect([...new FormData(form)]).toEqual([['choice', '']]); expect(form.checkValidity()).toBe(true);
  form.reset(); await vi.runAllTimersAsync(); await nextTick(); expect(input(w).element.value).toBe('Empty'); expect(w.emitted('update:modelValue')).toEqual([[null]]); expect(form.checkValidity()).toBe(true);
});
it('T12.14 SSR starts from query/open and isolates requests without browser resources', async () => {
  const first = await renderToString(createSSRApp({ render: () => h(Combobox, { options, modelValue: 0, query: 'Em', open: true }) }));
  const second = await renderToString(createSSRApp({ render: () => h(Combobox, { options, modelValue: '', query: 'different' }) }));
  expect(first).toContain('value="Em"'); expect(first).toContain('role="listbox"'); expect(first).toContain('Empty'); expect(first).not.toContain('String zero'); expect(second).toContain('value="different"'); expect(second).not.toContain('role="listbox"');
});
it('T12.5 controlled rejected input is restored and repeated independent edits still emit', async () => {
  const w = setup({ query: 'Zero', open: false, modelValue: 0 }); await edit(w, 'Em'); expect(input(w).element.value).toBe('Zero'); expect(w.find('[role=listbox]').exists()).toBe(false);
  await edit(w, 'Em'); expect(w.emitted('update:query')).toEqual([['Em'], ['Em']]); expect(w.emitted('update:open')).toEqual([[true], [true]]);
});
it('T12.5 confirmed option transaction avoids duplicate external-sync after value is accepted but query rejected', async () => {
  const w = setup({ query: '', modelValue: 0, open: true, 'onUpdate:modelValue': (value: unknown) => { void w.setProps({ modelValue: value }); } });
  await w.findAll('[role=option]')[1]!.trigger('click'); await nextTick(); expect(w.emitted('query-change')).toEqual([[{ query: 'Empty', previousQuery: '', reason: 'option' }]]);
  expect(input(w).element.value).toBe(''); expect(w.get('input[type=hidden]').element).toHaveProperty('value', '');
});
it('T12.6 external selection/label changes synchronize query once, same renders do not, options do not mutate', async () => {
  const w = setup({ modelValue: 0, query: 'editing' }); await w.setProps({ modelValue: '' }); expect(w.emitted('query-change')).toHaveLength(1);
  await w.setProps({ options: options.map(option => ({ ...option })) }); expect(w.emitted('query-change')).toHaveLength(1);
  await w.setProps({ options: options.map(option => ({ ...option, label: option.value === '' ? 'Renamed' : option.label })) }); expect(w.emitted('query-change')?.[1]).toEqual([{ query: 'Renamed', previousQuery: 'editing', reason: 'external-sync' }]);
  expect(options[1]!.label).toBe('Empty'); await w.setProps({ modelValue: 'missing' }); expect(w.emitted('update:query')?.[2]).toEqual(['']); expect(w.emitted('update:modelValue')).toBeUndefined();
});
it('T12.5 freezes query/open ownership in both directions and normalizes missing controlled values', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); const w = setup(); await w.setProps({ query: 'ignored', open: true }); expect(input(w).element.value).toBe(''); expect(w.find('[role=listbox]').exists()).toBe(false);
  await edit(w, 'Em'); expect(input(w).element.value).toBe('Em'); expect(w.find('[role=listbox]').exists()).toBe(true);
  const controlled = setup({ query: 'Em', open: true }); await controlled.setProps({ query: undefined, open: undefined }); expect(input(controlled).element.value).toBe(''); expect(controlled.find('[role=listbox]').exists()).toBe(false); expect(warn).toHaveBeenCalled();
});
it('T12.4 confirms empty/zero/string values once and same-value confirmation emits no value change', async () => {
  const w = setup({ modelValue: '', query: '', open: true }); await w.findAll('[role=option]')[1]!.trigger('click'); expect(w.emitted('update:modelValue')).toBeUndefined();
  await w.findAll('[role=option]')[0]!.trigger('click'); expect(w.emitted('update:modelValue')?.[0]).toEqual([0]);
  await w.findAll('[role=option]')[2]!.trigger('click'); expect(w.emitted('update:modelValue')?.[1]).toEqual(['0']);
});
it('T12.7 controlled Tab and resulting focusout request cancellation only once, without preventing Tab', async () => {
  const w = setup({ modelValue: 0, query: 'edit', open: true }); const t = input(w); t.element.focus(); const outside = document.createElement('button'); document.body.append(outside);
  const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); t.element.dispatchEvent(event); outside.focus(); await nextTick();
  expect(event.defaultPrevented).toBe(false); expect(w.emitted('query-change')).toEqual([[{ query: 'Zero', previousQuery: 'edit', reason: 'blur' }]]); expect(w.emitted('update:open')).toEqual([[false]]);
});
it('T12.7 outside and resulting blur restore label once while popup pointer remains inside', async () => {
  const w = setup({ modelValue: 0, query: '', open: true }); const t = input(w); t.element.focus(); await nextTick(); await nextTick();
  w.get('[role=option]').element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true })); expect(w.emitted('update:open')).toBeUndefined();
  const outside = document.createElement('button'); document.body.append(outside); outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); outside.focus(); await nextTick(); expect(w.emitted('update:open')).toEqual([[false]]); expect(w.emitted('update:query')).toEqual([['Zero']]);
});
it('T12.8 controlled IME tail is ignored once but the next independent same-text input is not lost', async () => {
  vi.useFakeTimers(); const w = setup({ query: '', open: false }); const t = input(w); await t.trigger('compositionstart'); t.element.value = 'Empty'; await t.trigger('input', { isComposing: true }); await t.trigger('compositionend');
  t.element.value = 'Empty'; await t.trigger('input'); expect(w.emitted('update:query')).toEqual([['Empty']]); expect(t.element.value).toBe('');
  await edit(w, 'Empty'); expect(w.emitted('update:query')).toEqual([['Empty'], ['Empty']]);
});
it('T12.9 Escape cancels composing even while closed and ignores late composition end', async () => {
  const w = setup({ modelValue: 0 }); const t = input(w); await t.trigger('compositionstart'); t.element.value = 'draft'; await t.trigger('compositionupdate');
  await t.trigger('keydown', { key: 'Escape', isComposing: true }); t.element.value = 'draft'; await t.trigger('compositionend'); t.element.value = 'draft'; await t.trigger('input'); expect(t.element.value).toBe('Zero'); expect(w.emitted('update:query')).toBeUndefined();
});
it('T12.10 Up/Down skip disabled, loop optionally, do not hijack modified or composing keys', async () => {
  const w = setup({ query: '', open: true, loop: true }); const t = input(w); await t.trigger('keydown', { key: 'ArrowUp' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('String zero');
  await t.trigger('keydown', { key: 'ArrowDown' }); expect(w.find('[data-zoom-highlighted]').text()).toBe('Zero');
  const event = new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, cancelable: true, bubbles: true }); t.element.dispatchEvent(event); expect(event.defaultPrevented).toBe(false); expect(w.find('[data-zoom-highlighted]').text()).toBe('Zero');
  await t.trigger('keydown', { key: 'Enter' }); expect(w.emitted('update:modelValue')).toEqual([[0]]);
});
it('T12.11 blocked transitions retain rejected open resources while suppressing all edits', async () => {
  const w = setup({ modelValue: 0, query: '', open: true, clearable: true }); await w.setProps({ readonly: true }); expect(w.emitted('update:open')).toEqual([[false]]); expect(input(w).attributes('readonly')).toBeDefined(); expect(w.find('button').exists()).toBe(false);
  await edit(w, 'new'); await w.get('[role=option]').trigger('click'); expect(w.emitted('update:modelValue')).toBeUndefined(); expect(w.emitted('update:query')).toBeUndefined(); expect(w.find('[role=listbox]').exists()).toBe(true);
  await w.setProps({ readonly: false, loading: true }); expect(input(w).attributes('aria-busy')).toBe('true'); expect(input(w).attributes('disabled')).toBeUndefined();
  await w.setProps({ loading: false, disabled: true }); expect(input(w).attributes('disabled')).toBeDefined();
});
it('T12.9/11 clear invalidates IME and orders independent query/value/open requests', async () => {
  const order: string[] = []; const w = setup({ modelValue: 0, query: 'editing', open: true, clearable: true, 'onUpdate:query': () => order.push('query'), 'onUpdate:modelValue': () => order.push('value'), 'onUpdate:open': () => order.push('open') });
  const t = input(w); await t.trigger('compositionstart'); t.element.value = 'draft'; await t.trigger('input', { isComposing: true }); await w.get('button').trigger('click'); expect(order).toEqual(['query', 'value', 'open']);
  t.element.value = 'draft'; await t.trigger('compositionend'); expect(t.element.value).toBe('editing'); expect(w.emitted('update:query')).toEqual([['']]);
});
it('T12.13 filtered highlights remain valid after reorder and removal with typed stable IDs', async () => {
  const w = setup({ query: '', open: true }); const t = input(w); await t.trigger('keydown', { key: 'ArrowDown' }); const id = t.attributes('aria-activedescendant');
  await w.setProps({ options: [...options].reverse() }); expect(t.attributes('aria-activedescendant')).toBe(id);
  await w.setProps({ options: options.slice(1) }); expect(w.findAll('[role=option]').some(node => node.attributes('id') === t.attributes('aria-activedescendant'))).toBe(true);
  await edit(w, 'missing'); expect(w.emitted('update:query')?.[0]).toEqual(['missing']); await w.setProps({ query: 'missing' }); expect(t.attributes('aria-activedescendant')).toBeUndefined(); expect(w.findAll('[role=option]')).toHaveLength(0);
});
it('T12.9/12 reset sends current label first then syncs parent default, canceled reset emits nothing', async () => {
  vi.useFakeTimers(); const form = document.createElement('form'); form.id = 'reset-owner'; document.body.append(form);
  const w = setup({ modelValue: 0, query: 'edit', name: 'choice', form: form.id, 'onUpdate:modelValue': () => { void w.setProps({ modelValue: '' }); } });
  form.reset(); await vi.runAllTimersAsync(); await nextTick(); expect(w.emitted('query-change')).toEqual([[{ query: 'Zero', previousQuery: 'edit', reason: 'reset' }], [{ query: 'Empty', previousQuery: 'edit', reason: 'external-sync' }]]); expect([...new FormData(form)]).toEqual([['choice', '']]);
  const count = w.emitted('query-change')!.length; form.addEventListener('reset', event => event.preventDefault()); form.reset(); await vi.runAllTimersAsync(); expect(w.emitted('query-change')).toHaveLength(count);
});
it('T12.12 readonly bypasses required while loading keeps validation, selected disabled option still submits', async () => {
  const form = document.createElement('form'); form.id = 'validation'; document.body.append(form); const w = setup({ form: form.id, name: 'choice', required: true, readonly: true });
  expect(form.checkValidity()).toBe(true); await w.setProps({ readonly: false, loading: true }); expect(form.checkValidity()).toBe(false); await nextTick(); expect(document.activeElement).toBe(input(w).element); expect(input(w).attributes('aria-invalid')).toBe('true');
  await w.setProps({ modelValue: 'd' }); expect(form.checkValidity()).toBe(true); expect([...new FormData(form)]).toEqual([['choice', 'd']]);
  await w.setProps({ disabled: true }); expect([...new FormData(form)]).toEqual([]);
});
it('T12.3 filter exceptions report once and recover without breaking input requests', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); const w = setup({ filterOption() { throw Error('application filter'); } }); await edit(w, 'x');
  expect(w.findAll('[role=option]')).toHaveLength(0); expect(warn).toHaveBeenCalledWith(expect.stringContaining('filterOption failed')); await edit(w, 'y'); expect(warn).toHaveBeenCalledTimes(1);
  await w.setProps({ filterOption: (text: string, option: { label: string }) => option.label.includes(text) }); await edit(w, 'Em'); expect(w.findAll('[role=option]').map(n => n.text())).toEqual(['Empty']);
});
it('T12.11/13 attrs stay on their defined nodes, critical input state is protected and expose controls focus', async () => {
  const w = setup({ modelValue: 0, class: 'brand', 'data-extra': 'root', 'aria-label': 'Top name', clearable: true, inputAttrs: { title: 'Native', autocomplete: 'on', 'aria-label': 'Ignored', role: 'link', name: 'query-field', form: 'other', value: 'override', type: 'number', required: true, 'aria-autocomplete': 'both', 'data-zoom-size': 'unsafe', ONINPUT: 'alert(1)' } });
  expect(w.classes()).toContain('brand'); expect(w.attributes('data-extra')).toBe('root'); const t = input(w); expect(t.attributes('title')).toBe('Native'); expect(t.attributes('autocomplete')).toBe('on'); expect(t.attributes('aria-label')).toBe('Top name'); expect(t.attributes('type')).toBe('text'); expect(t.attributes('name')).toBeUndefined(); expect(t.attributes('form')).toBeUndefined(); expect(t.attributes('required')).toBeUndefined(); expect(t.attributes('aria-autocomplete')).toBe('list'); expect(t.attributes('oninput')).toBeUndefined(); expect(t.element.value).toBe('Zero');
  (w.vm as unknown as { focus(): void }).focus(); expect(document.activeElement).toBe(t.element); (w.vm as unknown as { blur(): void }).blur(); expect(document.activeElement).not.toBe(t.element);
});
it('T12.11 native disabled fieldset preserves its first legend exception dynamically', async () => {
  const fieldset = document.createElement('fieldset'); fieldset.disabled = true; const legend = document.createElement('legend'); fieldset.append(legend); document.body.append(fieldset);
  const a = mount(Combobox, { props: { options }, attachTo: legend }); wrappers.push(a); const b = mount(Combobox, { props: { options }, attachTo: fieldset }); wrappers.push(b); await nextTick();
  expect(input(a).element.disabled).toBe(false); expect(input(b).element.disabled).toBe(true); fieldset.disabled = false; await new Promise(resolve => setTimeout(resolve, 0)); await nextTick(); expect(input(b).element.disabled).toBe(false);
});
it('T12.9 unmount during composition leaves no late query request or popup', async () => {
  const w = setup({ open: true }); const t = input(w); await t.trigger('compositionstart'); t.element.value = 'late'; const element = t.element; w.unmount(); wrappers.splice(wrappers.indexOf(w), 1); element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'late' })); await nextTick(); expect(w.emitted('update:query')).toBeUndefined(); expect(document.querySelector('[role=listbox]')).toBeNull();
});
it('T12.7 Escape restores an edited query even if the parent keeps open false', async () => {
  const w = setup({ modelValue: 0, query: 'editing', open: false }); const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true }); input(w).element.dispatchEvent(event); await nextTick();
  expect(w.emitted('update:query')).toEqual([['Zero']]); expect(w.emitted('update:open')).toBeUndefined();
});
it('T12.9 composing Tab leaves natively, cancels late draft and requests close once', async () => {
  const w = setup({ modelValue: 0, open: true }); const t = input(w); t.element.focus(); await t.trigger('compositionstart'); t.element.value = 'draft'; await t.trigger('input', { isComposing: true }); const outside = document.createElement('button'); document.body.append(outside);
  const event = new KeyboardEvent('keydown', { key: 'Tab', isComposing: true, cancelable: true, bubbles: true }); t.element.dispatchEvent(event); outside.focus(); await nextTick(); expect(event.defaultPrevented).toBe(false); expect(w.emitted('update:open')).toEqual([[false]]);
  t.element.value = 'draft'; await t.trigger('compositionend'); t.element.value = 'draft'; await t.trigger('input'); expect(t.element.value).toBe('Zero'); expect(w.emitted('update:query')).toBeUndefined();
});
it('T12.13 root attrs reject inline event strings while preserving callbacks and custom data', () => {
  const w = setup({ onclick: 'window.unsafe = true', 'data-safe': 'yes' }); expect(w.attributes('onclick')).toBeUndefined(); expect(w.attributes('data-safe')).toBe('yes');
});
it('T12.6 one external value/options render transaction requests only its final label', async () => {
  const w = setup({ modelValue: 0, query: 'editing' }); await w.setProps({ modelValue: 9, options: [{ value: 9, label: 'Nine' }] }); expect(w.emitted('query-change')).toEqual([[{ query: 'Nine', previousQuery: 'editing', reason: 'external-sync' }]]);
});
