# Pharaoh's Twin-Seal Tomb: Equality of Complex Numbers

A gamified, offline, mobile-ready version of **"Equality of complex numbers (Simulation).html"**
(originally "Complex Number Escape Room"). The original file sits untouched one folder up.

Every door in the tomb is held by two seals: the **Sun Seal** of the real part and the
**Moon Seal** of the imaginary part. A door opens only when **both** match, which is the
rule itself: `a + ib = c + id  <=>  a = c and b = d`.

## Run it

Open `index.html` in any modern browser, or load it in the app's WebView. No internet
needed: fonts, art, scripts and audio are local or generated at runtime.

```
equality_of_complex_numbers/
├── index.html
├── README.md
└── assets/
    ├── css/style.css
    ├── js/
    │   ├── data.js      question bank, room times and narrator lines (from the original), scoring
    │   ├── teach.js     equation formatting, hints, worked steps, named mistakes
    │   ├── storage.js   localStorage progress + preferences
    │   ├── audio.js     procedural tomb music + synthesized sound effects
    │   ├── fx.js        coin flights, sparks, shake, rim flash, coin shower
    │   ├── ambient.js   drifting dust motes (canvas, behind the UI)
    │   └── game.js      flow, drag and drop, timer, rules, HUD, screens
    ├── fonts/           Rakkas (display words) + Outfit (body and every number), .woff2, OFL
    ├── images/
    │   ├── backgrounds/ title, menu, room1-room5, escape (Freepik stock)
    │   ├── sprites/     door frame + two leaves, sun seal, moon seal, scarab guide, coin (Freepik)
    │   └── ui/
    │       ├── frames/  papyrus panel, gold button, sandstone button, cartouche, stone niche (Freepik)
    │       └── icons/   28 icons, 128x128 (Freepik)
    └── audio/           empty: optional bgm.mp3 goes here
```

## Changes taken from the deck ("Games and simulations (Complex Numbers).pptx")

**None apply to this game.** The deck has 8 slides: slides 1-4 describe *Argand Plane
(Simulation)* and slides 5-8 describe *Algebra of Complex Numbers (Game)*. No slide, image or
speaker note mentions the equality game, so no content change was requested. Per the brief,
the game was instead re-skinned and gamified with Freepik art and UI.

## Art (all from Freepik)

- **Backgrounds** are Freepik stock vectors (free licence, one illustrator, so all rooms match),
  resized to 1080 px tall:
  title: *Ancient egyptian temple cartoon game background* · menu and room map: *Egyptian pharaoh
  tomb with standing sarcophagus...* · Room 1: *Ancient castle palace or temple interior in Egypt* ·
  Room 2: *Egyptian corridor with columns and magic portal* · Room 3: *Abandoned ancient egypt
  temple game background* · Room 4: *Night old Egypt medieval stone corridor interior* · Room 5:
  *Egyptian pharaoh temple with treasure and tomb...* · escape: *Egyptian tomb room interior with treasure*.
- **Sprites, UI frames and icons** were generated with Freepik's image generator (Nano Banana 2.1)
  and cut out with Freepik background removal: the sun and moon seals, the scarab guide, the
  ankh coin, the sealed tomb door (split into a frame and two leaves so it can swing open), the
  papyrus, gold, sandstone, cartouche and stone-niche frames, and two 4x4 icon sheets.
- Panels are 9-slice `border-image` frames drawn with a small outset, so the art never changes
  layout. Shadows are `drop-shadow` filters that follow the art's outline.
- Art is presentation only. No rule, score or answer depends on it, and the inscription is never
  colour-coded (that would give away the sorting).

## Controls

| Action | Touch / mouse | Keyboard |
|---|---|---|
| Sort a term | Drag the tablet onto a seal, or tap the tablet then tap a seal | Tab to a tablet, Enter, then Tab to a seal, Enter |
| Type x and y | Stone keypad (digits, minus, delete) | Digits, `-`, Backspace |
| Solve | Button (Unlock / Align rings / Clear fog / Solve / Break seal) | Enter |
| Pause | Pause button | Esc or P |

## Rules the player is scored against

Kept from the original:

- **5 rooms** with the original names and timers: 30, 40, 50, 60 and 75 seconds.
- **Step 1:** sort the four terms into Real and Imaginary. `i7` means `7i`. In `i(4y + 3)` the whole
  bracket is the imaginary part.
- **Step 2:** solve the two real equations for x (and y in rooms 2-5).
- **A wrong solution or a time-out resets the room with a new inscription after 3 seconds**
  (as in the original), with a "Try again now" button to skip the wait.
- Answers are **whole numbers**. `−` and `-` are both accepted; `3.7` or `5abc` are not.

New:

- **Coins** for opening a door: 100 + 4 per second left − 15 per hint − 10 per mistake,
  never below 20. Coins fly from the door into the HUD counter.
- **Stars:** 3 with no mistakes, 2 with 1-2, 1 with 3 or more. A *mistake* is a tablet dropped on the
  wrong seal, a wrong solution, or a time-out. Mistakes carry across retries of the same room.
- **Hint (Eye button, −15 coins):** while sorting it places one tablet; while solving it shows a
  working step (up to two per room).
- **Free helper:** when half of the room's time has gone, the next tablet and its seal pulse with a
  heartbeat, or, while solving, the first working step appears. It costs nothing and is listed in
  How to Play.
- **Named mistakes:** a wrong drop says why (*"15" has no i beside it, so it belongs to the Sun
  Seal*); a wrong solution names the slip: swapped x and y, a wrong sign on one value, both signs
  flipped, or which part is still unbalanced. The fail card also shows the right answer.
- An empty or non-numeric box is **not** a mistake: the box shakes and asks for a value.

## Gamification

- Boot, menu, room map (5 rooms, opened in order, with stars and best coins), play, results,
  final Certificate of Escape (the original's wording), plus How to Play, Settings, Pause and Learn More.
- Room entrance: the door rises, the cartouche unrolls and the tablets fly out of it (about 1.7 s,
  input locked, clock starts after).
- Juice: sparks on every correct drop, seals flying from the trays into the door sockets, the
  door swinging open onto golden light, a red rim and shake on mistakes, a coin shower at the end.
- The scarab guide reads the original narrator line for each room, then gives instructions and feedback.
- Rooms 3 and 4 keep the original's fog and mist as drifting overlays.
- Saved in `localStorage` (`twinSealTomb.v1`): best coins and stars per room, opened rooms, music and
  SFX settings. Reset progress keeps the sound settings.
- **Learn More** (results and final screen only): the rule, why one complex equation gives two real
  equations, a worked example of the room you just played, and how the rooms grow harder.

## Replaceable / optional assets

Replace any file with one of the same name, size and orientation.

| File | Size | Notes / fallback if missing |
|---|---|---|
| `assets/audio/bgm.mp3` | any length, loops | Optional, not shipped. Procedural Web Audio music plays instead. |
| `assets/images/backgrounds/{title,menu,room1..room5,escape}.jpg` | 1080 px tall, landscape 2:1 to 3.3:1 | Shown with `cover`. Falls back to plain dark umber. |
| `assets/images/sprites/door-frame.png` | 760x984, transparent | Required. The opening is at left 17.9%, top 19.8%, 64.2% x 78.2%. |
| `assets/images/sprites/door-leaf-left.png`, `door-leaf-right.png` | 244x769 each, transparent | Required. Socket centres: 47.1% / 52.5% across, 48.2% down. |
| `assets/images/sprites/seal-sun.png`, `seal-moon.png` | 360x360, transparent, round | Required. |
| `assets/images/sprites/scarab.png` | 332x420, transparent | Optional: hidden if missing. |
| `assets/images/sprites/coin.png` | 160x160, transparent | Used for the HUD and flying coins. |
| `assets/images/ui/frames/papyrus.png` | 720x493, slice 110 | 9-slice panels. Falls back to the CSS papyrus gradient. |
| `assets/images/ui/frames/btn-gold.png` | 480x138, slice 62 / 70 | Falls back to the CSS gold gradient. |
| `assets/images/ui/frames/btn-stone.png` | 480x173, slice 52 | Buttons, chips, keys, term tablets. Falls back to CSS sandstone. |
| `assets/images/ui/frames/cartouche.png` | 900x273, slice 115 200 115 140 | The inscription plaque (knot on the right). Falls back to CSS gold. |
| `assets/images/ui/frames/niche.png` | 320x496, slice 64 | Trays, title plate, room banner. Falls back to CSS dark stone. |
| `assets/images/ui/icons/*.png` | 128x128, transparent | Required. |

## Bugs fixed from the original

1. **Unwinnable question:** room 4, `5x + i(3x + y) = 20 + i11`, expected y = 1. With x = 4 the
   imaginary part gives 12 + y = 11, so **y = −1**. All 50 answers are now checked by script.
2. **Lenient answers:** `parseInt` accepted `3.7` as 3 and `5abc` as 5. Now only whole numbers.
3. **A blank box failed the room** (it parsed as NaN). Now it just asks for a value.
4. **Fragile dragging:** separate mouse and touch handlers, no pointer capture, and a global
   `touchmove` block. A missed `touchend` could leave a term stuck to the finger. Now unified
   Pointer Events with capture, cancelled on `pointercancel`, `blur` and tab switch.
5. **The timer ran in a hidden tab**, and there was no pause. Now it pauses automatically.
6. **A retry could pick the same question again.** It now avoids an immediate repeat.
7. **Wrong drops were silent.** They now explain which part the term belongs to.
8. The AudioContext was created on page load (blocked by autoplay rules until a click), and a
   constant 40 Hz sawtooth drone played in every room. Audio now unlocks on the first gesture,
   with separate Music and SFX toggles that persist.
9. Emoji were used for all art and the mute button. All replaced with Freepik images.

## Verification (served over HTTP, `python -m http.server`)

- `node --check` passes on every JS file. The scan finds no external URLs, no emoji or emoji
  entities, no debug hooks, and every referenced asset path (62) resolves.
- All 50 answer keys satisfy both parts (script check). The original room-4 key fails it.
- Scripted full runs with dispatched touch `PointerEvent`s through rooms 1-5 to the certificate:
  wrong drop, correct drops, hint while sorting, hint while solving, empty submit, wrong solution,
  named near-misses (swapped, sign of x, sign of y, both signs, unbalanced part), auto-retry after 3 s,
  "Try again now", time-out at 30 s, pause (clock frozen, dragging blocked), Enter to submit,
  keypad input, Learn More, Settings toggles, reset keeping preferences, room unlocks, saved bests.
- Stalled animation timeline (every animation frozen at t = 0 during the intro and the win): tablets
  end at full size and `elementFromPoint` hits each one; coins land and the results open.
- Layout, play screen in both phases, measured: no horizontal or vertical scroll, door inside its
  area and below the cartouche, no clipped inscription or tablets, at 1920x1080, 1440x900, 1366x640,
  1024x1366, 375x812 and 360x640. Height used: 98%. Door height while sorting / solving:
  644/511, 510/390, 282/170, 583/583, 273/229 and 136/126 px.
- The only 404s are the optional `bgm.mp3` and the browser's automatic `favicon.ico`.

Not verified: a real phone or the target WebView (touch was simulated), how the audio sounds
(nothing was listened to), `prefers-reduced-motion` (styles are written but were not emulated),
and the `bgm.mp3` drop-in with a real file.
