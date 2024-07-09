<script setup lang="ts">
import { ref, onMounted } from 'vue'
const inputRef = ref<HTMLInputElement|null>(null)

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

function adjustInputWidth():void {
  function getTextWidth(text:string, font:string):number|null {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) context.font = font || getComputedStyle(document.body).font
    if (context)
      return context.measureText(text).width
    else
      return null
  }

  if (inputRef.value) {
    const style = getComputedStyle(inputRef.value)
    const font = style.font
    const paddingLeft = parseFloat(style.paddingLeft)
    const paddingRight = parseFloat(style.paddingRight)
    const minWidth = parseFloat(style.minWidth) || 0

    const textWidth = getTextWidth(inputRef.value.value, font)

    if (textWidth) {
      const newWidth = Math.max(minWidth, textWidth + paddingLeft + paddingRight + 1)

      inputRef.value.style.width = `${newWidth}px`
    }
  }
}
function processOnInput() {
  adjustInputWidth()
  emit('update:modelValue', inputRef.value?.value);
}
onMounted(() => {
  adjustInputWidth()
})
</script>

<template>
<input type="text" ref="inputRef" @input="processOnInput" :value="modelValue">
</template>

<style scoped lang="sass">
input[type="text"]
  padding-left: 2px
  padding-right: 2px
  width: 40px
  height: 20px
  background-color: transparent
  border: none
  border-bottom: 1px solid var(--outline-variant)
  font-size: 14px
  text-align: center
  transition: background-color 250ms ease, border-color 250ms ease
  border-top-left-radius: 4px
  border-top-right-radius: 4px
  min-width: 40px
  color: var(--on-primary-container)
  &:hover
    border-color: var(--outline)
  &:focus
    outline: none
    border-color: var(--primary)
    background-color: var(--surface)
</style>