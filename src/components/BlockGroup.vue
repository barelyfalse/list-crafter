<template>
  <div :class="`block ${props.block.start.length > 0?'group-margins':''}`">
    <div class="top-edge" v-if="props.block.start">{{ props.block.start }}</div>
    <template v-if="props.block" v-for="(child, index) in props.block.values" :key="index">
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
      <div v-else-if="child.type === blockType.newline" ></div>
      <!-- more types soon -->
      <template v-else-if="child.type === blockType.plain"><span>{{ child.raw }}</span></template> 
    </template>
    
    <button class="add-repetition-btn" v-if="props.block.repetitive" @click="addRepetition">add</button>
    <button class="add-repetition-btn" v-if="props.block.repetitive && props.block.values.length > props.block.children.length" @click="removeRepetition">remove</button>
    
    <div class="bottom-edge" v-if="props.block.end">{{ props.block.end }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { blockType } from '../App.vue'
import type { Block, Segment } from '../App.vue'
import WordInput from './WordInput.vue';
import BoolInput from './BoolInput.vue';

const props = defineProps<{
  block: Block;
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: (Block|Segment)[]): void
}>();

const isBlock = (item: Block | Segment): item is Block => {
  return 'children' in item;
};

const getSegmentValue = (index: number): string | number | boolean | undefined => {
  const value = props.block.values[index];
  return isBlock(value) ? undefined : value.value;
};

const updateValue = (index: number, newValue: any) => {
  if (props.block) {
    const updatedValues = [...props.block.values];
    //console.log(updatedValues)
    if (isBlock(updatedValues[index])) {
      (updatedValues[index] as Block).values = newValue;
    } else {
      (updatedValues[index] as Segment).value = newValue;
    }
    emit('update:modelValue', updatedValues);
  } else {
    console.log('null block prop on blockgroup')
  }
};

const addRepetition = () => {
  if (props.block) {
    if (props.block.repetitive) {
      const newRepetition = JSON.parse(JSON.stringify(props.block.children))
      emit('update:modelValue', [...props.block.values, ...newRepetition])
    }
  } else {
    console.log('null block prop on blockgroup')
  }
}

const removeRepetition = () => {
  if (props.block) {
    const childCount = props.block.children.length
    if (props.block.repetitive && props.block.values.length > childCount) {
      props.block.values.splice(props.block.values.length - childCount, childCount)
      emit('update:modelValue', props.block.values)
    }
  }
}
</script>

<style scoped lang="sass">
.block
  position: relative
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