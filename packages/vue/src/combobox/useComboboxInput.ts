import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import type { ComboboxState } from './useComboboxState';
export function useComboboxInput(state: ComboboxState, element: Ref<HTMLInputElement | null>) {
  const draft = shallowRef<string | null>(null);
  const display = computed(() => draft.value ?? state.query.value);
  let active = true; let session: { version: number } | undefined; let trailing: string | undefined; let timer: ReturnType<typeof setTimeout> | undefined;
  function sync() { if (element.value) element.value.value = display.value; }
  function settle() { void nextTick(sync); }
  watch(state.editVersion, () => { draft.value = null; settle(); }, { flush: 'sync' });
  watch(state.query, () => { if (session && state.composing.value) state.invalidate(); }, { flush: 'sync' });
  function compositionstart() {
    if (!active || !element.value || state.blocked.value) return;
    clearTimeout(timer); trailing = undefined; session = { version: state.editVersion.value }; state.composing.value = true; draft.value = element.value!.value;
  }
  function input(event: Event) {
    if (!active || !element.value) return;
    const text = element.value!.value;
    if (session) {
      if (session.version === state.editVersion.value && !state.blocked.value) draft.value = text;
      else settle();
      return;
    }
    if ((event as InputEvent).isComposing) { settle(); return; }
    if (trailing !== undefined && trailing === text) { trailing = undefined; clearTimeout(timer); settle(); return; }
    trailing = undefined; state.input(text); settle();
  }
  function compositionend() {
    if (!active || !element.value) return;
    const text = element.value!.value; const valid = session && session.version === state.editVersion.value && !state.blocked.value;
    session = undefined; state.composing.value = false; draft.value = null;
    clearTimeout(timer); trailing = text; timer = setTimeout(() => { trailing = undefined; }, 0);
    if (valid) state.input(text);
    settle();
  }
  onBeforeUnmount(() => { active = false; clearTimeout(timer); session = undefined; state.invalidate(); });
  return { display, input, compositionstart, compositionend };
}
