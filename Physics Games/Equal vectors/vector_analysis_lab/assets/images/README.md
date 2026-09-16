# Image assets — Vector Analysis Lab

Everything in this folder is loaded by **relative path only**. The game never
touches the network.

There are two kinds of files here:

| Kind | Folders | Status |
|---|---|---|
| **Shipped** — already generated, the game uses them directly | `ui/emoji/`, `icons/` | present |
| **Optional drop-in** — empty slots; if a file is absent the game falls back to its built-in canvas art | `background/`, `vectors/`, `scenes/`, `ui/logo.png` | add whenever you like |

Drop a file in with the exact name below and it is picked up on the next page
load. Delete it and the built-in artwork returns. Nothing breaks either way —
missing optional files log one grouped `info` line in the console and nothing
else.

All PNGs should be **32-bit RGBA with transparency** unless stated otherwise.

---

## 1. `background/` — optional, ambient layers

| File | Size | Orientation | Notes |
|---|---|---|---|
| `backdrop.png` | 1920 × 1080 | landscape | Full-screen deck backdrop behind the menus. Drawn with `object-fit: cover` at 42% opacity, so keep it low-contrast and dark. Keep detail away from the outer 8% (it gets vignetted). |
| `grid.png` | 256 × 256 | square, **seamlessly tileable** | Replaces the drawn parallax grid. Tiled at 220 px and drifted slowly. Keep it faint — drawn at 16% opacity. |
| `drift.png` | 128 × 128 | square | Single drifting ambient glyph, rotated and floated across the screen. Replaces the drawn mini-arrow. Centre the artwork; the sprite is drawn from its midpoint. |

## 2. `vectors/` — optional, the two arrows

The arrows are procedurally drawn (glowing tube + chevron head). You can
override the shaft and the head independently — supplying only one is fine.

| File | Size | Orientation | Notes |
|---|---|---|---|
| `ref_shaft.png` | 256 × 64 | landscape, **points right** | Reference (grey/cyan) shaft. **Stretched horizontally** to the vector's length, so design it to survive horizontal scaling: no round caps, no text, vertical detail only. Tail is at the left edge. |
| `ref_head.png` | 96 × 96 | square, **points right** | Reference arrowhead. The tip must sit on the **right edge**, vertically centred. |
| `player_shaft.png` | 256 × 64 | landscape, **points right** | Player (amber) shaft. Same rules as `ref_shaft.png`. |
| `player_head.png` | 96 × 96 | square, **points right** | Player arrowhead. Same rules as `ref_head.png`. |
| `node.png` | 64 × 64 | square | The round tail handle, drawn centred on the tail point. Used for **both** arrows. |
| `target_ring.png` | 128 × 128 | square | The reference drop target (the ringed socket). Drawn centred on the reference tail; replaces the pulsing rings. |

> Both arrows are drawn pointing **right at 0°** and rotated by the game, so
> author all vector art facing right.

## 3. `scenes/` — optional, per-case backdrops

Every case is played over its own animated real-world scene, painted on canvas:
rain falling across two gardens, a lift shaft, two lanes of moving traffic, a
moving escalator, a swimming pool, and so on.

You can replace the **painted backdrop** of any scene with a photo or
illustration. The scene's **animated layer keeps running on top** — so if you
drop in a photo of a shopping centre, the escalator steps still move over it;
drop in a photo of a garden and the rain still falls.

| File | Case | What the animated layer keeps drawing on top |
|---|---|---|
| `rain.png` | 01 — The Rain Drops | falling rain, mist, splash rings |
| `lift.png` | 02 — The Elevators | two lift cars rising in their shafts |
| `road.png` | 03 — Parallel Driving | two lanes of cars, scrolling centre line |
| `room.png` | 04 — Team Lifting | the sofa and its two lifters, bobbing |
| `piano.png` | 05 — Piano Keys | the two struck keys and their sound rings |
| `escalator.png` | 06 — Escalators | moving treads, handrail highlight, riders |
| `field.png` | 07 — Marching Band | two columns of marchers |
| `pool.png` | 08 — The Swimmers | caustics, both swimmers, wake |
| `park.png` | 09 — Dog Walking | walker, dog, leash, fireflies |
| `highway.png` | 10 — Cars: Speed Check | fast and slow lane traffic, headlights |

- **Size:** 1920 × 1080 (16:9) or wider. Drawn with `cover` fit and centre
  crop, so keep the subject central and expect the edges to be trimmed on tall
  phone screens.
- **Orientation:** landscape.
- **Tone:** keep them **dark and low-contrast**. A translucent scrim and
  vignette are applied over the scene so the HUD and the two vectors stay
  readable, but a bright photo will still fight the glowing arrows.
- Delete a file and the painted scene returns.

## 4. `ui/`

| File | Size | Orientation | Notes |
|---|---|---|---|
| `logo.png` | 640 × 336 | landscape | **Optional.** Overrides the built-in SVG title emblem on the main menu. Transparent background. |
| `emoji/*.png` | see below | square | **Shipped.** Replaces every emoji in the interface. |

### `ui/emoji/` — shipped interface icons

Each is a square RGBA PNG rendered on transparency. Replace any of them with
your own art at the same size and filename to re-skin the UI.

| File | Size | Used for |
|---|---|---|
| `check.png` | 128 | Scanner "matches", pass verdict |
| `cross.png` | 128 | Scanner "different", result-screen not-equal tile |
| `close.png` | 128 | Modal close buttons |
| `scanning.png` | 128 | Scanner row while checking |
| `magnitude.png` | 128 | Magnitude row label |
| `direction.png` | 128 | Direction row label |
| `codex.png` | 128 | Learn More / textbook card |
| `insight.png` | 128 | Significance card |
| `certified.png` | 160 | Result-screen mastery seal |
| `burst.png` | 128 | Result-screen cases-analysed tile |
| `note.png` | 128 | Case-notes card |
| `chevron.png` | 128 | "Next Case" |
| `back.png` | 128 | Back / main menu |
| `sfx_on.png` / `sfx_off.png` | 128 | Sound-FX toggle (`src` is swapped in JS) |
| `music_on.png` / `music_off.png` | 128 | Music toggle (`src` is swapped in JS) |
| `lock.png` | 128 | Locked case tile |
| `settings.png` | 128 | Settings buttons |
| `help.png` | 128 | How to Play |
| `menu.png` | 128 | Cases / main menu |
| `retry.png` | 128 | Retry / restart |
| `play.png` | 128 | Begin study |
| `core_on.png` / `core_off.png` | 96 | Progress cores (HUD strip + case tiles) |
| `target.png` | 128 | Scanner header |
| `drag.png` | 128 | Drag hint |
| `equals.png` | 128 | Equal-vector emblem, favicon, result-screen equal tile |
| `warn.png` | 128 | "Not equal" verdict, crucial-note strip |

## 5. `icons/` — shipped case artwork

One per case file, drawn on the canvas just past each arrow's tip and used as
the artwork on the case-select tiles. Square RGBA PNG, **128 × 128**, subject
centred with a couple of pixels of breathing room.

| File | Case |
|---|---|
| `rain.png` | 01 — The Rain Drops |
| `elevator.png` | 02 — The Elevators |
| `car.png` | 03 — Parallel Driving |
| `sofa.png` | 04 — Team Lifting |
| `press.png` | 05 — Piano Keys |
| `escalator.png` | 06 — Escalators |
| `drum.png` | 07 — Marching Band |
| `swimmer.png` | 08 — The Swimmers |
| `dog.png` | 09 — Dog Walking |
| `racecar.png` | 10 — Cars: Speed Check |

If one of these is deleted the game draws a lit hexagonal token in its place,
so the case is still playable.

---

## Regenerating the shipped icons

Every PNG in `ui/emoji/` and `icons/` is generated by a dependency-free Node
script — no image editor and no network needed:

```bash
node tools/gen_icons.mjs
```

Shapes and colours live in `tools/gen_icons.mjs`; the rasterizer and PNG
encoder live in `tools/raster.mjs`.
