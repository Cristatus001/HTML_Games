# Audio — Vector Analysis Lab

The game ships with **no audio files**. Everything is synthesised in the
browser with the Web Audio API, so it works with zero internet access and zero
assets:

- **Music** — an ambient deck pad (three detuned oscillators through a slowly
  breathing low-pass filter), a low bandpass noise bed, and a sparse bell motif
  over an Am – F – C – G drone that changes every ~8 s.
- **Sound FX** — short synthesised blips for clicks, pick-up/drop, the scanner
  snap and ticks, and the pass/fail verdict chimes.

Both are toggled independently in **Settings**, and the choice is saved to
`localStorage`.

## Optional drop-in music file

Put a file here named exactly:

```
assets/audio/bgm.mp3
```

and it **overrides** the procedural pad — the game fades the synth out and
loops your track instead (volume 55%, seamless `loop`). If the file is absent,
missing or fails to decode, the procedural music simply keeps playing; nothing
breaks and the console notes which path was taken.

Recommendations for a drop-in track:

| Property | Suggested |
|---|---|
| Format | MP3 (widest WebView support). CBR 128–192 kbps is plenty. |
| Length | 60–120 s, composed to loop seamlessly (match the head and tail). |
| Level | Peak around −6 dBFS; the game plays it at 55% volume. |
| Content | Ambient/atmospheric. Avoid a hard transient at the loop point. |

Sound effects always stay procedural — there is no file slot for them.

## Autoplay

Browsers and WebViews block audio until the user interacts with the page, so
the audio context is created and resumed on the **first pointer or key event**.
Nothing needs to be configured for this.
