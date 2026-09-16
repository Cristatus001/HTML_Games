# Image assets - DECISION CARDS: Cell Cycle Control

Every image below is optional in the sense that the game **never breaks** when a
file is missing: each slot has a built-in CSS/SVG or procedurally generated
fallback. Drop a file in with the exact name and the game picks it up on the next
page load. Nothing else needs editing.

All files are PNG with transparency where noted. Keep filenames lowercase
snake_case exactly as listed.

---

## 1. `cards/` - specimen card art (shipped, replaceable)

Full-bleed card faces. The card title is baked into the artwork, so the game
hides its own title plate whenever the PNG loads.

| File | Used by card |
|---|---|
| `growth_without_copy.png` | Growth Without Copy |
| `half_copied_dna.png` | Half-Copied DNA |
| `damaged_dna_detected.png` | Damaged DNA Detected |
| `everything_ready_almost.png` | Everything Ready... Almost |
| `rushed_division_order.png` | Rushed Division Order |
| `checkpoint_arrest_bypass.png` | Checkpoint Arrest Bypass |
| `spindle_checkpoint_mismatch.png` | Spindle Assembly Checkpoint Mismatch |
| `hyperactive_growth_factor_signal.png` | Hyperactive Growth Factor Signal |
| `irreparable_double_strand_breaks.png` | Irreparable Double-Strand Breaks |
| `centrosome_over_amplification.png` | Centrosome Over-Amplification |

* **Size:** 545 x 764 px (shipped files range 534-591 x 746-772)
* **Recommended:** 700 x 980 px
* **Orientation:** portrait, 5:7 aspect
* **Background:** opaque dark navy `#091017` (the card frame behind it uses the
  same tone, so letterboxing is invisible at any aspect ratio)
* **Fallback if missing:** animated holographic vector glyph plus a title plate

---

## 2. `ui/emoji/` - interface icons (shipped, replaceable)

These replace every emoji the UI would otherwise use. All are square, generated
at **128 x 128 px**, transparent background, drawn to be readable down to 16 px.
Swap any file to re-skin the interface; the game only ever sets `src`.

**Condition / specimen readout icons**

`dna.png`, `dna_broken.png`, `dna_shield.png`, `cell.png`, `cell_size.png`,
`chromosome.png`, `spindle.png`, `centrosome.png`, `divide.png`,
`mutation.png`, `radiation.png`, `warning.png`, `blocked.png`,
`signal_bolt.png`, `glitch_burst.png`, `time_pressure.png`

**Verdict / result icons**

`check.png`, `cross.png`, `apoptosis.png`, `flask.png`, `target.png`,
`rank_filled.png`, `rank_empty.png`, `streak.png`

**Navigation and chrome**

`arrow_left.png`, `arrow_right.png`, `home.png`, `replay.png`,
`play_tri.png`, `pause_bars.png`, `close.png`, `settings.png`,
`lock.png`, `unlock.png`, `codex.png`, `microscope.png`, `teja.png`

**Toggle state icons** (the game swaps `src` on these, never text)

`sound_on.png` / `sound_off.png`, `music_on.png` / `music_off.png`,
`fx_on.png` / `fx_off.png`

Each pair follows one convention: the **on** icon is saturated cyan and lit from
within, the **off** icon is desaturated slate with a cross. Keep that if you
replace them, so the toggle state stays readable without reading the label.

* **Size:** 128 x 128 px, square
* **Orientation:** square, centred glyph with ~8 px breathing room
* **Fallback if missing:** the `<img>` simply renders nothing; layout is unaffected

---

## 3. `backgrounds/` - optional parallax plates (not shipped)

| File | Size | Orientation | Effect |
|---|---|---|---|
| `bg_far.png` | 1920 x 1080 (or larger) | landscape, 16:9 | Replaces the deep radial backdrop. Rendered `cover`, centred. |
| `bg_near.png` | 1920 x 1080 | landscape, 16:9 | Replaces the instrument grid overlay, drawn at 35% opacity above the far plate. Use a mostly transparent PNG. |

Both are ignored if absent - the animated CSS plasma, hex lattice, DNA strands
and canvas organelle field keep running either way.

---

## 4. `characters/` - optional portrait (not shipped)

| File | Size | Orientation | Effect |
|---|---|---|---|
| `teja.png` | 128 x 128 (square) | square, transparent | Replaces the TEJA_SYS sigil in the advisory console and on the verdict face. A framed bust or avatar works well. |

---

## 5. `ui/` and `ui/panels/` - optional chrome (not shipped)

| File | Size | Orientation | Effect |
|---|---|---|---|
| `ui/logo.png` | 512 x 512 | square, transparent | Replaces the animated hex emblem on the main menu. Keep the artwork inside a square canvas; it is scaled to about 15% of the shorter viewport edge. |
| `ui/panels/panel_texture.png` | 512 x 512 | square, **seamless tile** | Overlaid on every panel at 16% opacity with `overlay` blending. Use a subtle brushed-metal, paper or noise texture; strong imagery will fight the UI. |

---

## 6. `../audio/` - optional music (not shipped)

| File | Notes |
|---|---|
| `assets/audio/bgm.mp3` | Looping background music. If it loads it fully replaces the built-in Web Audio ambient score. Keep it seamless; 1-3 minutes is plenty. If absent (or it fails to decode) the procedural synth pad is used instead - no console errors that matter, no gameplay impact. |

---

## Adding art later

1. Drop the file in with the exact name above.
2. Reload. That is the whole process.

The 404s you may see in a dev console for the *optional* files are expected and
harmless - they are how the game probes for drop-in art.
