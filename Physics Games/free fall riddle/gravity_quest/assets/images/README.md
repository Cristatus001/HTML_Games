# Gravity Quest — Image Assets

Every file listed here is **optional**. The game ships with hand-built CSS/SVG art
for all of it, and checks at boot whether a real image exists. If a file is
present it is used; if it is missing, the built-in vector art is drawn instead and
nothing breaks. Drop art in at any time — no code changes required.

- Format: **PNG with transparency** (except full-bleed backgrounds, which may be opaque JPG/PNG).
- Colour space: sRGB.
- Keep the exact filename and folder — the loader matches on path.
- Sizes below are the recommended source size. Everything is scaled responsively,
  so larger is fine; smaller will look soft on high-DPI phones.

---

## `background/` — ambient backdrop

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `sky.png` | 1920 × 1920 | Square (covers both orientations) | Full-bleed deep-space gradient. Replaces the CSS sky **and** hides the CSS horizon arc. Keep detail away from the edges — it is `background-size: cover` and gets cropped. |
| `nebula_far.png` | 1024 × 1024 | Square | Reserved slot. Probed at boot, not yet composited. |
| `nebula_near.png` | 1024 × 1024 | Square | Reserved slot. Probed at boot, not yet composited. |
| `starfield.png` | 2048 × 2048 | Square, tileable | Reserved slot. The animated canvas starfield runs regardless. |

## `characters/` — figures

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `skydiver.png` | 240 × 416 | Portrait (tall) | The falling figure in the parachute simulation. Head at top, feet at bottom, transparent background. Anchored bottom-centre. The CSS parachute still animates above it, so **do not** draw a parachute into this file. |
| `observer.png` | 128 × 352 | Portrait (tall) | The person standing on the scale inside the elevator. Feet at the very bottom edge, transparent background. |

## `simulations/` — props

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `tower.png` | 224 × 1024 | Portrait (very tall) | Galileo's tower. Anchored bottom-centre, drawn behind both balls. |
| `iron_ball.png` | 128 × 128 | Square | Iron sphere. Fills the element edge-to-edge; keep it circular and centred. |
| `wooden_ball.png` | 128 × 128 | Square | Wooden sphere. Same framing as the iron ball. |
| `elevator.png` | 352 × 472 | Portrait | Elevator car interior. The CSS person and scale are drawn **on top**, so leave the lower-centre area readable. |
| `cannon.png` | 208 × 120 | Landscape | Cannon on its carriage, barrel angled up to the right at roughly 42°. |
| `projectile.png` | 64 × 64 | Square | The cannonball. Circular, centred, with its own glow baked in if desired. |

## `ui/` — interface furniture

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `panel_frame.png` | 900 × 700 | Landscape, 9-slice friendly | Reserved slot. Probed at boot, not yet composited. |
| `node_ring.png` | 256 × 256 | Square | Reserved slot. Probed at boot, not yet composited. |

## `ui/emoji/` — icon set (already supplied)

These replace every emoji character the UI would otherwise use, and are
referenced as real `<img>` tags. All are **256 × 256 px, square, transparent PNG**.
Swapping the file swaps the icon everywhere it appears. Icons whose `src` is
changed at runtime are marked below.

| File | Used for |
|---|---|
| `star-shard.png` | The Star Shards currency, in the HUD, hint cost, rules and Learn More |
| `hint-comet.png` | Hint button and the hint toast |
| `sound-on.png` / `sound-off.png` | Sound-effects toggle — **src swapped at runtime** |
| `music-on.png` / `music-off.png` | Music toggle — **src swapped at runtime** |
| `lock.png` | Locked node on the Ascent Map, and the locked-node toast |
| `check.png` | Solved node, and the correct answer tile |
| `cross.png` | Wrong answer tile |
| `close.png` | Modal close buttons |
| `orbit-settings.png` | Settings button (HUD + menu) — an orbit, not a gear |
| `codex.png` | Codex crest and the Learn More button |
| `manual.png` | How to Play button and modal |
| `rocket.png` | Launch / Continue button, and progress toasts |
| `back-arrow.png` | All back navigation |
| `play.png` | Begin Anew |
| `gravity-arrow.png` | Ambient Motion setting |
| `trophy.png` | Quest Complete award |
| `question.png` | Spare help glyph |
| `feather.png` | Spare thematic glyph (feather-and-stone motif) |

---

## Regenerating the icons

The icon set was generated procedurally. To rebuild or restyle it, the source
script draws each icon with layered gradients and a radial inner glow — there are
no external image dependencies.
