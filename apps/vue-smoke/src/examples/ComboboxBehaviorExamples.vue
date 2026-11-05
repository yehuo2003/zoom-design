<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { ComboboxExpose } from '@zoom-design/vue/combobox';
import type { SelectionOption, SelectionValue } from '@zoom-design/core';

const value = shallowRef<SelectionValue>(0); const query = shallowRef(''); const open = shallowRef(false);
const acceptValue = shallowRef(true); const acceptQuery = shallowRef(true); const acceptOpen = shallowRef(true);
const disabled = shallowRef(false); const readonly = shallowRef(false); const loading = shallowRef(false); const fieldsetDisabled = shallowRef(true);
const removed = shallowRef(false); const reversed = shallowRef(false); const disabledZero = shallowRef(false);
const showStateSlots = shallowRef(false); const mounted = shallowRef(true); const customFilter = shallowRef(false); const minimum = shallowRef(false); const loop = shallowRef(false);
const action = shallowRef<ComboboxExpose | null>(null); const events = ref<string[]>([]); const independent = shallowRef<SelectionValue>(null);
const baseOptions: readonly SelectionOption[] = [{ value: 0, label: 'Zero' }, { value: '0', label: 'String zero' }, { value: '', label: 'Empty string' }, { value: 'blocked', label: 'Disabled option', disabled: true }, { value: 'apple', label: 'Apple' }, { value: 'apricot', label: 'Apricot' }, { value: 'banana', label: 'Banana' }, { value: 'chinese', label: '中文选择' }];
const options = computed(() => { const next = baseOptions.filter(option => !removed.value || option.value !== 0).map(option => option.value === 0 ? { ...option, disabled: disabledZero.value } : option); return reversed.value ? [...next].reverse() : next; });
const description = computed(() => `${typeof value.value}:${JSON.stringify(value.value)}`);
const filter = computed(() => customFilter.value ? (text: string, option: SelectionOption) => option.label.toLowerCase().startsWith(text.toLowerCase()) : undefined);
function requestValue(next: SelectionValue) { events.value.push(`value:${JSON.stringify(next)}`); if (acceptValue.value) value.value = next; }
function requestQuery(next: string) { events.value.push(`query:${JSON.stringify(next)}`); if (acceptQuery.value) query.value = next; }
function requestOpen(next: boolean) { events.value.push(`open:${next}`); if (acceptOpen.value) open.value = next; }
</script>

<template>
  <section aria-labelledby="combobox-behavior-title"><h2 id="combobox-behavior-title">Controlled query, selection &amp; editing</h2>
    <div class="combobox-controls"><label><input v-model="acceptValue" type="checkbox"> Accept combobox value</label><label><input v-model="acceptQuery" type="checkbox"> Accept combobox query</label><label><input v-model="acceptOpen" type="checkbox"> Accept combobox open</label><label><input v-model="loop" type="checkbox"> Loop combobox navigation</label></div>
    <div class="combobox-row"><input aria-label="Before combobox"><ZCombobox v-if="mounted" ref="action" :model-value="value" :query="query" :open="open" :options="options" :filter-option="filter" :min-query-length="minimum ? 2 : 0" :disabled="disabled" :readonly="readonly" :loading="loading" :loop="loop" :input-attrs="{ title: 'Editable choice input', 'aria-label': 'Lower priority name', 'data-testid': 'combobox-input' }" aria-label="Choose searchable value" aria-describedby="combobox-description" clearable clear-label="Clear searchable choice" placeholder="Search an option" empty-text="No matching choices" @update:model-value="requestValue" @change="events.push(`change:${$event.reason}:${JSON.stringify($event.value)}`)" @update:query="requestQuery" @query-change="events.push(`query-change:${$event.reason}:${JSON.stringify($event.query)}`)" @update:open="requestOpen" @open-change="events.push(`open-change:${$event.reason}:${$event.open}`)" /><input aria-label="After combobox"></div>
    <p id="combobox-description">Editing only changes query; Enter confirms an existing option.</p>
    <p>Confirmed <output data-testid="combobox-value">{{ description }}</output> · query <output data-testid="combobox-query">{{ JSON.stringify(query) }}</output></p><output data-testid="combobox-events">{{ events.join('|') }}</output>
    <div class="combobox-controls"><button @click="events = []">Clear combobox events</button><button @click="query = ''">Set empty query</button><button @click="query = 'ap'">Set ap query</button><button @click="value = 0">Set combobox zero</button><button @click="value = 'banana'">Set combobox banana</button><button @click="value = null">Set combobox null</button><button @click="value = 'unknown'">Set unknown combobox value</button><button @click="open = true">Force open combobox</button><button @click="open = false">Force close combobox</button><button @click="removed = !removed">Toggle combobox zero option</button><button @click="reversed = !reversed">Reverse combobox options</button><button @click="disabledZero = !disabledZero">Toggle combobox zero disabled</button></div>
    <div class="combobox-controls"><label><input v-model="disabled" type="checkbox"> Disable combobox</label><label><input v-model="readonly" type="checkbox"> Readonly combobox</label><label><input v-model="loading" type="checkbox"> Loading combobox</label><label><input v-model="customFilter" type="checkbox"> Prefix filter</label><label><input v-model="minimum" type="checkbox"> Require two query characters</label><button @click="action?.focus({ preventScroll: true })">Focus combobox</button><button @click="action?.blur()">Blur combobox</button><button @click="mounted = !mounted">Toggle editable combobox</button></div>
    <label><input v-model="fieldsetDisabled" type="checkbox"> Disable combobox fieldset</label><fieldset :disabled="fieldsetDisabled"><legend>Fieldset inheritance</legend><ZCombobox :options="baseOptions" :model-value="0" aria-label="Fieldset combobox" /></fieldset>
    <div class="combobox-row"><ZCombobox v-model="independent" :options="baseOptions" aria-label="Independent combobox" /><output data-testid="independent-combobox-value">{{ JSON.stringify(independent) }}</output><ZCombobox aria-label="Empty combobox" empty-text="Nothing available" /><ZCombobox :options="baseOptions" aria-label="Unbound combobox" /><button @click="showStateSlots = !showStateSlots">Toggle combobox state slots</button><template v-if="showStateSlots"><ZCombobox :open="true" readonly aria-label="Custom empty combobox"><template #empty><span data-testid="combobox-empty-slot">Custom empty content</span></template></ZCombobox><ZCombobox :open="true" loading aria-label="Custom loading combobox"><template #loading><span data-testid="combobox-loading-slot">Fetching choices</span></template></ZCombobox></template></div>
    <ZCombobox :options="baseOptions" aria-label="Slot combobox"><template #option="{ option, selected, highlighted }"><span :data-selected="selected" :data-highlighted="highlighted">{{ option.label }} · custom</span></template></ZCombobox>
  </section>
</template>

<style>
.combobox-playground output[data-testid="combobox-events"] { display: block; block-size: 5rem; overflow: auto; }
</style>
