<script setup lang="ts">
// "Put Eu Levo on your home screen", for hosts. Android/Chrome get a button that opens the browser's
// install dialog; iPhone gets written steps, since Safari has no install dialog. Hidden once installed,
// after "Agora não", and on browsers that can't install.
import { computed, ref } from 'vue'
import { installPrompt, isInstalled, isIosSafari, promptInstall } from '@/lib/install'

const DISMISS_KEY = 'eulevo-install-dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

const dismissed = ref(readDismissed())
const ios = isIosSafari()
const show = computed(() => !dismissed.value && !isInstalled() && (!!installPrompt.value || ios))

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // private mode: it just shows again next time
  }
}

async function install() {
  if (await promptInstall()) dismissed.value = true
}
</script>

<template>
  <section v-if="show" class="card install" aria-labelledby="install-title">
    <h2 id="install-title">Coloque o Eu Levo na tela inicial</h2>
    <template v-if="installPrompt">
      <p class="muted">Assim você abre suas listas com um toque, como um aplicativo.</p>
      <button class="btn btn--primary" type="button" @click="install">Adicionar à tela inicial</button>
    </template>
    <template v-else>
      <p class="muted">Assim você abre suas listas com um toque, como um aplicativo. No iPhone:</p>
      <ol class="steps">
        <li>Toque no botão <b>Compartilhar</b> do Safari (o quadrado com a seta para cima).</li>
        <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
        <li>Toque em <b>Adicionar</b>.</li>
      </ol>
    </template>
    <button class="btn btn--outline" type="button" @click="dismiss">Agora não</button>
  </section>
</template>

<style scoped>
.install {
  background: var(--sky);
  border-style: dashed;
}
.steps {
  margin: 0;
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
