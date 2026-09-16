# Element Hunt: Drag & Strike

A periodic-table word-hunt game. Read the clue, find the element's symbol in the
15 x 15 letter grid, and drag across it to strike it through.

**100% offline.** No CDN, no web fonts, no network calls of any kind. Open
`index.html` (or point a WebView at it) and it runs.

## Run it

Just open `index.html`. In a mobile app WebView, load `index.html` as the entry
point - the layout is responsive down to small phones and uses Pointer Events, so
touch, mouse and stylus all behave identically.

For a local browser test with a server (optional):

```bash
npx --yes http-server element_hunt -p 8099 -c-1
```

## What's in the box

```
element_hunt/
  index.html                  entry point
  assets/
    css/style.css             all theming (CSS/SVG art, no images required)
    js/
      data.js                 element roster, clues, fun facts, reference text
      assets.js               optional-image detection with graceful fallback
      audio.js                Web Audio synth music + SFX (+ optional bgm.mp3)
      ambience.js             drifting background particles / atoms / tiles
      fx.js                   particle bursts, strike sparks, victory shower
      game.js                 game controller
    fonts/                    Poppins + Cinzel Decorative + IBM Plex Mono (self-hosted woff2)
    images/
      ui/emoji/               29 real PNG icons - the UI contains no emoji glyphs
      background/ grid/ elements/ ui/   optional drop-in art (see images/README.md)
    audio/                    optional bgm.mp3 (absent by default)
```

## Gameplay

- 2 vaults (levels), 15 elements each, from the design document.
- Symbols are hidden across, down, and both diagonals. Drag from the **first**
  letter of the symbol to the **last**, in reading order. A backwards drag over
  the right cells is **wrong** (the game says "Right symbol, wrong way round").
- Symbols appear in **proper chemical case** - `Na`, not `NA`. Filler letters are
  randomly upper- or lowercase so the casing itself never gives an answer away,
  and the grid uses IBM Plex Mono, where a capital `I` and a lowercase `l` are
  clearly different shapes (they are identical strokes in most sans faces, which
  would make `Cl` and `CI` impossible to tell apart).
- Matching is **case-sensitive**: striking `HE` does not count as helium, only
  `He` does. Get the letters right but the capitals wrong and the game says so
  ("Capitals matter: it is written He, not HE") and charges the usual -2, so the
  rule is taught rather than just enforced.
- Scoring: **10** points on the first try, **5** afterwards, plus a speed bonus of
  up to **+5** that decays over 25 seconds. Wrong strike: **-2**. Hint: **-5**.
- **Rescue pulse:** if a specimen goes unsolved for **45 seconds**, the real symbol
  starts beating on the board (a double-thump heartbeat with a gold glow) until it
  is struck. It costs nothing - it exists so a stuck player is never stranded.
- The specimen order is **reshuffled every play**, and no two symbols are ever
  placed touching, so answers never share a letter or run into each other.
- Ten elements have **one-letter symbols** (H, C, N, O, K, I, F, P, S, U). Because a
  single cell is a complete answer, those letters are removed from the random
  filler alphabet - in that exact case only, since matching is case-sensitive, so
  `O` is barred but `o` is not. Without this, roughly 6 cells on a board (up to 11)
  satisfied a one-letter answer and there was nothing to hunt for. Now `O`, `K`,
  `I`, `F` and `U` appear exactly once; `H`, `N`, `P` and `S` twice and `C` four
  times, because other answers legitimately contain them (`He`, `Na`, `Pb`, `Sn`,
  and `Ca`/`Cl`/`Cu`).
- A **fun-fact card** unlocks after every correct answer (per the design doc).
- Stars per vault: 3 above 80% of the maximum, 2 above 50%, 1 above 20%.
- Progress (stars, unlocked vaults, best score, audio settings) is saved to
  `localStorage` under `elementHunt.save.v1`.

## Help is split in two places, deliberately

- **How to Play** - on the main menu. Controls and objective only.
- **Learn More** - on the results screen. Definitions (symbol, period, group,
  atomic number, element families) plus every element of that vault with its fun
  fact.

## Layout

The game screen is sized to fill the viewport rather than sit in a fixed box: the
board grows with the available height (up to 900px), the top bar spans the full
width, and the clue/tray column stretches to the bottom of the board. Measured
fill is 98-99% of the viewport height at 1280x760, 1366x640, 1024x1366 and
1920x1080, with no scrolling. Below 1024px wide the layout stacks, and on phones
the board is sized from the space the other panels leave so the whole game still
fits on one screen (with a floor so it never becomes unreadable on very short
screens - those scroll slightly instead).

## Audio

Background music is generated procedurally with the Web Audio API (ambient pad,
sub drone, filtered-noise air, sparse bell motif), so there are no audio files to
ship and nothing to download. Drop a file at `assets/audio/bgm.mp3` and it takes
over automatically; if it is missing or fails to decode the synth is used. Music
and sound effects have independent toggles in Settings, and both persist.

Browsers block audio until the user interacts, so the engine unlocks on the first
pointer or key event.

## Dropping in your own art

Every image except the icon set is optional. See
[`assets/images/README.md`](assets/images/README.md) for exact filenames, pixel
sizes and orientation. Missing files fall back to the built-in CSS/SVG artwork,
so you can add art one file at a time without touching any code.

## Fixes applied to the original prototype

| Issue | Fix |
|---|---|
| Grid placement used an unbounded `while (!placed)` loop that could hang | Bounded retries per symbol, with whole-grid regeneration and a guaranteed-placement fallback |
| Symbols were written in proper case (`Na`) among all-uppercase filler, so the single lowercase letter revealed every two-letter answer | Filler letters are randomly cased too, so proper chemical casing is kept without the tell |
| Touch was completely unsupported (`mousedown`/`mouseover` only) | Unified Pointer Events with pointer capture and `elementFromPoint` hit-testing |
| Strike-through lines were absolutely positioned in pixels and drifted on resize | Lines are SVG in grid units, so they scale with the board |
| Star rating read a `scoreThreshold` written onto the level object, which persisted across replays and gave wrong ratings | Per-level score is tracked from the score at level start |
| A stray tap counted as a wrong answer (-2) even when the target was a two-letter symbol it could never match | A one-cell selection is only scored when the target is a one-letter symbol |
| Matching ignored letter case, so filler `HE` scored as helium | Matching is exact on case **and** direction: only `He`, dragged first letter to last, counts |
| Tailwind and Google Fonts loaded from CDNs | Hand-written CSS and self-hosted woff2 fonts |
