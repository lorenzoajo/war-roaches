<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { store } from './store'

let mq: MediaQueryList | null = null
const update = (): void => {
  store.portrait = mq?.matches ?? false
}
onMounted(() => {
  mq = window.matchMedia('(orientation: portrait)')
  update()
  mq.addEventListener('change', update)
})
onBeforeUnmount(() => mq?.removeEventListener('change', update))
</script>

<template>
  <div v-if="store.portrait" class="rotate">
    <div class="phone">📱</div>
    <p class="title">Turn your phone sideways!</p>
  </div>
</template>

<style scoped>
.rotate { position: fixed; inset: 0; z-index: 50; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.phone { font-size: 72px; animation: turn 1.6s ease-in-out infinite; }
p { font-size: 26px; color: var(--accent); margin: 0; text-align: center; padding: 0 20px; }
@keyframes turn { 40%, 60% { transform: rotate(-90deg); } }
</style>
