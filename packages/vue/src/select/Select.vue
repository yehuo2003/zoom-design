<script setup lang="ts">
import { computed, shallowRef, useAttrs, useId, useTemplateRef } from 'vue';
import type { SelectionValue, SelectionOption } from '@zoom-design/core';
import SelectionPopup from './SelectionPopup.vue';
import type { SelectProps, SelectEmits, SelectExpose, SelectOptionContext, SelectValueContext } from './types';
import { useSelectionState } from '../selection/useSelectionState';
import { useSelectionDom } from '../selection/useSelectionDom';
import { useSelectionForm } from '../selection/useSelectionForm';
import { triggerAttributes } from '../selection/attrs';
defineOptions({ name: 'ZSelect', inheritAttrs: false });
const props = withDefaults(defineProps<SelectProps>(), { open: undefined });
const emit = defineEmits<SelectEmits>();
defineSlots<{ option?(context: SelectOptionContext): unknown; value?(context: SelectValueContext): unknown; empty?(): unknown; loading?(): unknown }>();
const attrs = useAttrs(); const generated = `zoom-select-${useId()}`; const warned = new Set<string>();
function warn(message: string) { if (import.meta.env.DEV && !warned.has(message)) { warned.add(message); console.warn(`ZSelect: ${message}`); } }
const trigger = useTemplateRef<HTMLButtonElement>('trigger'); const clearButton = useTemplateRef<HTMLButtonElement>('clear');
const root = useTemplateRef<HTMLSpanElement>('root');
const proxy = useTemplateRef<HTMLSelectElement>('proxy'); const submission = useTemplateRef<HTMLInputElement>('submission');
const popupComponent = useTemplateRef<InstanceType<typeof SelectionPopup>>('popup');
const popup = computed<HTMLElement | null>(() => popupComponent.value?.element ?? null);
const nativeDisabled = shallowRef(false);
const state = useSelectionState(props, nativeDisabled, { value(value, details) { emit('update:modelValue', value); emit('change', details); }, open(value, details) { emit('update:open', value); emit('open-change', details); } }, warn);
const { normalized: n, selected, opened, disabled, blocked, highlighted } = state;
const dom = useSelectionDom(props, state, trigger, popup, root, warn);
const formState = useSelectionForm(state, proxy, submission, trigger, nativeDisabled);
const triggerId = computed(() => n.value.id ?? generated); const listId = computed(() => `${triggerId.value}-listbox`);
const optionId = (value: SelectionValue) => `${listId.value}-${typeof value}-${String(value).split('').map(unit => unit.charCodeAt(0).toString(16)).join('-')}`;
const showClear = computed(() => n.value.clearable && n.value.value !== null && !blocked.value);
const successful = computed(() => !!selected.value && !!n.value.name && !disabled.value);
function rootAttrs() { return Object.fromEntries(Object.entries(attrs).filter(([key]) => !key.toLowerCase().startsWith('aria-') && !key.toLowerCase().startsWith('data-zoom-') && !['id', 'role'].includes(key.toLowerCase()))); }
function triggerAttrs() {
  const forwarded = triggerAttributes(props.triggerAttrs);
  for (const key of ['aria-label', 'aria-labelledby', 'aria-describedby'] as const) {
    const top = props[key] ?? attrs[key]; if (typeof top === 'string') forwarded[key] = top;
  }
  return forwarded;
}
defineExpose<SelectExpose>({ focus: dom.focus, blur: dom.blur });
function toggle() { dom.focus(); state.toggle(); }
function choose(option: SelectionOption) { state.choose(option); dom.focus(); }
</script>
<template>
  <span ref="root" v-bind="rootAttrs()" :class="['zoom-select', props.class]" :style="props.style" :data-zoom-size="n.size" :data-zoom-disabled="disabled ? true : undefined" :data-zoom-readonly="n.readonly ? true : undefined" :data-zoom-loading="n.loading ? true : undefined" @focusout="dom.focusout">
    <button ref="trigger" v-bind="triggerAttrs()" :id="triggerId" type="button" class="zoom-select__trigger" role="combobox" aria-haspopup="listbox"
      :disabled="disabled" :aria-disabled="disabled ? true : undefined" :aria-readonly="n.readonly ? true : undefined" :aria-busy="n.loading ? true : undefined" :aria-invalid="formState.invalid.value ? true : undefined" :aria-required="n.required && !n.readonly ? true : undefined"
      :aria-expanded="opened" :aria-controls="opened ? listId : undefined" :aria-activedescendant="opened && highlighted !== null ? optionId(highlighted) : undefined" @click="toggle" @keydown="dom.keydown">
      <span class="zoom-select__value"><slot name="value" :option="selected" :value="n.value">{{ selected?.label ?? n.placeholder }}</slot></span><span aria-hidden="true" class="zoom-select__arrow">▾</span>
    </button>
    <button v-if="showClear" ref="clear" type="button" class="zoom-select__clear" :aria-label="n.clearLabel" @click="state.clear(); dom.focus()">×</button>
    <select ref="proxy" class="zoom-select__proxy" aria-hidden="true" tabindex="-1" :form="n.form" :disabled="n.disabled" :required="n.required && !n.readonly" :value="selected ? '__zoom_selected__' : ''">
      <option value=""></option><option value="__zoom_selected__"></option>
    </select>
    <input ref="submission" type="hidden" :name="n.name" :form="n.form" :disabled="!successful" :value="selected ? String(n.value) : ''">
    <Teleport :to="dom.target.value || 'body'" :disabled="!dom.target.value">
      <SelectionPopup v-if="opened" ref="popup" :id="listId" :labelledby="triggerId" :options="n.options" :selected="n.value" :highlighted="highlighted" :option-id="optionId" :blocked="blocked" :loading="n.loading" :loading-text="n.loadingText" :empty-text="n.emptyText" :data-zoom-size="n.size" @choose="choose" @point="state.point" @focusout="dom.focusout">
        <template v-if="$slots.option" #option="context"><slot name="option" v-bind="context" /></template>
        <template v-if="$slots.empty" #empty><slot name="empty" /></template>
        <template v-if="$slots.loading" #loading><slot name="loading" /></template>
      </SelectionPopup>
    </Teleport>
  </span>
</template>
