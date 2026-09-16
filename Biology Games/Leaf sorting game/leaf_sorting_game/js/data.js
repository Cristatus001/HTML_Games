/* =============================================================================
   Leaf Sorter — static game data
   Species list, scientific names and level definitions come from the original
   "Leaf sorting game" workbook (Simple leaf / Compound leaf sheets).
   Vector shapes below are the offline fallback art used whenever a photo in
   assets/images/leaves/ is missing, so new artwork can be dropped in later.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------------
     Vector fallback art. Every builder returns SVG markup on a 0 0 128 128 box
     and references the gradients declared once in index.html (#svgAtlas).
     ------------------------------------------------------------------------ */
  var veins = function (top, bottom, spread) {
    var out = '<g stroke="#0b3f24" stroke-width="1.8" fill="none" opacity="0.45" stroke-linecap="round">';
    for (var i = 0; i < 4; i++) {
      var t = i / 3;
      var y = top + (bottom - top) * t;
      var dx = spread * (1 - t * 0.45);
      out += '<path d="M64 ' + y.toFixed(1) + ' Q ' + (64 - dx * 0.6).toFixed(1) + ' ' + (y + 6).toFixed(1) +
             ', ' + (64 - dx).toFixed(1) + ' ' + (y + 15).toFixed(1) + '"/>';
      out += '<path d="M64 ' + y.toFixed(1) + ' Q ' + (64 + dx * 0.6).toFixed(1) + ' ' + (y + 6).toFixed(1) +
             ', ' + (64 + dx).toFixed(1) + ' ' + (y + 15).toFixed(1) + '"/>';
    }
    return out + '</g>';
  };

  var midrib = function (y1, y2) {
    return '<path d="M64 ' + y1 + ' L64 ' + y2 + '" stroke="#0b3f24" stroke-width="2.6" ' +
           'stroke-linecap="round" opacity="0.7"/>' +
           '<path d="M64 ' + y1 + ' L64 ' + y2 + '" stroke="#dcffe9" stroke-width="0.9" ' +
           'stroke-linecap="round" opacity="0.35"/>';
  };

  var sheen = function (d) {
    return '<path d="' + d + '" fill="#ffffff" opacity="0.18"/>';
  };

  var leaflet = function (x, y, len, dir, tilt) {
    var ex = x + len * dir;
    return '<path d="M' + x + ' ' + y +
           ' C ' + (x + len * 0.45 * dir) + ' ' + (y - tilt - 11) +
           ', ' + ex + ' ' + (y - tilt - 5) +
           ', ' + ex + ' ' + (y - tilt + 4) +
           ' C ' + (x + len * 0.45 * dir) + ' ' + (y - tilt + 12) +
           ', ' + x + ' ' + (y + 5) + ', ' + x + ' ' + y + ' Z" fill="url(#lfBody)"/>';
  };

  var SHAPES = {
    /* ---- simple leaves ---------------------------------------------------- */
    ovate: function () {
      return '<path d="M64 8 C 26 30, 18 76, 64 122 C 110 76, 102 30, 64 8 Z" fill="url(#lfBody)"/>' +
             midrib(10, 120) + veins(34, 96, 26) +
             sheen('M64 8 C 42 22, 32 46, 34 70 C 40 40, 52 22, 64 14 Z');
    },
    serrate: function () {
      var d = 'M64 8 ';
      var i;
      for (i = 0; i < 9; i++) {
        var t = i / 8, y = 8 + t * 106;
        var x = 64 - Math.sin(t * Math.PI) * 44;
        d += 'L' + (x - (i % 2 ? 0 : 5)).toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      d += 'L64 122 ';
      for (i = 8; i >= 0; i--) {
        var t2 = i / 8, y2 = 8 + t2 * 106;
        var x2 = 64 + Math.sin(t2 * Math.PI) * 44;
        d += 'L' + (x2 + (i % 2 ? 0 : 5)).toFixed(1) + ' ' + y2.toFixed(1) + ' ';
      }
      return '<path d="' + d + 'Z" fill="url(#lfBody)"/>' + midrib(10, 120) + veins(32, 96, 28);
    },
    cordate: function () {
      return '<path d="M64 26 C 40 4, 8 18, 14 48 C 20 82, 46 104, 64 124 ' +
             'C 82 104, 108 82, 114 48 C 120 18, 88 4, 64 26 Z" fill="url(#lfBody)"/>' +
             midrib(28, 122) + veins(44, 98, 30) +
             sheen('M64 26 C 46 12, 26 16, 22 36 C 34 22, 52 20, 64 32 Z');
    },
    elongate: function () {
      return '<path d="M64 4 C 40 34, 34 82, 64 124 C 94 82, 88 34, 64 4 Z" fill="url(#lfBody)"/>' +
             midrib(6, 122) +
             '<g stroke="#0b3f24" stroke-width="1.3" fill="none" opacity="0.4">' +
             (function () {
               var s = '';
               for (var i = 0; i < 9; i++) {
                 var y = 22 + i * 10;
                 s += '<path d="M64 ' + y + ' Q 52 ' + (y + 4) + ', 45 ' + (y + 11) + '"/>';
                 s += '<path d="M64 ' + y + ' Q 76 ' + (y + 4) + ', 83 ' + (y + 11) + '"/>';
               }
               return s;
             })() + '</g>' +
             sheen('M64 4 C 50 30, 46 66, 52 104 C 50 62, 56 28, 64 10 Z');
    },
    lobed: function () {
      var lobes = 5, out = '', i;
      for (i = 0; i < lobes; i++) {
        var a = (-90 + (i - (lobes - 1) / 2) * 38) * Math.PI / 180;
        var len = i === Math.floor(lobes / 2) ? 54 : 46 - Math.abs(i - 2) * 4;
        var tx = 64 + Math.cos(a) * len, ty = 92 + Math.sin(a) * len;
        out += '<path d="M64 92 C ' + (64 + Math.cos(a - 0.34) * len * 0.85).toFixed(1) + ' ' +
               (92 + Math.sin(a - 0.34) * len * 0.85).toFixed(1) + ', ' +
               tx.toFixed(1) + ' ' + ty.toFixed(1) + ', ' + tx.toFixed(1) + ' ' + ty.toFixed(1) +
               ' C ' + (64 + Math.cos(a + 0.34) * len * 0.85).toFixed(1) + ' ' +
               (92 + Math.sin(a + 0.34) * len * 0.85).toFixed(1) + ', 64 92, 64 92 Z" fill="url(#lfBody)"/>';
      }
      return out +
             '<circle cx="64" cy="92" r="15" fill="url(#lfBody)"/>' +
             '<path d="M64 92 L64 126" stroke="url(#lfStem)" stroke-width="5" stroke-linecap="round"/>' +
             '<circle cx="64" cy="92" r="4.5" fill="#0b3f24" opacity="0.5"/>';
    },

    /* ---- compound leaves -------------------------------------------------- */
    pinnate: function () {
      var out = '', rows = [[30, 26], [50, 32], [70, 32], [88, 26]], i;
      for (i = 0; i < rows.length; i++) {
        out += leaflet(64, rows[i][0], rows[i][1], -1, 4);
        out += leaflet(64, rows[i][0], rows[i][1], 1, 4);
      }
      out += '<path d="M64 16 C 54 6, 56 -2, 64 -2 C 72 -2, 74 6, 64 16 Z" fill="url(#lfBody)"/>';
      out += '<path d="M64 126 L64 6" stroke="url(#lfStem)" stroke-width="5" stroke-linecap="round"/>';
      out += '<path d="M64 126 L64 6" stroke="#e8ffef" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/>';
      return out;
    },
    bipinnate: function () {
      var out = '', r, i, j;
      for (r = 0; r < 4; r++) {
        var y = 26 + r * 22;
        for (var side = -1; side <= 1; side += 2) {
          var reach = 40;
          out += '<path d="M64 ' + y + ' L' + (64 + side * reach) + ' ' + (y - 12) +
                 '" stroke="url(#lfStem)" stroke-width="3" stroke-linecap="round"/>';
          for (j = 1; j <= 6; j++) {
            var t = j / 6;
            var px = 64 + side * reach * t, py = y - 12 * t;
            out += '<ellipse cx="' + px.toFixed(1) + '" cy="' + (py - 5).toFixed(1) +
                   '" rx="4.6" ry="7" transform="rotate(' + (side * 22) + ' ' + px.toFixed(1) + ' ' +
                   (py - 5).toFixed(1) + ')" fill="url(#lfBody)"/>';
            out += '<ellipse cx="' + px.toFixed(1) + '" cy="' + (py + 5).toFixed(1) +
                   '" rx="4.6" ry="7" transform="rotate(' + (-side * 22) + ' ' + px.toFixed(1) + ' ' +
                   (py + 5).toFixed(1) + ')" fill="url(#lfBody)"/>';
          }
        }
      }
      out += '<path d="M64 126 L64 18" stroke="url(#lfStem)" stroke-width="5" stroke-linecap="round"/>';
      return out;
    },
    palmate: function () {
      var out = '<path d="M64 124 L64 78" stroke="url(#lfStem)" stroke-width="5" stroke-linecap="round"/>';
      var n = 7, i;
      for (i = 0; i < n; i++) {
        var a = (-90 + (i - (n - 1) / 2) * 26);
        var len = 64 - Math.abs(i - (n - 1) / 2) * 8;
        out += '<g transform="translate(64 80) rotate(' + a + ')">' +
               '<path d="M0 0 C -9 ' + (-len * 0.4) + ', -6 ' + (-len * 0.82) + ', 0 ' + (-len) +
               ' C 6 ' + (-len * 0.82) + ', 9 ' + (-len * 0.4) + ', 0 0 Z" fill="url(#lfBody)"/>' +
               '<path d="M0 0 L0 ' + (-len + 4) + '" stroke="#0b3f24" stroke-width="1.4" opacity="0.45"/>' +
               '</g>';
      }
      return out + '<circle cx="64" cy="80" r="5" fill="#0b3f24" opacity="0.45"/>';
    },
    feather: function () {
      var out = '<path d="M20 108 C 52 94, 88 62, 116 22" stroke="url(#lfStem)" stroke-width="6" ' +
                'fill="none" stroke-linecap="round"/>';
      var i;
      for (i = 0; i < 16; i++) {
        var t = i / 15;
        var x = 20 + (116 - 20) * t;
        var y = 108 - 86 * t * (1.12 - t * 0.2);
        var len = 22 + Math.sin(t * Math.PI) * 16;
        out += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' l' + (-len * 0.32).toFixed(1) + ' ' +
               len.toFixed(1) + '" stroke="url(#lfBody)" stroke-width="4.6" stroke-linecap="round"/>';
        out += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' l' + (len * 0.32).toFixed(1) + ' ' +
               (-len).toFixed(1) + '" stroke="url(#lfBody)" stroke-width="4.6" stroke-linecap="round"/>';
      }
      return out;
    },
    trifoliate: function () {
      var out = '<path d="M64 126 L64 70" stroke="url(#lfStem)" stroke-width="5" stroke-linecap="round"/>';
      var spec = [[-40, 76, 34], [40, 76, 34], [0, 70, 40]], i;
      for (i = 0; i < spec.length; i++) {
        var a = spec[i][0], y = spec[i][1], len = spec[i][2];
        out += '<g transform="translate(64 ' + y + ') rotate(' + a + ')">' +
               '<path d="M0 0 C -18 ' + (-len * 0.5) + ', -12 ' + (-len * 1.1) + ', 0 ' + (-len * 1.35) +
               ' C 12 ' + (-len * 1.1) + ', 18 ' + (-len * 0.5) + ', 0 0 Z" fill="url(#lfBody)"/>' +
               '<path d="M0 -2 L0 ' + (-len * 1.28) + '" stroke="#0b3f24" stroke-width="1.6" opacity="0.45"/>' +
               '</g>';
      }
      return out;
    },
    unifoliate: function () {
      return '<path d="M64 20 C 30 40, 24 82, 64 118 C 104 82, 98 40, 64 20 Z" fill="url(#lfBody)"/>' +
             midrib(22, 116) + veins(42, 96, 24) +
             '<path d="M64 118 L64 126" stroke="url(#lfStem)" stroke-width="5" stroke-linecap="round"/>' +
             '<path d="M56 122 C 60 112, 68 112, 72 122 Z" fill="url(#lfBody)"/>' +
             '<circle cx="64" cy="119" r="3.4" fill="#0b3f24" opacity="0.5"/>';
    }
  };

  /* ---------------------------------------------------------------------------
     Species. `img` is optional: if assets/images/leaves/<img> is missing the
     `shape` vector is drawn instead, so the game never breaks on a missing file.
     ------------------------------------------------------------------------ */
  var LEAVES = [
    /* ---- simple ---------------------------------------------------------- */
    { id: 'mango', name: 'Mango', sci: 'Mangifera indica', type: 'simple', shape: 'elongate',
      note: 'One undivided blade on the petiole, with a single unbroken margin from tip to base.' },
    { id: 'guava', name: 'Guava', sci: 'Psidium guajava', type: 'simple', shape: 'ovate',
      note: 'A plain oval blade; the strongly raised midrib and side veins are still one single leaf.' },
    { id: 'hibiscus', name: 'Hibiscus', sci: 'Hibiscus rosa-sinensis', type: 'simple', shape: 'serrate',
      note: 'A toothed margin can look "cut", but the notches never reach the midrib — so it stays simple.' },
    { id: 'banana', name: 'Banana', sci: 'Musa', type: 'simple', shape: 'elongate',
      note: 'A huge single blade. Wind splits it along the veins, but it grew as one entire lamina.' },
    { id: 'papaya', name: 'Papaya', sci: 'Carica papaya', type: 'simple', shape: 'lobed',
      note: 'Deeply palmately lobed, yet the lobes stay joined to one blade — a lobed simple leaf.' },
    { id: 'pumpkin', name: 'Pumpkin', sci: 'Cucurbita maxima', type: 'simple', shape: 'lobed',
      note: 'Five shallow lobes on one broad blade, borne on a long hollow petiole.' },
    { id: 'peepal', name: 'Peepal', sci: 'Ficus religiosa', type: 'simple', shape: 'cordate',
      note: 'Heart-shaped with a long drip tip; a single blade with a single axillary bud at its base.' },
    { id: 'malabar_spinach', name: 'Malabar Spinach', sci: 'Basella alba', type: 'simple', shape: 'cordate',
      note: 'Thick fleshy heart-shaped blade on a twining succulent stem.' },
    { id: 'milkweed', name: 'Milkweed (Calotropis)', sci: 'Calotropis gigantea', type: 'simple', shape: 'ovate',
      note: 'Broad pale entire blade in opposite pairs; the plant bleeds milky latex when cut.' },
    { id: 'cotton', name: 'Cotton', sci: 'Gossypium', type: 'simple', shape: 'lobed',
      note: 'Palmately lobed simple leaf — the sinuses stop well short of the petiole.' },

    /* ---- compound -------------------------------------------------------- */
    { id: 'neem', name: 'Neem', sci: 'Azadirachta indica', type: 'compound', shape: 'pinnate',
      note: 'Pinnately compound: many sickle-shaped leaflets on a common rachis, no bud at a leaflet base.' },
    { id: 'curry_leaf', name: 'Curry Leaf', sci: 'Murraya koenigii', type: 'compound', shape: 'pinnate',
      note: 'Imparipinnate — leaflet pairs plus one terminal leaflet; each leaflet has no axillary bud.' },
    { id: 'rose', name: 'Rose', sci: 'Rosa', type: 'compound', shape: 'pinnate',
      note: 'Usually 5-7 leaflets on one rachis; the whole set falls as a single leaf.' },
    { id: 'tomato', name: 'Tomato', sci: 'Solanum lycopersicum', type: 'compound', shape: 'pinnate',
      note: 'Unequally pinnate with small leaflets tucked between the large ones.' },
    { id: 'rain_tree', name: 'Rain Tree', sci: 'Samanea saman', type: 'compound', shape: 'bipinnate',
      note: 'Bipinnate: the rachis carries side branches, each with its own row of leaflets.' },
    { id: 'touch_me_not', name: 'Touch Me Not', sci: 'Mimosa pudica', type: 'compound', shape: 'bipinnate',
      note: 'Bipinnate and touch-sensitive — the leaflets fold shut in seconds when disturbed.' },
    { id: 'marijuana', name: 'Cannabis', sci: 'Cannabis sativa', type: 'compound', shape: 'palmate',
      note: 'Palmately compound: separate stalked leaflets all radiate from one point on the petiole.' },
    { id: 'coconut', name: 'Coconut', sci: 'Cocos nucifera', type: 'compound', shape: 'feather',
      note: 'A giant pinnately compound frond; each long leaflet is a separate blade on the rachis.' },
    { id: 'butterfly_pea', name: 'Butterfly Pea', sci: 'Clitoria ternatea', type: 'compound', shape: 'pinnate',
      note: 'Pinnate with 5-7 leaflets on a slender rachis, borne by a twining legume.' },
    { id: 'lemon', name: 'Lemon', sci: 'Citrus limon', type: 'compound', shape: 'unifoliate',
      note: 'Unifoliate compound: only one leaflet remains, but the joint and winged petiole reveal it.' }
  ];

  /* ---------------------------------------------------------------------------
     Levels. Each round shows one specimen, exactly as the original game did;
     levels just decide how many specimens and how wide the pool is.
     ------------------------------------------------------------------------ */
  var LEVELS = [
    { id: 1, name: 'Seedling Survey', sub: 'Six easy specimens', rounds: 6, pool: 8 },
    { id: 2, name: 'Garden Walk', sub: 'Eight from the kitchen garden', rounds: 8, pool: 12 },
    { id: 3, name: 'Grove Study', sub: 'Ten specimens, trickier margins', rounds: 10, pool: 16 },
    { id: 4, name: 'Canopy Census', sub: 'Fourteen from the whole canopy', rounds: 14, pool: 20 },
    { id: 5, name: 'Herbarium Master', sub: 'Every specimen in the cabinet', rounds: 20, pool: 20 }
  ];

  /* Reference content for the "Learn More" panel on the result screen. */
  var REFERENCE = {
    simple: {
      title: 'Simple Leaf',
      body: 'The lamina (blade) is a single undivided piece. It may be toothed or even ' +
            'deeply lobed, but the incisions never cut all the way down to the midrib or petiole.',
      tells: [
        'One blade on one petiole',
        'A bud sits in the axil where the petiole meets the stem',
        'Lobes stay joined to the blade'
      ]
    },
    compound: {
      title: 'Compound Leaf',
      body: 'The lamina is fully divided into separate leaflets, each with its own tiny stalk ' +
            'on a common axis called the rachis. The whole set behaves as one leaf.',
      tells: [
        'Several free leaflets on one rachis',
        'No bud at the base of any single leaflet',
        'Leaflets lie in one plane and drop together'
      ]
    },
    types: [
      { k: 'Pinnately compound', v: 'Leaflets in rows along a rachis — Neem, Curry leaf, Rose, Tomato.' },
      { k: 'Bipinnately compound', v: 'The rachis branches again before bearing leaflets — Rain tree, Touch me not.' },
      { k: 'Palmately compound', v: 'All leaflets radiate from one point — Cannabis.' },
      { k: 'Unifoliate compound', v: 'A single leaflet with a visible joint — Lemon.' },
      { k: 'Lobed simple', v: 'Deep cuts that stop short of the midrib — Papaya, Pumpkin, Cotton.' }
    ],
    trap: 'The classic trap: a deeply lobed simple leaf (papaya, cotton) looks divided but is not. ' +
          'Follow one cut inward — if it stops before the midrib, the leaf is simple.'
  };

  global.LeafData = {
    SHAPES: SHAPES,
    LEAVES: LEAVES,
    LEVELS: LEVELS,
    REFERENCE: REFERENCE,
    vector: function (shapeName) {
      var fn = SHAPES[shapeName] || SHAPES.ovate;
      return '<svg class="leaf-vector" viewBox="0 0 128 128" aria-hidden="true">' + fn() + '</svg>';
    },
    byId: function (id) {
      for (var i = 0; i < LEAVES.length; i++) { if (LEAVES[i].id === id) { return LEAVES[i]; } }
      return null;
    }
  };
})(window);
