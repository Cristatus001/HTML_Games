# Arthropoda HOTS Challenge -- A Naturalist's Field Journal

A single-player biology quiz game (Higher Order Thinking Skills questions on
Phylum Arthropoda). Guide your specimen across the field-journal page and
land it on the answer tag that correctly completes each question before the
hourglass runs out. Wrong answer or timeout means retry.

Runs 100% offline -- open `index.html` directly, or point a mobile WebView
at it. No external network requests, no CDN dependencies.

## Folder structure

```
arthropoda_hots_challenge/
  index.html
  css/style.css
  js/game.js
  assets/
    fonts/            IM Fell English, Caveat, Special Elite (self-hosted, offline)
    audio/             (optional) drop-in background music, see below
    images/
      characters/      (optional) player sprite artwork, see below
      background/       (optional) page/backdrop artwork, see below
      ui/emoji/          UI icon set (trophy, stamps, hourglass, speaker, etc.) -- already included
      specimens/         reference photos used in the "Learn More" gallery -- already included
  README.md
```

## Dropping in your own art (optional -- everything already has a working fallback)

Every slot below is optional. If the file is missing, or fails to load, the
game automatically falls back to its built-in vector/CSS artwork -- nothing
breaks.

| Slot | Expected file | Recommended size | Orientation / notes |
|---|---|---|---|
| Player creature | `assets/images/characters/player.png` | 256x192 px | Transparent PNG, creature facing right, roughly 4:3 aspect. Falls back to a hand-drawn SVG beetle. |
| Gameplay backdrop | `assets/images/background/parchment_bg.jpg` | 1920x1080 px | Landscape JPG, seamless/edge-safe (it is cropped with `object-fit: cover`). Falls back to a CSS parchment-paper gradient. |
| Background music | `assets/audio/bgm.mp3` | Any length, ideally 60-180s, seamless loop point | MP3. Overrides the built-in procedural Web Audio ambient pad if present and playable. |

The following folders are already populated and do not need anything added,
but can be replaced (keep the same filenames) if you want different art:

- `assets/images/ui/emoji/*.png` -- hand-generated UI icons (no emoji characters are used anywhere in the game).
- `assets/images/specimens/*` -- the reference photographs shown in the end-screen "Learn More" gallery.

## Controls

- **Desktop:** Arrow keys or WASD to move.
- **Mouse / touch:** Click-and-drag or finger-drag anywhere in the play area to steer.

## Settings

Music and sound-effect toggles, plus a "reset saved progress" control, are
available from the gear icon on the main menu or in-game. Settings and your
best score / in-progress checkpoint are saved to `localStorage` on-device --
no account or network connection involved.

## Notes on the reference photographs

`assets/images/specimens/crab_statocyst.jpg` and
`assets/images/specimens/snail_mollusca.jpg` carry visible stock-photo
watermarks in the source images (Science Photo Library and Warren
Photographic respectively). They are included as-is at the requester's
direction for this classroom project; swap them out if you need clean,
separately-licensed images for wider distribution.
