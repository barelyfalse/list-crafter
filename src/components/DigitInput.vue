<script setup lang="ts">
import { ref, onMounted } from 'vue'
const inputRef = ref<HTMLInputElement|null>(null)

function adjustInputWidth():void {
  function getTextWidth(text:string, font:string):number|null {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) context.font = font || getComputedStyle(document.body).font;
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
      const newWidth = Math.max(minWidth, textWidth + paddingLeft + paddingRight + 16)
    
      inputRef.value.style.width = `${newWidth}px`;
    }
  }
}
function processOnInput() {
  adjustInputWidth()
}
onMounted(() => {
  adjustInputWidth()
})
</script>

<template>
<input type="number" ref="inputRef" @input="processOnInput">
</template>

<style scoped lang="sass">
input[type="number"]
  padding-left: 4px
  padding-right: 4px
  width: 30px
  background-color: transparent
  color: var(--primary)
  border: none
  border-bottom: 1px solid var(--outline-variant)
  font-size: 14px
  transition: background-color 250ms ease, border-color 250ms ease
  border-top-left-radius: 4px
  border-top-right-radius: 4px
  min-width: 30px
  &:hover
    border-color: var(--outline)
  &:focus
    outline: none
    border-color: var(--primary)
    background-color: var(--primary-container)
</style>