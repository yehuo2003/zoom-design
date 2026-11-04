const protectedNames = new Set(['id', 'value', 'name', 'form', 'type', 'disabled', 'readonly', 'required', 'multiple', 'role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'aria-disabled', 'aria-readonly', 'aria-busy', 'aria-invalid', 'aria-required', 'aria-haspopup']);
const safeListener = (key: string, value: unknown) => !key.toLowerCase().startsWith('on') || typeof value === 'function' || (Array.isArray(value) && value.every(item => typeof item === 'function'));
export function triggerAttributes(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => {
    const lower = key.toLowerCase();
    return !protectedNames.has(lower) && !lower.startsWith('data-zoom-') && safeListener(key, value);
  }));
}
export function rootAttributes(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => {
    const lower = key.toLowerCase(); return !lower.startsWith('aria-') && !lower.startsWith('data-zoom-') && !['id', 'role'].includes(lower) && safeListener(key, value);
  }));
}
