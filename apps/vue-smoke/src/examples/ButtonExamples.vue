<script setup lang="ts">
import { computed, ref } from 'vue';
import { ZButton } from '@zoom-design/vue/button';
import type { ButtonExpose, ButtonProps, ButtonSize } from '@zoom-design/vue/button';

const props = withDefaults(defineProps<{ brand?: 'purple' | 'teal' }>(), { brand: 'purple' });
const brandStyle = computed(() => ({ '--zoom-color-primary': props.brand === 'teal' ? '#0f766e' : '#7c3aed' }));
const action = ref<ButtonExpose | null>(null);
const disabled = ref(false); const loading = ref(false); const count = ref(0); const lastMouse = ref('');
const fieldsetCount = ref(0); const onceCount = ref(0); const stopCount = ref(0); const bubbleCount = ref(0); const preventCount = ref(0);
const version = ref(0); const dynamicLog = ref<string[]>([]); const submitCount = ref(0); const submitLog = ref(''); const model = ref('initial');
const isolated = ref(true); const isolatedCount = ref(0);
const collisionUpdated = ref(false); const collisionSubmits = ref(0);
const collisionAttrs = computed(() => ({ TYPE: collisionUpdated.value ? 'submit' : 'button', DISABLED: collisionUpdated.value ? null : '', 'ARIA-BUSY': collisionUpdated.value ? 'false' : 'true' }));
const sizes: ButtonSize[] = ['sm', 'md', 'lg'];
const invalid = { variant: 'wrong', size: null, type: 'invalid', disabled: 'false', loading: null, block: {} } as unknown as ButtonProps;
const dynamicAttrs = computed(() => ({ class: version.value ? 'updated' : 'original', title: version.value ? 'Updated title' : 'Original title', 'aria-label': version.value ? 'Updated name' : 'Original name', style: version.value ? { '--zoom-button-radius': '20px' } : {}, 'aria-busy': 'true' as const, 'data-zoom-size': 'hacked', name: '', value: 0, onClick: version.value ? () => dynamicLog.value.push('new') : () => dynamicLog.value.push('old') }));
function clicked(event: MouseEvent) { count.value++; lastMouse.value = event instanceof MouseEvent ? 'MouseEvent' : 'invalid'; }
function submitted(event: Event) {
  event.preventDefault(); submitCount.value++;
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement;
  const entries = [...new FormData(event.target as HTMLFormElement, submitter)].map(([key, value]) => `${key}=${value}`).join('&');
  submitLog.value = `${entries}|${submitter.formMethod}|${submitter.formEnctype}|${submitter.formTarget}|${new URL(submitter.formAction).pathname}`;
}
</script>

<template>
  <main class="button-playground">
    <header><p class="button-eyebrow">ZOOM DESIGN · VUE</p><h1>Button playground</h1><p>Native actions, local themes and explicit state. <a href="/theme">Theme playground</a></p></header>
    <section aria-labelledby="action-title">
      <h2 id="action-title">Actions &amp; states</h2>
      <div class="button-controls"><label><input v-model="disabled" type="checkbox"> Disable action</label><label><input v-model="loading" type="checkbox"> Loading action</label></div>
      <div class="button-row"><input data-testid="tab-before" aria-label="Before action"><ZButton ref="action" data-testid="action" :disabled="disabled" :loading="loading" @click="clicked">Save changes</ZButton><input data-testid="tab-after" aria-label="After action"></div>
      <p class="button-readout">Activations <output data-testid="click-count">{{ count }}</output> · <output data-testid="last-mouse">{{ lastMouse }}</output></p>
      <div class="button-row"><button @click="action?.focus({ preventScroll: true })">Focus action</button><button @click="action?.blur()">Blur action</button><ZButton data-testid="outline" variant="outline">Outline</ZButton><ZButton data-testid="text" variant="text">Text</ZButton></div>
    </section>
    <section aria-labelledby="geometry-title"><h2 id="geometry-title">Size, density &amp; direction</h2>
      <div v-for="density in ['regular', 'compact']" :key="density" :data-zoom-density="density" class="button-row"><span>{{ density }}</span><ZButton v-for="size in sizes" :key="size" :size="size" :data-testid="`${density}-${size}`">{{ size }}</ZButton></div>
      <div dir="rtl"><ZButton data-testid="block" block variant="outline">إجراء بعرض كامل · Full width action</ZButton></div>
    </section>
    <section aria-labelledby="brand-title"><h2 id="brand-title">Local themes &amp; typography</h2>
      <div :style="brandStyle" :data-button-brand="brand"><ZButton data-testid="brand-action">Brand action</ZButton></div>
      <div class="button-long"><ZButton data-testid="long">Long labels wrap naturally — 字号与行高随内容增长，不裁切正文。</ZButton></div>
      <button data-testid="native-host" class="button-native-host">Host native button</button>
    </section>
    <section aria-labelledby="content-title"><h2 id="content-title">Names &amp; loading content</h2><div class="button-row">
      <ZButton data-testid="icon-text"><template #icon>★</template>Favorite</ZButton><ZButton data-testid="icon-only" aria-label="Favorite item"><template #icon>★</template></ZButton>
      <ZButton data-testid="custom-loading" loading><template #loading>…</template>Uploading</ZButton><ZButton data-testid="unnamed"><template #icon>★</template></ZButton>
    </div></section>
    <section aria-labelledby="form-title"><h2 id="form-title">Native forms</h2>
      <form id="button-form" @submit="submitted"><label>Required value <input name="required" required aria-label="Required value"></label>
        <div class="button-row"><ZButton data-testid="default-in-form">Default action</ZButton><ZButton data-testid="submit" type="submit" name="inside" value="save">Submit</ZButton><ZButton data-testid="prevent" type="submit" @click.prevent="preventCount++">Prevent submit</ZButton></div>
      </form>
      <ZButton data-testid="external-submit" type="submit" form="button-form" name="external" :value="0" formaction="/button-submit" formmethod="post" formenctype="text/plain" formtarget="_self" formnovalidate>External submit without validation</ZButton>
      <p>Submits <output data-testid="submit-count">{{ submitCount }}</output> · <output data-testid="submit-log">{{ submitLog }}</output> · prevented <output data-testid="prevent-count">{{ preventCount }}</output></p>
      <form @submit.prevent><label>Resettable value <input value="initial" aria-label="Resettable value" @input="model = ($event.target as HTMLInputElement).value"></label><ZButton data-testid="reset" type="reset">Reset native input</ZButton></form><output data-testid="model-value">{{ model }}</output>
    </section>
    <section aria-labelledby="events-title"><h2 id="events-title">Attrs, events &amp; isolation</h2>
      <div class="button-row"><ZButton data-testid="once" @click.once="onceCount++">Once</ZButton><output data-testid="once-count">{{ onceCount }}</output><div @click="bubbleCount++"><ZButton data-testid="stop" @click.stop="stopCount++">Stop bubbling</ZButton></div><output data-testid="stop-count">{{ stopCount }}</output><output data-testid="bubble-count">{{ bubbleCount }}</output></div>
      <div class="button-row"><ZButton v-bind="dynamicAttrs" data-testid="dynamic">Dynamic attrs</ZButton><button @click="version++">Update attrs</button><output data-testid="dynamic-log">{{ dynamicLog.join(',') }}</output></div>
      <fieldset disabled><legend>Disabled fieldset</legend><ZButton data-testid="fieldset-action" @click="fieldsetCount++">Inherited disabled</ZButton></fieldset><output data-testid="fieldset-count">{{ fieldsetCount }}</output>
      <div class="button-row"><ZButton data-testid="invalid" v-bind="invalid">Invalid JS input is guarded</ZButton><button @click="isolated = !isolated">Toggle isolated</button><ZButton v-if="isolated" data-testid="isolated" @click="isolatedCount++">Independent instance</ZButton><output data-testid="isolated-count">{{ isolatedCount }}</output></div>
      <button @click="collisionUpdated = true">Update uppercase attrs</button>
      <form @submit.prevent="collisionSubmits++"><ZButton v-bind="collisionAttrs" data-testid="case-default">Default despite uppercase attrs</ZButton><ZButton v-bind="collisionAttrs" data-testid="case-disabled" disabled loading>Disabled despite uppercase attrs</ZButton></form><output data-testid="collision-submits">{{ collisionSubmits }}</output>
    </section>
  </main>
</template>

<style>
.button-playground { max-inline-size: 960px; margin: 0 auto; padding: 40px 24px 80px; color: #172033; font: 16px/1.6 system-ui, sans-serif; }
.button-playground header { border-block-end: 1px solid #dce1e8; padding-block-end: 24px; }
.button-playground h1 { font-size: 36px; line-height: 1.2; margin-block: 8px 16px; letter-spacing: -1px; }
.button-eyebrow { font-size: 12px; letter-spacing: 2px; color: #536078; }
.button-playground h2 { font-size: 20px; margin-block: 0 16px; }
.button-playground section { border-block-end: 1px solid #e5e8ee; padding-block: 28px; }
.button-row, .button-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-block: 12px; }
.button-controls { gap: 24px; }
.button-readout, .button-playground output { font-variant-numeric: tabular-nums; }
.button-playground input { max-inline-size: 180px; }
.button-long { --zoom-button-font-family: monospace; --zoom-button-font-size: 28px; --zoom-button-line-height: 2; max-inline-size: 360px; margin-block: 20px; }
.button-native-host { border-radius: 0; }
</style>
