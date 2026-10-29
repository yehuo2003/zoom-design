<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { ZSelect } from '@zoom-design/vue/select';
const props = defineProps<{ brand: 'purple' | 'teal' }>();
const alternate = shallowRef(false); const portalMounted = shallowRef(true);
const theme = computed(() => ({ '--zoom-color-primary': alternate.value || props.brand === 'teal' ? '#0f766e' : '#7c3aed', '--zoom-color-surface': alternate.value ? '#f0fdfa' : '#faf5ff', '--zoom-color-text': '#172033', '--zoom-select-font-family': 'monospace' }));
const options = [{ value: 'small', label: 'Small option' }, { value: 'long', label: 'Long option labels wrap naturally — 字号与行高随内容增长，不裁切正文。' }];
function popupHost(trigger: HTMLElement) { return trigger.ownerDocument.getElementById('select-themed-host'); }
</script>

<template>
  <section aria-labelledby="select-appearance-title"><h2 id="select-appearance-title">Themes, density &amp; portal</h2>
    <div v-for="density in ['regular', 'compact']" :key="density" :data-zoom-density="density" class="select-row"><ZSelect v-for="size in (['sm', 'md', 'lg'] as const)" :key="size" :size="size" :options="options" model-value="small" :aria-label="`${density} ${size} select`" /></div>
    <div dir="rtl"><ZSelect :options="options" model-value="small" aria-label="RTL select" /></div>
    <div :style="theme" data-zoom-density="compact"><ZSelect v-if="portalMounted" :options="options" model-value="small" portal :get-popup-container="popupHost" aria-label="Themed portal select" /><div id="select-themed-host" :style="theme" data-zoom-density="compact" /></div>
    <div class="select-controls"><button @click="alternate = !alternate">Change select theme</button><button @click="portalMounted = !portalMounted">Toggle portal select</button></div>
    <div class="select-long"><ZSelect :options="options" model-value="long" aria-label="Large label select" /></div><button class="select-native-host">Native host control</button>
  </section>
</template>

<style>
.select-long { --zoom-select-font-family: monospace; --zoom-select-font-size: 28px; --zoom-select-line-height: 2; max-inline-size: 360px; margin-block: 20px; }
.select-native-host { border-radius: 0; }
</style>
