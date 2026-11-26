<script setup lang="ts">
import { computed } from 'vue'
import type { HudSnapshot } from '../game/core/game'
import { ARCHETYPES } from '../game/core/archetypes'
import { WEAPONS } from '../game/core/weapons'
import { HeldDirections } from '../game/input/heldDirections'

const props = defineProps<{ hud: HudSnapshot }>()
const emit = defineEmits<{ move: [dir: -1 | 0 | 1]; jump: [pressed: boolean]; weapons: []; special: [] }>()

const acting = computed(() => props.hud.phase === 'turn')
const weapon = computed(() => WEAPONS[props.hud.weapon])
const ammo = computed(() => {
  const a = props.hud.ammo[props.hud.weapon] ?? 0
  return a === Infinity ? '∞' : String(a)
})
const special = computed(() => ARCHETYPES[props.hud.activeKind].special)

const held = new HeldDirections()
const press = (dir: -1 | 1) => (e: PointerEvent): void => {
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  emit('move', held.press(e.pointerId, dir))
}
const release = (e: PointerEvent): void => emit('move', held.release(e.pointerId))
</script>

<template>
  <div class="controls">
    <div class="left">
      <div class="row">
        <button class="pad" aria-label="Walk left" @pointerdown="press(-1)($event)" @pointerup="release" @pointercancel="release" @lostpointercapture="release">◀</button>
        <button class="pad" aria-label="Walk right" @pointerdown="press(1)($event)" @pointerup="release" @pointercancel="release" @lostpointercapture="release">▶</button>
      </div>
      <button class="pad jump" :aria-label="props.hud.roping ? 'Let go of rope' : 'Jump'" @pointerdown="emit('jump', true)" @pointerup="emit('jump', false)" @pointercancel="emit('jump', false)">
        {{ props.hud.roping ? '✋' : '⤴' }}
      </button>
    </div>
    <div class="right">
      <button class="pad wide" :disabled="!acting" @click="emit('weapons')">
        <span class="emoji">{{ weapon.emoji }}</span>
        <span class="wname">{{ weapon.name }}<small> ×{{ ammo }}</small></span>
      </button>
      <button class="pad wide special" :disabled="!acting || !props.hud.specialReady" @click="emit('special')">
        <span class="emoji">★</span>
        <span class="wname">{{ special }}<small v-if="props.hud.specialCooldown > 0"> ({{ props.hud.specialCooldown }})</small></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.controls {
  position: absolute; left: calc(10px + var(--sal)); right: calc(10px + var(--sar)); bottom: calc(10px + var(--sab));
  display: flex; justify-content: space-between; align-items: flex-end; pointer-events: none;
}
.left, .right { display: flex; flex-direction: column; gap: 8px; pointer-events: auto; }
.left { align-items: flex-start; }
.right { align-items: flex-end; }
.row { display: flex; gap: 8px; }
.pad {
  min-width: 72px; min-height: 64px; border-radius: 20px; border: 3px solid var(--ink);
  background: rgba(45, 31, 82, 0.72); font-size: 28px; font-weight: 900; box-shadow: var(--shadow);
  user-select: none; -webkit-user-select: none; touch-action: none;
}
.pad:active { transform: translateY(3px); background: rgba(80, 60, 140, 0.9); }
.jump { min-width: 152px; }
.wide { display: flex; align-items: center; gap: 8px; padding: 0 14px; min-width: 180px; font-size: 16px; text-align: left; }
.wide .emoji { font-size: 28px; }
.wname { line-height: 1.05; }
.wname small { color: var(--accent); }
.special { background: rgba(120, 80, 20, 0.75); }
.pad:disabled { opacity: 0.45; }
</style>
