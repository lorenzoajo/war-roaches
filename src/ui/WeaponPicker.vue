<script setup lang="ts">
import type { HudSnapshot } from '../game/core/game'
import { WEAPONS, WEAPON_ORDER } from '../game/core/weapons'
import type { WeaponId } from '../game/core/types'

const props = defineProps<{ hud: HudSnapshot }>()
const emit = defineEmits<{ pick: [weapon: WeaponId]; fuse: [fuse: number]; close: [] }>()
const count = (id: WeaponId): number => props.hud.ammo[id] ?? 0
</script>

<template>
  <div class="sheet-bg" @click.self="emit('close')">
    <div class="sheet">
      <div class="grid">
        <button
          v-for="id in WEAPON_ORDER"
          :key="id"
          class="cell"
          :class="{ on: props.hud.weapon === id }"
          :disabled="count(id) <= 0"
          @click="emit('pick', id)"
        >
          <span class="emoji">{{ WEAPONS[id].emoji }}</span>
          <span class="name">{{ WEAPONS[id].name }}</span>
          <span class="ammo">{{ count(id) === Infinity ? '∞' : `×${count(id)}` }}</span>
        </button>
      </div>
      <label v-if="WEAPONS[props.hud.weapon].usesFuse" class="fuse">
        ⏱ Fuse: <b>{{ props.hud.fuse }}s</b>
        <input type="range" min="1" max="5" step="1" :value="props.hud.fuse" @input="emit('fuse', Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.sheet-bg { position: absolute; inset: 0; background: rgba(10, 5, 20, 0.45); display: flex; align-items: flex-end; justify-content: center; z-index: 4; }
.sheet {
  background: var(--panel); border: 3px solid #120b22; border-bottom: 0; border-radius: 22px 22px 0 0;
  padding: 10px 12px calc(10px + var(--sab)); width: min(760px, 100%); box-shadow: 0 -6px 0 rgba(0, 0, 0, 0.25);
}
.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.cell {
  border: 3px solid #120b22; border-radius: 14px; background: var(--panel-2); min-height: 72px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; position: relative;
}
.cell.on { background: var(--accent); color: var(--ink); }
.cell:disabled { opacity: 0.35; }
.emoji { font-size: 26px; }
.name { font-size: 12px; font-weight: 800; line-height: 1; text-align: center; }
.ammo { position: absolute; top: 2px; right: 6px; font-size: 12px; font-weight: 900; }
.fuse { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-weight: 800; }
.fuse input { flex: 1; height: 36px; accent-color: var(--accent); }
</style>
