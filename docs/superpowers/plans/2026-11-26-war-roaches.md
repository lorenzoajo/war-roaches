# War Roaches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hot-seat 2–4 player artillery PWA with destructible terrain, cartoon roaches, 5 absurd maps, touch-first controls, offline + auto-update, Nix build, GitHub Pages deploy.

**Architecture:** Pure-TS deterministic simulation (`src/game/core`) with fixed 60 Hz tick, consumed by a PixiJS v8 renderer (`src/game/render`) via a drained event queue and read-only state; Vue 3 owns menus/HUD/touch buttons and talks to the sim only through `Game.command()` and `Game.snapshot()`. Terrain = `Uint8Array` material mask (authority) + 2D canvas art carved in lockstep and uploaded as a Pixi texture.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript ~6.0.3 (not 7: vue-tsc needs the JS compiler API), PixiJS 8.23, pixi-filters 6.1, vite-plugin-pwa 2.0 (Workbox), Vitest 5, Nix flake + devenv.

**Spec:** `docs/superpowers/specs/2026-11-26-war-roaches-design.md`

## Global Constraints
- TypeScript strict, no `any`; prefer `unknown`-free typing. `noUncheckedIndexedAccess: true`.
- `src/game/core/**` must not import DOM, Pixi, or Vue (unit-tested in Node env).
- All caught errors go through `src/lib/logger.ts`; no empty `catch`.
- English only. Landscape only. Touch targets ≥ 64 px. Respect `env(safe-area-inset-*)`.
- World 2400×1200 px; tick 1/60 s; frame dt clamped to 0.1 s.
- Vite `base: '/war-roaches/'`; PWA `registerType: 'prompt'`, `scope`/`start_url` = `/war-roaches/`.
- Default branch `master`; commit after every task.
- No bitmap art or audio files besides PWA icons; all game art code-drawn, all SFX synthesized.
- Do not reuse Worms names/characters/weapons.

## Review Focus
1. **Active roach dies during its own turn** (own blast, hazard at 0 HP): turn must end cleanly and pass to the next living team — test in Task 8 `ends turn when active roach dies`.
2. **Several teams wiped in the same settle**: result is a draw, not a crash or a wrong winner — Task 8 `simultaneous wipe is a draw`.
3. **Heavily destroyed map**: spawn/respawn/crate placement must always return a position (fallback: top of world above any solid column, else map center at y=100 gliding) — Task 3 `findSpawnPoints falls back on empty mask`.
4. **Tab hidden / phone locked mid-turn**: timer must pause, no huge dt tunnelling through terrain — Task 8 `clamps large frame dt` + Task 13 pause on `visibilitychange`.
5. **Projectile never settles** (rolling grenade, off-world shots): settle phase must end — projectiles leaving x∉[-200, 2600] or y>1400 are removed; settle hard cap 10 s — Task 8 `settle phase times out`.

---

## File Structure
```
flake.nix, devenv.nix, .envrc, package.json, tsconfig.json, vite.config.ts, vitest.config.ts, index.html
.github/workflows/deploy.yml
public/icon.svg, public/pwa-192x192.png, public/pwa-512x512.png, public/maskable-icon-512x512.png, public/apple-touch-icon-180x180.png
src/main.ts, src/App.vue, src/env.d.ts
src/lib/logger.ts
src/game/core/
  types.ts        shared types/enums
  constants.ts    tuning numbers
  rng.ts          seeded RNG
  vec.ts          Vec2 helpers
  terrain.ts      TerrainMask
  spawn.ts        spawn/surface finding
  archetypes.ts   roach stats
  roach.ts        Roach entity + movement physics
  projectile.ts   projectile physics + per-weapon behaviour
  weapons.ts      weapon table
  explosion.ts    damage/knockback/carving
  hazards.ts      clouds, fires, mines, hazard bounce-back
  specials.ts     roach specials
  crates.ts       crates & pickups
  rope.ts         grapple pendulum
  game.ts         Game: state machine, turns, commands, snapshot, events
  events.ts       GameEvent union
src/game/maps/
  mapDef.ts       MapDef type + registry
  sink.ts pizza.ts sofa.ts moon.ts cake.ts
src/game/input/
  gestures.ts     pure gesture math
  pointerRouter.ts DOM pointer → aim/pan/pinch
src/game/render/
  gameView.ts     Pixi Application, layers, frame loop
  camera.ts       pure camera math
  terrainArt.ts   paint/carve terrain canvas
  background.ts   per-map backdrop + hazard liquid
  roachView.ts    roach drawing/animation
  entityViews.ts  projectiles, crates, clouds, fires, mines
  effects.ts      particles, shake, bloom, shockwave, trails, damage numbers
  aimOverlay.ts   trajectory dots, power arc
src/game/audio/sfx.ts
src/ui/
  store.ts        screen + settings reactive store
  MainMenu.vue MatchSetup.vue GameScreen.vue HudBar.vue TouchControls.vue
  WeaponPicker.vue HandoffCard.vue PauseMenu.vue VictoryScreen.vue RotatePrompt.vue UpdateToast.vue
tests/core/*.test.ts, tests/maps/*.test.ts, tests/input/*.test.ts, tests/render/camera.test.ts
```

---

### Task 1: Toolchain, Nix, scaffold, CI deploy

**Files:** Create `flake.nix`, `devenv.nix`, `.envrc`, `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `src/env.d.ts`, `src/lib/logger.ts`, `public/icon.svg`, PWA PNG icons, `.github/workflows/deploy.yml`, `README.md`; Test `tests/lib/logger.test.ts`.

**Interfaces — Produces:**
- `logger: { debug(msg: string, ctx?: Record<string, unknown>): void; info(...); warn(...); error(msg: string, err?: unknown, ctx?: Record<string, unknown>): void; recent(): LogEntry[] }` — ring buffer of 200; `installGlobalHandlers(): void` hooks `window.onerror` / `unhandledrejection`. (`unknown` allowed here only: caught errors are untyped.)
- npm scripts: `dev`, `build` (`vue-tsc --noEmit && vite build`), `typecheck`, `test` (`vitest run`), `preview`.

- [ ] **Step 1:** `flake.nix` inputs `nixpkgs` (nixos-unstable), `devenv`, `systems`; `devShells.<sys>.default = devenv.lib.mkShell { inherit inputs pkgs; modules = [ ./devenv.nix ]; }`; `packages.<sys>.default = pkgs.buildNpmPackage { pname = "war-roaches"; version = "0.1.0"; src = lib.cleanSource ./.; npmDepsHash = "…"; installPhase = "cp -r dist $out"; }`. `devenv.nix`: `languages.javascript = { enable = true; package = pkgs.nodejs_22; npm.enable = true; };` plus `git`. `.envrc`: `use flake . --no-pure-eval`. README documents `nix develop --no-pure-eval` and `nix build`.
- [ ] **Step 2:** `npm init`, install deps: `vue@^3.5 pixi.js@^8.23 pixi-filters@^6.1`; dev: `vite@^8 @vitejs/plugin-vue@^6 typescript@~6.0.3 vue-tsc@^3 vitest@^5 vite-plugin-pwa@^2 workbox-window@^7 @vite-pwa/assets-generator@^1 jsdom`.
- [ ] **Step 3:** `vite.config.ts`: `base: '/war-roaches/'`, VitePWA `{ registerType: 'prompt', includeAssets: ['icon.svg'], manifest: { name: 'War Roaches', short_name: 'War Roaches', orientation: 'landscape', display: 'fullscreen', background_color: '#1b1230', theme_color: '#1b1230', scope: '/war-roaches/', start_url: '/war-roaches/', icons: [192, 512, maskable 512] }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] } }`. `vitest.config.ts`: environment `node`, include `tests/**/*.test.ts`.
- [ ] **Step 4:** `index.html` viewport `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`; `body { touch-action: none; overscroll-behavior: none; user-select: none; }`. `public/icon.svg`: cute roach head, purple bg. Run `npx pwa-assets-generator --preset minimal-2023 public/icon.svg` once and commit PNGs.
- [ ] **Step 5: Write failing test** `tests/lib/logger.test.ts`: `keeps last 200 entries` (log 250 → `recent().length === 200`, first msg is `'m50'`); `error stores err message` (`logger.error('x', new Error('boom'))` → `recent().at(-1)?.ctx?.error === 'boom'`).
- [ ] **Step 6:** Run `npm test` → FAIL (module missing). Implement `src/lib/logger.ts`. Run → PASS.
- [ ] **Step 7:** `.github/workflows/deploy.yml`: `on: { push: { branches: [master] }, workflow_dispatch: {} }`; permissions `pages: write, id-token: write, contents: read`; concurrency group `pages`; job build: checkout@v4, setup-node@v4 (22, cache npm), `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, configure-pages@v5, upload-pages-artifact@v3 (`dist`); job deploy: deploy-pages@v4, environment `github-pages`.
- [ ] **Step 8:** Verify: `npm run build` succeeds and `dist/manifest.webmanifest` exists; compute `npmDepsHash` via `nix run nixpkgs#prefetch-npm-deps package-lock.json`, then `nix build` produces `result/index.html`.
- [ ] **Step 9:** Commit `chore: scaffold vue/vite/pixi pwa with nix flake and pages deploy`.

### Task 2: Core primitives (types, constants, RNG, vectors)

**Files:** Create `src/game/core/{types,constants,rng,vec}.ts`; Test `tests/core/rng.test.ts`, `tests/core/vec.test.ts`.

**Interfaces — Produces:**
```ts
// types.ts
export interface Vec2 { x: number; y: number }
export type TeamId = 0 | 1 | 2 | 3
export type RoachKind = 'chonk' | 'stilts' | 'brawler' | 'zippy'
export type WeaponId = 'bazooka' | 'grenade' | 'slipper' | 'spray' | 'shoe' | 'disco' | 'gum' | 'hotsauce' | 'duck' | 'rope'
export type MapId = 'sink' | 'pizza' | 'sofa' | 'moon' | 'cake'
export const enum Material { Air = 0, Normal = 1, Solid = 2, Sticky = 3, Slippery = 4, Bouncy = 5 }
export interface MatchConfig { mapId: MapId; players: 2 | 3 | 4; turnTime: 30 | 45 | 60; seed: number }
export const TEAM_COLORS: Record<TeamId, number>  // 0xff4d5e red, 0x3fa7ff blue, 0x46d37a green, 0xffd23f yellow
export const TEAM_NAMES: Record<TeamId, string>   // 'Red','Blue','Green','Yellow'
```
`constants.ts` (exact): `WORLD_W=2400, WORLD_H=1200, TICK=1/60, MAX_FRAME_DT=0.1, GRAVITY=600, HAZARD_Y=1130, HAZARD_DAMAGE=30, RETREAT_TIME=3, SETTLE_CAP=10, SUDDEN_DEATH_AT=720, SUDDEN_DEATH_RISE=25, SELF_DAMAGE_MULT=0.5, SPECIAL_COOLDOWN=3, ROACHES_PER_TEAM=4, SPAWN_MIN_SPACING=120, CRATE_CHANCE=0.5, CRATE_FALL_SPEED=60, GLIDE_FALL_SPEED=70, MAX_DRAG_PX=180, AIM_GRAB_MULT=3, MAX_LAUNCH_SPEED=900, PREVIEW_FRAC=0.4, OFFWORLD_MIN_X=-200, OFFWORLD_MAX_X=2600, OFFWORLD_MAX_Y=1400`.
`rng.ts`: `class Rng { constructor(seed: number); next(): number /*[0,1)*/; range(min: number, max: number): number; int(min: number, maxIncl: number): number; pick<T>(arr: readonly T[]): T; shuffle<T>(arr: T[]): T[] }` (mulberry32).
`vec.ts`: `add, sub, scale, len, norm, dist, fromAngle(angle: number, mag: number): Vec2, clamp(v: number, lo: number, hi: number): number`.

- [ ] **Step 1: Failing tests:** `rng is deterministic per seed` (two `Rng(42)` produce equal first 10 values; `Rng(43)` differs); `int stays in bounds` (10k draws of `int(1,3)` ⊂ {1,2,3}, all three seen); `norm of zero vector is zero` (`norm({x:0,y:0})` → `{x:0,y:0}`).
- [ ] **Step 2:** `npm test` → FAIL. Implement. → PASS.
- [ ] **Step 3:** Commit `feat(core): types, constants, rng, vec`.

### Task 3: Terrain mask and spawn finding

**Files:** Create `src/game/core/terrain.ts`, `src/game/core/spawn.ts`; Test `tests/core/terrain.test.ts`, `tests/core/spawn.test.ts`.

**Interfaces — Produces:**
```ts
export class TerrainMask {
  constructor(width: number, height: number)
  readonly width: number; readonly height: number; readonly data: Uint8Array
  get(x: number, y: number): Material        // out of bounds → Air
  set(x: number, y: number, m: Material): void
  isSolid(x: number, y: number): boolean
  fillCircle(cx: number, cy: number, r: number, m: Material): void
  fillRect(x: number, y: number, w: number, h: number, m: Material): void
  fillPolygon(points: readonly Vec2[], m: Material): void
  carveCircle(cx: number, cy: number, r: number): number   // returns removed px; never removes Solid
  overlapsCircle(cx: number, cy: number, r: number): boolean
  materialUnder(cx: number, cy: number, r: number): Material // dominant material in a 3px band below circle
  normalAt(x: number, y: number, r?: number): Vec2          // gradient of solid density, default r=6, points out of terrain
  raycast(from: Vec2, to: Vec2): Vec2 | null                 // first solid px along segment
}
// spawn.ts
export function surfaceSpots(mask: TerrainMask, hazardY: number, headroom: number): Vec2[] // every 8px column: top of each solid run with `headroom` air above and y < hazardY-40
export function findSpawnPoints(mask: TerrainMask, rng: Rng, count: number, minSpacing: number, hazardY: number): Vec2[]
export function findSafeSpot(mask: TerrainMask, rng: Rng, hazardY: number, avoid: readonly Vec2[]): Vec2
```
`findSpawnPoints`: shuffle `surfaceSpots(…, 40)`, greedily take spots ≥ minSpacing from chosen; if short, halve spacing and retry down to 30; final fallback (no spots at all) returns points spread evenly across x at y=100.

- [ ] **Step 1: Failing tests:** `carveCircle removes pixels in radius` (fill rect 0..100², carve (50,50,10) → `isSolid(50,50)` false, `isSolid(50,65)` true, returned count within ±5% of π·100); `carveCircle keeps Solid material`; `out of bounds is air`; `normalAt flat ground points up` (ground y≥100 → normal y < -0.9); `raycast hits ground` (from (50,0) to (50,200) on ground at y=100 → y===100); `materialUnder reports Sticky`; `findSpawnPoints respects spacing` (flat ground, 16 points, all pairwise ≥ 120 or count < 16 with spacing ≥ 30); `findSpawnPoints falls back on empty mask` (empty mask, 8 → 8 points with y===100); `spawn points stay above hazard`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit `feat(core): destructible terrain mask and spawn finding`.

### Task 4: Map definitions (5 maps)

**Files:** Create `src/game/maps/{mapDef,sink,pizza,sofa,moon,cake}.ts`; Test `tests/maps/maps.test.ts`.

**Interfaces — Produces:**
```ts
export interface MapTheme {
  sky: [number, number]; terrain: number; terrainDark: number; rim: number; accents: number[]
  hazard: number; hazardName: string; debris: number[]
}
export interface MapPhysics { gravityMult: number; windMax: number; bubbles: boolean }
export interface MapDef {
  id: MapId; name: string; tagline: string; theme: MapTheme; physics: MapPhysics
  generate(mask: TerrainMask, rng: Rng): void  // must leave ≥ 16 surface spots
  props: (rng: Rng) => MapProp[]                // decorative, render-only (e.g. faucet, remote, candles)
}
export interface MapProp { kind: string; x: number; y: number; scale: number; rot: number }
export const MAPS: Record<MapId, MapDef>
export const MAP_ORDER: readonly MapId[] // ['sink','pizza','sofa','moon','cake']
```
Exact values:
| id | name | tagline | gravityMult | windMax | materials |
|---|---|---|---|---|---|
| sink | Sink Abyss | Dirty dishes over a soapy sea | 1 | 60 | Normal plates/bowls islands; Solid faucet base column; `bubbles: true` |
| pizza | Pizza Planet | Extra cheese, extra chaos | 1 | 60 | Normal crust; Sticky cheese top layer (6px) |
| sofa | Grandma's Sofa | Lost coins and dust bunnies | 1 | 50 | Bouncy cushions; Solid sofa frame (bottom + armrests) |
| moon | Moon Cheese | Low gravity, high hopes | 0.45 | 30 | Normal, ≥ 25 random holes |
| cake | Birthday Cake Volcano | Make a wish. Then duck. | 1 | 60 | Normal layers; Slippery frosting top (6px); Solid plate |

Hazard names: `Soap Water`, `Oven Glow`, `Dust Bunny Pit`, `Space Void`, `Lava Jam`. Each `generate` uses fixed silhouette + `rng` variation (offsets ±40px, sizes ±15%).

- [ ] **Step 1: Failing tests** (parametrised over `MAP_ORDER`, seeds 1..5): `generates at least 16 surface spots`; `nothing solid below HAZARD_Y is required` (≥ 1 surface spot left of x=800 and right of x=1600, so teams spread); `deterministic for seed` (two masks equal); `uses declared materials` (pizza has Sticky, cake Slippery, sofa Bouncy+Solid, sink Solid).
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit `feat(maps): five absurd destructible maps`.

### Task 5: Archetypes, roach movement physics

**Files:** Create `src/game/core/{archetypes,roach}.ts`; Test `tests/core/roach.test.ts`.

**Interfaces — Produces:**
```ts
export interface Archetype { label: string; hp: number; walkSpeed: number; jumpVel: number; mass: number; radius: number; airJumps: number; meleeMult: number; previewFrac: number }
export const ARCHETYPES: Record<RoachKind, Archetype>
// chonk:  Chonk, 150, 50, 260, 1.6, 15, 0, 1, 0.4
// stilts: Stilts, 90, 75, 430, 0.8, 11, 0, 1, 0.6
// brawler:Brawler,110, 75, 300, 1.1, 13, 0, 2, 0.4
// zippy:  Zippy,  80, 115, 300, 0.7, 9, 1, 1, 0.4
export interface Roach {
  id: number; team: TeamId; kind: RoachKind; name: string
  pos: Vec2; vel: Vec2; hp: number; alive: boolean; facing: 1 | -1
  grounded: boolean; gliding: boolean; airJumpsLeft: number
  specialCooldown: number; invulnTimer: number; dashTimer: number; slamming: boolean
}
export interface MoveInput { dir: -1 | 0 | 1; jumpPressed: boolean; jumpHeld: boolean }
export function createRoach(id: number, team: TeamId, kind: RoachKind, pos: Vec2): Roach
export function stepRoach(r: Roach, input: MoveInput, mask: TerrainMask, env: { gravity: number; bouncePad: number }, dt: number): void
```
Movement rules: ground walk climbs steps ≤ 6px, blocks steeper; on `Slippery` keep 98% horizontal vel per tick when no input and slide on slopes > 30°; on `Sticky` no sliding, walk ×0.8; landing on `Bouncy` with |vy| > 80 rebounds at 70% vy, jump on Bouncy ×1.4. Airborne: `jumpHeld` & vy > 0 → glide, vy capped at `GLIDE_FALL_SPEED`, horizontal 60px/s by `dir`. Zippy air jump uses `airJumps`. Collision resolution: push out along `normalAt` until no overlap, max 12 iterations; kill velocity into normal. No fall damage. Sub-step so that per-substep travel ≤ radius/2.

- [ ] **Step 1: Failing tests:** `falls and lands on ground` (ground y≥500, roach at y=300, 2 s → grounded, `pos.y + radius ≈ 500 ±2`); `walks right on flat ground` (1 s dir=1 → Δx ≈ walkSpeed ±10%); `cannot climb a 20px wall`; `climbs 4px step`; `glide caps fall speed` (jumpHeld airborne → vy ≤ 70); `zippy double jumps, chonk does not`; `bouncy surface rebounds`; `sticky slows walking` (Δx ratio 0.8 ±0.05); `slippery keeps sliding without input`; `no tunnelling at high speed` (vy=3000 onto 20px floor → stays above floor).
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit `feat(core): roach archetypes and movement physics`.

### Task 6: Weapons, projectiles, explosions

**Files:** Create `src/game/core/{weapons,projectile,explosion,events}.ts`; Test `tests/core/projectile.test.ts`, `tests/core/explosion.test.ts`.

**Interfaces — Produces:**
```ts
export type WeaponKind = 'projectile' | 'melee' | 'targeted' | 'placed' | 'utility'
export interface WeaponDef { id: WeaponId; name: string; emoji: string; kind: WeaponKind; windAffected: boolean; damage: number; radius: number; usesFuse: boolean; endsTurn: boolean; startAmmo: number /* Infinity for basics, 0 otherwise */; crateAmmo: number }
export const WEAPONS: Record<WeaponId, WeaponDef>
export const WEAPON_ORDER: readonly WeaponId[]
```
| id | name | emoji | kind | wind | dmg | radius | fuse | endsTurn | startAmmo | crateAmmo |
|---|---|---|---|---|---|---|---|---|---|---|
| bazooka | Spitball Bazooka | 🚀 | projectile | ✓ | 40 | 55 | – | ✓ | ∞ | – |
| grenade | Crumb Grenade | 💣 | projectile | – | 40 | 55 | ✓ (1–5 s, default 3) | ✓ | ∞ | – |
| slipper | Slipper Smack | 🩴 | melee | – | 20 | 30 | – | ✓ | ∞ | – |
| spray | Bug Spray Cloud | 🧴 | projectile | ✓ | 10/turn ×3 | 70 | – | ✓ | 0 | 1 |
| shoe | Big Shoe Stomp | 👟 | targeted | – | 50 | 85 | – | ✓ | 0 | 1 |
| disco | Disco Bomb | 🪩 | projectile | – | 30 + 5×15 | 50 / 30 | 3 s | ✓ | 0 | 1 |
| gum | Gum Mine | 🍬 | placed | – | 35 | 50 | – | ✓ | 0 | 2 |
| hotsauce | Hot Sauce Bottle | 🌶️ | projectile | ✓ | 15 + fire | 35 | – | ✓ | 0 | 1 |
| duck | Rubber Duck Torpedo | 🦆 | projectile | – | 45 | 55 | 6 s | ✓ | 0 | 1 |
| rope | Toothpick Rope | 🪢 | utility | – | – | – | – | ✗ | 0 | 2 |

```ts
export interface Projectile { id: number; weapon: WeaponId; pos: Vec2; vel: Vec2; age: number; fuse: number; ownerId: number; ownerTeam: TeamId; mini: boolean; walking: boolean; dead: boolean }
export function launchVelocity(angle: number, power: number): Vec2   // power∈[0,1] → speed = power*MAX_LAUNCH_SPEED
export function stepProjectile(p: Projectile, world: SimWorld, dt: number): void // calls world.explode / world.spawn*
export function predictTrajectory(start: Vec2, vel: Vec2, windAccel: number, gravity: number, mask: TerrainMask, maxTime: number): Vec2[] // sample every 1/30 s until hit
// explosion.ts
export interface SimWorld { mask: TerrainMask; roaches: Roach[]; projectiles: Projectile[]; gravity: number; wind: number; hazardY: number; events: GameEvent[]; rng: Rng; nextId(): number; explode(e: ExplosionSpec): void; spawnProjectile(p: Omit<Projectile, 'id'>): void; addCloud(pos: Vec2, team: TeamId): void; addFire(pos: Vec2): void; addMine(pos: Vec2, team: TeamId): void }
export interface ExplosionSpec { pos: Vec2; radius: number; damage: number; ownerTeam: TeamId; knock?: number /* default 1 */ ; carve?: boolean /* default true */ }
export function applyExplosion(w: SimWorld, e: ExplosionSpec): void
// events.ts
export type GameEvent =
  | { type: 'explosion'; pos: Vec2; radius: number }
  | { type: 'carve'; pos: Vec2; radius: number }
  | { type: 'damage'; roachId: number; amount: number; pos: Vec2 }
  | { type: 'heal'; roachId: number; amount: number; pos: Vec2 }
  | { type: 'launch'; weapon: WeaponId; pos: Vec2 }
  | { type: 'bounce'; pos: Vec2 } | { type: 'splash'; pos: Vec2 } | { type: 'death'; roachId: number; pos: Vec2 }
  | { type: 'pickup'; team: TeamId; label: string; pos: Vec2 } | { type: 'turnStart'; team: TeamId } | { type: 'jump'; pos: Vec2 } | { type: 'land'; pos: Vec2 } | { type: 'tick' } | { type: 'gameOver'; winner: TeamId | null }
```
Explosion formula: for roach at distance d from centre (edge distance = d − radius_roach, ≥ 0): if edge < R: `dmg = round(D * (1 - 0.5 * edge / R))`, ×`SELF_DAMAGE_MULT` if `roach.team === ownerTeam`; impulse magnitude `knock * 420 * (1 - edge/R) / mass` along normalized (roach − centre) with −120 extra upward; skip roaches with `invulnTimer > 0`. Carve uses `mask.carveCircle(pos, R)`, emits `carve` + `explosion`. Bazooka explodes on terrain/roach contact; grenade bounces (restitution 0.45, friction 0.8) and explodes on fuse; disco explodes on fuse into 5 minis (vel random angle −150°..−30°, speed 250–400, fuse 1.5 s, 15 dmg r30); duck on landing switches `walking`, moves 80 px/s in initial x-direction following surface (climb ≤ 10px, turns at walls), explodes on roach contact or age ≥ 6; spray on impact `addCloud`; hotsauce on impact explodes 15/35 and `addFire` ×5 spread 60px. Projectiles entering y > hazardY: `splash` event and removed; off-world bounds removed.

- [ ] **Step 1: Failing tests:** `launchVelocity at 45° power 1` (|v| = 900, vx>0, vy<0); `bazooka drifts with wind, grenade does not`; `bazooka explodes on ground contact and carves crater`; `grenade explodes after fuse, not before`; `explosion damage falls off with distance` (centre 40, edge-of-radius ≈ 20); `friendly damage halved`; `heavier roach knocked back less` (chonk vs zippy speed ratio ≈ 0.7/1.6); `disco spawns 5 minis`; `duck walks then explodes after 6 s`; `projectile into hazard splashes and is removed`; `projectile off world is removed`; `predictTrajectory stops at terrain`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit `feat(core): weapons, projectiles, explosions`.

### Task 7: Hazards, specials, crates, rope

**Files:** Create `src/game/core/{hazards,specials,crates,rope}.ts`; Test `tests/core/hazards.test.ts`, `tests/core/specials.test.ts`, `tests/core/crates.test.ts`, `tests/core/rope.test.ts`.

**Interfaces — Produces:**
```ts
export interface Cloud { id: number; pos: Vec2; radius: 70; turnsLeft: number; team: TeamId }
export interface Fire { id: number; pos: Vec2; timeLeft: number }     // 4 s, 6 dmg/s to touching roaches, burns 2px of terrain/s
export interface Mine { id: number; pos: Vec2; team: TeamId; armTimer: number; triggered: number } // arm 1 s; enemy within 40px → 0.5 s beep → 35 dmg r50
export function stepFires(fires: Fire[], w: SimWorld, dt: number): void
export function stepMines(mines: Mine[], w: SimWorld, dt: number): void
export function applyCloudsEndOfTurn(clouds: Cloud[], w: SimWorld): void // 10 dmg each roach inside (full dmg, any team), turnsLeft--, remove at 0
export function applyHazard(w: SimWorld, r: Roach): boolean // if pos.y + radius > hazardY: −30 HP (min 0), splash event, if alive teleport to findSafeSpot + vel 0; returns true if triggered
export function canUseSpecial(r: Roach): boolean // alive && specialCooldown === 0
export function useSpecial(r: Roach, w: SimWorld, turn: TurnFlags): void // sets cooldown = SPECIAL_COOLDOWN
export interface TurnFlags { fullPreview: boolean }
// chonk Belly Slam: vel.y = −250, slamming=true; on next ground contact explode {damage 25, radius 60, ownerTeam, self excluded}
// stilts Periscope: turn.fullPreview = true
// brawler Mega Flick: nearest enemy within 45px edge-to-edge: impulse (facing*520, −380)/mass, 20 dmg; no target → special not consumed
// zippy Scuttle Dash: dashTimer 0.25 s, vel.x = facing*520, invulnTimer 0.4
export function tickCooldowns(team: Roach[]): void // −1 at start of each own team turn, min 0
export type CrateContent = { kind: 'weapon'; weapon: WeaponId; ammo: number } | { kind: 'health'; amount: 35 }
export interface Crate { id: number; pos: Vec2; vel: Vec2; landed: boolean; content: CrateContent }
export function rollCrateContent(rng: Rng): CrateContent        // 25% health, else uniform over pickup weapons with crateAmmo
export function pickCrateX(w: SimWorld, rng: Rng): number        // 60%: within ±200px of a living roach of the team with lowest total HP; else uniform 100..2300
export function stepCrates(crates: Crate[], w: SimWorld, ammo: Record<TeamId, Partial<Record<WeaponId, number>>>, dt: number): void // fall at CRATE_FALL_SPEED, land, collect on roach overlap (+ammo or heal capped at maxHp)
export interface RopeState { anchor: Vec2; length: number }
export function fireRope(from: Vec2, angle: number, mask: TerrainMask): RopeState | null // max 320px
export function stepRope(r: Roach, rope: RopeState, input: MoveInput, w: SimWorld, dt: number): void // pendulum, dir pumps swing, jumpPressed releases (caller clears rope)
// Map twists:
export interface Bubble { id: number; pos: Vec2; vy: -45 }
export function stepBubbles(bubbles: Bubble[], w: SimWorld, rng: Rng, dt: number): void // sink only: spawn 1 every 1.5 s at hazardY, rise; roach overlapping (r=22) gets vel.y = min(vel.y, -140); pop at terrain or y<0
export interface Candle { pos: Vec2; lit: boolean }
export function igniteCandles(candles: Candle[], e: ExplosionSpec, w: SimWorld): void // cake only: lit candle within explosion radius → addFire ×3 around it, candle becomes unlit
```
Candles come from `MapDef.props` entries with `kind: 'candle'` (Task 4 cake must emit 5–7).
- [ ] **Step 1: Failing tests:** `hazard costs 30 and respawns above hazard`; `hazard at low HP kills` (hp 20 → alive false, death event); `cloud damages 3 turns then disappears`; `mine ignores own team and triggers on enemy`; `fire burns touching roach`; `belly slam damages nearby enemy not self`; `mega flick without target keeps special charged`; `dash grants invulnerability`; `cooldown ticks to zero after 3 turns`; `crate collected adds ammo to team pool`; `health crate caps at max HP`; `pickCrateX favours losing team` (1000 rolls, ≥ 55% within ±200px of losing team roach); `rope attaches within 320px and swings`; `bubble lifts roach`; `candle hit by explosion starts fire once`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit `feat(core): hazards, specials, crates, rope`.

### Task 8: Game state machine

**Files:** Create `src/game/core/game.ts`; Test `tests/core/game.test.ts`.

**Interfaces — Consumes:** everything above. **Produces:**
```ts
export type Phase = 'handoff' | 'turn' | 'retreat' | 'settling' | 'gameOver'
export type Command =
  | { type: 'beginTurn' } | { type: 'move'; dir: -1 | 0 | 1 } | { type: 'jump'; pressed: boolean }
  | { type: 'selectWeapon'; weapon: WeaponId } | { type: 'fire'; angle: number; power: number; fuse?: number }
  | { type: 'target'; x: number; y: number } | { type: 'special' } | { type: 'releaseRope' }
export interface TeamSnapshot { id: TeamId; name: string; color: number; hp: number; maxHp: number; alive: number }
export interface HudSnapshot {
  phase: Phase; team: TeamId; activeRoachId: number; activeKind: RoachKind; timeLeft: number; wind: number /* −1..1 */
  weapon: WeaponId; fuse: number; ammo: Partial<Record<WeaponId, number>>; specialReady: boolean; specialCooldown: number
  teams: TeamSnapshot[]; winner: TeamId | null | undefined; suddenDeath: boolean; previewFrac: number
}
export class Game {
  constructor(config: MatchConfig)
  readonly config: MatchConfig; readonly map: MapDef; readonly world: SimWorld & { clouds: Cloud[]; fires: Fire[]; mines: Mine[]; crates: Crate[] }
  update(frameDt: number): void          // clamps to MAX_FRAME_DT, runs fixed TICKs
  command(c: Command): void
  snapshot(): HudSnapshot
  drainEvents(): GameEvent[]
  activeRoach(): Roach | null
  paused: boolean
}
```
Rules: spawn 4 roaches per team (one per kind, names from a fixed silly list per kind e.g. Chonk: 'Big Lou','Meatball','Tubs','Dumpling'), shuffled spawn points; random starting team; phase starts `handoff`. `beginTurn` → `turn`, timer = turnTime, wind = rng.range(−1,1), `tickCooldowns`, emit `turnStart`. Firing an `endsTurn` weapon → `retreat` (RETREAT_TIME, movement only). Timer/retreat expiry or active roach death → `settling`. Settling ends when no projectiles, all roaches grounded or |vel|<5, fires done, or SETTLE_CAP. On settle end: `applyCloudsEndOfTurn`, crate roll (`CRATE_CHANCE`), sudden death rise if elapsed ≥ SUDDEN_DEATH_AT, win check (≤1 team alive → `gameOver`, 0 → winner null), else next team with living roaches, its next living roach in round-robin → `handoff`. Timer counts only in `turn`/`retreat` and only when `!paused`. Hazard checked every tick for all roaches. Start: 3–5 initial weapon crates placed `landed` on surface spots. Fuse default 3. Tick event when timeLeft crosses each of 5,4,3,2,1.

- [ ] **Step 1: Failing tests:** `starts in handoff with 4 roaches per team` (players 3 → 12 roaches); `beginTurn starts timer`; `firing bazooka enters retreat then settling`; `timer expiry without firing ends turn`; `turn order rotates teams and skips dead teams`; `roaches within team rotate`; `ends turn when active roach dies`; `last team standing wins`; `simultaneous wipe is a draw`; `settle phase times out`; `paused game does not tick timer`; `clamps large frame dt` (update(5) advances sim by at most 0.1 s); `cannot fire weapon with zero ammo`; `rope does not end turn`; `special usable once per turn`; `sudden death raises hazard after 720 s`; `deterministic for same seed and commands` (two games, same scripted commands → identical roach positions).
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit `feat(core): game state machine and turn flow`.

### Task 9: Input gestures

**Files:** Create `src/game/input/{gestures,pointerRouter}.ts`; Test `tests/input/gestures.test.ts`.

**Interfaces — Produces:**
```ts
export interface AimResult { angle: number; power: number; cancel: boolean }
export function isInAimZone(pointer: Vec2, roachScreen: Vec2, roachRadiusPx: number): boolean // within max(60, AIM_GRAB_MULT*radius)
export function aimFromDrag(roachScreen: Vec2, pointer: Vec2, roachRadiusPx: number): AimResult // slingshot: angle of (roach − pointer); power = clamp(dist/MAX_DRAG_PX,0,1); cancel when dist < max(24, 1.2*radius)
export function pinchZoom(startDist: number, nowDist: number, startZoom: number): number // clamp 0.35..2.0
export type PointerIntent = { kind: 'aim'; aim: AimResult } | { kind: 'aimRelease'; aim: AimResult } | { kind: 'pan'; dx: number; dy: number } | { kind: 'pinch'; zoom: number; center: Vec2 } | { kind: 'tap'; screen: Vec2 }
export class PointerRouter {
  constructor(el: HTMLElement, opts: { getRoachScreen(): { pos: Vec2; radiusPx: number } | null; canAim(): boolean; getZoom(): number; onIntent(i: PointerIntent): void })
  destroy(): void
}
```
Tap = pointer up within 250 ms and < 10 px movement. Second pointer cancels aim and starts pinch.

- [ ] **Step 1: Failing tests:** `drag left-down aims right-up` (roach (100,100), pointer (40,160) → angle ≈ −π/4, power ≈ 84.85/180); `power clamps at 1`; `drag back onto roach cancels`; `grab zone has 60px minimum`; `pinch zoom clamps`.
- [ ] **Step 2:** FAIL → implement → PASS. PointerRouter verified manually in Task 14.
- [ ] **Step 3:** Commit `feat(input): touch aim, pan and pinch gestures`.

### Task 10: Camera + terrain art + Pixi view skeleton

**Files:** Create `src/game/render/{camera,terrainArt,background,gameView}.ts`; Test `tests/render/camera.test.ts`.

**Interfaces — Produces:**
```ts
export class Camera {
  x: number; y: number; zoom: number; viewW: number; viewH: number
  setViewport(w: number, h: number): void
  follow(target: Vec2, dt: number, sharpness?: number): void   // exponential ease, default 6
  pan(dxScreen: number, dyScreen: number): void
  setZoom(z: number, anchorScreen?: Vec2): void
  shake(intensity: number): void; update(dt: number): Vec2      // returns shake offset, decays 6/s
  clamp(): void                                                 // keep view in [−200, WORLD_W+200]×[−400, WORLD_H]
  worldToScreen(p: Vec2): Vec2; screenToWorld(p: Vec2): Vec2
  minZoomToFit(): number
}
export class TerrainArt {
  constructor(mask: TerrainMask, theme: MapTheme, rng: Rng)  // paints OffscreenCanvas/HTMLCanvasElement WORLD_W×WORLD_H from mask: base color per material, noise speckles, darker inner gradient by depth-from-surface, 4px rim on surface
  readonly canvas: HTMLCanvasElement; readonly texture: Texture
  carve(pos: Vec2, radius: number): void                     // destination-out circle, scorched rim ring (radius+6, theme.rim at 0.6 alpha, source-atop), texture.source.update()
}
export function buildBackground(theme: MapTheme, props: MapProp[], mapId: MapId): Container // sky gradient, parallax silhouettes (layer 0.3/0.6), props drawn with Graphics
export function buildHazard(theme: MapTheme): { view: Container; update(t: number, hazardY: number): void } // animated sine wave surface + DisplacementFilter ripple
export class GameView {
  constructor(game: Game)
  mount(parent: HTMLElement): Promise<void>     // Application.init({ resizeTo: parent, antialias: true, resolution: min(devicePixelRatio, 2), autoDensity: true, background: theme.sky[0] })
  readonly camera: Camera
  setInputEnabled(on: boolean): void
  destroy(): void
}
```
Frame loop (`app.ticker`): `game.update(dt)` → drain events → dispatch to effects/terrainArt/sfx → sync views → camera follow (active projectile > active roach) → apply camera transform to `world` container.

- [ ] **Step 1: Failing tests:** `worldToScreen∘screenToWorld is identity`; `zoom keeps anchor point fixed`; `clamp keeps view inside world bounds`; `follow converges` (after 2 s within 2px); `shake decays to zero`.
- [ ] **Step 2:** FAIL → implement camera → PASS.
- [ ] **Step 3:** Implement TerrainArt, background, hazard, GameView skeleton (terrain + background + hazard only). Verify: `npm run dev`, temporary dev route renders each map (`?map=pizza`), explosion on tap via a debug hook carves visibly and matches mask (roach-less).
- [ ] **Step 4:** Commit `feat(render): camera, terrain art, backgrounds, pixi view`.

### Task 11: Roach visuals

**Files:** Create `src/game/render/roachView.ts`.

**Interfaces — Produces:**
```ts
export class RoachView {
  constructor(kind: RoachKind, teamColor: number, name: string)
  readonly container: Container
  sync(r: Roach, t: number, isActive: boolean, aiming: boolean): void
}
```
Style guide: body = rounded ellipse (chonk 1.5× wide, stilts 0.8× wide with long legs raising body by 14px, brawler with two chunky forearms, zippy 0.7× scale with racing stripe); shell in team color with lighter highlight and darker split line; head round, cream-beige; big white eyes (r ≈ 0.35 head) with black pupils looking toward `facing`/aim, blink every 3–5 s (0.12 s); two antennae as quadratic curves swaying with sin(t); 6 legs animated by walk phase; team-colored bandana knot; accessory per kind (chonk: tiny helmet, stilts: aviator goggles, brawler: headband, zippy: backwards cap). Idle bob ±1.5px; squash 0.85/stretch 1.15 on land/jump; gliding shows two translucent flapping wings; HP tag above (team color pill, white number); active roach: bouncing ▼ arrow. Dead: flip upside down, legs wiggle 0.8 s, then poof (emit via effects in Task 12).

- [ ] **Step 1:** Implement. Verify in dev route: all 4 kinds × 4 colors on a test strip; screenshot via the `run` skill; check they look cute (rounded, big eyes) and distinguishable at zoom 0.5.
- [ ] **Step 2:** Commit `feat(render): cute roach visuals and animation`.

### Task 12: Effects, entity views, aim overlay, audio

**Files:** Create `src/game/render/{effects,entityViews,aimOverlay}.ts`, `src/game/audio/sfx.ts`.

**Interfaces — Produces:**
```ts
export class Effects {
  constructor(stage: Container, fxLayer: Container, camera: Camera, theme: MapTheme)
  explosion(pos: Vec2, radius: number): void  // flash sprite (additive, 0.15 s), fireball ring, 30–60 debris particles in theme.debris with gravity, smoke puffs, camera.shake(radius/12), ShockwaveFilter on world container (0.5 s)
  splash(pos: Vec2): void; dust(pos: Vec2): void; poof(pos: Vec2, color: number): void
  damageNumber(pos: Vec2, amount: number, heal: boolean): void // floating text, rise 40px, fade 1 s
  trail(id: number, pos: Vec2, color: number): void
  update(dt: number): void
}
// pooled particles (max 800) built on Sprite with shared circle texture; AdvancedBloomFilter on fxLayer (threshold 0.4, bloomScale 1.2)
export class EntityViews { constructor(layer: Container); sync(world: Game['world'], t: number): void } // projectile sprites per weapon emoji-like Graphics, crates with parachute, clouds (green translucent puffs), fires (flicker), mines (pink blob blinking), rope line
export class AimOverlay { constructor(layer: Container); show(start: Vec2, vel: Vec2, game: Game, frac: number): void; hide(): void } // dots from predictTrajectory, first frac of points, fading
export const sfx: { boom(size: number): void; pop(): void; splat(): void; jump(): void; squeak(): void; tick(): void; pickup(): void; whoosh(): void; victory(): void; setMuted(m: boolean): void; unlock(): void }
```
Audio: single `AudioContext` lazily created on first user gesture (`unlock`); boom = filtered noise burst + sine drop; muted flag persisted `localStorage['wr.muted']` (try/catch → logger). Haptics helper `vibrate(ms: number)` guarded by `'vibrate' in navigator`.

- [ ] **Step 1:** Implement; wire into GameView event dispatch (`explosion`→effects.explosion+sfx.boom+vibrate(40), `carve`→terrainArt.carve, `damage`→damageNumber+squeak, `death`→poof, `splash`, `pickup`, `turnStart`→vibrate(20), `tick`→sfx.tick).
- [ ] **Step 2:** Verify in dev: explosions show flash, debris, shake, shockwave, bloom; 60 fps on phone-sized viewport in Chrome devtools performance with 10 explosions in 2 s.
- [ ] **Step 3:** Commit `feat(render): explosion effects, entity views, aim preview, sfx`.

### Task 13: Vue UI — menus, HUD, controls

**Files:** Create `src/ui/*.vue`, `src/ui/store.ts`; Modify `src/App.vue`.

**Interfaces — Produces:**
```ts
export type Screen = 'menu' | 'setup' | 'match' | 'victory'
export const store: { screen: Screen; config: MatchConfig; muted: boolean; lastWinner: TeamId | null; go(s: Screen): void; startMatch(c: Omit<MatchConfig, 'seed'>): void }
```
- MainMenu: title "WAR ROACHES" with animated roach (reuse RoachView in a small Pixi canvas or CSS SVG), buttons Play, How to play (3 illustrated cards), Sound toggle.
- MatchSetup: 5 map cards (name, tagline, gradient thumb from theme) horizontally scrollable; players 2/3/4 segmented; turn time 30/45/60 segmented (default 45); big Start.
- GameScreen: mounts `GameView`, `PointerRouter`; polls `game.snapshot()` each animation frame into `shallowRef` only when changed (compare phase/timeLeft int/hp totals/weapon/ammo); routes intents: aim → `AimOverlay.show`, aimRelease → `command fire` (or `target` for shoe after tap), pan/pinch → camera; pauses on `visibilitychange` hidden.
- HudBar (top): team HP bars (color, proportional), timer (pulses red ≤ 5 s), wind arrow (direction + 1–3 chevrons), pause button.
- TouchControls: ◀ ▶ (pointerdown/up → move), ⤴ jump (press/hold), weapon button (emoji + name + ammo), ★ special (shows cooldown); buttons 72px, safe-area padding, semi-transparent, active state scale.
- WeaponPicker: bottom sheet grid 5×2, disabled if ammo 0, ∞ badge for basics; fuse slider 1–5 shown when grenade selected.
- HandoffCard: full-screen team color, "Pass to {Team}!", roach name + kind, "Tap to start".
- PauseMenu: Resume, Sound, Quit to menu (confirm).
- VictoryScreen: winner color confetti (CSS), "{Team} wins!" or "It's a draw!", Rematch (same config new seed), Menu.
- RotatePrompt: shown when `matchMedia('(orientation: portrait)')`; on Start request `document.documentElement.requestFullscreen()` then `screen.orientation.lock('landscape')`, each in try/catch → logger.warn.

- [ ] **Step 1:** Implement components + store + App routing.
- [ ] **Step 2:** Verify with the `run` skill in a 844×390 mobile viewport with touch emulation: full flow menu → setup → handoff → move/jump/glide → aim/fire → explosion → next team → victory; weapon picker disables empty ammo; pause on tab hide.
- [ ] **Step 3:** Commit `feat(ui): menus, hud, touch controls, handoff and victory`.

### Task 14: PWA update flow + final verification

**Files:** Create `src/ui/UpdateToast.vue`; Modify `src/App.vue`, `README.md`.

- [ ] **Step 1:** `UpdateToast` uses `useRegisterSW` from `virtual:pwa-register/vue`; shows "Update available — Reload" only when `store.screen !== 'match'`; Reload → `updateServiceWorker(true)`; `offlineReady` → brief "Ready to play offline" toast. `onRegisterError` → logger.error.
- [ ] **Step 2:** Verify: `npm run build && npm run preview`; in browser: load, go offline (devtools), reload → game still loads and a match is playable; rebuild with a changed string, reload online → toast appears on menu.
- [ ] **Step 3:** Run `npm run typecheck && npm test && nix build` → all succeed; `result/` contains `index.html`, `sw.js`, `manifest.webmanifest`. Update `npmDepsHash` if lockfile changed.
- [ ] **Step 4:** README: how to play, dev (`nix develop --no-pure-eval` / `direnv allow`, `npm run dev`), build (`nix build`), deploy (enable Pages → "GitHub Actions" source in repo settings; push to master or run workflow manually).
- [ ] **Step 5:** Commit `feat(pwa): offline-ready and update prompt; docs`.
