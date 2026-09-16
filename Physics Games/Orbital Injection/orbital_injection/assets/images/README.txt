HOW TO ADD YOUR OWN ART
========================
Drop image files into the matching subfolder using the EXACT filename
below. The game checks for these files on load. If a file isn't found,
it automatically falls back to the current hand-drawn vector art, so
nothing breaks - add images whenever you're ready, one at a time.

assets/images/earth/earth.png
    Earth planet texture. Square image, transparent background,
    recommended 512x512 or larger. Drawn as a circle, so keep the
    planet centered and filling the frame.

assets/images/rocket/rocket.png
    The player's rocket, SIDE VIEW with the nose pointing RIGHT
    (landscape orientation - the game rotates/positions it for you).
    Transparent background, recommended ~256x120 (wide, short).

assets/images/satellite/satellite.png
    The satellite once launched. Transparent background,
    recommended ~64x64.

assets/images/background/starfield.jpg  (or .png)
    Full-screen space backdrop (nebula, deep space photo, etc).
    Recommended 1920x1080 or larger - it will be scaled/cropped to
    fill the screen. JPG is fine here since it's a full backdrop.

assets/images/ui/logo.png
    Small emblem shown on the mission briefing card. Transparent
    background, recommended ~120x120.

assets/images/ui/badge-success.png
    Stamp/badge shown on the "STABLE ORBIT" result screen.
    Transparent background, recommended ~150x150.

assets/images/ui/badge-fail.png
    Stamp/badge shown on the "CRASH / LOST SIGNAL" result screen.
    Transparent background, recommended ~150x150.

Supported formats: PNG (recommended for anything with transparency)
or JPG. Keep filenames lowercase exactly as shown - the game is case
sensitive about paths.
