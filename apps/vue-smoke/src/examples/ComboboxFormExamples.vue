<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { SelectionValue } from '@zoom-design/core';

const value = shallowRef<SelectionValue>(null); const submits = shallowRef(0); const submitted = shallowRef(''); const requests = shallowRef(0);
const cancelReset = shallowRef(false); const restoreDefault = shallowRef(false); const disabled = shallowRef(false); const readonly = shallowRef(false); const loading = shallowRef(false);
const owner = shallowRef('combobox-form');
const probeOwner = shallowRef<string | undefined>();
const options = [{ value: 0, label: 'Numeric zero' }, { value: '', label: 'Empty business value' }, { value: 'blue', label: 'Blue choice' }, { value: 'disabled', label: 'Disabled business value', disabled: true }];
function requestValue(next: SelectionValue) { requests.value++; value.value = restoreDefault.value && next === null ? 'blue' : next; }
function submit(event: Event) { event.preventDefault(); submits.value++; submitted.value = JSON.stringify([...new FormData(event.target as HTMLFormElement)]); }
</script>

<template>
  <section aria-labelledby="combobox-form-title"><h2 id="combobox-form-title">Native forms &amp; reset ownership</h2>
    <form id="combobox-form" @submit="submit" @reset="cancelReset && $event.preventDefault()"><ZCombobox :model-value="value" :options="options" :disabled="disabled" :readonly="readonly" :loading="loading" aria-label="Required searchable choice" name="choice" required clearable clear-label="Clear required searchable choice" placeholder="Required choice" @update:model-value="requestValue" /><button type="submit">Submit combobox form</button><button type="reset">Reset combobox form</button></form>
    <form id="combobox-alternative-form" @submit="submit"><button type="submit">Submit alternative combobox form</button></form>
    <ZCombobox :model-value="0" :options="options" :form="owner" name="external" aria-label="External searchable choice" />
    <form id="combobox-form-owner-probe"><div data-testid="combobox-form-owner-probe"><ZCombobox :model-value="0" :options="options" :form="probeOwner" name="probe-choice" aria-label="Combobox form owner probe" /></div></form>
    <div class="combobox-controls"><button type="button" @click="probeOwner = ''">Set Combobox probe to empty form</button><button type="button" @click="probeOwner = 'combobox-alternative-form'">Set Combobox probe to external form</button><button type="button" @click="probeOwner = undefined">Clear Combobox probe form override</button></div>
    <div class="combobox-controls"><label><input v-model="cancelReset" type="checkbox"> Cancel combobox reset</label><label><input v-model="restoreDefault" type="checkbox"> Restore combobox default</label><label><input v-model="disabled" type="checkbox"> Disable required combobox</label><label><input v-model="readonly" type="checkbox"> Readonly required combobox</label><label><input v-model="loading" type="checkbox"> Loading required combobox</label></div>
    <div class="combobox-controls"><button @click="value = 'unknown'">Set unknown searchable form value</button><button @click="value = 'disabled'">Set disabled searchable form value</button><button @click="value = 0">Set searchable form zero</button><button @click="value = null">Set searchable form null</button><button @click="owner = owner === 'combobox-form' ? 'combobox-alternative-form' : 'combobox-form'">Move combobox form owner</button></div>
    <p>Submits <output data-testid="combobox-submit-count">{{ submits }}</output> · <output data-testid="combobox-form-data">{{ submitted }}</output></p><p>Value <output data-testid="combobox-form-value">{{ JSON.stringify(value) }}</output> · requests <output data-testid="combobox-form-requests">{{ requests }}</output></p>
  </section>
</template>
