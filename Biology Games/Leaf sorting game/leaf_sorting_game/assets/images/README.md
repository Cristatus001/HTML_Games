# Image assets — drop-in reference

Every file listed here is **optional**. The game already ships complete: leaves
that have no photo fall back to hand-built SVG vector art, and every panel,
tray and card is drawn with CSS gradients. Drop a file in with the exact name
below and the game picks it up on the next load. Delete it again and the
built-in artwork returns. Nothing ever 404s into a broken screen.

Folder layout:

```
assets/images/
├── leaves/       one photo per species        (shipped: 19 of 20)
├── ui/           panel + card materials, wordmark
│   └── emoji/    icon PNGs used as <img> in place of emoji  (shipped: 28)
├── background/   parallax silhouette layers
└── characters/   optional guide character
```

---

## leaves/ — specimen photographs

**Used by:** the specimen card on the game screen.
**Format:** PNG with transparent background (the leaf cut out — no white box).
**Size:** longest side **560–720 px**. Anything larger just costs load time;
anything under 400 px looks soft on a high-DPI phone.
**Orientation:** free. The card scales the image to fit and centres it, so a
tall leaf (banana) and a wide frond (coconut) both work.
**Naming:** `<species_id>.png`, all lowercase with underscores.

| filename | species | type | shipped |
|---|---|---|---|
| `mango.png` | Mango — *Mangifera indica* | simple | yes |
| `guava.png` | Guava — *Psidium guajava* | simple | yes |
| `hibiscus.png` | Hibiscus — *Hibiscus rosa-sinensis* | simple | yes |
| `banana.png` | Banana — *Musa* | simple | yes |
| `papaya.png` | Papaya — *Carica papaya* | simple | yes |
| `pumpkin.png` | Pumpkin — *Cucurbita maxima* | simple | yes |
| `peepal.png` | Peepal — *Ficus religiosa* | simple | yes |
| `malabar_spinach.png` | Malabar Spinach — *Basella alba* | simple | yes |
| `milkweed.png` | Milkweed / Calotropis — *Calotropis gigantea* | simple | yes |
| `cotton.png` | Cotton — *Gossypium* | simple | yes |
| `neem.png` | Neem — *Azadirachta indica* | compound | yes |
| `curry_leaf.png` | Curry Leaf — *Murraya koenigii* | compound | yes |
| `rose.png` | Rose — *Rosa* | compound | yes |
| `tomato.png` | Tomato — *Solanum lycopersicum* | compound | yes |
| `rain_tree.png` | Rain Tree — *Samanea saman* | compound | yes |
| `touch_me_not.png` | Touch Me Not — *Mimosa pudica* | compound | yes |
| `marijuana.png` | Cannabis — *Cannabis sativa* | compound | yes |
| `coconut.png` | Coconut — *Cocos nucifera* | compound | yes |
| `butterfly_pea.png` | Butterfly Pea — *Clitoria ternatea* | compound | yes |
| `lemon.png` | Lemon — *Citrus limon* | compound | **no — vector fallback** |

`lemon.png` is deliberately absent so you can see the fallback path working:
that specimen draws a unifoliate vector leaf instead. Add the file and the
photo takes over with no code change.

To add a **new** species, append an entry to `LEAVES` in `js/data.js`
(`id`, `name`, `sci`, `type`, `shape`, `note`) and drop `<id>.png` in here.

---

## ui/emoji/ — icon PNGs

**These replace every emoji in the interface.** There are no emoji characters
anywhere in the HTML, CSS or JS; each one is a real PNG referenced by an
`<img>` tag, and JS state changes swap the `src` attribute (never text).

**Format:** PNG, transparent, **128 × 128 px**, square, centred with ~4 px
breathing room. Supply `@2x` sizes by simply exporting at 256 × 256 — the CSS
sizes everything in `em`, so a larger source only sharpens it.

| filename | used for | swaps with |
|---|---|---|
| `leaf.png` | score orb in the HUD, favicon | — |
| `leaf_simple.png` | SIMPLE tray plate, menu crest, reference rows | — |
| `leaf_compound.png` | COMPOUND tray plate, menu crest, reference rows | — |
| `sound_on.png` | sound-effects toggle, on | `sound_off.png` |
| `sound_off.png` | sound-effects toggle, off | `sound_on.png` |
| `music_on.png` | music toggle, on | `music_off.png` |
| `music_off.png` | music toggle, off | `music_on.png` |
| `star_filled.png` | earned star (level card, result) | `star_empty.png` |
| `star_empty.png` | unearned star | `star_filled.png` |
| `wreath.png` | menu crest centrepiece | — |
| `check.png` | correct verdict pill | — |
| `cross.png` | incorrect verdict pill | — |
| `streak.png` | streak orb in the HUD | — |
| `journal.png` | Learn More button, specimens-seen stat | — |
| `play.png` | Play button | — |
| `back.png` | back buttons | — |
| `next.png` | Next Level button | — |
| `help.png` | How to Play button | — |
| `home.png` | Cabinet button | — |
| `settings.png` | Settings button | — |
| `lock.png` | locked level card | — |
| `lens.png` | accuracy stat, Objective heading | — |
| `close.png` | modal close | — |
| `restart.png` | Replay, Reset Progress | — |
| `seal.png` | wax seal on the result scroll | — |
| `pause.png` | reserved | — |
| `sprout.png` | reserved | — |
| `dew.png` | Reduced Motion setting | — |

Keep the filenames identical when re-drawing them — the swap pairs above are
referenced by name in `js/game.js`.

---

## ui/ — panel and card materials (all optional)

These are **overlay textures**, blended on top of the existing CSS gradients,
so a subtle grayscale or sepia texture works better than a fully opaque
painting. Seamless tiles are fine; they are drawn with `background-size: cover`.

| filename | applies to | suggested size | orientation | blend |
|---|---|---|---|---|
| `card_paper.png` | specimen card stock | 700 × 920 | portrait | multiply |
| `tray_wood.png` | herbarium tray frame | 800 × 1000 | portrait | overlay |
| `panel_parchment.png` | result scroll + parchment modals | 1000 × 1200 | portrait | multiply |
| `logo.png` | replaces the type-set menu title | 920 × 260, transparent | landscape | — |

`logo.png` is the one exception: it is a straight replacement, not an overlay.
When present the CSS gold-gradient wordmark is hidden.

---

## background/ — parallax layers (all optional)

Without these the background draws procedural frond silhouettes. Supply any
one, two or all three; each is drawn independently.

| filename | depth | suggested size | orientation | notes |
|---|---|---|---|---|
| `layer_far.png` | slowest | 1920 × 700 | landscape | faintest, highest on screen |
| `layer_mid.png` | medium | 1920 × 800 | landscape | mid canopy |
| `layer_near.png` | fastest | 1920 × 900 | landscape | darkest, sits lowest |

**Format:** PNG with transparency, silhouette-style (dark shapes, soft edges).
They are stretched to 120 % of the viewport width and offset by pointer or
device tilt, so leave ~10 % bleed on the left and right edges.

---

## characters/ — optional guide (optional)

| filename | shown on | suggested size | orientation |
|---|---|---|---|
| `mentor.png` | menu (bottom right) and result scroll (bottom left) | 520 × 780 | portrait |

**Format:** PNG, transparent, full-body or bust, facing slightly left. Hidden
automatically on screens narrower than 560 px. A gentle bob animation is
applied unless Reduced Motion is on.
