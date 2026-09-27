<script setup lang="ts">
import { RouterView } from 'vue-router'
import { MOCK } from '@/config'

async function restartDemo() {
  // The guard lets production builds drop the mock chunk.
  if (MOCK) (await import('@/lib/mock')).resetMock()
}
</script>

<template>
  <p v-if="MOCK" class="mock-banner">
    Modo de teste: nada vai para o Supabase.
    <button type="button" @click="restartDemo">Recomeçar a demonstração</button>
  </p>
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
.mock-banner button {
  font: inherit;
  font-weight: 700;
  color: var(--cobalt);
  background: none;
  border: 0;
  text-decoration: underline;
  cursor: pointer;
  min-height: 32px;
}
</style>
