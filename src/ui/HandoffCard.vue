<script setup lang="ts">
import { computed } from 'vue'
import type { HudSnapshot } from '../game/core/game'
import { ARCHETYPES } from '../game/core/archetypes'
import { css } from '../game/render/color'
import RoachBadge from './RoachBadge.vue'

const props = defineProps<{ hud: HudSnapshot }>()
const emit = defineEmits<{ start: [] }>()
const team = computed(() => props.hud.teams.find((t) => t.id === props.hud.team))
const kind = computed(() => ARCHETYPES[props.hud.activeKind])
const color = computed(() => css(team.value?.color ?? 0xffffff))
</script>

<template>
  <button class="handoff" :style="{ '--team': color }" @click="emit('start')">
    <RoachBadge :color="color" :size="110" />
    <h1 class="title">Pass to {{ team?.name }}!</h1>
    <p class="who"><b>{{ props.hud.activeName }}</b> the {{ kind.label }} · ★ {{ kind.special }}</p>
    <p class="tap">Tap to start <span class="kbd">(or press Space)</span></p>
  </button>
</template>

<style scoped>
.handoff {
  position: absolute; inset: 0; border: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle, color-mix(in srgb, var(--team) 70%, white), var(--team) 45%, color-mix(in srgb, var(--team) 55%, black));
  color: #fff; text-shadow: 0 3px 0 var(--ink);
}
h1 { font-size: clamp(36px, 8vw, 72px); margin: 4px 0; font-weight: 400; }
.who { margin: 0; font-size: 20px; }
@media (hover: none) { .kbd { display: none; } }
.tap { margin: 14px 0 0; font-size: 18px; font-weight: 800; animation: blink 1.2s infinite; }
@keyframes blink { 50% { opacity: 0.4; } }
</style>
