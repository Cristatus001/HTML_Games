# Vector Analysis Lab

A ten-case field study on **equal vectors**. Drag the amber vector onto the
reference node and the Vector Scanner checks magnitude and direction — the two
things (and the only two things) that decide whether two vectors are equal.

Theme: **Holo Scanner Deck** — the vectors are glowing holograms measured over
the real scene they came from.

## Every case has its own live scene

Each of the ten cases is played over an animated environment drawn on canvas,
so the situation in the text is the situation you are looking at:

| Case | Scene |
|---|---|
| 01 The Rain Drops | two gardens either side of a fence, rain falling, splash rings on the wet lawn |
| 02 The Elevators | a building cross-section, two lift cars rising past numbered floors |
| 03 Parallel Driving | a two-lane road from above, a car in each lane at the same speed |
| 04 Team Lifting | a living room, a sofa held off the floor by two people, bobbing |
| 05 Piano Keys | a keyboard with a low and a high key struck together, sound rings rising |
| 06 Escalators | a shopping centre: one escalator climbing, one descending, treads and handrails really moving |
| 07 Marching Band | a floodlit field, one column marching forward and one marching right |
| 08 The Swimmers | an eight-lane pool with caustics, a swimmer in lane 1 and lane 8 |
| 09 Dog Walking | a park at dusk, a walker and a dog on a leash, fireflies |
| 10 Cars: Speed Check | a night highway under a speed camera, a fast lane and a slow lane |

A scrim and vignette sit between the scene and the scanner overlay so the HUD
and the two vectors always stay readable. Scenes are decoration only — they
never touch gameplay, geometry or hitboxes, and they hold 60 fps.

Any scene's backdrop can be swapped for a photo by dropping a PNG into
`assets/images/scenes/` — the animation keeps running on top of it. See
`assets/images/README.md`.

## Running it

Open `index.html`. That's all — no build step, no server, no install.

It is designed to be dropped into a mobile app WebView that auto-loads
`index.html` from this folder.

## Fully offline

- **No external URLs of any kind.** No CDNs, no web fonts, no analytics, no
  `fetch`/`XHR`. Every reference is a relative path inside this folder.
- Fonts (Orbitron, Rajdhani, Inter) ship as local `.woff2` in `assets/fonts/`.
- Music and sound effects are **synthesised in the browser** with Web Audio, so
  the game needs no audio files at all.
- All icons are real PNGs; there is not a single emoji character in the source.

## Controls

| Input | Action |
|---|---|
| Drag (touch, mouse or pen) | Pick up the amber vector by its round tail node and drop it on the reference node |
| Arrow keys | Nudge the amber vector (hold **Shift** for larger steps) |
| **Enter** / **Space** | Run the scanner when the tails are close; advance after a verdict |
| **Esc** | Close an open panel |

Input is unified through Pointer Events, so touch behaves exactly like mouse.
Pinch-zoom, double-tap zoom, rubber-band scrolling, text selection and the
context menu are all suppressed for WebView use.

## Layout

```
vector_analysis_lab/
├─ index.html            entry point
├─ css/style.css         theme, panels, HUD, modals, responsive rules
├─ js/
│  ├─ assets.js          optional image slots + graceful fallback
│  ├─ audio.js           procedural music + SFX, optional bgm.mp3 override
│  ├─ levels.js          the ten case files (geometry + verdict text)
│  ├─ background.js      ambient parallax deck (own canvas)
│  ├─ scenes.js          the ten animated real-world scenes
│  ├─ game.js            simulation, rendering, input, scanner
│  ├─ ui.js              screens, case select, settings, saved progress
│  └─ main.js            boot sequence + mobile hardening
├─ assets/
│  ├─ fonts/             local woff2
│  ├─ audio/             empty — see assets/audio/README.md
│  └─ images/
│     ├─ ui/emoji/       29 shipped interface icons
│     ├─ icons/          10 shipped case icons
│     ├─ background/     empty optional slots
│     ├─ vectors/        empty optional slots
│     ├─ scenes/         empty optional slots (per-case backdrops)
│     └─ README.md       exact filenames, sizes and orientation
└─ tools/                dependency-free PNG generator (regenerates the icons)
```

## Dropping in your own art

Every visual element can be replaced by a PNG without touching code. Add the
file with the exact name from **`assets/images/README.md`** and it is used on
the next load; delete it and the built-in canvas artwork returns. Missing
optional files are expected — they log one grouped `info` line and nothing else.

Same for music: drop `assets/audio/bgm.mp3` in and it overrides the procedural
pad (see `assets/audio/README.md`).

## Saved progress

Case completions, verdicts, unlock state and the music/SFX preferences are kept
in `localStorage` (`val_progress_v1`, `val_settings_v1`). Cases unlock in order
and any unlocked case can be replayed from **Cases**. If storage is unavailable
or corrupt the game runs normally and simply doesn't persist.

## Regenerating the icons

```bash
node tools/gen_icons.mjs
```

`tools/raster.mjs` is a small software rasterizer and PNG encoder using only
`node:zlib` — no image editor and no network needed.
