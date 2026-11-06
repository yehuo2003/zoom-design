import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch, watchEffect } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { DialogCloseReason } from '@zoom-design/core';
import { useOverlayOwner, type OverlayOwner } from '../overlay/owner';
import { peekOverlaySession } from '../overlay/session';
import type { normalizeDialog } from './normalize';
import { containsComposed, deepActiveElement, focusAllowed, focusDialogInitial, validInitialTarget } from './focus';

type NormalizedDialog = ReturnType<typeof normalizeDialog>;
interface OpenCycle {
  readonly invoker: HTMLElement | null;
  initial: HTMLElement | null;
  initialResolved: boolean;
  panel: HTMLElement | null;
}

export function useDialogDom(normalized: ComputedRef<NormalizedDialog>, panel: Readonly<Ref<HTMLElement | null>>, root: Readonly<Ref<HTMLElement | null>>,
  onDismiss: (reason: DialogCloseReason, event: Event) => void, onError: (error: unknown) => void, warn: (message: string) => void) {
  let owner: OverlayOwner;
  let cycle: OpenCycle | null = null;
  let generation = 0;
  let unmounting = false;
  const target = shallowRef<HTMLElement | null>(null);
  const portalReady = shallowRef(false);
  let stopPortal = () => {};
  let lastInsideFocus: HTMLElement | null = null;
  let portalGeneration = 0;
  let portalRelocating = false;
  let pendingPortalFocus: HTMLElement | null = null;

  function setTarget(next: HTMLElement | null) {
    if (target.value === next) return;
    const prior = target.value;
    const rootNode = root.value;
    const active = rootNode ? deepActiveElement(rootNode.ownerDocument) : null;
    if (prior && rootNode) {
      if (active && containsComposed(rootNode, active)) pendingPortalFocus = active;
      else if (!rootNode.isConnected && lastInsideFocus && containsComposed(rootNode, lastInsideFocus)) pendingPortalFocus = lastInsideFocus;
      else pendingPortalFocus = null;
    }
    if (prior) portalRelocating = true;
    if (portalRelocating) owner.setRelocating(true);
    target.value = next;
    const token = ++portalGeneration;
    if (portalRelocating) void nextTick(() => {
      if (token !== portalGeneration) return;
      const focused = pendingPortalFocus;
      if (focused && normalized.value.open && root.value && containsComposed(root.value, focused)) {
        const modalScope = peekOverlaySession(focused.ownerDocument)?.topModalScope() ?? null;
        focusAllowed(focused, focused.ownerDocument, modalScope, null);
      }
      pendingPortalFocus = null;
      portalRelocating = false;
      owner.setRelocating(false);
    });
  }

  function resolveTarget() {
    const current = normalized.value;
    const rootNode = root.value;
    if (!current.open || !current.portal || !rootNode) { setTarget(null); return; }
    const ownerDocument = rootNode.ownerDocument;
    try {
      const candidate = current.getContainer?.();
      if (candidate instanceof ownerDocument.defaultView!.HTMLElement && candidate.isConnected &&
        candidate.ownerDocument === ownerDocument && !containsComposed(rootNode, candidate)) {
        setTarget(candidate);
      } else { setTarget(null); warn('portal requires a connected same-document external container; using inline'); }
    } catch { setTarget(null); warn('container callback failed; using inline'); }
  }

  function restore(cycleToClose: OpenCycle, callback: NormalizedDialog['returnFocus'], ownerDocument: Document) {
    const activeSession = peekOverlaySession(ownerDocument);
    const modalScope = activeSession?.topModalScope() ?? null;
    let custom: unknown = null;
    if (callback) {
      try { custom = callback(); }
      catch { warn('returnFocus callback threw; using the recorded invoker or parent'); }
      if (custom != null) {
        if (focusAllowed(custom, ownerDocument, modalScope, cycleToClose.panel)) return;
        warn('Invalid returnFocus target; using the recorded invoker or parent');
      }
    }
    if (focusAllowed(cycleToClose.invoker, ownerDocument, modalScope, cycleToClose.panel)) return;
    const parent = owner.parent;
    const parentScope = parent?.active ? parent.demand?.modal?.scope ?? parent.demand?.nodes[0] ?? null : null;
    if (!parentScope) return;
    const active = deepActiveElement(ownerDocument);
    if (active && containsComposed(parentScope, active) && focusAllowed(active, ownerDocument, modalScope, cycleToClose.panel)) return;
    focusAllowed(parentScope, ownerDocument, modalScope, cycleToClose.panel);
  }

  function endCycle() {
    const closing = cycle;
    cycle = null;
    if (!closing) { owner.clear(); return; }
    const token = ++generation;
    if (owner.active) {
      const ownerDocument = closing.panel?.ownerDocument ?? owner.demand?.document;
      const current = normalized.value;
      if (ownerDocument) {
        const session = peekOverlaySession(ownerDocument);
        session?.queueReturn(owner, current.restoreFocus ? () => restore(closing, current.returnFocus, ownerDocument) : null,
          () => generation === token && (unmounting || !normalized.value.open));
      }
    }
    owner.clear();
  }

  // Register before useOverlayOwner's disposal hook so unmount can record the return target.
  onBeforeUnmount(() => { unmounting = true; stopPortal(); owner.setRelocating(false); portalRelocating = false; pendingPortalFocus = null; lastInsideFocus = null; endCycle(); });
  owner = useOverlayOwner();

  watch([() => normalized.value.open, root], ([open, node], _before, onCleanup) => {
    if (!open || !node) { lastInsideFocus = null; return; }
    const record = (event: FocusEvent) => {
      const active = event.target;
      if (active instanceof node.ownerDocument.defaultView!.HTMLElement && containsComposed(node, active)) lastInsideFocus = active;
    };
    node.addEventListener('focusin', record);
    onCleanup(() => node.removeEventListener('focusin', record));
  }, { immediate: true, flush: 'post' });

  onMounted(() => {
    resolveTarget();
    const resolve = watchEffect(resolveTarget, { flush: 'post' });
    const observe = watch([() => normalized.value.open && normalized.value.portal, root], ([enabled, node], _before, onCleanup) => {
      if (!enabled || !node) return;
      const ownerDocument = node.ownerDocument;
      const observer = new ownerDocument.defaultView!.MutationObserver(() => {
        if (!target.value || !target.value.isConnected || root.value && containsComposed(root.value, target.value)) resolveTarget();
      });
      observer.observe(ownerDocument.documentElement, { childList: true, subtree: true });
      onCleanup(() => observer.disconnect());
    }, { immediate: true, flush: 'sync' });
    stopPortal = () => { resolve(); observe(); };
    void nextTick(() => { portalReady.value = true; });
  });

  watch(() => normalized.value.open, open => {
    if (open) {
      if (!cycle) {
        const ownerDocument = panel.value?.ownerDocument ?? root.value?.ownerDocument ?? (typeof document === 'undefined' ? null : document);
        cycle = { invoker: ownerDocument ? deepActiveElement(ownerDocument) : null, initial: null, initialResolved: false, panel: null };
      }
      generation++;
    } else if (cycle) {
      generation++;
    }
  }, { immediate: true, flush: 'sync' });

  watch([normalized, panel, root, target, portalReady], () => {
    const current = normalized.value;
    const panelNode = panel.value; const rootNode = root.value;
    if (!current.open) { endCycle(); return; }
    if (!portalReady.value) return;
    if (!panelNode?.isConnected || !rootNode?.isConnected) { owner.clear(); return; }
    if (!cycle) return;
    const openCycle = cycle;
    openCycle.panel = panelNode;
    if (!openCycle.initialResolved) {
      openCycle.initialResolved = true;
      if (current.initialFocus) {
        try {
          const target = current.initialFocus();
          if (target != null) {
            if (validInitialTarget(target, panelNode)) openCycle.initial = target;
            else warn('Invalid initialFocus target; using the first focusable item or panel');
          }
        } catch { warn('initialFocus callback threw; using the first focusable item or panel'); }
      }
    }
    const backdrop = current.modal ? rootNode.querySelector<HTMLElement>('.zoom-dialog__backdrop') : null;
    const active = current.modal && owner.active && !owner.modalScope ? deepActiveElement(panelNode.ownerDocument) : null;
    const modalInitial = active && validInitialTarget(active, panelNode) ? active : openCycle.initial;
    owner.setDemand({ document: panelNode.ownerDocument, nodes: [panelNode], visual: rootNode,
      ...(current.modal ? { modal: { scope: panelNode, allowedNodes: backdrop ? [backdrop] : [], initialFocus: modalInitial } } : {}),
      onDismiss: (reason, event) => { if (owner.active) onDismiss(reason, event); },
      onActivate: () => { if (cycle === openCycle && !normalized.value.modal) focusDialogInitial(panelNode, openCycle.initial); },
      onError,
    });
  }, { immediate: true, flush: 'post' });
  return { target };
}
