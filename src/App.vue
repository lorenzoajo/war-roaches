<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
const dev = new URLSearchParams(location.search).get('dev')
const DevMap = defineAsyncComponent(() => import('./dev/DevMap.vue'))
</script>

<template>
  <DevMap v-if="dev === 'map'" />
  <main v-else class="app">War Roaches</main>
</template>
