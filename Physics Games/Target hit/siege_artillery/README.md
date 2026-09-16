# Siege Artillery — Projectile Motion Range

A medieval-siege re-skin of the projectile-motion target game. Adjust launch
velocity and angle, fire the cannon, and land a shot on the wooden target.
100% offline — no network access required.

## Run it
Open `index.html` in any modern browser, or let a mobile-app WebView auto-load
it. Everything (fonts, icons, music, physics) is bundled locally.

- **Begin the Siege** — 8-level campaign with a fixed target; progress saves locally.
- **Drill Grounds** — the original sandbox: drag the target anywhere and experiment.

## Folder layout
```
siege_artillery/
├── index.html
├── css/style.css
├── js/game.js
├── README.md
└── assets/
    ├── fonts/            Playfair Display / Lora (woff2, local)
    ├── audio/            optional drop-in: bgm.mp3 (see below)
    └── images/
        ├── background/   optional battlefield / ground art
        ├── characters/   optional cannon / cannonball / target art
        └── ui/emoji/     UI icons (PNG, shipped)
```

## Optional art drop-ins (graceful fallback)
The game draws every element as vector/canvas art by default. Drop a PNG with
the **exact filename** below into the matching folder and the game will use it
automatically; if a file is missing, the built-in art is used — nothing breaks.

All PNGs should have a **transparent background** unless noted.

| File | Folder | Size (px) | Orientation / notes |
|------|--------|-----------|---------------------|
| `battlefield.png` | `assets/images/background/` | 1600 × 900 | Landscape. Full backdrop behind the field (sky + distant scenery). Opaque OK. |
| `ground.png` | `assets/images/background/` | 256 × 64 | Horizontally-tileable ground/earth strip. Repeats along the x-axis. |
| `cannon_wheel.png` | `assets/images/characters/` | 128 × 128 | Square. Side-view wheel; drawn centred on the cannon pivot. |
| `cannon_barrel.png` | `assets/images/characters/` | 256 × 128 | Landscape. Barrel pointing **right**; pivot is the left-centre edge (it rotates with the launch angle). |
| `cannonball.png` | `assets/images/characters/` | 64 × 64 | Square. The projectile; drawn small with a glow behind it. |
| `target.png` | `assets/images/characters/` | 256 × 256 | Square. Bullseye/target face; scaled to the level's target radius. |

### Music drop-in
| File | Folder | Notes |
|------|--------|-------|
| `bgm.mp3` | `assets/audio/` | Optional looping background track. If present it **overrides** the built-in procedural music. If absent, an offline Web-Audio ambient score plays instead. |

## UI icons (shipped, `assets/images/ui/emoji/`)
All 256 × 256 transparent PNGs, referenced as `<img>` tags (no emoji glyphs used
anywhere). State-swapping icons change their `src`:
`cannon, torch, target, check, arrow-up, arrow-down, flame, play, gear, back,`
`reset, book, lock, star, trophy, sound-on/off, music-on/off`.

## Physics
Ideal projectile motion, no air resistance (matches the textbook equations):
`x = v₀cosθ·t`, `y = v₀sinθ·t − ½gt²`, `vᵧ = v₀sinθ − gt`, with `g = 9.8 m/s²`.
`H = (v₀sinθ)² / 2g`, `R = v₀²·sin2θ / g`.

## Controls
Mouse, touch and pen all use unified Pointer Events. Pinch-zoom, double-tap
zoom, text selection and page scrolling are disabled for a native app feel.
