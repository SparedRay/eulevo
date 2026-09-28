<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TileBand from '@/components/TileBand.vue'
import { useGuestStore } from '@/stores/guest'
import { partyWhen } from '@/lib/format'
import { downloadCalendarEvent } from '@/lib/calendar'
import GuestCode from '@/components/GuestCode.vue'

const route = useRoute()
const store = useGuestStore()
const token = route.params.token as string
const giftId = route.params.giftId as string

onMounted(async () => {
  if (!store.data || store.token !== token) await store.load(token)
})

const claim = computed(() => store.mine.find((c) => c.gift_id === giftId) ?? null)

function addToCalendar() {
  const list = store.list
  if (!list?.event_at) return
  const items = store.mine.map((c) => c.title).join(', ')
  downloadCalendarEvent({
    title: list.title,
    startIso: list.event_at,
    location: list.address,
    description: `Levar: ${items}`,
  })
}
</script>

<template>
  <TileBand :height="112" />
  <main class="page">
    <div class="check-badge" aria-hidden="true">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 25l8 8 16-17" /></svg>
    </div>

    <div class="stack center">
      <h1>Obrigado!</h1>
      <p class="big">Você vai levar: <b>{{ claim?.title ?? 'o presente' }}</b>.</p>
    </div>

    <div class="card details">
      <p><b>Quando:</b> {{ partyWhen(store.list?.event_at ?? null) }}</p>
      <p v-if="store.list?.address"><b>Onde:</b> {{ store.list.address }}</p>
    </div>

    <GuestCode :code="store.myCode" variant="card" />

    <div class="stack push-bottom">
      <button v-if="store.list?.event_at" class="btn btn--primary" type="button" @click="addToCalendar">
        Adicionar à minha agenda
      </button>
      <RouterLink class="btn btn--outline" :to="{ name: 'guest-list', params: { token } }">Voltar à lista</RouterLink>
      <p class="small muted center">
        Este celular vai lembrar. Abra o mesmo link quando quiser para ver o que você vai levar.
      </p>
    </div>
  </main>
</template>

<style scoped>
.check-badge {
  width: 96px;
  height: 96px;
  margin: -66px auto 0;
  border-radius: 50%;
  background: var(--cobalt);
  border: 5px solid var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
}
.big {
  font-size: 20px;
}
.details {
  gap: 10px;
}
</style>
