<script setup lang="ts">
import { computed } from 'vue'
import type { HudSnapshot } from '../game/core/game'
import { css } from '../game/render/color'

const props = defineProps<{ hud: HudSnapshot }>()
defineEmits<{ pause: [] }>()

const seconds = computed(() => Math.ceil(props.hud.timeLeft))
const urgent = computed(() => props.hud.phase === 'turn' && seconds.value <= 5)
const windDir = computed(() => (props.hud.wind < 0 ? '◀' : '▶'))
const windCount = computed(() => Math.max(1, Math.ceil(Math.abs(props.hud.wind) * 3)))
const showTimer = computed(() => props.hud.phase === 'turn' || props.hud.phase === 'retreat')
</script>

<template>
  <div class="hud">
    <div class="teams">
      <div v-for="t in props.hud.teams" :key="t.id" class="team" :class="{ active: t.id === props.hud.team, out: t.alive === 0 }">
        <span class="bar"><i :style="{ width: `${(100 * t.hp) / t.maxHp}%`, background: css(t.color) }" /></span>
      </div>
    </div>
    <div v-if="showTimer" class="timer" :class="{ urgent, retreat: props.hud.phase === 'retreat' }">{{ props.hud.phase === 'retreat' ? '🏃' : '' }}{{ seconds }}</div>
    <div class="wind" :aria-label="`Wind ${windDir}`">
      💨 <span :class="{ left: props.hud.wind < 0 }">{{ windDir.repeat(windCount) }}</span>
    </div>
    <span v-if="props.hud.suddenDeath" class="sd">SUDDEN SPRAY!</span>
    <button class="pause" aria-label="Pause" @click="$emit('pause')">⏸</button>
  </div>
</template>

<style scoped>
.hud {
  position: absolute; top: calc(6px + var(--sat)); left: calc(10px + var(--sal)); right: calc(10px + var(--sar));
  display: flex; align-items: center; gap: 12px; pointer-events: none;
}
.teams { display: flex; flex-direction: column; gap: 3px; width: min(30vw, 200px); }
.team { opacity: 0.85; }
.team.active { opacity: 1; }
.team.out { opacity: 0.3; }
.bar { display: block; height: 9px; background: rgba(0, 0, 0, 0.45); border-radius: 6px; border: 2px solid var(--ink); overflow: hidden; }
.team.active .bar { height: 12px; }
.bar i { display: block; height: 100%; transition: width 0.4s; }
.timer {
  font-family: var(--title); font-size: 32px; min-width: 64px; text-align: center; color: #fff;
  text-shadow: 0 3px 0 var(--ink); background: rgba(0, 0, 0, 0.3); border-radius: 14px; padding: 2px 10px;
}
.timer.urgent { color: var(--bad); animation: pulse 0.5s ease-in-out infinite; }
.timer.retreat { color: var(--good); }
.wind { font-weight: 800; font-size: 18px; text-shadow: 0 2px 0 var(--ink); background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 2px 10px; }
.sd { font-family: var(--title); color: var(--good); text-shadow: 0 2px 0 var(--ink); animation: pulse 1s infinite; }
.pause { margin-left: auto; pointer-events: auto; width: 52px; height: 52px; border-radius: 16px; border: 3px solid var(--ink); background: rgba(45, 31, 82, 0.85); font-size: 22px; }
@keyframes pulse { 50% { transform: scale(1.15); } }
</style>
