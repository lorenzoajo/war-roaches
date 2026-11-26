<script setup lang="ts">
import { ref } from 'vue'
import RoachBadge from './RoachBadge.vue'
import { go, store, toggleMute } from './store'

const showHelp = ref(false)
const cards = [
  { emoji: '👆', title: 'Pull & let go', text: 'Drag back from your roach like a slingshot. Let go to fire. Drag back onto the roach to cancel.' },
  { emoji: '🏃', title: 'Move & glide', text: '◀ ▶ to walk, ⤴ to jump. Hold jump in the air to glide on tiny wings.' },
  { emoji: '🎁', title: 'Grab crates', text: 'Crates hold silly weapons and pizza. Falling in the goo only hurts — roaches always bounce back!' },
]
</script>

<template>
  <div class="screen menu">
    <div class="hero">
      <div class="badges">
        <RoachBadge color="#ff4d5e" :size="84" />
        <RoachBadge color="#3fa7ff" :size="110" />
        <RoachBadge color="#46d37a" :size="84" />
      </div>
      <h1 class="title">WAR ROACHES</h1>
      <p class="tag">Pass the phone. Flick the roach. Blow up the pizza.</p>
    </div>
    <div class="actions">
      <button class="btn big" @click="go('setup')">PLAY</button>
      <button class="btn secondary" @click="showHelp = true">How to play</button>
      <button class="btn secondary" :aria-label="store.muted ? 'Unmute' : 'Mute'" @click="toggleMute">{{ store.muted ? '🔇' : '🔊' }}</button>
    </div>
    <div v-if="showHelp" class="help" @click.self="showHelp = false">
      <div class="cards">
        <div v-for="c in cards" :key="c.title" class="card">
          <div class="emoji">{{ c.emoji }}</div>
          <h3 class="title">{{ c.title }}</h3>
          <p>{{ c.text }}</p>
        </div>
      </div>
      <button class="btn" @click="showHelp = false">Got it!</button>
    </div>
  </div>
</template>

<style scoped>
.menu {
  display: flex; align-items: center; justify-content: space-around; gap: 16px;
  background: radial-gradient(circle at 30% 20%, #4a2f8a, var(--bg) 70%);
}
.hero { text-align: center; }
.badges { display: flex; align-items: flex-end; justify-content: center; gap: 4px; }
h1 { font-size: clamp(40px, 9vw, 84px); margin: 4px 0 0; color: var(--accent); text-shadow: 0 5px 0 var(--ink), 0 0 30px rgba(255, 210, 63, 0.35); }
.tag { margin: 0; color: var(--muted); font-size: 18px; }
.actions { display: flex; flex-direction: column; gap: 12px; align-items: stretch; min-width: 200px; }
.help { position: fixed; inset: 0; background: rgba(15, 8, 30, 0.88); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 16px; z-index: 5; }
.cards { display: flex; gap: 12px; overflow-x: auto; max-width: 100%; }
.card { background: var(--panel); border: 3px solid #120b22; border-radius: 18px; padding: 12px 14px; min-width: 180px; max-width: 230px; flex: 1; box-shadow: var(--shadow); }
.card h3 { margin: 4px 0; color: var(--accent); font-weight: 400; }
.card p { margin: 0; line-height: 1.25; }
.emoji { font-size: 34px; }
@media (max-height: 340px) { .badges { display: none; } }
</style>
