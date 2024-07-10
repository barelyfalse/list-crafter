<script setup lang="ts">
import { ref, watch, computed } from 'vue'

import {
  createResult,
  dynamicListParser,
} from '@/dynamicListParser'
import type { Segment, Block, ParseResult } from '@/dynamicListParser'

import Container from './components/Container.vue'
import PatternInput from './components/PatternInput.vue'
import ButtonFilled from './components/ButtonFilled.vue'
import BlockGroup from './components/BlockGroup.vue'

const patternInputValue = ref('{-w: <"-w"|-b>,-n-r}')
const parsedPattern = ref(createResult(true, true, 'Submit a pattern'))
const plainOutputValue = ref('')
const outputTextareaRef = ref(null)

function processPatternInput(pattern: string): void {
  patternInputValue.value = pattern
}

function processPattern(): void {
  parsedPattern.value = dynamicListParser(
    patternInputValue.value.replace(/\n/g, '-n'),
    []
  )
  //console.log(parsedPattern.value)
}

function updateRootValues(newValues: any[]): void {
  if (parsedPattern.value.root) {
    console.log(newValues)
    parsedPattern.value.root.values = newValues
    //console.log('Root values updated:', parsedPattern.value.root.values);
    plainOutputValue.value = renderPlainText(parsedPattern.value.root)
  }
}

const isBlock = (item: Block | Segment): item is Block => {
  return 'children' in item
}

const renderPlainText = (block: Block): string => {
  return block.values
    .map((item) => {
      if (isBlock(item)) {
        return `${item.start}${renderPlainText(item)}${item.end}`
      } else {
        //console.log(item.value||item.raw)
        return item.value || item.raw
      }
    })
    .join('')
}

const plainTextOutput = computed(() => {
  return parsedPattern.value.root && renderPlainText(parsedPattern.value.root)
})

watch(plainOutputValue, () => {
  if (outputTextareaRef.value) {
    ;(outputTextareaRef.value as HTMLInputElement).style.height = 'auto'
    ;(outputTextareaRef.value as HTMLInputElement).style.height = `${
      (outputTextareaRef.value as HTMLInputElement).scrollHeight + 32
    }px`
  }
})
</script>

<template>
  <header>
    <h1># list crafter</h1>
    <div>
      <PatternInput
        :value="patternInputValue"
        helper-text=""
        :on-input="processPatternInput"
        fit-width
      />
      <div style="display: flex; flex-direction: row; gap: 8px">
        <button-filled label="Parse" :action="processPattern" />
        <button-filled label="Clear" :action="() => {}" />
      </div>
    </div>
  </header>

  <main>
    <br />
    <h2>## parsed pattern</h2>
    <Container>
      <template #content>
        <template v-if="!parsedPattern.error">
          <block-group
            :block="parsedPattern.root"
            @update:modelValue="updateRootValues"
          />
        </template>
        <p v-else>{{ parsedPattern.message }}</p>
      </template>
    </Container>
    <br />
    <h2>## parsed list</h2>
    <textarea
      class="plain-textarea"
      ref="outputTextareaRef"
      v-model="plainOutputValue"
      readonly
    ></textarea>
  </main>
</template>

<style scoped lang="sass">
.plain-textarea
  width: 100%
  min-width: 100%
  color: var(--on-surface)
  background-color: transparent
  margin: 0px
  padding: 0px
  border: none
  resize: vertical
  font-size: 1rem
  font-family: sans-serif
  padding: 8px 16px
  border: 1px solid var(--outline-variant)
  border-radius: 8px
  &:focus
    outline: none
</style>
