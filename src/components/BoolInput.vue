<template>
  <button @click="toggle" :class="`bool-input ${state ? 'true' : 'false'}`" >{{ state ? 'true' : 'false' }}</button>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const state = ref(props.modelValue)

function toggle() {
  state.value = !state.value
  emit('update:modelValue', state.value)
}

watch(() => props.modelValue, (newValue) => {
  state.value = newValue
})

</script>

<style scoped lang="sass">
  .bool-input
    font-weight: bold
    background-color: transparent
    border: none
    cursor: pointer
    border-radius: 4px
    height: 20px
    width: 45px
    text-align: center
    position: relative
    &.true
      color: var(--on-secondary-container)
      background-color: var(--secondary-container)
    &.false
      color: var(--on-tertiary-container)
      background-color: var(--tertiary-container)
    &:before
      content: ''
      position: absolute
      border-radius: 4px
      top: 0
      left: 0
      width: 100%
      height: 100%
      background-color: var(--scrim)
      opacity: 0
      transition: opacity 250ms ease
      pointer-events: none
    &:not(:disabled):hover
      &:before
        opacity: 0.1
</style>