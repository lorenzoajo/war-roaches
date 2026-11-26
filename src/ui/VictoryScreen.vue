<script setup lang="ts">
import { computed } from 'vue'
import type { HudSnapshot } from '../game/core/game'
import { css } from '../game/render/color'
import RoachBadge from './RoachBadge.vue'

const props = defineProps<{ hud: HudSnapshot }>()
const emit = defineEmits<{ rematch: []; menu: [] }>()
const winner = computed(() => props.hud.teams.find((t) => t.id === props.hud.winner) ?? null)
const color = computed(() => (winner.value ? css(winner.value.color) : '#c9b8f0'))
const confetti = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 10) * 0.25}s`,
  dur: `${2.2 + (i % 5) * 0.4}s`,
  color: ['#ff4d5e', '#3fa7ff', '#46d37a', '#ffd23f', '#ff6fa8'][i % 5],
}))
</script>

<template>
  <div class="victory" :style="{ '--team': color }">
    <i v-for="(c, i) in confetti" :key="i" class="bit" :style="{ left: c.left, animationDelay: c.delay, animationDuration: c.dur, background: c.color }" />
    <RoachBadge :color="color" :size="120" />
    <h1 class="title">{{ winner ? `${winner.name} wins!` : "It's a draw!" }}</h1>
    <p>{{ winner ? 'Crunchy, cheesy, glorious victory.' : 'Everybody got flipped. Nobody wins.' }}</p>
    <div class="row">
      <button class="btn big" @click="emit('rematch')">Rematch</button>
      <button class="btn secondary" @click="emit('menu')">Menu</button>
    </div>
  </div>
</template>

<style scoped>
.victory {
  position: absolute; inset: 0; z-index: 8; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle, color-mix(in srgb, var(--team) 35%, #1b1230), rgba(27, 18, 48, 0.94) 70%);
}
h1 { font-size: clamp(36px, 8vw, 72px); margin: 0; font-weight: 400; color: var(--team); text-shadow: 0 4px 0 var(--ink); }
p { margin: 4px 0 14px; color: var(--muted); font-size: 18px; }
.row { display: flex; gap: 12px; }
.bit { position: absolute; top: -20px; width: 10px; height: 16px; border-radius: 3px; animation: fall linear infinite; }
@keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
</style>
