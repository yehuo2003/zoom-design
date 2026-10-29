import { describe, it, expect } from 'vitest';
import { normalizeOptions, getSelectedOption } from '../../src/selection/options.js';

describe('T9.1–4/T9.8–9 option normalization and selected value', () => {
  it('T9.1 distinguishes omitted options from invalid non-arrays', () => {
    expect(normalizeOptions(undefined)).toEqual({ options: [], issues: [] });
    expect(normalizeOptions([])).toEqual({ options: [], issues: [] });
    for (const input of [null, false, {}, '', 0]) expect(normalizeOptions(input)).toEqual({ options: [], issues: [{ index: -1, code: 'invalid-option' }] });
    expect(getSelectedOption([], null)).toBeNull();
  });
  it('T9.2 preserves 0, empty strings and string/number identity; -0 is the same value as 0', () => {
    const { options, issues } = normalizeOptions([{ value: 0, label: 'Zero' }, { value: '', label: '' }, { value: '0', label: 'String zero' }, { value: -0, label: 'Duplicate' }]);
    expect(options.map(option => option.value)).toEqual([0, '', '0']);
    expect(issues).toEqual([{ index: 3, code: 'duplicate-value' }]);
    expect(getSelectedOption(options, 0)?.label).toBe('Zero');
    expect(getSelectedOption(options, '')?.label).toBe('');
    expect(getSelectedOption(options, '0')?.label).toBe('String zero');
  });
  it('T9.3 skips malformed records, nonfinite/unsupported values and invalid labels with indexes', () => {
    const input = [null, [], 1, { value: NaN, label: 'a' }, { value: Infinity, label: 'a' }, { value: -Infinity, label: 'a' },
      ...[null, undefined, true, {}, 1n, Symbol('value')].map(value => ({ value, label: 'a' })), { value: 1, label: 2 }, { value: 2 }];
    const result = normalizeOptions(input);
    expect(result.options).toEqual([]);
    expect(result.issues).toEqual(input.map((_item, index) => ({ index, code: index < 3 ? 'invalid-option' : index < 12 ? 'invalid-value' : 'invalid-label' })));
  });
  it('T9.3 retains the first valid duplicate, fails closed for invalid disabled and drops extra fields', () => {
    const result = normalizeOptions([{ value: 1, label: null }, { value: 1, label: 'first', disabled: 'false', extra: 'private' }, { value: 1, label: 'second' }, { value: 2, label: 'two', disabled: false }, { value: 3, label: 'three', disabled: true }]);
    expect(result.options).toEqual([{ value: 1, label: 'first', disabled: true }, { value: 2, label: 'two', disabled: false }, { value: 3, label: 'three', disabled: true }]);
    expect(result.issues).toEqual([{ index: 0, code: 'invalid-label' }, { index: 1, code: 'invalid-disabled' }, { index: 2, code: 'duplicate-value' }]);
  });
  it('T9.3 treats sparse positions as malformed items', () => {
    expect(normalizeOptions(Array(1)).issues).toEqual([{ index: 0, code: 'invalid-option' }]);
  });
  it('T9.4 clones normalized records without modifying frozen inputs', () => {
    const item = Object.freeze({ value: '', label: 'Empty' }); const input = Object.freeze([item]);
    const result = normalizeOptions(input);
    expect(result.options).toEqual(input); expect(result.options).not.toBe(input); expect(result.options[0]).not.toBe(item);
    expect(item).toEqual({ value: '', label: 'Empty' });
  });
  it('T9.8 leaves application values intact when a selected option is removed and restored', () => {
    const value = 0; const options = normalizeOptions([{ value, label: 'Zero' }]).options;
    expect(getSelectedOption(options, value)?.label).toBe('Zero'); expect(getSelectedOption([], value)).toBeNull();
    expect(value).toBe(0); expect(getSelectedOption(options, value)?.value).toBe(0);
    expect(getSelectedOption(options, null)).toBeNull(); expect(getSelectedOption(options, 'unknown')).toBeNull();
  });
  it('T9.9 returns a disabled application-selected item', () => {
    const option = Object.freeze({ value: 0, label: 'Disabled', disabled: true });
    expect(getSelectedOption([option], 0)).toBe(option);
  });
});
