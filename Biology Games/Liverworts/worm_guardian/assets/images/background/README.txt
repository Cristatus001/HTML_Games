Optional backdrop layers (see ../README.md for the full spec).
All are landscape 16:10, authored at 1600x1000.

  forest_floor.png   opaque      - replaces the procedural soil base
  canopy_far.png     transparent - far parallax layer
  foliage_near.png   transparent - near parallax layer
  overlay.png        transparent - vignette / fog / dust on top

Missing files fall back to the built-in procedural backdrop.
These are decorative only and never affect hitboxes or gameplay.
