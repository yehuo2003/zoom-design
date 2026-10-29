<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { ZSelect } from '@zoom-design/vue/select';
import SelectBehaviorExamples from './SelectBehaviorExamples.vue';
import SelectFormExamples from './SelectFormExamples.vue';
import SelectAppearanceExamples from './SelectAppearanceExamples.vue';

const props = withDefaults(defineProps<{ brand?: 'purple' | 'teal'; initialOpen?: boolean }>(), { brand: 'purple', initialOpen: false });
const open = shallowRef(props.initialOpen);
const mounted = shallowRef(true);
const style = computed(() => ({ '--zoom-color-primary': props.brand === 'teal' ? '#0f766e' : '#7c3aed' }));
const options = [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty string' }, { value: 'blue', label: 'Blue' }];
function popupHost(trigger: HTMLElement) { return trigger.ownerDocument.getElementById('ssr-popup-host'); }
</script>

<template>
  <main class="select-playground">
    <header><p>ZOOM DESIGN · VUE</p><h1>Select playground</h1><p>Confirmed values, native forms and accessible keyboard navigation. <a href="/button">Button playground</a></p></header>
    <section :style="style" :data-select-brand="brand" aria-labelledby="ssr-title">
      <h2 id="ssr-title">Request-local SSR &amp; portal</h2>
      <button @click="mounted = !mounted">Toggle SSR select</button>
      <ZSelect v-if="mounted" id="ssr-select" v-model:open="open" :model-value="0" :options="options" portal :get-popup-container="popupHost" aria-label="SSR select" />
      <div id="ssr-popup-host" :style="style" />
    </section>
    <SelectBehaviorExamples />
    <SelectFormExamples />
    <SelectAppearanceExamples :brand="brand" />
  </main>
</template>

<style>
.select-playground { max-inline-size: 960px; margin: 0 auto; padding: 40px 24px 80px; color: #172033; font: 16px/1.6 system-ui, sans-serif; }
.select-playground header { border-block-end: 1px solid #dce1e8; padding-block-end: 24px; }
.select-playground h1 { font-size: 36px; line-height: 1.2; margin-block: 8px 16px; }
.select-playground h2 { font-size: 20px; margin-block: 0 16px; }
.select-playground section { border-block-end: 1px solid #e5e8ee; padding-block: 28px; }
.select-row, .select-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-block: 12px; }
.select-playground output { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.select-playground .zoom-select { min-inline-size: 140px; }
</style>
