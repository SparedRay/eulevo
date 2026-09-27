<script setup lang="ts">
import TileBand from '@/components/TileBand.vue'
import { APP_NAME } from '@/config'
</script>

<template>
  <TileBand :height="112" />
  <main class="page">
    <span class="eyebrow">{{ APP_NAME }}</span>
    <h1>Listas de presentes simples, sem cadastro</h1>
    <p class="muted">Recebeu um link dos anfitriões? Abra esse link para ver a lista e escolher o que você vai levar.</p>
    <div class="stack push-bottom">
      <RouterLink class="btn btn--outline" :to="{ name: 'admin-login' }">Sou anfitrião — entrar</RouterLink>
    </div>
  </main>
</template>
