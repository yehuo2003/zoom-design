<script setup lang="ts">
import { ref } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import { ZSelect } from '@zoom-design/vue/select';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { DialogCloseDetails } from '@zoom-design/core';

defineProps<{ getHost: () => HTMLElement | null }>();
const options = [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }, { value: 'gamma', label: 'Gamma' }];
const opened = ref(false);
const allowClose = ref(false);
const selected = ref<string | null>('alpha');
const searched = ref<string | null>(null);
const events = ref<string[]>([]);
const submission = ref('');
function launch() { opened.value = true; allowClose.value = false; events.value = []; submission.value = ''; }
function updateOpen(value: false) { if (allowClose.value) opened.value = value; }
function closeRequest(details: DialogCloseDetails) { events.value.push(details.reason); }
function submit(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  submission.value = JSON.stringify(Object.fromEntries(new FormData(form)));
}
</script>

<template>
  <section>
    <h3>Selection, form and guarded close</h3>
    <button type="button" @click="launch">Open composition form</button>
    <output data-testid="composition-close-events">{{ events.join('|') }}</output>
    <output data-testid="composition-submission">{{ submission }}</output>
    <ZDialog :open="opened" portal :get-container="getHost" @update:open="updateOpen" @close-request="closeRequest">
      <template #title>Composition form</template>
      <form id="composition-form" @submit="submit">
        <label>Title <input name="title" value="Draft"></label>
        <label>Choice <ZSelect v-model="selected" name="choice" :options="options" portal :get-popup-container="getHost" aria-label="Choice" /></label>
        <label>Search <ZCombobox v-model="searched" name="search" :options="options" portal :get-popup-container="getHost" aria-label="Search" /></label>
        <div class="long-content" data-testid="composition-scroll-content">
          <p v-for="index in 24" :key="index">Long form content row {{ index }}</p>
        </div>
      </form>
      <label><input v-model="allowClose" type="checkbox"> Allow parent close</label>
      <template #footer>
        <button type="reset" form="composition-form">Reset form</button>
        <button type="submit" form="composition-form">Submit form</button>
      </template>
    </ZDialog>
  </section>
</template>

<style scoped>
form { display: grid; gap: .75rem; }
form > label { display: flex; align-items: center; gap: .5rem; }
.long-content { max-block-size: 9rem; overflow: auto; }
</style>
