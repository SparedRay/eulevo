<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import GiftPhoto from '@/components/GiftPhoto.vue'
import { useGuestStore } from '@/stores/guest'
import { partyWhen } from '@/lib/format'
import { downloadCalendarEvent } from '@/lib/calendar'

const route = useRoute()
const store = useGuestStore()
const token = route.params.token as string

/** Claim id waiting for "are you sure?" — releasing is never one tap. */
const confirmingRelease = ref<string | null>(null)
const releasing = ref(false)
const releaseFailed = ref(false)

onMounted(async () => {
  store.startLive()
  if (!store.data || store.token !== token) await store.load(token)
})
onUnmounted(() => store.stopLive())

function whoElse(others: number) {
  if (others === 0) return 'Só você'
  if (others === 1) return 'Você e mais 1 pessoa'
  return `Você e mais ${others} pessoas`
}

async function release(claimId: string) {
  releasing.value = true
  releaseFailed.value = false
  try {
    await store.release(claimId)
    confirmingRelease.value = null
  } catch (e) {
    console.error(e)
    releaseFailed.value = true
  } finally {
    releasing.value = false
  }
}

function addToCalendar() {
  const list = store.list
  if (!list?.event_at) return
  downloadCalendarEvent({
    title: list.title,
    startIso: list.event_at,
    location: list.address,
    description: `Levar: ${store.mine.map((c) => c.title).join(', ')}`,
  })
}
</script>

<template>
  <main class="page">
    <RouterLink class="back-link" :to="{ name: 'guest-list', params: { token } }">
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 3L5 9l6 6" /></svg>
      Voltar à lista
    </RouterLink>

    <div class="stack">
      <h1>O que você vai levar</h1>
      <p class="muted">Leve no <b class="ink">{{ partyWhen(store.list?.event_at ?? null) }}</b>.</p>
    </div>

    <p v-if="!store.mine.length && !store.loading" class="note">
      Você ainda não escolheu nenhum presente.
    </p>

    <article v-for="(c, i) in store.mine" :key="c.claim_id" class="card">
      <div class="row">
        <GiftPhoto :images="c.images" :alt="c.title" :width="80" :height="96" :tint="i % 2 ? 'sand' : 'sky'" />
        <div class="stack tight">
          <h2>{{ c.title }}</h2>
          <span class="muted">{{ whoElse(c.others) }}</span>
        </div>
      </div>

      <div v-if="confirmingRelease === c.claim_id" class="stack">
        <p><b>Tem certeza?</b> O presente volta para a lista e outra pessoa pode escolher.</p>
        <p v-if="releaseFailed" class="note" role="alert">Não conseguimos salvar. Confira sua internet e tente de novo.</p>
        <button class="btn btn--primary" type="button" :disabled="releasing" @click="release(c.claim_id)">
          {{ releasing ? 'Salvando…' : 'Sim, não posso levar' }}
        </button>
        <button class="btn btn--outline" type="button" :disabled="releasing" @click="confirmingRelease = null">
          Não, eu ainda levo
        </button>
      </div>
      <div v-else class="actions">
        <a v-if="c.links[0]" class="btn btn--soft" :href="c.links[0]?.url" target="_blank" rel="noopener">Ver na loja ↗</a>
        <button class="btn btn--outline" type="button" @click="(confirmingRelease = c.claim_id), (releaseFailed = false)">
          Não posso levar
        </button>
      </div>
    </article>

    <div class="stack push-bottom">
      <button v-if="store.mine.length && store.list?.event_at" class="btn btn--primary" type="button" @click="addToCalendar">
        Adicionar à minha agenda
      </button>
      <p class="small muted center">Salvo só neste celular. Se trocar de celular, fale com os anfitriões.</p>
    </div>
  </main>
</template>

<style scoped>
.ink {
  color: var(--ink);
}
.row {
  display: flex;
  gap: 14px;
  align-items: center;
}
.tight {
  gap: 4px;
}
.actions {
  display: flex;
  gap: 10px;
}
.actions .btn {
  font-size: 17px;
  padding: 0 10px;
}
</style>
