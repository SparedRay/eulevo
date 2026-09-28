<script setup lang="ts">
// This phone's 6-digit guest code. Guests read it out to the hosts, who see the same code
// next to each gift in "Quem vai levar o quê". It replaces names and location.
import { computed } from 'vue'
import { formatCode } from '@/lib/format'

const props = withDefaults(defineProps<{ code: string | null; variant?: 'line' | 'card' }>(), { variant: 'line' })
const shown = computed(() => formatCode(props.code))
</script>

<template>
  <p v-if="shown && variant === 'line'" class="code-line">
    Seu código neste celular: <b class="digits">{{ shown }}</b>
  </p>

  <div v-else-if="shown" class="code-card">
    <span class="label">Seu código neste celular</span>
    <b class="digits big">{{ shown }}</b>
    <span class="hint">Se precisar falar com os anfitriões sobre um presente, diga este código.</span>
  </div>
</template>

<style scoped>
.code-line {
  color: var(--muted);
}
.digits {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--sky);
  text-align: center;
}
.label {
  font-size: var(--text-small);
  font-weight: 700;
  color: var(--muted);
}
.big {
  font-size: 34px;
  line-height: 1.1;
}
.hint {
  font-size: var(--text-small);
  color: var(--muted);
}
</style>
