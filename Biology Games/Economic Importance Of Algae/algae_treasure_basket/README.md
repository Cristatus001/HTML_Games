# Algae Treasure Basket

An underwater feeding game about the **economic importance of algae**. Algae
morsels drift up through the water, each labelled with something that may or may
not be a genuine economic use of algae. The player steers **Finn**, a reef fish,
and feeds him. Real algae uses are nourishing and he grows; everyday
manufactured goods are indigestible and he shrinks.

Runs entirely offline. Open `index.html` — no build step, no server, no network.

---

## Running it

**In a mobile app WebView:** point the WebView at `index.html`. Everything is
relative-path, so the folder can live anywhere.

**On a desktop browser:** double-clicking `index.html` works in most browsers,
but Chrome blocks `file://` sub-resources under some policies. If the page loads
blank, serve the folder over HTTP instead:

```bash
python -m http.server 8000 --directory algae_treasure_basket
```

---

## Layout

```
algae_treasure_basket/
├── index.html              markup for every screen
├── css/
│   └── style.css           all presentation
├── js/
│   ├── data.js             answer sets, dive definitions, boot copy
│   ├── assets.js           optional drop-in artwork loader
│   ├── audio.js            synthesised effects + procedural music
│   ├── fx.js               ambient decoration and particle feedback
│   └── game.js             boot flow, screens, saved progress, the dive
└── assets/
    ├── fonts/              Bubblegum Sans + Roboto (WOFF2/WOFF) and fonts.css
    ├── audio/              empty — see assets/audio/README.md
    └── images/
        └── ui/emoji/       28 shipped PNG icons (required)
            see assets/images/README.md for every optional slot
```

---

## The game

**Rules** (scoring is unchanged from the original build):

- Morsels drift up from below with a horizontal wobble, and recycle at the
  bottom when they leave the top of the screen.
- Every morsel looks **identical** until it is eaten, so the label has to be
  read. There is no visual tell.
- A **correct** morsel scores **+10**, flashes green, is pulled into Finn's
  mouth, and **grows him**. A field note holds the dive still for three seconds.
- A **wrong** morsel scores **-5**, flashes red, is spat out, and **shrinks
  him**.
- The dive ends when every correct morsel has been eaten.

**Finn's size** starts at 100% and is shown live in the HUD — green while he is
thriving, coral while he is ailing. Growth per morsel is sized to the dive
(`MAX_SCALE ^ (1 / morsels)`), so a flawless run finishes at 205% whether it had
four morsels or twelve; short dives grow him in chunky steps, the long one
gradually. Junk costs a flat 12% each time. He is clamped to 55–205% and resets
at the start of every dive.

**Four dives.** The first three group the twelve uses by theme; the fourth is
the original full round — all twelve correct bubbles and all six distractors.
Completing a dive unlocks the next.

| Dive | Name | Treasures |
|---|---|---|
| 1 | Sunlit Shallows | 4 |
| 2 | Kelp Forest | 4 |
| 3 | Twilight Reef | 4 |
| 4 | Abyssal Trench | 12 |

**Starfish rating.** Three for a flawless dive, two at 75% of the maximum score
or better, one for finishing.

**Saved progress** lives in `localStorage` under `algae_treasure_basket.save.v1`
— unlocked dives, best scores, starfish, and the three settings toggles. If
storage is unavailable (private browsing, a locked-down WebView), the game runs
normally and simply does not persist.

---

## Where the information lives

The brief keeps two kinds of text apart, and so does the game:

- **How to Play** — main menu only. Controls, objective, and the grow/shrink
  rule. Nothing conceptual.
- **Learn More** — result screen only. Opens the *Field Journal*: what algae
  are, all twelve economic uses with their notes, why the distractors are not
  algal products, and a short glossary.

---

## Offline guarantees

- **No external URLs anywhere.** No CDN, no Google Fonts, no analytics. The
  webfonts are bundled locally in `assets/fonts/`.
- **No emoji characters** in any markup, stylesheet or script. Every icon is a
  real PNG under `assets/images/ui/emoji/`, referenced as an `<img>`. State
  changes (mute/unmute, earned/unearned starfish) swap the `src` attribute.
- **No audio files needed.** Effects and music are synthesised with Web Audio.
- **No image files needed.** Every visual has a CSS or inline-SVG default.

Expect 404s in the developer console for the optional artwork slots you have not
filled — that is the drop-in loader probing for files, and it is harmless. See
`assets/images/README.md`.

---

## Mobile / WebView notes

- Input is unified **Pointer Events**, so touch, mouse and stylus take the same
  path. Finn the guide fish replaces the cursor: on a mouse he chases the
  pointer, on a touch screen he swims to wherever you last tapped, so both
  input styles get the same visible anchor.
- Pinch-zoom, double-tap zoom, long-press menus, text selection, overscroll and
  rubber-banding are all disabled. Scrolling is permitted only inside the
  panels that need it.
- Layout is responsive down to 320 px wide and adapts to short landscape
  screens. `env(safe-area-inset-*)` is respected for notches.
- The audio context is created lazily and resumed on the first gesture, which
  is what mobile autoplay policies require.
- `prefers-reduced-motion` disables the ambient animation, and the Settings
  panel has a manual **Ambient Motion** switch as well.

---

## Fixes applied to the original build

- **Bubbles were effectively unplayable-slow.** They rose at 0.3–0.7 px per
  frame (~18–42 px/s) from a staging area up to 3500 px below the fold — over
  two minutes for the last bubble to appear. Rise rate is now expressed as one
  screen height every 15–25 seconds, and the staging band scales with the
  number of bubbles.
- **A new `AudioContext` was created on every `start()`**, leaking one per
  round. There is now a single lazily-built graph with separate effect and
  music buses.
- **The pointer follower jumped to (0, 0) on touch.** It read `lastMouseX/Y`,
  which only `mousemove` ever set. Coordinates now come from the pointer event
  itself, and the follower works the same on mouse and touch.
- **Scenery letterboxed on wide screens, leaving bare strips at both edges.**
  The seabed and kelp were single SVG bands fitted with
  `preserveAspectRatio="meet"` under a `max-height` cap; once the cap bound,
  the artwork shrank to fit the height and stopped short of the sides. The sand
  is now one stretched silhouette (`preserveAspectRatio="none"`, invisible on a
  smooth curve) and the kelp and coral are individually placed at percentage
  offsets, so the scene spans any aspect ratio from 320x568 to 3440x1200.
- **Burst bubbles were left in the DOM** as invisible, frozen husks. They are
  now removed once their fade completes.
- **Nothing handled resize or rotation.** Bubbles could end up parked off-screen
  and unreachable; positions are now re-clamped.
- **The fact pop-up ran on a wall-clock `setTimeout`**, so pausing during it did
  not pause it, and the dive could end while the pause screen was up. It is now
  timed by the game loop, which respects pause.
- **Frame-rate-dependent motion.** Movement is now scaled by real elapsed time,
  so the dive plays the same on 60 Hz and 120 Hz displays.
- Positions moved from `left`/`top` to `transform`, which keeps the animation
  off the layout path.
