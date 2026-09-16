# Audio assets

## Background music is optional

The game generates its background music **in the browser** using Web Audio
oscillators — an ambient synth pad with a slow filter sweep and a sparse bell
motif over a four-chord cycle. It loops indefinitely, needs no files, and works
with zero internet access. This is the default.

## Overriding it with your own track

Drop **one** of these into this folder and it replaces the generated pad
entirely:

| File | Format |
|---|---|
| `bgm.mp3` | MP3 — checked first, best WebView support |
| `bgm.ogg` | Ogg Vorbis — checked second |
| `bgm.m4a` | AAC/M4A — checked third |

Recommendations:

- **Loop cleanly.** The file is played with `loop = true`, so the tail must meet
  the head without a click or a gap.
- **Length:** 60–180 seconds is plenty.
- **Level:** master it quietly. The music bus is held at roughly 17 % gain, but a
  hot master will still fight the sound effects.
- **Size:** keep it under ~3 MB so the app stays quick to load from local storage.

If the file is missing, fails to decode, or autoplay is refused by the WebView,
the game falls back to the procedural pad without an error.

## Sound effects

Sound effects are **always** synthesised at runtime (short oscillator and
filtered-noise bursts): arming clunk, waiting tick, release whoosh, catch ping,
slip thud, false-start buzz, stage fanfare and grade chimes. There are no sample
files to supply and none are loaded.

## Controls

Music and sound effects have independent on/off switches in the in-game
**Settings** panel, and both choices persist in `localStorage`. Audio stays
suspended until the player's first tap or keypress, as browsers require, and
pauses automatically when the app is backgrounded.
