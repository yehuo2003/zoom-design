<script setup lang="ts">
import { ref } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { DialogCloseDetails } from '@zoom-design/core';

const opened = ref(false);
const saving = ref(false);
const status = ref('Idle');
const events = ref<string[]>([]);
function launch() { opened.value = true; saving.value = false; status.value = 'Idle'; events.value = []; }
function onUpdate(value: false) { events.value.push(`update:${value}`); if (!saving.value) opened.value = value; }
function onCloseRequest(details: DialogCloseDetails) { events.value.push(`request:${details.reason}`); }
async function save() {
  if (saving.value) return;
  saving.value = true; status.value = 'Saving';
  await new Promise(resolve => setTimeout(resolve, 400));
  saving.value = false; status.value = 'Saved'; opened.value = false;
}
</script>

<template>
  <section>
    <h2>Close after an async save</h2>
    <button type="button" @click="launch">Open save dialog</button>
    <output data-testid="save-status">{{ status }}</output>
    <output data-testid="save-events">{{ events.join('|') }}</output>
    <ZDialog :open="opened" :close-on-escape="!saving" :close-on-outside="!saving" @update:open="onUpdate" @close-request="onCloseRequest">
      <template #title>Async save</template>
      <p>Saving closes this dialog only after the owner finishes its work.</p>
      <button type="button" :disabled="saving" @click="save">Save changes</button>
    </ZDialog>
  </section>
</template>
