import type { AriaAttributes, ButtonHTMLAttributes, HTMLAttributes } from 'vue';
import type { SelectionOption, SelectionValue, SelectionChangeDetails, OpenChangeDetails } from '@zoom-design/core';
import type { Placement } from '@zoom-design/dom';
export type SelectSize = 'sm' | 'md' | 'lg';
type Naming = Pick<AriaAttributes, 'aria-label' | 'aria-labelledby' | 'aria-describedby'>;
export interface SelectTriggerAttributes extends Pick<ButtonHTMLAttributes, 'title' | 'autofocus' | 'tabindex' | 'dir' | 'onFocus' | 'onBlur' | 'onKeydown' | 'onKeyup' | 'onClick'>, Naming {
  class?: HTMLAttributes['class']; style?: HTMLAttributes['style'];
  [attribute: `data-${string}`]: string | number | boolean | undefined;
}
export interface SelectProps extends /* @vue-ignore */ Naming {
  modelValue?: SelectionValue; options?: readonly SelectionOption[]; size?: SelectSize;
  disabled?: boolean; readonly?: boolean; loading?: boolean; clearable?: boolean;
  placeholder?: string; emptyText?: string; loadingText?: string; clearLabel?: string;
  open?: boolean; loop?: boolean; placement?: Placement; offset?: number; matchTriggerWidth?: boolean;
  portal?: boolean; getPopupContainer?: (trigger: HTMLElement) => HTMLElement | null;
  id?: string; name?: string; form?: string; required?: boolean; invalid?: boolean;
  triggerAttrs?: SelectTriggerAttributes;
  class?: HTMLAttributes['class']; style?: HTMLAttributes['style'];
  [attribute: `data-${string}`]: string | number | boolean | undefined;
}
export type SelectEmits = { 'update:modelValue': [value: SelectionValue]; change: [details: SelectionChangeDetails]; 'update:open': [open: boolean]; 'open-change': [details: OpenChangeDetails] };
export interface SelectExpose { focus(options?: FocusOptions): void; blur(): void }
export interface SelectOptionContext { option: SelectionOption; selected: boolean; highlighted: boolean }
export interface SelectValueContext { option: SelectionOption | null; value: SelectionValue }
