<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import GiftPhoto from '@/components/GiftPhoto.vue'
import { createGift, deleteGiftPhotos, updateGift, uploadGiftPhoto, type GiftInput, type HostGift } from '@/lib/api'
import { shrinkImage } from '@/lib/image'

/** Add a gift (no `gift`) or edit one; lives on its own screen (GiftFormView). Photos are shrunk on pick and uploaded only on save. */
const props = defineProps<{ listId: string; gift?: HostGift }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const g = props.gift
const title = ref(g?.title ?? '')
const description = ref(g?.description ?? '')
const link = ref(g?.links[0]?.url ?? '')
const repeatable = ref(g?.repeatable ?? false)
const maxClaims = ref<number | ''>(g?.max_claims ?? '')

/** Photo already saved on the gift (kept unless replaced or removed). */
const savedImages = ref<string[]>(g?.images ?? [])
/** Newly picked photo, shrunk, waiting for "Salvar". */
const newPhoto = ref<Blob | null>(null)
const newPhotoUrl = ref<string | null>(null)
const preparingPhoto = ref(false)

const saving = ref(false)
const error = ref<string | null>(null)

const previewImages = computed(() => (newPhotoUrl.value ? [newPhotoUrl.value] : savedImages.value))

function setNewPhoto(blob: Blob | null) {
  if (newPhotoUrl.value) URL.revokeObjectURL(newPhotoUrl.value)
  newPhoto.value = blob
  newPhotoUrl.value = blob ? URL.createObjectURL(blob) : null
}
onUnmounted(() => setNewPhoto(null))

async function pickPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = null
  preparingPhoto.value = true
  try {
    setNewPhoto(await shrinkImage(file))
  } catch (err) {
    console.error(err)
    error.value = 'Não conseguimos abrir esta foto. Tente outra foto, ou tire uma nova.'
  } finally {
    preparingPhoto.value = false
  }
}

function removePhoto() {
  setNewPhoto(null)
  savedImages.value = []
}

/** Accepts "loja.com/produto" as well as full links. Returns null if it isn't a web address. */
function normalizeLink(raw: string): string | null {
  const text = raw.trim()
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    return url.hostname.includes('.') ? url.href : null
  } catch {
    return null
  }
}

async function save() {
  error.value = null
  if (!title.value.trim()) {
    error.value = 'Escreva o nome do presente, por exemplo "Liquidificador".'
    return
  }
  let url: string | null = null
  if (link.value.trim()) {
    url = normalizeLink(link.value)
    if (!url) {
      error.value = 'Confira o link da loja. Copie o endereço da página do produto e cole aqui.'
      return
    }
  }
  const max = repeatable.value && maxClaims.value !== '' ? Math.floor(Number(maxClaims.value)) : null
  if (max !== null && !(max >= 1)) {
    error.value = 'O número de pessoas precisa ser 1 ou mais. Ou deixe em branco para não ter limite.'
    return
  }

  saving.value = true
  let uploaded: string | null = null
  try {
    if (newPhoto.value) uploaded = await uploadGiftPhoto(props.listId, newPhoto.value)
    const images = uploaded ? [uploaded] : savedImages.value
    const input: GiftInput = {
      title: title.value.trim(),
      description: description.value.trim() || null,
      images,
      // Only the first link is editable here; keep any others the gift already has.
      links: [...(url ? [{ label: 'Loja', url }] : []), ...(g?.links.slice(1) ?? [])],
      repeatable: repeatable.value,
      max_claims: max,
    }
    if (g) await updateGift(g.id, input)
    else await createGift(props.listId, input)
    // Photos the gift no longer uses. A failed cleanup only leaves a stray file, so it doesn't block the save.
    const unused = (g?.images ?? []).filter((p) => !images.includes(p))
    deleteGiftPhotos(unused).catch(console.error)
    emit('saved')
  } catch (err) {
    console.error(err)
    if (uploaded) deleteGiftPhotos([uploaded]).catch(console.error)
    error.value = 'Não conseguimos salvar. Confira sua internet e tente de novo.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="gift-form" novalidate @submit.prevent="save">

    <div class="photo">
      <GiftPhoto :images="previewImages" :alt="title || 'Foto do presente'" :width="120" :height="144" />
      <div class="stack photo-actions">
        <label class="btn btn--soft file-btn">
          {{ preparingPhoto ? 'Preparando a foto…' : previewImages.length ? 'Trocar a foto' : 'Escolher uma foto' }}
          <input class="visually-hidden" type="file" accept="image/*" :disabled="preparingPhoto" @change="pickPhoto" />
        </label>
        <button v-if="previewImages.length" class="btn btn--outline" type="button" @click="removePhoto">
          Tirar a foto
        </button>
        <span v-else class="small muted">Opcional. Ajuda os convidados a reconhecer o presente.</span>
      </div>
    </div>

    <label class="field">
      Nome do presente
      <input v-model="title" maxlength="120" placeholder="Liquidificador" />
    </label>

    <label class="field">
      Descrição <span class="hint">Opcional: cor, tamanho, voltagem…</span>
      <textarea v-model="description" maxlength="1000" rows="3"></textarea>
    </label>

    <label class="field">
      Link da loja <span class="hint">Opcional: um exemplo do produto</span>
      <input v-model="link" type="url" inputmode="url" autocomplete="off" placeholder="https://" />
    </label>

    <fieldset class="field">
      <legend>Mais de um convidado pode levar?</legend>
      <label class="check"><input v-model="repeatable" type="radio" :value="false" /> Não, só uma pessoa</label>
      <label class="check"><input v-model="repeatable" type="radio" :value="true" /> Sim, várias pessoas</label>
    </fieldset>

    <label v-if="repeatable" class="field">
      Quantas pessoas, no máximo?
      <span class="hint">Deixe em branco se não tiver limite.</span>
      <input v-model="maxClaims" class="count" type="number" inputmode="numeric" min="1" step="1" placeholder="Sem limite" />
    </label>

    <p v-if="error" class="note" role="alert">{{ error }}</p>

    <div class="stack">
      <button class="btn btn--primary" type="submit" :disabled="saving || preparingPhoto">
        {{ saving ? 'Salvando…' : 'Salvar presente' }}
      </button>
      <button class="btn btn--outline" type="button" :disabled="saving" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.gift-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.photo {
  display: flex;
  gap: 16px;
  align-items: center;
}
.photo-actions {
  flex-grow: 1;
  min-width: 0;
}
.file-btn {
  text-align: center;
}
.file-btn:focus-within {
  outline: 3px solid var(--cobalt);
  outline-offset: 3px;
}
.count {
  max-width: 200px;
}
</style>
