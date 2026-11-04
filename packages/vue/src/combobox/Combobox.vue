<script setup lang="ts">
import { computed, shallowRef, useAttrs, useId, useTemplateRef } from 'vue';
import type { SelectionValue, SelectionOption } from '@zoom-design/core';
import SelectionPopup from '../select/SelectionPopup.vue';
import type { ComboboxProps, ComboboxEmits, ComboboxExpose, ComboboxOptionContext } from './types';
import { useComboboxState } from './useComboboxState';
import { useComboboxInput } from './useComboboxInput';
import { useSelectionDom } from '../selection/useSelectionDom';
import { useSelectionForm } from '../selection/useSelectionForm';
import { triggerAttributes, rootAttributes } from '../selection/attrs';
defineOptions({ name: 'ZCombobox', inheritAttrs: false });
const props = withDefaults(defineProps<ComboboxProps>(), { open: undefined, query: undefined, matchTriggerWidth: true });
const emit = defineEmits<ComboboxEmits>();
defineSlots<{ option?(context: ComboboxOptionContext): unknown; empty?(): unknown; loading?(): unknown }>();
const attrs = useAttrs(); const generated = `zoom-combobox-${useId()}`; const warned = new Set<string>();
function warn(message: string) { if (import.meta.env.DEV && !warned.has(message)) { warned.add(message); console.warn(`ZCombobox: ${message}`); } }
const trigger = useTemplateRef<HTMLInputElement>('trigger'); const root = useTemplateRef<HTMLSpanElement>('root');
const proxy = useTemplateRef<HTMLSelectElement>('proxy'); const submission = useTemplateRef<HTMLInputElement>('submission');
const popupComponent = useTemplateRef<InstanceType<typeof SelectionPopup>>('popup');
const popup = computed<HTMLElement | null>(() => popupComponent.value?.element ?? null); const nativeDisabled = shallowRef(false);
const state = useComboboxState(props, nativeDisabled, {
  value(value, details) { emit('update:modelValue', value); emit('change', details); },
  query(query, details) { emit('update:query', query); emit('query-change', details); },
  open(open, details) { emit('update:open', open); emit('open-change', details); },
}, warn);
const { normalized: n, selected, opened, disabled, blocked, filtered, highlighted } = state;
const editable = useComboboxInput(state, trigger); const dom = useSelectionDom(props, state, trigger, popup, root, warn);
const formState = useSelectionForm(state, proxy, submission, trigger, nativeDisabled);
const triggerId = computed(() => n.value.id ?? generated); const listId = computed(() => `${triggerId.value}-listbox`);
const optionId = (value: SelectionValue) => `${listId.value}-${typeof value}-${String(value).split('').map(unit => unit.charCodeAt(0).toString(16)).join('-')}`;
const showClear = computed(() => n.value.clearable && n.value.value !== null && !blocked.value);
const successful = computed(() => !!selected.value && !!n.value.name && !disabled.value);
function rootAttrs() { return rootAttributes(attrs); }
function inputAttrs() {
  const forwarded = { autocomplete: 'off', ...triggerAttributes(props.inputAttrs) } as Record<string, unknown>;
  for (const key of ['aria-label', 'aria-labelledby', 'aria-describedby'] as const) { const top = props[key] ?? attrs[key]; if (typeof top === 'string') forwarded[key] = top; }
  return forwarded;
}
function choose(option: SelectionOption) { state.choose(option); dom.focus(); }
defineExpose<ComboboxExpose>({ focus: dom.focus, blur: dom.blur });
</script>
<template>
  <span ref="root" v-bind="rootAttrs()" :class="['zoom-combobox', props.class]" :style="props.style" :data-zoom-size="n.size" :data-zoom-disabled="disabled ? true : undefined" :data-zoom-readonly="n.readonly ? true : undefined" :data-zoom-loading="n.loading ? true : undefined" @focusout="dom.focusout">
    <input ref="trigger" v-bind="inputAttrs()" :id="triggerId" type="text" class="zoom-combobox__trigger" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" :placeholder="n.placeholder" :value="editable.display.value"
      :disabled="disabled" :readonly="n.readonly || n.loading" :aria-disabled="disabled ? true : undefined" :aria-readonly="n.readonly ? true : undefined" :aria-busy="n.loading ? true : undefined" :aria-invalid="formState.invalid.value ? true : undefined" :aria-required="n.required && !n.readonly ? true : undefined"
      :aria-expanded="opened" :aria-controls="opened ? listId : undefined" :aria-activedescendant="opened && highlighted !== null ? optionId(highlighted) : undefined"
      @click="dom.focus(); state.requestOpen(true, 'trigger')" @keydown="dom.keydown" @input="editable.input" @compositionstart="editable.compositionstart" @compositionupdate="editable.input" @compositionend="editable.compositionend">
    <button v-if="showClear" type="button" class="zoom-combobox__clear" :aria-label="n.clearLabel" @pointerdown.prevent @click="state.clear(); dom.focus()">×</button>
    <select ref="proxy" class="zoom-combobox__proxy" aria-hidden="true" tabindex="-1" :form="n.form" :disabled="n.disabled" :required="n.required && !n.readonly" :value="selected ? '__zoom_selected__' : ''"><option value=""></option><option value="__zoom_selected__"></option></select>
    <input ref="submission" type="hidden" :name="n.name" :form="n.form" :disabled="!successful" :value="selected ? String(n.value) : ''">
    <Teleport :to="dom.target.value || 'body'" :disabled="!dom.target.value">
      <SelectionPopup v-if="opened" ref="popup" component="combobox" :id="listId" :labelledby="triggerId" :options="filtered" :selected="n.value" :highlighted="highlighted" :option-id="optionId" :blocked="blocked" :loading="n.loading" :loading-text="n.loadingText" :empty-text="n.emptyText" :data-zoom-size="n.size" @choose="choose" @point="state.point" @focusout="dom.focusout">
        <template v-if="$slots.option" #option="context"><slot name="option" v-bind="context" /></template>
        <template v-if="$slots.empty" #empty><slot name="empty" /></template>
        <template v-if="$slots.loading" #loading><slot name="loading" /></template>
      </SelectionPopup>
    </Teleport>
  </span>
</template>
