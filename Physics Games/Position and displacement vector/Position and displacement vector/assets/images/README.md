# Image assets — Vector Explorer: Sky Realm

Every file listed here is **optional**. The game ships with complete
procedural vector/canvas art and CSS materials, and it checks for each image at
boot. If a file is missing the built-in art is drawn instead — nothing breaks,
no console errors, no broken-image icons. Drop a file in with the exact name and
the game picks it up on the next reload.

- **Format:** PNG with alpha (24-bit + alpha). No other extension is looked for.
- **Orientation:** landscape unless a portrait/square size is given below.
- **Naming:** exact, lowercase, no spaces. Paths are relative to this folder.
- **Sizes** are the recommended source size. Everything is scaled to fit at
  runtime, so larger is safe; these sizes are chosen so a 2× display stays crisp.

---

## background/ — parallax sky layers

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `sky.png` | 2560 × 1440 | landscape | Full-screen backdrop. Replaces the dusk gradient entirely; it is stretched to the viewport, so keep detail loose and avoid text. Dark at the top, warm near the bottom reads best. |
| `clouds_far.png` | 900 × 380 | landscape | One cloud clump, transparent around it. Tiles horizontally as the slowest parallax layer. |
| `clouds_mid.png` | 1200 × 500 | landscape | One cloud clump. Middle parallax speed. |
| `clouds_near.png` | 1600 × 660 | landscape | One large, soft, warm-lit clump. Fastest layer, drawn low and faint. |
| `cloud_sea.png` | 2560 × 460 | landscape (wide strip) | The rolling cloud floor along the bottom edge. **Must tile seamlessly from left to right** — the left and right edges are butted against each other. |
| `horizon.png` | 640 × 384 | landscape | A single distant island silhouette in haze. Three copies drift at different speeds. Keep it low contrast. |

## islands/ — the interactive islands

Drawn centred on the island's hit point, at `2.4 × radius` square. The **grass
line must sit at 42% from the top** of the image, because that horizontal line
is the island's actual position — the point every vector measures to. Rock hangs
below it, nothing important above it.

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `island_idle.png` | 256 × 256 | square | Neutral island. Also used as the fallback for the two below if they are absent. |
| `island_start.png` | 256 × 256 | square | Start island. Theme it **sky blue** to match `r_initial`. |
| `island_target.png` | 256 × 256 | square | Destination island. Theme it **gold** to match `r_final`. |

The hit radius stays a circle around the grass-line centre regardless of the
artwork, so decorative overhangs will not change where the player must tap.

## characters/

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `airship.png` | 512 × 256 | landscape | The ambient airship drifting across the high sky. Should face **left** (its direction of travel). Drawn semi-transparent. |
| `navigator.png` | 224 × 320 | portrait | Optional figure standing at the origin. Anchored **bottom-centre** on the origin point — feet at the very bottom edge of the image. Purely decorative; the crosshair marker still draws. |

## effects/

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `spark.png` | 64 × 64 | square | Reserved for a custom particle sprite. Particles currently use a generated radial glow. |

## ui/emoji/ — icon set (these files ship with the game)

These are **not** optional decoration — they are the game's icons, used in place
of emoji characters everywhere in the interface. They are generated as real PNG
files (128 × 128, square, transparent) and referenced with `<img>` tags. Icon
state changes swap the `src` attribute; no emoji text is ever set.

| File | Used for |
|---|---|
| `airship.png` | Begin-flight button, boot mark, marker moored above the start island |
| `arrow_right.png` | Forward actions (Analyse Course, Next Mission) |
| `book.png` | How to Play, Learn More, Flight Log heading |
| `check.png` | Correct answer verdict |
| `close.png` | Close buttons |
| `compass.png` | Title mark, Field Manual heading, straightness stat, favicon |
| `cross.png` | Wrong answer verdict |
| `flag.png` | Finish flag over the target island, "Finish Training" |
| `helm.png` | Settings, Debriefing heading |
| `island.png` | Chart-key swatch |
| `lantern.png` | Hint (replaces the lightbulb glyph) |
| `medal.png` | Certification screen (replaces the medal glyph) |
| `music_on.png` / `music_off.png` | Music lever state |
| `sfx_on.png` / `sfx_off.png` | Sound-effects lever state |
| `origin.png` | Chart key / position-vector concept |
| `path.png` | Path-distance stat and concept |
| `refresh.png` | Generate a new chart |
| `star_on.png` / `star_off.png` | Mission progress pips |
| `vector.png` | Displacement stat and concept |

Replacing one is safe as long as the filename and square aspect are kept.

---

## Adding art without breaking anything

1. Drop the PNG at the exact path, e.g. `assets/images/islands/island_idle.png`.
2. Reload. The boot screen reports how many custom art files it found.
3. To go back to the built-in art, delete or rename the file.

Loading is done by `Assets.loadAll()` in `js/core.js`; the manifest of optional
paths lives in `Assets.optional`. Each entry resolves to `null` on failure and
every draw call checks for `null` first.

## Icons added by the flight redesign

Same 128 x 128 square PNG rules as the table above. All are referenced as
<img> tags or drawn to canvas; no emoji characters appear anywhere in the UI.

| File | Used for |
|---|---|
| crystal.png | Sky crystals (cargo pickups) and the cargo HUD pips |
| spire.png | Dead spires - the always-lethal obstacle |
| gate.png | Storm gate while it is charged and lethal |
| wind.png | Crosswind indicator, Learn More card |
| fuel.png | Fuel strip in the HUD, mission brief chip |
| coin.png | Gold reward on the debrief and hangar |
| xp.png | Pilot rank / experience |
| trophy.png | Badges screen and best-score row |
| hangar.png | Spare, for a future hangar screen |
| target.png | Star-condition marks and the Two Frames target |
| storm.png | Moving storm cells and the mission-lost screen |
