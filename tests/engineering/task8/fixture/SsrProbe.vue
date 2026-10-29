<script setup lang="ts">
// Test-only strategy spike. No ZSelect/ZCombobox or public product imports.
import { shallowRef, onMounted, nextTick, useId } from 'vue';
defineProps<{ open: boolean; portal: boolean; label: string }>();
const id = useId();
const hydrated = shallowRef(false);
onMounted(async () => { await nextTick(); hydrated.value = true; });
</script>
<template>
  <section class="brand" :data-instance="id">
    <button type="button" role="combobox" :aria-controls="open ? `${id}-list` : undefined" :aria-expanded="open" :aria-label="label">{{ label }}</button>
    <Teleport to="#popup-host" :disabled="!portal || !hydrated">
      <div v-if="open" :id="`${id}-list`" role="listbox" :aria-label="label" class="popup"><div role="option" aria-selected="true">{{ label }}</div></div>
    </Teleport>
  </section>
</template>
