# Periodic Odyssey — Art & Audio Asset Guide

Every image below is **optional to replace**. The game already ships with hand-drawn
brass/parchment vector + generated PNG art, and it will keep working with zero
internet access. Drop a file with the exact name/path shown here and the game
picks it up automatically on next load. If a file is missing, the game falls back
to its built-in art — nothing breaks.

All icons are square PNGs with transparent backgrounds unless noted. Sizes are the
recommended source resolution (the game scales them down); larger is fine.

---

## assets/images/elements/  — optional per-element art
Drop a PNG named after the element's chemical symbol to give that plate a custom
face. It is layered *behind* the symbol/number text as a cover image.

| File            | Size        | Orientation | Notes                                   |
|-----------------|-------------|-------------|-----------------------------------------|
| `H.png`, `Li.png`, `Na.png`, `Cl.png`, … | 256 x 256 | square | One per element symbol you want to skin. Any element in the game may have one. |

Fallback: category-tinted glowing vector plate (always present).

## assets/images/characters/  — the mentor
| File          | Size      | Orientation | Notes                                        |
|---------------|-----------|-------------|----------------------------------------------|
| `mentor.png`  | 320 x 320 | square/portrait | Bust of "Professor Aurum". Shown top-cropped in a round frame. Ships with a generated alchemist. |

## assets/images/background/  — optional backdrops
| File          | Size        | Orientation | Notes                                                |
|---------------|-------------|-------------|------------------------------------------------------|
| `menu.png`    | 1920 x 1080 | landscape   | Optional menu backdrop (currently a CSS candlelit scene). |
| `game.png`    | 1920 x 1080 | landscape   | Optional in-game backdrop.                           |

*(These are placeholders for future use; the CSS ambient background is the default.)*

## assets/images/ui/  — interface icons (ship with the game)
| File              | Size      | Purpose                                    |
|-------------------|-----------|--------------------------------------------|
| `crest.png`       | 240 x 240 | Title crest / menu button                  |
| `gear.png`        | 256 x 256 | Settings button                            |
| `close.png`       | 256 x 256 | Close overlay                              |
| `scroll.png`      | 256 x 256 | "Learn More" icon                          |
| `check.png`       | 256 x 256 | Chapter completed                          |
| `lock.png`        | 256 x 256 | Chapter locked                             |
| `star.png` / `star-empty.png` | 256 x 256 | Progress markers            |
| `sound-on.png` / `sound-off.png` | 256 x 256 | SFX toggle states       |
| `music-on.png` / `music-off.png` | 256 x 256 | Music toggle states     |

## assets/images/ui/emoji/  — icons replacing all emoji-equivalents
No emoji characters appear anywhere in the game. These PNGs are used instead and
are swapped by `src` when state changes.

| File                  | Size      | Replaces / Purpose                         |
|-----------------------|-----------|--------------------------------------------|
| `celebration.png`     | 256 x 256 | Victory burst (was a party emoji)          |
| `note.png`            | 256 x 256 | Floating musical note (was a note glyph)   |
| `badge-chaos.png`     | 256 x 256 | Chapter 1 badge / medallion                |
| `badge-triad.png`     | 256 x 256 | Chapter 2 badge / medallion                |
| `badge-octave.png`    | 256 x 256 | Chapter 3 badge / medallion                |
| `badge-mendeleev.png` | 256 x 256 | Chapter 4 badge / medallion                |
| `badge-modern.png`    | 256 x 256 | Chapter 5 badge / medallion                |

---

## assets/audio/  — background music (optional)
| File        | Format | Notes                                                                 |
|-------------|--------|-----------------------------------------------------------------------|
| `bgm.mp3`   | MP3    | **Optional.** If present, it loops as the background music and overrides the built-in procedural synth. If missing, the game generates an ambient pad in-browser via Web Audio — no file needed. Keep it seamless-looping and calm to match the alchemy-lab mood. |

Sound effects are always generated procedurally (Web Audio); no files required.
