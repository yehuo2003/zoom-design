import { mountFloating, registerLayer, createLayerContext, trapFocus, createModalContext, getFormOwner, observeFormBridge } from '@zoom-design/dom';
declare const element: HTMLElement, input: HTMLInputElement;
mountFloating(element, element, { placement: 'left' });
mountFloating(element, element, { offset: '4' });
registerLayer(createLayerContext(document), { nodes: [window], onDismiss() {} });
registerLayer(createLayerContext(document), { nodes: [element], onDismiss(reason: 'escape') { void reason; } });
trapFocus(createModalContext(document), element, { initialFocus: window });
getFormOwner(element);
observeFormBridge({ proxy: input, submission: input, trigger: element, onReset() {}, onInvalid() {} });
