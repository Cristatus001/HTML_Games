# Image assets

Every image here is **optional**. The game probes for each file at boot; when a
file is missing it draws its built-in vector/canvas art instead, so nothing
breaks. Drop a replacement in with the exact filename below and it is used on
the next reload — no code change needed.

All shipped PNGs were generated from hand-authored SVG by `tools/make_icons.mjs`.
Re-run that script to regenerate them (see the main README).

Transparent PNG is expected everywhere. Sizes are the *rendered* sizes the game
draws at, doubled where useful for high-DPI screens; larger files are fine, the
game scales them down.

---

## characters/ — the player frog

| File | Size | Orientation | Notes |
|---|---|---|---|
| `frog-idle.png` | 192 x 192 | facing **right**, feet at the bottom edge | shown while grounded |
| `frog-jump.png` | 192 x 192 | facing right, stretched upward | shown while rising |
| `frog-fall.png` | 192 x 192 | facing right, squashed/limbs out | shown while falling |

The sprite is drawn 66 px wide (1.65 x the 40 x 40 hitbox) and bottom-aligned to
the frog's feet, so keep the character centred horizontally and standing on the
bottom edge of the canvas. Left-facing frames are produced by mirroring — do not
supply separate ones. Hitboxes never change with the artwork.

## questions/ — quiz illustrations

Square 256 x 256, one per anatomy topic. Shown inside a round port-hole frame at
about 168 px, so keep the subject inside a centred circle and avoid detail in
the corners.

`blood` `bone` `brain` `camouflage` `cloaca` `eggs` `eye` `foot` `gut` `heart`
`hibernation` `kidney` `liver` `lungs` `muscle` `nerve` `portal` `prey` `skin`
`sperm` `sun` `tadpole` `testes` `tongue` `tympanum` `urea` `water`

e.g. `questions/heart.png`. Missing file -> a numbered glowing orb is drawn.

## orbs/ — the same topics, in-world

Square 72 x 72, same names as `questions/`. Drawn inside the floating Knowledge
Orb at about 32 px, so these must read at small sizes: bold shapes, thick
strokes, high contrast. Missing file -> the orb shows its number instead.

## ui/emoji/ — every interface icon

Square 128 x 128. These replace what would otherwise be emoji characters; the
game references them as `<img>` tags and swaps `src` for state changes
(mute/unmute, happy/worried, sealed/unsealed), never text.

| File | Used for |
|---|---|
| `play.png` `pause.png` `replay.png` | start / pause / restart |
| `home.png` `close.png` `info.png` | navigation |
| `settings.png` | settings (lily-pad cog) |
| `sound-on.png` `sound-off.png` | SFX toggle states |
| `music-on.png` `music-off.png` | music toggle states |
| `lock.png` `unlock.png` | zone locked / unlocked |
| `star-filled.png` `star-empty.png` | lotus seals earned / not earned |
| `orb.png` | Knowledge Orb (HUD counter, quiz badge) |
| `check.png` `cross.png` | correct / wrong markers |
| `trophy.png` | zone cleared |
| `journal.png` | Learn More |
| `clipboard.png` | How to Play |
| `arrow-left.png` `arrow-right.png` `arrow-up.png` | touch pads, next zone |
| `key-left.png` `key-right.png` `key-space.png` | keyboard caps in How to Play |
| `frog-happy.png` `frog-worried.png` | quiz feedback faces |
| `timer.png` | run timer |
| `objective.png` | dragonfly objective marker |
| `hots.png` | HOTS question badge |
| `zone-1.png` `zone-2.png` `zone-3.png` | zone crests |

If one of these is missing the `<img>` simply renders empty — the layout and all
buttons still work, but supplying them is recommended.

## background/ — scenery props

Shipped (used if present, vector fallback if not):

| File | Size | Orientation |
|---|---|---|
| `lilypad.png` | 256 x 128 | top-down pad, wedge notch to the right |
| `cattail.png` | 128 x 384 | single reed, stem rooted at the bottom edge |
| `dragonfly.png` | 192 x 128 | side view, head to the **right** (mirrored in flight) |
| `log.png` | 384 x 128 | horizontal log, cut end to the right |

Optional drop-in slots — **not shipped**, so the game logs a 404 for each at
boot and uses its procedural art. That is expected, not an error. Add any of
them to take over that layer:

| File | Size | Notes |
|---|---|---|
| `sky.png` | 1920 x 1080 | replaces the gradient sky |
| `hills.png` | 1920 x 600 | far parallax silhouette |
| `canopy.png` | 1920 x 400 | overhead foliage band |
| `water.png` | 1920 x 400 | water surface band |
| `platform-tile.png` | 256 x 64 | ledge skin, stretched per platform |
