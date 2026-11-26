<script setup lang="ts">
import { ref } from 'vue'
import { store, toggleMute } from './store'

const emit = defineEmits<{ resume: []; quit: [] }>()
const confirming = ref(false)
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <h2 class="title">Paused</h2>
      <button class="btn big" @click="emit('resume')">Resume</button>
      <button class="btn secondary" @click="toggleMute">{{ store.muted ? '🔇 Sound off' : '🔊 Sound on' }}</button>
      <button v-if="!confirming" class="btn secondary" @click="confirming = true">Quit to menu</button>
      <button v-else class="btn quit" @click="emit('quit')">Really quit? The match is lost!</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; background: rgba(10, 5, 20, 0.7); display: flex; align-items: center; justify-content: center; z-index: 7; }
.panel { display: flex; flex-direction: column; gap: 10px; background: var(--panel); border: 3px solid #120b22; border-radius: 22px; padding: 16px 22px; min-width: 260px; box-shadow: var(--shadow); }
h2 { margin: 0; text-align: center; font-weight: 400; color: var(--accent); font-size: 32px; }
.quit { background: var(--bad); color: #fff; }
</style>
