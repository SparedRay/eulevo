<script setup lang="ts">
/** "Carregando…" with a spinner, for a screen waiting on its data. Announced to screen readers. */
withDefaults(defineProps<{ label?: string }>(), { label: 'Carregando…' })
</script>

<template>
  <div class="loading" role="status">
    <span class="spinner" aria-hidden="true"></span>
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 40px 0;
  color: var(--muted);
  font-size: var(--text-body);
}
.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid var(--sky);
  border-top-color: var(--cobalt);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }
}
</style>
