# Digital Ruler Drop Test

A virtual reaction-time lab. The classic ruler-drop experiment: a rule is
released without warning, you catch it as fast as you can, and the distance it
fell gives your reaction time through free-fall physics.

Runs entirely offline from `index.html` — no network access, no build step, no
external libraries or fonts. Designed to be loaded directly by a mobile app
WebView.

---

## Running it

Open `index.html`. That's it — `file://` works, and so does any static server:

```bash
python -m http.server 8000
```

---

## The physics

The rule is in free fall, so distance depends only on elapsed time and gravity:

```
d = ½ g t²        with g = 9.8 m/s²
t = √(2d / g)
```

Reaction time is measured from the clock (`performance.now()`) at release to the
clock at the catch. The distance is then derived from that time, and the rule is
snapped to the matching position so **the centimetre mark sitting on the catch
line is exactly the distance the physics reports**.

That consistency is deliberate. The original prototype drew its ruler markings at
1000 px/m but animated the fall at 1500 px/m, so the number printed at the catch
line disagreed with the computed distance by 50 %. The display scale is now
derived from the active rule's own centimetre scale
(`pxPerCm = rulerLengthInPixels / ruleCm`), which also makes it resolution
independent.

### Rule length is the difficulty

A rule of length *L* can only measure reactions up to `√(2L/100/g)` seconds —
past that, it has slipped through your fingers and there is no reading to take.
This is a real limitation of the physical experiment, and the game uses it as its
difficulty curve rather than inventing one:

| Rule | Measurable up to |
|---|---|
| 100 cm (metre rule) | 0.452 s |
| 50 cm | 0.319 s |
| 30 cm | 0.247 s |

---

## Structure

```
digital_ruler_drop_test/
|-- index.html              markup for all five screens and four modals
|-- css/style.css           all presentation
|-- js/
|   |-- assets.js           optional drop-in art probing + icon src swapping
|   |-- storage.js          localStorage with a full in-memory fallback
|   |-- audio.js            procedural music + synthesised SFX
|   |-- background.js       ambient parallax layer + particle FX layer
|   |-- levels.js           stage definitions, grading, unlock rules
|   |-- game.js             rig geometry, physics, state machine
|   |-- ui.js               screens, HUD, tables, charts, modals
|   \-- main.js             boot, input binding, WebView hardening
|-- assets/
|   |-- fonts/              Orbitron, Rajdhani, Inter (woff2, local)
|   |-- images/             optional drop-in art — see its README
|   |   \-- ui/emoji/       39 generated icon PNGs (no emoji glyphs used)
|   \-- audio/              optional bgm.mp3 override — see its README
\-- tools/
    |-- raster.mjs          dependency-free software rasteriser + PNG encoder
    \-- gen_icons.mjs       regenerates every icon: node tools/gen_icons.mjs
```

Load order matters: each `js/` file attaches one global (`Assets`, `Save`,
`Sound`, `Backdrop`, `Levels`, `Game`, `UI`) and `main.js` wires them together.

---

## Game flow

**Boot** -> **Main menu** -> **Stage select** -> **Bench** -> **Result**

- **How to Play** lives on the main menu and covers only controls and objective.
- **Learn More** lives on the result screen and covers the concepts: what
  reaction time is, the derivation of `t = √(2d/g)`, a worked example, a
  distance-to-time reference table, and the guiding questions.

### Modes

**Calibration** — six stages. Each asks for a number of recorded catches and then
grades the session out of three. Stages unlock in order; grades, records and best
means persist.

| # | Stage | Rule | Trials | Target |
|---|---|---|---|---|
| 1 | Orientation | 100 cm | 3 | complete the catches |
| 2 | Steady Hand | 100 cm | 5 | mean ≤ 0.34 s |
| 3 | Quick Draw | 50 cm | 5 | mean ≤ 0.30 s |
| 4 | Nerve Signal | 50 cm | 6 | mean ≤ 0.26 s |
| 5 | Precision Grip | 50 cm | 6 | std. dev. ≤ 0.050 s |
| 6 | Reflex Master | 30 cm | 6 | complete the catches |

**Free Lab** — the original open-ended experiment. A metre rule, unlimited
trials, the full data table, mean/median/standard deviation, the trial chart, and
**Reset All Data**. Its data set persists across sessions.

### Two ways to lose a trial

- **False start** — you moved during the random 1–3 s wait. Nothing is recorded.
- **Slipped through** — the rule ran out of scale before you caught it.

Neither is scored against you; the trial simply repeats. Both are counted and
reported on the result screen.

---

## Mobile / WebView notes

- Input is unified through **Pointer Events** — one code path for mouse, touch
  and pen, with a `touchstart`/`mousedown` fallback for WebViews that predate
  `PointerEvent`. Keyboard runs in parallel.
- Pinch-zoom, double-tap zoom, `ctrl`+wheel zoom, rubber-band scroll, long-press
  callout, text selection and drag are all suppressed. Scrolling is still allowed
  inside the panels that need it.
- Layout is responsive to phone width and to short landscape; the HUD reflows to
  two rows and the data panel becomes a slide-over drawer below 1000 px.
- Safe-area insets are respected top and bottom.
- `--vh` is published as a pixel fallback for WebViews without `dvh`.
- Backgrounding the app voids any trial in flight rather than recording a
  nonsense time, because `requestAnimationFrame` stops while hidden.
- Nothing depends on hover.

## Saved state

One `localStorage` key, `drdt.save.v1`: settings, per-stage grade/best/cleared,
the Free Lab data set, and lifetime totals. Reads are validated and merged over
defaults, so a corrupt or partial payload cannot break startup. If
`localStorage` is unavailable the game runs normally with in-memory state.

**Erase Saved Progress** in Settings clears everything; **Reset All Data** in the
Free Lab panel clears only the trial data.
