<script setup lang="ts">
const props = defineProps<{
  label?:string;
  action:Function;
}>()

function handleOnClick():void {
  props.action()
}
</script>

<template>
  <button :class="props.type" @click="handleOnClick">
    {{ label }}
  </button>
</template>

<style scoped lang="sass">
button
  border: none
  padding: 8px 12px
  line-height: 20px
  min-width: 64px
  text-align: center
  border-radius: var(--main-radius)
  font-weight: bold
  transition: box-shadow 150ms
  position: relative
  display: flexbox
  flex-direction: row
  gap: 8px
  align-items: center
  justify-content: center
  background-color: var(--primary)
  color: var(--on-primary)
  border: none
  &:focus
    outline: 2px solid var(--color-border-hover)
  &:before
    content: ''
    position: absolute
    border-radius: var(--main-radius)
    top: 0
    left: 0
    width: 100%
    height: 100%
    background-color: var(--on-primary)
    opacity: 0
    transition: opacity 250ms ease
    pointer-events: none
  &:not(:disabled):focus
    outline: 2px solid var(--secondary)
    outline-offset: 2px
    &:before
      opacity: 0.1
  &:not(:disabled):hover
    cursor: pointer
    &:before
      opacity: 0.1
  &:not(:disabled):active
    &:before
      opacity: 0.2
  &:disabled
    opacity: 0.15
    background-color: var(--on-surface)
</style>