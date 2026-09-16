/* Ambient nacre drift: pearl motes, iridescent bubbles and slow shell flecks.
   Purely decorative — never hit-tested, never touches gameplay state. */
(function (global) {
  'use strict';

  var canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0;
  var DPR = Math.min(global.devicePixelRatio || 1, 2);
  var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var motes = [];
  var bubbles = [];
  var flecks = [];
  var bursts = [];
  var running = true;

  /* iridescent palette, as rgb triples */
  var IRIS = [
    '127,230,216',  // cyan
    '185,140,240',  // violet
    '255,122,156',  // pink
    '245,197,101',  // gold
    '253,246,238'   // pearl
  ];
  var HUES = { pearl: '253,246,238', gold: '245,197,101', cyan: '127,230,216', violet: '185,140,240' };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function resize() {
    W = global.innerWidth; H = global.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    var area = W * H;

    var moteCount = Math.max(20, Math.min(64, Math.round(area / 24000)));
    if (reduced) moteCount = Math.round(moteCount / 2);
    motes = [];
    for (var i = 0; i < moteCount; i++) {
      motes.push({
        x: rand(0, W), y: rand(0, H),
        r: rand(0.9, 2.7),
        vy: rand(-13, -4),
        drift: rand(-9, 9),
        color: pick(IRIS),
        phase: rand(0, Math.PI * 2),
        rate: rand(1.1, 2.9)
      });
    }

    var bubbleCount = Math.max(5, Math.min(14, Math.round(W / 150)));
    if (reduced) bubbleCount = 4;
    bubbles = [];
    for (var j = 0; j < bubbleCount; j++) {
      bubbles.push({
        x: rand(0, W), y: rand(H * 0.15, H * 1.15),
        r: rand(5, 16),
        vy: rand(-26, -11),
        phase: rand(0, Math.PI * 2)
      });
    }

    var fleckCount = Math.max(3, Math.min(9, Math.round(W / 260)));
    if (reduced) fleckCount = 2;
    flecks = [];
    for (var k = 0; k < fleckCount; k++) {
      flecks.push({
        x: rand(0, W), y: rand(0, H),
        s: rand(26, 70),
        vy: rand(-6, -2),
        vx: rand(-4, 4),
        rot: rand(0, Math.PI * 2),
        spin: rand(-0.12, 0.12),
        color: pick(IRIS)
      });
    }
  }

  /* a soft nacre sliver — a curved shell chip catching the light */
  function drawFleck(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    var g = ctx.createLinearGradient(-f.s, -f.s * 0.4, f.s, f.s * 0.4);
    g.addColorStop(0, 'rgba(' + f.color + ',0)');
    g.addColorStop(0.5, 'rgba(' + f.color + ',0.16)');
    g.addColorStop(1, 'rgba(' + f.color + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, f.s, f.s * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  var lastT = null;
  function tick(t) {
    if (!running) { lastT = null; requestAnimationFrame(tick); return; }
    if (lastT === null) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    ctx.clearRect(0, 0, W, H);

    /* nacre flecks, furthest back */
    for (var k = 0; k < flecks.length; k++) {
      var f = flecks[k];
      f.y += f.vy * dt; f.x += f.vx * dt; f.rot += f.spin * dt;
      if (f.y < -f.s) { f.y = H + f.s; f.x = rand(0, W); }
      if (f.x < -f.s) f.x = W + f.s;
      if (f.x > W + f.s) f.x = -f.s;
      drawFleck(f);
    }

    /* bubbles with an iridescent rim */
    for (var b = 0; b < bubbles.length; b++) {
      var bu = bubbles[b];
      bu.y += bu.vy * dt;
      bu.x += Math.sin(t / 1100 + bu.phase) * 0.22;
      if (bu.y < -bu.r * 2) { bu.y = H + bu.r; bu.x = rand(0, W); }
      var rim = ctx.createLinearGradient(bu.x - bu.r, bu.y - bu.r, bu.x + bu.r, bu.y + bu.r);
      rim.addColorStop(0, 'rgba(127,230,216,0.42)');
      rim.addColorStop(0.5, 'rgba(255,122,156,0.28)');
      rim.addColorStop(1, 'rgba(245,197,101,0.4)');
      ctx.beginPath();
      ctx.arc(bu.x, bu.y, bu.r, 0, Math.PI * 2);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bu.x - bu.r * 0.32, bu.y - bu.r * 0.34, bu.r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    /* celebration bursts */
    for (var bi = bursts.length - 1; bi >= 0; bi--) {
      var burst = bursts[bi];
      burst.life -= dt;
      if (burst.life <= 0) { bursts.splice(bi, 1); continue; }
      var alpha = Math.max(0, burst.life / burst.maxLife);
      for (var si = 0; si < burst.sparks.length; si++) {
        var sp = burst.sparks[si];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 190 * dt;          // gravity, so they fall like spilled pearls
        sp.vx *= (1 - 0.6 * dt);
        var rr = sp.r * (0.5 + 0.5 * alpha);
        var gg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rr * 3.2);
        gg.addColorStop(0, 'rgba(' + sp.color + ',' + (0.85 * alpha) + ')');
        gg.addColorStop(1, 'rgba(' + sp.color + ',0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, rr * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * alpha) + ')';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, rr, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* pearl motes drifting up, twinkling through the nacre hues */
    for (var i = 0; i < motes.length; i++) {
      var p = motes[i];
      p.y += p.vy * dt;
      p.x += Math.sin(t / 1000 + p.phase) * (p.drift * dt);
      if (p.y < -6) { p.y = H + 6; p.x = rand(0, W); }
      if (p.x < -6) p.x = W + 6;
      if (p.x > W + 6) p.x = -6;
      var tw = 0.45 + 0.55 * Math.sin(t / (330 * p.rate) + p.phase);
      var glowR = p.r * 4.6;
      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      grad.addColorStop(0, 'rgba(' + p.color + ',' + (0.5 * tw + 0.12) + ')');
      grad.addColorStop(1, 'rgba(' + p.color + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,253,250,' + (0.75 * tw + 0.2) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  global.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
  });

  resize();
  requestAnimationFrame(tick);

  global.MolluscParticles = {
    /* xNorm / yNorm are 0..1 fractions of the viewport */
    burst: function (xNorm, yNorm, hue) {
      var cx = xNorm * W, cy = yNorm * H;
      var color = HUES[hue] || HUES.pearl;
      var n = reduced ? 9 : 22;
      var sparks = [];
      for (var i = 0; i < n; i++) {
        var ang = rand(-Math.PI, 0) + rand(-0.5, 0.5);  // biased upward
        var spd = rand(70, 210);
        sparks.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: rand(1.6, 3.6),
          color: color
        });
      }
      bursts.push({ sparks: sparks, life: 1.15, maxLife: 1.15 });
    }
  };
})(window);
