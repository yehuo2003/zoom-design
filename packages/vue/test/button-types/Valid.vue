<script setup lang="ts">
import { ref } from 'vue';
import { ZButton } from '@zoom-design/vue';
import { ZButton as SubpathButton } from '@zoom-design/vue/button';
import type { ButtonExpose } from '@zoom-design/vue/button';
const button = ref<ButtonExpose | null>(null);
const handle = (event: MouseEvent) => event.preventDefault();
button.value?.focus({ preventScroll: true });
</script>
<template>
  <ZButton ref="button" variant="outline" type="submit" name="action" :value="0" form="external" formaction="/save" formmethod="post" formenctype="text/plain" formtarget="_self" :formnovalidate="true" :tabindex="0" :disabled="false" aria-label="Save" data-id="1" @click="handle">Save</ZButton>
  <SubpathButton size="lg" :loading="false" @click="event => event.clientX"><template #icon>★</template>Next</SubpathButton>
</template>
