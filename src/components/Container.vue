<template>
  <div class="border-container">
    <slot name="content"></slot>
  </div>
</template>

<style scoped>
.border-container {
  padding: 8px 16px;
  border: 1px solid var(--outline-variant);
  border-radius: 8px;
}
</style>