<script setup lang="ts">
// Phase 2: gift list, add/edit gift form, share link (copy / WhatsApp / QR).
// Design reference: canvas page "C·4 Azulejo — final flow" → "Host · Your gift list" and "Host · Add a gift".
import TileBand from '@/components/TileBand.vue'
</script>

<template>
  <TileBand :height="36" />
  <main class="page page--wide">
    <RouterLink class="back-link" :to="{ name: 'admin-lists' }">← Suas listas</RouterLink>
    <h1>Presentes</h1>
    <p class="note">Em construção: aqui você vai adicionar presentes e compartilhar o link com os convidados.</p>
  </main>
</template>
