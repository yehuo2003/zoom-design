/** Runtime JS callers receive the same safe enum defaults as typed callers. */
export function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

/** Called after Vue's Boolean attribute casting. Invalid action states fail closed. */
export function normalizeBoolean(value: unknown, invalid: boolean, warn?: (message: string) => void): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  warn?.(`ZButton: expected a Boolean; using ${invalid} for invalid input.`);
  return invalid;
}
