<script setup lang="ts">
import { onUnmounted, shallowRef } from 'vue';

defineProps<{ label: string }>();
const emit = defineEmits<{ changed: [count: number]; disposed: [] }>();
const count = shallowRef(0);
function increment() {
  count.value += 1;
  emit('changed', count.value);
}
onUnmounted(() => emit('disposed'));
</script>

<template>
  <section class="zoom-engineering-probe" aria-label="Vue engineering probe">
    <p>Label: <output aria-label="Label">{{ label }}</output></p>
    <p>Count: <output aria-label="Count">{{ count }}</output></p>
    <button type="button" @click="increment">Increment</button>
  </section>
</template>
