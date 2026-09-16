/* ============================================================================
 * MOSS SPOREFALL — optional image asset loader
 *
 * Every sprite in this game is drawn with vector/canvas code by default.
 * If a matching PNG exists at the documented path it is used instead, with no
 * other change required. A missing file is NOT an error: the loader simply
 * records it as absent and the game keeps using its built-in artwork.
 *
 * See assets/images/README.md for the full filename / size reference.
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* logical key -> relative path (no leading slash: works from file:// too) */
  var MANIFEST = {
    // --- player -------------------------------------------------------
    'spore': 'assets/images/characters/spore.png',
    'spore_hurt': 'assets/images/characters/spore_hurt.png',
    'protonema': 'assets/images/characters/protonema.png',
    'gametophyte': 'assets/images/characters/gametophyte.png',

    // --- collectibles -------------------------------------------------
    'dew_orb': 'assets/images/collectibles/dew_orb.png',
    'moisture_drop': 'assets/images/collectibles/moisture_drop.png',

    // --- hazards ------------------------------------------------------
    'hazard_fern': 'assets/images/hazards/fern_frond.png',
    'hazard_cone': 'assets/images/hazards/gymno_cone.png',
    'hazard_bloom': 'assets/images/hazards/flower_bloom.png',
    'hazard_spur': 'assets/images/hazards/rock_spur.png',

    // --- background ---------------------------------------------------
    'bg_far_1': 'assets/images/background/zone1_far.png',
    'bg_mid_1': 'assets/images/background/zone1_mid.png',
    'bg_far_2': 'assets/images/background/zone2_far.png',
    'bg_mid_2': 'assets/images/background/zone2_mid.png',
    'bg_far_3': 'assets/images/background/zone3_far.png',
    'bg_mid_3': 'assets/images/background/zone3_mid.png',
    'wall_left': 'assets/images/background/wall_left.png',
    'wall_right': 'assets/images/background/wall_right.png',
    'ground': 'assets/images/background/landing_ground.png',

    // --- effects ------------------------------------------------------
    'fx_spark': 'assets/images/effects/spark.png',
    'fx_mist': 'assets/images/effects/mist_puff.png'
  };

  var images = Object.create(null);   // key -> HTMLImageElement (ready only)
  var missing = Object.create(null);  // key -> true
  var loadedCount = 0;
  var totalCount = 0;

  function loadOne(key, path) {
    return new Promise(function (resolve) {
      var img = new Image();
      var settled = false;
      function done(ok) {
        if (settled) { return; }
        settled = true;
        if (ok && img.naturalWidth > 0 && img.naturalHeight > 0) {
          images[key] = img;
          loadedCount++;
        } else {
          missing[key] = true;
        }
        resolve();
      }
      img.onload = function () { done(true); };
      img.onerror = function () { done(false); };
      // Guard against a request that never settles in a strict WebView.
      setTimeout(function () { done(false); }, 6000);
      img.src = path;
    });
  }

  /**
   * Attempt to load every optional image. Always resolves — never rejects.
   * @returns {Promise<{loaded:number,total:number}>}
   */
  function loadAll() {
    var keys = Object.keys(MANIFEST);
    totalCount = keys.length;
    return Promise.all(keys.map(function (k) {
      return loadOne(k, MANIFEST[k]);
    })).then(function () {
      return { loaded: loadedCount, total: totalCount };
    });
  }

  /** @returns {HTMLImageElement|null} the image, or null to use vector art. */
  function get(key) {
    return images[key] || null;
  }

  function has(key) {
    return !!images[key];
  }

  /**
   * Draw an optional image centred on (cx, cy) at the given box size,
   * returning false when the caller should fall back to its own drawing.
   */
  function drawCentered(ctx, key, cx, cy, w, h, rot) {
    var img = images[key];
    if (!img) { return false; }
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) { ctx.rotate(rot); }
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  global.Assets = {
    MANIFEST: MANIFEST,
    loadAll: loadAll,
    get: get,
    has: has,
    drawCentered: drawCentered,
    report: function () {
      return { loaded: loadedCount, total: totalCount, missing: Object.keys(missing) };
    }
  };
})(window);
