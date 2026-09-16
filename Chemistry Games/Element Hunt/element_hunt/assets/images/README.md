# Element Hunt - image assets

Everything in this folder is **optional except `ui/emoji/`**.

The game ships with complete CSS/SVG artwork. If a file listed below exists it is
detected at boot (`assets/js/assets.js`) and used automatically; if it is missing
the built-in vector art is used instead and nothing breaks. So you can drop art in
one file at a time, in any order, without touching the code.

Use **PNG with transparency** (except the background plates, which can be opaque).
Sizes are the recommended pixel dimensions - anything close works, the CSS scales it.

---

## 1. `ui/emoji/` - icon set (REQUIRED, already generated)

These replace every emoji in the UI and are referenced as `<img>` tags. They are
already present; replace any file with your own art of the same name to reskin it.

| File | Size | Orientation | Used for |
|---|---|---|---|
| `atom.png` | 128 x 128 | square | boot emblem, browser tab icon |
| `flask.png` | 128 x 128 | square | main-menu brand mark |
| `score.png` | 128 x 128 | square | score / points (glowing crystal) |
| `level.png` | 128 x 128 | square | vault (level) counter |
| `attempts.png` | 128 x 128 | square | strike (attempt) counter |
| `star_on.png` | 128 x 128 | square | earned crystal-star |
| `star_off.png` | 128 x 128 | square | unearned crystal-star |
| `music_on.png` | 128 x 128 | square | music toggle, on state |
| `music_off.png` | 128 x 128 | square | music toggle, off state |
| `sfx_on.png` | 128 x 128 | square | sound-effects toggle, on state |
| `sfx_off.png` | 128 x 128 | square | sound-effects toggle, off state |
| `settings.png` | 128 x 128 | square | settings buttons |
| `hint.png` | 128 x 128 | square | hint button, hint tally |
| `bulb.png` | 128 x 128 | square | fun-fact reveal |
| `book.png` | 128 x 128 | square | "Learn More" button |
| `scroll.png` | 128 x 128 | square | "How to Play" button |
| `drag.png` | 128 x 128 | square | drag-to-strike instruction |
| `clock.png` | 128 x 128 | square | speed-bonus pill |
| `check.png` | 128 x 128 | square | correct answer, level-cleared seal |
| `cross.png` | 128 x 128 | square | wrong answer |
| `close.png` | 128 x 128 | square | modal close buttons |
| `play.png` | 128 x 128 | square | start / confirm buttons |
| `next.png` | 128 x 128 | square | next vault / next specimen |
| `back.png` | 128 x 128 | square | back navigation |
| `restart.png` | 128 x 128 | square | replay, reset progress |
| `home.png` | 128 x 128 | square | main-menu navigation |
| `trophy.png` | 128 x 128 | square | game-complete reward |
| `lock.png` | 128 x 128 | square | locked vault |
| `radiation.png` | 128 x 128 | square | spare themed icon (radioactive elements) |

**Icons must never be emoji characters** - they are always real image files swapped
by `src` (for example the music toggle swaps `music_on.png` / `music_off.png`).

---

## 2. `background/` - optional parallax plates

Drop any or all of these in for painted scenery behind the procedural canvas
particles. Each layer gets a slow independent drift.

| File | Size | Orientation | Notes |
|---|---|---|---|
| `bg_far.png` | 1920 x 1080 | landscape | farthest layer (sky / nebula). Rendered at 55% opacity. |
| `bg_mid.png` | 1920 x 1080 | landscape | middle layer (distant lab shelves, glassware silhouettes). 60% opacity. |
| `bg_near.png` | 1920 x 1080 | landscape | nearest layer (foreground haze, desk edge). 70% opacity. |

All three are `background-size: cover`, anchored bottom-centre. Keep important
detail away from the edges - the layers are inset by -6% and drift a few percent.

---

## 3. `grid/` - optional letter-tile skins

| File | Size | Orientation | Notes |
|---|---|---|---|
| `cell.png` | 64 x 64 | square | idle letter tile background |
| `cell_selected.png` | 64 x 64 | square | tile while being dragged over |
| `cell_found.png` | 64 x 64 | square | tile of a solved symbol |

Tiles are stretched to `100% 100%` of one grid square (the board is 15 x 15).
Keep them seamless/edge-to-edge; the letter itself is always drawn as text on top.

---

## 4. `ui/` - optional chrome skins

| File | Size | Orientation | Notes |
|---|---|---|---|
| `logo.png` | 512 x 512 | square | replaces the flask brand mark on the menu |
| `panel.png` | 800 x 600 | landscape | 9-slice-ish skin stretched over glass/metal panels |
| `panel_header.png` | 800 x 120 | landscape | reserved for a panel header strip |
| `button.png` | 320 x 96 | landscape | reserved for a button skin |
| `grid_frame.png` | 700 x 700 | square | decorative frame drawn around the letter board |

---

## 5. `elements/` - optional element portraits

One image per element, named after the **lowercase chemical symbol**. Shown inside
the element tile on the fun-fact popup after a correct answer.

| File | Size | Orientation |
|---|---|---|
| `h.png`, `he.png`, `c.png`, `n.png`, `o.png`, `na.png`, `mg.png`, `al.png`, `si.png`, `cl.png`, `k.png`, `ca.png`, `fe.png`, `cu.png`, `i.png` | 256 x 288 | portrait (8:9) |
| `li.png`, `be.png`, `f.png`, `ne.png`, `p.png`, `s.png`, `ti.png`, `zn.png`, `br.png`, `ag.png`, `sn.png`, `au.png`, `hg.png`, `pb.png`, `u.png` | 256 x 288 | portrait (8:9) |

They are drawn with `object-fit: cover` in a rounded 96 x 108 tile, so keep the
subject centred. Any symbol without a file simply shows the CSS element tile.

---

## 6. `assets/audio/` (sibling folder) - optional music

| File | Notes |
|---|---|
| `bgm.mp3` | Looping background music. If present it replaces the built-in Web Audio synth score. If absent (the default) the game generates its music procedurally and stays 100% offline. |
