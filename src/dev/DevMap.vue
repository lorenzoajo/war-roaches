<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Game } from '../game/core/game'
import { GameView } from '../game/render/gameView'
import type { MapId } from '../game/core/types'

const host = ref<HTMLDivElement | null>(null)
const params = new URLSearchParams(location.search)
const game = new Game({ mapId: (params.get('map') ?? 'pizza') as MapId, players: 4, turnTime: 45, seed: Number(params.get('seed') ?? 7) })
const view = new GameView(game)

onMounted(async () => {
  if (!host.value) return
  await view.mount(host.value)
  view.camera.setZoom(Number(params.get('zoom') ?? 0.35))
  host.value.addEventListener('pointerdown', (e) => {
    const p = view.camera.screenToWorld({ x: e.offsetX, y: e.offsetY })
    game.world.explode({ pos: p, radius: 55, damage: 40, ownerTeam: 0 })
  })
  for (const s of (params.get('boom') ?? '').split(';').filter(Boolean)) {
    const [x, y] = s.split(',').map(Number)
    game.world.explode({ pos: { x: x ?? 0, y: y ?? 0 }, radius: 70, damage: 40, ownerTeam: 0 })
  }
})
onBeforeUnmount(() => view.destroy())
</script>

<template>
  <div ref="host" style="position: fixed; inset: 0"></div>
</template>
