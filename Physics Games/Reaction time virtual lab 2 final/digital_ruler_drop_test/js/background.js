/* ============================================================
   background.js — two independent canvas layers.

   Bg   : ambient parallax decoration behind everything (drifting
          neural motes, synapse links, falling tick marks). Purely
          decorative — it never reads or writes game state.
   Fx   : short-lived particles for catch / miss / false-start bursts,
          drawn over the apparatus. Also never affects hitboxes.

   Both share one requestAnimationFrame loop and stop when the tab is
   hidden or ambient motion is switched off.
   ============================================================ */
(function (global) {
  'use strict';

  var bg = null, bgCtx = null, fx = null, fxCtx = null;
  var dpr = 1;
  var W = 0, H = 0, FW = 0, FH = 0;
  var running = false;
  var motion = true;
  var rafId = null;
  var lastT = 0;

  var motes = [];
  var ticks = [];
  var parts = [];

  var COL = {
    cyan: '34,211,238',
    violet: '169,112,255',
    amber: '255,176,46',
    green: '47,227,160',
    red: '255,77,109',
    brass: '224,168,60',
    steel: '164,184,204'
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------------- sizing ---------------- */

  function sizeCanvas(cv, cx) {
    if (!cv) return [0, 0];
    var r = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }

  function resize() {
    if (bg && bgCtx) {
      var a = sizeCanvas(bg, bgCtx);
      W = a[0]; H = a[1];
      seed();
    }
    if (fx && fxCtx) {
      var b = sizeCanvas(fx, fxCtx);
      FW = b[0]; FH = b[1];
    }
  }

  /* ---------------- ambient content ---------------- */

  function seed() {
    var area = W * H;
    var n = Math.max(14, Math.min(52, Math.round(area / 26000)));
    motes = [];
    for (var i = 0; i < n; i++) {
      /* three parallax depths: far motes are dimmer, smaller, slower */
      var depth = Math.random();
      motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(1.1, 3.4) * (0.5 + depth * 0.9),
        vx: rand(-7, 7) * (0.25 + depth),
        vy: rand(-13, -3) * (0.25 + depth),
        a: rand(0.16, 0.6) * (0.35 + depth * 0.8),
        hue: Math.random() < 0.66 ? COL.cyan : COL.violet,
        ph: Math.random() * Math.PI * 2,
        pv: rand(0.4, 1.5),
        depth: depth
      });
    }

    /* drifting ruler tick marks — thematic confetti, very subtle */
    var m = Math.max(4, Math.min(14, Math.round(area / 110000)));
    ticks = [];
    for (var j = 0; j < m; j++) {
      ticks.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: rand(10, 26),
        vy: rand(9, 26),
        a: rand(0.05, 0.16),
        rot: rand(-0.3, 0.3),
        spin: rand(-0.25, 0.25)
      });
    }
  }

  /* ---------------- ambient draw ---------------- */

  function drawBg(dt) {
    bgCtx.clearRect(0, 0, W, H);

    /* synapse links between nearby motes */
    bgCtx.lineWidth = 1;
    for (var i = 0; i < motes.length; i++) {
      var a = motes[i];
      for (var j = i + 1; j < motes.length; j++) {
        var b = motes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > 20000) continue;
        var t = 1 - Math.sqrt(d2) / 141;
        bgCtx.strokeStyle = 'rgba(' + COL.cyan + ',' + (t * 0.1 * Math.min(a.a, b.a) * 3).toFixed(3) + ')';
        bgCtx.beginPath();
        bgCtx.moveTo(a.x, a.y);
        bgCtx.lineTo(b.x, b.y);
        bgCtx.stroke();
      }
    }

    /* motes themselves — lit from within via a radial gradient */
    for (var k = 0; k < motes.length; k++) {
      var p = motes[k];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ph += p.pv * dt;
      if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
      if (p.x < -12) p.x = W + 12;
      if (p.x > W + 12) p.x = -12;

      var pulse = 0.72 + 0.28 * Math.sin(p.ph);
      var r = p.r * pulse;
      var alpha = p.a * pulse;

      var g = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
      g.addColorStop(0, 'rgba(' + p.hue + ',' + (alpha * 0.95).toFixed(3) + ')');
      g.addColorStop(0.35, 'rgba(' + p.hue + ',' + (alpha * 0.35).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + p.hue + ',0)');
      bgCtx.fillStyle = g;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
      bgCtx.fill();

      bgCtx.fillStyle = 'rgba(230,250,255,' + (alpha * 0.8).toFixed(3) + ')';
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
      bgCtx.fill();
    }

    /* falling tick marks */
    for (var m = 0; m < ticks.length; m++) {
      var q = ticks[m];
      q.y += q.vy * dt;
      q.rot += q.spin * dt;
      if (q.y > H + 30) { q.y = -30; q.x = Math.random() * W; }
      bgCtx.save();
      bgCtx.translate(q.x, q.y);
      bgCtx.rotate(q.rot);
      bgCtx.strokeStyle = 'rgba(' + COL.brass + ',' + q.a.toFixed(3) + ')';
      bgCtx.lineWidth = 2;
      bgCtx.beginPath();
      bgCtx.moveTo(-q.len / 2, 0);
      bgCtx.lineTo(q.len / 2, 0);
      bgCtx.stroke();
      bgCtx.strokeStyle = 'rgba(' + COL.brass + ',' + (q.a * 0.6).toFixed(3) + ')';
      bgCtx.lineWidth = 1.5;
      bgCtx.beginPath();
      bgCtx.moveTo(-q.len / 2, -4); bgCtx.lineTo(-q.len / 2, 4);
      bgCtx.moveTo(0, -3); bgCtx.lineTo(0, 3);
      bgCtx.moveTo(q.len / 2, -4); bgCtx.lineTo(q.len / 2, 4);
      bgCtx.stroke();
      bgCtx.restore();
    }
  }

  /* ---------------- fx particles ---------------- */

  function drawFx(dt) {
    fxCtx.clearRect(0, 0, FW, FH);
    if (!parts.length) return;

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }

      p.vy += p.g * dt;
      p.vx *= (1 - p.drag * dt);
      p.vy *= (1 - p.drag * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;

      var t = p.life / p.life0;
      var alpha = t * p.a;

      if (p.kind === 'spark') {
        var r = p.r * (0.5 + t * 0.9);
        var g = fxCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        g.addColorStop(0, 'rgba(255,255,255,' + (alpha * 0.9).toFixed(3) + ')');
        g.addColorStop(0.3, 'rgba(' + p.col + ',' + (alpha * 0.8).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + p.col + ',0)');
        fxCtx.fillStyle = g;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        fxCtx.fill();
      } else if (p.kind === 'streak') {
        fxCtx.save();
        fxCtx.translate(p.x, p.y);
        fxCtx.rotate(Math.atan2(p.vy, p.vx));
        var len = Math.min(34, Math.hypot(p.vx, p.vy) * 0.055);
        var lg = fxCtx.createLinearGradient(-len, 0, len * 0.4, 0);
        lg.addColorStop(0, 'rgba(' + p.col + ',0)');
        lg.addColorStop(1, 'rgba(' + p.col + ',' + alpha.toFixed(3) + ')');
        fxCtx.strokeStyle = lg;
        fxCtx.lineWidth = p.r;
        fxCtx.lineCap = 'round';
        fxCtx.beginPath();
        fxCtx.moveTo(-len, 0);
        fxCtx.lineTo(len * 0.4, 0);
        fxCtx.stroke();
        fxCtx.restore();
      } else if (p.kind === 'ring') {
        var rr = p.r + (1 - t) * p.grow;
        fxCtx.strokeStyle = 'rgba(' + p.col + ',' + (alpha * 0.85).toFixed(3) + ')';
        fxCtx.lineWidth = 2 + t * 2.5;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        fxCtx.stroke();
      } else if (p.kind === 'chip') {
        fxCtx.save();
        fxCtx.translate(p.x, p.y);
        fxCtx.rotate(p.rot);
        fxCtx.fillStyle = 'rgba(' + p.col + ',' + alpha.toFixed(3) + ')';
        fxCtx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        fxCtx.restore();
      }
    }
  }

  /* ---------------- burst constructors ---------------- */

  function push(p) {
    /* hard cap so a rapid series of catches can't grow unbounded */
    if (parts.length > 320) parts.shift();
    p.life0 = p.life;
    p.a = p.a === undefined ? 1 : p.a;
    p.g = p.g === undefined ? 0 : p.g;
    p.drag = p.drag === undefined ? 0.6 : p.drag;
    p.rot = p.rot === undefined ? 0 : p.rot;
    p.spin = p.spin === undefined ? 0 : p.spin;
    parts.push(p);
  }

  /** Big celebratory burst at a catch. `quality` 0..1 scales the show. */
  function burstCatch(x, y, quality) {
    var q = Math.max(0, Math.min(1, quality === undefined ? 0.5 : quality));
    var n = Math.round(26 + q * 30);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = rand(90, 340) * (0.6 + q * 0.8);
      push({
        kind: Math.random() < 0.34 ? 'streak' : 'spark',
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(0, 60),
        r: rand(1.4, 3.6),
        g: 420,
        drag: rand(1.1, 2.2),
        life: rand(0.4, 0.95),
        col: Math.random() < 0.6 ? COL.green : (Math.random() < 0.5 ? COL.cyan : COL.amber)
      });
    }
    push({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, r: 8, grow: 120 + q * 90, life: 0.5, col: COL.green, drag: 0 });
    push({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, r: 4, grow: 70 + q * 60, life: 0.66, col: COL.cyan, drag: 0 });

    /* wood chips knocked off the rule on a very fast catch */
    if (q > 0.55) {
      for (var j = 0; j < 10; j++) {
        var aa = rand(-Math.PI, 0);
        push({
          kind: 'chip', x: x, y: y,
          vx: Math.cos(aa) * rand(60, 210),
          vy: Math.sin(aa) * rand(60, 200),
          r: rand(3, 7), g: 700, drag: 0.5,
          spin: rand(-14, 14), life: rand(0.5, 1.0),
          col: COL.brass
        });
      }
    }
  }

  /** The ruler slipped through — a dull downward spray. */
  function burstMiss(x, y) {
    for (var i = 0; i < 18; i++) {
      var a = rand(Math.PI * 0.1, Math.PI * 0.9);
      var sp = rand(70, 210);
      push({
        kind: Math.random() < 0.5 ? 'chip' : 'spark',
        x: x + rand(-16, 16), y: y,
        vx: Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1) * 0.5,
        vy: Math.abs(Math.sin(a) * sp),
        r: rand(2, 5.5), g: 760, drag: 0.7,
        spin: rand(-10, 10), life: rand(0.35, 0.8),
        col: Math.random() < 0.6 ? COL.red : COL.steel, a: 0.85
      });
    }
    push({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, r: 6, grow: 80, life: 0.42, col: COL.red, drag: 0 });
  }

  /** Moved too early — a jittery red warning puff. */
  function burstFalseStart(x, y) {
    for (var i = 0; i < 16; i++) {
      var a = Math.random() * Math.PI * 2;
      push({
        kind: 'spark',
        x: x, y: y,
        vx: Math.cos(a) * rand(50, 180),
        vy: Math.sin(a) * rand(50, 180),
        r: rand(1.6, 3.4), g: 120, drag: 2.4,
        life: rand(0.24, 0.5), col: COL.red, a: 0.9
      });
    }
    push({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, r: 10, grow: 90, life: 0.36, col: COL.red, drag: 0 });
  }

  /** A thin trail behind the falling rule — called from the drop loop. */
  function trail(x, y) {
    if (!motion) return;
    push({
      kind: 'spark', x: x + rand(-4, 4), y: y,
      vx: rand(-14, 14), vy: rand(-40, 10),
      r: rand(0.9, 2.0), g: 0, drag: 1.6,
      life: rand(0.18, 0.38), col: COL.amber, a: 0.5
    });
  }

  function clearFx() { parts.length = 0; if (fxCtx) fxCtx.clearRect(0, 0, FW, FH); }

  /* ---------------- loop ---------------- */

  function frame(t) {
    if (!running) return;
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
    lastT = t;

    if (motion && bgCtx) drawBg(dt);
    if (fxCtx) drawFx(dt);

    rafId = global.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastT = 0;
    rafId = global.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) global.cancelAnimationFrame(rafId);
    rafId = null;
  }

  function setMotion(on) {
    motion = !!on;
    document.body.classList.toggle('no-motion', !motion);
    if (!motion && bgCtx) bgCtx.clearRect(0, 0, W, H);
  }

  function init() {
    bg = document.getElementById('bg-canvas');
    fx = document.getElementById('fx-canvas');
    if (bg) bgCtx = bg.getContext('2d');
    if (fx) fxCtx = fx.getContext('2d');
    resize();
    /* a hidden document does not fire rAF; the visibility handler starts
       the loop when the page actually becomes visible */
    if (!document.hidden) start();

    var t = null;
    global.addEventListener('resize', function () {
      if (t) clearTimeout(t);
      t = setTimeout(resize, 140);
    });
    global.addEventListener('orientationchange', function () {
      setTimeout(resize, 260);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  global.Backdrop = {
    init: init,
    resize: resize,
    setMotion: setMotion,
    burstCatch: burstCatch,
    burstMiss: burstMiss,
    burstFalseStart: burstFalseStart,
    trail: trail,
    clearFx: clearFx
  };
})(window);
