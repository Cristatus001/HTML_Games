# Frog Anatomy Dash

A single-screen platformer quiz on the structural organisation of *Rana tigrina*.
Climb the marsh, touch each Knowledge Orb, answer its question, clear the zone.

Built to run **completely offline** inside a mobile app WebView that opens
`index.html` directly — no build step, no network, no CDN, no emoji characters.

## Run it

Open `index.html`. That is all — it works from `file://`, from a WebView, or from
any static host. Scripts are plain classic scripts (no ES modules), so there are
no `file://` CORS problems.

For a quick local server:

```bash
python -m http.server 8731 --directory frog_anatomy_dash
```

## Controls

| Input | Action |
|---|---|
| `ArrowLeft` / `A` | hop left |
| `ArrowRight` / `D` | hop right |
| `Space` / `W` / `ArrowUp` | jump |
| On-screen pads | same, on touch devices (Pointer Events, so mouse/pen/touch share one path) |
| `Esc` / `P` | pause and resume |

Gameplay help lives on the **main menu** (How to Play). Conceptual reference
material — definitions, examples, background — lives behind **Learn More** on the
zone-cleared screen, kept deliberately separate.

## Contents

```
frog_anatomy_dash/
  index.html              all screens and the canvas
  css/style.css           theme: lacquered metal panels, parchment notes, lit orbs
  js/data.js              zones, platforms, orbs, questions, field notes
  js/storage.js           localStorage progress and settings
  js/assets.js            optional image loading with graceful fallback
  js/audio.js             procedural Web Audio music + SFX, optional bgm.mp3
  js/fx.js                particles, rings, pops, screen shake
  js/ambient.js           full-bleed parallax marsh scenery
  js/ui.js                screens, HUD, quiz panel, touch pads
  js/game.js              input, fixed-step physics, rendering, zone flow
  assets/fonts/           Nunito + Oswald woff2, local, with licences
  assets/images/          icons, anatomy art, characters, scenery (see its README)
  assets/audio/           empty by design (see its README)
  tools/make_icons.mjs    build-time SVG -> PNG generator
```

## Zones and progress

Three zones of ten orbs each. Zone 1 carries the original ten questions
unchanged; zones 2 and 3 extend into organ systems and higher-order reasoning.
Clearing a zone unlocks the next. Each run is scored in lotus seals — three for
a flawless climb, two for up to two orbs answered wrongly, one otherwise — and
the best result plus the fastest time is saved per zone.

Progress and settings live in `localStorage` under `frog_anatomy_dash.save.v1`
and can be wiped from Settings -> Reset Progress. If storage is unavailable the
game still runs, it just forgets between sessions.

## Offline and asset behaviour

* No external URLs anywhere: fonts, art and audio are local or generated.
* Images are optional. Anything missing falls back to vector/canvas art — see
  `assets/images/README.md` for exact filenames, sizes and orientation.
* The console logs a handful of 404s at boot. Those are the deliberate
  drop-in slots that ship empty (`background/sky.png`, `hills.png`,
  `canopy.png`, `water.png`, `platform-tile.png`, `audio/bgm.mp3`). They are
  probes, not breakage.

## Regenerating the icon set

The PNGs under `assets/images/` are generated from SVG, so there is one source of
truth for the art. `sharp` is a build-time dependency only and is not shipped:

```bash
cd tools && npm install sharp && node make_icons.mjs ../assets/images
```

## Physics note

The platforming constants are the original ones — gravity `0.6`, friction `0.85`,
jump `-14`, speed `6.5`, a 40 x 40 hitbox — and physics runs on a fixed 60 Hz
step, so movement feels identical on 60 Hz and 120 Hz displays. Bugs fixed along
the way: the player no longer spawns inside an orb, fast falls can no longer
tunnel through thin ledges, jumping requires ground contact (with a short coyote
grace), only one quiz can open per step, and restarting no longer reloads the
page.
