<script setup lang="ts">
import type { SelectionOption, SelectionValue } from '@zoom-design/core';
import type { SelectOptionContext } from './types';
import { useTemplateRef } from 'vue';
const element = useTemplateRef<HTMLDivElement>('element');
defineExpose({ element });
defineProps<{ id: string; labelledby: string; options: readonly SelectionOption[]; selected: SelectionValue; highlighted: SelectionValue; blocked: boolean; loading: boolean; loadingText: string; emptyText: string; optionId: (value: SelectionValue) => string }>();
const emit = defineEmits<{ choose: [option: SelectionOption]; point: [option: SelectionOption] }>();
defineSlots<{ option?(context: SelectOptionContext): unknown; empty?(): unknown; loading?(): unknown }>();
</script>
<template>
  <div ref="element" :id="id" class="zoom-select__popup" role="listbox" :aria-labelledby="labelledby" :aria-busy="loading ? true : undefined" @pointerdown.prevent>
    <div v-if="loading" class="zoom-select__message" role="status"><slot name="loading">{{ loadingText }}</slot></div>
    <div v-else-if="!options.length" class="zoom-select__message"><slot name="empty">{{ emptyText }}</slot></div>
    <div v-for="option in options" :id="optionId(option.value)" :key="optionId(option.value)" class="zoom-select__option" role="option"
      :aria-selected="option.value === selected" :aria-disabled="(option.disabled || blocked) ? true : undefined"
      :data-value-type="typeof option.value" :data-zoom-highlighted="option.value === highlighted ? true : undefined"
      @pointermove="emit('point', option)" @click="emit('choose', option)">
      <slot name="option" :option="option" :selected="option.value === selected" :highlighted="option.value === highlighted">{{ option.label }}</slot>
    </div>
  </div>
</template>
