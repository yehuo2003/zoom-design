<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import ComboboxBehaviorExamples from './ComboboxBehaviorExamples.vue';
import ComboboxFormExamples from './ComboboxFormExamples.vue';
import ComboboxAppearanceExamples from './ComboboxAppearanceExamples.vue';

const props = withDefaults(defineProps<{ brand?: 'purple' | 'teal'; initialOpen?: boolean; initialQuery?: string; initialValue?: string | number }>(), { brand: 'purple', initialOpen: false, initialValue: 0 });
const open = shallowRef(props.initialOpen);
const query = shallowRef(props.initialQuery ?? (props.initialValue === 'blue' ? 'Blue' : 'Zero'));
const mounted = shallowRef(true);
const theme = computed(() => ({ '--zoom-color-primary': props.brand === 'teal' ? '#0f766e' : '#7c3aed' }));
const options = [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty string' }, { value: 'blue', label: 'Blue' }];
function popupHost(trigger: HTMLElement) { return trigger.ownerDocument.getElementById('ssr-combobox-popup-host'); }
</script>

<template>
  <main class="combobox-playground">
    <header><p>ZOOM DESIGN · VUE</p><h1>Combobox playground</h1><p>Editable queries, confirmed values and native forms. <a href="/select">Select playground</a> · <a href="/button">Button playground</a></p></header>
    <section :style="theme" :data-combobox-brand="brand" aria-labelledby="combobox-ssr-title">
      <h2 id="combobox-ssr-title">Request-local SSR &amp; portal</h2>
      <button @click="mounted = !mounted">Toggle SSR combobox</button>
      <ZCombobox v-if="mounted" id="ssr-combobox" v-model:open="open" v-model:query="query" :model-value="initialValue" :options="options" portal :get-popup-container="popupHost" aria-label="SSR combobox" />
      <div id="ssr-combobox-popup-host" :style="theme" />
    </section>
    <ComboboxBehaviorExamples />
    <ComboboxFormExamples />
    <ComboboxAppearanceExamples :brand="brand" />
  </main>
</template>

<style>
.combobox-playground { max-inline-size: 960px; margin: 0 auto; padding: 40px 24px 80px; color: #172033; font: 16px/1.6 system-ui, sans-serif; }
.combobox-playground header { border-block-end: 1px solid #dce1e8; padding-block-end: 24px; }
.combobox-playground h1 { font-size: 36px; line-height: 1.2; margin-block: 8px 16px; }
.combobox-playground h2 { font-size: 20px; margin-block: 0 16px; }
.combobox-playground section { border-block-end: 1px solid #e5e8ee; padding-block: 28px; }
.combobox-row, .combobox-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-block: 12px; }
.combobox-playground output { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.combobox-playground .zoom-combobox { min-inline-size: 140px; }
</style>
