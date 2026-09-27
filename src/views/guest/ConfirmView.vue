<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingState from '@/components/LoadingState.vue'
import GiftPhoto from '@/components/GiftPhoto.vue'
import { useGuestStore } from '@/stores/guest'
import { partyWhen } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const store = useGuestStore()
const token = route.params.token as string
const giftId = route.params.giftId as string

const saving = ref(false)
const failed = ref(false)

// Live: if another guest takes this gift while it's open here, the screen says so right away.
onMounted(async () => {
  store.startLive()
  if (!store.data || store.token !== token) await store.load(token)
})
onUnmounted(() => store.stopLive())

const gift = computed(() => store.giftById(giftId))
const shopLink = computed(() => gift.value?.links[0]?.url ?? null)

/** Someone else already said they'll bring this (repeatable gift): the guest joins them. */
const joining = computed(() => !!gift.value?.repeatable && gift.value.claim_count > 0)
const question = computed(() =>
  joining.value ? 'Você confirma que também vai levar este presente?' : 'Você confirma que vai levar este presente?',
)
const consequence = computed(() =>
  gift.value?.repeatable
    ? 'Ao confirmar, você entra na lista de quem vai levar. Outras pessoas também podem levar.'
    : 'Ao confirmar, ele fica reservado para você e some da lista para as outras pessoas.',
)
const yesLabel = computed(() => (joining.value ? 'Sim, também levarei' : 'Sim, confirmo que levo'))

async function confirm() {
  saving.value = true
  failed.value = false
  try {
    const result = await store.claim(giftId)
    if (result === 'ok' || result === 'already_yours') {
      router.replace({ name: 'guest-done', params: { token, giftId } })
    } else {
      router.replace({ name: 'guest-taken', params: { token, giftId } })
    }
  } catch (e) {
    console.error(e)
    failed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <RouterLink class="back-link" :to="{ name: 'guest-list', params: { token } }">
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 3L5 9l6 6" /></svg>
      Voltar à lista
    </RouterLink>

    <LoadingState v-if="store.loading" />

    <template v-else-if="!gift">
      <div class="stack" role="alert">
        <h1>Alguém acabou de escolher este presente</h1>
        <p class="muted">Outra pessoa escolheu antes de você confirmar. Nada foi salvo no seu nome.</p>
      </div>
      <RouterLink class="btn btn--primary" :to="{ name: 'guest-list', params: { token } }">Escolher outro presente</RouterLink>
    </template>

    <template v-else>
      <GiftPhoto class="hero" :images="gift.images" :alt="gift.title" :width="350" :height="180" />
      <div class="stack">
        <span class="eyebrow">Só falta confirmar</span>
        <h1>{{ gift.title }}</h1>
        <p v-if="gift.description" class="muted">{{ gift.description }}</p>
        <a v-if="shopLink" class="shop" :href="shopLink" target="_blank" rel="noopener">Ver um exemplo na loja ↗</a>
      </div>

      <section class="card question" aria-labelledby="confirm-question">
        <h2 id="confirm-question">{{ question }}</h2>
        <p class="muted">{{ consequence }}</p>
        <div class="when">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="6" width="20" height="18" rx="3" /><path d="M4 12h20M10 3v6M18 3v6" /></svg>
          <p>
            <span class="muted">Leve no dia da festa</span><br />
            <b>{{ partyWhen(store.list?.event_at ?? null) }}</b>
          </p>
        </div>
      </section>

      <p v-if="failed" class="note" role="alert">Não conseguimos salvar. Confira sua internet e tente de novo.</p>

      <div class="stack">
        <button class="btn btn--primary" type="button" :disabled="saving" @click="confirm">
          {{ saving ? 'Salvando…' : yesLabel }}
        </button>
        <RouterLink class="btn btn--outline" :to="{ name: 'guest-list', params: { token } }">Não, voltar para a lista</RouterLink>
      </div>

      <div class="saved small">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        <p>
          <b>Sua escolha fica salva neste celular.</b> Não é necessário informar seu nome. Assim, você pode consultar
          ou alterar sua escolha depois.
        </p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.hero {
  width: 100% !important;
  border-radius: 999px 999px 16px 16px !important;
}
.question {
  gap: 12px;
}
.question h2 {
  font-size: 27px;
  line-height: 1.1;
}
.when {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--sky);
  color: var(--cobalt);
}
.when svg {
  flex-shrink: 0;
}
.when p {
  color: var(--ink);
  font-size: 17px;
  line-height: 1.35;
}
.when b {
  font-size: 18px;
}
.saved {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--muted);
  padding-bottom: 8px;
}
.saved svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--ink);
}
.saved b {
  color: var(--ink);
}
.shop {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  font-weight: 700;
}
</style>
