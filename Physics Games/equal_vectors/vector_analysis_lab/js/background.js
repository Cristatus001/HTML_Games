/* ==========================================================================
   background.js — ambient deck motion behind everything.

   Purely decorative: three parallax dust layers, drifting vector glyphs, a
   slow radar sweep and a scrolling horizon grid. It owns its own canvas and
   never touches gameplay state or hitboxes.
   ========================================================================== */
var BG = (function () {
  'use strict';

  var cvs, ctx, W = 0, H = 0, dpr = 1;
  var motes = [], glyphs = [], t0 = 0, running = false, raf = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    if (!cvs) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cvs.width = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    var area = W * H;
    var n = Math.max(46, Math.min(150, Math.round(area / 12000)));
    motes = [];
    for (var i = 0; i < n; i++) {
      var depth = Math.random();
      motes.push({
        x: rand(0, W), y: rand(0, H),
        r: rand(0.6, 2.6) * (0.5 + depth),
        vx: rand(-6, 6) * (0.25 + depth),
        vy: rand(-16, -4) * (0.25 + depth),
        a: rand(0.12, 0.6) * (0.35 + depth * 0.8),
        hue: Math.random() < 0.22 ? 'a' : 'c',
        ph: rand(0, 6.28), depth: depth
      });
    }
    var gn = Math.max(5, Math.min(14, Math.round(area / 130000)));
    glyphs = [];
    for (var j = 0; j < gn; j++) {
      glyphs.push({
        x: rand(-60, W + 60), y: rand(-40, H + 40),
        s: rand(0.5, 1.35),
        rot: rand(0, 6.28), vr: rand(-0.06, 0.06),
        vx: rand(-9, 9), vy: rand(-7, 7),
        a: rand(0.05, 0.15),
        amber: Math.random() < 0.4
      });
    }
  }

  /* one drifting vector glyph: a small arrow (or the optional drift sprite) */
  function drawGlyph(g) {
    var img = Assets.get('bg/drift');
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    ctx.globalAlpha = g.a;
    if (img) {
      var w = 68 * g.s, h = w * (img.naturalHeight / img.naturalWidth || 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      var L = 46 * g.s, hd = 11 * g.s;
      var col = g.amber ? '#ffa726' : '#22d3ee';
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 4 * g.s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2 - hd, 0); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L / 2, 0);
      ctx.lineTo(L / 2 - hd * 1.5, -hd);
      ctx.lineTo(L / 2 - hd * 1.5, hd);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = g.a * 0.7;
      ctx.beginPath(); ctx.arc(-L / 2, 0, 3.4 * g.s, 0, 6.2832); ctx.stroke();
    }
    ctx.restore();
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    if (!t0) t0 = ts;
    var t = (ts - t0) / 1000;
    var dt = Math.min(0.05, (ts - (frame.last || ts)) / 1000);
    frame.last = ts;

    ctx.clearRect(0, 0, W, H);

    /* --- scrolling horizon grid (far layer) --- */
    var gridImg = Assets.get('bg/grid');
    if (gridImg) {
      var gs = 220, off = (t * 9) % gs;
      ctx.globalAlpha = 0.16;
      for (var gx = -gs; gx < W + gs; gx += gs) {
        for (var gy = -gs; gy < H + gs; gy += gs) {
          ctx.drawImage(gridImg, gx + off * 0.4, gy + off, gs, gs);
        }
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(34,211,238,0.055)';
      ctx.lineWidth = 1;
      var step = 96, sh = (t * 11) % step;
      for (var y = -step; y < H + step; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y + sh); ctx.lineTo(W, y + sh); ctx.stroke();
      }
      var sv = (t * 5) % step;
      for (var x = -step; x < W + step; x += step) {
        ctx.beginPath(); ctx.moveTo(x + sv, 0); ctx.lineTo(x + sv, H); ctx.stroke();
      }
      ctx.restore();
    }

    /* --- radar sweep: a fan of thin wedges, so no hard edge is visible --- */
    var scx = W * 0.5, scy = H * 0.52, R = Math.hypot(W, H) * 0.62;
    var a0 = (t * 0.22) % 6.2832;
    var SPREAD = 0.95, N = 18;
    ctx.save();
    for (var w = 0; w < N; w++) {
      var k = w / N;
      var alpha = 0.026 * Math.pow(1 - k, 2.4);
      if (alpha < 0.0006) continue;
      var grad = ctx.createRadialGradient(scx, scy, 0, scx, scy, R);
      grad.addColorStop(0, 'rgba(34,211,238,' + (alpha * 1.9).toFixed(4) + ')');
      grad.addColorStop(0.5, 'rgba(34,211,238,' + alpha.toFixed(4) + ')');
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.beginPath();
      ctx.moveTo(scx, scy);
      ctx.arc(scx, scy, R, a0 - SPREAD * (k + 1.4 / N), a0 - SPREAD * k);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();

    /* --- drifting vector glyphs (mid layer) --- */
    for (var i = 0; i < glyphs.length; i++) {
      var g = glyphs[i];
      g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
      if (g.x < -90) g.x = W + 90; else if (g.x > W + 90) g.x = -90;
      if (g.y < -70) g.y = H + 70; else if (g.y > H + 70) g.y = -70;
      drawGlyph(g);
    }

    /* --- dust motes (near layer) --- */
    for (var m = 0; m < motes.length; m++) {
      var p = motes[m];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < -12) { p.y = H + 12; p.x = rand(0, W); }
      if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
      var tw = 0.55 + 0.45 * Math.sin(t * 1.6 + p.ph);
      var col = p.hue === 'a' ? '255,190,110' : '150,235,255';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + col + ',' + (p.a * tw).toFixed(3) + ')';
      ctx.fill();
      if (p.r > 1.8) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + col + ',' + (p.a * tw * 0.10).toFixed(3) + ')';
        ctx.fill();
      }
    }
  }

  function init() {
    cvs = document.getElementById('bg');
    if (!cvs) return;
    ctx = cvs.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      frame.last = 0;
    });
    running = true;
    raf = requestAnimationFrame(frame);
  }

  return { init: init, resize: resize };
})();
