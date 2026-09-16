# Hemichordata Quest — "Tidal Cast"

An offline, single-file-tree browser game. Five riddles on hemichordate
anatomy, played as a descent down an acorn worm's U-shaped burrow at low tide.

The riddles, the accepted answers and the hints are reproduced exactly from the
original `hemichordata_quest.html`. Nothing in this build changes what counts
as a correct answer.

---

## Running it

Open `index.html`. Everything is local and relative — no CDN, no Google Fonts,
no network access of any kind.

`file://` works, but a local HTTP server is recommended (some browsers restrict
`localStorage` and font loading on `file://`):

```bash
npx serve .
```

---

## Theme

| | |
|---|---|
| **Source** | The coiled sand cast an acorn worm voids at its burrow exit — a trace no other phylum leaves |
| **Value structure** | Dark wet-mud panels on a **light** sunlit silt base |
| **Base palette** | silt `#efe6d6` · wet sand `#d9c9ac` · sand shadow `#9c8862` |
| **Panel material** | mud-slate `#2c332f` -> `#171d1b`, slick mucus gloss, sand-ripple grain |
| **Accents** | cast-ochre `#d98f3c` / `#f5c073` · sea-glass `#6fbfa0` / `#a8e3cd` · tide-rust `#b4472f` |
| **Display type** | Fraunces 700 / 900 |
| **Body type** | Karla 400 / 600 / 700 |

---

## Folder layout

```
hemichordata_quest/
  index.html
  README.md
  css/style.css
  js/    data.js  storage.js  audio.js  fx.js  game.js
  assets/
    fonts/            5 .woff2 files
    audio/            (empty — optional bgm.mp3 goes here)
    images/
      characters/     420x420 round-masked PNGs used in play
      reference/      full-size JPGs used in Learn More
      ui/emoji/       23 PNG icons — no emoji characters anywhere
```

---

## Replaceable assets

Every path below is relative to the folder root. **Drop a file in with the exact
name and it is picked up; delete it and the listed fallback takes over.** Nothing
here is required for the game to run.

### Specimen photographs — gameplay (`assets/images/characters/`)

Square, **420 × 420 px**, PNG with alpha. These are shown as circular discs on the
burrow map and as the large plate in the riddle console, so the subject must be
centred and the corners should fade out (the supplied files carry a soft circular
alpha edge). Anything non-square will be centre-cropped by CSS `object-fit: cover`.

| File | Shown at | Optional | Falls back to |
|---|---|---|---|
| `saccoglossus.png` | Chambers 1 and 4 | yes | Drawn SVG acorn worm |
| `balanoglossus.png` | Chamber 2 | yes | Drawn SVG acorn worm |
| `proboscis_gland.png` | Chamber 3 | yes | Drawn SVG opened proboscis |
| `gill_slits.png` | Chamber 5 | yes | Drawn SVG trunk with gill pores |

### Specimen photographs — Learn More (`assets/images/reference/`)

**Landscape or square, up to 1100 px on the long edge**, JPG. Displayed as a
circular crop (`aspect-ratio: 1/1; object-fit: cover`), so keep the subject
central.

| File | Optional | Falls back to |
|---|---|---|
| `balanoglossus.jpg` | yes | Drawn SVG stand-in |
| `saccoglossus.jpg` | yes | Drawn SVG stand-in |
| `gill_slits.jpg` | yes | Drawn SVG stand-in |
| `proboscis_gland.jpg` | yes | Drawn SVG stand-in |

### Interface icons (`assets/images/ui/emoji/`)

All **square, 192 × 192 px PNG with alpha**, except `logo.png` which is
**512 × 512**. They are drawn light-on-dark and always sit on a dark mud panel.
All 23 are optional in the sense that a missing file simply shows a broken-image
gap — the game still plays — but there is no drawn fallback for icons, so keep
them present.

| File | Used for |
|---|---|
| `logo.png` (512²) | Boot, menu, HUD, browser tab icon |
| `currency.png` | Sand-grain counter, flying grains, purse strip |
| `cast.png` | Cleared-chamber marker, "clean casts" stat |
| `marker.png` | Active-chamber marker |
| `lock.png` | Locked-chamber marker |
| `hint.png` | Hint button, hint feedback |
| `correct.png` | Check-answer button, correct feedback |
| `wrong.png` | Wrong feedback, reset button |
| `sound_on.png` / `sound_off.png` | SFX toggle (HUD + Settings) |
| `music_on.png` / `music_off.png` | Music toggle (HUD + Settings) |
| `settings.png` | Settings buttons |
| `help.png` | How to Play button |
| `book.png` | Learn More button |
| `trophy.png` | Records card, end screen |
| `star_filled.png` / `star_empty.png` | Cast rating, 3 tokens |
| `play.png` | Boot and menu start buttons |
| `home.png` | Main-menu buttons |
| `replay.png` | Descend-again button |
| `close.png` | Modal close buttons |
| `tide.png` | Timer, reduced-motion row |

### Fonts (`assets/fonts/`)

Copied locally from the npm packages `@fontsource/fraunces` and
`@fontsource/karla`. Replaceable with any `.woff2` at the same filename.

`fraunces-700.woff2`, `fraunces-900.woff2`,
`karla-400.woff2`, `karla-600.woff2`, `karla-700.woff2`

If a file is missing the CSS falls back to Georgia (display) and Segoe UI /
system sans (body).

### Music (`assets/audio/`)

| File | Optional | Falls back to |
|---|---|---|
| `bgm.mp3` | **yes — not shipped** | A procedural Web Audio bed: a slow tidal noise surge, a low D-minor pad, and sparse pentatonic drips |

Drop in any looping `bgm.mp3` and it takes over automatically. **Its absence
produces one expected `404` in the server log — that is the only acceptable
404.** Sound effects are always synthesised; there are no SFX files.

---

## How the game is put together

**Screens.** Boot (with a real asset preloader) -> main menu -> game -> end screen.
Settings is a modal reachable from both the menu and the HUD.

**How to Play** (main menu) covers controls, objective and the grain economy only.
**Learn More** (end screen) carries all conceptual and reference material. The two
are kept strictly separate.

**Progression.** Five chambers sit along an SVG burrow path, each with
locked / active / cleared states. Cleared chambers are stamped with a coiled
cast; the active one is lit and flagged. A Balanoglossus token crawls the tunnel
between them with a peristaltic wobble, and always rests in open tunnel between
two discs. On the last answer an exit shaft opens and a cast mound erupts on the
surface.

**Currency.** Sand grains. 100 for a chamber cleared first try, 60 if the hint was
used, minus 20 per wrong answer, never below 20. Grains physically fly from the
purse strip into the HUD counter. The total drives a three-token cast rating
(3 at 460+, 2 at 320+).

**Saved to `localStorage`** (key `hemichordata_quest.scores.v1`): best grains,
best rating, best time, descent count, completions. Preferences live in a
separate key (`hemichordata_quest.prefs.v1`) so **Reset records clears scores and
keeps your audio and motion settings**. If storage is unavailable the game says
so and keeps records in memory for the session.

**Motion.** Honours `prefers-reduced-motion`, and Settings has its own override.
Reduced motion stops the drifting grit, particle bursts, travelling highlights
and the crawl animation; everything else still works.

**Input.** Pointer Events throughout, so touch and mouse behave identically.
Pinch-zoom, double-tap zoom, text selection and overscroll are disabled — except
inside the answer field, which stays selectable and editable.

---

## Verified

- `node --check` clean on all five JS files.
- Zero external URLs (only the SVG XML namespace declaration, which is never fetched).
- Zero emoji characters in any HTML/CSS/JS file.
- All 63 asset references resolve on disk; every path relative.
- Full run played over HTTP at 2000 × 911 and 390 × 844: correct answer, wrong
  answer, hint, both modals, end screen, Learn More, replay, records.
- `scrollWidth === innerWidth` and `scrollHeight === innerHeight` at both sizes —
  no scrollbars on either axis.
- Play field 735 × 735 px at 2000 × 911 (81 % of viewport height, 29.7 % of
  viewport area); the whole stage occupies 80 % of viewport width.
- Worm token never overlaps console or HUD content: 212–633 px clear at desktop,
  72–285 px clear at 390 × 844.
- Console clean; the only 404 is the intentional `assets/audio/bgm.mp3`.
