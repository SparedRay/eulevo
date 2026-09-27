<script setup lang="ts">
// Host · Your gift list: gifts with their status in words, add / edit / remove, and the share panel.
// Design reference: canvas page "C·4 Azulejo — final flow" → "Host · Your gift list" and "Host · Add a gift".
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import TileBand from '@/components/TileBand.vue'
import GiftPhoto from '@/components/GiftPhoto.vue'
import GiftForm from '@/components/GiftForm.vue'
import SharePanel from '@/components/SharePanel.vue'
import HostNav from '@/components/HostNav.vue'
import { fetchHostGifts, fetchHostList, setGiftArchived, type HostGift, type HostList } from '@/lib/api'
import { partyWhen } from '@/lib/format'

const route = useRoute()
const listId = route.params.id as string

const list = ref<HostList | null>(null)
const gifts = ref<HostGift[]>([])
const loading = ref(true)
const loadFailed = ref(false)
const error = ref<string | null>(null)
/** Short confirmation after a save, read out by screen readers. */
const saved = ref<string | null>(null)

/** Which gift has its form open: a gift id, 'new', or none. Only one form at a time. */
const editing = ref<string | null>(null)
/** Gift waiting for "Tem certeza?" before it leaves the list. */
const confirmingArchive = ref<string | null>(null)
const busy = ref(false)

const active = computed(() => gifts.value.filter((g) => !g.archived))
const archived = computed(() => gifts.value.filter((g) => g.archived))
const claimCount = computed(() => gifts.value.reduce((n, g) => n + g.claim_count, 0))
const shareUrl = computed(() => (list.value ? `${window.location.origin}/l/${list.value.share_token}` : ''))

async function load() {
  loadFailed.value = false
  try {
    const [l, g] = await Promise.all([fetchHostList(listId), fetchHostGifts(listId)])
    list.value = l
    gifts.value = g
  } catch (e) {
    console.error(e)
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

function peopleBringing(n: number) {
  return n === 1 ? '1 pessoa já vai levar' : `${n} pessoas já vão levar`
}

/** Status in words, as the host would say it. `ok` = still open to guests. */
function status(g: HostGift): { text: string; ok: boolean } {
  const n = g.claim_count
  if (!g.repeatable) return n === 0 ? { text: 'Ainda disponível', ok: true } : { text: 'Alguém vai levar', ok: false }
  if (g.max_claims === null) {
    return { text: n === 0 ? 'Ainda disponível. Várias pessoas podem levar.' : `${peopleBringing(n)}. Ainda cabe mais gente.`, ok: true }
  }
  if (n >= g.max_claims) return { text: `Completo: ${g.max_claims} de ${g.max_claims} pessoas vão levar`, ok: false }
  if (n === 0) return { text: `Ainda disponível. Até ${g.max_claims} pessoas podem levar.`, ok: true }
  return { text: `${n} de ${g.max_claims} pessoas já vão levar`, ok: true }
}

function goToShare() {
  const heading = document.getElementById('share-title')
  heading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  heading?.focus({ preventScroll: true })
}

async function focusHeading(id: string) {
  await nextTick()
  document.getElementById(id)?.focus()
}

function openForm(id: string) {
  editing.value = id
  confirmingArchive.value = null
  saved.value = null
  error.value = null
}

async function onSaved() {
  const wasNew = editing.value === 'new'
  editing.value = null
  saved.value = wasNew ? 'Presente adicionado. Ele já aparece para os convidados.' : 'Alterações salvas.'
  await load()
  focusHeading('gifts-title')
}

async function archive(g: HostGift, value: boolean) {
  busy.value = true
  error.value = null
  saved.value = null
  try {
    await setGiftArchived(g.id, value)
    confirmingArchive.value = null
    saved.value = value ? `"${g.title}" saiu da lista.` : `"${g.title}" voltou para a lista.`
    await load()
  } catch (e) {
    console.error(e)
    error.value = 'Não conseguimos salvar. Confira sua internet e tente de novo.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <TileBand :height="36" />
  <main class="page page--wide">
    <RouterLink class="back-link" :to="{ name: 'admin-lists' }">← Suas listas</RouterLink>

    <p v-if="loading" class="muted">Carregando…</p>

    <template v-else-if="loadFailed">
      <h1>Algo deu errado</h1>
      <p class="muted">Não conseguimos carregar esta lista. Confira sua internet e tente de novo.</p>
      <button class="btn btn--primary btn--auto" type="button" @click="load">Tentar de novo</button>
    </template>

    <template v-else-if="!list">
      <h1>Não encontramos esta lista</h1>
      <p class="muted">Ela pode ter sido apagada, ou você entrou com outro e-mail.</p>
    </template>

    <template v-else>
      <div class="stack">
        <span class="eyebrow">Sua lista</span>
        <h1>{{ list.title }}</h1>
        <p class="muted">Festa: {{ partyWhen(list.event_at) }}</p>
      </div>

      <HostNav :list-id="listId" :gifts="active.length" :claims="claimCount" />

      <!-- Phones: the share panel sits below the whole list, so offer a shortcut to it. -->
      <button class="btn btn--soft share-jump" type="button" @click="goToShare">
        Compartilhar o link com os convidados
      </button>

      <div class="layout">
        <section class="stack gifts" aria-labelledby="gifts-title">
          <h2 id="gifts-title" tabindex="-1">
            {{ active.length === 1 ? '1 presente' : `${active.length} presentes` }}
          </h2>

          <p v-if="saved" class="strip" role="status">{{ saved }}</p>
          <p v-if="error" class="note" role="alert">{{ error }}</p>

          <GiftForm v-if="editing === 'new'" :list-id="listId" @saved="onSaved" @cancel="editing = null" />
          <button v-else class="btn btn--primary" type="button" @click="openForm('new')">Adicionar presente</button>

          <p v-if="!active.length && editing !== 'new'" class="note">
            Sua lista ainda está vazia. Toque em "Adicionar presente" para colocar o primeiro.
          </p>

          <template v-for="(g, i) in active" :key="g.id">
            <GiftForm v-if="editing === g.id" :list-id="listId" :gift="g" @saved="onSaved" @cancel="editing = null" />
            <article v-else class="card">
              <div class="gift-row">
                <GiftPhoto :images="g.images" :alt="g.title" :width="80" :height="96" :tint="i % 2 ? 'sand' : 'sky'" />
                <div class="stack tight">
                  <h3 class="display">{{ g.title }}</h3>
                  <p class="status" :class="{ 'status--ok': status(g).ok }">{{ status(g).text }}</p>
                  <a v-if="g.links[0]" class="small" :href="g.links[0].url" target="_blank" rel="noopener">
                    Link da loja ↗
                  </a>
                </div>
              </div>

              <div v-if="confirmingArchive === g.id" class="stack">
                <p><b>Tem certeza?</b> O presente sai da lista e os convidados não vão mais ver.</p>
                <p v-if="g.claim_count" class="muted">
                  {{ peopleBringing(g.claim_count) }}. Quem escolheu não recebe aviso, então fale com essa pessoa se precisar.
                </p>
                <button class="btn btn--primary" type="button" :disabled="busy" @click="archive(g, true)">
                  Sim, tirar da lista
                </button>
                <button class="btn btn--outline" type="button" :disabled="busy" @click="confirmingArchive = null">
                  Não, manter
                </button>
              </div>
              <div v-else class="actions">
                <button class="btn btn--outline" type="button" @click="openForm(g.id)">Editar</button>
                <button class="btn btn--outline" type="button" @click="confirmingArchive = g.id">Tirar da lista</button>
              </div>
            </article>
          </template>

          <template v-if="archived.length">
            <h2 class="archived-title">Fora da lista</h2>
            <p class="muted">Os convidados não veem estes presentes.</p>
            <article v-for="g in archived" :key="g.id" class="card card--muted">
              <div class="gift-row">
                <GiftPhoto :images="g.images" :alt="g.title" :width="64" :height="76" />
                <h3 class="display">{{ g.title }}</h3>
              </div>
              <button class="btn btn--outline" type="button" :disabled="busy" @click="archive(g, false)">
                Voltar para a lista
              </button>
            </article>
          </template>
        </section>

        <aside class="stack side">
          <SharePanel :url="shareUrl" :title="list.title" :event-at="list.event_at" />
          <RouterLink class="btn btn--outline" :to="{ name: 'guest-list', params: { token: list.share_token } }">
            Ver a lista como convidado
          </RouterLink>
        </aside>
      </div>
    </template>
  </main>
</template>

<style scoped>
.layout {
  display: grid;
  gap: 28px;
  align-items: start;
}
@media (min-width: 900px) {
  .share-jump {
    display: none;
  }
  .layout {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
  .side {
    position: sticky;
    top: 16px;
  }
}
.gifts {
  gap: 16px;
}
.gifts h2:focus {
  outline: none;
}
h3 {
  font-size: 23px;
  margin: 0;
}
.gift-row {
  display: flex;
  gap: 14px;
  align-items: center;
}
.tight {
  gap: 4px;
  min-width: 0;
}
.status {
  font-weight: 700;
  color: var(--muted);
}
.status--ok {
  color: var(--available);
}
.actions {
  display: flex;
  gap: 10px;
}
.actions .btn {
  padding: 0 10px;
}
.archived-title {
  margin-top: 16px;
}
.card--muted {
  border-color: var(--line);
}
</style>
