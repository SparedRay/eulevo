<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { APP_NAME, MOCK } from '@/config'
import { useGuestStore } from '@/stores/guest'
import { navigating } from '@/router'

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
  <!-- Shown while the next screen is on its way (after a short delay, so quick changes don't flicker) -->
  <div v-if="navigating" class="route-loading" role="status">
    <span class="bar" aria-hidden="true"></span>
    <span class="pill">Carregando…</span>
  </div>
  <RouterView />
</template>

<style scoped>
.route-loading {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.bar {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--cobalt), transparent) 0 0 / 40% 100% no-repeat var(--sky);
  animation: slide 1.1s ease-in-out infinite;
}
.pill {
  margin-top: 10px;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--white);
  font-weight: 700;
  font-size: var(--text-small);
  box-shadow: 0 4px 16px rgb(20 33 61 / 0.25);
}
@keyframes slide {
  from {
    background-position: -40% 0;
  }
  to {
    background-position: 140% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .bar {
    animation: none;
    background: var(--cobalt);
  }
}
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
