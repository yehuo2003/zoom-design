import { onBeforeUnmount, watch } from 'vue';
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
    const token = ++generation;
    if (closing && owner.active) {
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
  onBeforeUnmount(() => { unmounting = true; endCycle(); });
  owner = useOverlayOwner();

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

  watch([normalized, panel, root], () => {
    const current = normalized.value;
    const panelNode = panel.value; const rootNode = root.value;
    if (!current.open) { endCycle(); return; }
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
}
