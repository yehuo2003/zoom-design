<script setup lang="ts">
import { shallowRef } from 'vue';
import BuildProbe from '../../../packages/vue/test/fixtures/BuildProbe.vue';

const label = shallowRef('Initial');
const visible = shallowRef(true);
const emitted = shallowRef(0);
const cleanup = shallowRef('mounted');
</script>

<template>
  <main>
    <BuildProbe v-if="visible" :label="label" @changed="emitted = $event" @disposed="cleanup = 'disposed'" />
    <p v-else>unmounted</p>
    <p>Emitted: <output aria-label="Emitted count">{{ emitted }}</output></p>
    <p>Cleanup: <output aria-label="Cleanup">{{ cleanup }}</output></p>
    <button type="button" :disabled="!visible" @click="label = 'Updated'">Update label</button>
    <button type="button" :disabled="!visible" @click="visible = false">Unmount</button>
  </main>
</template>
