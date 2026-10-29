import { it, expect } from 'vitest';
import { normalizeSelection } from '../src/selection/normalize';
import { triggerAttributes } from '../src/selection/attrs';
import type { SelectProps } from '../src/select/types';
it('T11.1 runtime props normalize safely and report structured option issues without mutation', () => {
  const raw = Object.freeze([{ value: 0, label: '' }, { value: 0, label: 'duplicate' }, { value: '', label: 'Empty' }, { value: true, label: 'bad' }]);
  const n = normalizeSelection({ modelValue: NaN, options: raw, size: 'bad', placement: 'left', offset: -1, disabled: 'false', readonly: 'false', loading: {}, clearable: 1, required: 1, invalid: 'false', loop: 1, portal: 1, matchTriggerWidth: 1, placeholder: 1, id: 1 } as unknown as SelectProps);
  expect(n.value).toBeNull(); expect(n.options).toEqual([{ value: 0, label: '' }, { value: '', label: 'Empty' }]);
  expect(n).toMatchObject({ size: 'md', placement: 'bottom-start', offset: 4, disabled: true, readonly: true, loading: true, clearable: false, required: false, invalid: false, loop: false, portal: false, matchTriggerWidth: true, placeholder: '', id: undefined }); expect(n.issues.length).toBeGreaterThan(10);
});
it('T11.1 public defaults and valid options stay narrow, finite values preserve identity', () => {
  expect(normalizeSelection({})).toMatchObject({ value: null, options: [], open: false, emptyText: '暂无选项', loadingText: '加载中', clearLabel: '清空', matchTriggerWidth: true });
  expect(normalizeSelection({ modelValue: '', size: 'sm', placement: 'top-end', offset: 0, matchTriggerWidth: false, placeholder: '', emptyText: 'none', loadingText: 'wait', clearLabel: 'remove', id: 'custom', name: 'n', form: 'f' })).toMatchObject({ value: '', size: 'sm', placement: 'top-end', offset: 0, matchTriggerWidth: false, id: 'custom', name: 'n', form: 'f' });
});
it('T11.9 trigger attrs reject critical state, case variants and event strings but preserve typed callbacks', () => {
  const fn = () => {}; expect(triggerAttributes(undefined)).toEqual({}); expect(triggerAttributes([])).toEqual({});
  expect(triggerAttributes({ ROLE: 'link', VaLuE: 'x', 'data-ZOOM-open': 1, 'aria-expanded': 'bad', onClick: 'alert(1)', onFocus: fn, onBlur: [fn], title: 'title', style: { color: 'red' } })).toEqual({ onFocus: fn, onBlur: [fn], title: 'title', style: { color: 'red' } });
});
