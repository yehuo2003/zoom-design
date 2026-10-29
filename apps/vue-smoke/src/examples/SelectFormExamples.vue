<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZSelect } from '@zoom-design/vue/select';

type Value = string | number | null;
const value = shallowRef<Value>(null); const submits = shallowRef(0); const submitted = shallowRef(''); const resets = shallowRef(0);
const cancelReset = shallowRef(false); const restoreDefault = shallowRef(false); const disabled = shallowRef(false); const readonly = shallowRef(false); const loading = shallowRef(false);
const owner = shallowRef('selection-form');
const options = [{ value: 0, label: 'Numeric zero' }, { value: '', label: 'Empty business value' }, { value: 'blue', label: 'Blue choice' }, { value: 'disabled', label: 'Disabled business value', disabled: true }];
function resetValue(next: Value) { resets.value++; value.value = restoreDefault.value && next === null ? 'blue' : next; }
function submit(event: Event) { event.preventDefault(); submits.value++; submitted.value = JSON.stringify([...new FormData(event.target as HTMLFormElement)]); }
</script>

<template>
  <section aria-labelledby="select-form-title"><h2 id="select-form-title">Native forms &amp; reset ownership</h2>
    <form id="selection-form" @submit="submit" @reset="cancelReset && $event.preventDefault()"><ZSelect :model-value="value" :options="options" :disabled="disabled" :readonly="readonly" :loading="loading" aria-label="Required choice" name="choice" required clearable clear-label="Clear required choice" placeholder="Required choice" @update:model-value="resetValue" /><button type="submit">Submit selection form</button><button type="reset">Reset selection form</button></form>
    <form id="alternative-form" @submit="submit"><button type="submit">Submit alternative form</button></form>
    <ZSelect :model-value="0" :options="options" :form="owner" name="external" aria-label="External form choice" />
    <div class="select-controls"><label><input v-model="cancelReset" type="checkbox"> Cancel form reset</label><label><input v-model="restoreDefault" type="checkbox"> Restore application default</label><label><input v-model="disabled" type="checkbox"> Disable required choice</label><label><input v-model="readonly" type="checkbox"> Readonly required choice</label><label><input v-model="loading" type="checkbox"> Loading required choice</label></div>
    <div class="select-controls"><button @click="value = 'unknown'">Set unknown form value</button><button @click="value = 'disabled'">Set disabled form value</button><button @click="owner = owner === 'selection-form' ? 'alternative-form' : 'selection-form'">Move external form owner</button></div>
    <p>Submits <output data-testid="selection-submit-count">{{ submits }}</output> · <output data-testid="selection-form-data">{{ submitted }}</output></p><p>Value <output data-testid="form-value">{{ JSON.stringify(value) }}</output> · requests <output data-testid="form-requests">{{ resets }}</output></p>
  </section>
</template>
