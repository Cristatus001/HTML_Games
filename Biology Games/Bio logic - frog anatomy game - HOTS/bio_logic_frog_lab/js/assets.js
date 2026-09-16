/* ============================================================================
   assets.js - optional drop-in artwork.

   Every visual element ships as CSS/SVG vector art, so the game is complete
   with an empty assets/images tree. This module probes for an optional PNG in
   each slot and swaps it in when the file exists. A missing file is a
   non-event: the probe fails quietly and the vector art stays on screen.

   See assets/images/README.md for the exact filenames, sizes and orientation.
   ========================================================================== */
'use strict';

const Assets = {
  /** absolute-ish path -> true (decoded) | false (absent/undecodable) */
  found: Object.create(null),

  /** Logical key -> optional file path. */
  slots: {
    /* Backdrops (one per screen; wide landscape) */
    'bg-menu':        'assets/images/background/bg_menu.png',
    'bg-lab':         'assets/images/background/bg_lab.png',
    'bg-dossier':     'assets/images/background/bg_dossier.png',
    'bg-result':      'assets/images/background/bg_result.png',
    'godrays':        'assets/images/background/godrays.png',

    /* Characters */
    'frog-correct':   'assets/images/characters/frog_correct.png',
    'frog-wrong':     'assets/images/characters/frog_wrong.png',
    'frog-idle':      'assets/images/characters/frog_idle.png',

    /* Anatomical plates, one per discipline */
    'organ-comparative': 'assets/images/organs/comparative.png',
    'organ-surgical':    'assets/images/organs/surgical.png',
    'organ-environment': 'assets/images/organs/environment.png',
    'organ-circulatory': 'assets/images/organs/circulatory.png',
    'organ-urogenital':  'assets/images/organs/urogenital.png',
    'organ-systemic':    'assets/images/organs/systemic.png',
    'organ-neural':      'assets/images/organs/neural.png',
    'organ-ecological':  'assets/images/organs/ecological.png',

    /* Chrome */
    'title-logo':     'assets/images/ui/title_logo.png',
    'panel':          'assets/images/ui/panel.png',
    'hud-plate':      'assets/images/ui/hud_plate.png',
    'option-plate':   'assets/images/ui/option_plate.png'
  },

  /**
   * Resolve one path. Never rejects - resolves to the url, or null when the
   * file is not present (or is not a decodable image).
   */
  probe(path) {
    if (path in this.found) {
      return Promise.resolve(this.found[path] ? path : null);
    }
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

  /** Probe every optional slot. Resolves once every answer is in. */
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
   * Hide the `.art-vector` inside an `.art` wrapper and raster over it, but
   * only once the file is known to decode. The wrapper owns its own box, so
   * the swap can never shift layout.
   */
  applyArt(wrapper) {
    if (!wrapper) return;
    const key = wrapper.getAttribute('data-art');
    if (!key) return;
    const path = this.slots[key] || key;
    this.probe(path).then(url => {
      if (!url) return;                         // keep the vector fallback
      if (wrapper.querySelector('.art-raster')) return;
      const vec = wrapper.querySelector('.art-vector');
      const img = new Image();
      img.className = 'art-raster';
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      if (vec) vec.classList.add('art-vector-hidden');
      wrapper.appendChild(img);
    });
  },

  /** Paint a slot as an element background, only when the slot resolved. */
  applyBackground(el, key, extra) {
    if (!el) return false;
    const url = this.url(key);
    if (!url) return false;
    el.style.backgroundImage = 'url("' + url + '")';
    if (extra) Object.assign(el.style, extra);
    el.classList.add('has-raster-bg');
    return true;
  },

  /** Wire every `.art[data-art]` wrapper inside `root`. */
  hydrateAll(root) {
    (root || document).querySelectorAll('.art[data-art]').forEach(w => this.applyArt(w));
  },

  /**
   * Publish found skins as CSS custom properties. The stylesheet lists each of
   * these as one layer inside its own background stack with a `none` default,
   * so an absent file simply contributes an empty layer and the vector
   * treatment underneath is what shows.
   */
  publishSkins() {
    const map = {
      '--panel-img':  'panel',
      '--hud-img':    'hud-plate',
      '--option-img': 'option-plate',
      '--rays-img':   'godrays'
    };
    const root = document.documentElement;
    Object.keys(map).forEach(prop => {
      const url = this.url(map[prop]);
      root.style.setProperty(prop, url ? 'url("' + this.absolute(url) + '")' : 'none');
    });
  },

  /**
   * Resolve a game-relative path against the document.
   *
   * A relative url() carried inside a custom property is resolved against the
   * stylesheet that consumes it, not the page - so "assets/x.png" substituted
   * into css/style.css would be fetched as "css/assets/x.png". Handing CSS an
   * already-absolute URL sidesteps that entirely, and still works from
   * file:// or any subfolder.
   */
  absolute(path) {
    try {
      return new URL(path, document.baseURI).href;
    } catch (e) {
      return path;
    }
  }
};
