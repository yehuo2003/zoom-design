import { ZDialog } from '@zoom-design/vue';
import { ZDialog as SubpathDialog } from '@zoom-design/vue/dialog';
import type { DialogProps as RootDialogProps, DialogExpose as RootDialogExpose, DialogSlots as RootDialogSlots } from '@zoom-design/vue';
import type {
  DialogProps, DialogPanelAttributes, DialogEmits, DialogExpose,
  DialogSlots, DialogCloseSlotContext,
} from '@zoom-design/vue/dialog';
import type { DialogCloseDetails, DialogCloseReason } from '@zoom-design/core';

type Root = InstanceType<typeof ZDialog>;
type Subpath = InstanceType<typeof SubpathDialog>;
const attrs: DialogPanelAttributes = {
  title: 'Read before closing', dir: 'rtl', 'data-kind': 'confirmation',
  onFocus: event => { const target: EventTarget | null = event.target; void target; },
};
const props: Root['$props'] = {
  open: false, modal: true, closeOnEscape: true, closeOnOutside: true,
  restoreFocus: true, portal: true, getContainer: () => document.body,
  initialFocus: () => document.querySelector<HTMLElement>('#first'),
  returnFocus: () => document.querySelector<HTMLElement>('#trigger'),
  closeLabel: 'Close', id: 'settings', 'aria-label': 'Settings',
  'aria-labelledby': 'settings-heading', 'aria-describedby': '',
  panelAttrs: attrs, class: 'brand', style: { color: 'red' }, 'data-flow': 1,
  'onUpdate:open': open => { const closed: false = open; void closed; },
  'onClose-request': details => { const reason: DialogCloseReason = details.reason; void reason; },
};
const subpath: Subpath['$props'] = props;
const own: DialogProps = subpath;
const rootOwn: RootDialogProps = own;
const update: DialogEmits['update:open'] = [false];
const details: DialogCloseDetails = { open: false, previousOpen: true, reason: 'close-button' };
const request: DialogEmits['close-request'] = [details];
const slotContext: DialogCloseSlotContext = { requestClose() {} };
const slots: DialogSlots = {
  default: () => 'Body', title: () => 'Settings', description: () => 'Description',
  footer: () => 'Actions', close: ({ requestClose }) => requestClose(),
};
declare const instance: Root;
const expose: DialogExpose = instance;
const rootExpose: RootDialogExpose = expose;
const rootSlots: RootDialogSlots = slots;
expose.focus({ preventScroll: true });
instance.$emit('update:open', false);
instance.$emit('close-request', details);
instance.$slots.close?.(slotContext);
void [rootOwn, rootExpose, rootSlots, update, request];
