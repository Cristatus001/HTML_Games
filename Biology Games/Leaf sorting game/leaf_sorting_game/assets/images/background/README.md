# background/ — parallax layers (optional, empty by default)

Leave this folder empty and the background draws procedural frond silhouettes,
canopy light shafts, drifting spores and falling leaves on a canvas.

Drop any of these in to replace the procedural silhouettes with your own art:

| filename | depth | suggested size | orientation |
|---|---|---|---|
| `layer_far.png` | slowest, faintest, sits highest | 1920 x 700 | landscape |
| `layer_mid.png` | medium | 1920 x 800 | landscape |
| `layer_near.png` | fastest, darkest, sits lowest | 1920 x 900 | landscape |

PNG with transparency, silhouette style. Each layer is drawn at 120 % of the
viewport width and offset by pointer position or device tilt, so leave roughly
10 % bleed on the left and right edges. Any subset works — supply one, two or
all three. Full details in `../README.md`.
