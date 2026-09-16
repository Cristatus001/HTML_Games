/* =============================================================================
   Leaf Sorter — ambient background + particle effects
   Two canvases, both pointer-events:none so they never touch gameplay hit
   testing. The background draws procedural parallax foliage, drifting spores
   and falling leaves; optional PNG layers in assets/images/background/ replace
   the procedural silhouettes when present.
   ========================================================================== */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ======================================================= background layer */
  var Bg = {
    canvas: null,
    ctx: null,
    w: 0, h: 0, dpr: 1,
    spores: [],
    leaves: [],
    fronds: [],
    layers: [],          /* optional drop-in images */
    t: 0,
    parallax: { x: 0, y: 0, tx: 0, ty: 0 },
    reduced: false,
    running: false,
    _last: 0
  };

  var LAYER_FILES = [
    { src: 'assets/images/background/layer_far.png', depth: 0.10, y: 0.62, alpha: 0.5 },
    { src: 'assets/images/background/layer_mid.png', depth: 0.22, y: 0.72, alpha: 0.7 },
    { src: 'assets/images/background/layer_near.png', depth: 0.40, y: 0.84, alpha: 0.9 }
  ];

  Bg.init = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.seed();
    this.probeLayers();
    var self = this;
    global.addEventListener('resize', function () { self.resize(); self.seed(); });
    /* subtle parallax follow */
    global.addEventListener('pointermove', function (e) {
      self.parallax.tx = (e.clientX / Math.max(1, global.innerWidth) - 0.5) * 2;
      self.parallax.ty = (e.clientY / Math.max(1, global.innerHeight) - 0.5) * 2;
    }, { passive: true });
    if (global.DeviceOrientationEvent) {
      global.addEventListener('deviceorientation', function (e) {
        if (e.gamma === null || e.gamma === undefined) { return; }
        self.parallax.tx = Math.max(-1, Math.min(1, e.gamma / 32));
        self.parallax.ty = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 32));
      }, { passive: true });
    }
    this.start();
  };

  Bg.probeLayers = function () {
    var self = this;
    LAYER_FILES.forEach(function (spec) {
      var img = new global.Image();
      img.onload = function () { self.layers.push({ img: img, spec: spec }); };
      img.onerror = function () { /* keep procedural silhouettes */ };
      img.src = spec.src;
    });
  };

  Bg.resize = function () {
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth || global.innerWidth;
    this.h = this.canvas.clientHeight || global.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Bg.seed = function () {
    var area = this.w * this.h;
    var sporeCount = Math.max(26, Math.min(120, Math.round(area / 14000)));
    var leafCount = Math.max(5, Math.min(16, Math.round(area / 90000)));
    var i;

    this.spores = [];
    for (i = 0; i < sporeCount; i++) {
      this.spores.push({
        x: rnd(0, this.w), y: rnd(0, this.h),
        r: rnd(0.7, 2.6), sp: rnd(4, 16), drift: rnd(-9, 9),
        ph: rnd(0, TAU), hue: Math.random() < 0.25 ? 'gold' : 'green',
        a: rnd(0.18, 0.62), depth: rnd(0.2, 1)
      });
    }

    this.leaves = [];
    for (i = 0; i < leafCount; i++) { this.leaves.push(this.newLeaf(true)); }

    /* procedural frond silhouettes for the three parallax bands */
    this.fronds = [];
    var bands = [
      { depth: 0.10, y: 0.70, n: 5, scale: 0.55, a: 0.16 },
      { depth: 0.22, y: 0.86, n: 4, scale: 0.85, a: 0.22 },
      { depth: 0.40, y: 1.04, n: 3, scale: 1.25, a: 0.3 }
    ];
    for (var b = 0; b < bands.length; b++) {
      var band = bands[b];
      for (i = 0; i < band.n; i++) {
        this.fronds.push({
          depth: band.depth,
          x: (i + 0.5) / band.n * this.w + rnd(-40, 40),
          y: this.h * band.y,
          s: band.scale * rnd(0.8, 1.25),
          rot: rnd(-0.5, 0.5),
          a: band.a,
          sway: rnd(0, TAU),
          flip: Math.random() < 0.5 ? -1 : 1
        });
      }
    }
  };

  Bg.newLeaf = function (spread) {
    return {
      x: rnd(-40, this.w + 40),
      y: spread ? rnd(-this.h, this.h) : rnd(-120, -30),
      s: rnd(9, 22),
      vy: rnd(14, 34),
      vx: rnd(-14, 14),
      rot: rnd(0, TAU),
      vr: rnd(-0.7, 0.7),
      sway: rnd(0, TAU),
      swayAmp: rnd(10, 34),
      a: rnd(0.14, 0.4)
    };
  };

  /* one silhouette frond, drawn procedurally */
  function drawFrond(c, f, t) {
    var sway = Math.sin(t * 0.28 + f.sway) * 0.055;
    c.save();
    c.translate(f.x, f.y);
    c.rotate(f.rot + sway);
    c.scale(f.s * f.flip, f.s);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-30, -55, -84, -104);
    c.lineTo(-78, -110);
    c.quadraticCurveTo(-26, -62, 0, -6);
    c.closePath();
    c.fill();
    for (var i = 1; i <= 11; i++) {
      var p = i / 12;
      var bx = -84 * p * p * 0.6 - 30 * p * (1 - p) * 2;
      var by = -104 * p * p * 0.6 - 55 * p * (1 - p) * 2;
      var len = 26 * Math.sin(p * Math.PI) + 8;
      c.beginPath();
      c.ellipse(bx - len * 0.32, by - len * 0.44, len * 0.5, 4.2,
        Math.atan2(-len * 0.9, -len * 0.6), 0, TAU);
      c.fill();
      c.beginPath();
      c.ellipse(bx + len * 0.24, by + len * 0.3, len * 0.42, 3.8,
        Math.atan2(len * 0.7, len * 0.5), 0, TAU);
      c.fill();
    }
    c.restore();
  }

  Bg.frame = function (dt) {
    var c = this.ctx, i;
    c.clearRect(0, 0, this.w, this.h);
    this.t += dt;

    /* ease the parallax offset */
    this.parallax.x += (this.parallax.tx - this.parallax.x) * Math.min(1, dt * 2.4);
    this.parallax.y += (this.parallax.ty - this.parallax.y) * Math.min(1, dt * 2.4);

    /* --- canopy light shafts ------------------------------------------- */
    var shaftPhase = Math.sin(this.t * 0.13);
    for (i = 0; i < 3; i++) {
      var sx = this.w * (0.18 + i * 0.32) + shaftPhase * 26 - this.parallax.x * 18;
      var grad = c.createLinearGradient(sx, -40, sx + this.w * 0.16, this.h);
      var glow = 0.055 + 0.03 * Math.sin(this.t * 0.2 + i);
      grad.addColorStop(0, 'rgba(190, 255, 214,' + glow.toFixed(3) + ')');
      grad.addColorStop(0.55, 'rgba(140, 240, 190, ' + (glow * 0.35).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(90, 200, 150, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(sx - this.w * 0.05, -40);
      c.lineTo(sx + this.w * 0.1, -40);
      c.lineTo(sx + this.w * 0.3, this.h + 40);
      c.lineTo(sx - this.w * 0.02, this.h + 40);
      c.closePath();
      c.fill();
    }

    /* --- parallax silhouettes ------------------------------------------ */
    if (this.layers.length) {
      for (i = 0; i < this.layers.length; i++) {
        var L = this.layers[i];
        var iw = L.img.naturalWidth || L.img.width;
        var ih = L.img.naturalHeight || L.img.height;
        if (!iw || !ih) { continue; }
        var dw = this.w * 1.2;
        var dh = dw * ih / iw;
        var ox = -this.w * 0.1 - this.parallax.x * 40 * L.spec.depth * 2.4;
        var oy = this.h * L.spec.y - dh * 0.5 - this.parallax.y * 22 * L.spec.depth * 2.4;
        c.globalAlpha = L.spec.alpha;
        c.drawImage(L.img, ox, oy, dw, dh);
        c.globalAlpha = 1;
      }
    } else {
      for (i = 0; i < this.fronds.length; i++) {
        var f = this.fronds[i];
        c.save();
        c.globalAlpha = f.a;
        c.fillStyle = f.depth < 0.2 ? '#0d3325' : (f.depth < 0.3 ? '#0a2a1e' : '#061c14');
        var ff = {
          x: f.x - this.parallax.x * 46 * f.depth * 2.4,
          y: f.y - this.parallax.y * 24 * f.depth * 2.4,
          s: f.s, rot: f.rot, sway: f.sway, flip: f.flip
        };
        drawFrond(c, ff, this.t);
        c.restore();
      }
    }

    /* --- drifting spores ------------------------------------------------ */
    for (i = 0; i < this.spores.length; i++) {
      var s = this.spores[i];
      s.y -= s.sp * dt * (this.reduced ? 0.25 : 1);
      s.x += Math.sin(this.t * 0.5 + s.ph) * s.drift * dt;
      if (s.y < -12) { s.y = this.h + 12; s.x = rnd(0, this.w); }
      if (s.x < -12) { s.x = this.w + 12; } else if (s.x > this.w + 12) { s.x = -12; }
      var pulse = 0.65 + 0.35 * Math.sin(this.t * 1.6 + s.ph);
      var px = s.x - this.parallax.x * 16 * s.depth;
      var py = s.y - this.parallax.y * 10 * s.depth;
      var g2 = c.createRadialGradient(px, py, 0, px, py, s.r * 5.5);
      if (s.hue === 'gold') {
        g2.addColorStop(0, 'rgba(255, 233, 160,' + (s.a * pulse).toFixed(3) + ')');
        g2.addColorStop(1, 'rgba(255, 200, 90, 0)');
      } else {
        g2.addColorStop(0, 'rgba(186, 255, 214,' + (s.a * pulse).toFixed(3) + ')');
        g2.addColorStop(1, 'rgba(90, 230, 160, 0)');
      }
      c.fillStyle = g2;
      c.beginPath();
      c.arc(px, py, s.r * 5.5, 0, TAU);
      c.fill();
    }

    /* --- falling leaf silhouettes -------------------------------------- */
    for (i = 0; i < this.leaves.length; i++) {
      var lf = this.leaves[i];
      lf.y += lf.vy * dt * (this.reduced ? 0.3 : 1);
      lf.sway += dt * 1.1;
      lf.x += (lf.vx + Math.sin(lf.sway) * lf.swayAmp) * dt;
      lf.rot += lf.vr * dt;
      if (lf.y > this.h + 60) { this.leaves[i] = this.newLeaf(false); continue; }
      c.save();
      c.translate(lf.x, lf.y);
      c.rotate(lf.rot);
      c.globalAlpha = lf.a;
      var lg = c.createLinearGradient(0, -lf.s, 0, lf.s);
      lg.addColorStop(0, '#7fe0a8');
      lg.addColorStop(1, '#1b6b41');
      c.fillStyle = lg;
      c.beginPath();
      c.moveTo(0, -lf.s);
      c.bezierCurveTo(lf.s * 0.8, -lf.s * 0.3, lf.s * 0.6, lf.s * 0.7, 0, lf.s);
      c.bezierCurveTo(-lf.s * 0.6, lf.s * 0.7, -lf.s * 0.8, -lf.s * 0.3, 0, -lf.s);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(6, 40, 24, 0.5)';
      c.lineWidth = Math.max(0.6, lf.s * 0.06);
      c.beginPath();
      c.moveTo(0, -lf.s * 0.9);
      c.lineTo(0, lf.s * 0.9);
      c.stroke();
      c.restore();
    }
    c.globalAlpha = 1;
  };

  Bg.start = function () {
    if (this.running) { return; }
    this.running = true;
    var self = this;
    this._last = 0;
    function loop(ts) {
      if (!self.running) { return; }
      var t = ts / 1000;
      var dt = self._last ? Math.min(0.05, t - self._last) : 0.016;
      self._last = t;
      self.frame(dt);
      global.requestAnimationFrame(loop);
    }
    global.requestAnimationFrame(loop);
  };

  Bg.stop = function () { this.running = false; };

  /* ========================================================= particle burst */
  var Fx = {
    canvas: null,
    ctx: null,
    w: 0, h: 0, dpr: 1,
    parts: [],
    running: false,
    reduced: false,
    _last: 0
  };

  Fx.init = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    var self = this;
    global.addEventListener('resize', function () { self.resize(); });
  };

  Fx.resize = function () {
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth || global.innerWidth;
    this.h = this.canvas.clientHeight || global.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Fx.spawn = function (p) {
    if (this.parts.length > 520) { this.parts.shift(); }
    this.parts.push(p);
    this.start();
  };

  /* Burst of leaflets + gold sparks. kind: 'good' | 'bad' | 'gold' */
  Fx.burst = function (x, y, kind, power) {
    var n = Math.round((this.reduced ? 8 : 26) * (power || 1));
    var i;
    for (i = 0; i < n; i++) {
      var ang = rnd(0, TAU);
      var spd = rnd(90, 430) * (power || 1);
      this.spawn({
        type: i % 4 === 0 ? 'spark' : 'leaf',
        x: x, y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        g: rnd(420, 760),
        life: 0, max: rnd(0.55, 1.25),
        s: rnd(5, 13),
        rot: rnd(0, TAU), vr: rnd(-9, 9),
        kind: kind
      });
    }
    if (kind !== 'bad') {
      for (i = 0; i < Math.round((this.reduced ? 3 : 10) * (power || 1)); i++) {
        this.spawn({
          type: 'ring', x: x, y: y, life: 0, max: rnd(0.35, 0.6),
          s: rnd(24, 70), kind: kind
        });
      }
    }
  };

  Fx.trail = function (x, y) {
    if (this.reduced) { return; }
    this.spawn({
      type: 'spark', x: x + rnd(-8, 8), y: y + rnd(-8, 8),
      vx: rnd(-30, 30), vy: rnd(-10, 40), g: 120,
      life: 0, max: rnd(0.3, 0.6), s: rnd(2.5, 5.5),
      rot: 0, vr: 0, kind: 'gold'
    });
  };

  Fx.rise = function (x, y, kind) {
    var n = this.reduced ? 4 : 14;
    for (var i = 0; i < n; i++) {
      this.spawn({
        type: 'leaf', x: x + rnd(-70, 70), y: y + rnd(-14, 14),
        vx: rnd(-40, 40), vy: rnd(-260, -110), g: 130,
        life: 0, max: rnd(0.9, 1.7), s: rnd(6, 14),
        rot: rnd(0, TAU), vr: rnd(-5, 5), kind: kind || 'good'
      });
    }
  };

  var PAL = {
    good: ['#6ff0a8', '#28c977', '#0f8a4d'],
    bad: ['#ff9a86', '#e04a32', '#8e1f14'],
    gold: ['#fff0bd', '#ffd469', '#e39c14']
  };

  Fx.frame = function (dt) {
    var c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    var alive = [];
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      p.life += dt;
      var k = p.life / p.max;
      if (k >= 1) { continue; }
      alive.push(p);
      var pal = PAL[p.kind] || PAL.good;

      if (p.type === 'ring') {
        var r = p.s * (0.3 + k * 1.8);
        c.globalAlpha = (1 - k) * 0.5;
        c.strokeStyle = pal[0];
        c.lineWidth = 2.5 * (1 - k) + 0.4;
        c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke();
        continue;
      }

      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      c.globalAlpha = 1 - k * k;

      if (p.type === 'spark') {
        var rr = p.s * (1 - k * 0.55);
        var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 2.6);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, pal[0]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(p.x, p.y, rr * 2.6, 0, TAU); c.fill();
      } else {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        var lg = c.createLinearGradient(0, -p.s, 0, p.s);
        lg.addColorStop(0, pal[0]);
        lg.addColorStop(1, pal[2]);
        c.fillStyle = lg;
        c.beginPath();
        c.moveTo(0, -p.s);
        c.bezierCurveTo(p.s * 0.85, -p.s * 0.25, p.s * 0.6, p.s * 0.75, 0, p.s);
        c.bezierCurveTo(-p.s * 0.6, p.s * 0.75, -p.s * 0.85, -p.s * 0.25, 0, -p.s);
        c.closePath();
        c.fill();
        c.restore();
      }
    }
    c.globalAlpha = 1;
    this.parts = alive;
    if (!alive.length) { this.running = false; }
  };

  Fx.start = function () {
    if (this.running) { return; }
    this.running = true;
    var self = this;
    this._last = 0;
    function loop(ts) {
      if (!self.running) { self.ctx.clearRect(0, 0, self.w, self.h); return; }
      var t = ts / 1000;
      var dt = self._last ? Math.min(0.05, t - self._last) : 0.016;
      self._last = t;
      self.frame(dt);
      global.requestAnimationFrame(loop);
    }
    global.requestAnimationFrame(loop);
  };

  global.LeafFx = { bg: Bg, fx: Fx };
})(window);
