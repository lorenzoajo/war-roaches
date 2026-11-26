# War Roaches — Design

## Intent
A hot-seat (pass-the-device) turn-based artillery game in the spirit of Worms 2, for 2–4 players on one phone (tablet secondary). Cartoon roaches with weapons and per-type special abilities fight on absurd, fully destructible maps. It must be **fun and forgiving**, look good (juicy effects), play well on touch, and work offline as an installable PWA that self-updates when online.

Audience: mixed (kids + adults). English only. Target devices: flagship phones (landscape), tablets supported.

## Goals
- 2–4 teams, alternating turns, on one device.
- 5 absurd maps with destructible terrain (explosions carve craters; overhangs/floating chunks stay, Worms-2 style).
- 4 roach archetypes per team with distinct stats and a special ability.
- Weapons: always-available basics + pickups found on map / dropped in crates.
- Per-turn time limit.
- Touch-first controls; phone landscape layout.
- PWA: fully offline after first load; prompts to update when a new version is available.
- Polished effects: particles, screen shake, glow, shockwave, liquid ripple, trails.

## Non-goals
- Online/networked multiplayer, AI/bot opponents, accounts, persistence beyond settings.
- Map editor, custom team naming beyond defaults (nice-to-have, not v1).
- Localization (English only).
- Bitmap art assets/music files: all art is procedural (code-drawn), SFX synthesized.

## Anti-goals (failure even if it works)
- Feels punishing: instant deaths, fiddly aiming, tiny tap targets.
- Gross/ugly roaches. They must be cute, chubby, big-eyed.
- Requires network after first load.
- Recreating Worms' actual weapons/characters/look (sheep, banana bomb, holy hand grenade, etc.). Mechanics genre only.

## Constraints
- Vue 3 + TypeScript (strict, no `any`), Vite.
- Nix flake: `devenv` dev shell + `nix build` producing the static `dist/`.
- PixiJS v8 for rendering.
- Landscape orientation; safe-area insets respected.

## Approaches considered
| Option | Trade-off | Decision |
|---|---|---|
| A. Custom Canvas2D engine, Vue HUD | Tiny bundle, full control; weaker effects | Rejected: user wants nice effects |
| B. Phaser 3 | Batteries included but its physics doesn't do destructible bitmap terrain; competes with Vue for screen/input | Rejected |
| **C. PixiJS v8 renderer + custom simulation, Vue for menus/HUD** | ~450 KB; GPU effects (filters, particles); we own physics/terrain | **Chosen** (user, for effects; perf irrelevant on flagships) |

## Architecture
Strict layering, simulation independent of rendering:

```
src/
  game/core/      pure TS simulation: terrain mask, physics, entities, weapons, turns, RNG (seeded)
  game/render/    PixiJS: terrain sprite/RenderTexture, roach drawing, particles, filters, camera
  game/input/     touch gestures -> game commands (move, jump, aim, fire, pinch/pan)
  game/audio/     WebAudio synthesized SFX
  game/maps/      map definitions (procedural terrain generators + theme + twist)
  ui/             Vue: main menu, setup, HUD, turn-handoff card, weapon picker, pause, victory
  pwa/            update prompt wiring
```
- Simulation runs a fixed timestep (60 Hz); renderer interpolates. Core has no DOM/Pixi imports → unit-testable (Vitest).
- Vue ↔ game via a small typed event bus / Pinia-free reactive store (game state snapshot for HUD, commands down).
- Logging: a small `logger` module; all caught errors go through it (no silent failures).

### Destructible terrain
- Authoritative **collision mask**: `Uint8Array` at world resolution (e.g. 2400×1200 world px, 1 byte/px).
- Explosion = erase circle from mask + same circle erased from a Pixi `RenderTexture` holding the terrain art (erase blend), then a scorched rim stroke drawn at the crater edge.
- Unsupported chunks remain floating (no terrain gravity), as in Worms 2.
- Terrain art generated per map at load: fill shape from generator, apply themed texture/patterns, outline. Some maps include indestructible pieces (mask value 2) where noted.

### Physics
- Roaches: AABB-ish capsule against mask; walk follows slopes up to a max step height; slides on steep slopes.
- Projectiles: point/circle vs mask, gravity, wind (wind-affected weapons only), bounciness per weapon.
- Explosions: radial damage + knockback falling off with distance; knockback scaled by roach mass.
- **No fall damage** (roaches have wings). Holding Jump in air = glide (slow descent, small horizontal control).
- Hazard (bottom liquid/void): touching it → −30 HP, roach is "spat back" to a random safe surface spot. Dies only if HP reaches 0.

## Gameplay
### Setup flow
Main menu → choose map (5 cards with preview) → choose players 2/3/4 → turn time 30/45/60 (default 45) → Start.
Teams: Red, Blue, Green, Yellow; each 4 roaches, one of each archetype, spawned randomly on surface spots with minimum spacing (and not adjacent to enemies). Starting team random; order rotates; within a team roaches cycle in order (skipping dead ones).

### Turn
1. Handoff card: "Pass to 🟦 Blue!" full-screen, tap to begin (hides board).
2. Camera pans to active roach; timer starts.
3. Player may move/jump/glide, pick weapon, use special (once if charged; doesn't end turn), aim and fire.
4. Firing a weapon ends the attack phase → 3 s retreat time (movement only).
5. Wait for everything to settle (projectiles, explosions, falling roaches) → apply hazard/deaths → crate drop chance → next team.
- Timer 0 without firing: turn ends.
- Wind changes each turn, mild range.

### Win / sudden death
Last team with living roaches wins (draw if simultaneous). After 12 min total, **Sudden Spray**: hazard level rises a bit each turn.

### Forgiving rules
- Hazard bounce-back instead of instant death; no fall damage; glide.
- Large aim grab zone; trajectory preview dots for the first ~40% of arc (Stilts' Periscope: full arc for one shot).
- Comeback crates: crate drop location weighted toward the team with lowest total HP.
- Gentle wind; generous explosion knockback but low self-damage (self-damage ×0.5).

### Roach archetypes
| Type | HP | Move | Jump | Mass | Trait | Special (cooldown: 3 own turns) |
|---|---|---|---|---|---|---|
| Chonk (fat) | 150 | slow | low | heavy (less knockback) | — | **Belly Slam**: leap + ground pound, 25 dmg radius 60, carves terrain |
| Stilts (tall) | 90 | normal | very high | light | longer aim preview | **Periscope**: full trajectory preview for this turn |
| Brawler (strong) | 110 | normal | normal | normal | melee ×2 | **Mega Flick**: adjacent enemy launched far, 20 dmg |
| Zippy (small) | 80 | fast | normal + double jump | light | small hitbox | **Scuttle Dash**: quick dash, invulnerable during dash |
Visuals: chubby rounded bodies, big googly eyes, wobbly antennae, team-colored shell + bandana + HP tag; per-type silhouette (wide/tall/muscular arms/small) and accessory (helmet/goggles/headband/cap). Idle bob, blink, antenna sway, squash & stretch on jump/land, flipped-on-back legs-wiggling KO then poof.

### Weapons
Always available (∞):
- **Spitball Bazooka**: wind-affected, explodes on impact, 40 dmg.
- **Crumb Grenade**: bouncy, fuse 1–5 s (slider while aiming), 40 dmg.
- **Slipper Smack**: melee, 20 dmg (40 Brawler), strong knockback.

Pickups (limited ammo, from map pickups + crates):
- **Bug Spray Cloud**: lingering cloud, 10 dmg/turn for 3 turns to roaches inside.
- **Big Shoe Stomp**: tap a target; giant shoe drops, large crater, 50 dmg.
- **Disco Bomb**: explodes into 5 bouncing mini-bombs.
- **Gum Mine**: placed; triggers when an enemy is near.
- **Hot Sauce Bottle**: shatters into fire patches burning a few seconds.
- **Rubber Duck Torpedo**: waddles along the ground, explodes on contact or after 6 s.
- **Toothpick Rope**: grapple to terrain, swing; doesn't end turn.
- **Pizza Slice**: +35 HP (consumed on pickup by touching).
Pickups: 3–5 placed on map at start; crate drops between turns (~50% chance), parachute-falling.

### Maps (each 2400×1200 world, theme + twist)
1. **Sink Abyss**: dirty-dish islands over soapy water; rising bubbles carry roaches upward. Hazard: soap water.
2. **Pizza Planet**: giant pizza landscape, pepperoni platforms; sticky cheese surfaces (no sliding, higher friction). Hazard: oven glow.
3. **Grandma's Sofa**: cushions, coins, TV remote; bouncy cushion zones (jump boost). Hazard: dust-bunny pit.
4. **Moon Cheese**: low gravity (×0.45), holes everywhere. Hazard: space void (same bounce-back rule).
5. **Birthday Cake Volcano**: cake layers, slippery frosting, lit candles that set fire when hit. Hazard: lava-jam.
Terrain shapes procedural per map with a fixed design per map plus seeded variation each match.

## Controls (touch, landscape)
```
┌────────────────────────────────────────────────────────────┐
│ 🟥 ████ 🟦 ███ 🟩 ██   ⏱ 38   💨 ◀◀            [⏸]        │
│                                                            │
│                    🪳 ← drag back from roach, release      │
│                                                            │
│ [◀] [▶]                                   [🎒 Crumb Gren.] │
│   [⤴ Jump]                                [★ Special 2/3]  │
└────────────────────────────────────────────────────────────┘
```
- Left thumb: ◀ ▶ hold to walk, ⤴ jump (hold in air = glide). Buttons ≥64 px.
- Right: weapon picker (bottom sheet grid), ★ special.
- Aim: drag starting within ~3× roach radius; direction=angle, length=power; release fires; drag back into roach cancels. Fuse slider shown for timed weapons. Targeted weapons (Shoe): tap map.
- Camera: one-finger drag (outside aim zone) pans, pinch zooms; follows projectiles; snaps back to active roach.
- Haptics via `navigator.vibrate` where supported. Fullscreen + orientation lock on start when available; rotate-device prompt in portrait.

## Effects
Particle bursts (themed debris + splats), screen shake scaled by blast, flash + glow (bloom-like), shockwave displacement on explosions, liquid ripple/wave on hazard, projectile trails, dust puffs on landing, crate parachutes, floating damage numbers, smooth camera easing.

## Audio
WebAudio synthesized SFX (boom, pop, splat, jump, squeak, tick for last 5 s, victory jingle). Mute toggle saved to localStorage.

## PWA / offline
- `vite-plugin-pwa` (Workbox), precache all build assets; `registerType: 'prompt'`.
- When a new SW is waiting: non-blocking "Update available — Reload" toast, shown only on menus (never mid-match).
- Manifest: name "War Roaches", landscape, standalone, generated icons.

## Nix
- `flake.nix`: `devShells` via devenv (Node 22, npm), `packages.default` via `buildNpmPackage` producing static `dist/`.
- Also `devenv.nix`/`devenv.yaml` compatible usage via flake integration.

## Deploy
- GitHub Actions workflow deploying `dist/` to GitHub Pages on push to `master` and via manual `workflow_dispatch`.
- CI runs typecheck + unit tests before build; deploy only on success.
- Vite `base` = `/war-roaches/` (project page); PWA manifest `scope`/`start_url` and SW scope match that base.
- Default branch: `master`.

## Testing
- Vitest unit tests for core: terrain carving, collision, projectile integration, damage/knockback, turn manager, hazard bounce-back, win detection, spawn spacing.
- Manual play-test on device for feel.

## Calls made during review (author's defaults)
- **Ammo** is a shared team pool (not per roach); survives roach deaths.
- **Friendly fire** is on; damage to any roach of the firing team is ×0.5.
- **Dev shell** defined once in `devenv.nix`, exposed through `flake.nix` (`nix develop`); no separate `devenv.yaml` workflow required.
- **Materials**: the terrain mask stores material IDs (0 air, 1 normal, 2 indestructible, 3 sticky, 4 slippery, 5 bouncy). Per map: Sink Abyss has indestructible faucet base; Pizza Planet sticky cheese; Grandma's Sofa bouncy cushions + indestructible sofa frame; Moon Cheese all normal; Cake Volcano slippery frosting + indestructible cake plate.

## Left to the builder
Exact tuning numbers (beyond those above), terrain generator details per map, particle/filter parameters, art details within the style guide, file-level structure inside the layers.
