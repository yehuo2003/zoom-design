<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { DialogExpose } from '@zoom-design/vue/dialog';
const dialog = shallowRef<DialogExpose | null>(null);
dialog.value?.close();
</script>

<template>
  <ZDialog :open="'yes'" :panel-attrs="{ role: 'alertdialog' }">
    <template #close="{ requestClose }"><button @click="requestClose('programmatic')">Close</button></template>
  </ZDialog>
</template>
