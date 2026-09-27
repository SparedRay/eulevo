<script setup lang="ts">
import TileBand from '@/components/TileBand.vue'
import { APP_NAME } from '@/config'
import { lastList } from '@/lib/lastList'

/** The installed app opens here, so a guest gets straight back to their list. */
const last = lastList()
</script>

<template>
  <TileBand :height="112" />
  <main class="page">
    <span class="eyebrow">{{ APP_NAME }}</span>
    <h1>Lista de Presentes</h1>

    <section v-if="last" class="card" aria-labelledby="last-title">
      <p class="muted">Você abriu esta lista neste celular:</p>
      <h2 id="last-title">{{ last.title }}</h2>
      <RouterLink class="btn btn--primary" :to="{ name: 'guest-list', params: { token: last.token } }">
        Abrir a lista
      </RouterLink>
    </section>
    <p v-else class="muted">
      Recebeu um link dos anfitriões? Abra esse link para ver a lista e escolher o que você vai levar.
    </p>

    <div class="stack push-bottom">
      <RouterLink class="btn btn--outline" :to="{ name: 'admin-lists' }">Sou anfitrião</RouterLink>
    </div>
  </main>
</template>
