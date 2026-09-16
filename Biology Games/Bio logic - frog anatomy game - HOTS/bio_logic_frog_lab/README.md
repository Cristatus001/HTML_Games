# Bio-Logic: Frog Lab

A higher-order-thinking case-study module on the anatomy of *Rana tigrina*,
presented as a violet-lit dissection console. Ten case studies test
**application**, **analysis** and **clinical logic** rather than recall.

Production build of the original single-file `Bio logic - frog anatomy game -
HOTS.html`. **The teaching content is unchanged** — same ten cases in the same
order, same wording, same correct answers, same explanations, same
one-point-per-correct scoring, same eight-second reading hold with a skip
button, and the same three rank tiers.

One rule was changed on request: **the four answer options are reshuffled every
time a case is shown**, so the correct answer cannot be memorised by position.
The option *text* is untouched; only the order it appears in varies. Internally
each button carries its seat on screen (`data-index`, what the `1`–`4` keys
address) separately from its index in the source data (`data-origin`, what is
compared against the answer), so scoring and the reveal of the correct option
stay tied to the data rather than to the layout.

Everything else in this folder is packaging, presentation and robustness.

---

## Running it

Open `index.html`. That is the whole procedure.

- It runs from `file://`, from a plain static server, or as the auto-loaded
  `index.html` inside a mobile app WebView.
- **It makes no network requests.** Fonts, icons, music and artwork are all
  local or generated at runtime. Aeroplane mode changes nothing.
- Nothing needs to be installed or built to play. Node is only required if you
  want to regenerate the icon PNGs from their vector sources.

## Layout

```
bio_logic_frog_lab/
├── index.html                  the only page
├── css/
│   └── style.css               all presentation
├── js/
│   ├── data.js                 the 10 cases, rank tiers, reference notes
│   ├── assets.js               optional drop-in artwork probing
│   ├── audio.js                Web Audio score + effects
│   ├── fx.js                   canvas particles and ambient drifters
│   └── game.js                 screen flow, case loop, saved progress
├── assets/
│   ├── fonts/                  Orbitron, Rajdhani, Share Tech Mono (woff2)
│   ├── audio/                  empty; optional bgm.mp3 goes here
│   └── images/
│       ├── ui/emoji/           32 interface icons (required, supplied)
│       ├── background/         empty; optional backdrops
│       ├── characters/         empty; optional frog art
│       └── organs/             empty; optional anatomical plates
└── tools/
    └── make_icons.mjs          build-time icon generator (not shipped code)
```

Every path in the code is relative. The folder can be moved or renamed and
copied anywhere.

## Screens

| Screen | Contents |
|---|---|
| **Boot** | Rotating helix, asset probe progress. Tap to skip. |
| **Menu** | Title lock-up, module brief, best score, cases mastered, and **How to Play** — controls and objective only. |
| **Case study** | HUD with the case number, discipline chip, score beaker and a ten-node progress rail; a back-lit specimen slide centred at the top holding the question and its anatomical plate; four moulded answer keys stacked directly beneath it; a verdict drawer below those with the explanation and an eight-second countdown ring. |
| **Case Dossier** | All ten cases with their status, mastery count, best score and sessions logged. Tapping a logged case reopens its question and explanation for revision. Progress can be cleared here. |
| **Results** | Rank crest, star rating, score and accuracy, and **Learn More** — the conceptual reference (systems, definitions, glossary), deliberately kept out of the gameplay instructions. |

**How to Play** (menu) and **Learn More** (results) are separate on purpose:
the first is only controls and objective, the second is only background
material.

## Controls

| Input | Action |
|---|---|
| Tap / click | Select an answer, press any button |
| `1` `2` `3` `4` | Choose option A, B, C or D |
| `Enter` | Skip the reading hold, advance to the next case |
| `Esc` | Close any open panel |

Input runs through **Pointer Events** with pointer capture, so touch, mouse and
pen take exactly the same code path. Pinch-zoom, double-tap zoom, long-press
menus, text selection and rubber-band scrolling are all disabled; the layout is
responsive from a 360 px phone up to a wide desktop and the gameplay always
fills the viewport.

## Saved progress

Stored in `localStorage` under `biologic.froglab.v1`:

- which cases have been answered correctly (mastery survives a later wrong
  answer on the same case),
- best score and number of sessions completed,
- an interrupted session, so closing the app mid-run offers **RESUME CASE n**
  on the menu with the running score intact,
- the music, sound-effects and ambient-motion switches.

If storage is unavailable (private mode, full quota) the game plays normally
and simply forgets between sessions. **CLEAR SAVED PROGRESS** in the dossier
resets everything.

## Audio

Music and effects are synthesised with Web Audio — no files needed. Drop a
`assets/audio/bgm.mp3` in to override the synthesised score; if it is missing
or fails to decode, the synth takes over silently. Music and sound effects have
independent switches in Settings. See `assets/audio/README.md`.

Audio cannot start before the first tap or key press, because mobile WebViews
block autoplay. That first gesture creates the audio graph.

## Artwork

Everything on screen is CSS and SVG. Optional PNGs can be dropped in later for
backdrops, the frog character, the anatomical plates and panel skins; each one
is probed at boot and swapped in only if it decodes, so a missing file is a
non-event and files can be added one at a time. Exact filenames, pixel sizes
and orientations are in `assets/images/README.md`.

The interface contains **no emoji characters**. Every icon that would
conventionally be an emoji is a real PNG in `assets/images/ui/emoji/`, drawn
into `<img>` tags; state changes (mute/unmute, correct/incorrect) swap the
image `src` rather than writing a character. Those 32 icons are generated from
vector sources by `tools/make_icons.mjs`.

## Accessibility and reduced motion

Buttons are real `<button>` elements, keyboard-operable, with `aria-pressed` /
`aria-checked` on the toggles and a live region on the verdict drawer. The
**Ambient motion** switch in Settings stops the drifting particles, background
animation and screen transitions; the system `prefers-reduced-motion` setting
is also honoured.

## Fixes carried over the original

- Rapidly tapping **Next** (or holding `Enter`) could advance two cases at once
  and skip a question. Advancing is now guarded by a single gate, and can only
  happen while the case screen is actually on.
- Starting a new session left the previous eight-second timer armed, which
  could jump the first case of the new run. Pending timers are now cleared on
  every start and restart.
- A wrong answer left the correct option unmarked, so the explanation referred
  to something the player could not see. The correct option is now revealed.
- Answering could be triggered again through the keyboard after the buttons had
  been disabled. All input paths now share the same answered-state lock.
