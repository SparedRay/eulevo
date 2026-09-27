<script setup lang="ts">
import { computed } from 'vue'
import { imageUrl } from '@/lib/api'

const props = withDefaults(
  defineProps<{ images: string[]; alt: string; width?: number; height?: number; tint?: 'sky' | 'sand' }>(),
  { width: 96, height: 116, tint: 'sky' },
)

const src = computed(() => (props.images.length ? imageUrl(props.images[0]!) : null))
</script>

<template>
  <div
    class="arch"
    :class="`arch--${tint}`"
    :style="{ width: `${width}px`, height: `${height}px`, borderRadius: `${width / 2}px ${width / 2}px 10px 10px` }"
  >
    <img v-if="src" :src="src" :alt="alt" loading="lazy" />
    <svg v-else width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M9 20h30v20H9zM7 13h34v7H7zM24 13v27" />
      <path d="M24 13c-4-7-12-7-12-2s8 2 12 2c4 0 12 2 12-2s-8-5-12 2" />
    </svg>
  </div>
</template>

<style scoped>
.arch {
  flex-shrink: 0;
  border: 2px solid var(--cobalt);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
}
.arch--sky {
  background: var(--sky);
}
.arch--sand {
  background: var(--sand);
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
