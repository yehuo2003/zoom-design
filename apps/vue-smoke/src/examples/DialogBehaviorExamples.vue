<script setup lang="ts">
import AcceptedExample from './dialog-behavior/AcceptedExample.vue';
import GuardedExample from './dialog-behavior/GuardedExample.vue';
import AsyncSaveExample from './dialog-behavior/AsyncSaveExample.vue';
</script>

<template>
  <main>
    <h1>Dialog controlled requests</h1>
    <AcceptedExample />
    <GuardedExample />
    <AsyncSaveExample />
  </main>
</template>
