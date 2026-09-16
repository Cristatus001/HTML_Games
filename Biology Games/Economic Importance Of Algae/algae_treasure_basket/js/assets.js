/* ============================================================================
   assets.js — optional drop-in artwork

   Every visual element in the game is drawn with CSS/SVG by default. This
   module probes for an optional PNG in assets/images/<group>/ and, when one
   exists, swaps it in. A missing file is a non-event: the probe fails quietly
   and the vector art stays. See assets/images/README.md for the file list.
   ========================================================================== */
'use strict';

const Assets = {
  /** path -> true (loaded) | false (absent). */
  found: Object.create(null),

  /** Optional artwork slots the game asks about, by logical key. */
  slots: {
    'morsel':          'assets/images/items/morsel.png',
    'morsel-good':     'assets/images/items/morsel_good.png',
    'morsel-bad':      'assets/images/items/morsel_bad.png',
    'basket':          'assets/images/items/basket.png',
    'bg-shallows':     'assets/images/background/bg_shallows.png',
    'bg-kelp':         'assets/images/background/bg_kelp.png',
    'bg-twilight':     'assets/images/background/bg_twilight.png',
    'bg-trench':       'assets/images/background/bg_trench.png',
    'bg-menu':         'assets/images/background/bg_menu.png',
    'seafloor':        'assets/images/background/seafloor.png',
    'godrays':         'assets/images/background/godrays.png',
    'fish-small':      'assets/images/characters/fish_small.png',
    'fish-large':      'assets/images/characters/fish_large.png',
    'jellyfish':       'assets/images/characters/jellyfish.png',
    'turtle':          'assets/images/characters/turtle.png',
    'diver':           'assets/images/characters/diver.png',
    'guide-fish':      'assets/images/characters/guide_fish.png',
    'panel':           'assets/images/ui/panel.png',
    'hud-plate':       'assets/images/ui/hud_plate.png',
    'title-logo':      'assets/images/ui/title_logo.png'
  },

  /**
   * Resolve one path. Never rejects — resolves to the url, or null when the
   * file is not present (or is not a decodable image).
   */
  probe(path) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
        this.found[path] = ok;
        resolve(ok ? path : null);
      };
      img.onerror = () => { this.found[path] = false; resolve(null); };
      img.src = path;
    });
  },

  /** Probe every optional slot. Resolves once all answers are in. */
  preload(onProgress) {
    const keys = Object.keys(this.slots);
    let done = 0;
    return Promise.all(keys.map(k =>
      this.probe(this.slots[k]).then(res => {
        done++;
        if (onProgress) onProgress(done / keys.length);
        return res;
      })
    )).then(() => this);
  },

  /** The url for a slot, or null when no artwork was dropped in. */
  url(key) {
    const p = this.slots[key];
    return p && this.found[p] ? p : null;
  },

  has(key) { return this.url(key) !== null; },

  /**
   * Replace the `.art-vector` inside an `.art` wrapper with a raster image,
   * but only when the file exists. The wrapper keeps its own layout so the
   * swap cannot shift anything.
   */
  applyArt(wrapper) {
    if (!wrapper) return;
    const path = wrapper.getAttribute('data-art');
    if (!path) return;
    this.probe(path).then(url => {
      if (!url) return;                       // keep the vector fallback
      const vec = wrapper.querySelector('.art-vector');
      const img = new Image();
      img.className = 'art-raster';
      img.alt = '';
      img.src = url;
      if (vec) vec.style.display = 'none';
      wrapper.appendChild(img);
    });
  },

  /** Apply a background image to an element only when the slot resolved. */
  applyBackground(el, key, extra) {
    if (!el) return false;
    const url = this.url(key);
    if (!url) return false;
    el.style.backgroundImage = 'url("' + url + '")';
    if (extra) Object.assign(el.style, extra);
    return true;
  },

  /** Wire every `[data-art]` wrapper currently in the document. */
  hydrateAll(root) {
    (root || document).querySelectorAll('.art[data-art]').forEach(w => this.applyArt(w));
  }
};
