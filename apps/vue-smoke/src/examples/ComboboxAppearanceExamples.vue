<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
const props = defineProps<{ brand: 'purple' | 'teal' }>();
const alternate = shallowRef(false); const mounted = shallowRef(true);
const theme = computed(() => ({ '--zoom-color-primary': alternate.value || props.brand === 'teal' ? '#0f766e' : '#7c3aed', '--zoom-color-surface': alternate.value ? '#f0fdfa' : '#faf5ff', '--zoom-color-text': '#172033', '--zoom-combobox-font-family': 'monospace' }));
const options = [{ value: 'small', label: 'Small option' }, { value: 'long', label: 'Long option labels wrap naturally — 字号与行高随内容增长，不裁切正文。' }];
function popupHost(trigger: HTMLElement) { return trigger.ownerDocument.getElementById('combobox-themed-host'); }
</script>

<template>
  <section aria-labelledby="combobox-appearance-title"><h2 id="combobox-appearance-title">Themes, density &amp; portal</h2>
    <div v-for="density in ['regular', 'compact']" :key="density" :data-zoom-density="density" class="combobox-row"><ZCombobox v-for="size in (['sm', 'md', 'lg'] as const)" :key="size" :size="size" :options="options" model-value="small" :aria-label="`${density} ${size} combobox`" /></div>
    <div dir="rtl"><ZCombobox :options="options" model-value="small" aria-label="RTL combobox" /></div>
    <div class="combobox-controls"><button @click="alternate = !alternate">Change combobox theme</button><button @click="mounted = !mounted">Toggle portal combobox</button></div>
    <div :style="theme" data-zoom-density="compact"><ZCombobox v-if="mounted" :options="options" model-value="small" portal :get-popup-container="popupHost" aria-label="Themed portal combobox" /><div id="combobox-themed-host" :style="theme" data-zoom-density="compact" /></div>
    <div class="combobox-long"><ZCombobox :options="options" model-value="long" aria-label="Large text combobox" /></div><button class="combobox-native-host">Native combobox host control</button>
  </section>
</template>

<style>
.combobox-long { --zoom-combobox-font-family: monospace; --zoom-combobox-font-size: 28px; --zoom-combobox-line-height: 2; max-inline-size: 360px; margin-block: 20px; }
.combobox-native-host { border-radius: 0; }
</style>
