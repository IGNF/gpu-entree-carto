<script setup lang="ts">
import DemoHeader from '@/components/demo/DemoHeader.vue'
</script>

<template>
  <div class="ec-app">
    <DemoHeader />
    <RouterView />
  </div>
</template>

<style scoped>
.ec-app {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
}
</style>
