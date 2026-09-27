<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import TileBand from '@/components/TileBand.vue'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const next = typeof route.query.next === 'string' ? route.query.next : '/admin'
const redirectTo = `${window.location.origin}${next}`

const email = ref('')
const sending = ref(false)
const sentTo = ref<string | null>(null)
const error = ref<string | null>(null)

async function withGoogle() {
  error.value = null
  const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  if (e) error.value = 'Não foi possível entrar com o Google. Tente pelo e-mail.'
}

async function withEmail() {
  if (!email.value.includes('@')) {
    error.value = 'Confira o e-mail — parece que falta alguma coisa.'
    return
  }
  sending.value = true
  error.value = null
  const { error: e } = await supabase.auth.signInWithOtp({
    email: email.value.trim(),
    options: { emailRedirectTo: redirectTo },
  })
  sending.value = false
  if (e) error.value = 'Não conseguimos enviar o e-mail. Tente de novo em um minuto.'
  else sentTo.value = email.value.trim()
}
</script>

<template>
  <TileBand :height="140" />
  <main class="page">
    <div class="stack">
      <span class="eyebrow">Para anfitriões</span>
      <h1>Entre para cuidar da sua lista de presentes</h1>
      <p class="muted">Sem senha.</p>
    </div>

    <template v-if="sentTo">
      <p class="note">
        Pronto! Enviamos um link para <b>{{ sentTo }}</b>. Abra seu e-mail <b>neste aparelho</b> e toque no botão
        da mensagem.
      </p>
      <button class="btn btn--outline" type="button" @click="sentTo = null">Usar outro e-mail</button>
    </template>

    <template v-else>
      <button class="btn btn--outline" type="button" @click="withGoogle">Continuar com Google</button>
      <div class="or" aria-hidden="true"><span></span>ou<span></span></div>
      <form class="stack" @submit.prevent="withEmail">
        <label class="field">
          Seu e-mail
          <input v-model="email" type="email" inputmode="email" autocomplete="email" placeholder="nome@exemplo.com" />
        </label>
        <button class="btn btn--primary" type="submit" :disabled="sending">
          {{ sending ? 'Enviando…' : 'Me envie um link de acesso' }}
        </button>
      </form>
      <p class="small muted">Vamos mandar uma mensagem com um botão. Toque nele e pronto.</p>
    </template>

    <p v-if="error" class="note" role="alert">{{ error }}</p>
  </main>
</template>

<style scoped>
.or {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: var(--text-small);
}
.or span {
  flex-grow: 1;
  height: 1.5px;
  background: var(--line);
}
</style>
