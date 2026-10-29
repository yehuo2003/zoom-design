<script setup lang="ts">
import { ZSelect } from '@zoom-design/vue/select';
const wrong = (value: boolean) => void value;
</script>
<template>
  <ZSelect :model-value="true" />
  <ZSelect size="huge" />
  <ZSelect :options="[{ value: 0, label: 42 }]" />
  <ZSelect :open="42" />
</template>
