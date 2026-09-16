/* ==========================================================================
   assets.js - optional image layer.

   Every visual element in the game can be replaced by dropping a PNG into
   assets/images/<group>/.  Nothing here is required: a missing file simply
   leaves Assets.get() returning null and the renderer falls back to its
   built-in vector art.  Loading never blocks and never throws.
   ========================================================================== */
var Assets = (function () {
  'use strict';

  var BASE = 'assets/images/';

  /* key -> path, relative to index.html.  Groups mirror the folder layout so
     an artist can see at a glance which file feeds which element.          */
  var MANIFEST = {
    /* --- background / setting ------------------------------------------- */
    'bg.backdrop':      'background/backdrop.png',
    'bg.bokeh':         'background/bokeh_cell.png',
    'bg.vesicle':       'background/vesicle.png',
    'bg.helix':         'background/helix.png',

    /* --- the cell itself ------------------------------------------------- */
    'cell.dish':        'background/petri_dish.png',
    'cell.cytoplasm':   'background/cytoplasm.png',
    'cell.wall':        'background/cell_wall.png',

    /* --- movable pieces -------------------------------------------------- */
    'chromatin.red':    'characters/chromatin_red.png',
    'chromatin.orange': 'characters/chromatin_orange.png',
    'chromatin.green':  'characters/chromatin_green.png',
    'chromatin.blue':   'characters/chromatin_blue.png',

    'chromosome.red':    'characters/chromosome_red.png',
    'chromosome.orange': 'characters/chromosome_orange.png',
    'chromosome.green':  'characters/chromosome_green.png',
    'chromosome.blue':   'characters/chromosome_blue.png',

    'chromatid.red':    'characters/chromatid_red.png',
    'chromatid.orange': 'characters/chromatid_orange.png',
    'chromatid.green':  'characters/chromatid_green.png',
    'chromatid.blue':   'characters/chromatid_blue.png',

    'centrosome':       'characters/centrosome.png',

    /* --- organelles ------------------------------------------------------ */
    'organelle.nucleolus': 'organelles/nucleolus.png',

    /* --- effects --------------------------------------------------------- */
    'fx.spark':         'effects/spark.png',
    'fx.glow':          'effects/glow.png',
    'fx.plate':         'effects/cell_plate.png'
  };

  var store = {};   /* key -> HTMLImageElement (only once fully decoded) */
  var pending = 0;
  var done = 0;

  function begin(onProgress, onComplete) {
    var keys = Object.keys(MANIFEST);
    pending = keys.length;

    if (!pending) { onComplete(); return; }

    keys.forEach(function (key) {
      var img = new Image();
      img.decoding = 'async';

      img.onload = function () {
        /* A zero-sized decode is a broken file; treat it as absent. */
        if (img.naturalWidth > 0 && img.naturalHeight > 0) { store[key] = img; }
        tick(onProgress, onComplete);
      };
      img.onerror = function () { tick(onProgress, onComplete); };

      img.src = BASE + MANIFEST[key];
    });
  }

  function tick(onProgress, onComplete) {
    done++;
    if (onProgress) { onProgress(done / pending); }
    if (done >= pending && onComplete) { onComplete(); }
  }

  /* Returns a ready image, or null so callers can draw vector art instead. */
  function get(key) {
    var img = store[key];
    return img || null;
  }

  function has(key) { return !!store[key]; }

  /* Draw an image centred on (x,y), scaled to fit a w x h box, preserving
     aspect ratio.  Returns false when the image is absent, which is the
     renderer's cue to fall back.                                          */
  function drawFit(ctx, key, x, y, w, h, rot, alpha) {
    var img = get(key);
    if (!img) { return false; }

    var s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * s;
    var dh = img.naturalHeight * s;

    ctx.save();
    if (alpha !== undefined && alpha !== 1) { ctx.globalAlpha *= alpha; }
    ctx.translate(x, y);
    if (rot) { ctx.rotate(rot); }
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return true;
  }

  /* Hide any <img> in the DOM whose file is missing, so a WebView never
     shows a broken-image placeholder in the UI.                           */
  function guardDomImages(root) {
    var imgs = (root || document).querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      (function (el) {
        if (el.complete) {
          if (!el.naturalWidth) { el.classList.add('is-missing'); }
        } else {
          el.addEventListener('error', function () { el.classList.add('is-missing'); });
          el.addEventListener('load', function () {
            if (!el.naturalWidth) { el.classList.add('is-missing'); }
          });
        }
      }(imgs[i]));
    }
  }

  return {
    begin: begin,
    get: get,
    has: has,
    drawFit: drawFit,
    guardDomImages: guardDomImages,
    manifest: MANIFEST
  };
}());
