import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { isFieldsetDisabled, observeFormBridge } from '@zoom-design/dom';
import type { SelectionState } from './useSelectionState';
export function useSelectionForm(state: SelectionState, proxy: Ref<HTMLSelectElement | null>, submission: Ref<HTMLInputElement | null>, trigger: Ref<HTMLButtonElement | null>, nativeDisabled: Ref<boolean>) {
  const nativeInvalid = shallowRef(false); let stop = () => {};
  function sync() {
    if (!proxy.value) return;
    const owner = proxy.value.ownerDocument;
    nativeDisabled.value = isFieldsetDisabled(proxy.value);
    proxy.value.value = state.selected.value ? '__zoom_selected__' : '';
    if (state.normalized.value.readonly) proxy.value.setCustomValidity('');
    if (state.selected.value || !state.normalized.value.required || state.normalized.value.readonly) nativeInvalid.value = false;
    if (submission.value) submission.value.value = state.selected.value ? String(state.normalized.value.value) : '';
    void owner;
  }
  onMounted(() => {
    const select = proxy.value!; const input = submission.value!; const button = trigger.value!;
    const bridge = observeFormBridge({ proxy: select, submission: input, trigger: button,
      onInvalid() { nativeInvalid.value = true; },
      onReset() { nativeInvalid.value = false; state.reset(); sync(); void nextTick(sync); }, onOwnerChange: sync,
    });
    const observer = new select.ownerDocument.defaultView!.MutationObserver(sync);
    observer.observe(select.ownerDocument.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'form', 'id', 'name'] });
    const root = select.getRootNode(); if (root !== select.ownerDocument) observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'form', 'id', 'name'] });
    const unwatch = watchEffect(() => { void state.selected.value; void state.normalized.value; sync(); bridge.refresh(); }, { flush: 'post' });
    stop = () => { unwatch(); observer.disconnect(); bridge.cleanup(); }; sync();
  });
  onBeforeUnmount(() => stop());
  return { invalid: computed(() => nativeInvalid.value || state.normalized.value.invalid), sync };
}
