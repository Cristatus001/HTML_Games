# Vector Explorer: Sky Realm

A physics field-trial game about **position vectors**, **displacement** and
**path distance**. Plant an origin, pick a destination island, drag any route you
like between them, then compare how far you walked against how far you actually
got.

Theme: *Airship Log* — varnished wood, brushed brass, riveted bronze gauges and
a drifting cloud sea.

## Running it

Open `index.html`. That is all — no build step, no server, no network.

It is designed to be loaded directly by a mobile app WebView that opens
`index.html`, and works the same from `file://` or any static host.

## Offline

Zero external requests. Fonts (Fredoka, Roboto Mono) are bundled as local
`.woff2` files under `fonts/`, all icons are local PNGs, and music and sound
effects are synthesised at runtime with the Web Audio API. Nothing is fetched
from a CDN.

## Layout

```
vector_explorer_sky_realm/
  index.html              screens, HUD and modals
  css/
    theme.css             airship-log materials: brass, wood, parchment, glass
    fonts.css             local @font-face declarations
  fonts/                  Fredoka 400/600/700, Roboto Mono 500/700 (woff2) + licences
  js/
    core.js               maths helpers, optional-image loader, saved flight log
    audio.js              procedural music + SFX, optional bgm.mp3 override
    fx.js                 parallax sky scenery and particle bursts
    quiz.js               debriefing questions
    game.js               state machine, hit testing, vector rendering
    main.js               boot sequence, screens, settings, input, render loop
  assets/
    images/               all optional; see assets/images/README.md
      background/ islands/ characters/ effects/
      ui/emoji/           the shipped icon set (used instead of emoji glyphs)
    audio/                empty; see assets/audio/README.md
```

## How the game flows

1. **Boot** — assets load, then "Board the Airship" (this gesture also unlocks audio).
2. **Bridge (main menu)** — Begin Flight, How to Play, Settings, and the saved flight log.
3. **Phase 1 · Calibration** — tap anywhere to set the origin `(0,0)`. The nearest island becomes the start.
4. **Phase 2 · Set Target** — tap another island; it turns gold.
5. **Phase 3 · Navigation** — press the blue island and drag any path to the gold one.
6. **Flight Log** — path distance `d`, displacement `Δr`, and straightness `|Δr| ÷ d`.
7. **Debriefing** — one question, with a hint on a wrong answer.
8. Three correct debriefings earn **Navigator Certified**.

"How to Play" (controls and objective) lives on the main menu. The conceptual
reference — definitions, the `Δr = r_final − r_initial` formula, worked examples
and a comparison table — sits behind **Learn More** on the result card and on the
certification screen.

## Saved state

`localStorage` key `vector_explorer_sky_realm_v1` holds flights completed,
debriefings answered, best straightness, certification, and the music/SFX
toggles. Storage failures are caught, so private mode or a locked-down WebView
just runs with defaults. "Clear Flight Log" in Settings resets it.

## Mobile

- Unified **Pointer Events** — touch, pen, mouse and trackpad take the same path.
- Pinch-zoom, double-tap zoom, rubber-band scroll, text selection and the
  long-press context menu are all disabled.
- Island size scales with the viewport, while the tap radius never drops below
  42 px so targets stay comfortable on a phone.
- Layout is responsive down to small phones: the chart key becomes a two-column
  strip and the flight log becomes a full-width bottom sheet.
- Canvas renders at device pixel ratio (capped at 2.5) for crisp vectors.
- Safe-area insets are respected for notches and home indicators.

## Adding your own art

Everything under `assets/images/` is optional and falls back to the built-in
canvas art. See `assets/images/README.md` for exact filenames, sizes and
orientations, and `assets/audio/README.md` for the optional music track.

## Credits

Fredoka and Roboto Mono are licensed under the SIL Open Font License; the licence
texts are in `fonts/`.
