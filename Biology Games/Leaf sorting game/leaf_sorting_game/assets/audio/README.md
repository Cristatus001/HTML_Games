# Audio — optional drop-in music

**The game ships with no audio files and needs none.** All music and every
sound effect is synthesised in the browser with the Web Audio API, so it works
with zero network access and zero assets:

- **Music** — a slow forest pad: three detuned oscillator voices moving through
  a four-chord progression, a breathing low-pass filter, a filtered-noise wind
  bed, and an occasional pentatonic bell. Defined in `js/audio.js`.
- **Sound effects** — pick, tray hover, correct arpeggio, wrong thud, star
  chime, level fanfare, unlock sparkle. Also synthesised.

## Overriding the music with a file

Drop **one** of these in this folder and it replaces the procedural pad:

| filename | notes |
|---|---|
| `bgm.mp3` | tried first — safest for Android and iOS WebViews |
| `bgm.ogg` | tried second |
| `bgm.m4a` | tried third |

- Loops seamlessly (`loop = true`), so trim the file to a clean loop point.
- Keep it quiet — it is mixed at roughly 55 % and ducks during correct answers.
- Suggested: 1–3 minutes, 96–128 kbps mono or joint stereo, under ~3 MB.
- If the file is missing, corrupt, or the codec is unsupported, the game falls
  back to the synthesised pad silently. Nothing is logged to the player.

The music and sound-effect toggles in **Settings** (and the two quick toggles
in the game HUD) control both paths identically, and the choice is saved to
`localStorage`.

## Sound effects

There is no file-based override for sound effects — they are short synthesised
transients, which keeps the package small and latency near zero. To retune
them, edit the `SFX` map in `js/audio.js`; each entry is a few `Audio2.tone()`
and `Audio2.noise()` calls with frequency, waveform, envelope and filter.
