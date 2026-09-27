<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TileBand from '@/components/TileBand.vue'
import PasswordField from '@/components/PasswordField.vue'
import { googleSignInEnabled, sendLoginLink, signInWithGoogle, signInWithPassword } from '@/lib/supabase'
import { MOCK } from '@/config'

const route = useRoute()
const router = useRouter()
const next = typeof route.query.next === 'string' ? route.query.next : '/admin'
const redirectTo = `${window.location.origin}${next}`

/** The email link is the main way in; a password is optional (created under "Sua conta"). */
const mode = ref<'link' | 'password'>('link')
const email = ref('')
const password = ref('')
const sending = ref(false)
const sentTo = ref<string | null>(null)
const error = ref<string | null>(null)
/** Hidden until Supabase confirms the Google provider is on, so the button never appears and then fails. */
const showGoogle = ref(false)
onMounted(async () => (showGoogle.value = await googleSignInEnabled()))

function switchTo(m: 'link' | 'password') {
  mode.value = m
  error.value = null
}

async function withGoogle() {
  error.value = null
  if (!(await signInWithGoogle(redirectTo))) error.value = 'Não foi possível entrar com o Google. Tente pelo e-mail.'
  else if (MOCK) router.replace(next)
}

/** Mock mode only: stands in for tapping the button in the email. */
async function openMockLink() {
  await signInWithGoogle(redirectTo)
  router.replace(next)
}

function emailOk() {
  if (email.value.includes('@')) return true
  error.value = 'Confira o e-mail — parece que falta alguma coisa.'
  return false
}

async function withLink() {
  if (!emailOk()) return
  sending.value = true
  error.value = null
  const ok = await sendLoginLink(email.value.trim(), redirectTo)
  sending.value = false
  if (!ok) error.value = 'Não conseguimos enviar o e-mail. Tente de novo daqui a alguns minutos, ou entre com sua senha.'
  else sentTo.value = email.value.trim()
}

async function withPassword() {
  if (!emailOk()) return
  if (!password.value) {
    error.value = 'Digite sua senha.'
    return
  }
  sending.value = true
  error.value = null
  const result = await signInWithPassword(email.value.trim(), password.value)
  sending.value = false
  if (result === 'ok') router.replace(next)
  else if (result === 'wrong')
    error.value = 'O e-mail ou a senha não conferem. Confira os dois, ou entre sem senha, com o link.'
  else if (result === 'unconfirmed')
    error.value = 'Este e-mail ainda não foi confirmado. Entre sem senha, com o link, para confirmar.'
  else error.value = 'Não conseguimos entrar. Confira sua internet e tente de novo.'
}
</script>

<template>
  <TileBand :height="140" />
  <main class="page">
    <div class="stack">
      <span class="eyebrow">Para anfitriões</span>
      <h1>Entre para cuidar da sua lista de presentes</h1>
      <p class="muted">
        {{ mode === 'link' ? 'Sem senha: mandamos um link para o seu e-mail.' : 'Com o seu e-mail e a sua senha.' }}
      </p>
    </div>

    <template v-if="sentTo">
      <p class="note">
        Pronto! Enviamos um link para <b>{{ sentTo }}</b>. Abra seu e-mail <b>neste aparelho</b> e toque no botão
        da mensagem.
      </p>
      <button v-if="MOCK" class="btn btn--primary" type="button" @click="openMockLink">
        Abrir o link (modo de teste)
      </button>
      <button class="btn btn--outline" type="button" @click="sentTo = null">Usar outro e-mail</button>
    </template>

    <template v-else>
      <template v-if="showGoogle">
        <button class="btn btn--outline" type="button" @click="withGoogle">Continuar com Google</button>
        <div class="or" aria-hidden="true"><span></span>ou<span></span></div>
      </template>

      <form class="stack" novalidate @submit.prevent="mode === 'link' ? withLink() : withPassword()">
        <label class="field">
          Seu e-mail
          <input
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="username"
            autocapitalize="off"
            placeholder="nome@exemplo.com"
          />
        </label>

        <template v-if="mode === 'link'">
          <button class="btn btn--primary" type="submit" :disabled="sending">
            {{ sending ? 'Enviando…' : 'Me envie um link de acesso' }}
          </button>
          <p class="small muted">Vamos mandar uma mensagem com um botão. Toque nele e pronto.</p>
        </template>

        <template v-else>
          <PasswordField v-model="password" label="Sua senha" autocomplete="current-password" />
          <button class="btn btn--primary" type="submit" :disabled="sending">
            {{ sending ? 'Entrando…' : 'Entrar' }}
          </button>
        </template>
      </form>

      <p v-if="error" class="note" role="alert">{{ error }}</p>

      <div class="stack other">
        <button v-if="mode === 'link'" class="btn btn--outline" type="button" @click="switchTo('password')">
          Já tenho senha: entrar com senha
        </button>
        <template v-else>
          <button class="btn btn--outline" type="button" @click="switchTo('link')">Entrar sem senha, com um link</button>
          <p class="small muted">
            Esqueceu a senha? Entre com o link e crie uma nova em <b>Sua conta</b>.
          </p>
        </template>
      </div>
    </template>
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
.other {
  padding-top: 6px;
  border-top: 1.5px solid var(--line);
}
</style>
