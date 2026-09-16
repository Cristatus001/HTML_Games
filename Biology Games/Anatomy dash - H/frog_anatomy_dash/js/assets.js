/* Optional image loading with graceful fallback.

   Every entry below is optional: if the PNG is missing the game keeps running
   and draws its built-in vector art instead. Drop a file into the documented
   path and it is picked up on the next load with no code change.             */
(function (global) {
  'use strict';

  var IMG_DIR = 'assets/images/';

  /* Anatomy art shared by the in-world orbs and the quiz illustrations. */
  var ART = ['heart', 'liver', 'urea', 'skin', 'cloaca', 'prey', 'testes',
             'brain', 'portal', 'sun', 'lungs', 'tympanum', 'eye', 'foot',
             'tadpole', 'kidney', 'tongue', 'eggs', 'nerve', 'blood', 'gut',
             'hibernation', 'sperm', 'camouflage', 'bone', 'muscle', 'water'];

  var manifest = {};

  /* Player sprites. */
  manifest['char:idle'] = 'characters/frog-idle.png';
  manifest['char:jump'] = 'characters/frog-jump.png';
  manifest['char:fall'] = 'characters/frog-fall.png';

  /* Scenery props. The first four ship with the game; the rest are hooks for
     art you may drop in later (see assets/images/README.md). */
  manifest['bg:lilypad']   = 'background/lilypad.png';
  manifest['bg:cattail']   = 'background/cattail.png';
  manifest['bg:dragonfly'] = 'background/dragonfly.png';
  manifest['bg:log']       = 'background/log.png';
  manifest['bg:sky']       = 'background/sky.png';
  manifest['bg:hills']     = 'background/hills.png';
  manifest['bg:canopy']    = 'background/canopy.png';
  manifest['bg:water']     = 'background/water.png';
  manifest['bg:platform']  = 'background/platform-tile.png';

  ART.forEach(function (key) {
    manifest['orb:' + key] = 'orbs/' + key + '.png';
    manifest['qz:' + key]  = 'questions/' + key + '.png';
  });

  var loaded = Object.create(null);   /* key -> HTMLImageElement */
  var missing = Object.create(null);  /* key -> true             */

  function get(key) { return loaded[key] || null; }
  function has(key) { return !!loaded[key]; }

  /* Resolves once every image has either loaded or failed. Never rejects. */
  function preload(onProgress) {
    var keys = Object.keys(manifest);
    var done = 0;
    var total = keys.length;

    return new Promise(function (resolve) {
      if (!total) { resolve(); return; }

      keys.forEach(function (key) {
        var img = new Image();
        var settled = false;

        function settle(ok) {
          if (settled) return;
          settled = true;
          if (ok && img.naturalWidth > 0) loaded[key] = img;
          else missing[key] = true;
          done++;
          if (onProgress) onProgress(done / total);
          if (done === total) resolve();
        }

        img.addEventListener('load', function () { settle(true); });
        img.addEventListener('error', function () { settle(false); });
        img.decoding = 'async';
        img.src = IMG_DIR + manifest[key];
      });
    });
  }

  /* Path helper for <img> tags in the DOM (icons are plain markup). */
  function icon(name) { return IMG_DIR + 'ui/emoji/' + name + '.png'; }

  global.Assets = {
    preload: preload,
    get: get,
    has: has,
    icon: icon,
    missing: missing,
    ART: ART
  };
})(window);
