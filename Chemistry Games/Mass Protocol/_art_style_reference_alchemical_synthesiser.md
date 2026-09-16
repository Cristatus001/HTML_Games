# Art-direction reference: "Alchemistry Synthesis" (itch.io, by LimeGrell)

Saved as a standing style benchmark for future game production-ready passes — not a
theme to copy 1:1, but the *craft level* to aim for: rich, painterly, glowing,
never flat.

## What the reference does well

- **Painterly, lit backgrounds** — full-scene illustrated environment (alchemist's
  study: shelves, candles, arched window, stone floor with a glowing magic circle),
  not a flat gradient or solid color. Deep shadows, warm torchlight, believable depth.
- **Ornate gilded UI frame language** — every panel, button, and badge uses beveled
  gold metal borders with fine filigree/engraving detail, not flat rounded rectangles.
  Corners get small diamond/dot accents; edges are lined, not just stroked.
- **Scroll/parchment panels** — info panels (How to Play, Order Scroll, Grimoire) are
  rendered as unrolled paper scrolls with wooden rollers, torn/aged edges, and brown
  ink-style serif type — not generic modal boxes.
- **Glowing "material" ingredients** — each jar/resource icon is a small rendered
  vessel with actual glowing contents (embers, crystal facets, swirling gas, moonlit
  liquid) rather than a flat icon or emoji. Light sources inside objects, not just
  drop-shadows.
- **Central 3D hero prop** — the cauldron is a semi-3D rendered centerpiece with
  metal reflections, engraved symbols, and glowing steam/embers rising from it —
  functions like this game's "logo mascot."
- **Thematic iconography, not generic UI icons** — scarab/wings, ankh, hieroglyphic
  border motifs tie every UI element back to the setting instead of using
  stock gear/heart/star icons.
- **Muted, moody base palette + saturated accent glow** — background is desaturated
  near-black navy/brown, so the gold trim and glowing potion colors read as vibrant
  by contrast. Vibrancy comes from *contrast against darkness*, not from flat bright
  fills.

## Takeaway / standing instruction for future games

- Push for this level of richness by default: layered lighting, beveled/engraved
  panel borders, and objects that look lit-from-within rather than flat-filled shapes.
- "More vibrant, less flat" — but vibrancy via contrast/glow against a moodier base,
  not necessarily an all-bright palette (that's only right for genuinely cheerful
  "casual mobile game" themes like the earlier Molecule Rush reference).
- Theme still changes per game (per existing instruction — never reuse a theme
  across games), but whichever direction is chosen should hit this level of surface
  polish.
- **Constraint to remember:** no image-generation tool is available in this
  environment, so painterly scene illustrations like the ones above can't be
  reproduced directly. The practical way to chase this look is CSS/SVG:
  gradient-lit "3D" panels, layered box-shadows/inset glows for engraved metal,
  radial-gradient "glowing material" fills instead of flat icon colors, and
  torn-edge/scroll shapes via clip-path or SVG — richer than the flat vector style
  used on earlier passes, even without real illustrated art.
