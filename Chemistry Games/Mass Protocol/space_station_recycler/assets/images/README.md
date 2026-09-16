# Drop-in Art Assets

Every file below is **optional**. The game already ships with working vector/emoji
art for all of these slots. If a file listed here is missing, unreadable, or the
wrong name, the game silently keeps its built-in art — nothing breaks. To swap in
your own art, save a file with the *exact* filename and folder shown, matching the
size/orientation, and reload the game.

No code changes are needed. Images are picked up automatically by `assets/js/game.js`
on load via the `data-img` attributes in `index.html`.

## characters/ (floating bonus astronauts)

Transparent PNG, square, front-facing, character centered with margin so it isn't
cropped when it rotates in flight.

| Filename | Size | Notes |
|---|---|---|
| `astronaut_blue.png` | 200×200 px | Bonus sprite #1 (blue visor accent in the fallback art) |
| `astronaut_green.png` | 200×200 px | Bonus sprite #2 (green visor accent) |
| `astronaut_amber.png` | 200×200 px | Bonus sprite #3 (amber visor accent) |

## background/ (ambient decoration — never affects hitboxes)

| Filename | Size | Orientation | Notes |
|---|---|---|---|
| `nebula_layer.png` | 1920×1080 px | Landscape | Full-bleed backdrop, rendered behind the starfield at ~50% opacity. Should look fine cropped/scaled to any screen ratio (object-fit: cover). |
| `station_silhouette.png` | 1920×400 px | Wide landscape, transparent PNG | Anchored to the bottom edge of the screen, drawn at ~60% opacity. Keep the silhouette in the lower half of the canvas with transparent sky above it. |

## ui/ (logo + resource icons)

| Filename | Size | Orientation | Notes |
|---|---|---|---|
| `logo.png` | 512×160 px | Landscape, transparent PNG | Wordmark/logo shown on the boot screen and main menu, replacing the emoji text title. |
| `icon_water.png` | 64×64 px | Square, transparent PNG | Small icon shown next to the "H₂O" resource label. |
| `icon_oxygen.png` | 64×64 px | Square, transparent PNG | Small icon shown next to the "O₂" resource label. |
| `icon_wastewater.png` | 64×64 px | Square, transparent PNG | Small icon shown next to the "Waste H₂O" label. |
| `icon_co2.png` | 64×64 px | Square, transparent PNG | Small icon shown next to the "CO₂" label. |
| `icon_solid.png` | 64×64 px | Square, transparent PNG | Small icon shown next to the "Solid" waste label. |

## Format tips

- Use PNG with transparency for anything that isn't a full-screen background.
- Keep file sizes reasonable (a few hundred KB max) — everything is loaded at boot with zero network access, so large files slow down startup.
- Filenames are case-sensitive on most platforms; match them exactly.
