# Kolar Deep Dive — Art Drop-In Guide

The game ships with a full set of procedurally-generated placeholder art already
in place (probe, rocks, magma, background layers, logo, UI icons, achievement
badges), plus the original vector/canvas art as a permanent fallback. Everything
below is **optional to replace** — drop a matching file into the listed folder
and the game will automatically use it on the next reload. Wrong size/missing
file? The game detects the load failure and silently falls back — nothing breaks.

All paths are relative to this folder (`kolar_deep_dive/assets/images/...`).

## assets/images/characters/
| File | Size | Format | Orientation / Notes |
|---|---|---|---|
| `probe.png` | 160×256 px (5:8 ratio) | PNG, transparent background | Probe nose pointing **up**. Rendered at 40×64px in-game, centered on its origin. |

## assets/images/obstacles/
| File | Size | Format | Orientation / Notes |
|---|---|---|---|
| `rock.png` | 256×256 px (square) | PNG, transparent background | Debris chunk, roughly centered, readable at small sizes (rendered 40–80px). Rotates in-game so keep it reasonably symmetric. |
| `magma.png` | 256×256 px (square) | PNG, transparent background | Molten blob, centered. Game already adds a red glow behind it — keep the art itself fairly bright/saturated. |

## assets/images/background/
Full-bleed layer art, one per depth band. Each is stretched to the full canvas and
alpha-blended (~60%) over the game's procedural color gradient, so a semi-transparent
or dark PNG/JPG blends best.

| File | Size | Format | Orientation / Notes | Depth range |
|---|---|---|---|---|
| `crust.png` | 1920×1080 px (16:9) | PNG or JPG | Landscape, rocky/surface tones | 0–35 km |
| `mantle.png` | 1920×1080 px (16:9) | PNG or JPG | Landscape, deep orange/red rock | 35–2900 km |
| `outer_core.png` | 1920×1080 px (16:9) | PNG or JPG | Landscape, molten/liquid metal look | 2900–5100 km |
| `inner_core.png` | 1920×1080 px (16:9) | PNG or JPG | Landscape, white-hot/dense metal | 5100–6400 km |

## assets/images/ui/
| File | Size | Format | Orientation / Notes |
|---|---|---|---|
| `logo.png` | 1200×400 px (3:1) | PNG, transparent background | Mission logo shown above the title on the main menu. If missing, the text title is shown alone. |

## assets/images/ui/icons/
Control icons layered as backgrounds behind the existing text/emoji glyph (the
glyph stays as the fallback if an icon is missing).

| File | Size | Format | Used on |
|---|---|---|---|
| `left.png` | 128×128 px, transparent | On-screen left button (fallback: ◀) |
| `right.png` | 128×128 px, transparent | On-screen right button (fallback: ▶) |
| `thrust.png` | 128×128 px, transparent | On-screen thrust button (fallback: ▼ THRUST) |
| `pause.png` | 128×128 px, transparent | HUD pause button while playing (fallback: ⏸) |
| `play.png` | 128×128 px, transparent | HUD pause button while paused (fallback: ▶) |
| `sound_on.png` | 128×128 px, transparent | Menu sound toggle when sound is on |
| `sound_off.png` | 128×128 px, transparent | Menu sound toggle when sound is off |

## assets/images/ui/badges/
Achievement medals shown in the Mission Log. Locked badges are shown desaturated;
unlocked ones get a full-color glowing ring. If an image is missing, an emoji
fallback (🪂🪨🌋⚪🏆) is shown instead. Achievements unlock automatically based on
progress already tracked by the game (no extra setup needed) and pop a toast
notification the moment they're earned.

| File | Size | Format | Achievement |
|---|---|---|---|
| `first_drop.png` | 200×200 px, transparent | Complete your first mission |
| `mantle_breach.png` | 200×200 px, transparent | Reach the Mantle (35 km) |
| `outer_core.png` | 200×200 px, transparent | Reach the Outer Core (2,900 km) |
| `inner_core.png` | 200×200 px, transparent | Reach the Inner Core (5,100 km) |
| `core_master.png` | 200×200 px, transparent | Reach the center of the Earth |

## How the fallback works
Every image above is loaded with a success/failure callback. On failure (file
missing, wrong path, corrupt file) the game simply keeps its existing vector/canvas
drawing for that element — there is no crash, console error spam, or broken-image
icon. You can add art incrementally, one file at a time.

## Packaging notes
- This whole `kolar_deep_dive/` folder is self-contained: `index.html`, `js/`,
  `fonts/`, and `assets/` all use **relative paths only** — no internet connection
  is required.
- To ship: copy the entire `kolar_deep_dive/` folder as-is. The mobile WebView
  should point at `kolar_deep_dive/index.html`.
