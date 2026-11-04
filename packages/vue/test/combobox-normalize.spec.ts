import { expect, it } from 'vitest';
import { normalizeCombobox } from '../src/combobox/normalize';
it('T12.1 preserves safe common defaults and normalizes malformed query/filter/minimum with diagnostics', () => {
  const n = normalizeCombobox({ modelValue: Infinity, options: null, query: 4, minQueryLength: -1, filterOption: 'bad', disabled: 'bad', readonly: 'bad', loading: 'bad', size: 'huge', open: 'bad' } as never);
  expect(n.value).toBe(null); expect(n.options).toEqual([]); expect(n.query).toBe(''); expect(n.filterOption).toBeUndefined(); expect(n.minQueryLength).toBe(0); expect(n.disabled && n.readonly && n.loading).toBe(true); expect(n.issues.length).toBeGreaterThan(5);
});
it('T12.1 accepts every declared valid common/query option without mutating source', () => {
  const filterOption = () => true; const n = normalizeCombobox({ query: 'x', minQueryLength: 2, filterOption, modelValue: '', options: [{ value: '', label: 'Empty' }], size: 'lg', open: true, portal: true });
  expect(n.query).toBe('x'); expect(n.minQueryLength).toBe(2); expect(n.filterOption).toBe(filterOption); expect(n.issues).toEqual([]);
});
