# Optional artwork

The game is **complete without any of the files listed on this page.** Every
visual element is drawn with CSS and inline SVG, so an empty `background/`,
`characters/` and `organs/` folder is the normal, shipped state.

Each slot below is *probed* at boot. If the file is present and decodes, it is
swapped in. If it is missing, the probe fails silently and the vector art stays
on screen. You can therefore drop art in one file at a time, in any order, and
nothing breaks in between — reload the page and the new file appears.

- **Format:** PNG with alpha (24-bit + alpha). Filenames are case-sensitive and
  must match exactly.
- **Backgrounds** are cropped with `cover`, so keep important content near the
  centre and allow the edges to be trimmed.
- **Plates and characters** are letterboxed with `contain`, so they are never
  cropped, but transparent padding around the subject will show as empty space.
- Keep files as small as you reasonably can; this runs inside a mobile WebView.

---

## `background/` — one backdrop per screen

Landscape. These sit behind everything and are dimmed by an overlay, so a
mid-to-dark image reads best; a bright one will fight the HUD.

| File | Size (px) | Orientation | Where it appears |
|---|---|---|---|
| `bg_menu.png` | 1920 x 1080 | landscape | Boot splash and main menu |
| `bg_lab.png` | 1920 x 1080 | landscape | During the case studies |
| `bg_dossier.png` | 1920 x 1080 | landscape | Case Dossier screen |
| `bg_result.png` | 1920 x 1080 | landscape | Results / evaluation screen |
| `godrays.png` | 1920 x 1080 | landscape | Extra light-shaft overlay layer, screen-blended over the whole stage. Needs large transparent areas — a fully opaque image will hide the background. |

## `characters/` — the specimen

Square, subject centred, transparent background.

| File | Size (px) | Orientation | Where it appears |
|---|---|---|---|
| `frog_idle.png` | 512 x 512 | square | Menu title mark (replaces the drawn frog beside the logo) |
| `frog_correct.png` | 256 x 256 | square | Verdict badge after a correct answer (replaces the tick) |
| `frog_wrong.png` | 256 x 256 | square | Verdict badge after a wrong answer (replaces the cross) |

## `organs/` — anatomical plate, one per discipline

Landscape, roughly 5:3. Shown inside the specimen slide above the question
text. The file is chosen by the discipline of the current case, so a single
file covers every case that shares that system.

| File | Size (px) | Orientation | Cases that use it |
|---|---|---|---|
| `comparative.png` | 600 x 360 | landscape | 1 — intestinal length |
| `surgical.png` | 600 x 360 | landscape | 2 — gall bladder |
| `environment.png` | 600 x 360 | landscape | 3 — cutaneous respiration |
| `circulatory.png` | 600 x 360 | landscape | 4 and 9 — heart, sinus venosus |
| `urogenital.png` | 600 x 360 | landscape | 5 and 6 — male / female ducts |
| `systemic.png` | 600 x 360 | landscape | 7 — testes to cloaca |
| `neural.png` | 600 x 360 | landscape | 8 — tympanum and balance |
| `ecological.png` | 600 x 360 | landscape | 10 — crop yield |

## `ui/` — optional panel skins

These layer *underneath* the gloss highlight and above the base gradient, so
the moulded edges and bevels survive the swap. They are stretched with `cover`
over whatever the element's size happens to be, so use a texture or a
nine-slice-friendly plate rather than art with a fixed focal point.

| File | Size (px) | Orientation | Where it appears |
|---|---|---|---|
| `panel.png` | 1024 x 640 | landscape | Every framed panel (brief, dossier, results) |
| `hud_plate.png` | 512 x 192 | landscape | The case and score plates in the HUD |
| `option_plate.png` | 768 x 160 | landscape | Answer buttons |
| `title_logo.png` | 1200 x 400 | landscape | Replaces the whole menu title lock-up (logo + wordmark). Supply the complete artwork, including the game name. |

---

## `ui/emoji/` — the icon set (already supplied, not optional)

This folder holds the 32 PNG icons the interface uses in place of emoji
characters. **The game references these directly and expects them to exist.**
They are not fallback art, so do not delete them; replace them in place if you
want a different look, keeping the filenames and roughly the same square
dimensions.

Interface icons (96 x 96, except where noted):

`arrow-left` `arrow-right` `badge` (128) `beaker` `check` `clipboard` `close`
`cross` `dna` (160) `frog` (160) `home` `journal` `lock` `music-off` `music-on`
`petri` `play` `replay` `settings` `sound-off` `sound-on` `star-empty`
`star-filled` `timer`

Discipline icons (96 x 96), one per anatomical system, used on the case chip,
the dossier nodes and the Learn More headings:

`sys-circulatory` `sys-comparative` `sys-ecological` `sys-environment`
`sys-neural` `sys-surgical` `sys-systemic` `sys-urogenital`

All 32 are generated from vector sources by `tools/make_icons.mjs`. To rebuild
them (requires Node and a one-off `npm i sharp`, network access needed only for
that install):

```bash
node tools/make_icons.mjs assets/images/ui/emoji
```
