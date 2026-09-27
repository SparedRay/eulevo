<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GiftPhoto from '@/components/GiftPhoto.vue'
import { useGuestStore } from '@/stores/guest'
import { partyWhen } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const store = useGuestStore()
const token = route.params.token as string
const giftId = route.params.giftId as string

const shareLocation = ref(false)
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

async function confirm() {
  saving.value = true
  failed.value = false
  try {
    const result = await store.claim(giftId, shareLocation.value)
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

    <p v-if="store.loading" class="muted">Carregando…</p>

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
        <span class="eyebrow">Falta confirmar</span>
        <h1>{{ gift.title }}</h1>
        <p v-if="gift.description" class="muted">{{ gift.description }}</p>
        <a v-if="shopLink" class="shop" :href="shopLink" target="_blank" rel="noopener">Ver um exemplo na loja ↗</a>
      </div>

      <div class="note stack question">
        <p class="big"><b>Você confirma que vai levar este presente?</b></p>
        <p>Se sim, leve no <b>{{ partyWhen(store.list?.event_at ?? null) }}</b>.</p>
      </div>

      <label class="check">
        <input v-model="shareLocation" type="checkbox" />
        Deixar os anfitriões verem minha região (cerca de 1 km)
      </label>

      <p v-if="failed" class="note" role="alert">Não conseguimos salvar. Confira sua internet e tente de novo.</p>

      <div class="stack push-bottom">
        <button class="btn btn--primary" type="button" :disabled="saving" @click="confirm">
          {{ saving ? 'Salvando…' : 'Sim, confirmo que levo' }}
        </button>
        <RouterLink class="btn btn--outline" :to="{ name: 'guest-list', params: { token } }">Não, voltar para a lista</RouterLink>
        <p class="small muted center">
          Só fica salvo quando você tocar em <b>Sim, confirmo que levo</b>. Não pedimos seu nome: este celular vai
          lembrar da sua escolha.
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
  gap: 6px;
}
.big {
  font-size: 20px;
}
.shop {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  font-weight: 700;
}
</style>
