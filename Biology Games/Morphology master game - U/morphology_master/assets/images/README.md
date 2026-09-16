# Image assets

Every image here is **optional**. On boot the game probes each file once and
records whether it loaded. Anything missing is replaced automatically by inline
vector art, so you can delete, replace or add files without touching any code
and without breaking the game.

To swap art: overwrite the file, keep the exact filename, and reload.

All PNGs are square with a transparent background and are drawn centred with a
small margin, so nothing gets clipped when the game rounds them into a circle.

---

## `ui/emoji/` — 128 x 128 px, square, transparent PNG

These stand in for what would otherwise be emoji characters. The game never
renders an emoji glyph; it uses these as `<img>` elements and swaps the `src`
when a state changes.

| File | Used for |
|---|---|
| `verdict-correct.png` | Correct-answer marker (verdict dialog, summary list, station "done" flag) |
| `verdict-wrong.png` | Wrong-answer marker (verdict dialog, failure bullet points) |
| `verdict-incomplete.png` | Warning marker when a question is left unanswered |
| `specimen.png` | Frog head badge: boot logo, station 1 badge, empty specimen slots |
| `medal.png` | Award shown on the victory screen |
| `seal-earned.png` | Filled rating seal |
| `seal-empty.png` | Unfilled rating seal |
| `microscope.png` | Station 2 badge, "Field Stations" buttons |
| `notebook.png` | "Learn More" button |
| `clipboard.png` | "How to Play" button |
| `lab-home.png` | Specimen jar, "Main Menu" button |
| `lamp.png` | Station 3 badge |
| `dial.png` | Settings button |
| `lock.png` | Locked station badge |
| `play.png` | "Start / Continue Examination" button |
| `pause.png` | Reserved for a pause control |
| `close.png` | Dialog close buttons |
| `arrow-left.png` | Back buttons |
| `replay.png` | "Run Again" button |
| `scalpel.png` | Reserved for the examination action |
| `sound-on.png` / `sound-off.png` | Sound-effects toggle. **Swapped by `src` at runtime.** |
| `music-on.png` / `music-off.png` | Music toggle. **Swapped by `src` at runtime.** |

State-swapped pairs must stay visually consistent with each other: same subject,
same optical weight, only the on/off treatment differing.

---

## `options/` — 192 x 192 px, square, transparent PNG

One picture per answer choice. These appear both on the answer plate and, once
chosen, inside the specimen case. They are the illustrations tied directly to
each question, so keep them readable at roughly 55 px.

**Station 1 — The External Shield**

| File | Answer it illustrates |
|---|---|
| `skin-olive.png` | Olive green with dark irregular spots (correct) |
| `skin-yellow.png` | Uniform pale yellow |
| `texture-dry.png` | Dry and scaly |
| `texture-moist.png` | Smooth and slippery, mucus-covered (correct) |

**Station 2 — Sensory Adaptation**

| File | Answer it illustrates |
|---|---|
| `eye-eyelid.png` | Standard opaque eyelid |
| `eye-nictitating.png` | Nictitating membrane drawn across the eye (correct) |
| `ear-pinna.png` | External ear / pinna |
| `ear-tympanum.png` | Flush circular tympanum behind the eye (correct) |

**Station 3 — Sexual Dimorphism**

| File | Answer it illustrates |
|---|---|
| `forelimb-standard.png` | Forelimb with four plain digits |
| `forelimb-pad.png` | Dark copulatory (nuptial) pad on the first digit (correct) |
| `throat-smooth.png` | Plain, unmodified throat |
| `throat-sacs.png` | Inflated paired vocal sacs (correct) |
| `hind-4.png` | Hind foot, four digits, no web |
| `hind-5.png` | Hind foot, five digits with a full web (correct) |

The two options in a pair should differ **only** in the feature being tested.
Drawing the same specimen twice and changing one structure is what makes the
question readable at a glance.

---

## `characters/` — 320 x 320 px, square, transparent PNG

| File | Used for |
|---|---|
| `frog-specimen.png` | Specimen in the menu jar. Dorsal (top-down) view, head up. |
| `frog-male.png` | Confirmed male specimen. Same pose, with vocal sacs and nuptial pads. |

---

## `background/` — optional, wide landscape PNG

Not shipped. If you add them, they replace the inline SVG scenery for that band
and are tiled horizontally for a parallax scroll, so the **left and right edges
must match seamlessly**.

| File | Suggested size | Notes |
|---|---|---|
| `pond-far.png` | 1400 x 300 | Farthest band. Distant bank silhouette, low contrast. |
| `pond-mid.png` | 1800 x 240 | Reeds and stems, mid tone. |
| `pond-near.png` | 2200 x 180 | Nearest band. Lily pads and silt line, darkest. |

All three sit at the bottom of the screen, anchored bottom-centre, scaled to
`auto 100%` of their band height. Keep the important detail in the lower half
and leave the top edge transparent so it blends into the water.
