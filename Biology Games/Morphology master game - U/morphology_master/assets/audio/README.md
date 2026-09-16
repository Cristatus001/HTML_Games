# Audio

The game ships with **no audio files** and needs none.

## Sound effects

Fully synthesised with the Web Audio API at runtime (`js/audio.js`): selection
clicks, the correct / incorrect / incomplete chimes, and the victory fanfare.
There is nothing to install and nothing to replace.

## Background music

By default the music is a procedural ambient pad, also generated in the browser:
a held D-minor-add9 chord through a slowly breathing lowpass filter, with sparse
bell tones drifting over it. It loops forever and costs no files.

### Optional drop-in track

Put a file here named exactly:

    bgm.mp3

If it loads, it **replaces** the procedural pad and plays on loop. If it is
missing, fails to decode, or takes longer than 3.5 seconds to become playable,
the game silently falls back to the pad. Nothing is reported to the player
either way.

Recommendations for a drop-in track:

- Format: MP3 (widest WebView support). 128-192 kbps is plenty.
- Length: 60-180 seconds, seamlessly loopable.
- Keep it quiet and un-busy. It plays under a study activity, and it is mixed at
  about 55 percent so the effects stay audible over it.

### Playback notes

- Audio is created only after the first pointer or key input, as browser
  autoplay policies require. Nothing plays on a cold load.
- Both the effects and the music have their own on/off switch in Settings, and
  the choice is saved to `localStorage`.
