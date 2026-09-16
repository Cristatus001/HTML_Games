# Emoji icons (bundled, not optional)

Unlike the other files under `assets/images/`, these 18 PNGs are **shipped**
assets the game actually uses — they replace emoji glyphs (🚀 💧 🌬️ etc.) so
the UI doesn't depend on the device's emoji font, and works identically
across every phone/OS in the WebView.

All 18 are 64×64 PNGs sourced from the Twemoji dataset (Twitter's open-source
emoji set) via the `emoji-datasource-twitter` npm package, and are used here
under the Twemoji graphics license (CC-BY 4.0) — attribution: "Emoji graphics
from Twemoji (https://twemoji.twitter.com), licensed under CC-BY 4.0."

| File | Used for |
|---|---|
| `rocket.png` | 🚀 title / start button |
| `ufo.png` | 🛸 title flourish |
| `droplet.png` | 💧 purify water |
| `wind.png` | 🌬️ revitalize air |
| `trophy.png` | 🏆 achievements (unlocked) |
| `clipboard.png` | 📋 how to play |
| `gear.png` | ⚙️ settings |
| `play.png` | ▶️ resume |
| `refresh.png` | 🔄 restart / retry |
| `house.png` | 🏠 main menu |
| `pause.png` | ⏸️ pause |
| `speaker_high.png` | 🔊 sound on |
| `speaker_mute.png` | 🔇 sound off |
| `music_note.png` | 🎵 music on |
| `face_happy.png` | 😊 crew morale — healthy |
| `face_worried.png` | 😟 crew morale — warning |
| `face_scared.png` | 😨 crew morale — danger |
| `lock.png` | 🔒 locked difficulty / achievement |

If you'd rather use your own icon set, just overwrite these files (same
filenames, ideally square and transparent) — no code changes needed.
