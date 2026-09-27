<script setup lang="ts">
/** Switch between a list's host screens. Plain links, labelled with counts, current one filled. */
defineProps<{ listId: string; gifts: number; claims: number }>()
</script>

<template>
  <nav class="host-nav" aria-label="Telas da lista">
    <RouterLink class="btn btn--outline" exact-active-class="current" :to="{ name: 'admin-gifts', params: { id: listId } }">
      Presentes ({{ gifts }})
    </RouterLink>
    <RouterLink class="btn btn--outline" exact-active-class="current" :to="{ name: 'admin-claims', params: { id: listId } }">
      Quem vai levar o quê ({{ claims }})
    </RouterLink>
    <RouterLink class="btn btn--outline" exact-active-class="current" :to="{ name: 'admin-settings', params: { id: listId } }">
      Festa e anfitriões
    </RouterLink>
  </nav>
</template>

<style scoped>
.host-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.host-nav .btn {
  width: auto;
  flex: 1 1 auto;
}
@media (min-width: 700px) {
  .host-nav .btn {
    flex: 0 0 auto;
  }
}
.current {
  background: var(--ink);
  color: var(--white);
}
.current:hover {
  color: var(--white);
}
</style>
