/* ==========================================================================
   Hybrid Shooter — Asset Loader
   Every gameplay visual (ship, asteroids, background layers) is drawn with
   procedural canvas/vector art by default. This loader lets an artist drop
   real image files into assets/images/... later: if a file exists it is
   used automatically, if it's missing (404) the game silently keeps using
   the built-in vector art. Nothing ever breaks either way.
   ========================================================================== */

const AssetLoader = (() => {
  // key -> relative path. Add/replace files here; see README.md for exact
  // filenames, sizes and orientation the game expects.
  const IMAGE_MANIFEST = {
    shipIdle: 'assets/images/characters/ship_idle.png',
    shipThrust: 'assets/images/characters/ship_thrust.png',
    mascotHappy: 'assets/images/characters/mascot_happy.png',
    mascotSad: 'assets/images/characters/mascot_sad.png',
    mascotNeutral: 'assets/images/characters/mascot_neutral.png',

    bgFar: 'assets/images/background/bg_far.png',
    bgMid: 'assets/images/background/bg_mid.png',
    bgNear: 'assets/images/background/bg_near.png',

    asteroidSp3: 'assets/images/asteroids/asteroid_sp3.png',
    asteroidSp2: 'assets/images/asteroids/asteroid_sp2.png',
    asteroidSp: 'assets/images/asteroids/asteroid_sp.png',

    logo: 'assets/images/ui/logo.png',
    panelBg: 'assets/images/ui/panel_bg.png',
    buttonBg: 'assets/images/ui/button_bg.png'
  };

  const images = {};
  const ok = {};

  function loadOne(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[key] = img;
        ok[key] = true;
        resolve();
      };
      img.onerror = () => {
        ok[key] = false;
        resolve(); // never reject — missing art is expected & fine
      };
      img.src = src;
    });
  }

  async function preload() {
    const jobs = Object.entries(IMAGE_MANIFEST).map(([key, src]) => loadOne(key, src));
    await Promise.all(jobs);
    return ok;
  }

  function has(key) {
    return !!ok[key];
  }

  function get(key) {
    return ok[key] ? images[key] : null;
  }

  return { preload, has, get, IMAGE_MANIFEST };
})();
