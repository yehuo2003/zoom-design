<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';

const props = withDefaults(defineProps<{
  brand?: 'purple' | 'teal';
  initialOpen?: boolean;
  id?: string;
  portal?: boolean;
}>(), { brand: 'purple', initialOpen: false, portal: true });
const opened = shallowRef(props.initialOpen);
const mounted = shallowRef(true);
const closeRequests = shallowRef(0);
const overlayHost = useTemplateRef<HTMLElement>('overlayHost');
const theme = computed(() => ({
  '--zoom-font-family': props.brand === 'teal' ? 'Georgia, serif' : 'system-ui, sans-serif',
  '--zoom-color-text': props.brand === 'teal' ? '#0f766e' : '#4c1d95',
  '--zoom-color-surface': props.brand === 'teal' ? '#f0fdfa' : '#f5f3ff',
}));
const getHost = () => overlayHost.value;
function openDialog() { mounted.value = true; opened.value = true; }
</script>

<template>
  <main class="dialog-playground" :style="theme" :data-dialog-brand="brand" data-dialog-view="overview">
    <header>
      <p>ZOOM DESIGN · VUE</p>
      <h1>Dialog playground</h1>
      <nav aria-label="Dialog examples">
        <a href="/dialog">Overview</a> ·
        <a href="/dialog/behavior">Behavior</a> ·
        <a href="/dialog/appearance">Appearance</a> ·
        <a href="/dialog/composition">Composition</a>
      </nav>
    </header>
    <section>
      <button type="button" @click="openDialog">Open SSR dialog</button>
      <output data-testid="ssr-dialog-close-count">{{ closeRequests }}</output>
      <ZDialog v-if="mounted" :id="id" :open="opened" :portal="portal" :get-container="getHost"
        data-testid="ssr-dialog" @update:open="opened = $event" @close-request="closeRequests++">
        <template #title>SSR dialog {{ brand }}</template>
        <template #description>Request-local Dialog preview</template>
        <p data-testid="ssr-dialog-body">Real {{ brand }} dialog content is present in server HTML.</p>
        <button type="button" @click="mounted = false">Unmount this dialog</button>
      </ZDialog>
      <div id="ssr-dialog-host" ref="overlayHost" :style="theme" data-testid="ssr-dialog-host" />
    </section>
  </main>
</template>

<style scoped>
.dialog-playground { max-inline-size: 960px; margin: 0 auto; padding: 40px 24px 80px; color: var(--zoom-color-text); font-family: var(--zoom-font-family); }
.dialog-playground header { border-block-end: 1px solid #dce1e8; padding-block-end: 24px; }
.dialog-playground h1 { font-size: 36px; line-height: 1.2; margin-block: 8px 16px; }
.dialog-playground section { padding-block: 28px; }
.dialog-playground output { margin-inline-start: 1rem; }
</style>
