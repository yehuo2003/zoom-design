import type { ComboboxProps } from './types';
import { normalizeSelection } from '../selection/normalize';
export function normalizeCombobox(props: ComboboxProps) {
  const base = normalizeSelection(props);
  const issues = [...base.issues];
  const query = typeof props.query === 'string' ? props.query : '';
  if (props.query !== undefined && typeof props.query !== 'string') issues.push('Invalid query; using empty string');
  const minQueryLength = typeof props.minQueryLength === 'number' && Number.isInteger(props.minQueryLength) && props.minQueryLength >= 0 ? props.minQueryLength : 0;
  if (props.minQueryLength !== undefined && props.minQueryLength !== minQueryLength) issues.push('Invalid minQueryLength; using zero');
  const filterOption = typeof props.filterOption === 'function' ? props.filterOption : undefined;
  if (props.filterOption !== undefined && !filterOption) issues.push('Invalid filterOption; using default');
  return { ...base, query, minQueryLength, filterOption, issues };
}
