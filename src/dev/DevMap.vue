<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Game } from '../game/core/game'
import { GameView } from '../game/render/gameView'
import { ROACH_KINDS, TEAM_COLORS, TEAM_IDS, type MapId } from '../game/core/types'
import { RoachView } from '../game/render/roachView'
import { createRoach } from '../game/core/roach'

const host = ref<HTMLDivElement | null>(null)
const params = new URLSearchParams(location.search)
const game = new Game({ mapId: (params.get('map') ?? 'pizza') as MapId, players: 4, turnTime: 45, seed: Number(params.get('seed') ?? 7) })
const view = new GameView(game)

onMounted(async () => {
  if (!host.value) return
  await view.mount(host.value)
  view.camera.setZoom(Number(params.get('zoom') ?? 0.35))
  const views = game.world.roaches.map((r) => {
    const v = new RoachView(r.kind, TEAM_COLORS[r.team], r.name)
    view.layers.roaches.addChild(v.container)
    return { r, v }
  })
  if (params.get('strip')) {
    for (const { v } of views) v.container.visible = false
    let i = 0
    for (const team of TEAM_IDS) for (const kind of ROACH_KINDS) {
      const r = createRoach(1000 + i, team, kind, { x: 1000 + (i % 8) * 48, y: 300 + Math.floor(i / 8) * 70 })
      r.grounded = true
      r.facing = i % 2 === 0 ? 1 : -1
      const v = new RoachView(kind, TEAM_COLORS[team], kind)
      view.layers.overlay.addChild(v.container)
      views.push({ r, v })
      i++
    }
    view.camera.x = 1170
    view.camera.y = 330
    view.camera.setZoom(Number(params.get('zoom') ?? 2))
  }
  view.frameHandlers.push((_dt, t) => {
    for (const { r, v } of views) if (r.id < 1000 ? !params.get('strip') : true) v.sync(r, t, r.id === game.activeId, false)
  })
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
