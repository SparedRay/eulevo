<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { encode } from 'uqr'
import { partyWhen } from '@/lib/format'

/** Share the guest link: copy it, send it on WhatsApp, or show / download a QR code. */
const props = defineProps<{ url: string; title: string; eventAt: string | null }>()

const copied = ref(false)
const linkInput = ref<HTMLInputElement | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(copiedTimer))

const message = computed(
  () =>
    `Oi! Esta é a lista de presentes de "${props.title}". A festa é no ${partyWhen(props.eventAt)}. ` +
    `Escolha aqui o que você vai levar: ${props.url}`,
)
const whatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(message.value)}`)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
  } catch {
    // Older browsers / plain http: select the text so the host can copy it by hand.
    linkInput.value?.select()
    document.execCommand('copy')
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 4000)
}

const qr = computed(() => encode(props.url, { ecc: 'M', border: 2 }))
/** One SVG path for all dark modules. */
const qrPath = computed(() => {
  let d = ''
  qr.value.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`
    }),
  )
  return d
})

/** PNG, because older hosts can open and print it from the phone's gallery. */
function downloadQr() {
  const { size, data } = qr.value
  const scale = 16
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#14213d' // --ink
  data.forEach((row, y) => row.forEach((dark, x) => dark && ctx.fillRect(x * scale, y * scale, scale, scale)))
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = 'qr-code-lista-de-presentes.png'
  a.click()
}
</script>

<template>
  <section class="card share" aria-labelledby="share-title">
    <h2 id="share-title">Compartilhar com os convidados</h2>
    <p class="muted">Mande este link para os convidados. Eles não precisam fazer cadastro.</p>

    <label class="field">
      Link da lista
      <input ref="linkInput" :value="url" readonly @focus="linkInput?.select()" />
    </label>

    <button class="btn btn--outline" type="button" @click="copyLink">
      {{ copied ? 'Link copiado!' : 'Copiar o link' }}
    </button>
    <p class="visually-hidden" aria-live="polite">{{ copied ? 'Link copiado' : '' }}</p>

    <a class="btn btn--primary" :href="whatsappHref" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>

    <div class="qr-block">
      <svg
        class="qr"
        :viewBox="`0 0 ${qr.size} ${qr.size}`"
        shape-rendering="crispEdges"
        role="img"
        aria-label="QR code com o link da lista"
      >
        <rect :width="qr.size" :height="qr.size" fill="var(--white)" />
        <path :d="qrPath" fill="var(--ink)" />
      </svg>
      <p class="small muted center">Os convidados podem apontar a câmera do celular para este código.</p>
      <button class="btn btn--soft" type="button" @click="downloadQr">Baixar o QR code para imprimir</button>
    </div>
  </section>
</template>

<style scoped>
.share input {
  font-size: 16px;
  text-overflow: ellipsis;
}
.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 6px;
  border-top: 1.5px solid var(--line);
}
.qr {
  width: 200px;
  height: 200px;
}
</style>
