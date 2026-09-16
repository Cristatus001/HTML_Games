/* ============================================================
   Image manifest and loader.

   Every picture in the game is optional. On boot each file is
   probed once; anything that fails to load is recorded as
   missing and the UI silently substitutes inline vector art.
   That means art can be dropped in or pulled out of
   assets/images/ without touching any code.
   ============================================================ */
(function (global) {
  'use strict';

  var UI = 'assets/images/ui/emoji/';
  var OPT = 'assets/images/options/';
  var CHR = 'assets/images/characters/';
  var BG  = 'assets/images/background/';

  /* logical name -> relative path */
  var MANIFEST = {
    /* --- UI (each one replaces what would otherwise be an emoji) --- */
    'verdict-correct':    UI + 'verdict-correct.png',
    'verdict-wrong':      UI + 'verdict-wrong.png',
    'verdict-incomplete': UI + 'verdict-incomplete.png',
    'specimen':           UI + 'specimen.png',
    'medal':              UI + 'medal.png',
    'seal-earned':        UI + 'seal-earned.png',
    'seal-empty':         UI + 'seal-empty.png',
    'microscope':         UI + 'microscope.png',
    'notebook':           UI + 'notebook.png',
    'clipboard':          UI + 'clipboard.png',
    'lab-home':           UI + 'lab-home.png',
    'sound-on':           UI + 'sound-on.png',
    'sound-off':          UI + 'sound-off.png',
    'music-on':           UI + 'music-on.png',
    'music-off':          UI + 'music-off.png',
    'dial':               UI + 'dial.png',
    'lock':               UI + 'lock.png',
    'play':               UI + 'play.png',
    'pause':              UI + 'pause.png',
    'close':              UI + 'close.png',
    'arrow-left':         UI + 'arrow-left.png',
    'replay':             UI + 'replay.png',
    'scalpel':            UI + 'scalpel.png',
    'lamp':               UI + 'lamp.png',

    /* --- Answer-option art, one per choice --- */
    'skin-olive':        OPT + 'skin-olive.png',
    'skin-yellow':       OPT + 'skin-yellow.png',
    'texture-dry':       OPT + 'texture-dry.png',
    'texture-moist':     OPT + 'texture-moist.png',
    'eye-eyelid':        OPT + 'eye-eyelid.png',
    'eye-nictitating':   OPT + 'eye-nictitating.png',
    'ear-pinna':         OPT + 'ear-pinna.png',
    'ear-tympanum':      OPT + 'ear-tympanum.png',
    'forelimb-standard': OPT + 'forelimb-standard.png',
    'forelimb-pad':      OPT + 'forelimb-pad.png',
    'throat-smooth':     OPT + 'throat-smooth.png',
    'throat-sacs':       OPT + 'throat-sacs.png',
    'hind-4':            OPT + 'hind-4.png',
    'hind-5':            OPT + 'hind-5.png',

    /* --- Characters --- */
    'frog-specimen': CHR + 'frog-specimen.png',
    'frog-male':     CHR + 'frog-male.png',

    /* --- Optional parallax scenery; inline SVG shows when absent --- */
    'bg-far':  BG + 'pond-far.png',
    'bg-mid':  BG + 'pond-mid.png',
    'bg-near': BG + 'pond-near.png'
  };

  /* Inline replacements used when a PNG is missing. Kept deliberately simple:
     they only have to read correctly at icon size. */
  var FALLBACK = {
    'verdict-correct':
      '<circle cx="32" cy="32" r="24" fill="#4f9e2e" stroke="#1f6b2c" stroke-width="3"/>' +
      '<path d="M20,32 l9,9 l16,-19" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
    'verdict-wrong':
      '<circle cx="32" cy="32" r="24" fill="#c9432f" stroke="#8e2418" stroke-width="3"/>' +
      '<path d="M22,22 L42,42 M42,22 L22,42" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
    'verdict-incomplete':
      '<path d="M32,7 L59,55 h-54 z" fill="#e0ac45" stroke="#8a5a12" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="29" y="24" width="6" height="17" rx="3" fill="#3f2a04"/>' +
      '<circle cx="32" cy="48" r="3.6" fill="#3f2a04"/>',
    'specimen':
      '<ellipse cx="32" cy="36" rx="24" ry="19" fill="#6d9c3c" stroke="#2f4a17" stroke-width="2.4"/>' +
      '<circle cx="20" cy="17" r="8" fill="#6d9c3c" stroke="#2f4a17" stroke-width="2.2"/>' +
      '<circle cx="44" cy="17" r="8" fill="#6d9c3c" stroke="#2f4a17" stroke-width="2.2"/>' +
      '<circle cx="20" cy="17" r="4.4" fill="#f5b942"/><circle cx="44" cy="17" r="4.4" fill="#f5b942"/>' +
      '<path d="M20,42 q12,8 24,0" fill="none" stroke="#2f4a17" stroke-width="2.8" stroke-linecap="round"/>',
    'medal':
      '<path d="M22,6 l8,20 h4 l8,-20 z" fill="#3f7d4a" stroke="#1f4a26" stroke-width="2"/>' +
      '<circle cx="32" cy="41" r="18" fill="#e0ac45" stroke="#8a5a12" stroke-width="3"/>' +
      '<circle cx="32" cy="41" r="11" fill="none" stroke="#8a5a12" stroke-width="2"/>',
    'seal-earned':
      '<circle cx="32" cy="32" r="22" fill="#e0ac45" stroke="#8a5a12" stroke-width="3"/>' +
      '<circle cx="32" cy="32" r="14" fill="none" stroke="#7a4f0c" stroke-width="2"/>',
    'seal-empty':
      '<circle cx="32" cy="32" r="22" fill="#183640" stroke="#2c5666" stroke-width="3"/>',
    'sound-on':
      '<path d="M14,26 h9 l12,-10 v32 l-12,-10 h-9 z" fill="#e0ac45" stroke="#7a4f0c" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M41,24 a11,11 0 0 1 0,16" fill="none" stroke="#8fd94a" stroke-width="4" stroke-linecap="round"/>',
    'sound-off':
      '<path d="M14,26 h9 l12,-10 v32 l-12,-10 h-9 z" fill="#5d6a70" stroke="#2c3639" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M42,24 L56,40 M56,24 L42,40" stroke="#ff6b5b" stroke-width="4.6" stroke-linecap="round"/>',
    'music-on':
      '<path d="M28,44 V16 l18,-5 v26" fill="none" stroke="#8fd94a" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="23" cy="45" r="7" fill="#8fd94a"/><circle cx="41" cy="40" r="7" fill="#8fd94a"/>',
    'music-off':
      '<path d="M28,44 V16 l18,-5 v26" fill="none" stroke="#5d6a70" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="23" cy="45" r="7" fill="#5d6a70"/><circle cx="41" cy="40" r="7" fill="#5d6a70"/>' +
      '<path d="M14,14 L50,50" stroke="#ff6b5b" stroke-width="5" stroke-linecap="round"/>',
    'dial':
      '<circle cx="32" cy="32" r="26" fill="#17323d" stroke="#2c5666" stroke-width="2"/>' +
      '<circle cx="32" cy="32" r="15" fill="#8ba7b4" stroke="#41626f" stroke-width="2"/>' +
      '<line x1="32" y1="32" x2="32" y2="20" stroke="#ffc94a" stroke-width="3.6" stroke-linecap="round"/>',
    'lock':
      '<path d="M22,30 v-6 a10,10 0 0 1 20,0 v6" fill="none" stroke="#b3c6d0" stroke-width="5.5" stroke-linecap="round"/>' +
      '<rect x="17" y="30" width="30" height="22" rx="5" fill="#b3c6d0" stroke="#41626f" stroke-width="2"/>',
    'play':
      '<circle cx="32" cy="32" r="24" fill="#4f9e2e" stroke="#1f6b2c" stroke-width="3"/>' +
      '<polygon points="25,19 45,31 25,43" fill="#fff"/>',
    'pause':
      '<circle cx="32" cy="32" r="24" fill="#17323d" stroke="#8fd94a" stroke-width="3"/>' +
      '<rect x="22" y="20" width="7" height="24" rx="3" fill="#d8ffb0"/>' +
      '<rect x="35" y="20" width="7" height="24" rx="3" fill="#d8ffb0"/>',
    'close':
      '<circle cx="32" cy="32" r="23" fill="#17323d" stroke="#3f7f96" stroke-width="2.5"/>' +
      '<path d="M23,23 L41,41 M41,23 L23,41" stroke="#d6eef7" stroke-width="5.5" stroke-linecap="round"/>',
    'arrow-left':
      '<circle cx="32" cy="32" r="23" fill="#17323d" stroke="#3f7f96" stroke-width="2.5"/>' +
      '<path d="M38,19 L24,32 L38,45" fill="none" stroke="#d6eef7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    'replay':
      '<path d="M38.5,14.15 A19,19 0 1 1 14.15,25.5" fill="none" stroke="#5fd6ef" stroke-width="6.5" stroke-linecap="round"/>' +
      '<polygon points="-9,-11 -9,11 12,0" fill="#5fd6ef" transform="translate(14.15,25.5) rotate(-70)"/>',
    'notebook':
      '<rect x="12" y="8" width="40" height="48" rx="5" fill="#f0e1b6" stroke="#8a6a34" stroke-width="2.4"/>' +
      '<rect x="8" y="8" width="8" height="48" rx="3" fill="#3f7d4a" stroke="#1f4a26" stroke-width="2"/>' +
      '<path d="M22,22 h22 M22,32 h22 M22,42 h15" stroke="#8a6a34" stroke-width="2.6" stroke-linecap="round"/>',
    'clipboard':
      '<rect x="11" y="10" width="42" height="50" rx="5" fill="#b3c6d0" stroke="#41626f" stroke-width="2.4"/>' +
      '<rect x="15" y="16" width="34" height="40" rx="3" fill="#f0e1b6" stroke="#8a6a34" stroke-width="1.6"/>' +
      '<rect x="23" y="5" width="18" height="10" rx="4" fill="#e0ac45" stroke="#7a4f0c" stroke-width="2"/>',
    'microscope':
      '<rect x="9" y="55" width="46" height="7" rx="3.5" fill="#b3c6d0" stroke="#41626f" stroke-width="2"/>' +
      '<path d="M45,58 C53,50 54,28 40,20" fill="none" stroke="#b3c6d0" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="22" y="10" width="14" height="24" rx="4" fill="#b3c6d0" stroke="#41626f" stroke-width="2"/>' +
      '<rect x="12" y="41" width="28" height="5" rx="2.2" fill="#8ba7b4" stroke="#41626f" stroke-width="1.8"/>',
    'lab-home':
      '<rect x="21" y="5" width="22" height="7" rx="3" fill="#e0ac45" stroke="#7a4f0c" stroke-width="2"/>' +
      '<rect x="14" y="14" width="36" height="46" rx="7" fill="#17323d" stroke="#41626f" stroke-width="2.4"/>' +
      '<path d="M17,32 h30 v22 a6,6 0 0 1 -6,6 h-18 a6,6 0 0 1 -6,-6 z" fill="#6d9c3c"/>',
    'lamp':
      '<circle cx="32" cy="24" r="16" fill="#f5b942" stroke="#8a5a12" stroke-width="2.4"/>' +
      '<rect x="22" y="41" width="20" height="5" rx="2.5" fill="#8ba7b4" stroke="#41626f" stroke-width="1.6"/>' +
      '<rect x="24" y="48" width="16" height="5" rx="2.5" fill="#8ba7b4" stroke="#41626f" stroke-width="1.6"/>',
    'scalpel':
      '<path d="M8,54 l16,-16 l6,6 l-16,16 z" fill="#2f4652" stroke="#16272e" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M22,40 L44,18 a16,16 0 0 1 12,-6 a26,26 0 0 1 -12,20 L28,46 z" fill="#b3c6d0" stroke="#41626f" stroke-width="2" stroke-linejoin="round"/>'
  };

  /* Anything without a bespoke fallback gets an engraved blank specimen plate. */
  var GENERIC_FALLBACK =
    '<circle cx="32" cy="32" r="25" fill="#173540" stroke="#2c5666" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="35" rx="15" ry="12" fill="#4f7a2c" opacity="0.8"/>' +
    '<circle cx="25" cy="24" r="5" fill="#4f7a2c" opacity="0.8"/>' +
    '<circle cx="39" cy="24" r="5" fill="#4f7a2c" opacity="0.8"/>' +
    '<circle cx="25" cy="24" r="2.4" fill="#f5b942"/><circle cx="39" cy="24" r="2.4" fill="#f5b942"/>';

  var available = {};

  var Assets = {
    manifest: MANIFEST,

    has: function (name) { return available[name] === true; },

    src: function (name) { return MANIFEST[name] || null; },

    /* Probe every entry. Never rejects: a missing file is a normal outcome. */
    preload: function (onProgress) {
      var names = Object.keys(MANIFEST);
      var total = names.length;
      var done = 0;

      return new Promise(function (resolve) {
        if (!total) { resolve(available); return; }

        names.forEach(function (name) {
          var img = new Image();
          var settled = false;

          function finish(ok) {
            if (settled) return;
            settled = true;
            available[name] = ok;
            done++;
            if (onProgress) onProgress(done / total);
            if (done === total) resolve(available);
          }

          img.onload = function () { finish(img.naturalWidth > 0); };
          img.onerror = function () { finish(false); };
          /* Do not let a hung request stall the boot screen. */
          setTimeout(function () { finish(false); }, 8000);
          img.src = MANIFEST[name];
        });
      });
    },

    /* Build an <img> when the file exists, otherwise an equivalent inline SVG.
       Both carry the same class list, so styling never has to branch. */
    el: function (name, className, altText) {
      var cls = className || '';
      var alt = altText === undefined ? '' : altText;

      if (this.has(name)) {
        var img = document.createElement('img');
        img.src = MANIFEST[name];
        img.alt = alt;
        img.decoding = 'async';
        if (cls) img.className = cls;
        img.setAttribute('draggable', 'false');
        return img;
      }

      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 64 64');
      svg.setAttribute('role', alt ? 'img' : 'presentation');
      if (alt) svg.setAttribute('aria-label', alt);
      if (cls) svg.setAttribute('class', cls);
      svg.innerHTML = FALLBACK[name] || GENERIC_FALLBACK;
      return svg;
    },

    /* Point an existing node at a different icon, preserving class and position.
       Used for the state-swapping icons (sound on/off, music on/off, seals) so
       the swap is an src change rather than a text change. */
    swap: function (node, name, altText) {
      if (!node) return node;
      var cls = node.getAttribute('class') || '';
      var next = this.el(name, cls, altText === undefined ? node.getAttribute('alt') || '' : altText);
      next.dataset.icon = name;
      if (node.parentNode) node.parentNode.replaceChild(next, node);
      return next;
    },

    /* Markup form, for the places that build HTML strings. */
    html: function (name, className, altText) {
      var tmp = document.createElement('div');
      tmp.appendChild(this.el(name, className, altText));
      return tmp.innerHTML;
    }
  };

  global.Assets = Assets;
})(window);
