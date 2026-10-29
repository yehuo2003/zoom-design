import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { createLayerContext, registerLayer, mountFloating, isWithin, focusElement } from '@zoom-design/dom';
import type { LayerContext } from '@zoom-design/dom';
import type { SelectProps } from '../select/types';
import type { SelectionState } from './useSelectionState';
const layersKey = Symbol('zoom-selection-layers');
interface AppLayers { context: LayerContext; users: number }
export function useSelectionDom(props: SelectProps, state: SelectionState, trigger: Ref<HTMLButtonElement | null>, popup: Ref<HTMLElement | null>, root: Ref<HTMLElement | null>, warn: (message: string) => void) {
  const target = shallowRef<HTMLElement | null>(null); const app = getCurrentInstance()!.appContext;
  const focusEvents = new WeakSet<Event>(); let outsideBlur = false; let outsideTimer: ReturnType<typeof setTimeout> | undefined;
  let stop = () => {};
  onMounted(() => {
    const owner = trigger.value!.ownerDocument;
    // Owned by this Vue app and only populated in a browser mount, never in SSR.
    const registry: Map<Document, AppLayers> = app.provides[layersKey] ?? (app.provides[layersKey] = new Map());
    const entry = registry.get(owner) ?? { context: createLayerContext(owner), users: 0 }; registry.set(owner, entry); entry.users++;
    function resolveTarget() {
      if (!state.normalized.value.portal) { target.value = null; return; }
      try {
        const candidate = typeof props.getPopupContainer === 'function' ? props.getPopupContainer(trigger.value!) : null;
        if (candidate instanceof owner.defaultView!.HTMLElement && candidate.isConnected && candidate.ownerDocument === owner && !popup.value?.contains(candidate)) target.value = candidate;
        else { target.value = null; warn('portal requires a connected same-document popup container; using inline'); }
      } catch { target.value = null; warn('popup container callback failed; using inline'); }
    }
    const resolve = watchEffect(resolveTarget, { flush: 'post' });
    const observer = new owner.defaultView!.MutationObserver(() => { if (target.value && !target.value.isConnected) resolveTarget(); });
    observer.observe(owner.documentElement, { childList: true, subtree: true });
    function dismiss(reason: 'escape' | 'outside', event: KeyboardEvent | PointerEvent) {
      if (reason === 'escape') { event.preventDefault(); event.stopPropagation(); }
      else { outsideBlur = true; clearTimeout(outsideTimer); outsideTimer = setTimeout(() => { outsideBlur = false; }, 0); }
      state.requestOpen(false, reason);
    }
    const layer = watch([state.opened, trigger, popup, root], (_values, _old, onCleanup) => {
      if (!state.opened.value || !trigger.value?.isConnected || !popup.value?.isConnected || !root.value) return;
      const handle = registerLayer(entry.context, { nodes: [trigger.value, popup.value, root.value], onDismiss: dismiss });
      onCleanup(handle.cleanup);
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
    const scroll = watch(state.highlighted, () => { void nextTick(() => { popup.value?.querySelector<HTMLElement>('[data-zoom-highlighted]')?.scrollIntoView?.({ block: 'nearest' }); }); }, { flush: 'post' });
    stop = () => { clearTimeout(outsideTimer); resolve(); layer(); interactions(); scroll(); observer.disconnect(); if (--entry.users === 0) registry.delete(owner); if (!registry.size) delete app.provides[layersKey]; };
  });
  onBeforeUnmount(() => stop());
  return { target,
    keydown(event: KeyboardEvent) {
      if (event.key === 'Tab' && state.opened.value) { outsideBlur = true; clearTimeout(outsideTimer); outsideTimer = setTimeout(() => { outsideBlur = false; }, 0); }
      state.keydown(event);
    },
    focus(options?: FocusOptions) { if (!state.disabled.value) focusElement(trigger.value, options); },
    blur() { trigger.value?.blur(); },
    focusout(event: FocusEvent) {
      if (focusEvents.has(event)) return; focusEvents.add(event);
      if (outsideBlur) return;
      const nodes = [trigger.value, popup.value, root.value].filter((node): node is HTMLElement => node !== null);
      if (!isWithin(nodes, event.relatedTarget)) state.requestOpen(false, 'blur');
    },
  };
}
