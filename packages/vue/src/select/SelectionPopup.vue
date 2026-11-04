<script setup lang="ts">
import type { SelectionOption, SelectionValue } from '@zoom-design/core';
import type { SelectOptionContext } from './types';
import { useTemplateRef } from 'vue';
const element = useTemplateRef<HTMLDivElement>('element');
defineExpose({ element });
withDefaults(defineProps<{ component?: 'select' | 'combobox'; id: string; labelledby: string; options: readonly SelectionOption[]; selected: SelectionValue; highlighted: SelectionValue; blocked: boolean; loading: boolean; loadingText: string; emptyText: string; optionId: (value: SelectionValue) => string }>(), { component: 'select' });
const emit = defineEmits<{ choose: [option: SelectionOption]; point: [option: SelectionOption] }>();
let touchChoice: SelectionValue | undefined;
function discardTouch() { touchChoice = undefined; }
function touch(option: SelectionOption, event: PointerEvent) {
  if (event.pointerType !== 'touch' || event.isPrimary === false) return;
  event.preventDefault(); touchChoice = option.value; emit('choose', option);
}
function click(option: SelectionOption, event: MouseEvent) {
  if (touchChoice === option.value && event.detail > 0) { touchChoice = undefined; return; }
  emit('choose', option);
}
defineSlots<{ option?(context: SelectOptionContext): unknown; empty?(): unknown; loading?(): unknown }>();
</script>
<template>
  <div ref="element" :id="id" :class="`zoom-${component}__popup`" role="listbox" :aria-labelledby="labelledby" :aria-busy="loading ? true : undefined" @pointerdown.prevent="discardTouch" @pointercancel="discardTouch">
    <div v-if="loading" :class="`zoom-${component}__message`" role="status"><slot name="loading">{{ loadingText }}</slot></div>
    <div v-else-if="!options.length" :class="`zoom-${component}__message`"><slot name="empty">{{ emptyText }}</slot></div>
    <div v-for="option in options" :id="optionId(option.value)" :key="optionId(option.value)" :class="`zoom-${component}__option`" role="option"
      :aria-selected="option.value === selected" :aria-disabled="(option.disabled || blocked) ? true : undefined"
      :data-value-type="typeof option.value" :data-zoom-highlighted="option.value === highlighted ? true : undefined"
      @pointermove="emit('point', option)" @pointerup="touch(option, $event)" @click="click(option, $event)">
      <slot name="option" :option="option" :selected="option.value === selected" :highlighted="option.value === highlighted">{{ option.label }}</slot>
    </div>
  </div>
</template>
