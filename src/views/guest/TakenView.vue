<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const token = route.params.token as string
</script>

<template>
  <main class="page">
    <div class="arch" aria-hidden="true">
      <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 20h30v20H9zM7 13h34v7H7zM24 13v27" /><path d="M24 13c-4-7-12-7-12-2s8 2 12 2c4 0 12 2 12-2s-8-5-12 2" /></svg>
    </div>
    <div class="stack center">
      <h1>Alguém acabou de escolher este presente</h1>
      <p class="muted">Outra pessoa escolheu um momento antes de você. Nada foi salvo no seu nome.</p>
    </div>
    <div class="stack push-bottom">
      <RouterLink class="btn btn--primary" :to="{ name: 'guest-list', params: { token } }">Escolher outro presente</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.arch {
  width: 200px;
  height: 220px;
  margin: 40px auto 8px;
  border-radius: 100px 100px 16px 16px;
  border: 2px solid var(--cobalt);
  background: var(--sky);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
