import type { DialogCloseDetails, DialogCloseReason } from '../../src/index.js';

const programmatic: DialogCloseReason = 'programmatic';
const open: DialogCloseDetails = { open: true, previousOpen: true, reason: 'escape' };
const previousOpen: DialogCloseDetails = { open: false, previousOpen: false, reason: 'outside' };
const reason: DialogCloseDetails = { open: false, previousOpen: true, reason: 'blur' };
declare const details: DialogCloseDetails;
details.open = false;
details.reason = 'outside';
void [programmatic, open, previousOpen, reason];
