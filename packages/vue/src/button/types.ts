import type { AriaAttributes, ButtonHTMLAttributes } from 'vue';

export type ButtonVariant = 'solid' | 'outline' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonNativeType = 'button' | 'submit' | 'reset';

// Type native attrs without declaring them as runtime props: the SFC forwards them once.
export interface ButtonNativeAttributes extends Pick<ButtonHTMLAttributes,
  'id' | 'class' | 'style' | 'title' | 'name' | 'value' | 'form' | 'formaction' |
  'formmethod' | 'formenctype' | 'formtarget' | 'formnovalidate' | 'autofocus' |
  'tabindex' | 'dir' | 'onFocus' | 'onBlur' | 'onKeydown' | 'onKeyup' | keyof AriaAttributes> {
  [attribute: `data-${string}`]: string | number | boolean | undefined;
  onClickCapture?: (event: MouseEvent) => void;
  onClickPassive?: (event: MouseEvent) => void;
}
export interface ButtonProps extends /* @vue-ignore */ ButtonNativeAttributes {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: ButtonNativeType;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}
export type ButtonEmits = { click: [event: MouseEvent] };
export interface ButtonExpose {
  focus(options?: FocusOptions): void;
  blur(): void;
}
