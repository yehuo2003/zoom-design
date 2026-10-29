import type { NormalizedOptions, OptionIssue, OptionValue, SelectionOption } from './types.js';

/** Copy only the public shape; diagnostics stay data so adapters own warnings. */
export function normalizeOptions(input: unknown): NormalizedOptions {
  const options: SelectionOption[] = [];
  const issues: OptionIssue[] = [];
  if (input === undefined) return { options, issues };
  if (!Array.isArray(input)) return { options, issues: [{ index: -1, code: 'invalid-option' }] };
  const seen = new Set<OptionValue>();
  for (let index = 0; index < input.length; index++) {
    const item: unknown = input[index];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      issues.push({ index, code: 'invalid-option' }); continue;
    }
    const { value, label, disabled } = item as Record<string, unknown>;
    if (!(typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))) {
      issues.push({ index, code: 'invalid-value' }); continue;
    }
    if (typeof label !== 'string') { issues.push({ index, code: 'invalid-label' }); continue; }
    if (seen.has(value)) { issues.push({ index, code: 'duplicate-value' }); continue; }
    seen.add(value);
    if (disabled === undefined) options.push({ value, label });
    else {
      const validDisabled = typeof disabled === 'boolean';
      if (!validDisabled) issues.push({ index, code: 'invalid-disabled' });
      options.push({ value, label, disabled: validDisabled ? disabled : true });
    }
  }
  return { options, issues };
}

export function getSelectedOption<V extends OptionValue>(options: readonly SelectionOption<V>[], value: V | null): SelectionOption<V> | null {
  return value === null ? null : options.find(option => option.value === value) ?? null;
}
