<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TileBand from '@/components/TileBand.vue'
import InstallHint from '@/components/InstallHint.vue'
import AccountCard from '@/components/AccountCard.vue'
import { signOut as hostSignOut } from '@/lib/supabase'
import { createList, fetchHostLists, type HostList } from '@/lib/api'
import { fromDateTimeInputs, partyWhen } from '@/lib/format'
import PartyFields, { type PartyForm } from '@/components/PartyFields.vue'

const router = useRouter()
const lists = ref<HostList[]>([])
const loading = ref(true)
const creating = ref(false)
const error = ref<string | null>(null)

const form = ref<PartyForm>({ title: '', date: '', time: '16:00', address: '' })

async function load() {
  loading.value = true
  try {
    lists.value = await fetchHostLists()
  } catch (e) {
    console.error(e)
    error.value = 'Não conseguimos carregar suas listas. Confira sua internet e recarregue a página.'
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.title.trim()) {
    error.value = 'Dê um nome para a lista, por exemplo "Casa Nova".'
    return
  }
  creating.value = true
  error.value = null
  const eventAt = fromDateTimeInputs(form.value.date, form.value.time)
  try {
    const id = await createList({ title: form.value.title.trim(), event_at: eventAt, address: form.value.address.trim() || null })
    router.push({ name: 'admin-gifts', params: { id } })
  } catch (e) {
    console.error(e)
    error.value = 'Não conseguimos criar a lista. Tente de novo.'
  } finally {
    creating.value = false
  }
}

async function signOut() {
  await hostSignOut()
  router.push({ name: 'admin-login' })
}

onMounted(load)
</script>

<template>
  <TileBand :height="36" />
  <main class="page page--wide">
    <div class="header">
      <div class="stack">
        <span class="eyebrow">Anfitriões</span>
        <h1>Suas listas</h1>
      </div>
      <button class="btn btn--outline btn--auto" type="button" @click="signOut">Sair</button>
    </div>

    <p v-if="loading" class="muted">Carregando…</p>

    <InstallHint />

    <RouterLink
      v-for="l in lists"
      :key="l.id"
      class="card list-card"
      :to="{ name: 'admin-gifts', params: { id: l.id } }"
    >
      <h2>{{ l.title }}</h2>
      <span class="muted">Festa: {{ partyWhen(l.event_at) }}</span>
    </RouterLink>

    <section class="card create">
      <h2>Criar uma lista nova</h2>
      <form class="stack" @submit.prevent="create">
        <PartyFields v-model="form" />
        <button class="btn btn--primary" type="submit" :disabled="creating">
          {{ creating ? 'Criando…' : 'Criar lista' }}
        </button>
      </form>
    </section>

    <p v-if="error" class="note" role="alert">{{ error }}</p>

    <AccountCard />
  </main>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}
.list-card {
  text-decoration: none;
  color: var(--ink);
  gap: 6px;
}
.create {
  border-style: dashed;
  max-width: 720px;
}
</style>
