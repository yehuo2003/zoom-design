import type { DialogCloseDetails, DialogCloseReason } from '../../src/index.js';

const reasons: readonly DialogCloseReason[] = ['escape', 'outside', 'close-button'];
const details: DialogCloseDetails = { open: false, previousOpen: true, reason: reasons[0]! };
const open: false = details.open;
const previousOpen: true = details.previousOpen;
void [open, previousOpen];
