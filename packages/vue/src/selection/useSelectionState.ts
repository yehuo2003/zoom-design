import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { getSelectedOption, moveHighlight, reconcileHighlight, findTypeaheadMatch } from '@zoom-design/core';
import type { SelectionValue, SelectionOption, SelectionChangeDetails, SelectionReason, OpenChangeDetails, OpenChangeReason } from '@zoom-design/core';
import type { SelectProps } from '../select/types';
import { normalizeSelection } from './normalize';
export function useSelectionState(props: SelectProps, nativeDisabled: Ref<boolean>, events: { value(value: SelectionValue, details: SelectionChangeDetails): void; open(value: boolean, details: OpenChangeDetails): void }, warn: (message: string) => void) {
  const normalized = computed(() => normalizeSelection(props));
  watch(() => normalized.value.issues, issues => issues.forEach(warn), { immediate: true });
  const controlled = props.open !== undefined; const internalOpen = shallowRef(false); const highlight = shallowRef<SelectionValue>(null);
  const opened = computed(() => controlled ? normalized.value.open : internalOpen.value);
  const disabled = computed(() => normalized.value.disabled || nativeDisabled.value);
  const blocked = computed(() => disabled.value || normalized.value.readonly || normalized.value.loading);
  const selected = computed(() => getSelectedOption(normalized.value.options, normalized.value.value));
  const highlighted = computed(() => opened.value ? reconcileHighlight(normalized.value.options, highlight.value, normalized.value.value) : null);
  let initialEdge: 'first' | 'last' = 'first'; let buffer = ''; let timer: ReturnType<typeof setTimeout> | undefined; let pendingMatch: SelectionValue | undefined;
  const clearBuffer = () => { buffer = ''; clearTimeout(timer); timer = undefined; pendingMatch = undefined; };
  watch(() => props.open, value => { if ((value !== undefined) !== controlled) warn('open control mode cannot change during an instance'); });
  watch([opened, () => normalized.value.options, () => normalized.value.value], ([open], [before]) => {
    if (!open) { highlight.value = null; clearBuffer(); return; }
    const options = normalized.value.options;
    highlight.value = !before ? (pendingMatch !== undefined ? reconcileHighlight(options, pendingMatch, normalized.value.value) : selected.value && !selected.value.disabled ? selected.value.value : moveHighlight(options, null, initialEdge)) : reconcileHighlight(options, highlight.value, normalized.value.value);
    pendingMatch = undefined;
    initialEdge = 'first';
  }, { flush: 'sync' });
  function requestOpen(next: boolean, reason: OpenChangeReason) {
    if (next === opened.value || (next && blocked.value)) return;
    const previousOpen = opened.value;
    if (!controlled) internalOpen.value = next;
    events.open(next, { open: next, previousOpen, reason });
  }
  watch(blocked, (block, before) => { if (block && !before && opened.value) requestOpen(false, 'disabled'); });
  function requestValue(next: SelectionValue, reason: SelectionReason) {
    if (next === normalized.value.value) return;
    events.value(next, { value: next, previousValue: normalized.value.value, option: getSelectedOption(normalized.value.options, next), reason });
  }
  function choose(option: SelectionOption) { if (blocked.value || option.disabled) return; requestValue(option.value, 'option'); requestOpen(false, 'option'); }
  function clear() { if (blocked.value) return; requestValue(null, 'clear'); requestOpen(false, 'clear'); }
  function reset() { clearBuffer(); requestValue(null, 'reset'); requestOpen(false, 'reset'); }
  function keydown(event: KeyboardEvent) {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    if (key === 'Tab') { requestOpen(false, 'blur'); return; }
    if (key === 'Escape') { if (opened.value) { event.preventDefault(); event.stopPropagation(); requestOpen(false, 'escape'); } return; }
    if (blocked.value) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
      if (!opened.value && (key === 'Home' || key === 'End')) return;
      event.preventDefault();
      if (!opened.value) { initialEdge = key === 'ArrowUp' ? 'last' : 'first'; requestOpen(true, 'keyboard'); return; }
      if (key === 'Enter' || key === ' ') { const option = getSelectedOption(normalized.value.options, highlighted.value); if (option) choose(option); return; }
      highlight.value = moveHighlight(normalized.value.options, highlighted.value, key === 'ArrowDown' ? 'next' : key === 'ArrowUp' ? 'previous' : key === 'Home' ? 'first' : 'last', normalized.value.loop); return;
    }
    if ([...key].length === 1 && key !== ' ') {
      event.preventDefault();
      buffer += key; clearTimeout(timer); timer = setTimeout(clearBuffer, 500);
      const match = findTypeaheadMatch(normalized.value.options, highlighted.value, buffer);
      if (!opened.value) { pendingMatch = match ?? undefined; requestOpen(true, 'keyboard'); void nextTick(() => { pendingMatch = undefined; }); }
      if (match !== null) highlight.value = match;
    }
  }
  onBeforeUnmount(clearBuffer);
  return { normalized, opened, disabled, blocked, selected, highlighted, requestOpen, choose, clear, reset, keydown,
    point(option: SelectionOption) { if (!blocked.value && !option.disabled) highlight.value = option.value; },
    toggle() { requestOpen(!opened.value, 'trigger'); },
  };
}
export type SelectionState = ReturnType<typeof useSelectionState>;
