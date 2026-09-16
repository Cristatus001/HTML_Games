# Image assets — Moss Sporefall

Every sprite in this game is **drawn procedurally on the canvas**. Nothing here is
required for the game to run.

Drop a PNG at any of the exact paths below and the game picks it up automatically
on the next reload. Delete it again and the built-in vector art comes back. A
missing file is never an error — the loader records it as absent and moves on.

> While the optional files are absent, the browser console logs a 404 for each of
> them on startup. That is expected and harmless: it is how the game probes for
> drop-in art. Add the files and the 404s disappear.

---

## Conventions

* **Format:** PNG with transparency (RGBA). No JPEG — most of these need an alpha channel.
* **Colour:** sRGB.
* **Sizes below are the recommended pixel dimensions.** The game scales everything
  to fit its own layout, so a larger image still works; it is just wasted bytes.
  Supply roughly **2x** the listed size if you want the art to stay crisp on a
  high-DPI phone.
* **Orientation / anchor:** unless stated otherwise, artwork is drawn **centred**
  on the object's position. Leave the subject centred in the canvas with a few
  transparent pixels of padding so glows are not clipped.
* Paths are relative to the game folder and are **case-sensitive** on Android.

---

## 1. Player — `assets/images/characters/`

| Filename | Size (px) | Orientation | Notes |
|---|---|---|---|
| `spore.png` | 128 x 128 | square, centred | The drifting moss spore. Round, glowing, cilia radiating outward. Faces no particular direction. |
| `spore_hurt.png` | 128 x 128 | square, centred | Damaged state, shown while invulnerable after a hit. Same silhouette, drained/dim colour. |
| `protonema.png` | 256 x 160 | landscape, **bottom-centre anchored** | Branching green filaments spreading from the landing point. Drawn during the germination sequence. |
| `gametophyte.png` | 200 x 240 | portrait, **bottom-centre anchored** | The leafy moss shoot that rises at the end of a successful descent. Base of the stem at the bottom edge. |

## 2. Collectibles — `assets/images/collectibles/`

| Filename | Size (px) | Orientation | Notes |
|---|---|---|---|
| `dew_orb.png` | 128 x 128 | square, centred | The fact-carrying dew orb. Should read as a lit sphere of water. Bright, high contrast against dark green. |
| `moisture_drop.png` | 112 x 128 | portrait, centred | The moisture restore pickup. Teardrop, point upward. |

## 3. Hazards — `assets/images/hazards/`

| Filename | Size (px) | Orientation | Notes |
|---|---|---|---|
| `fern_frond.png` | 144 x 144 | square, centred | A fern frond. Must read clearly as **not a moss**. Rotates gently in play. |
| `gymno_cone.png` | 144 x 144 | square, centred | A gymnosperm cone. Upright, long axis vertical. |
| `flower_bloom.png` | 144 x 144 | square, centred | An angiosperm flower, face-on. |
| `rock_spur.png` | 220 x 160 | landscape, centred | A stone ledge jutting from the canyon wall. **Draw it pointing right**; the game mirrors it for the left wall. |

## 4. Background — `assets/images/background/`

Background layers tile **vertically** and are stretched to 120% of the canvas
width. Make the top and bottom edges match so the seam is invisible.

| Filename | Size (px) | Orientation | Notes |
|---|---|---|---|
| `zone1_far.png` | 1024 x 1024 | square, vertically tileable | Zone 1 distant canopy silhouette. Low contrast, cool green. |
| `zone1_mid.png` | 1024 x 1024 | square, vertically tileable | Zone 1 mid-distance trees. |
| `zone2_far.png` | 1024 x 1024 | square, vertically tileable | Zone 2 (damp rocks), blue-teal. |
| `zone2_mid.png` | 1024 x 1024 | square, vertically tileable | Zone 2 mid layer. |
| `zone3_far.png` | 1024 x 1024 | square, vertically tileable | Zone 3 (peat bog), warm amber-brown. |
| `zone3_mid.png` | 1024 x 1024 | square, vertically tileable | Zone 3 mid layer. |
| `wall_left.png` | 256 x 1024 | portrait, vertically tileable | Reserved for a future textured canyon wall. Mossy edge on the **right** side. |
| `wall_right.png` | 256 x 1024 | portrait, vertically tileable | Mirror of the above; mossy edge on the **left** side. |
| `landing_ground.png` | 1280 x 400 | landscape, **top edge is the moss surface** | The damp ground at the bottom of a zone. Stretched to full canvas width. |

## 5. Effects — `assets/images/effects/`

| Filename | Size (px) | Orientation | Notes |
|---|---|---|---|
| `spark.png` | 64 x 64 | square, centred | Particle sprite for collect and impact bursts. White/very light so it can be tinted. |
| `mist_puff.png` | 256 x 256 | square, centred | Soft fog blob. Mostly transparent, feathered edges. |

## 6. UI icons — `assets/images/ui/emoji/`

**These are already supplied** and are used by the interface as `<img>` tags —
the game contains no emoji characters anywhere. Replace any file in place to
restyle the UI; keep the same filename and a square canvas.

All are **128 x 128 px, square, centred**.

| Filename | Used for |
|---|---|
| `dew-drop.png` | A remaining point of moisture (the life counter) |
| `dew-drop-empty.png` | A spent point of moisture |
| `spore.png` | Fact / collectible counter |
| `moss-leaf.png` | The moss-fact toast |
| `capsule.png` | Score (a sporophyte capsule) |
| `award.png` | Successful result screen crest |
| `warning.png` | Failed result crest, and the "not a moss" toast |
| `check.png` | A fact that was collected |
| `lock.png` | A locked zone, and an uncollected fact |
| `star-filled.png` / `star-empty.png` | Zone rating |
| `play.png`, `pause.png`, `restart.png`, `home.png`, `back.png`, `close.png` | Navigation |
| `settings.png` | Settings (a fern fiddlehead) |
| `guide.png` | How to Play |
| `journal.png` | Learn More |
| `music-on.png` / `music-off.png` | Music toggle |
| `sound-on.png` / `sound-off.png` | Sound-effects toggle |
| `depth.png` | Depth gauge and the dive pad |
| `arrow-left.png` / `arrow-right.png` | Steering pads |

Icons whose state is swapped at runtime (moisture, music, sound, stars, check/lock)
are changed by setting the `<img>` element's `src`, never by writing text.

---

## Adding new art safely

1. Match the filename and folder exactly.
2. Keep the subject centred with transparent padding.
3. Reload. If the file loads, it replaces the vector art; if not, nothing breaks.

The full path list also lives in `js/assets.js` (`MANIFEST`), which is the single
source of truth if the two ever disagree.
