<script setup lang="ts">
import { ref } from 'vue';
import { ZSelect } from '@zoom-design/vue';
import { ZSelect as SubpathSelect } from '@zoom-design/vue/select';
import type { SelectExpose } from '@zoom-design/vue/select';
const value = ref<string | number | null>(0);
const open = ref(false);
const select = ref<SelectExpose | null>(null);
const options = [{ value: 0, label: 'Zero' }, { value: '', label: 'Empty' }];
select.value?.focus({ preventScroll: true });
</script>
<template>
  <ZSelect ref="select" v-model="value" v-model:open="open" :options="options" name="choice" form="external" required clearable aria-label="Choice" :trigger-attrs="{ title: 'Choose' }">
    <template #option="{ option, selected, highlighted }">{{ option.label.toUpperCase() }} {{ selected }} {{ highlighted }}</template>
    <template #value="{ value: selectedValue, option }">{{ selectedValue }} {{ option?.label }}</template>
    <template #empty>No choices</template><template #loading>Loading choices</template>
  </ZSelect>
  <SubpathSelect size="lg" :model-value="''" :options="options" :readonly="false" @update:model-value="next => value = next" />
</template>
