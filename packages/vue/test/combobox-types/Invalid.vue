<script setup lang="ts">
import { ZCombobox } from '@zoom-design/vue/combobox';
</script>
<template>
  <ZCombobox :model-value="true" />
  <ZCombobox size="huge" />
  <ZCombobox :options="[{ value: 0, label: 42 }]" />
  <ZCombobox :query="42" />
  <ZCombobox :min-query-length="'2'" />
</template>
