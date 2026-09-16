/* ============================================================================
   fx.js — ambient decoration and juicy feedback

   Nothing in here touches gameplay state or hitboxes. Every element it
   creates is pointer-events:none and lives outside #play-area.
   ========================================================================== */
'use strict';

const FX = {
  layer: null,
  ambPlankton: null,
  ambFish: null,
  motionOn: true,
  reduced: false,

  init() {
    this.layer = document.getElementById('fx-layer');
    this.ambPlankton = document.getElementById('amb-plankton');
    this.ambFish = document.getElementById('amb-fish');
    this.reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.buildPlankton();
    this.buildFish();
    this.bindParallax();
  },

  setMotion(on) {
    this.motionOn = !!on;
    document.body.classList.toggle('no-motion', !this.motionOn);
  },

  /* ------------------------------------------------------- ambient life -- */

  buildPlankton() {
    if (!this.ambPlankton) return;
    const wide = window.innerWidth > 720;
    const count = this.reduced ? 0 : (wide ? 46 : 26);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const m = document.createElement('div');
      m.className = 'mote';
      const size = 2 + Math.random() * 7;
      m.style.width = size + 'px';
      m.style.height = size + 'px';
      m.style.left = (Math.random() * 100).toFixed(2) + '%';
      m.style.bottom = (-10 + Math.random() * 30).toFixed(2) + '%';
      m.style.animationDuration = (14 + Math.random() * 22).toFixed(1) + 's';
      m.style.animationDelay = (-Math.random() * 30).toFixed(1) + 's';
      m.style.opacity = (0.25 + Math.random() * 0.55).toFixed(2);
      frag.appendChild(m);
    }
    this.ambPlankton.appendChild(frag);
  },

  FISH_SVG: {
    small:
      '<svg width="54" height="30" viewBox="0 0 54 30">' +
      '<defs><linearGradient id="fsA" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#8fe9ff"/><stop offset="55%" stop-color="#2b93b8"/>' +
      '<stop offset="100%" stop-color="#0d4560"/></linearGradient></defs>' +
      '<g class="body"><path d="M4,15 C12,3 34,3 42,15 C34,27 12,27 4,15 Z" fill="url(#fsA)"/>' +
      '<path d="M42,15 L53,6 L50,15 L53,24 Z" fill="#1c6b8c"/>' +
      '<circle cx="14" cy="12.5" r="2.4" fill="#04202e"/>' +
      '<circle cx="13.2" cy="11.7" r="0.9" fill="#eafcff"/></g></svg>',
    large:
      '<svg width="92" height="46" viewBox="0 0 92 46">' +
      '<defs><linearGradient id="flA" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffd79a"/><stop offset="48%" stop-color="#e08a3c"/>' +
      '<stop offset="100%" stop-color="#7a3c10"/></linearGradient></defs>' +
      '<g class="body"><path d="M6,23 C18,4 60,4 72,23 C60,42 18,42 6,23 Z" fill="url(#flA)"/>' +
      '<path d="M72,23 L90,9 L85,23 L90,37 Z" fill="#a4551a"/>' +
      '<path d="M34,7 L48,3 L44,11 Z" fill="#c4701f"/>' +
      '<circle cx="22" cy="19" r="3.6" fill="#2a1204"/>' +
      '<circle cx="20.8" cy="17.8" r="1.3" fill="#fff3df"/></g></svg>',
    jelly:
      '<svg width="46" height="72" viewBox="0 0 46 72">' +
      '<defs><radialGradient id="jlA" cx="45%" cy="30%">' +
      '<stop offset="0%" stop-color="#ffe3ff" stop-opacity="0.95"/>' +
      '<stop offset="60%" stop-color="#b07adf" stop-opacity="0.7"/>' +
      '<stop offset="100%" stop-color="#5b2f96" stop-opacity="0.35"/></radialGradient></defs>' +
      '<g class="body"><path d="M4,26 A19,22 0 0 1 42,26 L38,32 Q23,39 8,32 Z" fill="url(#jlA)"/>' +
      '<g stroke="#c79bf0" stroke-width="2.4" stroke-linecap="round" opacity="0.75" fill="none">' +
      '<path d="M12,33 q-3,14 2,26"/><path d="M20,35 q3,15 -1,29"/>' +
      '<path d="M28,35 q-3,16 2,28"/><path d="M35,32 q4,13 -1,25"/></g></g></svg>'
  },

  buildFish() {
    if (!this.ambFish || this.reduced) return;
    const wide = window.innerWidth > 720;
    const shoal = wide
      ? [['small', 9, 34, 0.55], ['small', 26, 46, 0.45], ['large', 52, 62, 0.4],
         ['jelly', 18, 78, 0.35], ['small', 68, 40, 0.5], ['jelly', 74, 96, 0.3]]
      : [['small', 16, 40, 0.5], ['large', 58, 66, 0.38], ['jelly', 34, 84, 0.32]];

    shoal.forEach((cfg, i) => {
      const [kind, topPct, dur, opacity] = cfg;
      const el = document.createElement('div');
      el.className = 'fish' + (i % 2 ? ' flip' : '');
      el.style.top = topPct + '%';
      el.style.animationDuration = dur + 's';
      el.style.animationDelay = (-Math.random() * dur).toFixed(1) + 's';
      el.style.opacity = opacity;
      el.style.transform = 'translate3d(-24vw,0,0)';

      // Optional drop-in artwork takes priority over the inline silhouette.
      const slot = kind === 'small' ? 'fish-small' : kind === 'large' ? 'fish-large' : 'jellyfish';
      const url = typeof Assets !== 'undefined' ? Assets.url(slot) : null;
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.style.width = (kind === 'large' ? 92 : kind === 'small' ? 54 : 46) + 'px';
        img.style.height = 'auto';
        el.appendChild(img);
      } else {
        el.innerHTML = this.FISH_SVG[kind === 'jelly' ? 'jelly' : kind];
      }
      this.ambFish.appendChild(el);
    });
  },

  /** Very light pointer parallax on the decorative depth layers. */
  bindParallax() {
    const layers = Array.prototype.slice.call(document.querySelectorAll('.parallax'));
    if (!layers.length) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const step = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      layers.forEach(l => {
        const d = parseFloat(l.getAttribute('data-depth')) || 0.1;
        l.style.transform = 'translate3d(' + (-cx * 34 * d).toFixed(2) + 'px,' +
                            (-cy * 18 * d).toFixed(2) + 'px, 0)';
      });
      raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001
        ? requestAnimationFrame(step) : 0;
    };

    window.addEventListener('pointermove', e => {
      if (!this.motionOn) return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
  },

  /* ---------------------------------------------------------- feedback -- */

  /** Radial spray of glowing motes at a screen position. */
  burst(x, y, opts) {
    if (!this.layer || !this.motionOn) return;
    const o = opts || {};
    const count = o.count || 16;
    const color = o.color || '#7ff5ff';
    const spread = o.spread || 130;
    const life = o.life || 720;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'spark';
      const size = (o.size || 9) * (0.5 + Math.random());
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (x - size / 2) + 'px';
      p.style.top = (y - size / 2) + 'px';
      p.style.setProperty('--spark', color);
      this.layer.appendChild(p);

      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const dist = spread * (0.35 + Math.random() * 0.85);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - (o.lift || 30);
      const dur = life * (0.65 + Math.random() * 0.6);

      const anim = p.animate([
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
        { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(.15)', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.16,.72,.35,1)' });
      anim.onfinish = () => p.remove();
      // Safety net if the animation never finishes (tab backgrounded, etc.)
      setTimeout(() => p.remove(), dur + 400);
    }
  },

  /** Expanding shock ring. */
  ring(x, y, color, size) {
    if (!this.layer || !this.motionOn) return;
    const r = document.createElement('div');
    const s = size || 40;
    r.className = 'ring-burst';
    r.style.width = s + 'px';
    r.style.height = s + 'px';
    r.style.left = (x - s / 2) + 'px';
    r.style.top = (y - s / 2) + 'px';
    r.style.setProperty('--spark', color || '#7ff5ff');
    this.layer.appendChild(r);
    const anim = r.animate([
      { transform: 'scale(.4)', opacity: .95 },
      { transform: 'scale(3.2)', opacity: 0 }
    ], { duration: 620, easing: 'cubic-bezier(.15,.75,.3,1)' });
    anim.onfinish = () => r.remove();
    setTimeout(() => r.remove(), 1000);
  },

  /** Score delta that drifts upward and fades. */
  floatScore(x, y, text, good) {
    if (!this.layer) return;
    const el = document.createElement('div');
    el.className = 'float-score ' + (good ? 'good' : 'bad');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.layer.appendChild(el);
    const anim = el.animate([
      { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
      { transform: 'translate(-50%,-115%) scale(1.25)', opacity: 1, offset: .3 },
      { transform: 'translate(-50%,-230%) scale(1)', opacity: 0 }
    ], { duration: 1050, easing: 'cubic-bezier(.2,.7,.3,1)' });
    anim.onfinish = () => el.remove();
    setTimeout(() => el.remove(), 1400);
  },

  /** Brief full-screen tint. */
  flash(good) {
    if (!this.layer || !this.motionOn) return;
    const f = document.createElement('div');
    f.className = 'flash ' + (good ? 'good' : 'bad');
    this.layer.appendChild(f);
    const anim = f.animate([{ opacity: 0 }, { opacity: 1, offset: .18 }, { opacity: 0 }],
      { duration: 460, easing: 'ease-out' });
    anim.onfinish = () => f.remove();
    setTimeout(() => f.remove(), 800);
  },

  /** A single small bubble off the guide fish's tail. */
  finBubble(x, y) {
    if (!this.layer || !this.motionOn) return;
    const b = document.createElement('div');
    b.className = 'spark';
    const size = 3 + Math.random() * 5;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = (x + (Math.random() - .5) * 12) + 'px';
    b.style.top = y + 'px';
    b.style.setProperty('--spark', '#cdf6ff');
    b.style.opacity = '0.75';
    this.layer.appendChild(b);
    const dur = 620 + Math.random() * 520;
    const anim = b.animate([
      { transform: 'translate3d(0,0,0) scale(.5)', opacity: .8 },
      { transform: 'translate3d(' + ((Math.random() - .5) * 26) + 'px,-' +
          (44 + Math.random() * 54) + 'px,0) scale(1.05)', opacity: 0 }
    ], { duration: dur, easing: 'ease-out' });
    anim.onfinish = () => b.remove();
    setTimeout(() => b.remove(), dur + 300);
  },

  /** Rising trail of small bubbles, used when a bubble is collected. */
  bubbleTrail(x, y) {
    if (!this.layer || !this.motionOn) return;
    for (let i = 0; i < 7; i++) {
      const b = document.createElement('div');
      b.className = 'spark';
      const size = 5 + Math.random() * 9;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = (x + (Math.random() - .5) * 46) + 'px';
      b.style.top = y + 'px';
      b.style.setProperty('--spark', '#bff6ff');
      this.layer.appendChild(b);
      const dur = 900 + Math.random() * 700;
      const anim = b.animate([
        { transform: 'translate3d(0,0,0) scale(.6)', opacity: .9 },
        { transform: 'translate3d(' + ((Math.random() - .5) * 40) + 'px,-' +
            (100 + Math.random() * 120) + 'px,0) scale(1.15)', opacity: 0 }
      ], { duration: dur, easing: 'ease-out', delay: i * 55 });
      anim.onfinish = () => b.remove();
      setTimeout(() => b.remove(), dur + i * 55 + 400);
    }
  },

  /** Confetti-ish celebration rain for a completed dive. */
  celebrate() {
    if (!this.layer || !this.motionOn) return;
    const colors = ['#7ff5ff', '#ffd479', '#8dffb8', '#ff9db4', '#c2a3ff'];
    const w = window.innerWidth;
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('div');
      p.className = 'spark';
      const size = 7 + Math.random() * 11;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random() * w) + 'px';
      p.style.top = (window.innerHeight + 20) + 'px';
      p.style.setProperty('--spark', colors[i % colors.length]);
      this.layer.appendChild(p);
      const dur = 2200 + Math.random() * 1800;
      const anim = p.animate([
        { transform: 'translate3d(0,0,0) scale(.7)', opacity: 0 },
        { transform: 'translate3d(' + ((Math.random() - .5) * 120) + 'px,-' +
            (window.innerHeight * (.5 + Math.random() * .7)) + 'px,0) scale(1.1)', opacity: .95, offset: .35 },
        { transform: 'translate3d(' + ((Math.random() - .5) * 200) + 'px,-' +
            (window.innerHeight * 1.15) + 'px,0) scale(.5)', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.22,.7,.4,1)', delay: Math.random() * 900 });
      anim.onfinish = () => p.remove();
      setTimeout(() => p.remove(), dur + 1400);
    }
  }
};
