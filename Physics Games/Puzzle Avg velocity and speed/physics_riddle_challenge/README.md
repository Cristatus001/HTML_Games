# Physics Riddle Challenge — Velocity & Speed

Three riddles about average velocity and average speed, set in a kinetics test
lab. Built as a single self-contained folder that a mobile app WebView can load
by pointing at `index.html`.

## Running it

Open `index.html`. That is the whole install — there is no build step, no
package manager, and no server requirement beyond whatever the WebView already
does. For desktop testing any static server works, e.g.

```bash
npx -y http-server . -p 8137 -c-1
```

`file://` also works, with one caveat: some browsers block `localStorage` on
`file://`, so progress will not persist there. Gameplay is unaffected.

## Offline guarantee

Zero external requests. No CDN, no Google Fonts, no analytics, no remote images
or audio. Fonts (Orbitron, Rajdhani, Inter) are local `.woff2` files under
`assets/fonts/`. Every icon is a local PNG. Music is generated live by the Web
Audio API. The only requests the game makes are relative-path fetches inside
this folder.

Two sets of 404s on a fresh install are **expected and handled**: the optional
drop-in art slots (see `assets/images/README.md`) and the optional
`assets/audio/bgm.mp3` (see `assets/audio/README.md`).

## Layout

```
physics_riddle_challenge/
├── index.html               screens, modals, shared SVG defs
├── assets/
│   ├── css/game.css         the whole skin
│   ├── js/
│   │   ├── data.js          riddles, Learn More reference, How to Play
│   │   ├── assets.js        optional image layer + graceful fallback
│   │   ├── audio.js         Web Audio music and SFX
│   │   ├── backdrop.js      ambient canvas (decorative only)
│   │   ├── fx.js            sparks, shockwaves, celebration
│   │   └── game.js          screens, riddle logic, progress
│   ├── fonts/               local woff2, no remote fonts
│   ├── images/              optional art + the required icon set
│   └── audio/               empty; drop bgm.mp3 here to override the pad
└── tools/
    ├── raster.mjs           dependency-free PNG rasterizer
    └── gen_icons.mjs        regenerates every icon PNG
```

## Regenerating the icons

Every emoji-equivalent in the UI is a real PNG under
`assets/images/ui/emoji/`, drawn procedurally. No emoji character appears
anywhere in the source. To retune them:

```bash
node tools/gen_icons.mjs
```

Node 18+ is enough; `tools/raster.mjs` uses only `node:zlib` and `node:fs`.

## Gameplay

Identical rules to the original single-page version:

- Each riddle offers four answers on a 2 × 2 board. Any may be tried.
- A wrong pick explains why it is wrong and can be retried — nothing is lost.
- A correct pick locks the trial, lights the panel, and enables **Next**.
- **Reset** clears the current pick and its feedback, exactly like the old
  `X` button did.
- Score is the number of trials solved out of three.

**Answer order is shuffled.** Each trial re-orders its four options at the start
of every run (Fisher-Yates), so the correct answer is never in a memorisable
position. The A/B/C/D badges are assigned by screen position, left to right and
top to bottom, which is why `data.js` carries no letter of its own. The shuffle
is fixed for the duration of a run: revisiting a trial or pressing **Reset**
keeps the same layout, so nothing moves under the player's finger mid-thought.
Feedback text never refers to a letter, only to the answer's wording, so it
stays correct in any order.

Added on top: a boot sequence, a main menu, a trial-select screen with
progressive unlocking, star ratings (gold for a first-try solve), a results
debrief, and saved progress.

### Controls

| Input | Action |
|---|---|
| Tap / click | Everything. Pointer Events, so touch, mouse and pen are one path. |
| `1`–`4` or `A`–`D` | Pick that answer |
| `Enter` | Next / Finish, once the trial is solved |
| `Escape` | Close the open panel |

### Help, split in two

- **How to Play** (main menu) — controls and objective only.
- **Learn More** (results screen) — the physics: scalar vs vector, distance vs
  displacement, both formulas, worked examples, and the traps.

## Saved data

One `localStorage` key, `prc.velocity.save.v1`, holding solved/flawless flags
per trial, the best score, and the music / SFX / interface-scale preferences.
**Reset Progress** on the menu or in Settings clears it.

## Mobile / WebView notes

- Viewport is locked: no pinch-zoom, no double-tap zoom, no rubber-band scroll,
  no text selection, no long-press context menu.
- Safe-area insets are respected on notched devices.
- Layout is responsive from ~320 px wide up, and has a dedicated short-landscape
  mode that drops the scene art so the riddle always fits without scrolling.
- Audio starts only after the **Enter the Lab** tap, satisfying autoplay policy.
- `prefers-reduced-motion` is honoured: animation stops, the game does not.
