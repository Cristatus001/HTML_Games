# Image Assets — Worm Guardian

Every image in this folder tree is **optional**. The game ships with complete
built-in vector/canvas art and will run perfectly with all of these files
missing. Drop a file in with the exact name below and the game picks it up on
the next reload; delete it and the game falls back to the built-in art. No code
changes are ever required.

Nothing here is loaded from the internet — all paths are relative.

---

## How the fallback works

At boot the game attempts to load each optional file. A file that is missing,
unreadable or zero-byte simply fails silently and the built-in art is used for
that element. One broken file never affects any other element.

---

## `characters/` — the worm and the three obstacles

| File | Size (px) | Orientation / notes |
|---|---|---|
| `worm.png` | 128 × 128 | Square, transparent. **The worm's head only** — the body is always drawn procedurally, because it lengthens every time the worm eats. Drawn **rotated to face the direction of travel**, so author it pointing **right (→, 0°)**, centred on the canvas centre. Rendered at 46 px on the field. |
| `ladybug.png` | 128 × 128 | Square, transparent. **Top-down view, head pointing up (↑).** Rotated in game to face its direction of travel. Rendered at 48 px. |
| `ant.png` | 128 × 128 | Square, transparent. **Top-down view, head pointing up (↑).** Rotated to face travel. Rendered at 48 px. |
| `spider.png` | 128 × 128 | Square, transparent. **Top-down view, head pointing up (↑).** Rotated to face travel. Rendered at 48 px. |

Leave ~8 % padding inside the canvas so the built-in glow and contact shadow,
which are drawn underneath, are not clipped.

## `items/` — the collectible

| File | Size (px) | Orientation / notes |
|---|---|---|
| `spore.png` | 128 × 128 | Square, transparent, **radially symmetric** (it bobs but never rotates). Rendered at 36 px. A warm gold glow is drawn behind it automatically. |

## `background/` — the play-field backdrop

All background images are stretched to the field's fixed logical resolution of
**800 × 500 (16:10 landscape)**. Author them at 1600 × 1000 for crisp results on
high-DPI screens.

| File | Size (px) | Orientation / notes |
|---|---|---|
| `forest_floor.png` | 1600 × 1000 | **Landscape 16:10, opaque.** Replaces the whole procedural soil base. Keep the centre calm — that is where the worm spawns and the action happens. |
| `canopy_far.png` | 1600 × 1000 | **Landscape 16:10, transparent.** Far parallax layer, drawn at 55 % opacity and panned ±12 px. |
| `foliage_near.png` | 1600 × 1000 | **Landscape 16:10, transparent.** Near parallax layer, drawn at 80 % opacity and panned ±20 px. Keep the middle of the frame clear so it does not hide the worm. |
| `overlay.png` | 1600 × 1000 | **Landscape 16:10, transparent.** Full-field top layer for vignette, dust, scratches or fog. Drawn at 85 % opacity above everything except the particles. |

These are decorative only. Adding them never changes hitboxes, spawn positions
or any gameplay value.

## `ui/` — reserved

Empty and reserved for future UI skinning. The interface currently gets its
depth from CSS (layered gradients, inset/outset shadows) rather than bitmaps.

## `ui/emoji/` — icon set (**required — already generated**)

These are the real PNG icons that replace every emoji character in the original
build. They are referenced directly as `<img>` tags in the interface and as
`src` swaps for state changes (mute/unmute, locked/unlocked). **All 27 files are
already present.** Replace any of them with your own art at the same size and
the interface picks it up immediately — but do not delete them, as these are
referenced directly rather than through the optional-fallback system.

All are **128 × 128 px, square, transparent PNG**.

| File | Replaces / used for |
|---|---|
| `worm.png` | The worm — boot crest and menu crest |
| `spore.png` | The brown sporophyte ball — fact card seal, tallies, stage list |
| `ladybug.png` | The ladybug obstacle — How to Play, stage list |
| `ant.png` | The ant obstacle |
| `spider.png` | The spider obstacle |
| `leaf.png` | The leaf/herb symbol |
| `capsule.png` | Sporophyte capsule on its seta — How to Play objective |
| `gemma.png` | Gemma cup — the Settings button (themed in place of a gear) |
| `celebrate.png` | Spore burst — stage-complete banner |
| `trophy.png` | Guardian crest — final victory banner |
| `life.png` | A heart made of two thallus lobes — lives |
| `score.png` | Cluster of lit spores — score |
| `level.png` | Stacked thallus lobes — stage number |
| `droplet.png` | Water droplet — the moisture theme in Learn More |
| `complete.png` | Stage cleared |
| `lock.png` | Stage locked |
| `play.png` | Start / continue / resume |
| `back.png` | Back / quit |
| `close.png` | Close / destructive action |
| `dash.png` | The dash ability and the on-screen dash button |
| `hurt.png` | Impact burst — the "you hit an insect" toast and Game Over |
| `help.png` | How to Play |
| `learn.png` | Field guide — the Learn More button |
| `sound-on.png` / `sound-off.png` | Sound-effects toggle (swapped via `src`) |
| `music-on.png` / `music-off.png` | Music toggle (swapped via `src`) |

---

## Audio (for completeness)

`assets/audio/bgm.mp3` is also optional. If present it replaces the procedural
Web Audio soundtrack; if absent (the default) the game synthesises its ambient
music in-browser with zero files.
