<script setup lang="ts">
import { ref } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import { ZSelect } from '@zoom-design/vue/select';

defineProps<{ getHost: () => HTMLElement | null }>();
const options = [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }];
const modalParent = ref(false);
const nonmodalParent = ref(false);
const modalChild = ref(false);
const modalChildOfNonmodal = ref(false);
const nonmodalChild = ref(false);
const selected = ref<string | null>(null);
function openModalParent() { modalParent.value = true; modalChild.value = false; nonmodalChild.value = false; }
function openNonmodalParent() { nonmodalParent.value = true; modalChildOfNonmodal.value = false; }
</script>

<template>
  <section>
    <h3>Mixed modal nesting</h3>
    <button type="button" @click="openModalParent">Open modal parent</button>
    <button type="button" @click="openNonmodalParent">Open nonmodal parent</button>
    <ZDialog :open="modalParent" portal :get-container="getHost" @update:open="modalParent = false">
      <template #title>Modal composition parent</template>
      <button type="button" @click="nonmodalChild = true">Open nonmodal child</button>
      <button type="button" @click="modalChild = true">Open modal child</button>
      <ZDialog :open="nonmodalChild" :modal="false" portal :get-container="getHost" @update:open="nonmodalChild = false">
        <template #title>Nonmodal composition child</template>
        <ZSelect v-model="selected" :options="options" portal :get-popup-container="getHost" aria-label="Nested choice" />
      </ZDialog>
      <ZDialog :open="modalChild" portal :get-container="getHost" @update:open="modalChild = false">
        <template #title>Modal composition child</template>
        <button type="button">Child action</button>
      </ZDialog>
    </ZDialog>
    <ZDialog :open="nonmodalParent" :modal="false" portal :get-container="getHost" @update:open="nonmodalParent = false">
      <template #title>Nonmodal composition parent</template>
      <button type="button" @click="modalChildOfNonmodal = true">Open modal child from nonmodal</button>
      <ZDialog :open="modalChildOfNonmodal" portal :get-container="getHost" @update:open="modalChildOfNonmodal = false">
        <template #title>Modal child of nonmodal</template>
        <button type="button">Child action</button>
      </ZDialog>
    </ZDialog>
  </section>
</template>
