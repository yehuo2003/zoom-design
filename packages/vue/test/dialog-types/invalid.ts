import type { DialogProps, DialogPanelAttributes, DialogEmits, DialogExpose, DialogCloseSlotContext } from '../../src/dialog/types';
import type { DialogCloseDetails, DialogCloseReason } from '@zoom-design/core';

const uncontrolled: DialogProps = { defaultOpen: true };
const programmatic: DialogCloseReason = 'programmatic';
const invalidUpdate: DialogEmits['update:open'] = [true];
declare const expose: DialogExpose;
expose.close();
const role: DialogPanelAttributes = { role: 'alertdialog' };
const ariaModal: DialogPanelAttributes = { 'aria-modal': true };
const inlineHandler: DialogPanelAttributes = { onClick: 'alert(1)' };
declare const closeSlot: DialogCloseSlotContext;
closeSlot.requestClose('programmatic');
const focus: DialogProps = { initialFocus: () => 42 };
const container: DialogProps = { getContainer: (trigger: HTMLElement) => trigger };
declare const details: DialogCloseDetails;
details.open = false;
void [uncontrolled, programmatic, invalidUpdate, role, ariaModal, inlineHandler, focus, container];
