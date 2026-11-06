<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZDialog } from '@zoom-design/vue';
import { ZDialog as SubpathDialog } from '@zoom-design/vue/dialog';
import type { DialogExpose } from '@zoom-design/vue/dialog';
import type { DialogCloseDetails } from '@zoom-design/core';

const open = shallowRef(true);
const dialog = shallowRef<DialogExpose | null>(null);
const container = () => document.body;
function onCloseRequest(details: DialogCloseDetails) {
  const closed: false = details.open;
  void closed;
}
dialog.value?.focus({ preventScroll: true });
</script>

<template>
  <ZDialog ref="dialog" :open="open" :get-container="container" portal
    :panel-attrs="{ title: 'Settings', 'data-kind': 'form' }"
    aria-label="Settings" @update:open="next => open = next" @close-request="onCloseRequest">
    <template #title>Settings</template>
    <template #description>Update your settings</template>
    <template #default>Form content</template>
    <template #footer>Actions</template>
    <template #close="{ requestClose }"><button type="button" @click="requestClose()">Close</button></template>
  </ZDialog>
  <SubpathDialog :open="false" aria-label="Secondary dialog" :modal="false" />
</template>
