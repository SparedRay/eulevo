<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { APP_NAME, MOCK } from '@/config'
import { useGuestStore } from '@/stores/guest'

// Guest pages are titled with the list's name, so a guest with several tabs can tell them apart.
const route = useRoute()
const guest = useGuestStore()
watchEffect(() => {
  if (route.meta.guest && guest.list) document.title = `${guest.list.title} · ${APP_NAME}`
})

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
