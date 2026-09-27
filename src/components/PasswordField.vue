<script setup lang="ts">
/** A password input with a "Mostrar a senha" checkbox (in words, no eye icon). */
import { ref } from 'vue'

defineProps<{ label: string; autocomplete: 'current-password' | 'new-password'; hint?: string }>()
const password = defineModel<string>({ required: true })
const visible = ref(false)
</script>

<template>
  <div class="stack tight">
    <label class="field">
      {{ label }}
      <span v-if="hint" class="hint">{{ hint }}</span>
      <input
        v-model="password"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        autocapitalize="off"
        spellcheck="false"
      />
    </label>
    <label class="check"><input v-model="visible" type="checkbox" /> Mostrar a senha</label>
  </div>
</template>

<style scoped>
.tight {
  gap: 2px;
}
</style>
