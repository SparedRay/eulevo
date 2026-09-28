<script setup lang="ts">
// Host · Who's bringing what: every active claim, newest first, with "Liberar" to free a gift up.
// Design reference: canvas page "C·4 Azulejo — final flow" → "Host · Who's bringing what".
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import LoadingState from '@/components/LoadingState.vue'
import TileBand from '@/components/TileBand.vue'
import HostNav from '@/components/HostNav.vue'
import {
  fetchHostClaims,
  fetchHostGifts,
  fetchHostList,
  releaseClaim,
  type HostClaim,
  type HostGift,
  type HostList,
} from '@/lib/api'
import { formatCode, shortDateTime } from '@/lib/format'
import { watchList } from '@/lib/live'

const route = useRoute()
const listId = route.params.id as string

const list = ref<HostList | null>(null)
const gifts = ref<HostGift[]>([])
const claims = ref<HostClaim[]>([])
const loading = ref(true)
const loadFailed = ref(false)
const error = ref<string | null>(null)
const done = ref<string | null>(null)

/** Claim waiting for "Tem certeza?" before it is released. */
const confirming = ref<string | null>(null)
const busy = ref(false)

const giftCount = computed(() => gifts.value.filter((g) => !g.archived).length)

/** "Procurar pelo código": a guest reads their code out, the host types it to see what they chose. */
const search = ref('')
const searchDigits = computed(() => search.value.replace(/\D/g, ''))
const shown = computed(() =>
  searchDigits.value ? claims.value.filter((c) => (c.guest_code ?? '').includes(searchDigits.value)) : claims.value,
)

/** The guest's code, or the old short tag for phones that don't have one yet. */
const codeOf = (c: HostClaim) => (c.guest_code ? formatCode(c.guest_code) : c.device_tag)

/** "1ª pessoa", "2ª pessoa"… for gifts several guests are bringing, counted in the order they chose. */
const position = computed(() => {
  const byGift = new Map<string, HostClaim[]>()
  for (const c of claims.value) byGift.set(c.gift_id, [...(byGift.get(c.gift_id) ?? []), c])
  const pos = new Map<string, number>()
  for (const group of byGift.values()) {
    if (group.length < 2) continue
    ;[...group].sort((a, b) => a.claimed_at.localeCompare(b.claimed_at)).forEach((c, i) => pos.set(c.id, i + 1))
  }
  return pos
})

/** `quiet`: a background refresh. If it fails, keep what's on screen; the next one will try again. */
async function load(quiet = false) {
  if (!quiet) loadFailed.value = false
  try {
    const [l, g, c] = await Promise.all([fetchHostList(listId), fetchHostGifts(listId), fetchHostClaims(listId)])
    list.value = l
    gifts.value = g
    claims.value = c
  } catch (e) {
    console.error(e)
    if (!quiet) loadFailed.value = true
  } finally {
    loading.value = false
  }
}
// Live: new claims appear (and released ones go) while the host is looking.
let stopWatching = () => {}
onMounted(async () => {
  await load()
  stopWatching = watchList(listId, () => load(true))
})

onUnmounted(() => stopWatching())

function when(iso: string) {
  const s = shortDateTime(iso)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ask(id: string) {
  confirming.value = id
  done.value = null
  error.value = null
}

async function release(c: HostClaim) {
  busy.value = true
  error.value = null
  try {
    const ok = await releaseClaim(c.id)
    confirming.value = null
    done.value = ok
      ? `Pronto: "${c.gift_title}" voltou para a lista e outra pessoa pode escolher.`
      : `"${c.gift_title}" já tinha sido liberado.`
    await load()
  } catch (e) {
    console.error(e)
    error.value = 'Não conseguimos liberar o presente. Confira sua internet e tente de novo.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <TileBand :height="36" />
  <main class="page page--wide">
    <RouterLink class="back-link" :to="{ name: 'admin-lists' }">← Suas listas</RouterLink>

    <LoadingState v-if="loading" />

    <template v-else-if="loadFailed">
      <h1>Algo deu errado</h1>
      <p class="muted">Não conseguimos carregar esta lista. Confira sua internet e tente de novo.</p>
      <button class="btn btn--primary btn--auto" type="button" @click="load()">Tentar de novo</button>
    </template>

    <template v-else-if="!list">
      <h1>Não encontramos esta lista</h1>
      <p class="muted">Ela pode ter sido apagada, ou você entrou com outro e-mail.</p>
    </template>

    <template v-else>
      <div class="stack">
        <span class="eyebrow">{{ list.title }}</span>
        <h1>Quem vai levar o quê</h1>
      </div>

      <HostNav :list-id="listId" :gifts="giftCount" :claims="claims.length" />

      <div class="note privacy">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        <p>
          Os convidados não dão o nome. Cada celular tem um <b>código de 6 números</b>, que o convidado também vê na
          tela dele. O mesmo código quer dizer o mesmo celular. Se alguém falar com você sobre um presente, peça o
          código e procure aqui.
        </p>
      </div>

      <p v-if="done" class="strip" role="status">{{ done }}</p>
      <p v-if="error" class="note" role="alert">{{ error }}</p>

      <p v-if="!claims.length" class="note">
        Ninguém escolheu um presente ainda. Quando alguém escolher, aparece aqui.
      </p>

      <template v-else>
        <label class="field search">
          Procurar pelo código
          <input v-model="search" inputmode="numeric" autocomplete="off" placeholder="Ex.: 482 913" />
        </label>

        <p v-if="!shown.length" class="note">
          Nenhum presente com esse código. Confira os números com o convidado.
        </p>

        <div v-else class="row head" aria-hidden="true">
          <span>Presente</span><span>Escolhido</span><span>Código do convidado</span><span></span>
        </div>

        <ul class="rows">
          <li v-for="c in shown" :key="c.id" class="row card">
            <span class="gift display">
              {{ c.gift_title }}
              <span v-if="position.get(c.id)" class="nth">({{ position.get(c.id) }}ª pessoa)</span>
            </span>
            <span><span class="label">Escolhido: </span>{{ when(c.claimed_at) }}</span>
            <span>
              <span class="label">Código do convidado: </span>
              <b class="tag">{{ codeOf(c) }}</b>
              <span v-if="c.device_summary" class="muted"> · {{ c.device_summary }}</span>
            </span>

            <div v-if="confirming === c.id" class="confirm stack">
              <p>
                <b>Tem certeza?</b> "{{ c.gift_title }}" volta para a lista e outra pessoa pode escolher. O convidado não
                recebe aviso.
              </p>
              <div class="confirm-actions">
                <button class="btn btn--primary" type="button" :disabled="busy" @click="release(c)">Sim, liberar</button>
                <button class="btn btn--outline" type="button" :disabled="busy" @click="confirming = null">
                  Não, manter
                </button>
              </div>
            </div>
            <button v-else class="btn btn--outline release" type="button" @click="ask(c.id)">Liberar</button>
          </li>
        </ul>
      </template>
    </template>
  </main>
</template>

<style scoped>
.privacy {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--ink);
}
.privacy svg {
  flex-shrink: 0;
  color: var(--cobalt);
  margin-top: 1px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* Phones: one card per claim, each value with its label */
.row {
  gap: 6px;
  border-width: 1.5px;
  border-color: var(--line);
}
.head {
  display: none;
}
.gift {
  font-size: 23px;
}
.nth {
  font-family: var(--font-body);
  font-size: var(--text-small);
  color: var(--cobalt);
}
.tag {
  color: var(--cobalt);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.search {
  max-width: 360px;
}
.label {
  font-weight: 700;
}
.release {
  margin-top: 6px;
}
.confirm {
  margin-top: 6px;
}
.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Computer: the table from the mockup */
@media (min-width: 900px) {
  .row {
    display: grid;
    grid-template-columns: 2.2fr 1.4fr 1.8fr 150px;
    column-gap: 16px;
    align-items: center;
    padding: 8px 18px;
  }
  .head {
    display: grid;
    background: none;
    border: 0;
    padding-block: 0;
    font-size: var(--text-small);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .release {
    margin-top: 0;
  }
  .confirm {
    grid-column: 1 / -1;
    margin: 6px 0;
  }
  .confirm-actions {
    flex-direction: row;
  }
  .confirm-actions .btn {
    width: auto;
  }
}
</style>
