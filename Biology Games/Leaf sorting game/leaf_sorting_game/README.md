# Leaf Sorter — Field Guide to Leaf Morphology

A botany sorting game: a specimen card is mounted on the stand, and you file it
into the **SIMPLE LEAF** or **COMPOUND LEAF** tray. Built from the original
`Game leaf sorting.html` prototype and the accompanying leaf photograph set and
species workbook.

**Fully offline.** No CDN, no web font service, no audio files, no network
request of any kind. Open `index.html` and it runs.

---

## Running it

Point a WebView (or any browser) at `index.html`. Nothing to build, no server
required — every path is relative.

```
leaf_sorting_game/
├── index.html
├── css/style.css
├── js/
│   ├── data.js      species, levels, reference text, vector fallback leaves
│   ├── audio.js     Web Audio music + sound effects
│   ├── fx.js        ambient background canvas + particle bursts
│   └── game.js      screens, levels, saved progress, pointer input
└── assets/
    ├── fonts/       Cinzel, Nunito, EB Garamond (local .woff2)
    ├── images/      see assets/images/README.md
    └── audio/       empty by design — see assets/audio/README.md
```

---

## Gameplay

Identical to the original prototype at its core — present a specimen, file it
into one of two bins, track score against total, and report the correct type in
the feedback line. Everything around it is new packaging.

- **Drag** the card onto a tray and release, or **tap** a tray directly.
- **Keyboard:** `←` / `S` files as simple, `→` / `C` files as compound,
  `Esc` steps back a screen.
- 20 specimens: 10 simple, 10 compound, with scientific names from the source
  workbook.
- 5 levels of increasing length (6 → 20 specimens). Each run draws a balanced
  mix so a level never turns into all-compound.
- Stars per level: **3** at 100 %, **2** from 80 %, **1** from 60 %. One star
  unlocks the next drawer of the cabinet.
- Progress, best accuracy, specimens seen and all three settings persist in
  `localStorage` under `leafSorter.v1` (wrapped in `try/catch`, so private-mode
  WebViews degrade to a single session rather than throwing).

### Where the information lives

The two kinds of help are deliberately kept apart:

- **How to Play** — on the main menu. Controls, objective and scoring only.
- **Learn More** — on the result screen. The botany: what makes a leaf simple
  or compound, the diagnostic tells, pinnate / bipinnate / palmate /
  unifoliate / lobed definitions, the classic lobed-simple-leaf trap, and the
  full 20-species index with scientific names and notes.

---

## Presentation

- **Materials, not flat rectangles.** Trays are waxed wood with engraved brass
  nameplates, the specimen card is mounted herbarium stock with brass corner
  clips, panels are aged parchment on brass-capped scroll rods. All layered
  gradients plus inset/outset shadows — no bitmap textures required.
- **Lit resources.** Score and streak sit in radial-gradient orbs that glow from
  within; stars, pips and particles all carry their own light.
- **Thematic icons.** A laurel-and-medal crest instead of a trophy, a hand lens
  instead of a target, a field journal instead of a book, a glasshouse instead
  of a house, a sprouting shoot instead of a flame. **No emoji characters
  appear anywhere** — every icon is a real PNG in `assets/images/ui/emoji/`
  drawn as an `<img>`, and state changes swap the `src` attribute.
- **Ambient background.** A canvas draws parallax frond silhouettes, canopy
  light shafts, drifting spores and falling leaves, offset by pointer position
  or device tilt. It sits behind the UI with `pointer-events: none` and never
  touches gameplay hit testing.
- **Feedback.** Leaf-and-spark particle bursts, tray glow, card fly-into-tray,
  card shake and a red screen pulse on a miss, streak banners at 3 / 5 / 8 / 12,
  and stars that land one at a time on the result scroll.

## Audio

Procedural by default — an ambient forest pad and synthesised effects, so the
package carries no audio files. Drop in `assets/audio/bgm.mp3` to override the
music; see `assets/audio/README.md`. Music and sound effects have separate
toggles in **Settings** and quick toggles in the game HUD.

## Mobile / WebView

- Unified **Pointer Events** throughout — one code path for touch, stylus,
  mouse and keyboard. Drag listeners bind to `window` rather than relying on
  pointer capture, which is unreliable in some WebViews, so a lost `pointerup`
  can never leave a card stuck to the cursor.
- Pinch-zoom, double-tap zoom, long-press menus, text selection, image drag and
  rubber-band scrolling are all suppressed; only the level grid and the
  scrollable panels scroll.
- `viewport-fit=cover` with `env(safe-area-inset-*)` padding for notched
  screens.
- Layout uses the whole screen at every size: trays flank the stage in
  landscape, sit side by side beneath it in portrait, and shed their hint text
  and tallies on short landscape phones.
- The AudioContext is created and resumed on the first gesture, and the music
  mutes when the WebView is backgrounded.

## A note on the console

On every load the game probes for the 12 optional drop-in files (three
background layers, four UI materials, one character, three music formats, and
`leaves/lemon.png`). When they are absent the browser logs a 404 for each and
the game carries on with its built-in artwork. **Those 404s are expected and
harmless** — they are the fallback mechanism working, not a broken build. Add
the corresponding file and the matching 404 disappears.

No other request is ever made, and nothing required is ever missing.

## Adding artwork later

Every image is optional and every one has a working fallback. Drop a PNG in
with the documented name and it appears on next load; remove it and the
built-in CSS/SVG art returns. Filenames, pixel sizes and orientations are
listed in **`assets/images/README.md`**.

## Fixes to the original prototype

- The source file was a chat transcript: prose and a ```` ```html ```` fence
  wrapped the actual document, so the browser rendered the explanation as page
  text. Now a clean document.
- Replaced HTML5 drag-and-drop (`ondragstart` / `ondrop` / `dataTransfer`),
  which does not work on touch devices at all, with Pointer Events.
- `spawnLeaf()` picked at random with replacement, so the same leaf could
  repeat several times in a row and the run had no end. Levels now draw a
  shuffled, balanced, non-repeating queue.
- The `dragleave` handler cleared the hover state whenever the pointer crossed
  an inner child element, leaving trays stuck in the highlighted state.
- Papaya's scientific name was listed as *Acer* (a maple) in the workbook;
  corrected to *Carica papaya*. Calotropis/Milkweed and Cannabis were given
  full binomials.
- The `.bin` hover class was never removed if a drop landed outside a bin.
- Score and total were unbounded with no completion state; a run now ends,
  scores, and locks out further input.
