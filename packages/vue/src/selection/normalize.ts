import { normalizeOptions } from '@zoom-design/core';
import type { SelectionValue } from '@zoom-design/core';
import type { SelectProps } from '../select/types';
export function normalizeSelection(props: SelectProps) {
  const issues: string[] = [];
  const bool = (name: keyof SelectProps, fallback = false, absent = false) => {
    const value = props[name]; if (value == null) return absent;
    if (typeof value === 'boolean') return value;
    issues.push(`Invalid ${name}; using ${fallback}`); return fallback;
  };
  const text = (name: keyof SelectProps, fallback = '') => {
    const value = props[name]; if (value === undefined) return fallback;
    if (typeof value === 'string') return value;
    issues.push(`Invalid ${name}; using default`); return fallback;
  };
  let value: SelectionValue = null;
  if (typeof props.modelValue === 'string' || (typeof props.modelValue === 'number' && Number.isFinite(props.modelValue))) value = props.modelValue;
  else if (props.modelValue != null) issues.push('Invalid modelValue; using null');
  const normalized = normalizeOptions(props.options); for (const issue of normalized.issues) issues.push(`options[${issue.index}]: ${issue.code}`);
  const size = ['sm', 'md', 'lg'].includes(props.size ?? '') ? props.size! : 'md';
  const placement = ['bottom-start', 'bottom-end', 'top-start', 'top-end'].includes(props.placement ?? '') ? props.placement! : 'bottom-start';
  const offset = typeof props.offset === 'number' && Number.isFinite(props.offset) && props.offset >= 0 ? props.offset : 4;
  for (const [name, valid] of [['size', props.size === undefined || props.size === size], ['placement', props.placement === undefined || props.placement === placement], ['offset', props.offset === undefined || props.offset === offset]] as const) if (!valid) issues.push(`Invalid ${name}; using default`);
  return { value, options: normalized.options, size, placement, offset, issues,
    disabled: bool('disabled', true), readonly: bool('readonly', true), loading: bool('loading', true), clearable: bool('clearable'), loop: bool('loop'), portal: bool('portal'), required: bool('required'), invalid: bool('invalid'), matchTriggerWidth: bool('matchTriggerWidth', true, true),
    open: bool('open'), placeholder: text('placeholder'), emptyText: text('emptyText', '暂无选项'), loadingText: text('loadingText', '加载中'), clearLabel: text('clearLabel', '清空'),
    id: text('id') || undefined, name: text('name') || undefined, form: text('form') || undefined,
  };
}
