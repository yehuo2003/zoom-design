<script setup lang="ts">
import { computed } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';

const props = defineProps<{
  brand: 'purple' | 'teal';
  density: 'regular' | 'compact';
  instance: boolean;
  long: boolean;
  rtl: boolean;
  large: boolean;
  dual: boolean;
}>();
const theme = computed(() => ({
  '--zoom-font-family': props.brand === 'teal' ? 'Georgia, serif' : 'system-ui, sans-serif',
  '--zoom-font-size-md': props.brand === 'teal' ? '20px' : '18px',
  '--zoom-color-text': props.brand === 'teal' ? '#0f766e' : '#4c1d95',
  '--zoom-color-surface': props.brand === 'teal' ? '#f0fdfa' : '#f5f3ff',
  '--zoom-control-gap': props.density === 'compact' ? '6px' : '8px',
  '--zoom-control-min-size-md': props.density === 'compact' ? '28px' : '36px',
}));
const instanceStyle = computed(() => ({
  ...(props.instance ? { '--zoom-dialog-background': '#fff8dc' } : {}),
  ...(props.large ? { '--zoom-dialog-font-size': '32px' } : {}),
}));
const secondTheme = {
  '--zoom-font-family': 'Georgia, serif',
  '--zoom-font-size-md': '20px',
  '--zoom-color-text': '#0f766e',
  '--zoom-color-surface': '#f0fdfa',
};
</script>

<template>
  <main :style="theme" :data-zoom-density="density" :dir="rtl ? 'rtl' : 'ltr'">
    <ZDialog open :style="instanceStyle">
      <template #title>A very long Dialog heading for layout verification</template>
      <template #description>Appearance fixture for brand, density and text growth.</template>
      <p v-for="number in long ? 60 : 2" :key="number">Paragraph {{ number }}: long content must remain scrollable inside the dialog panel, including at narrow widths and larger text sizes.</p>
      <template #footer><button type="button">Cancel</button><button type="button">Save</button></template>
    </ZDialog>
  </main>
  <section v-if="dual" :style="secondTheme">
    <ZDialog open aria-label="Second brand dialog"><p>Independent teal brand</p></ZDialog>
  </section>
</template>
