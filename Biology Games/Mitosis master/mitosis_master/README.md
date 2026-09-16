# Mitosis Master

A five-stage cell-division game. Guide one cell through prophase, metaphase,
anaphase, telophase and cytokinesis.

Runs with **zero internet access**. Open `index.html` - no build step, no
server, no network requests of any kind.

---

## Layout

```
mitosis_master/
  index.html            entry point (a WebView can load this directly)
  css/style.css          all interface styling
  js/
    assets.js            optional-image loader with vector fallback
    storage.js           localStorage progress + settings (guarded)
    audio.js             Web Audio music and SFX, no audio files needed
    background.js        ambient parallax layer
    render.js            canvas drawing + particle system
    game.js              simulation, input, stage state machine
    ui.js                screens, HUD, modals
    main.js              boot sequence and WebView gesture lockdown
  fonts/                 Orbitron + Exo 2 (local .woff2, self-hosted)
  assets/
    images/              see assets/images/README.md
    audio/               drop bgm.mp3 here to override the generated music
  docs/                  original design-review screenshots
```

Scripts are plain `<script>` tags in dependency order, deliberately **not** ES
modules, because ES modules fail under the `file://` protocol that a WebView
uses when it loads a bundled `index.html`.

## Offline

- Fonts are self-hosted `.woff2` in `fonts/`, loaded by relative path.
- No CDN, no `@import`, no protocol-relative URLs, no external hosts.
- Music is synthesised at runtime with Web Audio, so no audio file is required.
- Every asset path in the project is relative.

## Art drop-in

`assets/images/` is organised one folder per visual element and every file is
optional. Drop a PNG at the documented path and the game picks it up on next
load; remove it and the built-in vector art returns. See
`assets/images/README.md` for exact filenames, sizes and orientation.

The only images that must exist are the 31 icons in `assets/images/ui/emoji/`,
which stand in for what would otherwise be emoji characters. No emoji character
appears anywhere in the source; icon state changes (mute/unmute, locked/
unlocked, earned/empty star) swap an `<img>` `src`, never text content.

Because optional files are probed at launch, the console logs one `404` per
absent file. That is expected.

## Audio

- **Music:** generated live - a slow detuned pad through a low-pass with an LFO
  sweep, plus a sparse pentatonic arpeggio, both fed into a synthesised
  convolution reverb.
- **Override:** if `assets/audio/bgm.mp3` exists and decodes, it replaces the
  generated music automatically. If it is missing, unreadable, or the WebView
  refuses to route it through Web Audio, the generated music is used instead.
- **Unlock:** browsers block audio until a gesture, so the engine stays
  suspended until the first pointer or key event, then resumes.
- Music and SFX have independent toggles in the HUD and in Settings; both
  persist. Audio suspends when the page is hidden.

## Controls

Input runs through **Pointer Events**, so mouse, touch and stylus take the same
code path; a mouse/touch shim covers WebViews without Pointer Events. Only one
pointer is tracked, so a second finger cannot hijack a drag.

- **Tap** - condense chromatin, split centromeres, unwind chromatids, pinch or
  build the divide.
- **Press and drag** - centrosomes to the poles, chromosomes onto the equator,
  nucleoli into the new nuclei.
- **Press and trace** - sweep around a dotted ring to rebuild a nuclear
  envelope.
- **Keyboard** - `Enter` / `Space` confirm, `Esc` opens settings.

Pinch-zoom, double-tap zoom, scroll, rubber-banding, text selection, drag-start
and the context menu are all suppressed; only the long prose panels scroll.

## Progress

Saved to `localStorage` under `mitosis_master_v1`: highest stage unlocked, best
stars per stage, best full-run time, run count, and the audio/motion settings.
Every read and write is wrapped - if storage is blocked the game runs normally
with in-session state. A corrupt or hand-edited save is validated and clamped
rather than trusted.

Stage Select can start any unlocked stage, building the prior state so the cell
is always coherent. Only a run started at stage 1 records a full-cycle time.

## Changes from the prototype

Gameplay is unchanged - the same five stages, the same actions, the same
completion rules. All thresholds are now expressed relative to the cell radius,
so the game plays identically at any screen size.

Bugs fixed along the way:

1. **Telophase decondensing had no visible effect.** The draw code tested
   `isSplit` before condensation, so tapping a chromatid changed nothing on
   screen. Separated chromatids now visibly relax into chromatin threads.
2. **Anaphase could auto-advance twice.** The 800 ms timer could be armed more
   than once and fired even after a restart or stage change. It is now armed
   once and guarded by a generation token.
3. **Anaphase arrival checked only the first chromosome.** All four chromatid
   pairs must now reach the poles.
4. **Metaphase could start already solved.** Chromosomes kept their prophase
   x-position, and a chromosome near the centre counted as aligned instantly.
   They are now deliberately spread clear of the plate.
5. **The nuclear envelope could be traced by hovering.** The trace ran on any
   pointer move, so a desktop mouse completed it without ever pressing. It now
   requires the pointer to be down.
6. **Nucleoli snapped on the x-axis only,** so one dropped far above or below
   its nucleus still counted. It now uses true distance.
7. **Nothing survived a resize or rotation.** Entities held absolute pixels
   against a radius that changed. All entities are now remapped through the
   old-to-new centre/radius transform.
8. **Blurry on high-density screens.** The canvas now scales its backing store
   by `devicePixelRatio`.
9. **The animal cleavage furrow drew as a malformed bezier.** Replaced with a
   parametric outline plus a contractile ring.
10. **Daughter-cell previews were hardcoded at 150 px,** breaking on small
    screens. Now proportional.
11. **Plant-cytokinesis vesicles were spawned but never animated or cleared.**
    They now travel to the plate and fuse.
12. **`NEXT` could skip a stage** if triggered while the objective was unmet.
    `advance()` now verifies the stage is complete.
13. **Modals stacked.** Navigating between screens left an open modal floating
    over the new one; all navigation now dismisses modals.
14. **HUD tool buttons wrapped onto a second row,** because the decorative
    corner screws were a grid child. They are out of flow now, which also
    reclaimed enough height to grow the cell by about 30%.
15. **Emoji in the UI** (`paw`, `seedling`, `signal-bars`) and symbol glyphs on
    the canvas are gone, replaced by generated PNG icons.
16. **Restart reloaded the page,** discarding in-memory state. It now restarts
    cleanly.

### One content change

The design review in `docs/` (slide 2) circles the ER and Golgi rows in
telophase with the note *"These two elements are not needed"*. Those two
organelle types were removed; the nucleolus - the organelle that genuinely
reappears during telophase - is the one that remains, one per daughter nucleus.
Icons for ER and Golgi are still generated in `ui/emoji/` should you want them
back.

## Help text

The two kinds of help are kept separate, as requested:

- **How to Play** (main menu) - controls and objective only.
- **Learn More** (result screen) - the biology: definitions, the five stages,
  animal vs plant division, where mitosis happens, and a glossary.
