import { describe, expect, it } from 'vitest';
import { createEngineeringState } from './fixtures/state.js';

describe('Core private engineering fixture (no product API)', () => {
  it('T2.6 retains zero and keeps two state instances independent', () => {
    const first = createEngineeringState(0, 9);
    const second = createEngineeringState(0, 9);
    expect(first.snapshot()).toEqual({ status: 'ready', value: 0 });
    first.update(value => value + 1);
    expect(first.snapshot()).toEqual({ status: 'ready', value: 1 });
    expect(second.snapshot()).toEqual({ status: 'ready', value: 0 });
  });
  it('only falls back for absent values and supports generic callback updates', () => {
    const state = createEngineeringState<number | 'idle'>(undefined, 'idle');
    expect(state.snapshot().value).toBe('idle');
    state.update(value => typeof value === 'number' ? value + 1 : 0);
    expect(state.snapshot().value).toBe(0);
    expect(createEngineeringState('', 'fallback').snapshot().value).toBe('');
  });
  it('T2.2/T2.10 imports the real public package with no browser globals or fixture exports', async () => {
    expect(typeof globalThis).toBe('object');
    expect('document' in globalThis).toBe(false);
    expect(Object.keys(await import('@zoom-design/core'))).toEqual([]);
  });
});
