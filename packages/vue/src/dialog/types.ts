import type { AriaAttributes, HTMLAttributes } from 'vue';
import type { DialogCloseDetails } from '@zoom-design/core';

type DialogNaming = Pick<AriaAttributes, 'aria-label' | 'aria-labelledby' | 'aria-describedby'>;

/** Native panel attributes with computed dialog semantics reserved for the component. */
export interface DialogPanelAttributes extends Pick<HTMLAttributes,
  'title' | 'dir' | 'onFocus' | 'onBlur' | 'onKeydown' | 'onKeyup' | 'onClick'> {
  class?: HTMLAttributes['class'];
  style?: HTMLAttributes['style'];
  [attribute: `data-${string}`]: string | number | boolean | undefined;
}

/** Controlled ZDialog props with an explicit same-document portal container. */
export interface DialogProps extends /* @vue-ignore */ DialogNaming {
  open?: boolean;
  modal?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  restoreFocus?: boolean;
  initialFocus?: () => HTMLElement | null;
  returnFocus?: () => HTMLElement | null;
  portal?: boolean;
  getContainer?: () => HTMLElement | null;
  closeLabel?: string;
  id?: string;
  panelAttrs?: DialogPanelAttributes;
  class?: HTMLAttributes['class'];
  style?: HTMLAttributes['style'];
  [attribute: `data-${string}`]: string | number | boolean | undefined;
}

export type DialogEmits = {
  'update:open': [open: false];
  'close-request': [details: DialogCloseDetails];
};

export interface DialogExpose {
  focus(options?: FocusOptions): void;
}

export interface DialogCloseSlotContext {
  requestClose(): void;
}

export type DialogSlots = {
  default?(): unknown;
  title?(): unknown;
  description?(): unknown;
  footer?(): unknown;
  close?(context: DialogCloseSlotContext): unknown;
};
