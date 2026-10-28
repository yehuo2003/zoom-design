<script setup lang="ts">
import { ZButton } from '@zoom-design/vue/button';
const wrong = (event: string) => void event;
</script>
<template>
  <ZButton variant="unknown" />
  <ZButton :loading="42" />
  <ZButton :form="42" />
  <ZButton :onClick="wrong" />
</template>
