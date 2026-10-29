import { normalizeOptions, getSelectedOption, moveHighlight, reconcileHighlight, filterOptions, findTypeaheadMatch } from '@zoom-design/core';
import type {
  OptionValue, SelectionValue, SelectionOption, SelectionReason, SelectionChangeDetails,
  QueryChangeReason, QueryChangeDetails, OpenChangeReason, OpenChangeDetails,
  HighlightAction, OptionIssue, NormalizedOptions,
} from '@zoom-design/core';

const input: readonly SelectionOption<number>[] = [{ value: 0, label: 'Zero' }, { value: 1, label: 'One', disabled: true }];
const normalized: NormalizedOptions = normalizeOptions(input);
const value: SelectionValue = '';
const primitive: OptionValue = 0;
const selected: SelectionOption<number> | null = getSelectedOption(input, 0);
const highlight: number | null = moveHighlight(input, null, 'next', true);
const stable: number | null = reconcileHighlight(input, 0, 1);
const filtered: readonly SelectionOption<number>[] = filterOptions(input, 'z');
const typeahead: number | null = findTypeaheadMatch(input, null, 'z');
const reason: SelectionReason = 'option'; const action: HighlightAction = 'last';
const details: SelectionChangeDetails<number> = { value: 0, previousValue: null, option: input[0]!, reason };
const queryReason: QueryChangeReason = 'external-sync';
const query: QueryChangeDetails = { query: 'Zero', previousQuery: '', reason: queryReason };
const openReason: OpenChangeReason = 'disabled';
const open: OpenChangeDetails = { open: false, previousOpen: true, reason: openReason };
const issue: OptionIssue = { index: 0, code: 'invalid-value' };
void [normalized, value, primitive, selected, highlight, stable, filtered, typeahead, action, details, query, open, issue];
