import type { HighlightAction, OptionValue, SelectionOption } from './types.js';
export function moveHighlight<V extends OptionValue>(options: readonly SelectionOption<V>[], current: V | null, action: HighlightAction, loop = false): V | null {
  const enabled = options.filter(option => !option.disabled);
  if (!enabled.length) return null;
  if (action === 'first') return enabled[0]!.value;
  if (action === 'last') return enabled[enabled.length - 1]!.value;
  const index = enabled.findIndex(option => option.value === current);
  if (index === -1) return enabled[action === 'next' ? 0 : enabled.length - 1]!.value;
  const next = index + (action === 'next' ? 1 : -1);
  const target = loop ? (next + enabled.length) % enabled.length : Math.max(0, Math.min(next, enabled.length - 1));
  return enabled[target]!.value;
}
export function reconcileHighlight<V extends OptionValue>(options: readonly SelectionOption<V>[], current: V | null, selected: V | null): V | null {
  const enabled = options.filter(option => !option.disabled);
  return (enabled.find(option => option.value === current) ?? enabled.find(option => option.value === selected) ?? enabled[0])?.value ?? null;
}
