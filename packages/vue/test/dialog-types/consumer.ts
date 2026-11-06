import type {
  DialogProps, DialogPanelAttributes, DialogEmits, DialogExpose,
  DialogSlots, DialogCloseSlotContext,
} from '../../src/dialog/types';
import type { DialogCloseDetails } from '@zoom-design/core';

const attrs: DialogPanelAttributes = {
  title: 'Read before closing', dir: 'rtl', 'data-kind': 'confirmation',
  onFocus: event => { const target: EventTarget | null = event.target; void target; },
};
const props: DialogProps = {
  open: false, modal: true, closeOnEscape: true, closeOnOutside: true,
  restoreFocus: true, portal: true, getContainer: () => document.body,
  initialFocus: () => document.querySelector<HTMLElement>('#first'),
  returnFocus: () => document.querySelector<HTMLElement>('#trigger'),
  closeLabel: 'Close', id: 'settings', 'aria-label': 'Settings',
  'aria-labelledby': 'settings-heading', 'aria-describedby': '',
  panelAttrs: attrs, class: 'brand', style: { color: 'red' }, 'data-flow': 1,
};
const update: DialogEmits['update:open'] = [false];
const details: DialogCloseDetails = { open: false, previousOpen: true, reason: 'close-button' };
const request: DialogEmits['close-request'] = [details];
const slotContext: DialogCloseSlotContext = { requestClose() {} };
const slots: DialogSlots = {
  default: () => 'Body', title: () => 'Settings', description: () => 'Description',
  footer: () => 'Actions', close: ({ requestClose }) => requestClose(),
};
declare const expose: DialogExpose;
expose.focus({ preventScroll: true });
slotContext.requestClose();
void [props, update, request, slots];
