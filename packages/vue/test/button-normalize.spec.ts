import { describe, expect, it } from 'vitest';

describe('T7.1–3 Button normalization', () => {
  it('defaults null/undefined and rejects arbitrary enum values', async () => {
    const { normalizeEnum } = await import('../src/button/normalize');
    for (const value of [undefined, null, '', 'invalid', 0, {}, false]) {
      expect(normalizeEnum(value, ['solid', 'outline', 'text'], 'solid')).toBe('solid');
      expect(normalizeEnum(value, ['button', 'submit', 'reset'], 'button')).toBe('button');
    }
    for (const value of ['solid', 'outline', 'text']) expect(normalizeEnum(value, ['solid', 'outline', 'text'], 'solid')).toBe(value);
  });
  it('preserves actual Booleans and defaults nullish values', async () => {
    const { normalizeBoolean } = await import('../src/button/normalize');
    for (const value of [undefined, null, false]) expect(normalizeBoolean(value, true)).toBe(false);
    expect(normalizeBoolean(true, false)).toBe(true);
  });
  it('uses the conservative invalid-input policy, with optional development diagnostics', async () => {
    const { normalizeBoolean } = await import('../src/button/normalize');
    for (const value of ['false', '', 0, 1, {}, []]) {
      const messages: string[] = [];
      expect(normalizeBoolean(value, true, message => messages.push(message))).toBe(true);
      expect(messages).toEqual(['ZButton: expected a Boolean; using true for invalid input.']);
      expect(normalizeBoolean(value, false)).toBe(false);
    }
  });
});
