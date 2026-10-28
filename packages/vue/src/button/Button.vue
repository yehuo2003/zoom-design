<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { normalizeBoolean, normalizeEnum } from './normalize';
import type { ButtonEmits, ButtonExpose, ButtonProps } from './types';

defineOptions({ name: 'ZButton', inheritAttrs: false });
const props = defineProps<ButtonProps>();
const emit = defineEmits<ButtonEmits>();
defineSlots<{ default?(): unknown; icon?(): unknown; loading?(): unknown }>();
const attrs = useAttrs();
const button = useTemplateRef<HTMLButtonElement>('button');
const state = computed(() => {
  const warn = import.meta.env.DEV ? (message: string) => console.warn(message) : undefined;
  const disabled = normalizeBoolean(props.disabled, true, warn);
  const loading = normalizeBoolean(props.loading, true, warn);
  return {
    variant: normalizeEnum(props.variant, ['solid', 'outline', 'text'], 'solid'),
    size: normalizeEnum(props.size, ['sm', 'md', 'lg'], 'md'),
    type: normalizeEnum(props.type, ['button', 'submit', 'reset'], 'button'),
    disabled: disabled || loading, loading, block: normalizeBoolean(props.block, false, warn),
  };
});

// useAttrs is updated by Vue but is not a reactive dependency. Read it in each render.
function forwardedAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => {
    const attribute = key.toLowerCase();
    return !['type', 'disabled', 'aria-disabled', 'aria-busy'].includes(attribute) && !attribute.startsWith('data-zoom-');
  }));
}
function onClick(event: MouseEvent) {
  if (state.value.disabled || button.value?.matches(':disabled')) {
    event.preventDefault(); event.stopPropagation(); return;
  }
  emit('click', event);
}
defineExpose<ButtonExpose>({
  focus: options => button.value?.focus(options),
  blur: () => button.value?.blur(),
});
</script>

<template>
  <button
    ref="button" v-bind="forwardedAttrs()" class="zoom-button"
    :type="state.type" :disabled="state.disabled"
    :aria-disabled="state.disabled ? true : undefined" :aria-busy="state.loading ? true : undefined"
    :data-zoom-variant="state.variant" :data-zoom-size="state.size"
    :data-zoom-block="state.block ? true : undefined" @click="onClick"
  >
    <span v-if="state.loading" class="zoom-button__loading" aria-hidden="true"><slot name="loading"><span class="zoom-button__spinner" /></slot></span>
    <span v-else-if="$slots.icon" class="zoom-button__icon" aria-hidden="true"><slot name="icon" /></span>
    <span class="zoom-button__label"><slot /></span>
  </button>
</template>
