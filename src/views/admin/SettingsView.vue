<script setup lang="ts">
// Host · Party details and co-hosts: edit name / date / time / address, see who manages the list,
// and (owner only) invite a partner with a one-time link, remove a co-host, hand the list over or delete it.
// Co-hosts can leave.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingState from '@/components/LoadingState.vue'
import TileBand from '@/components/TileBand.vue'
import HostNav from '@/components/HostNav.vue'
import PartyFields, { type PartyForm } from '@/components/PartyFields.vue'
import {
  cancelInvite,
  createInvite,
  deleteList,
  fetchHostGifts,
  fetchHostList,
  fetchListHosts,
  fetchOpenInvites,
  inviteUrl,
  leaveList,
  removeCoHost,
  transferOwnership,
  updateList,
  type HostGift,
  type HostList,
  type Invite,
  type ListHost,
} from '@/lib/api'
import { fromDateTimeInputs, partyDay, toDateInput, toTimeInput } from '@/lib/format'
import { copyText } from '@/lib/clipboard'

const route = useRoute()
const router = useRouter()
const listId = route.params.id as string

const list = ref<HostList | null>(null)
const gifts = ref<HostGift[]>([])
const hosts = ref<ListHost[]>([])
const invites = ref<Invite[]>([])
const loading = ref(true)
const loadFailed = ref(false)

const form = ref<PartyForm>({ title: '', date: '', time: '', address: '' })
const savingParty = ref(false)
const partyError = ref<string | null>(null)
const partySaved = ref(false)
// PartyFields edits the object in place, so watch deeply to hide "salvas" once the host types again.
watch(form, () => (partySaved.value = false), { deep: true })

const busy = ref(false)
const hostsError = ref<string | null>(null)
const hostsDone = ref<string | null>(null)
/** Action waiting for "Tem certeza?": `remove:<user>`, `transfer:<user>`, `leave` or `delete`. */
const confirming = ref<string | null>(null)
/** Invite whose link was just copied. */
const copiedToken = ref<string | null>(null)

const amOwner = computed(() => hosts.value.some((h) => h.is_me && h.is_owner))
const owner = computed(() => hosts.value.find((h) => h.is_owner) ?? null)
const giftCount = computed(() => gifts.value.filter((g) => !g.archived).length)
const claimCount = computed(() => gifts.value.reduce((n, g) => n + g.claim_count, 0))

function fillForm(l: HostList) {
  form.value = {
    title: l.title,
    date: toDateInput(l.event_at),
    time: toTimeInput(l.event_at) || '16:00',
    address: l.address ?? '',
  }
}

async function load() {
  loadFailed.value = false
  try {
    const [l, g, h] = await Promise.all([fetchHostList(listId), fetchHostGifts(listId), fetchListHosts(listId)])
    list.value = l
    gifts.value = g
    hosts.value = h
    if (l) fillForm(l)
    invites.value = h.some((x) => x.is_me && x.is_owner) ? await fetchOpenInvites(listId) : []
  } catch (e) {
    console.error(e)
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function saveParty() {
  partyError.value = null
  partySaved.value = false
  if (!form.value.title.trim()) {
    partyError.value = 'Dê um nome para a lista, por exemplo "Casa Nova".'
    return
  }
  savingParty.value = true
  try {
    const input = {
      title: form.value.title.trim(),
      event_at: fromDateTimeInputs(form.value.date, form.value.time),
      address: form.value.address.trim() || null,
    }
    await updateList(listId, input)
    list.value = { ...list.value!, ...input }
    partySaved.value = true
  } catch (e) {
    console.error(e)
    partyError.value = 'Não conseguimos salvar. Confira sua internet e tente de novo.'
  } finally {
    savingParty.value = false
  }
}

function whatsappInvite(token: string) {
  const text =
    `Oi! Quero que você me ajude a cuidar da lista de presentes "${list.value?.title}". ` +
    `Abra este link e entre com o seu e-mail: ${inviteUrl(token)}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

async function copyInvite(token: string, e: Event) {
  const input = (e.currentTarget as HTMLElement).closest('.invite')?.querySelector('input')
  await copyText(inviteUrl(token), input)
  copiedToken.value = token
}

/** Runs a co-host change, then reloads hosts and invites. */
async function hostAction(action: () => Promise<unknown>, done: string) {
  busy.value = true
  hostsError.value = null
  hostsDone.value = null
  try {
    await action()
    confirming.value = null
    await load()
    hostsDone.value = done
  } catch (e) {
    console.error(e)
    hostsError.value = 'Não conseguimos salvar. Confira sua internet e tente de novo.'
  } finally {
    busy.value = false
  }
}

const newInvite = () => hostAction(() => createInvite(listId), 'Convite criado. Agora mande o link.')
const dropInvite = (token: string) => hostAction(() => cancelInvite(token), 'Convite cancelado. O link não funciona mais.')
const remove = (h: ListHost) =>
  hostAction(() => removeCoHost(listId, h.user_id), `${h.email} não cuida mais desta lista.`)
const transfer = (h: ListHost) =>
  hostAction(async () => {
    if (!(await transferOwnership(listId, h.user_id))) throw new Error('transfer refused')
  }, `Pronto: agora ${h.email} é a pessoa responsável pela lista.`)

/** Leaving or deleting ends access to the list, so these go back to "Suas listas". */
async function leaveOrDelete(action: () => Promise<void>, failure: string) {
  busy.value = true
  hostsError.value = null
  try {
    await action()
    router.replace({ name: 'admin-lists' })
  } catch (e) {
    console.error(e)
    hostsError.value = failure
    busy.value = false
  }
}
const leave = () => leaveOrDelete(() => leaveList(listId), 'Não conseguimos tirar você da lista. Confira sua internet e tente de novo.')
const destroy = () => leaveOrDelete(() => deleteList(listId), 'Não conseguimos apagar a lista. Confira sua internet e tente de novo.')
</script>

<template>
  <TileBand :height="36" />
  <main class="page page--wide">
    <RouterLink class="back-link" :to="{ name: 'admin-lists' }">← Suas listas</RouterLink>

    <LoadingState v-if="loading" />

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
        <span class="eyebrow">{{ list.title }}</span>
        <h1>Festa e anfitriões</h1>
      </div>

      <HostNav :list-id="listId" :gifts="giftCount" :claims="claimCount" />

      <div class="columns">
        <section class="card" aria-labelledby="party-title">
          <h2 id="party-title">Dados da festa</h2>
          <form class="stack" novalidate @submit.prevent="saveParty">
            <PartyFields v-model="form" />
            <p class="small muted">
              Os convidados veem a mudança na hora. Quem já colocou a festa na agenda do celular não recebe aviso:
              mande uma mensagem para essas pessoas.
            </p>
            <p v-if="partyError" class="note" role="alert">{{ partyError }}</p>
            <p v-if="partySaved" class="strip" role="status">Pronto, mudanças salvas.</p>
            <button class="btn btn--primary" type="submit" :disabled="savingParty">
              {{ savingParty ? 'Salvando…' : 'Salvar mudanças' }}
            </button>
          </form>
        </section>

        <section class="card" aria-labelledby="hosts-title">
          <h2 id="hosts-title">Quem cuida desta lista</h2>

          <ul class="hosts">
            <li v-for="h in hosts" :key="h.user_id" class="host">
              <div class="host-row">
                <span class="email">
                  <b>{{ h.email }}</b>
                  <span class="muted small">
                    {{ [h.is_me ? 'você' : '', h.is_owner ? 'responsável pela lista' : 'co-anfitrião'].filter(Boolean).join(' · ') }}
                  </span>
                </span>
              </div>
              <div v-if="confirming === `remove:${h.user_id}`" class="stack">
                <p><b>Tem certeza?</b> {{ h.email }} não vai mais poder mexer nesta lista.</p>
                <button class="btn btn--primary" type="button" :disabled="busy" @click="remove(h)">Sim, remover</button>
                <button class="btn btn--outline" type="button" :disabled="busy" @click="confirming = null">
                  Não, manter
                </button>
              </div>
              <div v-else-if="confirming === `transfer:${h.user_id}`" class="stack">
                <p>
                  <b>Tem certeza?</b> {{ h.email }} passa a ser a pessoa responsável pela lista. Você continua cuidando
                  dela, mas não vai mais poder convidar, remover anfitriões ou apagar a lista.
                </p>
                <button class="btn btn--primary" type="button" :disabled="busy" @click="transfer(h)">
                  Sim, passar a lista
                </button>
                <button class="btn btn--outline" type="button" :disabled="busy" @click="confirming = null">
                  Não, manter comigo
                </button>
              </div>
              <div v-else-if="amOwner && !h.is_owner" class="host-actions">
                <button class="btn btn--outline" type="button" @click="confirming = `transfer:${h.user_id}`">
                  Passar a lista para esta pessoa
                </button>
                <button class="btn btn--outline" type="button" @click="confirming = `remove:${h.user_id}`">Remover</button>
              </div>
            </li>
          </ul>

          <p v-if="hostsDone" class="strip" role="status">{{ hostsDone }}</p>
          <p v-if="hostsError" class="note" role="alert">{{ hostsError }}</p>

          <template v-if="amOwner">
            <div v-for="inv in invites" :key="inv.token" class="invite stack">
              <h3>Convite aguardando</h3>
              <p class="small muted">
                O link funciona uma vez só e vale até {{ partyDay(inv.expires_at) }}. Quem abrir entra com o próprio
                e-mail e passa a cuidar da lista com você.
              </p>
              <label class="field">
                Link do convite
                <input :value="inviteUrl(inv.token)" readonly @focus="($event.target as HTMLInputElement).select()" />
              </label>
              <button class="btn btn--outline" type="button" @click="copyInvite(inv.token, $event)">
                {{ copiedToken === inv.token ? 'Link copiado!' : 'Copiar o link' }}
              </button>
              <a class="btn btn--primary" :href="whatsappInvite(inv.token)" target="_blank" rel="noopener">
                Enviar pelo WhatsApp
              </a>
              <button class="btn btn--outline" type="button" :disabled="busy" @click="dropInvite(inv.token)">
                Cancelar convite
              </button>
            </div>

            <template v-if="!invites.length">
              <p class="muted">
                Quer dividir a lista com alguém, como seu par? Crie um convite e mande o link. A pessoa poderá
                adicionar presentes, mudar a festa e ver quem vai levar o quê.
              </p>
              <button class="btn btn--primary" type="button" :disabled="busy" @click="newInvite">
                Convidar alguém para cuidar da lista
              </button>
            </template>
          </template>

          <template v-else>
            <p class="note">
              Só a pessoa responsável pela lista<template v-if="owner"> ({{ owner.email }})</template> pode convidar ou
              remover anfitriões.
            </p>
            <div v-if="confirming === 'leave'" class="stack">
              <p>
                <b>Tem certeza?</b> Você não vai mais ver esta lista. Para voltar, peça um convite novo para
                <template v-if="owner">{{ owner.email }}</template><template v-else>a pessoa responsável</template>.
              </p>
              <button class="btn btn--primary" type="button" :disabled="busy" @click="leave">Sim, sair da lista</button>
              <button class="btn btn--outline" type="button" :disabled="busy" @click="confirming = null">
                Não, continuar
              </button>
            </div>
            <button v-else class="btn btn--outline" type="button" @click="confirming = 'leave'">Sair desta lista</button>
          </template>
        </section>

        <section v-if="amOwner" class="card danger" aria-labelledby="delete-title">
          <h2 id="delete-title">Apagar a lista</h2>
          <p class="muted">
            Depois da festa, ou se a lista foi criada por engano. Apaga os presentes, as fotos e o que os convidados
            escolheram. O link dos convidados para de funcionar.
          </p>
          <div v-if="confirming === 'delete'" class="stack">
            <p><b>Tem certeza?</b> A lista "{{ list.title }}" será apagada para sempre. Não dá para desfazer.</p>
            <button class="btn btn--primary" type="button" :disabled="busy" @click="destroy">
              {{ busy ? 'Apagando…' : 'Sim, apagar para sempre' }}
            </button>
            <button class="btn btn--outline" type="button" :disabled="busy" @click="confirming = null">
              Não, manter a lista
            </button>
          </div>
          <button v-else class="btn btn--outline" type="button" @click="confirming = 'delete'">Apagar esta lista</button>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.columns {
  display: grid;
  gap: 24px;
  align-items: start;
}
@media (min-width: 900px) {
  .columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
h3 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 22px;
  margin: 0;
}
.hosts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.host {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1.5px solid var(--line);
}
.host-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.host-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.host-actions .btn {
  width: auto;
  flex: 1 1 auto;
}
.danger {
  border-style: dashed;
}
.email {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}
.invite {
  padding: 14px;
  border-radius: var(--radius);
  background: var(--sky);
}
.invite input {
  font-size: 16px;
  text-overflow: ellipsis;
}
</style>
