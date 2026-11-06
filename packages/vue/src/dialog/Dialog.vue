<script setup lang="ts">
import { computed, useAttrs, useId, useTemplateRef, watchEffect } from 'vue';
import type { DialogProps, DialogEmits, DialogExpose, DialogSlots } from './types';
import { normalizeDialog, reportDialogIssues } from './normalize';
import { useDialogState } from './useDialogState';
import { useDialogDom } from './useDialogDom';

defineOptions({ name: 'ZDialog', inheritAttrs: false });
const props = withDefaults(defineProps<DialogProps>(), { open: false, modal: true, closeOnEscape: true, closeOnOutside: true, restoreFocus: true });
const emit = defineEmits<DialogEmits>();
const attrs = useAttrs();
const slots = defineSlots<DialogSlots>();
const panel = useTemplateRef<HTMLElement>('panel');
const root = useTemplateRef<HTMLElement>('root');
const generatedId = `zoom-dialog-${useId()}`;
const warned = new Set<string>();
const n = computed(() => normalizeDialog(props));

function warn(message: string) {
  if (import.meta.env.DEV && !warned.has(message)) {
    warned.add(message);
    console.warn(`ZDialog: ${message}`);
  }
}
watchEffect(() => reportDialogIssues(n.value.issues, warned, message => {
  if (import.meta.env.DEV) console.warn(`ZDialog: ${message}`);
}));

const panelId = computed(() => n.value.id ?? generatedId);
const titleId = computed(() => `${panelId.value}-title`);
const descriptionId = computed(() => `${panelId.value}-description`);

function reference(name: 'aria-label' | 'aria-labelledby'): string | undefined {
  const value = props[name] ?? attrs[name];
  if (value == null) return undefined;
  if (typeof value === 'string' && value.trim()) return value.trim();
  warn(`Invalid ${name}; using default or omitting value`);
  return undefined;
}
function nameAttributes() {
  const labelledby = reference('aria-labelledby');
  if (labelledby) return { 'aria-labelledby': labelledby };
  const label = reference('aria-label');
  if (label) return { 'aria-label': label };
  if (slots.title) return { 'aria-labelledby': titleId.value };
  warn('Missing accessible name');
  return {};
}
function descriptionAttributes() {
  const value = props['aria-describedby'] ?? attrs['aria-describedby'];
  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      warn('Invalid aria-describedby; using default or omitting value');
      return {};
    }
    return value ? { 'aria-describedby': value } : {};
  }
  return slots.description ? { 'aria-describedby': descriptionId.value } : {};
}
function panelAttributes() {
  return { ...n.value.panelAttrs, ...nameAttributes(), ...descriptionAttributes() };
}
function rootAttributes() {
  return Object.fromEntries(Object.entries(attrs).filter(([key, value]) =>
    key.toLowerCase().startsWith('data-') &&
    (value === undefined || ['string', 'number', 'boolean'].includes(typeof value)),
  ));
}

const { requestClose } = useDialogState(n, panel, emit);
const dom = useDialogDom(n, panel, root, requestClose, error => warn(`Cannot register dialog layer: ${String(error)}`), warn);
function closeButton(event?: Event) { requestClose('close-button', event); }
function focus(options?: FocusOptions) {
  if (n.value.open && panel.value?.isConnected) panel.value.focus(options);
}
defineExpose<DialogExpose>({ focus });
</script>

<template>
  <Teleport :to="dom.target.value || 'body'" :disabled="!dom.target.value">
    <div v-if="n.open" ref="root" v-bind="rootAttributes()" :class="['zoom-dialog', props.class]" :style="props.style" :data-zoom-modal="n.modal ? true : undefined">
      <div v-if="n.modal" class="zoom-dialog__backdrop" aria-hidden="true" />
      <div ref="panel" v-bind="panelAttributes()"
        :id="panelId" class="zoom-dialog__panel" role="dialog" :aria-modal="n.modal ? 'true' : undefined" tabindex="-1">
        <header class="zoom-dialog__header">
          <div class="zoom-dialog__heading">
            <div v-if="$slots.title" :id="titleId" class="zoom-dialog__title"><slot name="title" /></div>
            <div v-if="$slots.description" :id="descriptionId" class="zoom-dialog__description"><slot name="description" /></div>
          </div>
          <div v-if="$slots.close" class="zoom-dialog__close-slot"><slot name="close" :request-close="closeButton" /></div>
          <button v-else class="zoom-dialog__close" type="button" :aria-label="n.closeLabel" @click="closeButton">×</button>
        </header>
        <div class="zoom-dialog__content"><slot /></div>
        <footer v-if="$slots.footer" class="zoom-dialog__footer"><slot name="footer" /></footer>
      </div>
    </div>
  </Teleport>
</template>
