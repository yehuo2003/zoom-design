import { computed, nextTick, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { filterOptions, getSelectedOption, moveHighlight, reconcileHighlight } from '@zoom-design/core';
import type { SelectionValue, SelectionOption, SelectionReason, SelectionChangeDetails, QueryChangeDetails, QueryChangeReason, OpenChangeDetails, OpenChangeReason } from '@zoom-design/core';
import type { ComboboxProps } from './types';
import { normalizeCombobox } from './normalize';
interface Events { value(value: SelectionValue, details: SelectionChangeDetails): void; query(query: string, details: QueryChangeDetails): void; open(open: boolean, details: OpenChangeDetails): void }
export function useComboboxState(props: ComboboxProps, nativeDisabled: Ref<boolean>, events: Events, warn: (message: string) => void) {
  const normalized = computed(() => normalizeCombobox(props));
  watch(() => normalized.value.issues, issues => issues.forEach(warn), { immediate: true });
  const selected = computed(() => getSelectedOption(normalized.value.options, normalized.value.value));
  const label = computed(() => selected.value?.label ?? '');
  const queryControlled = props.query !== undefined; const openControlled = props.open !== undefined;
  const internalQuery = shallowRef(label.value); const internalOpen = shallowRef(false);
  const query = computed(() => queryControlled ? normalized.value.query : internalQuery.value);
  const opened = computed(() => openControlled ? normalized.value.open : internalOpen.value);
  const disabled = computed(() => normalized.value.disabled || nativeDisabled.value);
  const blocked = computed(() => disabled.value || normalized.value.readonly || normalized.value.loading);
  const highlight = shallowRef<SelectionValue>(null); const editVersion = shallowRef(0); const composing = shallowRef(false);
  const result = computed(() => {
    const n = normalized.value;
    if (query.value.length < n.minQueryLength) return { options: [] as readonly SelectionOption[], error: false };
    try { return { options: n.filterOption ? n.options.filter(option => n.filterOption!(query.value, option)) : filterOptions(n.options, query.value), error: false }; }
    catch { return { options: [] as readonly SelectionOption[], error: true }; }
  });
  watch(() => result.value.error, error => { if (error) warn('filterOption failed; using empty results'); }, { immediate: true });
  const filtered = computed(() => result.value.options);
  const highlighted = computed(() => opened.value && highlight.value !== null ? reconcileHighlight(filtered.value, highlight.value, normalized.value.value) : null);
  watch([filtered, opened], () => { if (!opened.value) highlight.value = null; else if (highlight.value !== null) highlight.value = reconcileHighlight(filtered.value, highlight.value, normalized.value.value); }, { flush: 'sync' });
  watch(() => props.query, value => { if ((value !== undefined) !== queryControlled) warn('query control mode cannot change during an instance'); });
  watch(() => props.open, value => { if ((value !== undefined) !== openControlled) warn('open control mode cannot change during an instance'); });
  function invalidate() { editVersion.value++; composing.value = false; }
  function requestQuery(next: string, reason: QueryChangeReason) {
    if (next === query.value) return;
    const previousQuery = query.value; if (!queryControlled) internalQuery.value = next;
    events.query(next, { query: next, previousQuery, reason });
  }
  let confirmation: { value: SelectionValue; label: string } | undefined;
  // Invalidate IME immediately, but synchronize text once from the final render inputs.
  watch([() => normalized.value.value, label], invalidate, { flush: 'sync' });
  watch([() => normalized.value.value, label], ([value, nextLabel]) => {
    if (confirmation?.value === value && confirmation.label === nextLabel) { confirmation = undefined; return; }
    confirmation = undefined; requestQuery(nextLabel, 'external-sync');
  }, { flush: 'post' });
  function requestOpen(next: boolean, reason: OpenChangeReason) {
    if (!next && (reason === 'escape' || reason === 'outside' || reason === 'blur')) { invalidate(); requestQuery(label.value, reason === 'escape' ? 'escape' : 'blur'); }
    if (next === opened.value || (next && blocked.value)) return;
    const previousOpen = opened.value; if (!openControlled) internalOpen.value = next;
    events.open(next, { open: next, previousOpen, reason });
  }
  watch(blocked, (block, before) => { if (block && !before) { invalidate(); requestOpen(false, 'disabled'); } });
  function requestValue(next: SelectionValue, reason: SelectionReason) {
    if (next === normalized.value.value) return;
    events.value(next, { value: next, previousValue: normalized.value.value, option: getSelectedOption(normalized.value.options, next), reason });
  }
  function choose(option: SelectionOption) {
    if (blocked.value || option.disabled || !filtered.value.some(item => item.value === option.value)) return;
    invalidate(); confirmation = { value: option.value, label: option.label }; requestQuery(option.label, 'option'); requestValue(option.value, 'option'); requestOpen(false, 'option');
    void nextTick(() => { confirmation = undefined; });
  }
  function clear() { if (blocked.value) return; invalidate(); confirmation = { value: null, label: '' }; requestQuery('', 'clear'); requestValue(null, 'clear'); requestOpen(false, 'clear'); void nextTick(() => { confirmation = undefined; }); }
  function reset() { invalidate(); requestQuery(label.value, 'reset'); requestValue(null, 'reset'); requestOpen(false, 'reset'); }
  function input(text: string) { if (blocked.value) return; highlight.value = null; requestQuery(text, 'input'); requestOpen(true, 'input'); }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestOpen(false, 'escape'); return; }
    if (event.key === 'Tab') { requestOpen(false, 'blur'); return; }
    if (event.isComposing || composing.value) { if (event.key === 'Enter') event.preventDefault(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (blocked.value) return;
    if (event.key === 'Enter') { event.preventDefault(); if (opened.value && highlighted.value !== null) { const option = getSelectedOption(filtered.value, highlighted.value); if (option) choose(option); } return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); highlight.value = moveHighlight(filtered.value, highlighted.value, event.key === 'ArrowDown' ? 'next' : 'previous', normalized.value.loop); requestOpen(true, 'keyboard');
    }
  }
  return { normalized, selected, label, query, opened, disabled, blocked, filtered, highlighted, editVersion, composing, invalidate, requestQuery, requestOpen, choose, clear, reset, input, keydown,
    point(option: SelectionOption) { if (!blocked.value && !option.disabled) highlight.value = option.value; },
  };
}
export type ComboboxState = ReturnType<typeof useComboboxState>;
