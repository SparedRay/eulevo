<script setup lang="ts">
// Host · Add a gift / Edit a gift, on its own screen (phones: the whole screen; back button works).
// Design reference: canvas page "C·4 Azulejo — final flow" → "Host · Add a gift (phone)".
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingState from '@/components/LoadingState.vue'
import TileBand from '@/components/TileBand.vue'
import GiftForm from '@/components/GiftForm.vue'
import { fetchHostGifts, fetchHostList, type HostGift, type HostList } from '@/lib/api'
import { setFlash } from '@/lib/flash'

const route = useRoute()
const router = useRouter()
const listId = route.params.id as string
const giftId = (route.params.giftId as string | undefined) ?? null

const list = ref<HostList | null>(null)
const gift = ref<HostGift | null>(null)
const loading = ref(true)
const loadFailed = ref(false)

const isNew = giftId === null
const giftsRoute = computed(() => ({ name: 'admin-gifts', params: { id: listId } }))

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    const [l, gifts] = await Promise.all([fetchHostList(listId), isNew ? Promise.resolve([]) : fetchHostGifts(listId)])
    list.value = l
    gift.value = gifts.find((g) => g.id === giftId) ?? null
  } catch (e) {
    console.error(e)
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** Back to the gift list: the browser's Back if we came from it (so history doesn't pile up), else a plain visit. */
function backToGifts() {
  const cameFromGifts = window.history.state?.back === router.resolve(giftsRoute.value).fullPath
  if (cameFromGifts) router.back()
  else router.replace(giftsRoute.value)
}

function onSaved() {
  setFlash(isNew ? 'Presente adicionado. Ele já aparece para os convidados.' : 'Alterações salvas.')
  backToGifts()
}
</script>

<template>
  <TileBand :height="36" />
  <main class="page form-page">
    <RouterLink class="back-link" :to="giftsRoute">← Presentes</RouterLink>

    <LoadingState v-if="loading" />

    <template v-else-if="loadFailed">
      <h1>Algo deu errado</h1>
      <p class="muted">Não conseguimos abrir esta tela. Confira sua internet e tente de novo.</p>
      <button class="btn btn--primary" type="button" @click="load()">Tentar de novo</button>
    </template>

    <template v-else-if="!list || (!isNew && !gift)">
      <h1>Não encontramos este presente</h1>
      <p class="muted">Ele pode ter sido apagado por outro anfitrião.</p>
      <RouterLink class="btn btn--primary" :to="giftsRoute">Voltar para os presentes</RouterLink>
    </template>

    <template v-else>
      <div class="stack">
        <span class="eyebrow">{{ list.title }}</span>
        <h1>{{ isNew ? 'Adicionar presente' : 'Editar presente' }}</h1>
      </div>
      <GiftForm :list-id="listId" :gift="gift ?? undefined" @saved="onSaved" @cancel="backToGifts" />
    </template>
  </main>
</template>

<style scoped>
.form-page {
  max-width: 640px;
}
</style>
