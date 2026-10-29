import { describe, it, expect } from 'vitest';
import { moveHighlight, reconcileHighlight } from '../../src/selection/navigation.js';
import type { SelectionOption } from '../../src/selection/types.js';
const options: readonly SelectionOption[] = Object.freeze([
  Object.freeze({ value: 0, label: 'First' }), Object.freeze({ value: 'disabled', label: 'Disabled', disabled: true }), Object.freeze({ value: '', label: 'Last' }),
]);
describe('T9.4–7 stable-value navigation', () => {
  it('T9.5 skips disabled items and handles empty/all-disabled collections', () => {
    expect(moveHighlight(options, 0, 'next')).toBe(''); expect(moveHighlight(options, '', 'previous')).toBe(0);
    for (const action of ['next', 'previous', 'first', 'last'] as const) {
      expect(moveHighlight([], null, action)).toBeNull(); expect(moveHighlight([options[1]!], null, action, true)).toBeNull();
    }
  });
  it.each([['next', 0], ['first', 0], ['previous', ''], ['last', '']] as const)('T9.6 absent current with %s starts at %s', (action, value) => {
    expect(moveHighlight(options, null, action)).toBe(value); expect(moveHighlight(options, 'gone', action)).toBe(value);
    expect(moveHighlight(options, 'disabled', action)).toBe(value);
  });
  it('T9.6 stops by default, loops only explicitly and honors first/last', () => {
    expect(moveHighlight(options, '', 'next')).toBe(''); expect(moveHighlight(options, 0, 'previous')).toBe(0);
    expect(moveHighlight(options, '', 'next', true)).toBe(0); expect(moveHighlight(options, 0, 'previous', true)).toBe('');
    expect(moveHighlight(options, '', 'first')).toBe(0); expect(moveHighlight(options, 0, 'last')).toBe('');
    expect(moveHighlight([options[0]!], 0, 'next', true)).toBe(0);
  });
  it('T9.7 keeps stable values after reorder and reconciles deleted/disabled highlights', () => {
    expect(reconcileHighlight([...options].reverse(), '', 0)).toBe('');
    expect(reconcileHighlight(options, 'gone', '')).toBe('');
    expect(reconcileHighlight(options, 'disabled', 'disabled')).toBe(0);
    expect(reconcileHighlight(options, null, null)).toBe(0);
    expect(reconcileHighlight([], 0, 0)).toBeNull(); expect(reconcileHighlight([options[1]!], 'disabled', null)).toBeNull();
    expect(moveHighlight([...options].reverse(), '', 'next')).toBe(0);
  });
});
