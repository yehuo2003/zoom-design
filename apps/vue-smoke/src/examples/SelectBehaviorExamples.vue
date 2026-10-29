<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { ZSelect } from '@zoom-design/vue/select';
import type { SelectExpose } from '@zoom-design/vue/select';

type Value = string | number | null;
const value = shallowRef<Value>(0);
const accepted = shallowRef(true); const acceptOpen = shallowRef(true); const open = shallowRef(false);
const disabled = shallowRef(false); const readonly = shallowRef(false); const loading = shallowRef(false); const fieldsetDisabled = shallowRef(true);
const removed = shallowRef(false); const reordered = shallowRef(false); const disabledZero = shallowRef(false); const loop = shallowRef(false);
const showIndependent = shallowRef(true); const independentValue = shallowRef<Value>(null); const attrsVersion = shallowRef(false);
const showStateSlots = shallowRef(false);
const unboundRequests = shallowRef(0);
const action = shallowRef<SelectExpose | null>(null); const events = ref<string[]>([]);
const baseOptions = [{ value: 0, label: 'Zero' }, { value: '0', label: 'String zero' }, { value: '', label: 'Empty string' }, { value: 'blocked', label: 'Disabled option', disabled: true }, { value: 'apple', label: 'Apple' }, { value: 'apricot', label: 'Apricot' }, { value: 'banana', label: 'Banana' }];
const options = computed(() => {
  const result = baseOptions.filter(option => !removed.value || option.value !== 0).map(option => option.value === 0 ? { ...option, disabled: disabledZero.value } : option);
  return reordered.value ? [...result].reverse() : result;
});
const description = computed(() => `${typeof value.value}:${JSON.stringify(value.value)}`);
const triggerAttrs = computed(() => ({ title: attrsVersion.value ? 'Updated trigger title' : 'Original trigger title', 'data-testid': 'choice-trigger', 'aria-label': 'Ignored lower priority name' }));
function requestValue(next: Value) { events.value.push(`value:${JSON.stringify(next)}`); if (accepted.value) value.value = next; }
function requestOpen(next: boolean) { events.value.push(`open:${next}`); if (acceptOpen.value) open.value = next; }
function changed(details: { reason: string; value: Value }) { events.value.push(`change:${details.reason}:${JSON.stringify(details.value)}`); }
function openChanged(details: { reason: string; open: boolean }) { events.value.push(`open-change:${details.reason}:${details.open}`); }
</script>

<template>
  <section aria-labelledby="selection-title">
    <h2 id="selection-title">Controlled selection &amp; keyboard</h2>
    <div class="select-controls"><label><input v-model="accepted" type="checkbox"> Accept value requests</label><label><input v-model="acceptOpen" type="checkbox"> Accept open requests</label><label><input v-model="loop" type="checkbox"> Loop navigation</label></div>
    <div class="select-row"><input aria-label="Before selection"><ZSelect ref="action" :model-value="value" :open="open" :options="options" :disabled="disabled" :readonly="readonly" :loading="loading" :loop="loop" :trigger-attrs="triggerAttrs" aria-label="Choose value" aria-describedby="choice-description" clearable clear-label="Clear selection" placeholder="Choose an option" @update:model-value="requestValue" @change="changed" @update:open="requestOpen" @open-change="openChanged" /><input aria-label="After selection"></div>
    <p id="choice-description">Numeric zero, string zero and empty string remain distinct.</p>
    <p>Confirmed <output data-testid="choice-value">{{ description }}</output></p><output data-testid="selection-events">{{ events.join('|') }}</output>
    <div class="select-controls"><button @click="events = []">Clear event log</button><button @click="open = true">Force open selection</button><button @click="open = false">Force close selection</button><button @click="value = 'unknown'">Set unknown value</button><button @click="value = 0">Set numeric zero</button><button @click="value = null">Set null value</button><button @click="removed = !removed">Toggle zero option</button><button @click="reordered = !reordered">Reverse options</button><button @click="disabledZero = !disabledZero">Toggle zero disabled</button></div>
    <div class="select-controls"><label><input v-model="disabled" type="checkbox"> Disable selection</label><label><input v-model="readonly" type="checkbox"> Readonly selection</label><label><input v-model="loading" type="checkbox"> Loading selection</label><button @click="action?.focus({ preventScroll: true })">Focus selection</button><button @click="action?.blur()">Blur selection</button><button @click="attrsVersion = !attrsVersion">Update trigger attrs</button></div>
    <label><input v-model="fieldsetDisabled" type="checkbox"> Disable fieldset</label><fieldset :disabled="fieldsetDisabled"><legend>Fieldset inheritance</legend><ZSelect :options="baseOptions" :model-value="0" aria-label="Fieldset select" /></fieldset>
    <div class="select-row"><button @click="showIndependent = !showIndependent">Toggle independent select</button><ZSelect v-if="showIndependent" v-model="independentValue" :options="baseOptions" aria-label="Independent select" /><output data-testid="independent-value">{{ JSON.stringify(independentValue) }}</output></div>
    <div class="select-row"><ZSelect aria-label="Empty select" empty-text="Nothing available" /><ZSelect :options="baseOptions" aria-label="Unbound select" placeholder="No accepted value" @update:model-value="unboundRequests++" /><output data-testid="unbound-requests">{{ unboundRequests }}</output><ZSelect :options="[{ value: 'none', label: 'Unavailable choice', disabled: true }]" aria-label="All disabled select" /><button @click="showStateSlots = !showStateSlots">Toggle state slots</button><template v-if="showStateSlots"><ZSelect :open="true" readonly :options="[]" aria-label="Custom empty select"><template #empty><span data-testid="empty-slot">Custom empty content</span></template></ZSelect><ZSelect :open="true" loading aria-label="Custom loading select"><template #loading><span data-testid="loading-slot">Fetching choices</span></template></ZSelect></template></div>
    <ZSelect :options="baseOptions" :model-value="0" aria-label="Slot select"><template #value="{ option }"><strong data-testid="value-slot">Selected {{ option?.label }}</strong></template><template #option="{ option, selected, highlighted }"><span :data-selected="selected" :data-highlighted="highlighted">{{ option.label }} · custom</span></template></ZSelect>
  </section>
</template>

<style>
.select-playground output[data-testid="selection-events"] { display: block; block-size: 4rem; overflow: auto; }
</style>
