# Gravity Quest — Audio

The game needs **no audio files at all**. Every sound effect and the background
music are synthesised in the browser with the Web Audio API, so it runs fully
offline out of the box.

## Optional drop-in music

Place a file at:

    assets/audio/bgm.mp3

If it loads, it plays on loop and **replaces** the procedural ambient pad. If it
is missing, fails to decode, or times out, the game silently falls back to the
synthesised pad — no error, no broken state.

- Format: MP3 (widest WebView support). ~128 kbps is plenty.
- Length: anything; it is looped seamlessly by the `<audio loop>` attribute, so
  author it to loop cleanly.
- Level: mixed to sit under the sound effects — playback volume is set to 0.5.

The Music toggle in Settings controls whichever source is active.

## What is synthesised

- **Ambient pad** — three detuned sawtooth voices through a slowly sweeping
  lowpass filter, moving through an Am / F / C / G progression, with an airy
  filtered-noise bed and a sparse bell arpeggio.
- **Sound effects** — `click`, `hover`, `whoosh`, `correct`, `incorrect`,
  `thud`, `coin`, `unlock`, `deny`, `launch`, `fanfare`.
