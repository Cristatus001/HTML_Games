# ui/ — panel and card materials

`ui/emoji/` holds the 28 icon PNGs the interface actually uses. **These are
required** — they are what replaces emoji characters throughout the UI, drawn as
`<img>` tags whose `src` is swapped when state changes.

The four files below are **optional** material overlays for this folder. They
are blended on top of the existing CSS gradients rather than replacing them, so
a subtle grayscale or sepia texture reads better than an opaque painting.

| filename | applies to | suggested size | orientation | blend |
|---|---|---|---|---|
| `card_paper.png` | specimen card stock | 700 x 920 | portrait | multiply |
| `tray_wood.png` | herbarium tray frame | 800 x 1000 | portrait | overlay |
| `panel_parchment.png` | result scroll + parchment modals | 1000 x 1200 | portrait | multiply |
| `logo.png` | replaces the type-set menu title outright | 920 x 260, transparent | landscape | — |

Full details, plus the icon inventory, in `../README.md`.
