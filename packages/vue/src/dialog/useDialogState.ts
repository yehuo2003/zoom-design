import { onBeforeUnmount } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { DialogCloseDetails, DialogCloseReason } from '@zoom-design/core';
import type { normalizeDialog } from './normalize';
import { peekOverlaySession } from '../overlay/session';

type NormalizedDialog = ReturnType<typeof normalizeDialog>;
type DialogEmit = {
  (event: 'update:open', open: false): void;
  (event: 'close-request', details: DialogCloseDetails): void;
};

export function useDialogState(normalized: ComputedRef<NormalizedDialog>, panel: Readonly<Ref<HTMLElement | null>>, emit: DialogEmit) {
  const seenEvents = new WeakSet<Event>();
  let disposed = false;
  onBeforeUnmount(() => { disposed = true; });

  function requestClose(reason: DialogCloseReason, event?: Event) {
    const node = panel.value;
    if (disposed || !normalized.value.open || !node?.isConnected) return;
    if (reason === 'escape' && !normalized.value.closeOnEscape) return;
    if (reason === 'outside' && !normalized.value.closeOnOutside) return;

    const nativeEvent = event instanceof node.ownerDocument.defaultView!.Event ? event : undefined;
    if (nativeEvent) {
      if (seenEvents.has(nativeEvent)) return;
      const session = peekOverlaySession(node.ownerDocument);
      if (session && !session.claimCloseEvent(nativeEvent)) return;
      seenEvents.add(nativeEvent);
    }
    if (reason === 'escape') { nativeEvent?.preventDefault(); nativeEvent?.stopPropagation(); }
    emit('update:open', false);
    emit('close-request', { open: false, previousOpen: true, reason });
  }

  return { requestClose };
}
