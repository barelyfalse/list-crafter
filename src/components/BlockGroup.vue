<template>
  <div :class="`block ${props.block.start.length > 0 ? 'group-margins' : ''}`">
    <span class="top-edge" v-if="props.block.start">{{
      props.block.start
    }}</span>
    <template
      v-if="props.block && !props.block.options"
      v-for="(child, index) in props.block.values"
      :key="index"
    >
      <block-group
        v-if="isBlock(child)"
        :block="child"
        @update:modelValue="updateValue(index, $event)"
      />
      <word-input
        v-else-if="child.type === blockType.word"
        :model-value="getSegmentValue(index)"
        @update:modelValue="updateValue(index, $event)"
      />
      <bool-input
        v-else-if="child.type === blockType.bool"
        :model-value="getSegmentValue(index)"
        @update:modelValue="updateValue(index, $event)"
      />
      <div v-else-if="child.type === blockType.newline"></div>
      <!-- more types soon -->
      <template v-else-if="child.type === blockType.plain"
        ><span>{{ child.raw }}</span></template
      >
    </template>
    <template v-else-if="props.block.options">
      <template v-if="props.block.values.length < props.block.children.length">
        <template v-for="(option, i) in props.block.values" :key="i">
          <block-group
            v-if="isBlock(option)"
            :block="option"
            @update:modelValue="updateValue(i, $event)"
          />
          <word-input
            v-else-if="option.type === blockType.word"
            :model-value="getSegmentValue(i)"
            @update:modelValue="updateValue(i, $event)"
          />
          <bool-input
            v-else-if="option.type === blockType.bool"
            :model-value="getSegmentValue(i)"
            @update:modelValue="updateValue(i, $event)"
          />
          <span v-else-if="option.type === blockType.plain">{{
            option.raw
          }}</span>
        </template>
      </template>
      <template v-else>
        <template v-for="(option, index) in props.block.values">
          <button class="add-repetition-btn" @click="addOption(option)">
            {{ extractString([option]) }}
          </button>
        </template>
      </template>
    </template>

    <button
      class="add-repetition-btn"
      v-if="props.block.repetitive"
      @click="addRepetition"
    >
      add
    </button>
    <button
      class="add-repetition-btn"
      v-if="
        props.block.repetitive &&
        props.block.values.length > props.block.children.length
      "
      @click="removeRepetition"
    >
      remove
    </button>

    <span class="bottom-edge" v-if="props.block.end">{{
      props.block.end
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { blockType } from '@/dynamicListParser'
import type { Block, Segment } from '@/dynamicListParser'
import WordInput from './WordInput.vue'
import BoolInput from './BoolInput.vue'

const props = defineProps<{
  block: Block
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: (Block | Segment)[]): void
}>()

const isBlock = (item: Block | Segment): item is Block => {
  return 'children' in item
}

const getSegmentValue = (
  index: number
): string | number | boolean | undefined => {
  const value = props.block.values[index]
  return isBlock(value) ? undefined : value.value
}

const updateValue = (index: number, newValue: any) => {
  if (props.block) {
    const updatedValues = [...props.block.values]
    //console.log(updatedValues)
    if (isBlock(updatedValues[index])) {
      ;(updatedValues[index] as Block).values = newValue
    } else {
      ;(updatedValues[index] as Segment).value = newValue
    }
    emit('update:modelValue', updatedValues)
  } else {
    console.log('null block prop on blockgroup')
  }
}

const addRepetition = () => {
  if (props.block && props.block.repetitive) {
    const newRepetition = JSON.parse(JSON.stringify(props.block.children))
    emit('update:modelValue', [...props.block.values, ...newRepetition])
  }
}

const removeRepetition = () => {
  if (props.block) {
    const childCount = props.block.children.length
    if (props.block.repetitive && props.block.values.length > childCount) {
      props.block.values.splice(
        props.block.values.length - childCount,
        childCount
      )
      emit('update:modelValue', props.block.values)
    }
  }
}

function extractString(data: (Block | Segment)[]): string {
  let result = ''

  function process(item: Block | Segment): void {
    if ('raw' in item) {
      result += item.raw
    } else if ('start' in item && 'end' in item) {
      result += item.start
      item.children.forEach((child) => {
        if ('raw' in child) {
          result += child.raw
        } else {
          result += `${child.start}...${child.end}`
        }
      })
      result += item.end
    }
  }

  data.forEach((item) => process(item))
  return result
}

const addOption = (option: Block | Segment) => {
  if (props.block) {
    console.log('adding', [option])
    emit('update:modelValue', [option])
  }
}
</script>

<style scoped lang="sass">
.block
  position: relative
  &.inline
  &.group-margins
    margin-left: 1ch
    margin-right: 1ch
.add-repetition-btn
  background-color: var(--primary)
  color: var(--on-primary)
  border-radius: 4px
  border: none
  cursor: pointer
  padding-left: 4px
  padding-right: 4px
  margin-left: 2px
  margin-right: 2px
  font-weight: bold
</style>
