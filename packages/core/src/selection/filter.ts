import type { OptionValue, SelectionOption } from './types.js';
export function filterOptions<V extends OptionValue>(options: readonly SelectionOption<V>[], query: string): readonly SelectionOption<V>[] {
  const text = query.toLowerCase();
  return options.filter(option => option.label.toLowerCase().includes(text));
}
/** The adapter owns the 500ms buffer. A repeated character cycles this call only. */
export function findTypeaheadMatch<V extends OptionValue>(options: readonly SelectionOption<V>[], current: V | null, text: string): V | null {
  if (!text || !options.length) return null;
  // Case conversion can expand one code point (İ -> i + combining dot).
  // Split original characters first so repeated input remains repeated.
  const characters = Array.from(text, character => character.toLowerCase());
  const repeated = characters.length > 1 && characters.every(character => character === characters[0]);
  const prefix = repeated ? characters[0]! : text.toLowerCase();
  const index = options.findIndex(option => option.value === current);
  const start = index === -1 ? 0 : index + (repeated ? 1 : 0);
  for (let step = 0; step < options.length; step++) {
    const option = options[(start + step) % options.length]!;
    if (!option.disabled && option.label.toLowerCase().startsWith(prefix)) return option.value;
  }
  return null;
}
