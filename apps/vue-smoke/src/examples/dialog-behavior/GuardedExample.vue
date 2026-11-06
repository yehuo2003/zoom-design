<script setup lang="ts">
import { ref } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { DialogCloseDetails } from '@zoom-design/core';

const opened = ref(false);
const allowClose = ref(false);
const events = ref<string[]>([]);
function launch() { opened.value = true; allowClose.value = false; events.value = []; }
function onUpdate(value: false) { events.value.push(`update:${value}`); if (allowClose.value) opened.value = value; }
function onCloseRequest(details: DialogCloseDetails) { events.value.push(`request:${details.reason}`); }
</script>

<template>
  <section>
    <h2>Guard a controlled open prop</h2>
    <button type="button" @click="launch">Open guarded dialog</button>
    <output data-testid="guarded-events">{{ events.join('|') }}</output>
    <ZDialog :open="opened" @update:open="onUpdate" @close-request="onCloseRequest">
      <template #title>Guarded request</template>
      <p>Requests leave this dialog open until its owner allows them.</p>
      <label><input v-model="allowClose" type="checkbox">Allow close requests</label>
    </ZDialog>
  </section>
</template>
