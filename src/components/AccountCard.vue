<script setup lang="ts">
// "Sua conta" on Suas listas: which email is signed in, and creating or changing the optional password,
// so the host can sign in anywhere (another browser, the installed app) without waiting for an email.
import { onMounted, ref } from 'vue'
import PasswordField from '@/components/PasswordField.vue'
import { hostEmail, setPassword } from '@/lib/supabase'

const MIN_LENGTH = 8

const email = ref<string | null>(null)
const editing = ref(false)
const password = ref('')
const repeat = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

onMounted(async () => (email.value = await hostEmail()))

function open() {
  editing.value = true
  saved.value = false
  error.value = null
  password.value = ''
  repeat.value = ''
}

async function save() {
  error.value = null
  if (password.value.length < MIN_LENGTH) {
    error.value = `A senha precisa ter pelo menos ${MIN_LENGTH} letras ou números.`
    return
  }
  if (password.value !== repeat.value) {
    error.value = 'As duas senhas não são iguais. Digite a mesma senha nos dois campos.'
    return
  }
  saving.value = true
  const result = await setPassword(password.value)
  saving.value = false
  if (result === 'ok') {
    editing.value = false
    saved.value = true
  } else if (result === 'same') error.value = 'Esta já é a sua senha. Para trocar, escolha outra.'
  else if (result === 'weak') error.value = 'Esta senha é fácil de adivinhar. Escolha uma mais longa, misturando letras e números.'
  else if (result === 'reauth') error.value = 'Por segurança, saia, entre de novo com o link e depois crie a senha.'
  else error.value = 'Não conseguimos salvar a senha. Confira sua internet e tente de novo.'
}
</script>

<template>
  <section class="card account" aria-labelledby="account-title">
    <h2 id="account-title">Sua conta</h2>
    <p v-if="email" class="muted">Você entrou como <b class="ink">{{ email }}</b>.</p>

    <p v-if="saved" class="strip" role="status">
      Pronto! Agora você também pode entrar com o seu e-mail e esta senha, em qualquer celular.
    </p>

    <form v-if="editing" class="stack" novalidate @submit.prevent="save">
      <!-- Lets password managers save the new password under the right email -->
      <input class="visually-hidden" type="email" autocomplete="username" :value="email ?? ''" readonly tabindex="-1" aria-hidden="true" />
      <PasswordField v-model="password" label="Nova senha" autocomplete="new-password" :hint="`Pelo menos ${MIN_LENGTH} letras ou números.`" />
      <PasswordField v-model="repeat" label="Digite a senha de novo" autocomplete="new-password" />
      <p v-if="error" class="note" role="alert">{{ error }}</p>
      <button class="btn btn--primary" type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar a senha' }}</button>
      <button class="btn btn--outline" type="button" :disabled="saving" @click="editing = false">Cancelar</button>
    </form>

    <template v-else>
      <p class="muted">
        Com uma senha, você entra em outro celular ou no aplicativo sem esperar o e-mail. É opcional: o link continua
        funcionando.
      </p>
      <button class="btn btn--outline" type="button" @click="open">Criar ou trocar a senha</button>
    </template>
  </section>
</template>

<style scoped>
.account {
  max-width: 720px;
}
.ink {
  color: var(--ink);
}
</style>
