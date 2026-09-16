# Hybrid Shooter

A production-ready, fully offline HTML5 mini-game teaching sp³ / sp² / sp
carbon hybridization, built from the Hybrid Shooter GDD.

## Running it

Open `index.html` directly in a browser, or point a WebView at it. No server,
build step, or internet connection is required — every font, icon and sound
is bundled or generated in-browser.

## Folder layout

```
hybrid_shooter/
  index.html
  css/style.css
  js/data.js       compound + hybridization data, random facts
  js/assets.js      optional image loader with graceful fallback
  js/audio.js       procedural music + sound effects (Web Audio API)
  js/main.js        game logic, rendering, input, UI
  assets/fonts/      local woff2 fonts (Baloo 2, Nunito)
  assets/images/     drop-in art (see below)
  assets/audio/      optional drop-in music file
```

## Dropping in real art (optional)

The game renders every visual with built-in vector/canvas art by default.
Placing a correctly-named image file below automatically replaces the vector
placeholder — nothing needs to be edited in code, and a missing file simply
falls back to the existing art with no errors.

| Element | File | Recommended size | Orientation / notes |
|---|---|---|---|
| Ship (idle) | `assets/images/characters/ship_idle.png` | 256×256 | Top-down view, transparent background |
| Ship (thrusting) | `assets/images/characters/ship_thrust.png` | 256×256 | Currently unused by default render but loaded for future use |
| Mascot — happy | `assets/images/characters/mascot_happy.png` | 512×512 | Square, transparent background |
| Mascot — neutral | `assets/images/characters/mascot_neutral.png` | 512×512 | Square, transparent background |
| Mascot — sad | `assets/images/characters/mascot_sad.png` | 512×512 | Square, transparent background |
| Background — far layer | `assets/images/background/bg_far.png` | 1080×1920 | Portrait, seamless top/bottom tile optional |
| Background — mid layer | `assets/images/background/bg_mid.png` | 1080×1920 | Portrait |
| Background — near layer | `assets/images/background/bg_near.png` | 1080×1920 | Portrait |
| Asteroid — sp³ | `assets/images/asteroids/asteroid_sp3.png` | 256×256 | Square, transparent background |
| Asteroid — sp² | `assets/images/asteroids/asteroid_sp2.png` | 256×256 | Square, transparent background |
| Asteroid — sp | `assets/images/asteroids/asteroid_sp.png` | 256×256 | Square, transparent background |
| Title logo | `assets/images/ui/logo.png` | 900×360 | Transparent background (not yet wired into markup; add an `<img>` if replacing the CSS text logo) |
| Panel background | `assets/images/ui/panel_bg.png` | 680×900 | 9-slice friendly if possible |
| Button background | `assets/images/ui/button_bg.png` | 400×160 | 9-slice friendly if possible |

All UI icons (hearts, star, speaker, music note, gear, close, play, pause,
retry, home, info, check, trophy, power-up icons) already exist as real PNG
files under `assets/images/ui/emoji/` — no emoji characters are used
anywhere in the game. Their matching source `.svg` files are kept alongside
them for easy re-editing/re-export if you want to restyle them; only the
`.png` files are referenced by the game.

## Audio

* Background music is synthesized live with the Web Audio API — no file
  required. Drop a file at `assets/audio/bgm.mp3` (looping-friendly) and it
  will automatically be used instead.
* All sound effects (shoot, correct, wrong, explosion, power-up, life lost,
  game over, win, click) are also synthesized in-browser.
* Music and SFX each have an independent on/off toggle in Settings, reachable
  from the title screen and the in-game pause menu. Preferences persist via
  `localStorage`.

## Gameplay summary

* Drag along the line near the bottom to move the ship; tap either glowing
  side button to shoot.
* The question tab names the current hybridization to hunt (sp³, sp², or sp);
  it changes every ~9 seconds.
* 3 lives. Shooting the wrong compound or letting a correct one reach the
  line costs a life and 5 points; correct shots are worth 10 points.
* Every 3 correct shots increases asteroid speed. A 3/4/5 correct-answer
  streak unlocks Sure Hit / Slow Time / Time Freeze power-ups respectively;
  activating one resets the current streak.
* Reaching 15 correct shots wins the run; running out of lives ends it. The
  result screen reviews every compound you got wrong with its correct
  hybridization.
* Progress (best score) and settings are saved locally; a one-time
  interactive tutorial (FTUE) runs the first time you tap Play, and a
  "How To Play" reference is always available from the title screen.

## Mobile / WebView notes

Pinch-zoom, double-tap-zoom, text selection, and context menus are disabled.
Touch and mouse input are both fully supported. The 9:16 stage scales to fit
any phone screen and respects safe-area insets for notches.
