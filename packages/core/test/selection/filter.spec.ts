import { describe, it, expect } from 'vitest';
import { filterOptions, findTypeaheadMatch } from '../../src/selection/filter.js';
import type { SelectionOption } from '../../src/selection/types.js';
const options: readonly SelectionOption[] = Object.freeze([
  Object.freeze({ value: 0, label: 'Apple' }), Object.freeze({ value: 'disabled', label: 'Apricot', disabled: true }),
  Object.freeze({ value: '', label: 'ALPHA' }), Object.freeze({ value: '中', label: '中文选项' }), Object.freeze({ value: 'b', label: 'Banana' }),
]);
describe('T9.4/T9.10–12 label filtering and stateless typeahead', () => {
  it('T9.10 filters deterministically, preserves disabled records and does not trim query', () => {
    expect(filterOptions(options, '')).toEqual(options);
    expect(filterOptions(options, 'AP')).toEqual(options.slice(0, 2));
    expect(filterOptions(options, '中文')).toEqual([options[3]]);
    expect(filterOptions(options, ' apple ')).toEqual([]); expect(filterOptions(options, 'missing')).toEqual([]);
    expect(filterOptions([], 'a')).toEqual([]);
  });
  it('T9.11 matches ordinary multi-character text from current and skips disabled', () => {
    expect(findTypeaheadMatch(options, 0, 'a')).toBe(0); expect(findTypeaheadMatch(options, 0, 'al')).toBe('');
    expect(findTypeaheadMatch(options, 'b', 'AP')).toBe(0); expect(findTypeaheadMatch(options, null, 'apr')).toBeNull();
    expect(findTypeaheadMatch(options, null, '中文')).toBe('中'); expect(findTypeaheadMatch(options, 0, '')).toBeNull();
    expect(findTypeaheadMatch([], null, 'a')).toBeNull();
  });
  it('T9.11 repeated single characters cycle from after current independently of arrow loop', () => {
    expect(findTypeaheadMatch(options, 0, 'aa')).toBe(''); expect(findTypeaheadMatch(options, '', 'AAA')).toBe(0);
    expect(findTypeaheadMatch(options, 'missing', 'aa')).toBe(0);
    expect(findTypeaheadMatch([{ value: 1, label: '😀 smile' }, { value: 2, label: '😀 two' }], 1, '😀😀')).toBe(2);
  });
  it('T9.12 interleaved callers do not share query buffers or instance state', () => {
    expect(findTypeaheadMatch(options, 0, 'aa')).toBe('');
    expect(findTypeaheadMatch(options, null, 'b')).toBe('b');
    expect(findTypeaheadMatch(options, '', 'aa')).toBe(0);
    expect(filterOptions(options, 'AL')).toEqual([options[2]]);
    expect(options.map(option => option.label)).toEqual(['Apple', 'Apricot', 'ALPHA', '中文选项', 'Banana']);
  });
  it('T9.11 repeated Unicode characters still cycle when lowercase expands a code point', () => {
    const unicode = [{ value: 1, label: 'İstanbul' }, { value: 2, label: 'İzmir' }];
    expect(findTypeaheadMatch(unicode, 1, 'İ')).toBe(1);
    expect(findTypeaheadMatch(unicode, 1, 'İİ')).toBe(2);
    expect(findTypeaheadMatch(options, 0, 'Aa')).toBe('');
  });
});
