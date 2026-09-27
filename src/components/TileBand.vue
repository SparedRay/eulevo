<script setup lang="ts">
/** The Portuguese tile band used at the top of screens. Purely decorative. */
withDefaults(defineProps<{ height?: number }>(), { height: 56 })
</script>

<template>
  <div class="tile-band" :style="{ height: `${height}px` }" aria-hidden="true"></div>
</template>

<style scoped>
.tile-band {
  width: 100%;
  flex-shrink: 0;
  border-bottom: 2px solid var(--cobalt);
  background-color: var(--paper);
  background-size: 28px 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M14 3L25 14L14 25L3 14Z' fill='none' stroke='%231E4FA3' stroke-width='1.5'/%3E%3Ccircle cx='14' cy='14' r='3' fill='%231E4FA3'/%3E%3Cpath d='M0 0h6M0 0v6M28 0h-6M28 0v6M0 28h6M0 28v-6M28 28h-6M28 28v-6' stroke='%231E4FA3' stroke-width='1.5'/%3E%3C/svg%3E");
}
</style>
