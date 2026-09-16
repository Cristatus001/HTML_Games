# Audio — Vector Explorer: Sky Realm

The game needs **no audio files at all**. Music and sound effects are both
synthesised in the browser with the Web Audio API, so it runs fully offline.

## Background music

By default the game generates an airship-deck ambience live: a slow detuned pad
moving through a four-chord progression, a low engine hum, filtered wind, and a
sparse bell melody, all fed through a procedurally generated plate reverb.

### Optional drop-in track

If you prefer your own music, put a file here:

```
assets/audio/bgm.mp3
```

On boot the game probes for that file. If it loads, the procedural synth is shut
down and your track plays instead, looped, at 50% volume. If the file is absent
or fails to decode, the synth starts and nothing is logged as an error.

- **Filename:** exactly `bgm.mp3` (this is the only path checked).
- **Format:** MP3. Any sample rate; stereo or mono.
- **Length:** anything. It loops, so a seamless loop point sounds best.
- **Loudness:** master it around −16 LUFS; the game plays it at 0.5 gain and
  does not compress or normalise.
- Both music and sound effects respect the toggles in the Settings panel, and
  the choice is saved to `localStorage`.

## Sound effects

Fully procedural, no files involved: survey bell on placing the origin, a rising
brass chime on choosing a target, a soft tick while tracing a path, an arrival
chime, a low thud on a miss, an ascending arpeggio for a correct answer, and a
fanfare on certification. They are defined in `Sound.play()` in `js/audio.js`.

Audio only starts after the player's first interaction (the "Board the Airship"
button), because browsers and WebViews block audio until a user gesture.
