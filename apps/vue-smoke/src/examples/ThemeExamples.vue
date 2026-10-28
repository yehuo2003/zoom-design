<script setup lang="ts">
import { computed, shallowRef } from 'vue';

const props = defineProps<{ brand?: 'purple' | 'teal' }>();
const nestedOverride = shallowRef(true);
const requestColor = computed(() => props.brand === 'teal' ? '#0f766e' : '#7c3aed');
</script>

<template>
  <main class="theme-examples" :data-theme-brand="brand ?? 'purple'">
    <h1>Theme playground</h1>
    <p>Private native samples demonstrate shared theme parameters. Product Button is planned for Task7.</p>
    <section aria-label="Request brand" :style="{ '--zoom-color-primary': requestColor }">
      <button type="button" class="theme-sample">Request brand sample</button>
    </section>
    <section aria-label="Defaults">
      <h2>Default light theme</h2>
      <div><button type="button" class="theme-sample" data-testid="default-sample">Default sample</button></div>
    </section>
    <section class="brand-purple" aria-label="Purple brand">
      <h2>Purple brand</h2>
      <button type="button" class="theme-sample" data-testid="purple-sample">Purple sample</button>
      <div :style="nestedOverride ? { '--zoom-color-primary': '#0f766e' } : {}">
        <button type="button" class="theme-sample" data-testid="nested-brand-sample">Nested brand sample</button>
      </div>
      <button type="button" @click="nestedOverride = false">Clear nested brand</button>
    </section>
    <section class="brand-teal" aria-label="Teal brand">
      <h2>Teal brand</h2>
      <button type="button" class="theme-sample" data-testid="teal-sample">Teal sample</button>
    </section>
    <section aria-label="Typography">
      <h2>Local typography</h2>
      <div style="--zoom-font-family: monospace; --zoom-font-size-base: 2rem">
        <button type="button" class="theme-sample" data-testid="local-font-sample">Local family and base size</button>
        <div style="--zoom-font-size-md: 24px"><button type="button" class="theme-sample" data-testid="explicit-size-sample">Explicit size</button></div>
      </div>
    </section>
    <section aria-label="Density" data-zoom-density="regular">
      <h2>Density inherits and restores</h2>
      <button type="button" class="theme-sample" data-testid="regular-sample">Regular sample</button>
      <div data-zoom-density="compact">
        <button type="button" class="theme-sample" data-testid="compact-sample">Compact sample</button>
        <div data-zoom-density="regular"><button type="button" class="theme-sample" data-testid="restored-sample">Restored sample</button></div>
      </div>
    </section>
    <section aria-label="Host controls">
      <h2>Unstyled host controls</h2>
      <p data-host-control>Host text uses host styles</p>
      <button type="button" data-host-control>Host button</button>
      <input aria-label="Host input" data-host-control value="Host input" />
    </section>
  </main>
</template>

<style scoped>
.theme-examples { max-inline-size: 60rem; margin-inline: auto; padding: 1rem; }
.brand-purple { --zoom-color-primary: #7c3aed; }
.brand-teal { --zoom-color-primary: #0f766e; }
.theme-sample {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 24px;
  min-block-size: var(--zoom-control-min-size-md);
  padding-inline: var(--zoom-control-padding-inline-md);
  padding-block: var(--zoom-control-padding-block);
  gap: var(--zoom-control-gap);
  font-family: var(--zoom-font-family);
  font-size: var(--zoom-font-size-md, calc(var(--zoom-font-size-base) * 0.875));
  line-height: var(--zoom-line-height);
  border: 1px solid transparent;
  border-radius: var(--zoom-radius-md);
  color: var(--zoom-color-on-primary);
  background-color: var(--zoom-color-primary);
  overflow-wrap: anywhere;
  white-space: normal;
  transition: background-color var(--zoom-motion-duration);
  outline-color: var(--zoom-color-focus, var(--zoom-color-primary));
}
.theme-sample:focus-visible { outline: var(--zoom-focus-width) solid var(--zoom-color-focus, var(--zoom-color-primary)); outline-offset: var(--zoom-focus-offset); }
.theme-sample:hover { background-color: var(--zoom-color-primary-hover, var(--zoom-color-primary)); }
.theme-sample:active { background-color: var(--zoom-color-primary-active, var(--zoom-color-primary)); }
@supports (background-color: color-mix(in srgb, red, black)) {
  .theme-sample:hover { background-color: var(--zoom-color-primary-hover, color-mix(in srgb, var(--zoom-color-primary) 92%, black)); }
  .theme-sample:active { background-color: var(--zoom-color-primary-active, color-mix(in srgb, var(--zoom-color-primary) 84%, black)); }
}
@media (prefers-reduced-motion: reduce) { .theme-sample { transition: none; } }
</style>
