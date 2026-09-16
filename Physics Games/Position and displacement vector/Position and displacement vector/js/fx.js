/* ==========================================================================
   fx.js - ambient sky scenery (parallax) + particle bursts.
   Nothing here touches gameplay state or hit testing; it is pure decoration
   drawn beneath (scenery) and above (particles) the vector layer.
   ========================================================================== */
'use strict';

var TAU = Math.PI * 2;

/* --------------------------------------------------------------------------
   Sprite helpers - pre-rendered once so per-frame cost stays a drawImage
   -------------------------------------------------------------------------- */

function makeCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function makeCloudSprite(w, h, seed, warm) {
  var c = makeCanvas(w, h);
  var g = c.getContext('2d');
  var lobes = 5 + Math.floor(Util.hash(seed) * 4);
  for (var i = 0; i < lobes; i++) {
    var t = i / (lobes - 1);
    var r = h * (0.30 + Util.hash(seed + i * 3.7) * 0.22);
    var x = w * (0.14 + t * 0.72) + (Util.hash(seed + i) - 0.5) * w * 0.06;
    var y = h * (0.62 - Math.sin(t * Math.PI) * 0.28) + (Util.hash(seed + i * 5.1) - 0.5) * h * 0.1;
    var grd = g.createRadialGradient(x - r * 0.3, y - r * 0.42, r * 0.08, x, y, r);
    if (warm) {
      grd.addColorStop(0, 'rgba(255,242,220,0.95)');
      grd.addColorStop(0.42, 'rgba(246,214,178,0.62)');
      grd.addColorStop(1, 'rgba(180,150,140,0)');
    } else {
      grd.addColorStop(0, 'rgba(240,248,255,0.92)');
      grd.addColorStop(0.44, 'rgba(196,216,232,0.55)');
      grd.addColorStop(1, 'rgba(120,150,175,0)');
    }
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  return c;
}

function makeIslandSilhouette(w, h, seed) {
  var c = makeCanvas(w, h);
  var g = c.getContext('2d');
  var topY = h * 0.42;
  g.beginPath();
  g.moveTo(w * 0.04, topY);
  g.lineTo(w * 0.96, topY);
  var steps = 7;
  for (var i = 1; i <= steps; i++) {
    var t = i / steps;
    var xx = w * (0.96 - 0.42 * t);
    var yy = topY + (h - topY) * t * (0.7 + Util.hash(seed + i) * 0.5);
    g.lineTo(Math.max(w * 0.5, xx), Math.min(h, yy));
  }
  for (var j = steps; j >= 1; j--) {
    var t2 = j / steps;
    var x2 = w * (0.04 + 0.4 * t2);
    var y2 = topY + (h - topY) * t2 * (0.62 + Util.hash(seed + j * 2.3) * 0.5);
    g.lineTo(Math.min(w * 0.5, x2), Math.min(h, y2));
  }
  g.closePath();
  var grd = g.createLinearGradient(0, topY, 0, h);
  grd.addColorStop(0, 'rgba(36,74,94,0.85)');
  grd.addColorStop(1, 'rgba(18,44,60,0.05)');
  g.fillStyle = grd;
  g.fill();
  // hazy grass cap
  g.beginPath();
  g.ellipse(w * 0.5, topY, w * 0.47, h * 0.1, 0, 0, TAU);
  var cg = g.createLinearGradient(0, topY - h * 0.1, 0, topY + h * 0.1);
  cg.addColorStop(0, 'rgba(96,148,132,0.6)');
  cg.addColorStop(1, 'rgba(44,86,86,0.35)');
  g.fillStyle = cg;
  g.fill();
  return c;
}

function makeSeaSprite(w, h) {
  var c = makeCanvas(w, h);
  var g = c.getContext('2d');
  for (var pass = 0; pass < 3; pass++) {
    var baseY = h * (0.5 + pass * 0.16);
    var amp = h * (0.16 - pass * 0.03);
    g.beginPath();
    g.moveTo(0, h);
    for (var x = 0; x <= w; x += 14) {
      var y = baseY + Math.sin(x * 0.0075 + pass * 2.1) * amp + Math.sin(x * 0.021 + pass) * amp * 0.4;
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    var grd = g.createLinearGradient(0, baseY - amp, 0, h);
    var a = 0.26 + pass * 0.16;
    grd.addColorStop(0, 'rgba(255,246,232,' + (a + 0.16) + ')');
    grd.addColorStop(0.5, 'rgba(210,214,224,' + a + ')');
    grd.addColorStop(1, 'rgba(126,148,168,' + (a * 0.6) + ')');
    g.fillStyle = grd;
    g.fill();
  }
  return c;
}

function makeGlowSprite(size, rgb) {
  var c = makeCanvas(size, size);
  var g = c.getContext('2d');
  var r = size / 2;
  var grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(' + rgb + ',0.95)');
  grd.addColorStop(0.6, 'rgba(' + rgb + ',0.35)');
  grd.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(r, r, r, 0, TAU);
  g.fill();
  return c;
}

/* --------------------------------------------------------------------------
   Scene - drifting sky behind everything (menus included)
   -------------------------------------------------------------------------- */

var Scene = {
  w: 0, h: 0, t: 0,
  layers: [],
  sea: null,
  farIslands: [],
  birds: [],
  motes: [],
  airship: null,
  _built: 0,

  build: function (w, h) {
    this.w = w; this.h = h;
    this.layers = [];
    var self = this;

    var specs = [
      { key: 'background/clouds_far', n: 5, scale: 0.55, alpha: 0.42, speed: 7, yMin: 0.06, yMax: 0.38, warm: false },
      { key: 'background/clouds_mid', n: 4, scale: 0.95, alpha: 0.6, speed: 15, yMin: 0.16, yMax: 0.5, warm: false },
      { key: 'background/clouds_near', n: 3, scale: 1.6, alpha: 0.34, speed: 30, yMin: 0.42, yMax: 0.72, warm: true }
    ];

    specs.forEach(function (s, li) {
      var img = Assets.get(s.key);
      var items = [];
      for (var i = 0; i < s.n; i++) {
        var cw = w * (0.28 + Util.hash(li * 9 + i) * 0.2) * s.scale;
        var ch = cw * 0.42;
        items.push({
          sprite: img || makeCloudSprite(Math.max(80, cw), Math.max(34, ch), li * 31 + i * 7.3, s.warm),
          x: (i / s.n) * (w + 400) - 200 + Util.hash(li + i) * 120,
          y: h * Util.lerp(s.yMin, s.yMax, Util.hash(li * 3 + i * 1.7)),
          w: Math.max(80, cw),
          h: Math.max(34, ch),
          alpha: s.alpha * (0.75 + Util.hash(li + i * 2) * 0.45),
          speed: s.speed * (0.8 + Util.hash(li * 5 + i) * 0.5),
          bobPhase: Util.hash(i + li * 11) * TAU,
          bobAmt: 3 + Util.hash(i * 3 + li) * 7
        });
      }
      self.layers.push(items);
    });

    this.sea = Assets.get('background/cloud_sea') || makeSeaSprite(Math.max(320, w), Math.max(90, h * 0.3));
    this.seaW = Math.max(320, w);
    this.seaH = Math.max(90, h * 0.3);
    this.seaX = 0;

    this.farIslands = [];
    var horizonImg = Assets.get('background/horizon');
    for (var k = 0; k < 3; k++) {
      var iw = w * (0.18 + Util.hash(k * 4.1) * 0.14);
      this.farIslands.push({
        sprite: horizonImg || makeIslandSilhouette(Math.max(90, iw), Math.max(60, iw * 0.6), k * 17.7),
        x: w * (0.1 + k * 0.36) + Util.hash(k) * 60,
        y: h * (0.5 + Util.hash(k * 2.2) * 0.16),
        w: Math.max(90, iw),
        h: Math.max(60, iw * 0.6),
        speed: 2.4 + k * 1.1,
        alpha: 0.5 - k * 0.1,
        bobPhase: Util.hash(k * 5) * TAU
      });
    }

    this.birds = [];
    for (var b = 0; b < 6; b++) {
      this.birds.push({
        x: Util.rand(0, w), y: h * Util.rand(0.12, 0.46),
        s: Util.rand(0.6, 1.3), sp: Util.rand(18, 42),
        ph: Util.rand(0, TAU), amp: Util.rand(4, 14)
      });
    }

    this.motes = [];
    var count = Math.round(Util.clamp(w * h / 26000, 22, 64));
    for (var m = 0; m < count; m++) {
      this.motes.push({
        x: Util.rand(0, w), y: Util.rand(0, h),
        r: Util.rand(0.7, 2.4), sp: Util.rand(4, 16),
        ph: Util.rand(0, TAU), amp: Util.rand(6, 26),
        a: Util.rand(0.18, 0.6),
        warm: Math.random() < 0.55
      });
    }

    // Distant traffic high in the sky, drawn between cloud layers.
    this.airship = { x: w * 0.7, y: h * 0.1, sp: 11, bobPhase: 0, w: Math.max(92, w * 0.105) };
    this.moteSprite = makeGlowSprite(24, '255,226,168');
    this.moteSpriteCool = makeGlowSprite(24, '150,214,248');
    this._built = w * 100000 + h;
  },

  resize: function (w, h) {
    if (this._built === w * 100000 + h) return;
    this.build(w, h);
  },

  update: function (dt) {
    this.t += dt;
    var w = this.w;
    for (var li = 0; li < this.layers.length; li++) {
      var items = this.layers[li];
      for (var i = 0; i < items.length; i++) {
        var c = items[i];
        c.x -= c.speed * dt;
        if (c.x + c.w < -60) c.x = w + Util.rand(20, 220);
      }
    }
    this.seaX = (this.seaX - 9 * dt) % this.seaW;
    for (var k = 0; k < this.farIslands.length; k++) {
      var fi = this.farIslands[k];
      fi.x -= fi.speed * dt;
      if (fi.x + fi.w < -40) fi.x = w + Util.rand(40, 260);
    }
    for (var b = 0; b < this.birds.length; b++) {
      var bd = this.birds[b];
      bd.x -= bd.sp * dt;
      bd.ph += dt * 5.5;
      if (bd.x < -30) { bd.x = w + 30; bd.y = this.h * Util.rand(0.12, 0.46); }
    }
    for (var m = 0; m < this.motes.length; m++) {
      var mo = this.motes[m];
      mo.y -= mo.sp * dt * 0.35;
      mo.x += Math.sin(this.t * 0.4 + mo.ph) * dt * 9;
      mo.ph += dt * 0.6;
      if (mo.y < -12) { mo.y = this.h + 12; mo.x = Util.rand(0, w); }
      if (mo.x < -12) mo.x = w + 12;
      if (mo.x > w + 12) mo.x = -12;
    }
    if (this.airship) {
      this.airship.x -= this.airship.sp * dt;
      this.airship.bobPhase += dt * 0.8;
      if (this.airship.x + this.airship.w < -60) {
        this.airship.x = this.w + Util.rand(120, 500);
        this.airship.y = this.h * Util.rand(0.06, 0.15);
      }
    }
  },

  /* ---- painting ---- */

  drawSky: function (ctx, w, h) {
    var img = Assets.get('background/sky');
    if (img) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.00, '#04101a');
      g.addColorStop(0.22, '#0b2334');
      g.addColorStop(0.48, '#15455c');
      g.addColorStop(0.68, '#2c6f7d');
      g.addColorStop(0.82, '#7d8a7c');
      g.addColorStop(0.92, '#c98a52');
      g.addColorStop(1.00, '#e0a765');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // low sun bloom
    var sx = w * 0.78, sy = h * 0.82;
    var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.44);
    sg.addColorStop(0, 'rgba(255,214,150,0.34)');
    sg.addColorStop(0.35, 'rgba(255,170,96,0.11)');
    sg.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
  },

  drawAirship: function (ctx, w, h) {
    var a = this.airship;
    if (!a) return;
    var y = a.y + Math.sin(a.bobPhase) * 7;
    var img = Assets.get('characters/airship');
    ctx.save();
    ctx.globalAlpha = 0.56;
    if (img) {
      ctx.drawImage(img, a.x, y - a.w * 0.3, a.w, a.w * 0.6);
    } else {
      var bw = a.w, bh = bw * 0.36;
      // envelope
      ctx.beginPath();
      ctx.ellipse(a.x + bw * 0.5, y, bw * 0.5, bh * 0.5, 0, 0, TAU);
      var g = ctx.createLinearGradient(a.x, y - bh * 0.5, a.x + bw, y + bh * 0.5);
      g.addColorStop(0, 'rgba(246,238,218,0.97)');
      g.addColorStop(0.55, 'rgba(198,178,148,0.92)');
      g.addColorStop(1, 'rgba(108,94,76,0.9)');
      ctx.fillStyle = g;
      ctx.fill();
      // tail fin
      ctx.beginPath();
      ctx.moveTo(a.x + bw * 0.96, y - bh * 0.06);
      ctx.lineTo(a.x + bw * 1.16, y - bh * 0.5);
      ctx.lineTo(a.x + bw * 1.12, y + bh * 0.26);
      ctx.closePath();
      ctx.fillStyle = 'rgba(190,104,92,0.9)';
      ctx.fill();
      // gondola
      Util.roundRect(ctx, a.x + bw * 0.36, y + bh * 0.42, bw * 0.28, bh * 0.24, bh * 0.1);
      ctx.fillStyle = 'rgba(88,62,36,0.95)';
      ctx.fill();
      // seams
      ctx.strokeStyle = 'rgba(120,96,64,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(a.x + bw * 0.5, y, bw * 0.18, bh * 0.49, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(a.x + bw * 0.5, y, bw * 0.36, bh * 0.5, 0, 0, TAU);
      ctx.stroke();
      // rim light along the top of the envelope
      ctx.strokeStyle = 'rgba(255,244,222,0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(a.x + bw * 0.5, y, bw * 0.48, bh * 0.46, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawBirds: function (ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(22,40,54,0.62)';
    ctx.lineCap = 'round';
    for (var i = 0; i < this.birds.length; i++) {
      var b = this.birds[i];
      var flap = Math.sin(b.ph) * 0.5 + 0.5;
      var s = 7 * b.s;
      var yy = b.y + Math.sin(b.ph * 0.22) * b.amp;
      ctx.lineWidth = 1.8 * b.s;
      // two curved wings meeting at the body
      ctx.beginPath();
      ctx.moveTo(b.x - s, yy + s * flap * 0.75);
      ctx.quadraticCurveTo(b.x - s * 0.45, yy - s * 0.45, b.x, yy - s * 0.1);
      ctx.quadraticCurveTo(b.x + s * 0.45, yy - s * 0.45, b.x + s, yy + s * flap * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawMotes: function (ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      var sp = m.warm ? this.moteSprite : this.moteSpriteCool;
      var r = m.r * 5;
      ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(this.t * 1.6 + m.ph));
      ctx.drawImage(sp, m.x - r, m.y - r, r * 2, r * 2);
    }
    ctx.restore();
  },

  draw: function (ctx, w, h) {
    this.drawSky(ctx, w, h);

    // far silhouettes
    ctx.save();
    for (var k = 0; k < this.farIslands.length; k++) {
      var fi = this.farIslands[k];
      ctx.globalAlpha = fi.alpha;
      ctx.drawImage(fi.sprite, fi.x, fi.y + Math.sin(this.t * 0.3 + fi.bobPhase) * 4, fi.w, fi.h);
    }
    ctx.restore();

    // cloud layers, with the distant airship tucked between them so the
    // nearer clouds drift in front of it
    this.drawCloudLayer(ctx, 0);
    this.drawAirship(ctx, w, h);
    this.drawCloudLayer(ctx, 1);

    // cloud sea along the bottom
    if (this.sea) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      var y = h - this.seaH * 0.72;
      for (var x = this.seaX - this.seaW; x < w + this.seaW; x += this.seaW) {
        ctx.drawImage(this.sea, x, y, this.seaW, this.seaH);
      }
      ctx.restore();
    }

    this.drawCloudLayer(ctx, 2);
    this.drawBirds(ctx);
    this.drawMotes(ctx);
  },

  drawCloudLayer: function (ctx, li) {
    var items = this.layers[li];
    if (!items) return;
    ctx.save();
    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(c.sprite, c.x, c.y + Math.sin(this.t * 0.5 + c.bobPhase) * c.bobAmt, c.w, c.h);
    }
    ctx.restore();
  }
};

/* --------------------------------------------------------------------------
   FX - particle bursts for feedback juice
   -------------------------------------------------------------------------- */

var FX = {
  list: [],
  _sprites: {},

  sprite: function (rgb) {
    if (!this._sprites[rgb]) this._sprites[rgb] = makeGlowSprite(48, rgb);
    return this._sprites[rgb];
  },

  clear: function () { this.list.length = 0; },

  spark: function (x, y, rgb, opt) {
    opt = opt || {};
    var n = opt.count || 14;
    for (var i = 0; i < n; i++) {
      var a = opt.angle === undefined ? Util.rand(0, TAU) : opt.angle + Util.rand(-opt.spread || -0.6, opt.spread || 0.6);
      var sp = Util.rand(opt.speedMin || 45, opt.speedMax || 190);
      this.list.push({
        t: 'spark', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: opt.gravity === undefined ? 130 : opt.gravity,
        life: 0, max: Util.rand(opt.lifeMin || 0.45, opt.lifeMax || 1.0),
        r: Util.rand(opt.rMin || 2, opt.rMax || 5.5),
        rgb: rgb, drag: opt.drag === undefined ? 1.6 : opt.drag
      });
    }
  },

  ring: function (x, y, rgb, opt) {
    opt = opt || {};
    this.list.push({
      t: 'ring', x: x, y: y, life: 0,
      max: opt.max || 0.7,
      r0: opt.r0 || 6, r1: opt.r1 || 90,
      lw: opt.lw || 4, rgb: rgb
    });
  },

  chip: function (x, y, rgb, opt) {
    opt = opt || {};
    var n = opt.count || 18;
    for (var i = 0; i < n; i++) {
      var a = Util.rand(-Math.PI * 0.85, -Math.PI * 0.15);
      var sp = Util.rand(120, 330);
      this.list.push({
        t: 'chip', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 520, rot: Util.rand(0, TAU), vr: Util.rand(-9, 9),
        life: 0, max: Util.rand(0.9, 1.7),
        w: Util.rand(3, 7), h: Util.rand(6, 13),
        rgb: Array.isArray(rgb) ? rgb[Util.randInt(0, rgb.length - 1)] : rgb
      });
    }
  },

  trail: function (x, y, rgb) {
    this.list.push({
      t: 'spark', x: x, y: y,
      vx: Util.rand(-14, 14), vy: Util.rand(-24, -4),
      g: -12, life: 0, max: Util.rand(0.35, 0.7),
      r: Util.rand(1.4, 3.2), rgb: rgb, drag: 1.2
    });
  },

  update: function (dt) {
    var l = this.list;
    for (var i = l.length - 1; i >= 0; i--) {
      var p = l[i];
      p.life += dt;
      if (p.life >= p.max) { l.splice(i, 1); continue; }
      if (p.t === 'spark' || p.t === 'chip') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.g * dt;
        if (p.drag) { var f = 1 - p.drag * dt; if (f < 0) f = 0; p.vx *= f; p.vy *= f; }
        if (p.t === 'chip') p.rot += p.vr * dt;
      }
    }
  },

  draw: function (ctx) {
    if (!this.list.length) return;
    ctx.save();
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var k = 1 - p.life / p.max;
      if (p.t === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, k * 1.3);
        var r = p.r * (0.6 + k * 0.9) * 3.2;
        ctx.drawImage(this.sprite(p.rgb), p.x - r, p.y - r, r * 2, r * 2);
      } else if (p.t === 'ring') {
        ctx.globalCompositeOperation = 'lighter';
        var e = 1 - Math.pow(k, 2.2);
        var rr = Util.lerp(p.r0, p.r1, e);
        ctx.globalAlpha = k * 0.85;
        ctx.strokeStyle = 'rgba(' + p.rgb + ',1)';
        ctx.lineWidth = p.lw * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, TAU);
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        var grd = ctx.createLinearGradient(-p.w, -p.h, p.w, p.h);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(1, 'rgba(' + p.rgb + ',1)');
        ctx.fillStyle = grd;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
    ctx.restore();
  }
};
