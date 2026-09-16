/* ============================================================================
   fx.js - ambient backdrop life and hit feedback, on one full-screen canvas.

   The canvas sits behind the UI with `pointer-events: none`, so nothing here
   can intercept a tap or shift a hitbox. Two populations share the loop:

     drifters  long-lived ambient motion (rising culture bubbles, slow motes,
               the occasional tadpole crossing the tank)
     sparks    short-lived burst particles fired on answers and transitions

   Everything degrades cleanly: with reduced-motion enabled the drifters stop
   and bursts are skipped, and the loop parks itself when the tab is hidden.
   ========================================================================== */
'use strict';

const FX = {
  cv: null,
  ctx: null,
  w: 0,
  h: 0,
  dpr: 1,
  raf: 0,
  last: 0,
  running: false,
  reduced: false,
  scene: 'menu',

  drifters: [],
  sparks: [],

  PALETTES: {
    menu:    ['#e040fb', '#41e0d0', '#8e3ff0', '#a8f5b8'],
    lab:     ['#d500f9', '#41e0d0', '#7b1fa2', '#ff8ab0'],
    dossier: ['#8e3ff0', '#41e0d0', '#ffc94d'],
    result:  ['#ffc94d', '#e040fb', '#a8f5b8', '#41e0d0']
  },

  /* ------------------------------------------------------------------ setup */

  init() {
    if (this.cv) return;
    this.cv = document.getElementById('fx-canvas');
    if (!this.cv) return;
    this.ctx = this.cv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.resize());
    }
    this.seedDrifters();
    this.start();
  },

  resize() {
    if (!this.cv) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, window.innerWidth);
    this.h = Math.max(1, window.innerHeight);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
    this.cv.style.width = this.w + 'px';
    this.cv.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(48, now - this.last) / 1000;
      this.last = now;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  },

  setReducedMotion(on) {
    this.reduced = !!on;
    if (this.reduced) {
      this.sparks.length = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w, this.h);
    }
  },

  setScene(name) {
    if (!this.PALETTES[name]) name = 'menu';
    this.scene = name;
    /* Re-tint the standing population instead of rebuilding it, so a screen
       change never reads as a hard cut. */
    const pal = this.PALETTES[name];
    this.drifters.forEach(d => {
      if (d.kind !== 'tadpole') d.color = pal[(Math.random() * pal.length) | 0];
    });
  },

  /* -------------------------------------------------------------- drifters */

  seedDrifters() {
    this.drifters.length = 0;
    const area = this.w * this.h;
    const bubbles = Math.max(10, Math.min(30, Math.round(area / 46000)));
    const motes = Math.max(12, Math.min(40, Math.round(area / 34000)));
    for (let i = 0; i < bubbles; i++) this.drifters.push(this.makeBubble(true));
    for (let i = 0; i < motes; i++) this.drifters.push(this.makeMote(true));
    this.drifters.push(this.makeTadpole());
    this.drifters.push(this.makeTadpole());
  },

  pick() {
    const pal = this.PALETTES[this.scene] || this.PALETTES.menu;
    return pal[(Math.random() * pal.length) | 0];
  },

  makeBubble(anywhere) {
    return {
      kind: 'bubble',
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : this.h + 20,
      r: 3 + Math.random() * 13,
      vy: -(6 + Math.random() * 20),
      phase: Math.random() * Math.PI * 2,
      wob: 6 + Math.random() * 16,
      alpha: 0.1 + Math.random() * 0.22,
      color: this.pick()
    };
  },

  makeMote(anywhere) {
    return {
      kind: 'mote',
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : this.h + 10,
      r: 0.8 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 12,
      vy: -(2 + Math.random() * 9),
      alpha: 0.15 + Math.random() * 0.4,
      twinkle: Math.random() * Math.PI * 2,
      color: this.pick()
    };
  },

  makeTadpole() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      kind: 'tadpole',
      dir: dir,
      x: dir > 0 ? -60 : this.w + 60,
      y: 60 + Math.random() * Math.max(80, this.h - 140),
      sp: 18 + Math.random() * 34,
      s: 0.6 + Math.random() * 0.9,
      t: Math.random() * 10,
      bob: 8 + Math.random() * 16,
      alpha: 0.14 + Math.random() * 0.16,
      color: '#8ef0a5'
    };
  },

  /* ------------------------------------------------------------------ burst */

  /**
   * Fire a spark burst at viewport coordinates.
   * opts: { colors, count, speed, life, gravity, size, spread, ring }
   */
  burst(x, y, opts) {
    if (this.reduced || !this.ctx) return;
    const o = opts || {};
    const colors = o.colors || this.PALETTES[this.scene] || this.PALETTES.menu;
    const n = o.count == null ? 22 : o.count;
    const speed = o.speed == null ? 210 : o.speed;
    const spread = o.spread == null ? Math.PI * 2 : o.spread;
    const base = o.angle == null ? 0 : o.angle;
    for (let i = 0; i < n; i++) {
      const a = base + (spread === Math.PI * 2
        ? Math.random() * Math.PI * 2
        : (Math.random() - 0.5) * spread);
      const v = speed * (0.35 + Math.random() * 0.8);
      this.sparks.push({
        kind: 'spark',
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: o.gravity == null ? 320 : o.gravity,
        life: o.life == null ? 0.75 + Math.random() * 0.5 : o.life * (0.7 + Math.random() * 0.6),
        age: 0,
        r: (o.size == null ? 2.6 : o.size) * (0.6 + Math.random() * 0.9),
        color: colors[(Math.random() * colors.length) | 0],
        spin: (Math.random() - 0.5) * 12,
        rot: Math.random() * Math.PI
      });
    }
    if (o.ring !== false) this.ring(x, y, colors[0], o.ringR || 90);
  },

  ring(x, y, color, radius) {
    if (this.reduced || !this.ctx) return;
    this.sparks.push({
      kind: 'ring', x: x, y: y, r0: 6, r1: radius || 90,
      age: 0, life: 0.5, color: color || '#e040fb'
    });
  },

  /** Coloured rain from the top of the screen - used on the results screen. */
  celebrate(colors) {
    if (this.reduced || !this.ctx) return;
    const pal = colors || this.PALETTES.result;
    const n = Math.min(90, Math.round(this.w / 12));
    for (let i = 0; i < n; i++) {
      this.sparks.push({
        kind: 'spark',
        x: Math.random() * this.w,
        y: -20 - Math.random() * this.h * 0.5,
        vx: (Math.random() - 0.5) * 60,
        vy: 60 + Math.random() * 140,
        g: 90,
        life: 2.4 + Math.random() * 1.6,
        age: 0,
        r: 2 + Math.random() * 3.4,
        color: pal[(Math.random() * pal.length) | 0],
        spin: (Math.random() - 0.5) * 8,
        rot: Math.random() * Math.PI
      });
    }
  },

  /** Convenience: burst centred on an element. */
  burstAt(el, opts) {
    if (!el || this.reduced) return;
    const r = el.getBoundingClientRect();
    this.burst(r.left + r.width / 2, r.top + r.height / 2, opts);
  },

  /* ------------------------------------------------------------------- loop */

  tick(dt) {
    const c = this.ctx;
    if (!c) return;
    c.clearRect(0, 0, this.w, this.h);

    if (!this.reduced) {
      for (let i = 0; i < this.drifters.length; i++) {
        const d = this.drifters[i];
        if (d.kind === 'bubble') {
          d.y += d.vy * dt;
          d.phase += dt * 1.4;
          const x = d.x + Math.sin(d.phase) * d.wob;
          if (d.y < -30) this.drifters[i] = this.makeBubble(false);
          this.drawBubble(x, d.y, d.r, d.color, d.alpha);
        } else if (d.kind === 'mote') {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.twinkle += dt * 3;
          if (d.y < -20 || d.x < -20 || d.x > this.w + 20) this.drifters[i] = this.makeMote(false);
          const a = d.alpha * (0.55 + 0.45 * Math.sin(d.twinkle));
          this.drawGlowDot(d.x, d.y, d.r, d.color, a);
        } else {
          d.x += d.sp * d.dir * dt;
          d.t += dt * 6;
          const y = d.y + Math.sin(d.t * 0.5) * d.bob * 0.25;
          if ((d.dir > 0 && d.x > this.w + 80) || (d.dir < 0 && d.x < -80)) {
            this.drifters[i] = this.makeTadpole();
          }
          this.drawTadpole(d.x, y, d.s, d.dir, d.t, d.color, d.alpha);
        }
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.age += dt;
      if (p.age >= p.life) { this.sparks.splice(i, 1); continue; }
      const k = 1 - p.age / p.life;
      if (p.kind === 'ring') {
        const r = p.r0 + (p.r1 - p.r0) * (1 - k * k);
        c.save();
        c.globalAlpha = k * 0.7;
        c.strokeStyle = p.color;
        c.lineWidth = 2 + 3 * k;
        c.shadowColor = p.color;
        c.shadowBlur = 18 * k;
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      } else {
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        c.save();
        c.globalAlpha = Math.min(1, k * 1.4);
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.shadowColor = p.color;
        c.shadowBlur = 12;
        const s = p.r * (0.5 + k * 0.9);
        c.fillRect(-s, -s * 0.55, s * 2, s * 1.1);
        c.restore();
      }
    }
  },

  /* ------------------------------------------------------------- primitives */

  drawGlowDot(x, y, r, color, alpha) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, alpha));
    const g = c.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },

  drawBubble(x, y, r, color, alpha) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, alpha));
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha *= 0.7;
    c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  },

  drawTadpole(x, y, s, dir, t, color, alpha) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, alpha));
    c.translate(x, y);
    c.scale(dir * s, s);
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 10;
    c.beginPath();
    c.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(-10, 0);
    const wag = Math.sin(t) * 7;
    c.quadraticCurveTo(-22, wag * 0.5, -34, wag);
    c.lineTo(-30, 0);
    c.quadraticCurveTo(-22, -wag * 0.4, -10, 0);
    c.fill();
    c.restore();
  }
};
