<script setup lang="ts">
import { useTemplateRef } from 'vue';
import FormSelectionExample from './dialog-composition/FormSelectionExample.vue';
import NestedOverlayExample from './dialog-composition/NestedOverlayExample.vue';

const overlayHost = useTemplateRef<HTMLElement>('overlayHost');
const getHost = () => overlayHost.value;
</script>

<template>
  <section class="composition-brand" aria-label="Dialog composition examples">
    <h2>Dialog composition</h2>
    <p>All explicit portals share the branded host below. The host stays outside clipped content.</p>
    <FormSelectionExample :get-host="getHost" />
    <NestedOverlayExample :get-host="getHost" />
    <div ref="overlayHost" class="composition-overlay-host" data-testid="composition-host" />
  </section>
</template>

<style scoped>
.composition-brand {
  --zoom-font-family: "Trebuchet MS", sans-serif;
  --zoom-color-text: rgb(42 38 82);
  --zoom-color-surface: rgb(252 249 255);
  --zoom-color-primary: rgb(105 58 170);
  --zoom-control-min-size-md: 2rem;
  color: var(--zoom-color-text);
  font-family: var(--zoom-font-family);
}
.composition-brand > p { max-width: 48rem; }
.composition-overlay-host { position: fixed; inset: 0; z-index: 50; pointer-events: none; }
</style>
