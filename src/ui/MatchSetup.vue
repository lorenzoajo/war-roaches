<script setup lang="ts">
import { reactive } from 'vue'
import { MAPS, MAP_ORDER } from '../game/maps/mapDef'
import { TEAM_COLORS, TEAM_IDS, type MapId } from '../game/core/types'
import { css } from '../game/render/color'
import { enterImmersive, go, startMatch, store, type SetupChoice } from './store'

const choice = reactive<SetupChoice>({ ...store.setup })
const maps = MAP_ORDER.map((id) => MAPS[id])
const thumb = (id: MapId): string => {
  const t = MAPS[id].theme
  return `linear-gradient(180deg, ${css(t.sky[0])} 0%, ${css(t.sky[1])} 55%, ${css(t.terrain)} 56%, ${css(t.terrainDark)} 85%, ${css(t.hazard)} 86%)`
}
const start = async (): Promise<void> => {
  await enterImmersive()
  startMatch({ ...choice })
}
</script>

<template>
  <div class="screen setup">
    <header>
      <button class="btn secondary back" aria-label="Back" @click="go('menu')">◀</button>
      <h2 class="title">Pick a battlefield</h2>
    </header>
    <div class="maps">
      <button v-for="m in maps" :key="m.id" class="map" :class="{ on: choice.mapId === m.id }" :style="{ background: thumb(m.id) }" @click="choice.mapId = m.id">
        <span class="name title">{{ m.name }}</span>
        <span class="line">{{ m.tagline }}</span>
      </button>
    </div>
    <footer>
      <div class="group">
        <span class="label">Players</span>
        <div class="seg">
          <button v-for="n in [2, 3, 4] as const" :key="n" :class="{ on: choice.players === n }" @click="choice.players = n">
            {{ n }}
            <span class="dots"><i v-for="t in TEAM_IDS.slice(0, n)" :key="t" :style="{ background: css(TEAM_COLORS[t]) }" /></span>
          </button>
        </div>
      </div>
      <div class="group">
        <span class="label">Turn time</span>
        <div class="seg">
          <button v-for="s in [30, 45, 60] as const" :key="s" :class="{ on: choice.turnTime === s }" @click="choice.turnTime = s">{{ s }}s</button>
        </div>
      </div>
      <button class="btn big go" @click="start">FIGHT!</button>
    </footer>
  </div>
</template>

<style scoped>
.setup { display: flex; flex-direction: column; gap: 10px; background: var(--bg); }
header { display: flex; align-items: center; gap: 12px; }
h2 { margin: 0; font-weight: 400; font-size: 28px; color: var(--accent); }
.back { padding: 6px 14px; min-width: 64px; min-height: 48px; }
.maps { display: flex; gap: 12px; overflow-x: auto; flex: 1; min-height: 0; padding: 4px 2px 8px; scroll-snap-type: x mandatory; }
.map {
  flex: 0 0 clamp(150px, 26vw, 230px); border: 4px solid #120b22; border-radius: 20px; scroll-snap-align: start;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; padding: 10px; text-align: left;
  box-shadow: var(--shadow); cursor: pointer; transition: transform 0.1s; color: #fff;
}
.map.on { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 0 0 3px var(--ink), 0 8px 0 rgba(0, 0, 0, 0.35); }
.name { font-size: 20px; text-shadow: 0 2px 0 var(--ink); }
.line { font-size: 14px; font-weight: 700; text-shadow: 0 1px 2px var(--ink); }
footer { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.group { display: flex; flex-direction: column; gap: 4px; }
.label { color: var(--muted); font-weight: 700; font-size: 14px; }
.seg { display: flex; background: var(--panel); border: 3px solid #120b22; border-radius: 16px; overflow: hidden; }
.seg button { border: 0; background: transparent; font-size: 20px; font-weight: 800; min-width: 64px; min-height: 52px; padding: 0 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.seg button.on { background: var(--accent); color: var(--ink); }
.dots { display: flex; gap: 2px; }
.dots i { width: 8px; height: 8px; border-radius: 50%; border: 1px solid var(--ink); }
.go { margin-left: auto; }
</style>
