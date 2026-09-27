<script setup lang="ts">
/** The list's name, party day, time and address. Used to create a list and to edit it. */
export interface PartyForm {
  title: string
  date: string
  time: string
  address: string
}

const form = defineModel<PartyForm>({ required: true })
</script>

<template>
  <label class="field">Nome da lista <input v-model="form.title" maxlength="120" placeholder="Casa Nova" /></label>
  <div class="two">
    <label class="field">Dia da festa <input v-model="form.date" type="date" /></label>
    <label class="field">Horário <input v-model="form.time" type="time" /></label>
  </div>
  <label class="field">
    Endereço da festa <input v-model="form.address" maxlength="300" placeholder="Rua, número, bairro" />
  </label>
</template>

<style scoped>
.two {
  display: grid;
  gap: 12px;
}
@media (min-width: 520px) {
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
