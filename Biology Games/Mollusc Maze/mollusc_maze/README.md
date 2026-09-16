# Mollusc Maze — The Spiral of Nacre

A fully offline, single-page HTML5 game. Open `index.html` directly (or serve
the folder with any static server) — no build step, no network requests, no
external URLs of any kind.

**Theme:** mother-of-pearl. Nacre plates lit against the deep violet interior
of an abalone shell. The snail crawls a spiral shell corridor inward through
four specimen chambers to reach the pearl at its heart, collecting pearls as
currency along the way.

## Folder layout

```
mollusc_maze/
  index.html
  css/style.css
  js/particles.js    ambient drift: pearl motes, iridescent bubbles, nacre flecks
  js/audio.js        procedural music (shimmering pad + glass bells) and SFX
  js/game.js         spiral geometry, snail movement, riddle logic, pearls, saves
  assets/fonts/      Cinzel + Quicksand (local, offline)
  assets/images/
    characters/      the four chamber medallions (generated from your photos)
    background/      optional drop-in full-screen backdrop
    ui/emoji/        generated PNG icons — no emoji characters anywhere
    reference/        full specimen photos for the "Learn More" panel
  assets/audio/       optional bgm.mp3 drop-in
```

## Your photos

The four photos from the parent folder are used in **two** places:

| Your file            | Becomes                                  | Used as |
|----------------------|------------------------------------------|---------|
| `snail.jpg`          | `characters/pila.png` + `reference/pila_snail.jpg`     | Chamber I medallion, field note |
| `Snail radula.JPG`   | `characters/radula.png` + `reference/radula_closeup.jpg` | Chamber II medallion, field note |
| `Visceral Hump.JPG`  | `characters/hump.png` + `reference/visceral_hump.jpg`  | Chamber III medallion, field note |
| `octopus.jpg`        | `characters/octopus.png` + `reference/octopus.jpg`     | Chamber IV medallion, field note |

The `characters/*.png` versions are square, 420×420, centre-cropped with a
soft circular alpha edge so they sit inside the round porthole medallions.

## Replacing art (all optional — everything already has a fallback)

Nothing below is required. If a file is missing the game silently keeps its
built-in vector art or procedural audio, so you can drop art in later without
breaking anything.

### assets/images/characters/
Square PNG with transparency, **420×420** recommended, subject centred (it is
displayed inside a circle and centre-cropped). Filenames: `pila.png`,
`radula.png`, `hump.png`, `octopus.png`. If one is missing, that chamber falls
back to an inline SVG glyph automatically.

### assets/images/background/
| Filename       | Purpose | Size |
|----------------|---------|------|
| `backdrop.jpg` | Full-bleed image layered behind the animated particles at 40% opacity. Absent by default — the procedural gradient, spiral watermark and canvas render fine on their own. | 1920×1080, landscape |

### assets/audio/
| Filename  | Purpose |
|-----------|---------|
| `bgm.mp3` | Looping background music. If present it **replaces** the built-in generative pad. Any length; looped automatically. |

### assets/images/reference/
Landscape JPGs (~800×600 or larger) shown in the end-screen "Learn More"
panel: `pila_snail.jpg`, `radula_closeup.jpg`, `visceral_hump.jpg`,
`octopus.jpg`. Replace with same-named files to swap them.

### assets/images/ui/emoji/
20 generated 128×128 PNG icons, used everywhere an emoji would otherwise
appear. Replace any file (keep the filename) to re-skin that icon.

`icon_pearl` (currency) · `icon_snail` (the travelling token) ·
`icon_shell` (nautilus logo) · `icon_hint` (bioluminescent lure) ·
`icon_correct` · `icon_incorrect` (cracked shell) · `icon_trophy` (oyster
and pearl) · `icon_star_filled` / `icon_star_outline` (scallop shells) ·
`icon_sound_on` / `icon_sound_off` · `icon_music_on` / `icon_music_off` ·
`icon_settings` · `icon_help` · `icon_book` · `icon_play` · `icon_home`
(compass rose) · `icon_replay` · `icon_close`

## Gameplay

Four riddles about mollusc anatomy. The questions, the accepted answers
(`foot`, `radula`, `calcareous`, `mantle cavity`) and the hints are unchanged
from the original file.

**Pearls:** 3 for a clean first answer, 2 after a wrong guess, 1 if a Lure
(hint) was used — 12 maximum. Pearls set the star rating (11+ = 3 stars,
7+ = 2, else 1). Wrong answers never end a run.

**Saved to `localStorage`** under `mollusc_maze_save_v1`: best time, best
pearl haul, best stars, completed runs, and the music/SFX preferences.
"Reset Saved Progress" in Settings clears the scores but keeps your audio
preferences.

## Accessibility / platform notes

- Unified Pointer Events — touch, mouse and pen take one code path.
- Pinch-zoom, text selection, overscroll and double-tap zoom are disabled for
  WebView use; the answer field still allows text selection.
- Responsive from desktop (maze and plate side by side) down to small phones
  (stacked, chamber labels hidden).
- Honours `prefers-reduced-motion`: ambient animation stops and particle
  counts drop.
