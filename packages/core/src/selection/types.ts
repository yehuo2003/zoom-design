export type OptionValue = string | number;
export type SelectionValue = OptionValue | null;
export interface SelectionOption<V extends OptionValue = OptionValue> {
  readonly value: V;
  readonly label: string;
  readonly disabled?: boolean;
}
export type SelectionReason = 'option' | 'clear' | 'reset';
export interface SelectionChangeDetails<V extends OptionValue = OptionValue> {
  readonly value: V | null;
  readonly previousValue: V | null;
  readonly option: SelectionOption<V> | null;
  readonly reason: SelectionReason;
}
export type QueryChangeReason = 'input' | 'option' | 'clear' | 'escape' | 'blur' | 'reset' | 'external-sync';
export interface QueryChangeDetails { readonly query: string; readonly previousQuery: string; readonly reason: QueryChangeReason }
export type OpenChangeReason = 'trigger' | 'keyboard' | 'input' | 'option' | 'escape' | 'outside' | 'blur' | 'clear' | 'reset' | 'disabled';
export interface OpenChangeDetails { readonly open: boolean; readonly previousOpen: boolean; readonly reason: OpenChangeReason }
export type HighlightAction = 'next' | 'previous' | 'first' | 'last';
export interface OptionIssue {
  readonly index: number;
  readonly code: 'invalid-option' | 'invalid-value' | 'invalid-label' | 'invalid-disabled' | 'duplicate-value';
}
export interface NormalizedOptions<V extends OptionValue = OptionValue> {
  readonly options: readonly SelectionOption<V>[];
  readonly issues: readonly OptionIssue[];
}
