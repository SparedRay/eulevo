<script setup lang="ts">
import { RouterView } from 'vue-router'
import { MOCK } from '@/config'
</script>

<template>
  <p v-if="MOCK" class="mock-banner">Modo de teste: nada é salvo de verdade. Recarregar a página volta ao início.</p>
  <RouterView />
</template>

<style scoped>
.mock-banner {
  background: var(--sand);
  color: var(--ink);
  font-size: var(--text-small);
  text-align: center;
  padding: 6px var(--gutter);
  border-bottom: 1px solid var(--line);
}
</style>
