/* ==========================================================================
   assets.js — optional image slots with graceful fallback.

   Every entry below is OPTIONAL. If the file is absent the game keeps using
   its built-in canvas/CSS artwork, so you can drop real art in later without
   touching any code. See assets/images/README.md for sizes and orientation.
   ========================================================================== */
var Assets = (function () {
  'use strict';

  /* key -> relative path. Keys are what the game asks for at draw time. */
  var MANIFEST = {
    /* --- background (optional drop-in) --- */
    'bg/backdrop': 'assets/images/background/backdrop.png',
    'bg/grid': 'assets/images/background/grid.png',
    'bg/drift': 'assets/images/background/drift.png',

    /* --- vector artwork (optional drop-in) --- */
    'vec/ref_shaft': 'assets/images/vectors/ref_shaft.png',
    'vec/ref_head': 'assets/images/vectors/ref_head.png',
    'vec/ply_shaft': 'assets/images/vectors/player_shaft.png',
    'vec/ply_head': 'assets/images/vectors/player_head.png',
    'vec/node': 'assets/images/vectors/node.png',
    'vec/target': 'assets/images/vectors/target_ring.png',

    /* --- UI (optional drop-in) --- */
    'ui/logo': 'assets/images/ui/logo.png',

    /* --- per-case scene backdrops (optional drop-in).
           If present, the painted backdrop is replaced by the photo/art while
           the scene's animated layer (rain, moving steps, traffic) keeps
           running on top of it. --- */
    'scene/rain': 'assets/images/scenes/rain.png',
    'scene/lift': 'assets/images/scenes/lift.png',
    'scene/road': 'assets/images/scenes/road.png',
    'scene/room': 'assets/images/scenes/room.png',
    'scene/piano': 'assets/images/scenes/piano.png',
    'scene/escalator': 'assets/images/scenes/escalator.png',
    'scene/field': 'assets/images/scenes/field.png',
    'scene/pool': 'assets/images/scenes/pool.png',
    'scene/park': 'assets/images/scenes/park.png',
    'scene/highway': 'assets/images/scenes/highway.png',

    /* --- scenario icons (shipped with the game) --- */
    'icon/rain': 'assets/images/icons/rain.png',
    'icon/elevator': 'assets/images/icons/elevator.png',
    'icon/car': 'assets/images/icons/car.png',
    'icon/sofa': 'assets/images/icons/sofa.png',
    'icon/press': 'assets/images/icons/press.png',
    'icon/escalator': 'assets/images/icons/escalator.png',
    'icon/drum': 'assets/images/icons/drum.png',
    'icon/swimmer': 'assets/images/icons/swimmer.png',
    'icon/dog': 'assets/images/icons/dog.png',
    'icon/racecar': 'assets/images/icons/racecar.png'
  };

  var store = {};   // key -> Image (only when successfully decoded)
  var missing = [];

  function get(key) { return store[key] || null; }
  function has(key) { return !!store[key]; }

  /** Loads every slot; never rejects. onStep(done,total) fires per settle. */
  function load(onStep, onDone) {
    var keys = Object.keys(MANIFEST);
    var total = keys.length, done = 0;
    if (!total) { onDone && onDone(); return; }

    keys.forEach(function (key) {
      var img = new Image();
      img.decoding = 'sync';
      var settled = false;
      function settle(ok) {
        if (settled) return;
        settled = true;
        if (ok && img.naturalWidth > 0) store[key] = img;
        else missing.push(key);
        done++;
        onStep && onStep(done, total);
        if (done === total) {
          if (missing.length) {
            console.info('[Assets] optional art not present (built-in artwork used): ' + missing.join(', '));
          }
          onDone && onDone();
        }
      }
      img.onload = function () { settle(true); };
      img.onerror = function () { settle(false); };
      img.src = MANIFEST[key];
      /* Safety net: never let a stuck decode block the boot screen. */
      setTimeout(function () { settle(img.complete && img.naturalWidth > 0); }, 4000);
    });
  }

  /** Applies the optional full-screen backdrop image if the file exists. */
  function applyBackdrop() {
    var el = document.getElementById('bg-img');
    if (!el) return;
    var img = get('bg/backdrop');
    if (img) { el.src = img.src; el.style.display = 'block'; }
  }

  return { load: load, get: get, has: has, applyBackdrop: applyBackdrop, manifest: MANIFEST };
})();
