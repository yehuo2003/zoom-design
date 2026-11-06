<script setup lang="ts">
import { computed, ref } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { DialogCloseDetails } from '@zoom-design/core';

const opened = ref(false);
const events = ref<string[]>([]);
const model = computed({
  get: () => opened.value,
  set: (value: boolean) => { events.value.push(`update:${value}`); opened.value = value; },
});
function onCloseRequest(details: DialogCloseDetails) { events.value.push(`request:${details.reason}`); }
</script>

<template>
  <section>
    <h2>Accept every close request with v-model</h2>
    <button type="button" @click="opened = true; events = []">Open accepted dialog</button>
    <output data-testid="accepted-events">{{ events.join('|') }}</output>
    <ZDialog v-model:open="model" @close-request="onCloseRequest">
      <template #title>Accepted request</template>
      <p>The owner accepts each close request immediately.</p>
    </ZDialog>
  </section>
</template>
