# Morphology Master: *Rana tigrina*

An identification game covering the external morphology of the Indian bullfrog.
The player works through three field stations, choosing between illustrated
answer plates and submitting observations for verification.

Runs from `index.html` with **zero network access**. Everything — fonts, images,
sound — is local or generated in the browser.

---

## Running it

Open `index.html`. That is the whole install.

It works from the filesystem (`file://`), from any static web server, and inside
a mobile app WebView that auto-loads `index.html`. There is no build step, no
bundler, no module loading, and no server-side anything.

---

## Layout

    morphology_master/
      index.html              the only page
      README.md               this file
      css/
        style.css             all styling
      js/
        data.js               questions, answer key, verdict copy, reference text
        storage.js            saved progress and settings (localStorage)
        assets.js             image manifest, loader, vector fallbacks
        audio.js              synthesised effects + procedural music
        ambient.js            background particles and parallax
        ui.js                 screens, dialogs, pointer input, particle effects
        game.js               game controller
      assets/
        fonts/                Oswald + Nunito (woff2/woff) with their licences
        images/               see assets/images/README.md
          ui/emoji/           icons replacing every emoji glyph
          options/            one illustration per answer choice
          characters/         specimen portraits
          background/         optional parallax scenery (not shipped)
        audio/                see assets/audio/README.md (no files needed)

Every path in the HTML, CSS and JS is relative. Nothing points outside this
folder and nothing points at a network host.

---

## How it plays

Three stations, carried over unchanged from the original build:

1. **The External Shield** — dorsal coloration and skin texture.
2. **Sensory Adaptation** — organ of vision protection, and organ of hearing.
3. **Sexual Dimorphism** — forelimb, throat and hind-limb digit traits.

Every question in a station must be answered before Submit is accepted.
A wrong submission can be retried without limit. Each station awards up to three
seals: three for a first-time pass, one fewer per retry, minimum one.

Progress, seals and the audio settings save to `localStorage` under the key
`morphology_master_v1`. If storage is blocked (private mode, hardened WebView)
the game falls back to in-memory state and keeps working for that session.

Input is unified through Pointer Events, so touch, mouse and pen follow one code
path. Keyboard: `1`-`4` pick options in the question being answered, `Enter`
submits, `Esc` closes a panel.

**How to Play** (controls and objective) is on the main menu.
**Learn More** (definitions, structures, reference material) is on the result
screen. They are deliberately separate.

---

## Offline guarantees

- **Fonts.** Oswald and Nunito are bundled as local `woff2`/`woff` in
  `assets/fonts/`, declared with `@font-face` against relative paths. Both are
  SIL Open Font License; the licence texts sit alongside them. There is no
  Google Fonts request and no `@import` of any remote stylesheet.
- **Images.** All PNGs are local, and every one of them is optional — a missing
  file falls back to inline SVG (see `assets/images/README.md`).
- **Audio.** Synthesised in the browser. No files required.
- **Scripts.** Seven plain `<script src>` tags, all relative. No CDN, no
  bundler, no ES modules, no dynamic `import()`, no `fetch`/`XHR`.

Confirmed: no `http://` or `https://` URL appears anywhere in the shipped
HTML, CSS or JS.

---

## Customising

**Change a question, an option or a verdict message** — edit `js/data.js`. It
holds the level definitions, the answer keys, all feedback strings, the How to
Play steps and the Learn More reference sections. Nothing else needs touching.

**Change art** — drop files into `assets/images/` using the exact names in
`assets/images/README.md`. Missing files fall back to vector art.

**Add music** — drop `assets/audio/bgm.mp3` in place; it overrides the
procedural pad automatically.

**Recolour** — the palette is a block of custom properties at the top of
`css/style.css` (`--ink-*`, `--brass*`, `--spec*`, `--cyan`, `--amber`).

---

## Notes on the original build

Behaviour is unchanged: the same questions, the same options, the same correct
answers, and the same verdict wording. Fixed along the way:

- The level 2 specimen visuals were declared in the markup but never updated by
  any code. The specimen case now reflects every selection on all three levels.
- Options bound both `onmousedown` and `ontouchstart`, which double-fires on
  touch devices. All input now goes through one Pointer Event path with pointer
  capture and a bounds-checked release.
- The audio context was recreated on every start, leaking a context each time,
  and was never resumed after the browser's autoplay suspension. It is now
  created once, lazily, and resumed on the first gesture.
- "Play again" reloaded the whole document to reset state. State is now reset
  directly, so nothing is re-downloaded and progress survives.
- `localStorage` access is guarded, so a WebView with storage disabled no longer
  throws on boot.
- The viewport allowed pinch-zoom and rubber-band scrolling inside a WebView,
  and the fixed 650 px container did not fit a phone. The layout is now
  responsive down to 320 px with zoom and overscroll disabled.
