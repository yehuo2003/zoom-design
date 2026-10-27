<script setup lang="ts">
import BuildProbe from '../fixtures/BuildProbe.vue';
const emit = defineEmits<{ changed: [count: number] }>();
emit('changed', 'invalid payload');
</script>

<template>
  <BuildProbe :label="123" />
</template>
