# Drop-in artwork

Every visual in this game is drawn with CSS and inline SVG, so the folder below
works completely empty. Each file listed here is **optional**: drop a PNG in at
the exact path and the game picks it up on the next load. Delete it and the
vector art comes straight back. Nothing breaks either way.

The one exception is `ui/emoji/` — those files ship with the game and are
**required**. They replace what would otherwise be emoji characters, and the
game references them directly as `<img src>`.

All paths are relative to `assets/images/`.

---

## items/ — things the player interacts with

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `morsel.png` | 256 × 256 | square | Replaces the CSS food blob. Stretched to the morsel box (118 px desktop, 96 px phone), so keep the art centred and roughly circular. Transparent background. The label is drawn on top by the game — keep the middle 60% light and low-contrast or the text becomes unreadable. **Must not hint at whether a morsel is correct**; every morsel on screen shares this one image. |
| `morsel_good.png` | 256 × 256 | square | Reserved for a future "eaten" state. Not wired up yet; safe to add. |
| `morsel_bad.png` | 256 × 256 | square | As above, for the spat-out state. |
| `basket.png` | 400 × 336 | landscape, 100:84 | The collecting basket, bottom-right. Drawn inside a `clamp(88px, 15vw, 128px)` box. Transparent background, no drop shadow (the game adds a glow and shadow). |

## background/ — scene layers

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `bg_menu.png` | 1920 × 1080 | landscape | Shown behind the main menu. Applied with `background-size: cover`, so keep anything important away from the edges. |
| `bg_shallows.png` | 1920 × 1080 | landscape | Dive 1 water tint. |
| `bg_kelp.png` | 1920 × 1080 | landscape | Dive 2. |
| `bg_twilight.png` | 1920 × 1080 | landscape | Dive 3. |
| `bg_trench.png` | 1920 × 1080 | landscape | Dive 4. |
| `godrays.png` | 1920 × 1200 | landscape | Light shafts overlay. Applied `cover`, anchored to the top. Should be mostly transparent with soft white/cyan shafts. |
| `seafloor.png` | 2000 × 560 | wide landscape | Sand bank and coral along the bottom. Anchored to `bottom center` at `100% auto`, so the width is stretched to the screen — design it wide and shallow. Transparent above the sand line. |

## characters/ — ambient sea life

These drift across the scene as decoration. They never affect gameplay or
hitboxes. Each is drawn at a fixed CSS width with `height: auto`, so match the
aspect ratio and the height follows.

| File | Size (px) | Orientation | Drawn at |
|---|---|---|---|
| `fish_small.png` | 216 × 120 | landscape, 9:5 | 54 px wide. **Must face right** — the game mirrors it with `scaleX(-1)` for the leftward swimmers. |
| `fish_large.png` | 368 × 184 | landscape, 2:1 | 92 px wide. Facing right. |
| `jellyfish.png` | 184 × 288 | portrait, 23:36 | 46 px wide. Bell at the top, tentacles trailing down. |
| `turtle.png` | 320 × 200 | landscape, 8:5 | Reserved slot — recognised by the loader, not yet placed in a layer. |
| `diver.png` | 512 × 512 | square | Reserved slot for a full diver character. |
| `guide_fish.png` | 520 × 336 | landscape, 130:84 | **Finn, the player's guide** — replaces the cursor. **Must face right**; the game mirrors him with `scaleX(-1)` when he swims left, and rotates him up to ±32° to bank into turns. Draw him centred in the canvas with no shadow (the game adds a glow and shadow), nose near the right edge, tail near the left. |

## ui/ — chrome textures

| File | Size (px) | Orientation | Notes |
|---|---|---|---|
| `panel.png` | 800 × 600 | landscape | Reserved slot for a panel background plate. |
| `hud_plate.png` | 400 × 120 | landscape | Reserved slot for the HUD plate backing. |
| `title_logo.png` | 1200 × 480 | landscape | Reserved slot for a painted title lockup. |

---

## ui/emoji/ — shipped icon set (required, do not delete)

Real PNG icons standing in for every emoji the interface would otherwise use.
All are **128 × 128, square, transparent**. Icons that represent a state are
swapped by changing the `src` attribute in JavaScript — never by writing a
character into `textContent`.

| File | Used for |
|---|---|
| `algae.png` | Kelp frond — field-note seal, Field Journal bullets |
| `back.png` | Back / previous |
| `basket.png` | Browser tab icon |
| `morsel.png` | A single food morsel — boot screen mark |
| `celebrate.png` | Result crest for a 1- or 2-starfish dive |
| `check.png` | Correct answer, confirm buttons |
| `close.png` | Close a panel |
| `combo.png` | Ambient Motion setting (swirling current) |
| `cross.png` | Wrong answer, "not from algae" list |
| `diver.png` | How to Play (dive mask and snorkel) |
| `fish.png` | Finn — the HUD size gauge, How to Play, and the result readout |
| `gem.png` | Score readout (pearl) |
| `home.png` | Main menu (anchor) |
| `info.png` | Spare — general information marker |
| `learn.png` | Learn More (rolled sea chart) |
| `lock.png` | Locked dive |
| `music_on.png` / `music_off.png` | Music toggle — **state pair** |
| `next.png` | Next dive |
| `play.png` | Start / resume |
| `replay.png` | Retry, reset |
| `settings.png` | Settings (ship's helm) |
| `sound_on.png` / `sound_off.png` | Sound-effects toggle — **state pair** |
| `star_on.png` / `star_off.png` | Starfish rating — **state pair** |
| `target.png` | Morsels-eaten gauge (a cluster of three) |
| `trophy.png` | Result crest for a flawless dive (pearl in a clam) |
| `wave.png` | Title flourish |

If you replace any of these, keep the filename, the 128 × 128 square canvas and
the transparent background. State pairs must stay visually distinct at 26 px,
since that is how small they render in the HUD.

---

## How the fallback works

`js/assets.js` loads each optional path into an `Image` at boot and records
whether it decoded. A missing file resolves to `null` and the game keeps its
vector art. This means **you will see 404s in the developer console for every
slot you have not filled** — that is the probe doing its job, not an error.
