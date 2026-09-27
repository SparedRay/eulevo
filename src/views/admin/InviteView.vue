<script setup lang="ts">
// Opened from a co-host invite link. The host guard has already made the person sign in.
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import LoadingState from '@/components/LoadingState.vue'
import TileBand from '@/components/TileBand.vue'
import { acceptInvite, type InviteResult } from '@/lib/api'

const route = useRoute()
const token = route.params.token as string

const result = ref<InviteResult | null>(null)
const failed = ref(false)

async function accept() {
  failed.value = false
  result.value = null
  try {
    result.value = await acceptInvite(token)
  } catch (e) {
    console.error(e)
    failed.value = true
  }
}
onMounted(accept)
</script>

<template>
  <TileBand :height="112" />
  <main class="page">
    <span class="eyebrow">Convite para anfitrião</span>

    <template v-if="failed">
      <h1>Algo deu errado</h1>
      <p class="muted">Não conseguimos abrir o convite. Confira sua internet e tente de novo.</p>
      <button class="btn btn--primary" type="button" @click="accept">Tentar de novo</button>
    </template>

    <LoadingState v-else-if="!result" label="Abrindo o convite…" />

    <template v-else-if="result.status === 'ok' || result.status === 'already_host'">
      <h1>{{ result.status === 'ok' ? 'Pronto!' : 'Você já cuida desta lista' }}</h1>
      <p v-if="result.status === 'ok'" class="big">
        Agora você também cuida da lista <b>{{ result.title }}</b>: pode adicionar presentes, mudar a festa e ver quem
        vai levar o quê.
      </p>
      <p v-else class="big">A lista <b>{{ result.title }}</b> já aparece entre as suas.</p>
      <div class="stack push-bottom">
        <RouterLink class="btn btn--primary" :to="{ name: 'admin-gifts', params: { id: result.list_id } }">
          Abrir a lista
        </RouterLink>
      </div>
    </template>

    <template v-else>
      <h1>Este convite não funciona mais</h1>
      <p class="muted">
        <template v-if="result.status === 'used'">Ele já foi usado. </template>
        <template v-else-if="result.status === 'expired'">Ele venceu: os convites valem 7 dias. </template>
        <template v-else-if="result.status === 'not_found'">Confira se o link está completo. </template>
        <template v-else>Entre com seu e-mail, não como convidado. </template>
        Peça um convite novo para a pessoa responsável pela lista.
      </p>
      <div class="stack push-bottom">
        <RouterLink class="btn btn--outline" :to="{ name: 'admin-lists' }">Ver suas listas</RouterLink>
      </div>
    </template>
  </main>
</template>

<style scoped>
.big {
  font-size: 20px;
}
</style>
