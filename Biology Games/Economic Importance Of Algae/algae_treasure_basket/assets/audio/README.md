# Audio

The game ships with **no audio files** and needs none.

## Sound effects

Fully synthesised in the browser with Web Audio oscillators and noise buffers
(`js/audio.js`). Nothing to supply.

## Background music

By default the game generates a looping ambient reef synth at runtime: a
four-voice detuned pad behind a slowly breathing lowpass filter, a convolution
smear built from generated noise, sparse pentatonic bell plucks, and a filtered
noise "current" that swells and falls. It never repeats exactly and needs no
files.

### Optional drop-in track

Put a file here:

```
assets/audio/bgm.mp3
```

If it loads, it replaces the procedural synth and loops. If it is missing,
malformed, or the browser cannot decode it, the game falls back to the synth
without any error. Either way, the Settings panel reports which one is playing.

Recommendations for a drop-in track:

- **Format:** MP3 (widest WebView support). 128–192 kbps is plenty.
- **Length:** 60–180 seconds, seamlessly loopable — the start and end must
  match, since the game loops it with no crossfade.
- **Level:** mixed quietly. The game plays it at 50% gain, and the sound
  effects sit on a separate bus, so a loud master will bury them.
- **Mood:** calm, underwater, no strong beat. It plays continuously across the
  menu and the dives.

The path is set by `AudioSys.bgmPath` in `js/audio.js` if you need to change it.
