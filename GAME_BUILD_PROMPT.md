# Reusable prompt — "make this HTML game production-ready"

Drop this in with the game file (and its design doc, if there is one). Replace
nothing except the first line if you want to name the game explicitly.

> Last updated after **Element Hunt** (Chemistry). Sections 4, 5, 12, 13, 14 and
> 15 came out of that build — read them, they are where the real bugs were.

---

Make this HTML game production-ready. Keep ALL existing functionality and the
existing scoring/mechanics identical — only upgrade packaging, presentation,
correctness and robustness. Fix any bugs you find in the original code and tell
me what they were.

## 1. THEME — do this first, and do not default

Propose 2–3 theme directions (via a question, not prose) tailored to **this
game's specific subject**, then wait for my pick. Rules for the options:

- **Derive the theme from something only this subject has.** Not "underwater"
  for a sea creature — something the subject itself produces or is uniquely
  known for. (Mollusca → *nacre / mother-of-pearl*, because molluscs are the
  only phylum that makes it.)
- **Do not propose, and do not fall back to, the generic dark-navy/teal +
  cyan-glow + gold-trim "sci-fi console" look.** If you have used it on a
  previous game in this folder, it is banned here. `grep` the sibling folders
  under `HTML Games/` for the hex values you are about to use, before you write
  any CSS.
- Each option must name its **palette, its physical material, and its
  typography** — e.g. "cream mother-of-pearl plates with a gold engraved rim,
  on deep violet abalone shell; Cinzel + Quicksand". A theme that only changes
  the background color is not a theme.
- **Vary the value structure between games**, not just the hue. If the last
  game was dark panels on a dark background, this one should be light panels
  on a dark base (or vice versa). This single choice is what makes two games
  actually look different.
- **Change the fonts.** Pick a display + body pair that suits the material.
  Never reuse the previous game's fonts.

> Do not skip this step even if my prompt does not repeat it. Element Hunt was
> built without it and landed on the banned navy/cyan palette, which I then had
> to ask you to redo.

## 2. MAKE THE TITLE LITERAL

If the game's name promises a place or a mechanic that isn't in the code,
**build it.** ("Mollusc Maze" had no maze — it became a real spiral shell
corridor with four chambers that a snail token crawls along, which turned the
quiz into a journey.) This is usually the single biggest upgrade available.

## 3. USE THE PHOTOS IN THE FOLDER AS PRIMARY ART

Any images sitting next to the game file are real assets, not decoration:

- Generate cropped versions into `assets/images/characters/` with a Node +
  `sharp` script — square, ~420×420, centre-cropped, with a soft circular
  alpha edge so they sit inside frames cleanly.
- Put them **in the gameplay screen** as the main art (framed, lit, with
  locked/active/cleared states), not only in a modal.
- Also keep full-size copies in `assets/images/reference/` for the Learn More
  screen.
- Every one must degrade to inline SVG/canvas art if the file is missing.

## 4. THE DESIGN DOC IS THE CONTENT SPEC

If a `.docx` / `.pdf` / `.md` spec sits next to the game, **it outranks the
prototype's content.** Extract all of it first (`unzip` the docx and parse
`word/document.xml`) and transcribe it in full into a data module.

- The HTML prototype is usually an incomplete draft. Element Hunt's code had
  **10 of the 30 elements** the doc specified, different clue text, and none of
  the doc's post-answer facts — all of which the doc treated as core.
- Mechanics the doc describes but the code lacks are **missing features, not
  new scope.** Build them (Element Hunt's doc specified a fun-fact reveal after
  every correct answer; the code had none).
- Keep the doc's own spellings and notation (`Aluminium`, `Sulphur`, `Na`).
- Say explicitly, in your report, where doc and code disagreed and which you
  followed.

## 5. ANSWER + PUZZLE INTEGRITY

For any game that validates an answer, generates a board, or hides things to
find. This is where the real gameplay bugs live.

- **Be strict, and never loosen a rule on your own initiative.** Match the
  subject's real notation exactly — case included (`He` is helium; `HE`, `hE`,
  `he` are not) — and enforce the intended input direction. If you think a rule
  is unfair, say so and *ask*; do not quietly make it lenient. (I had to revert
  a reverse-drag allowance you added as a "fix".)
- **On a near miss, name the mistake.** "Capitals matter: it is written He, not
  HE." / "Right symbol, wrong way round: drag Na from N to a." Charge the normal
  penalty, but teach the rule rather than just buzzing.
- **Every answer must be unambiguous.** Audit it: if a short answer can also be
  satisfied by random filler, it is not a puzzle. Element Hunt's ten one-letter
  symbols (H, C, N, O, K, I, F, P, S, U) were each satisfied by **~6 cells,
  up to 11** — so "find the carbon" was "tap any C". Fix by removing answer
  letters from the filler alphabet (in that exact case only, when matching is
  case-sensitive). Report the residual count per answer and why it cannot reach
  1 where it cannot.
- **Placed answers must never touch** — enforce a clear one-cell gap including
  diagonals, so two answers never share a letter or read as one run.
- **Randomise question order on every play**, and regenerate the board each
  play.
- **Never leak the answer through presentation.** Mixed-case symbols among
  all-uppercase filler made every two-letter answer visible in the original.
  If the answer needs a distinct form, give the filler that form too.
- **Bound every generator loop.** The original's `while (!placed)` had no cap
  and could hang the tab. Bounded retries → relaxed constraints → guaranteed
  fallback, in that order, so the game is always playable.

## 6. TYPOGRAPHY THAT DOES NOT LIE

- **Decorative display faces render digits as roman numerals.** Cinzel
  Decorative turned score `1` into `I`. Use the body face for every number —
  HUD values, timers, counters, level badges, breakdowns.
- **If letter case is meaningful, pick a face where `I` and `l` differ.** In a
  geometric sans they are the same bare stroke, which makes `Cl` and `CI`
  a coin flip with a scoring penalty attached. A mono face (IBM Plex Mono) fixes
  it and suits a grid/readout.
- Self-host every face as `.woff2` via `@fontsource/*`.

## 7. OFFLINE + PACKAGING

- Zero external URLs. Download fonts via npm (`@fontsource/*`) and copy the
  `.woff2` files locally. No CDN, no Google Fonts link.
- Folder named in `snake_case` matching the game, main file renamed
  `index.html` at its root, assets in `assets/{css,js,images,audio,fonts}/`
  subfolders, **relative paths only**.
- Split the JS into modules (data / assets / audio / ambience / fx / game)
  rather than one inline `<script>`.

## 8. NO EMOJI ANYWHERE

Generate real PNG icons (Node + `sharp`, or Python + Pillow, rasterizing shapes
at 4× and downsampling) into `assets/images/ui/emoji/`, referenced as `<img>`.
For state changes swap `img.src`, never set emoji `textContent`. Include a
themed icon for every concept: currency, hint, correct, wrong, sound on/off,
music on/off, settings, help, book, trophy, star filled/empty, play, next, back,
home, replay, close, lock, clock, logo.

**Prefer themed iconography over stock shapes** — a scallop shell instead of a
star, an oyster-and-pearl instead of a trophy. But **readability wins for
controls**: a mute button must read as a speaker at 24px.

**Render the icon set onto the actual background color as a contact sheet and
look at it before wiring it up.** Half will be too washed out or unreadable at
small size on the first pass. Also check that none of them accidentally reads as
something else — my first "drag" hand icon looked like an obscene gesture.

## 9. UI CRAFT BAR

Panels and buttons must read as lit, beveled and engraved — not flat rounded
rectangles:

- Layered gradients plus inset/outset shadows to fake embossed metal, glossy
  plastic, polished shell, parchment — whatever the theme's material is.
- Slightly asymmetric `border-radius` so panels feel organic.
- Anything representing a resource/currency/item must be **lit from within** —
  a radial-gradient glow inside or behind it, never a flat fill.
- A travelling specular sweep across panels, and a subtle repeating-gradient
  texture (ribs, grain, weave) suited to the material.
- Vibrancy from **saturated accents against a calmer base**, not from making
  everything bright.
- All via CSS/SVG (gradients, clip-path, box-shadow layering, filters) — no
  image generation available.
- **Avoid `color-mix()` and other very new CSS** in a WebView target; use a
  second `--*-a` rgba variable instead. Keep a plain fallback declaration before
  any `dvh` / container-query / `@supports` upgrade.

## 10. GAMIFY

- A visible progression the player moves along, with per-step states
  (locked / active / cleared) and a distinct cleared marker.
- A **currency** that is earned, animates from its source into the HUD
  counter, and drives a star rating. Tie the award to performance (full for a
  clean answer, less after a hint or a miss).
- Juice on every beat: bloom on success, shake + colored rim flash on failure,
  particle bursts, counter pop, a celebratory shower on completion.
- `localStorage` progress: best score, stars per level, unlocked levels, plus
  audio preferences. A reset that clears scores but **keeps** preferences.
- **Compute per-level results from a snapshot taken at level start**, not from
  a value cached onto the level object. The original stored `scoreThreshold` on
  the level and mis-rated every replay.

## 11. PLAY-FIELD ENTRANCE ANIMATION

When the play screen opens, animate the field into being — for a grid: all
letters gather in the centre, zoom in, scramble/shuffle, then fly out to their
places with a stagger, while the board itself breathes in and out. ~1.5–2s.

- **Lock input for the duration** and start any speed-bonus timer only when it
  settles, so nobody is scored during the animation.
- Skip it under `prefers-reduced-motion`.
- Read section 13 before you implement this — done naively it can brick the
  board.

## 12. ANTI-FRUSTRATION ASSIST

If the player has not solved the current objective after ~45 seconds, **reveal
it on the field with a heartbeat pulse** (double-thump scale + accent glow) that
keeps beating until they act on it.

- **Free** — no points deducted. It exists to unstick a player, not to punish.
- Clear it the instant the objective is solved, and on every new objective.
- Under `prefers-reduced-motion`, glow without the pulsing.
- Document it in How to Play so it is a known safety net, not a surprise.

## 13. ROBUSTNESS — the two bugs that actually shipped

**Never let a lost pointer lock the input.** If a `pointerup` is missed (WebView
steals the gesture, app backgrounded mid-drag), a `dragging` flag stays true and
the board goes permanently dead. On `pointerdown`, reset any stale drag and
start fresh; also cancel on `visibilitychange` and `blur`. Handle
`pointercancel`.

**Never make layout-critical state depend on an animation having run.** Web
Animations advance on the document timeline, which **stalls when the WebView is
not producing frames** — but `setTimeout` keeps firing. With `fill: 'backwards'`
holding the first keyframe, my intro left all 225 grid cells collapsed at 4px in
the centre of the board, overlapping so they swallowed each other's hit-tests:
two-letter drags became impossible while single-letter taps still worked
(an evil intermittent bug). Rules:

- Keep references to the animations you start and **`cancel()` them from the
  timer** that ends the sequence, then explicitly re-assert the final state.
- Prefer `fill: 'backwards'` over `'forwards'` so a finished animation releases
  the property back to CSS (otherwise it locks out hover/selected styles).
- Verify by pausing every animation at `currentTime = 0`
  (`document.getAnimations().forEach(a => {a.pause(); a.currentTime = 0})`) and
  confirming the field still becomes playable after the timer fires.

## 14. BOOT FLOW, HELP, AUDIO, BACKGROUND, MOBILE

- Boot screen → main menu → level select → game → end screen, with a Settings
  modal.
- **"How to Play" (controls + objective + any scoring/notation rules) on the
  main menu.** **Conceptual/reference/lore info behind a separate "Learn More"
  on the end screen.** Keep the two strictly separated.
- Looping background music generated procedurally in-browser via Web Audio
  (pad + sub + filtered noise + sparse melodic accents, tuned to the theme's
  mood), with an optional `assets/audio/bgm.mp3` drop-in that overrides it and
  graceful fallback if absent. Music and SFX toggles in Settings, persisted.
  Unlock the AudioContext on the first pointer/key event, and make sure
  toggling music off and back **on** actually resumes (ramp the bus back up —
  mine stayed silent the second time).
- Ambient background motion: parallax/drifting elements and particles that fit
  the setting. Never touch hitboxes or gameplay logic; `pointer-events: none`.
- Unified **Pointer Events** so touch === mouse, using `setPointerCapture` plus
  `document.elementFromPoint` for drag targeting. Disable pinch-zoom, text
  selection, overscroll and double-tap zoom. Responsive down to 360px wide.
  Honour `prefers-reduced-motion`.

## 15. FILL THE SCREEN — measured, not eyeballed

Size the play area against the **viewport**, not fixed pixel caps that look
tiny on a desktop monitor.

- **Stretch, don't pack.** `align-content: stretch` on the game grid; a side
  column of `auto minmax(0, 1fr)` so it reaches the bottom of the play field.
  `align-content: start` is what leaves half a 1080p screen empty.
- Bound a square field by *both* axes:
  `max-width: min(100%, calc(100dvh - <chrome>px), <cap>)` — with a plain `vh`
  declaration first as fallback. A `min(72vh, 640px)` style cap is what pinned
  Element Hunt's board to 640px on a 1080p screen instead of 879px.
- Scale chrome up at `min-width: 1100px` and `min-width: 1600px` breakpoints —
  HUD chips, icons, clue text, dials, buttons — plus `clamp()` padding
  everywhere, so a desktop does not show phone-sized UI marooned in space.
- Size text inside the field **from the field**, via a container query
  (`container-type: size` + `cqw`), with the old `clamp()` as `@supports`
  fallback.
- On phones, derive the field size from the space the other panels leave so the
  **whole game fits with no scrolling** — but keep a floor (~300px) so it never
  becomes unreadable on very short screens; those may scroll a little instead.
  Beware content-dependent heights (a 3-line clue vs a 1-line one) — measure
  the worst case across every question, not just the first.
- **Decorative tokens must never cover content** — lower `z-index` *and*
  positioned clear of it. Measure the clearance.
- Target: **≥95% of viewport height used, zero scroll**, at 1920×1080,
  1440×900, 1366×640, 1024×1366 and 375×812. Report the numbers.

## 16. VERIFY — required, and do it properly

- **Serve the folder over a real local HTTP server** and test there. Do NOT
  trust `file://` or a static snapshot preview: those silently drop JS-set SVG
  attributes, which makes generated geometry look broken when the code is fine.
- `node --check` every JS file.
- Script-scan for external URLs and for literal emoji characters (codepoints
  *and* HTML entities like `&#9733;`) — expect zero of both.
- Script-resolve every asset path. Paths inside `.js` resolve against
  `index.html`, not the script's folder.
- **Audit generated content statistically, not once.** Over 20+ generated
  boards assert: every answer present and findable, no two answers touching, no
  overlapping cells, and the ambiguity count per answer. One board proves
  nothing.
- Play **full runs** driven by dispatched `PointerEvent`s with
  `pointerType: 'touch'` — correct, wrong, near-miss (case and direction),
  hint, the timed assist, both modals, end screen, replay, and both levels.
  Read the current objective **from the UI**, not from a fixed order, once the
  order is randomised.
- Assert numerically: `scrollWidth <= innerWidth`, viewport coverage %, board
  squareness, hit-test resolution (`elementFromPoint` at a cell's centre must
  return *that* cell).
- Test the stalled-compositor case from section 13.
- Check the console for errors and the server log for 404s. The only acceptable
  404s are the intentional optional drop-ins.

### Verification traps I hit — do not repeat them

- **Give the harness margin.** Waiting 640ms for a card the game opens at 620ms
  produced phantom "rejected" failures that sent me hunting a bug that was not
  there. Wait comfortably longer than the game's own delays.
- **Screenshots can lie.** The preview pane returns DPR-scaled or partially
  painted captures — content in the top-left with black filling the rest, or a
  mid-transition frame. Trust `getBoundingClientRect` / computed style over what
  a screenshot appears to show, and say so if a screenshot is all you have.
- **Set up state before the page reads it.** Writing `localStorage` after load
  does nothing until a reload; I "measured" a vault-2 board that was really
  vault 1 and briefly believed symbols were unplaceable.
- **Remove any debug hook you add**, then `grep` for it (`__TEST`,
  `console.log`, `debugger`) and confirm it is gone.
- **Distinguish a real defect from a harness artifact in the report.** If a
  failure turns out to be the test's fault, say that plainly.

## 17. DELIVERABLE

Write a `README.md` in the game folder listing exact expected filenames, pixel
sizes and orientation for every replaceable asset, which are optional, and what
each falls back to. Document the rules a player is scored against (notation,
direction, penalties, the timed assist). Leave the original file untouched.

Report what you changed, what bugs you fixed, the measured verification numbers,
and anything you could not verify.
