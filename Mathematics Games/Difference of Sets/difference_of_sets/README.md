# Set Garden — Difference of Sets

A polished, offline, mobile-ready educational game that teaches the **Difference
of Sets** (A − B and B − A) through a friendly garden-harvest theme: numbers are
fruit, sets are garden plots, and you fill a harvest basket with the right fruit.

## Run it
Open `index.html` in any modern browser, or let the mobile app's WebView load it.
**No internet connection is required** — all fonts, styles, scripts, sounds and
art are local or generated at runtime.

## What's inside
```
difference_of_sets/
├── index.html          ← entry point (WebView auto-loads this)
├── css/style.css       ← garden theme, responsive layout, animations
├── js/game.js          ← all game logic (vanilla JS, no dependencies)
├── fonts/              ← Nunito web font (local .woff2, offline)
└── assets/images/      ← OPTIONAL art drop-in (see assets/images/README.md)
```

## Features
- **Fully offline** — Tailwind CDN and web-font CDN removed; Nunito bundled locally.
- **Boot → Menu → Level-select → Game** flow with a themed HUD.
- **Progress saved** in `localStorage`: tutorials unlock practice patches; fruit
  harvested and best streak persist between sessions.
- **Juicy feedback** — particle bursts, glow/flash, pop animations, and
  synthesized sound effects (Web Audio, no audio files).
- **Ambient background** — drifting parallax clouds, a pulsing sun, rolling hills,
  swaying grass, and falling leaves. Purely decorative; never affects gameplay.
- **Mouse + touch parity** — unified Pointer Events drag-and-drop, plus tap-to-add
  and tap-to-remove. Pinch-zoom, double-tap zoom, text selection and page scroll
  bounce are disabled for a native WebView feel.
- **Responsive** down to small phone screens.
- **Optional custom art** — drop PNGs into `assets/images/` to replace the vector
  art with zero code changes (see `assets/images/README.md`).

## Learning flow
1. **Learn A − B** / **Learn B − A** — guided tutorial with the classic example
   A = {1,2,3,4,5,6}, B = {2,4,6,8}.
2. Complete a tutorial to **unlock its Practice patch** — endless randomly
   generated problems.
3. After each correct harvest, a **Venn diagram (garden ponds)** highlights the
   difference region. Tap **Learn More** any time for the definition, notation and
   worked examples.
