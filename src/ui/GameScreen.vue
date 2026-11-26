<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Game, type HudSnapshot } from '../game/core/game'
import { GameView } from '../game/render/gameView'
import { PointerRouter, type PointerIntent } from '../game/input/pointerRouter'
import { WEAPONS } from '../game/core/weapons'
import type { WeaponId } from '../game/core/types'
import { sfx } from '../game/audio/sfx'
import { logger } from '../lib/logger'
import HudBar from './HudBar.vue'
import TouchControls from './TouchControls.vue'
import WeaponPicker from './WeaponPicker.vue'
import HandoffCard from './HandoffCard.vue'
import PauseMenu from './PauseMenu.vue'
import VictoryScreen from './VictoryScreen.vue'
import { go, startMatch, store } from './store'

const host = ref<HTMLDivElement | null>(null)
const game = new Game(store.config)
const view = new GameView(game)
const hud = shallowRef<HudSnapshot>(game.snapshot())
const picker = ref(false)
const paused = ref(false)
const victory = ref(false)
const toast = ref<string | null>(null)
let router: PointerRouter | null = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
let lastKey = ''

const weaponKind = computed(() => WEAPONS[hud.value.weapon].kind)
const showControls = computed(() => hud.value.phase === 'turn' || hud.value.phase === 'retreat')
const hint = computed(() => {
  if (hud.value.phase !== 'turn') return null
  if (weaponKind.value === 'targeted') return 'Tap where the shoe should stomp!'
  if (hud.value.roping) return 'Swing with ◀ ▶ — tap ✋ to let go'
  return null
})

const hudKey = (s: HudSnapshot): string =>
  [s.phase, s.team, s.activeRoachId, Math.ceil(s.timeLeft), s.weapon, s.fuse, s.specialReady, s.specialCooldown, s.winner, s.roping, s.suddenDeath, s.wind.toFixed(2),
    s.teams.map((t) => `${t.hp}/${t.alive}`).join(','), Object.values(s.ammo).join(',')].join('|')

function showToast(msg: string): void {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 1600)
}

function onIntent(i: PointerIntent): void {
  switch (i.kind) {
    case 'aim':
      view.aim = i.aim.cancel ? null : { angle: i.aim.angle, power: i.aim.power }
      break
    case 'aimRelease':
      view.aim = null
      if (!i.aim.cancel) game.command({ type: 'fire', angle: i.aim.angle, power: Math.max(0.08, i.aim.power) })
      break
    case 'pan':
      view.camera.pan(i.dx, i.dy)
      view.notifyUserCamera()
      break
    case 'pinch':
      view.camera.setZoom(i.zoom, i.center)
      view.notifyUserCamera()
      break
    case 'tap':
      if (hud.value.phase === 'turn' && weaponKind.value === 'targeted') {
        const p = view.camera.screenToWorld(i.screen)
        game.command({ type: 'target', x: p.x, y: p.y })
      }
      break
  }
}

function onVisibility(): void {
  if (document.hidden && !victory.value) setPaused(true)
}

function setPaused(p: boolean): void {
  paused.value = p
  game.paused = p
  if (p) game.command({ type: 'move', dir: 0 })
}

function begin(): void {
  sfx.unlock()
  game.command({ type: 'beginTurn' })
}

function pick(weapon: WeaponId): void {
  game.command({ type: 'selectWeapon', weapon })
  picker.value = false
}

function rematch(): void {
  startMatch({ mapId: store.config.mapId, players: store.config.players, turnTime: store.config.turnTime })
}

onMounted(async () => {
  if (!host.value) return
  try {
    await view.mount(host.value)
  } catch (err) {
    logger.error('could not start renderer', err)
    showToast('Could not start graphics 😢')
    return
  }
  view.frameHandlers.push(() => {
    const s = game.snapshot()
    const key = hudKey(s)
    if (key !== lastKey) {
      lastKey = key
      hud.value = s
    }
  })
  view.eventHandlers.push((e) => {
    if (e.type === 'pickup') showToast(e.label)
    if (e.type === 'gameOver') setTimeout(() => (victory.value = true), 1500)
  })
  router = new PointerRouter(host.value, {
    getRoachScreen: () => view.roachScreen(),
    canAim: () => game.phase === 'turn' && WEAPONS[game.weapon].kind !== 'targeted' && !picker.value,
    getZoom: () => view.camera.zoom,
    onIntent,
  })
  document.addEventListener('visibilitychange', onVisibility)
  if (import.meta.env.DEV) window.__wr = { game, view }
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  clearTimeout(toastTimer)
  router?.destroy()
  view.destroy()
})
</script>

<template>
  <div class="game">
    <div ref="host" class="canvas-host"></div>
    <HudBar v-if="hud.phase !== 'handoff'" :hud="hud" @pause="setPaused(true)" />
    <TouchControls
      v-if="showControls"
      :hud="hud"
      @move="(d) => game.command({ type: 'move', dir: d })"
      @jump="(p) => game.command({ type: 'jump', pressed: p })"
      @weapons="picker = true"
      @special="game.command({ type: 'special' })"
    />
    <div v-if="hint" class="hint">{{ hint }}</div>
    <transition name="pop"><div v-if="toast" class="toast">{{ toast }}</div></transition>
    <WeaponPicker v-if="picker && hud.phase === 'turn'" :hud="hud" @pick="pick" @fuse="(f) => game.command({ type: 'setFuse', fuse: f })" @close="picker = false" />
    <HandoffCard v-if="hud.phase === 'handoff' && !victory" :hud="hud" @start="begin" />
    <PauseMenu v-if="paused" @resume="setPaused(false)" @quit="go('menu')" />
    <VictoryScreen v-if="victory" :hud="hud" @rematch="rematch" @menu="go('menu')" />
  </div>
</template>

<style scoped>
.game { position: fixed; inset: 0; overflow: hidden; background: var(--bg); }
.canvas-host { position: absolute; inset: 0; touch-action: none; }
.hint {
  position: absolute; top: calc(64px + var(--sat)); left: 50%; transform: translateX(-50%); pointer-events: none;
  background: rgba(27, 18, 48, 0.8); border: 2px solid var(--ink); border-radius: 14px; padding: 4px 14px; font-weight: 800;
}
.toast {
  position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 3;
  font-family: var(--title); font-size: 26px; color: var(--accent); text-shadow: 0 3px 0 var(--ink);
}
.pop-enter-active, .pop-leave-active { transition: all 0.25s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translate(-50%, -30%) scale(0.8); }
</style>
