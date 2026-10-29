export type Cleanup = () => void;
export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
export interface FloatingOptions { readonly placement?: Placement; readonly offset?: number; readonly matchTriggerWidth?: boolean; readonly onError?: (error: unknown) => void }
export interface FloatingHandle { update(): Promise<void>; cleanup(): void }
export interface LayerContext { readonly ownerDocument: Document }
export interface LayerOptions {
  readonly nodes: readonly HTMLElement[]; readonly parent?: LayerHandle;
  readonly onDismiss: (reason: 'escape' | 'outside', event: KeyboardEvent | PointerEvent) => void;
  readonly closeOnEscape?: boolean; readonly closeOnOutside?: boolean;
}
export interface LayerHandle { cleanup(): void }
export interface ModalContext { readonly ownerDocument: Document }
export interface ModalOptions { readonly scope: HTMLElement; readonly allowedNodes?: readonly HTMLElement[] }
export interface FocusTrapOptions { readonly initialFocus?: HTMLElement | null }
export interface FormBridgeOptions {
  readonly proxy: HTMLSelectElement; readonly submission: HTMLInputElement; readonly trigger: HTMLElement;
  readonly onReset: (event: Event) => void; readonly onInvalid: (event: Event) => void;
  readonly onOwnerChange?: (owner: HTMLFormElement | null) => void;
}
export interface FormBridgeHandle { refresh(): void; cleanup(): void }
