export { normalizeOptions, getSelectedOption } from './options.js';
export { moveHighlight, reconcileHighlight } from './navigation.js';
export { filterOptions, findTypeaheadMatch } from './filter.js';
export type {
  OptionValue, SelectionValue, SelectionOption, SelectionReason, SelectionChangeDetails,
  QueryChangeReason, QueryChangeDetails, OpenChangeReason, OpenChangeDetails,
  HighlightAction, OptionIssue, NormalizedOptions,
} from './types.js';
