# Moss Sporefall — A Bryophyte Journey

An offline, mobile-ready educational game about mosses. You play a moss spore
released from the capsule, drifting down through a damp forest to find ground wet
enough to germinate on. Gather the glowing **Dew Orbs** that carry the fifteen
moss facts, and dodge the ferns, cones and flowers that are **not** mosses.

## Running it

Open `index.html`. That is the whole install.

It runs from `file://` with no server and no network, which is what a mobile app
WebView needs. Nothing is fetched from the internet: fonts, icons, music and all
artwork are either bundled in this folder or generated at runtime.

## Contents

```
moss_sporefall/
  index.html            the only entry point
  css/style.css         all styling
  js/
    data.js             the 15 facts, the impostors, the 3 zones, glossary
    assets.js           optional drop-in image loader (graceful fallback)
    audio.js            Web Audio music + sound effects
    game.js             engine: physics, level generation, all canvas rendering
    ui.js               screens, HUD, saved progress, input
    main.js             boot sequence
  assets/
    fonts/              Fredoka + Nunito, self-hosted woff2
    images/ui/emoji/    27 PNG interface icons (no emoji characters are used)
    images/...          empty folders for optional drop-in art -> see its README
    audio/              empty; optional bgm.mp3 goes here -> see its README
```

## How it plays

Three zones, five facts each.

| Zone | Setting | Facts |
|---|---|---|
| 1. Canopy Drift | Riding the damp air | 1-5 |
| 2. The Damp Rocks | Narrow gaps, dripping stone | 6-10 |
| 3. Peat Bog Deep | Fast, where Sphagnum holds the water | 11-15 |

* **Steer** by dragging anywhere on screen, using the on-screen pads, or the
  arrow keys / `A` and `D`. **Dive** with the dive pad or `Down` / `S`.
  **Pause** with `P` or `Esc`.
* You carry three points of **moisture**. Impostors and rock spurs cost one;
  brushing the canyon walls is free. At zero the spore dries out.
* Stars: one for reaching the ground, two for all five facts, three for all five
  with no moisture lost.
* Stars, best scores, collected facts and the audio settings persist in
  `localStorage` under the key `moss_sporefall_v1`.

Instructions are split deliberately: **How to Play** (main menu) covers only the
objective and controls; **Learn More** (result screen) holds the reference
material — the labelled moss diagram, the life cycle, the glossary, the ecology
notes and all fifteen facts.

## Audio

Background music is synthesised in the browser, so no audio file ships with the
game. Drop `assets/audio/bgm.mp3` in to override it. Music and sound effects have
separate toggles in Settings. See `assets/audio/README.md`.

## Artwork

Every sprite is drawn procedurally on the canvas. To replace any of it with your
own PNGs, drop files at the exact paths listed in `assets/images/README.md` — the
game picks them up on reload and falls back to the vector art for anything
missing. Nothing has to be added for the game to work.

While those optional files are absent, the browser console logs one 404 per
missing file at startup. That is the probe working as designed, not a fault.
