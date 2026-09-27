<script setup lang="ts">
// Phase 4: "Quem vai levar o quê" — claims table with release ("Liberar").
// Design reference: canvas page "C·4 Azulejo — final flow" → "Host · Who's bringing what".
import TileBand from '@/components/TileBand.vue'
</script>

<template>
  <TileBand :height="36" />
  <main class="page page--wide">
    <RouterLink class="back-link" :to="{ name: 'admin-lists' }">← Suas listas</RouterLink>
    <h1>Quem vai levar o quê</h1>
    <p class="note">Em construção.</p>
  </main>
</template>
