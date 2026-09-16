# Image Assets — Set Garden (Difference of Sets)

The game ships fully playable with **CSS/SVG vector art**. Every image below is
**optional**: drop a file in with the exact name/path shown and the game will use
it automatically on next load. If a file is missing or fails to load, the game
silently falls back to the built-in vector art — nothing breaks.

All files should be **PNG with transparency** (except full-bleed backgrounds,
which may be opaque). Sizes are the recommended source resolution; the game
scales them responsively.

## Folder layout

```
assets/images/
├── backgrounds/
├── tokens/
├── ui/
└── decor/
```

## Expected files

### tokens/  (the draggable number fruit)
| File               | Size (px) | Orientation | Replaces                    |
|--------------------|-----------|-------------|-----------------------------|
| `apple.png`        | 128 × 128 | Square      | Fruit for **both Set A and Set B** |

> Both sets deliberately use the **same** fruit — each fruit is simply one
> element, and the garden plot it sits in tells you which set it belongs to.

> The number is drawn on top of the image by the game, so leave the center
> relatively clear. Keep the fruit roughly centered within the square.

### ui/  (interface furniture)
| File           | Size (px)  | Orientation | Replaces                              |
|----------------|------------|-------------|---------------------------------------|
| `logo.png`     | 256 × 256  | Square      | The round game logo / boot badge      |
| `plot_a.png`   | 512 × 320  | Landscape   | Set A garden-plot (soil bed) surface  |
| `plot_b.png`   | 512 × 320  | Landscape   | Set B garden-plot (soil bed) surface  |
| `basket.png`   | 640 × 320  | Landscape   | The harvest basket (drop zone) surface|

> `plot_*` and `basket` are used as `background-size: cover`, so full-bleed
> textures work best. They sit *behind* the fruit, so keep them fairly flat.

### decor/  (ambient background pieces)
| File          | Size (px)  | Orientation | Replaces                          |
|---------------|------------|-------------|-----------------------------------|
| `sun.png`     | 256 × 256  | Square      | The glowing sun (top-right)       |
| `cloud.png`   | 256 × 128  | Landscape   | Drifting parallax clouds          |
| `leaf.png`    | 64 × 64    | Square      | Falling leaves/petals             |

### backgrounds/  (reserved / optional)
This folder is reserved for a future full-scene background image. It is not
required — the animated sky, hills, clouds and grass are all generated in CSS.
If you add art here, wire it via a `data-img="backgrounds/yourfile.png"`
attribute on the `#bg` element in `index.html`.

## How the fallback works
- Elements in `index.html` marked `data-img="ui/basket.png"` (etc.) try to load
  that file; on success the image becomes their background and a `has-img` class
  is added. On failure they keep their CSS look.
- Fruit tokens and falling leaves are created dynamically; the game pre-checks
  `tokens/apple.png` and `decor/leaf.png` once at startup and
  uses them only if they loaded.

No build step, no internet, no code changes needed — just add PNGs.
