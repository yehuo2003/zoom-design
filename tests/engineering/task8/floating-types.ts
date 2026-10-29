import { computePosition, autoUpdate, offset, flip, shift, size } from '@floating-ui/dom';
declare const trigger: HTMLElement;
declare const popup: HTMLElement;
const update = () => { void computePosition(trigger, popup, { placement: 'bottom-start', middleware: [offset(4), flip(), shift(), size()] }); };
const cleanup: () => void = autoUpdate(trigger, popup, update);
cleanup();
