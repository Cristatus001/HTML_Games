# Audio

**No audio file is required.** The soundtrack and every sound effect are
synthesised in the browser with the Web Audio API, so the game ships silent on
disk and still has music offline.

## Optional drop-in music

To replace the synthesised score with your own track, put a single file here:

| File | Format | Notes |
|---|---|---|
| `bgm.mp3` | MP3, 128 kbps mono or stereo | Looped continuously. Aim for 1-3 minutes and make the loop point seamless — playback restarts immediately with no crossfade. Keep it under about 3 MB so start-up stays fast in a WebView. |

Behaviour:

- If `bgm.mp3` is present and decodes, it plays and the synthesiser stays off.
- If it is missing, fails to decode, or takes longer than 2.5 s to become
  playable, the game falls back to the synthesised score with no visible error.
- Either way the **Music** switch in Settings controls it, and the setting is
  remembered on the device.

Playback cannot begin until the first tap or key press — mobile WebViews block
autoplay, so the audio graph is created on that first gesture. This is expected
and needs no configuration.

## What the synthesiser plays

- A slow four-chord pad loop (A minor, F, C, G) in a low register, two detuned
  voices per note through a lowpass filter that breathes open and closed.
- A soft double heartbeat on each downbeat, standing in for the specimen
  monitor.
- A sparse high blip every other bar.

Sound effects (taps, correct/incorrect verdicts, screen transitions, the rank
fanfare) are generated the same way and are governed by the separate **Sound
effects** switch.
