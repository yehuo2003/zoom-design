<script setup lang="ts">
import { ref } from 'vue';
import { ZCombobox } from '@zoom-design/vue';
import { ZCombobox as SubpathCombobox } from '@zoom-design/vue/combobox';
import type { ComboboxExpose } from '@zoom-design/vue/combobox';
const value = ref<string | number | null>(0);
const query = ref('Ze');
const open = ref(false);
const combobox = ref<ComboboxExpose | null>(null);
const options = [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty' }];
combobox.value?.focus({ preventScroll: true });
</script>
<template>
  <ZCombobox ref="combobox" v-model="value" v-model:query="query" v-model:open="open" :options="options" name="choice" form="external" required clearable aria-label="Choice" :input-attrs="{ title: 'Choose' }">
    <template #option="{ option, selected, highlighted }">{{ option.label.toUpperCase() }} {{ selected }} {{ highlighted }}</template>
    <template #empty>No choices</template><template #loading>Loading choices</template>
  </ZCombobox>
  <SubpathCombobox size="lg" :model-value="''" :options="options" :readonly="false" :min-query-length="1" :filter-option="(query, option) => option.label.startsWith(query)" @update:query="next => query = next" />
</template>
