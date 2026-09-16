# Audio

The game needs **no audio files at all**. Music and every sound effect are
synthesised in the browser with the Web Audio API, so it runs with zero network
access and nothing to download.

## Optional soundtrack override

Drop a file here named exactly:

```
bgm.mp3
```

If it loads, it replaces the procedural ambient pad and plays on a seamless
loop at 50 % volume. If it is missing, malformed, or slow to load (2.2 s
timeout), the game silently falls back to the synthesised pad — the 404 you see
in the console on a fresh install is expected and harmless.

Recommendations:

- **Format:** MP3, 128–192 kbps, 44.1 kHz, stereo (widest WebView support).
- **Length:** 60–180 s, composed to loop cleanly with no gap at the seam.
- **Level:** peak around −6 dBFS. The mix is quiet and atmospheric so answer
  feedback stays audible over it.
- **Mood:** slow, sparse, unhurried — a large quiet instrument room. Avoid
  strong percussion; the riddles are read, not raced.

The Music toggle in Settings controls this file exactly as it controls the
procedural pad, and the choice is saved to `localStorage`.

## Sound effects

Effects are always procedural and cannot be overridden by files: hover, click,
select, correct, wrong, deny, unlock, star, tick, reset and the end-of-run
fanfare. They are defined in `assets/js/audio.js`; retune them there.

Browsers require a user gesture before audio may start, which is why the boot
screen ends on an **Enter the Lab** button — that tap unlocks the audio context.
