<script setup lang="ts">
import { ref, onMounted } from 'vue'

const inputRef = ref<HTMLTextAreaElement|null>(null)

const props = defineProps({
  value: { type: String, required: true },
  helperText: String,
  onInput: Function,
  error: Boolean
})

function setInputSize():void {
  if (inputRef.value)
  {
    const lc = inputRef.value.value.split('\n').length
    const calculatedH = `calc(${(lc*19)}px + 24px)`
    inputRef.value.style.height = calculatedH
    inputRef.value.style.maxHeight = calculatedH
  }
    
}

function processOnInput(event: Event):void {
  if (!(event as InputEvent).target)
    return
  setInputSize()
  if (props.onInput)
    props.onInput(((event as InputEvent).target as HTMLInputElement).value)
}

onMounted(() => {
  setInputSize()
})
</script>

<template>
  <div class="input-container">
    <textarea :value="props.value" @input="event => processOnInput(event)" ref="inputRef"></textarea>
    <div :class="`helper-text${error?' error':''}`">{{ helperText }}</div>
  </div>
</template>

<style scoped lang="sass">
textarea
  font-family: monospace
  font-weight: bold
  background-color: transparent
  padding: 8px 12px
  color: var(--color-text)
  font-size: 16px
  border-radius: 8px
  border: solid 2px var(--outline-variant)
  min-height: calc(1rem)
  min-width: 100%
  transition: border-color 250ms ease, border-width 0ms ease
  resize: vertical
  &:hover
    border-color: var(--outline)
  &:focus
    border-width: 2px
    border-color: var(--primary)
    outline: none

.helper-text
  font-size: 12px
  opacity: 0.8
  margin-left: 12px

.input-container
  max-width: 100%
  box-sizing: border-box

</style>