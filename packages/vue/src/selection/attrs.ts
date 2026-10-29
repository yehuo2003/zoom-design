const protectedNames = new Set(['id', 'value', 'name', 'form', 'type', 'disabled', 'readonly', 'role', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'aria-disabled', 'aria-readonly', 'aria-busy', 'aria-invalid', 'aria-required', 'aria-haspopup']);
export function triggerAttributes(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => {
    const lower = key.toLowerCase();
    return !protectedNames.has(lower) && !lower.startsWith('data-zoom-') && (!lower.startsWith('on') || typeof value === 'function' || (Array.isArray(value) && value.every(item => typeof item === 'function')));
  }));
}
