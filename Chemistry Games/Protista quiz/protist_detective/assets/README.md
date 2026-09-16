# Protist Detective — Asset Guide

The game ships fully playable with **built-in vector (SVG) art** and **procedurally generated music** — no external files or internet required. Everything in this folder is optional: drop a file in and the game uses it automatically; remove it and the game falls back gracefully.

All paths are **relative** to `index.html`. Open `index.html` directly (or let the app auto-load it) — no server needed.

---

## Folder layout

```
protist_detective/
  index.html
  assets/
    fonts/        (bundled, offline — do not remove)
    audio/        (optional background music)
    images/
      characters/ (optional specimen art — overrides the built-in SVG)
      background/ (optional paper/backdrop textures)
      ui/
        emoji/    (icon PNGs used in the UI — shipped, replaceable)
```

---

## 1. Specimen art — `assets/images/characters/`

Each quiz question renders a hand-inked SVG specimen. If a PNG with the matching name exists here, it is loaded **instead**; if the file is missing or fails to load, the built-in SVG is shown. So you can restyle any specimen just by dropping in a file.

| Filename | Specimen |
|---|---|
| `diatom.png` | Diatom / chrysophyte (silica shell) |
| `plankton.png` | Floating plankton |
| `filter.png` | Diatomaceous-earth filter |
| `dino.png` | Dinoflagellate |
| `armor.png` | Armoured cellulose-plate cell |
| `redtide.png` | Red tide (Gonyaulax) |
| `euglena.png` | Euglenoid (pellicle) |
| `mixotroph.png` | Euglena mixotroph (sun/predator) |
| `slime.png` | Slime mould / plasmodium |
| `spores.png` | Spore-dispersing fruiting body |
| `amoeba.png` | Amoeboid protozoan (pseudopodia) |
| `tryp.png` | Trypanosoma (flagellate) |
| `param.png` | Paramoecium (ciliate, gullet) |
| `sporozoan.png` | Sporozoan (Plasmodium) |
| `protozoan.png` | Generic protozoan predator |

- **Size:** 512 × 512 px recommended (square).
- **Orientation:** square, subject centred, transparent background (PNG with alpha).
- The image is scaled to fit inside the circular microscope lens.

---

## 2. UI icons — `assets/images/ui/emoji/`

These PNGs replace every icon in the interface (no emoji characters are used anywhere). They ship with the game and can be swapped for your own art. Keep the same filenames.

| Filename | Used for | Size |
|---|---|---|
| `check.png` | Correct-answer stamp | 128 × 128 |
| `cross.png` | Wrong-answer stamp | 128 × 128 |
| `trophy.png` | End-screen medal | 128 × 128 |
| `seal.png` | Score seal / title crest | 128 × 128 |
| `gear.png` | Settings button | 128 × 128 |
| `quill.png` | Begin / How to Play | 128 × 128 |
| `book.png` | Learn More / boot | 128 × 128 |
| `sound_on.png` / `sound_off.png` | Sound-effects toggle | 128 × 128 |
| `music_on.png` / `music_off.png` | Music toggle | 128 × 128 |

- **Size:** 128 × 128 px, square, transparent background.
- The game swaps the `src` between the on/off variants when a toggle changes state.

---

## 3. Background textures — `assets/images/background/` (optional)

Currently the backdrop is drawn with CSS gradients and drifting SVG microbes. This folder is reserved for optional paper/parchment textures if you want to layer real imagery later. Nothing is required here; leave it empty and the CSS backdrop is used.

- Suggested: `parchment.png`, tileable, ~1024 × 1024 px.

---

## 4. Background music — `assets/audio/` (optional)

By default the game synthesises a calm ambient pad live in the browser (Web Audio) — **fully offline, no file needed**.

To use your own track instead, drop in:

| Filename | Notes |
|---|---|
| `bgm.mp3` | Looping background music. If present and playable it **overrides** the procedural pad. If missing, the procedural music is used. |

- Keep it seamless-looping and modest in volume; the game loops it continuously and applies its own gain.

---

## Fonts — `assets/fonts/` (required, bundled)

Local WOFF2 copies of Nunito (used across the whole game — headings, body, and accents). These make the game work offline. **Do not remove them.**
