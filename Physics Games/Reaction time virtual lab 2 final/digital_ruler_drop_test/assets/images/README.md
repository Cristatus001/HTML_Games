# Image assets — drop-in art guide

Every file listed here is **optional**. The game ships complete, drawing all of
its art with CSS gradients, inline SVG and canvas. Drop a PNG into the matching
folder with the exact filename below and the game picks it up on the next reload.
Delete it again and the built-in vector art returns. A missing, corrupt or
slow-loading file never breaks the game — the loader probes each path, applies
only what decodes, and falls back silently otherwise (`js/assets.js`).

All sizes are the **recommended pixel dimensions**. Anything reasonably close
works; the layout scales art to fit. Use PNG with transparency (RGBA) unless a
row says otherwise.

---

## `apparatus/` — the drop rig

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `ruler.png` | 96 × 1600 | **Portrait**, tall and narrow | The rule blade. Stretched to the rig height, so keep the design vertically tileable/uniform. **0 cm must be at the BOTTOM edge**, rising to the top. Drawn ticks are optional — the game overlays its own engraved cm scale at reduced opacity, because the tick spacing must match the active rule length (30/50/100 cm). |

## `characters/` — the hands

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `hand_dropper.png` | 320 × 200 | **Landscape** | Upper hand, pinch-gripping the rule. Fingertips must sit at the **right edge**, forearm running off to the left. Anchored so the pinch point is at the vertical centre of the image. |
| `hand_catcher.png` | 320 × 200 | **Landscape** | Lower hand, fingers open ready to close. Same anchoring as above: fingertips at the right edge, pinch point vertically centred. |

Both replace the shared inline-SVG hand. If you supply only one, the other keeps
its vector version.

## `background/` — the lab

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `lab_backdrop.png` | 1920 × 1080 | **Landscape** | Full-screen backdrop, applied with `background-size: cover`. Keep it dark and low-contrast in the centre third — the falling rule and the HUD sit on top of it. The animated particle layer still draws over it. |
| `bench_texture.png` | 256 × 32 | **Landscape**, tileable | Repeats horizontally along the bench base strip under the rig. Must tile seamlessly left-to-right. |

## `ui/` — chrome

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `panel_skin.png` | 512 × 512 | Square, tileable | Optional texture exposed to CSS as `var(--panel-skin)` for panel backgrounds. |
| `title_logo.png` | 900 × 300 | **Landscape** | Replaces the entire CSS word-mark on the main menu (and hides the small crest icon). Capped at 26 % of viewport height. Transparent background. |

---

## `ui/emoji/` — icon set (required, already generated)

These 39 PNGs stand in for what would otherwise be emoji characters. **The game
uses no emoji glyphs anywhere**; every icon is an `<img>` tag, and any icon that
changes with state (mute/unmute, locked/unlocked, graded/ungraded) swaps the
image's `src` attribute rather than setting text content.

All are **128 × 128 px, square, RGBA**.

Regenerate or restyle the whole set with no image editor and no network access:

```bash
node tools/gen_icons.mjs
```

Navigation and chrome
: `play` `pause` `back` `next` `chevron` `close` `home` `menu`

Status
: `check` `cross` `warn` `info` `help` `lock` `unlocked`

Rating (a lit synapse node, used instead of a generic star)
: `grade_on` `grade_off`

Lab apparatus and concepts
: `ruler` `hand` `bolt` `brain` `timer` `target` `gravity` `chart` `stats`
  `table` `flask` `medal` `trophy` `retry` `trash` `spark` `neuron`

Controls
: `settings` (a rotary lab knob) `music_on` `music_off` `sfx_on` `sfx_off`

If you replace one of these by hand, keep the filename and the 128 × 128 size.
Pairs (`*_on` / `*_off`, `grade_on` / `grade_off`) must stay visually
distinguishable at 24 px, since that is the size most of them render at.
