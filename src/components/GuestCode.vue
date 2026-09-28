<script setup lang="ts">
// This phone's 6-digit guest code, shown only at the end of the guest list as a quiet help note.
// It's for emergencies: the guest reads it out and the hosts find it in "Quem vai levar o quê".
import { computed } from 'vue'
import { formatCode } from '@/lib/format'

const props = defineProps<{ code: string | null }>()
const shown = computed(() => formatCode(props.code))
</script>

<template>
  <aside v-if="shown" class="code-help">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" />
    </svg>
    <p>
      <b>Algum problema com um presente?</b> Fale com os anfitriões e informe seu código:
      <b class="digits">{{ shown }}</b>
    </p>
  </aside>
</template>

<style scoped>
.code-help {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1.5px dashed var(--input-line);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--muted);
}
.code-help svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.code-help b {
  color: var(--ink);
}
.digits {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
</style>
