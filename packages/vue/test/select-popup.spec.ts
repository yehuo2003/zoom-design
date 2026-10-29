import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Popup from '../src/select/SelectionPopup.vue';
const base = { id: 'list', labelledby: 'trigger', selected: 0, highlighted: '', blocked: false, loading: false, loadingText: 'Wait', emptyText: 'None', optionId: (value: unknown) => `option-${String(value)}`, options: [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty' }] };
it('T11.9 option slot receives independent selection/highlight and points/chooses one option', async () => {
  const w = mount(Popup, { props: base, slots: { option: ({ option, selected, highlighted }) => `${option.label}:${selected}:${highlighted}` } });
  expect(w.findAll('[role=option]').map(node => node.text())).toEqual(['Zero:true:false', 'Empty:false:true']);
  await w.findAll('[role=option]')[1]!.trigger('pointermove'); await w.findAll('[role=option]')[1]!.trigger('click'); expect(w.emitted('point')?.[0]).toEqual([base.options[1]]); expect(w.emitted('choose')?.[0]).toEqual([base.options[1]]);
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true }); w.element.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); w.unmount();
});
it('T11.9 empty/loading slots replace only their state message without inventing options', async () => {
  const w = mount(Popup, { props: { ...base, options: [] }, slots: { empty: () => 'Custom empty', loading: () => 'Custom loading' } });
  expect(w.text()).toBe('Custom empty'); expect(w.find('[role=option]').exists()).toBe(false); await w.setProps({ loading: true }); expect(w.get('[role=status]').text()).toBe('Custom loading'); expect(w.attributes('aria-busy')).toBe('true'); w.unmount();
});
