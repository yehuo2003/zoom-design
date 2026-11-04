import type { AriaAttributes, InputHTMLAttributes, HTMLAttributes } from 'vue';
import type { SelectionOption, SelectionValue, SelectionChangeDetails, QueryChangeDetails, OpenChangeDetails } from '@zoom-design/core';
import type { Placement } from '@zoom-design/dom';
export type ComboboxSize = 'sm' | 'md' | 'lg';
type Naming = Pick<AriaAttributes, 'aria-label' | 'aria-labelledby' | 'aria-describedby'>;
export interface ComboboxInputAttributes extends Pick<InputHTMLAttributes, 'title' | 'autofocus' | 'tabindex' | 'dir' | 'autocomplete' | 'inputmode' | 'spellcheck' | 'onFocus' | 'onBlur' | 'onKeydown' | 'onKeyup' | 'onClick' | 'onInput' | 'onCompositionstart' | 'onCompositionupdate' | 'onCompositionend'>, Naming {
  class?: HTMLAttributes['class']; style?: HTMLAttributes['style'];
  [attribute: `data-${string}`]: string | number | boolean | undefined;
}
export interface ComboboxProps extends /* @vue-ignore */ Naming {
  modelValue?: SelectionValue; options?: readonly SelectionOption[]; size?: ComboboxSize;
  disabled?: boolean; readonly?: boolean; loading?: boolean; clearable?: boolean;
  placeholder?: string; emptyText?: string; loadingText?: string; clearLabel?: string;
  query?: string; filterOption?: (query: string, option: SelectionOption) => boolean; minQueryLength?: number;
  open?: boolean; loop?: boolean; placement?: Placement; offset?: number; matchTriggerWidth?: boolean;
  portal?: boolean; getPopupContainer?: (trigger: HTMLElement) => HTMLElement | null;
  id?: string; name?: string; form?: string; required?: boolean; invalid?: boolean;
  inputAttrs?: ComboboxInputAttributes;
  class?: HTMLAttributes['class']; style?: HTMLAttributes['style'];
  [attribute: `data-${string}`]: string | number | boolean | undefined;
}
export type ComboboxEmits = { 'update:modelValue': [value: SelectionValue]; change: [details: SelectionChangeDetails]; 'update:query': [query: string]; 'query-change': [details: QueryChangeDetails]; 'update:open': [open: boolean]; 'open-change': [details: OpenChangeDetails] };
export interface ComboboxExpose { focus(options?: FocusOptions): void; blur(): void }
export interface ComboboxOptionContext { option: SelectionOption; selected: boolean; highlighted: boolean }
