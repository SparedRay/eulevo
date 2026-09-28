<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import LoadingState from '@/components/LoadingState.vue'
import TileBand from '@/components/TileBand.vue'
import GiftPhoto from '@/components/GiftPhoto.vue'
import { useGuestStore } from '@/stores/guest'
import { partyWhen } from '@/lib/format'
import GuestCode from '@/components/GuestCode.vue'

const route = useRoute()
const store = useGuestStore()
const token = route.params.token as string

onMounted(() => {
  store.startLive()
  store.load(token)
})
onUnmounted(() => store.stopLive())

function repeatNote(count: number) {
  if (count === 0) return 'Várias pessoas podem levar este presente.'
  if (count === 1) return 'Várias pessoas podem levar. 1 pessoa já vai levar.'
  return `Várias pessoas podem levar. ${count} pessoas já vão levar.`
}
</script>

<template>
  <TileBand />
  <main class="page">
    <LoadingState v-if="store.loading" label="Carregando a lista…" />

    <template v-else-if="store.notFound">
      <h1>Não encontramos esta lista</h1>
      <p class="muted">Confira se o link está completo, ou peça o link de novo aos anfitriões.</p>
    </template>

    <template v-else-if="store.error">
      <h1>Algo deu errado</h1>
      <p class="muted">{{ store.error }}</p>
      <button class="btn btn--primary" type="button" @click="store.load(token)">Tentar de novo</button>
    </template>

    <template v-else-if="store.list">
      <div class="stack">
        <span class="eyebrow">{{ store.list.title }}</span>
        <h1>Escolha um presente para levar</h1>
        <p class="muted">
          A festa é no <b class="ink">{{ partyWhen(store.list.event_at) }}</b>.
        </p>
        <GuestCode :code="store.myCode" />
      </div>

      <RouterLink v-if="store.mine.length" class="strip" :to="{ name: 'guest-mine', params: { token } }">
        <span>
          Você vai levar <b>{{ store.mine.length }} {{ store.mine.length === 1 ? 'presente' : 'presentes' }}</b>
        </span>
        <b class="link">Ver →</b>
      </RouterLink>

      <p v-if="!store.openGifts.length" class="note">
        Todos os presentes já foram escolhidos. Obrigado por conferir!
      </p>

      <article v-for="(gift, i) in store.openGifts" :key="gift.id" class="card">
        <div class="gift-row">
          <GiftPhoto :images="gift.images" :alt="gift.title" :tint="i % 2 ? 'sand' : 'sky'" />
          <div class="gift-text">
            <h2>{{ gift.title }}</h2>
            <p v-if="gift.repeatable" class="muted">{{ repeatNote(gift.claim_count) }}</p>
            <p v-else-if="gift.description" class="muted clamp">{{ gift.description }}</p>
          </div>
        </div>
        <RouterLink class="btn btn--primary" :to="{ name: 'guest-confirm', params: { token, giftId: gift.id } }">
          {{ gift.repeatable && gift.claim_count > 0 ? 'Quero levar também' : 'Quero levar este' }}
        </RouterLink>
      </article>
    </template>
  </main>
</template>

<style scoped>
.ink {
  color: var(--ink);
}
.link {
  color: var(--cobalt);
}
.gift-row {
  display: flex;
  gap: 16px;
  align-items: center;
}
.gift-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
