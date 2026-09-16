# Name It Right! — Asset Guide

This game ships fully self-contained and **runs offline with zero internet access**.
Every visual element already has built-in vector/CSS/PNG art, so nothing here is required.
Everything below is **optional drop-in art**: place a file at the exact path/name and the
game will load it automatically; if the file is missing it silently falls back to the
built-in art. No code changes needed.

All PNGs should have a **transparent background** unless noted.

---

## 1. Character avatars  (optional overrides)

Default art lives in `images/ui/emoji/` and is always used unless you override it here.

Path: `assets/images/characters/`

| Filename                 | Represents                    | Size (px) | Shape / orientation      |
|--------------------------|-------------------------------|-----------|--------------------------|
| `avatar_biologist.png`   | Veer — Field Biologist        | 256 × 256 | Square, portrait, centered |
| `avatar_expert.png`      | Teja — Taxonomy Expert        | 256 × 256 | Square, portrait, centered |
| `avatar_lead.png`        | Head Scientist — Expedition Lead | 256 × 256 | Square, portrait, centered |

Shown inside a circular frame, so keep the face/subject centered with a little margin.

---

## 2. Background  (optional)

Path: `assets/images/background/`

| Filename        | Represents            | Size (px)         | Orientation |
|-----------------|-----------------------|-------------------|-------------|
| `jungle_bg.png` | Full-screen backdrop  | 1920 × 1080 (min) | Landscape   |

If present it fades in behind the panel (the animated leaves/fireflies keep drifting on top).
Use a darker image so light UI text stays readable. Any 16:9 image is cropped to cover.

---

## 3. UI icons / "emoji" replacements  (built-in — replace to reskin)

Path: `assets/images/ui/emoji/`  — all **128 × 128** (avatars 256 × 256).

| Filename            | Used for                                   |
|---------------------|--------------------------------------------|
| `leaf.png`          | Logo / brand emblem                        |
| `seed.png`          | Discovery-points (score) currency icon     |
| `compass.png`       | Settings button                            |
| `book.png`          | Menu button / "Learn More"                 |
| `magnifier.png`     | "How to Play" / current-site marker        |
| `play.png`          | Begin / Play Again                         |
| `arrow_right.png`   | Next Site                                  |
| `check.png`         | Correct-answer feedback                    |
| `cross.png`         | Wrong-answer feedback                      |
| `trophy.png`        | Victory screen                             |
| `badge_leaf.png`    | Completed-site badge (level select)        |
| `lock.png`          | Locked site (level select)                 |
| `music_on.png` / `music_off.png` | Music toggle states           |
| `sound_on.png` / `sound_off.png` | Sound-effects toggle states   |

To reskin the whole UI, just replace these PNGs at the same size/name.

---

## 4. Audio  (optional)

Path: `assets/audio/`

| Filename   | Represents             | Notes                                             |
|------------|------------------------|---------------------------------------------------|
| `bgm.mp3`  | Looping background music | If present, it **overrides** the built-in procedural music. If missing, the game synthesizes an ambient loop live via Web Audio (no file needed). |

Sound effects are always generated in-browser — no files required.

---

## Fonts  (bundled, do not remove)

`assets/fonts/` contains Cinzel (headings), Nunito (UI), and Lora italic (scientific names)
as local `.woff2` files. These are what make the game render identically offline.
