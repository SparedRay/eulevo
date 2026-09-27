<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TileBand from '@/components/TileBand.vue'
import { signOut as hostSignOut } from '@/lib/supabase'
import { createList, fetchHostLists, type HostList } from '@/lib/api'
import { partyWhen } from '@/lib/format'

const router = useRouter()
const lists = ref<HostList[]>([])
const loading = ref(true)
const creating = ref(false)
const error = ref<string | null>(null)

const form = ref({ title: '', date: '', time: '16:00', address: '' })

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
  const eventAt = form.value.date ? new Date(`${form.value.date}T${form.value.time || '16:00'}`).toISOString() : null
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
        <label class="field">Nome da lista <input v-model="form.title" placeholder="Casa Nova" /></label>
        <div class="two">
          <label class="field">Dia da festa <input v-model="form.date" type="date" /></label>
          <label class="field">Horário <input v-model="form.time" type="time" /></label>
        </div>
        <label class="field">Endereço da festa <input v-model="form.address" placeholder="Rua, número, bairro" /></label>
        <button class="btn btn--primary" type="submit" :disabled="creating">
          {{ creating ? 'Criando…' : 'Criar lista' }}
        </button>
      </form>
    </section>

    <p v-if="error" class="note" role="alert">{{ error }}</p>
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
.two {
  display: grid;
  gap: 12px;
}
@media (min-width: 520px) {
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
