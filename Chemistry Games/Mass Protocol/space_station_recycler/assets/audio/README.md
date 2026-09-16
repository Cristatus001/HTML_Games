# Drop-in Background Music

Optional, like the art assets in `assets/images/`. Right now the game generates
its own background music entirely in-browser — a calm, evolving ambient synth
pad (built from Web Audio oscillators, zero files, zero network). If you drop
a real music file in here, the game uses it instead. If the file is missing or
fails to load, the procedural pad keeps playing — nothing breaks either way.

| Filename | Format | Notes |
|---|---|---|
| `bgm.mp3` | MP3, 44.1kHz | Looping background track. Should loop cleanly (no audible seam at the loop point). Keep it calm/ambient to match the "recycle to survive" mood — the built-in fallback is a slow Cmaj9 pad. |

## Notes

- Only `bgm.mp3` is checked. There's no format-fallback chain (no `.ogg`/`.wav` probing) — export to MP3.
- The game plays it on loop at ~40% volume; master your file with that in mind (avoid a track that's already very loud or already too quiet).
- Playback only starts after the player's first tap/click/keypress, in line with browser/WebView autoplay restrictions — this is normal and not a bug.
- The music toggle (🎵 button, or Settings → Background Music) works the same whether you're using your own file or the built-in generative pad.
