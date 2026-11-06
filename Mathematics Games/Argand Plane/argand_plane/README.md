# Mirror River City: Argand Plane

A gamified, offline, mobile-ready version of **"Argand Plane (Simulation)"** (originally
"City Rescue: Complex Numbers Edition"). The original file sits untouched one folder up.

The city's **real axis is a river**, so the conjugate z̄ of every power station is
literally its reflection in the water. You drive a toy taxi around the Argand plane,
plot a failing station at z = a + ib, reboot it with its modulus, then cross the
river to its conjugate to stabilize the grid.

## Run it

Open `index.html` in any modern browser, or load it in the app's WebView. No internet
needed: fonts, icons, scripts and audio are local or generated at runtime.

```
argand_plane/
├── index.html
├── README.md
└── assets/
    ├── css/style.css
    ├── js/
    │   ├── data.js     question bank, sector names, task text from the deck, rules
    │   ├── audio.js    procedural music + synthesized sound effects
    │   ├── world.js    the canvas Argand plane: river, grid, houses, car, particles
    │   ├── fx.js       DOM effects: flying coins, toasts, banners, lantern shower
    │   └── game.js     game flow, rules, HUD, screens, saving
    ├── fonts/          Baloo 2 (display) + Lexend (body and all numbers), .woff2, OFL
    ├── images/
    │   ├── ui/icons/   36 PNG icons (128x128)
    │   ├── ui/paper.jpg  hand-painted paper texture for every panel
    │   ├── sprites/    houses (3 styles x 4 states), taxi, boat, moon, skyline
    │   └── art/        title illustration, menu backdrop, one illustration per sector card
    └── audio/          empty: optional bgm.mp3 goes here
```

## Art

All images were generated with **Freepik AI** (Nano Banana 2.1 model) in one storybook style: the title
illustration was generated first and every other image used it as a style reference, so the set matches.
Backgrounds were removed with Freepik's background remover where a sprite needed transparency, and the
results were cut, trimmed and sized with Node + `sharp`. The images are presentation only: no rule,
score or task depends on them.

- **Houses:** three building styles (cottage, narrow townhouse, corner shop with a striped awning). Each
  style was generated as one 2x2 sheet of the same building in the four states the game uses, so the
  states line up exactly: dark, failing (red windows that flicker), lit (powered) and mirror (violet).
  A house's style comes from its address, never from its role, so the art cannot give away which
  house is z or z̄. When z̄ is reached it becomes the violet mirror image of z's own building.
- **Taxi:** a top-down yellow taxi with a checker stripe and a glowing roof lantern, rotated to the
  direction of travel.
- **Scenery:** a painted moon, a far skyline of rooftops, a bell tower and a dome on the river bank
  (made to tile, drifting with parallax and reflected faintly below the real axis), and two paper
  lantern boats on the river. All scenery is drawn behind the grid and the houses.
- **Screens:** the title illustration (the town reflected in the river) heads the start and menu
  panels; a second painting of the town fills the background of the start, menu and sector screens;
  each sector card shows its own painting: Lantern Quay, Copper Bridge, Willow Bend, Four Quarters,
  Far Shore. Locked sectors show their painting greyed under a padlock.
- **Icons:** all 36 interface icons were redrawn in the same style (chunky, cream and terracotta, plum
  outline). The four arrows are one arrow turned; "sound off" is the speaker with the same red slash
  as "music off".
- **UI:** panels, buttons and HUD chips use the painted paper texture with a stitched inner border; the
  sector number sits on the edge of each sector painting like a seal.

## Changes taken from the deck ("Games and simulations (Complex Numbers).pptx")

Slides 1–4 cover this game (slides 5–8 describe a different card game and were not used).

| Deck | Implemented as |
|---|---|
| Slide 1: "This simulation has 3 tasks" | A task tracker under the HUD: Task 1 Plot z, Task 2 Find abs(z), Task 3 Find z̄, each locked / active / cleared. The sector briefing lists all three. |
| Slide 2: Task 1 instruction box: "Locate the failing power station. Drive to locate the failing house at coordinates z = a + ib." | Shown word for word in an "Instruction to the player" panel during Task 1. The target chip is labelled "The complex number to be plotted", and the car is the player's marker. |
| Slide 3: Task 2, find the modulus | "Station reboot" panel with the right-triangle diagram, the formula and the answer box. Stays as in the original, with feedback that names the mistake. |
| Slide 4: "After the modulus is successfully solved, a new objective unlocks to stabilize the surrounding electrical grid…" plus the instruction box "For z = a + ib, reflect across the real axis to locate the conjugate coordinate z̄ = a − ib. Drive to the conjugate house to finish stabilizing the sector before time runs out!" | A "New objective unlocked" banner when Task 2 is solved, then that instruction word for word in the panel. The solved station lights up and the abs(z) line is drawn from 0 to z, as in the slide-4 screenshot. |

## Controls

| Action | Keyboard | Touch / mouse |
|---|---|---|
| Drive one grid step (hold to keep driving) | Arrow keys or WASD | On-screen pad |
| Check the house you are parked on | Enter or Space | **Check** button |
| Pause | Esc or P | Pause button |

## Rules the player is scored on

Scoring is identical to the original:

- **Task 1:** drive to the house at z = a + ib and check it. Right is the real axis, up is the imaginary axis.
- **Task 2:** type |z| = √(a² + b²). Accepted within **±0.05**, the original tolerance. Decimals and a comma decimal point are accepted. The clock is paused while this panel is open, as in the original.
- **Task 3:** drive to z̄ = a − ib (the reflection across the river) and check it.
- **Points:** +100 for the modulus, +500 for the conjugate, plus floor(seconds left × 10).
- **Clock:** 90 s per sector. At 0 the grid fails and you retry the sector.
- **Stars** (new): 3 for no mistakes, 2 for 1–2, 1 for 3 or more. A mistake is checking the wrong house or entering a wrong modulus. Checking an empty street is not a mistake.
- **Safety net** (new, free): after **45 s** on Task 1 or Task 3, the house you need pulses with a heartbeat glow until you check it. It costs no points and no stars. It is listed in How to Play.
- **Near misses are named:** swapped parts, a wrong sign, landing on z̄ during Task 1, reflecting across the imaginary axis, landing on −z, typing a² + b² without the root, a + b, a² − b², or one side only. After two wrong moduli the working a² + b² = … is shown (but not the root).

## Gamification

- Boot → menu → sector map (5 sectors, unlocked in order) → briefing → play → results, plus How to Play, Settings and a Pause menu.
- Lantern-coin currency that flies from the house into the score chip, star ratings, best score per sector, a "New best!" tag, and a mistake log on the results screen.
- Juice: houses rise out of the river at the start of a sector (input locked about 1.7 s, clock starts after), sparks when a station is found, a power-up burst, a ghost house flipping across the river to z̄, the whole sector lighting up on completion, a red rim and shake on mistakes, and a lantern shower at the end.
- **Learn More** (results screen only): the Argand plane, modulus, conjugate, worked with the sector's own z, plus a diagram and the facts |z̄| = |z|, z·z̄ = |z|², and z + z̄ = 2a.
- Saved in `localStorage` (`mirrorRiverCity.v1`): best score and stars per sector, unlocked sectors, music/SFX settings. Reset progress keeps the sound settings.
- Procedural evening music (pad, sub, river noise, sparse plucks) with separate Music and SFX toggles.

## Replaceable / optional assets

Every image below ships with the game and can be replaced with a file of the same name.
The game still runs if any of them is deleted.

| File | Size and orientation | If missing |
|---|---|---|
| `assets/audio/bgm.mp3` | any length, loops (not shipped) | Procedural Web Audio music |
| `assets/images/sprites/house-{cottage,tower,shop}-{dark,failing,lit,mirror}.png` | 512×512, transparent; ground line at y ≈ 452, house centred | Canvas-drawn house |
| `assets/images/sprites/car.png` | 512×320, transparent, top-down, car **facing right** (rotated to the direction of travel) | Canvas-drawn toy taxi |
| `assets/images/sprites/boat.png` | 320×200, transparent, side view, waterline near the bottom | No boats |
| `assets/images/sprites/moon.png` | 512×512, transparent, with its own glow | No moon |
| `assets/images/sprites/skyline.png` | any width × 340, transparent, tiles horizontally, ground at the bottom edge | No skyline |
| `assets/images/art/title.png` | 1800×660 | The start and menu panels show text only |
| `assets/images/art/backdrop.jpg` | 1920 wide, about 2.35:1, shown cropped to the screen | Plain dusk background behind the menus |
| `assets/images/art/sector-1.png` … `sector-5.png` | 960×480 (shown cropped to 16:9) | Sector cards without a picture |
| `assets/images/ui/paper.jpg` | 512×512, tileable | Plain cream gradient on panels |
| `assets/images/ui/icons/*.png` | 128×128, transparent | Required: already present |

## Bugs fixed from the original

1. **Unplayable on phones:** the only way to check a house was the Enter key. There is now a Check button.
2. **The conjugate house gave itself away:** it was spawned only after Task 2, so a new grey house appeared at z̄. It now exists from the start and looks like every other house.
3. **A misleading hint:** red "target" particles were spawned at (a, −b), the conjugate's position, during Task 1.
4. **Decoys could overlap the target or each other**, and Level 5 targets (up to ±15) stood alone outside the decoy area (±9), so the target was easy to spot. Decoys are now unique, spread to cover the target, and include the classic mistakes (b + ai, −a + bi, −a − bi). The decoy count (12 + 3 × level) is unchanged.
5. **Enter in the modulus box played the error buzz** even on a correct answer, because the window's Enter handler ran too.
6. **Retrying after a time-out kept the +100** from the failed attempt, so the score could be farmed. Retry now restores the score you had when the sector began.
7. **The engine drone stacked:** a new oscillator was created every level, never stopped, and never went quiet. It is replaced by short per-step sounds.
8. The high score was saved but never shown. Bests and stars now appear on the menu and the sector map.
9. Particles were removed with `splice` inside `forEach`, which skipped some. The HUD stayed visible over the game-over screen.
10. A car could drive off forever. It is now limited to ±24, well past every house.

## Verification (served over HTTP)

- `node --check` passes on every JS file. The scan finds no external URLs, emoji or HTML emoji entities, and no debug hooks. Every icon, font and script path resolves.
- Scripted full runs with dispatched keyboard and touch `PointerEvent`s: intro input lock, empty-street check, swapped-decoy near miss, wrong moduli (a² + b², a + b) with the working shown, the correct modulus, both conjugate near misses, completion, star rating, results, Learn More, the 45 s assist, pausing (clock frozen, driving blocked), time-out, retry (score restored), sector unlock, Sector 5 to the victory screen, and saved progress.
- 200 generated maps per sector (1,000 total): every bank question appears, with no duplicate houses, no house on the river, exactly one z and one z̄ house, and the decoy count equal to the original.
- With every Web Animation frozen at t = 0, coins still land, the score reaches its total and the results open.
- No horizontal scroll at 375×812, 1366×640 and 1440×900. The canvas fills the whole viewport at every size.
- The only 404s are the optional `bgm.mp3` and the browser's automatic `favicon.ico` request.
- Freepik art pass: the start, menu, sector, modal, results and play screens were checked on screen at
  1440×900 and 375×812 (no horizontal scroll), including a full run through all three tasks of Sector 1
  with the lit and mirror houses.
