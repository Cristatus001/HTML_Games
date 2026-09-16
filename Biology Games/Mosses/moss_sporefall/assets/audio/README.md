# Audio — Moss Sporefall

This folder is **intentionally empty**. The game needs no audio files.

## Background music

By default the score is **synthesised live in the browser** with the Web Audio
API: a slow four-chord ambient pad, a filtered mist layer, and randomly timed
water droplets. It loops forever, costs nothing to download, and works with no
network connection.

## Optional drop-in music file

If you would rather ship a recorded track, drop it here as:

```
assets/audio/bgm.mp3
```

On startup the game probes for that file:

* **File present and playable** — it is used instead of the synth, looped, and
  the Settings panel reports "Music: playing assets/audio/bgm.mp3".
* **File missing or unplayable** — the synth is used and nothing is logged as a
  failure. This is the normal, shipped state.

Recommended: 128 kbps mono or stereo MP3, seamless loop, 60-180 seconds,
peaking around -14 LUFS so it sits under the sound effects.

The music toggle in Settings controls whichever source is active, and the choice
is saved to `localStorage`.

## Sound effects

Sound effects are always synthesised (collect, hurt, land, UI clicks, win, lose).
There is no way to override them with files, and no files are required.
