/* =====================================================================
   DECISION CARDS - visual effects
   #bgfx : ambient drifting cytoplasm (organelles, sparks, helix motes)
   #fx   : foreground juice (decision bursts, shockwaves, drifting glyphs)
   Purely decorative - never touches gameplay state or hit testing.
   ===================================================================== */
(function (global) {
  "use strict";

  var doc = global.document;
  var TAU = Math.PI * 2;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------------------------------------------------------------
     shared canvas helper
     --------------------------------------------------------------- */
  function Surface(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1;
    this.w = 0;
    this.h = 0;
    this.resize();
  }
  Surface.prototype.resize = function () {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = this.c.clientWidth || global.innerWidth;
    var h = this.c.clientHeight || global.innerHeight;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.c.width = Math.max(1, Math.floor(w * dpr));
    this.c.height = Math.max(1, Math.floor(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /* ---------------------------------------------------------------
     AMBIENT LAYER
     --------------------------------------------------------------- */
  var PALETTE = [
    [56, 224, 255],
    [52, 211, 153],
    [192, 132, 252],
    [244, 114, 182],
    [251, 191, 36]
  ];

  function Ambient(surface) {
    this.s = surface;
    this.items = [];
    this.t = 0;
    this.seed();
  }

  Ambient.prototype.count = function () {
    var area = this.s.w * this.s.h;
    return Math.max(22, Math.min(78, Math.round(area / 15000)));
  };

  Ambient.prototype.seed = function () {
    this.items.length = 0;
    var n = this.count();
    for (var i = 0; i < n; i++) this.items.push(this.make(true));
  };

  Ambient.prototype.make = function (anywhere) {
    var depth = rand(0.25, 1);
    var kinds = ["vesicle", "vesicle", "organelle", "spark", "mote"];
    var kind = pick(kinds);
    var col = pick(PALETTE);
    var r = kind === "spark" ? rand(1.2, 2.6)
      : kind === "mote" ? rand(3, 7)
        : rand(9, 34) * depth;
    return {
      kind: kind,
      col: col,
      x: rand(-40, this.s.w + 40),
      y: anywhere ? rand(-40, this.s.h + 40) : this.s.h + rand(20, 120),
      r: r,
      depth: depth,
      vx: rand(-0.14, 0.14) * depth,
      vy: -rand(0.06, 0.42) * depth,
      spin: rand(-0.4, 0.4),
      a: rand(0, TAU),
      alpha: kind === "spark" ? rand(0.35, 0.9) : rand(0.1, 0.4),
      pulse: rand(0.4, 1.6),
      squash: rand(0.6, 1)
    };
  };

  Ambient.prototype.step = function (dt) {
    this.t += dt;
    var s = this.s;
    for (var i = 0; i < this.items.length; i++) {
      var p = this.items[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.a += p.spin * dt;
      if (p.y < -80 || p.x < -90 || p.x > s.w + 90) {
        this.items[i] = this.make(false);
      }
    }
  };

  Ambient.prototype.draw = function () {
    var ctx = this.s.ctx;
    ctx.clearRect(0, 0, this.s.w, this.s.h);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < this.items.length; i++) {
      var p = this.items[i];
      var c = p.col;
      var puls = 0.8 + 0.2 * Math.sin(this.t * p.pulse + p.a);
      var alpha = p.alpha * puls;

      if (p.kind === "spark") {
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 0.16) + ")";
        ctx.arc(p.x, p.y, p.r * 6, 0, TAU);
        ctx.fill();
        continue;
      }

      if (p.kind === "mote") {
        /* tiny helix mote: two arcs */
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, -1.2, 1.2);
        ctx.arc(0, p.r * 2, p.r, Math.PI - 1.2, Math.PI + 1.2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      /* vesicle / organelle: lit-from-within blob */
      var g = ctx.createRadialGradient(
        p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 0.1,
        p.x, p.y, p.r);
      g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 1.05) + ")");
      g.addColorStop(0.55, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 0.35) + ")");
      g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a * 0.4);
      ctx.scale(1, p.kind === "organelle" ? p.squash : 1);
      ctx.translate(-p.x, -p.y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      if (p.kind === "organelle") {
        ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 0.7) + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  /* ---------------------------------------------------------------
     FOREGROUND JUICE
     --------------------------------------------------------------- */
  function Juice(surface) {
    this.s = surface;
    this.parts = [];
    this.waves = [];
  }

  Juice.prototype.burst = function (x, y, opt) {
    opt = opt || {};
    var n = opt.count || 34;
    var col = opt.color || [56, 224, 255];
    var spd = opt.speed || 300;
    for (var i = 0; i < n; i++) {
      var ang = rand(0, TAU);
      var v = rand(spd * 0.25, spd);
      this.parts.push({
        x: x, y: y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        r: rand(1.6, opt.size || 4.6),
        life: 0,
        max: rand(0.45, opt.life || 1.05),
        col: col,
        grav: opt.gravity === undefined ? 210 : opt.gravity,
        drag: opt.drag === undefined ? 1.9 : opt.drag,
        ring: Math.random() < 0.22
      });
    }
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
  };

  Juice.prototype.shockwave = function (x, y, opt) {
    opt = opt || {};
    this.waves.push({
      x: x, y: y,
      r: opt.r0 || 10,
      max: opt.r1 || 220,
      life: 0,
      dur: opt.dur || 0.6,
      col: opt.color || [56, 224, 255],
      width: opt.width || 5
    });
  };

  Juice.prototype.step = function (dt) {
    var i, p;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) { this.parts.splice(i, 1); continue; }
      var damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (i = this.waves.length - 1; i >= 0; i--) {
      var w = this.waves[i];
      w.life += dt;
      if (w.life >= w.dur) this.waves.splice(i, 1);
    }
  };

  Juice.prototype.draw = function () {
    var ctx = this.s.ctx;
    ctx.clearRect(0, 0, this.s.w, this.s.h);
    if (!this.parts.length && !this.waves.length) return;
    ctx.globalCompositeOperation = "lighter";

    var i, w, t, c, alpha;
    for (i = 0; i < this.waves.length; i++) {
      w = this.waves[i];
      t = w.life / w.dur;
      c = w.col;
      alpha = (1 - t) * 0.8;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
      ctx.lineWidth = w.width * (1 - t) + 0.6;
      ctx.arc(w.x, w.y, w.r + (w.max - w.r) * (1 - Math.pow(1 - t, 2)), 0, TAU);
      ctx.stroke();
    }

    for (i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      t = p.life / p.max;
      alpha = (1 - t) * (1 - t);
      c = p.col;
      if (p.ring) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
        ctx.lineWidth = 1.4;
        ctx.arc(p.x, p.y, p.r * (1 + t * 2.4), 0, TAU);
        ctx.stroke();
      } else {
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
        g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")");
        g.addColorStop(0.35, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 0.4) + ")");
        g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  /* ---------------------------------------------------------------
     RUNNER
     --------------------------------------------------------------- */
  var bgSurf = null, fgSurf = null, ambient = null, juice = null;
  var enabled = true;
  var running = false;
  var last = 0;
  var raf = null;
  var resizeTimer = null;

  function frame(now) {
    raf = global.requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (enabled && ambient) {
      ambient.step(dt);
      ambient.draw();
    }
    if (juice) {
      juice.step(dt);
      juice.draw();
    }
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    raf = global.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) global.cancelAnimationFrame(raf);
    raf = null;
  }

  function onResize() {
    if (resizeTimer) global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      if (bgSurf) { bgSurf.resize(); if (ambient) ambient.seed(); }
      if (fgSurf) fgSurf.resize();
    }, 140);
  }

  var COLORS = {
    cyan: [56, 224, 255],
    green: [52, 211, 153],
    amber: [251, 191, 36],
    rose: [251, 113, 133],
    violet: [192, 132, 252],
    white: [230, 250, 255]
  };

  var API = {
    COLORS: COLORS,

    init: function () {
      var bg = doc.getElementById("bgfx");
      var fg = doc.getElementById("fx");
      if (bg) { bgSurf = new Surface(bg); ambient = new Ambient(bgSurf); }
      if (fg) { fgSurf = new Surface(fg); juice = new Juice(fgSurf); }
      global.addEventListener("resize", onResize);
      global.addEventListener("orientationchange", onResize);
      doc.addEventListener("visibilitychange", function () {
        if (doc.hidden) stop(); else start();
      });
      start();
    },

    setEnabled: function (on) {
      enabled = !!on;
      if (!enabled && bgSurf) bgSurf.ctx.clearRect(0, 0, bgSurf.w, bgSurf.h);
    },

    /* Burst centred on an element. */
    burstAt: function (el, opt) {
      if (!juice || !el) return;
      var r = el.getBoundingClientRect();
      juice.burst(r.left + r.width / 2, r.top + r.height / 2, opt);
    },
    shockAt: function (el, opt) {
      if (!juice || !el) return;
      var r = el.getBoundingClientRect();
      juice.shockwave(r.left + r.width / 2, r.top + r.height / 2, opt);
    },
    burst: function (x, y, opt) { if (juice) juice.burst(x, y, opt); },
    shockwave: function (x, y, opt) { if (juice) juice.shockwave(x, y, opt); },

    /* Confetti-like celebration across the top of the viewport. */
    celebrate: function (colors) {
      if (!juice || !fgSurf) return;
      var cols = colors || [COLORS.green, COLORS.cyan, COLORS.amber, COLORS.violet];
      for (var i = 0; i < 8; i++) {
        juice.burst(rand(0.1, 0.9) * fgSurf.w, rand(0.1, 0.5) * fgSurf.h, {
          count: 22,
          color: cols[i % cols.length],
          speed: 320,
          life: 1.5,
          gravity: 260
        });
      }
    },

    rain: function (color) {
      if (!juice || !fgSurf) return;
      for (var i = 0; i < 5; i++) {
        juice.burst(rand(0, 1) * fgSurf.w, rand(-0.1, 0.2) * fgSurf.h, {
          count: 16,
          color: color || COLORS.rose,
          speed: 130,
          life: 1.7,
          gravity: 420,
          drag: 0.5
        });
      }
    }
  };

  global.DC_FX = API;
})(window);
