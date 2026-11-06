import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { mountFloating, isWithin, focusElement } from '@zoom-design/dom';
import type { SelectProps } from '../select/types';
import type { SelectionState } from './useSelectionState';
import { useOverlayOwner } from '../overlay/owner';
export function useSelectionDom(props: SelectProps, state: Pick<SelectionState, 'normalized' | 'opened' | 'disabled' | 'highlighted' | 'requestOpen' | 'keydown'>, trigger: Ref<HTMLElement | null>, popup: Ref<HTMLElement | null>, root: Ref<HTMLElement | null>, warn: (message: string) => void) {
  const target = shallowRef<HTMLElement | null>(null);
  const overlayOwner = useOverlayOwner();
  const focusEvents = new WeakSet<Event>(); let outsideBlur = false; let outsideTimer: ReturnType<typeof setTimeout> | undefined;
  let migrating = false;
  let stop = () => {};
  onMounted(() => {
    const owner = trigger.value!.ownerDocument;
    function setTarget(next: HTMLElement | null) {
      if (target.value === next) return;
      target.value = next;
      migrating = true;
      void nextTick(() => { migrating = false; });
    }
    function resolveTarget() {
      if (!state.opened.value || !state.normalized.value.portal) { setTarget(null); return; }
      try {
        const candidate = typeof props.getPopupContainer === 'function' ? props.getPopupContainer(trigger.value!) : null;
        if (candidate instanceof owner.defaultView!.HTMLElement && candidate.isConnected && candidate.ownerDocument === owner && !popup.value?.contains(candidate)) setTarget(candidate);
        else { setTarget(null); warn('portal requires a connected same-document popup container; using inline'); }
      } catch { setTarget(null); warn('popup container callback failed; using inline'); }
    }
    const resolve = watchEffect(resolveTarget, { flush: 'post' });
    const portalObserver = watch(state.opened, (open, _before, onCleanup) => {
      if (!open) return;
      const observer = new owner.defaultView!.MutationObserver(() => { if (target.value && !target.value.isConnected) resolveTarget(); });
      observer.observe(owner.documentElement, { childList: true, subtree: true });
      onCleanup(() => observer.disconnect());
    }, { flush: 'post', immediate: true });
    function dismiss(reason: 'escape' | 'outside', event: KeyboardEvent | PointerEvent) {
      if (reason === 'escape') { event.preventDefault(); event.stopPropagation(); }
      else { outsideBlur = true; clearTimeout(outsideTimer); outsideTimer = setTimeout(() => { outsideBlur = false; }, 0); }
      state.requestOpen(false, reason);
    }
    const layer = watch([state.opened, trigger, popup, root, target], () => {
      if (!state.opened.value || !trigger.value?.isConnected || !popup.value?.isConnected || !root.value?.isConnected) { overlayOwner.clear(); return; }
      overlayOwner.setDemand({ document: owner, nodes: [trigger.value, popup.value, root.value], visual: popup.value,
        onDismiss: dismiss, onError: error => warn(`Cannot register selection popup: ${String(error)}`),
      });
    }, { flush: 'post', immediate: true });
    const interactions = watch([state.opened, trigger, popup, target, () => state.normalized.value.placement, () => state.normalized.value.offset, () => state.normalized.value.matchTriggerWidth], (_values, _old, onCleanup) => {
      let active = true; let cleanup = () => {};
      onCleanup(() => { active = false; cleanup(); });
      if (!state.opened.value) return;
      void nextTick(() => {
        if (!active || !trigger.value?.isConnected || !popup.value?.isConnected) return;
        let floating: ReturnType<typeof mountFloating> | undefined;
        try {
          floating = mountFloating(trigger.value, popup.value, { placement: state.normalized.value.placement, offset: state.normalized.value.offset, matchTriggerWidth: state.normalized.value.matchTriggerWidth });
          cleanup = () => floating?.cleanup();
        } catch (error) { floating?.cleanup(); warn(`Cannot mount selection popup: ${String(error)}`); }
      });
    }, { flush: 'post', immediate: true });
    const scroll = watch([state.opened, popup, target, state.highlighted, () => state.normalized.value.options], (_values, _old, onCleanup) => {
      let active = true; onCleanup(() => { active = false; });
      void nextTick(() => {
        const list = popup.value;
        if (!active || !state.opened.value || !list?.isConnected) return;
        const option = list.querySelector<HTMLElement>('[data-zoom-highlighted]'); if (!option) return;
        const listRect = list.getBoundingClientRect(); const optionRect = option.getBoundingClientRect();
        const visibleTop = listRect.top + list.clientTop; const visibleBottom = visibleTop + list.clientHeight;
        if (optionRect.top < visibleTop) list.scrollTop -= visibleTop - optionRect.top;
        else if (optionRect.bottom > visibleBottom) list.scrollTop += optionRect.bottom - visibleBottom;
      });
    }, { flush: 'post', immediate: true });
    stop = () => { clearTimeout(outsideTimer); resolve(); portalObserver(); layer(); interactions(); scroll(); overlayOwner.clear(); };
  });
  onBeforeUnmount(() => stop());
  return { target,
    keydown(event: KeyboardEvent) {
      if (event.key === 'Tab') { outsideBlur = true; clearTimeout(outsideTimer); outsideTimer = setTimeout(() => { outsideBlur = false; }, 0); }
      state.keydown(event);
    },
    focus(options?: FocusOptions) { if (!state.disabled.value) focusElement(trigger.value, options); },
    blur() { trigger.value?.blur(); },
    focusout(event: FocusEvent) {
      if (focusEvents.has(event)) return; focusEvents.add(event);
      if (outsideBlur || migrating || overlayOwner.relocatingInChain || !root.value?.isConnected || target.value && !target.value.isConnected) return;
      const nodes = [trigger.value, popup.value, root.value].filter((node): node is HTMLElement => node !== null);
      if (event.relatedTarget === null) {
        void nextTick(() => {
          if (!state.opened.value || outsideBlur || migrating || overlayOwner.relocatingInChain || !root.value?.isConnected || target.value && !target.value.isConnected) return;
          if (!isWithin(nodes, trigger.value?.ownerDocument.activeElement ?? null)) state.requestOpen(false, 'blur');
        });
      } else if (!isWithin(nodes, event.relatedTarget)) state.requestOpen(false, 'blur');
    },
  };
}
