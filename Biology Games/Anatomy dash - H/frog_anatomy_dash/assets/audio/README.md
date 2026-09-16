# Audio assets

The game ships with **no audio files** and needs none: music and every sound
effect are synthesised in the browser with the Web Audio API (`js/audio.js`),
so it works fully offline.

## Optional music drop-in

| File | Notes |
|---|---|
| `bgm.mp3` | Looping background music. If present it replaces the procedural pad. |

Put the file at `assets/audio/bgm.mp3`. On boot the game tries to load it:

* **loads** -> the file loops as the music bed, and the Music toggle in Settings
  starts/stops it;
* **missing or unplayable** -> the procedural marsh synth plays instead, and the
  404 in the console is expected, not an error.

Any format the target WebView can decode works if you keep the `.mp3` filename,
but MP3 is the safest choice across Android and iOS WebViews. Aim for a seamless
loop, mono or stereo, around −16 LUFS; the game plays it at 50 % volume and
ducks to 22 % while a question panel is open.

Sound effects (hop, land, orb absorbed, correct, wrong, splash, win, UI clicks)
are always synthesised and are governed by the separate Sound Effects toggle.
