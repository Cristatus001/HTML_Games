# Arthropoda Treasure Quest — Asset Guide

The game ships fully playable with **real specimen photos already in place**,
**generated placeholder art for every chest/icon**, and **procedurally
generated music** — no external files or internet connection required.
Everything below is optional to replace: drop a matching file into the listed
folder and the game uses it automatically on the next reload. If a file is
missing, wrongly named, or fails to load, the game silently falls back to its
built-in vector (SVG) art — nothing breaks.

All paths are **relative** to `index.html`. Open `index.html` directly (or let
the host app auto-load it) — no server needed.

---

## Folder layout

```
arthropoda_treasure_quest/
  index.html
  js/
    game.js
  fonts/        (bundled, offline — do not remove)
  assets/
    audio/      (optional background music drop-in)
    images/
      characters/ (treasure chest art — closed / correct / wrong states)
      specimens/  (real arthropod reference photos used in questions)
      background/ (optional full-bleed canopy photo)
      ui/
        emoji/    (every icon in the UI — shipped, replaceable)
```

---

## 1. Treasure chests — `assets/images/characters/`

Each grid tile renders one of three chest states. If a PNG with the matching
name exists here it is loaded **instead**; if missing, the built-in hand-drawn
SVG chest is shown.

| Filename | State |
|---|---|
| `chest_closed.png` | Unopened chest on the map |
| `chest_correct.png` | Opened after a correct answer (gold spilling out) |
| `chest_wrong.png` | Opened after a wrong answer (empty, cracked) |

- **Size:** 320 × 320 px recommended (square), transparent background.

## 2. Specimen photos — `assets/images/specimens/`

Shown inside the brass "spyglass" lens on the question scroll, and again as
thumbnails in the end-screen Field Guide. These already ship with real
reference photography; replace any of them to restyle that question.

| Filename | Subject |
|---|---|
| `shrimp_exoskeleton.jpg` | Crustacean exoskeleton |
| `tracheal_system.jpg` | Insect tracheal system diagram |
| `grasshopper.jpg` | Grasshopper (open circulation / excretion) |
| `shield_bug.jpg` | Shield bug (jointed appendages) |
| `coelomate.png` | Body-plan / germ-layer diagram |
| `limulus.jpg` | Limulus, the horseshoe crab |
| `mosquito.jpg` | Adult mosquito |
| `mosquito_larva.jpg` | Mosquito larva in water |

- **Size:** ~700 px on the long edge is plenty; square or landscape both work
  (the lens/thumbnail crop to fit).

## 3. Background photo — `assets/images/background/` (optional)

Currently the backdrop is a CSS canopy-gradient with drifting SVG bugs and
fireflies. Drop in a full-bleed photo to blend a real jungle canopy behind it
at low opacity:

| Filename | Notes |
|---|---|
| `canopy.jpg` | 1920 x 1080 px (16:9) landscape photo. Blended at ~32% opacity over the CSS gradient, so a mid-toned green/brown photo works best. |

If missing, the CSS gradient backdrop is used alone — nothing looks broken.

## 4. UI icons — `assets/images/ui/emoji/`

These PNGs are used everywhere an icon appears in the interface — no emoji
characters are used anywhere. Keep the same filenames if you replace them.

| Filename | Used for |
|---|---|
| `gear.png` | Settings button (compass rose) |
| `coin.png` | Treasure/score chip |
| `hourglass.png` | Timer chip |
| `check.png` | Correct-answer stamp |
| `cross.png` | Wrong-answer stamp |
| `trophy.png` | End-screen medal |
| `map.png` | Begin Expedition / How to Play |
| `book.png` | Learn More / boot screen |
| `sound_on.png` / `sound_off.png` | Sound-effects toggle |
| `music_on.png` / `music_off.png` | Music toggle |

- **Size:** 256 × 256 px, square, transparent background. The game swaps the
  `src` between on/off variants when a toggle changes state.

---

## 5. Background music — `assets/audio/` (optional)

By default the game synthesises a calm jungle-dusk ambient pad live in the
browser (Web Audio) — **fully offline, no file needed**.

To use your own track instead, drop in:

| Filename | Notes |
|---|---|
| `bgm.mp3` | Looping background music. If present and playable it **overrides** the procedural pad. If missing, the procedural music plays instead. |

- Keep it seamless-looping and modest in volume; the game loops it
  continuously and applies its own gain control.

---

## How the fallback works

Every image above is loaded with a success/failure callback. On failure (file
missing, wrong path, corrupt file) the game keeps its existing hand-drawn
vector art for that element — there is no crash, console error spam, or
broken-image icon. Add art incrementally, one file at a time.

## Fonts — `assets/fonts` → `fonts/` (required, bundled)

Local WOFF2 copies of **Luckiest Guy** (display headings/logo) and **Baloo 2**
(body text and buttons). These make the game work fully offline. Do not remove
them.

## Packaging notes

- This whole `arthropoda_treasure_quest/` folder is self-contained:
  `index.html`, `js/`, `fonts/`, and `assets/` all use **relative paths
  only** — no internet connection is required.
- To ship: copy the entire `arthropoda_treasure_quest/` folder as-is. The
  mobile WebView should point at `arthropoda_treasure_quest/index.html`.
