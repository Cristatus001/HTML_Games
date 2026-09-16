/* ==========================================================================
   background.js - ambient motion behind the specimen.

   Three parallax bands of out-of-focus biology drift across the plate:
   bokeh cells, tumbling vesicles and slow DNA helices, plus a travelling
   light sweep from the microscope lamp.  Purely decorative - it is drawn
   before the cell and never consulted by input or game logic.
   ========================================================================== */
var Backdrop = (function () {
  'use strict';

  var bokeh = [];
  var vesicles = [];
  var helices = [];
  var motes = [];

  var W = 0, H = 0;
  var enabled = true;
  var sweep = 0;

  /* Pointer parallax, eased toward the real pointer so it never snaps. */
  var px = 0, py = 0, tx = 0, ty = 0;

  var PALETTE = [
    'rgba(255, 95,168,',
    'rgba( 79,240,255,',
    'rgba(176,130,255,',
    'rgba(143,255, 79,',
    'rgba(255,201, 63,'
  ];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function build(w, h) {
    W = w; H = h;
    var area = w * h;
    var scale = Math.sqrt(area) / 900;

    bokeh = [];
    var nB = Math.round(11 * scale) + 5;
    for (var i = 0; i < nB; i++) {
      bokeh.push({
        x: rand(0, w), y: rand(0, h),
        r: rand(40, 150) * scale,
        vx: rand(-0.10, 0.10), vy: rand(-0.055, 0.055),
        col: pick(PALETTE),
        a: rand(0.05, 0.14),
        depth: rand(0.10, 0.30),
        ph: rand(0, 6.283), sp: rand(0.15, 0.45)
      });
    }

    vesicles = [];
    var nV = Math.round(22 * scale) + 12;
    for (var j = 0; j < nV; j++) {
      vesicles.push({
        x: rand(0, w), y: rand(0, h),
        r: rand(3, 11) * Math.max(0.7, scale),
        vx: rand(-0.28, 0.28), vy: rand(-0.34, -0.06),
        col: pick(PALETTE),
        a: rand(0.22, 0.58),
        depth: rand(0.35, 0.7),
        spin: rand(-0.012, 0.012), rot: rand(0, 6.283)
      });
    }

    helices = [];
    var nH = Math.round(3 * scale) + 2;
    for (var k = 0; k < nH; k++) {
      helices.push({
        x: rand(0, w), y: rand(0, h),
        len: rand(90, 210) * scale,
        rot: rand(0, 6.283),
        spin: rand(-0.0035, 0.0035),
        vx: rand(-0.13, 0.13), vy: rand(-0.09, 0.09),
        ph: rand(0, 6.283),
        a: rand(0.10, 0.22),
        depth: rand(0.18, 0.42)
      });
    }

    /* Fine dust close to the lens - the fastest parallax band. */
    motes = [];
    var nM = Math.round(46 * scale) + 24;
    for (var m = 0; m < nM; m++) {
      motes.push({
        x: rand(0, w), y: rand(0, h),
        r: rand(0.7, 2.1),
        vx: rand(-0.5, 0.5), vy: rand(-0.62, -0.10),
        a: rand(0.15, 0.5),
        depth: rand(0.7, 1.0),
        ph: rand(0, 6.283), sp: rand(0.6, 2.0)
      });
    }
  }

  function setEnabled(on) { enabled = !!on; }

  function pointAt(x, y) {
    /* Normalised -1..1 offset from centre. */
    tx = (x / Math.max(1, W) - 0.5) * 2;
    ty = (y / Math.max(1, H) - 0.5) * 2;
  }

  function wrap(o, pad) {
    if (o.x < -pad)     { o.x = W + pad; }
    if (o.x > W + pad)  { o.x = -pad; }
    if (o.y < -pad)     { o.y = H + pad; }
    if (o.y > H + pad)  { o.y = -pad; }
  }

  function update(dt, t) {
    px += (tx - px) * 0.045;
    py += (ty - py) * 0.045;

    if (!enabled) { return; }

    sweep += dt * 0.055;
    if (sweep > 1.9) { sweep -= 2.4; }

    var k = dt * 60;
    var i;

    for (i = 0; i < bokeh.length; i++) {
      var b = bokeh[i];
      b.x += b.vx * k; b.y += b.vy * k;
      wrap(b, b.r * 1.3);
    }
    for (i = 0; i < vesicles.length; i++) {
      var v = vesicles[i];
      v.x += v.vx * k; v.y += v.vy * k; v.rot += v.spin * k;
      wrap(v, v.r * 3);
    }
    for (i = 0; i < helices.length; i++) {
      var h = helices[i];
      h.x += h.vx * k; h.y += h.vy * k; h.rot += h.spin * k; h.ph += 0.011 * k;
      wrap(h, h.len);
    }
    for (i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.x += m.vx * k; m.y += m.vy * k;
      wrap(m, 6);
    }
  }

  /* Parallax offset in pixels for a given depth band. */
  function ox(depth) { return -px * 26 * depth; }
  function oy(depth) { return -py * 20 * depth; }

  function draw(ctx, t) {
    /* The lamp sweep reads even with ambient motion off. */
    drawSweep(ctx);
    if (!enabled) { return; }

    var i;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    /* --- band 1: far, heavily defocused cells --------------------------- */
    for (i = 0; i < bokeh.length; i++) {
      var b = bokeh[i];
      var x = b.x + ox(b.depth);
      var y = b.y + oy(b.depth);
      var pulse = 0.82 + 0.18 * Math.sin(t * b.sp + b.ph);
      var r = b.r * pulse;

      if (Assets.drawFit(ctx, 'bg.bokeh', x, y, r * 2, r * 2, 0, b.a * 2.2)) { continue; }

      /* A defocused cell: soft ring, brighter rim than centre. */
      var g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0.00, b.col + (b.a * 0.5) + ')');
      g.addColorStop(0.62, b.col + (b.a * 0.35) + ')');
      g.addColorStop(0.86, b.col + (b.a * 1.0) + ')');
      g.addColorStop(1.00, b.col + '0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }

    /* --- band 2: drifting helices --------------------------------------- */
    for (i = 0; i < helices.length; i++) {
      var h = helices[i];
      drawHelix(ctx, h.x + ox(h.depth), h.y + oy(h.depth), h);
    }

    /* --- band 3: vesicles ----------------------------------------------- */
    for (i = 0; i < vesicles.length; i++) {
      var v = vesicles[i];
      var vx = v.x + ox(v.depth);
      var vy = v.y + oy(v.depth);

      if (Assets.drawFit(ctx, 'bg.vesicle', vx, vy, v.r * 3, v.r * 3, v.rot, v.a)) { continue; }

      /* Lit from within: bright core, saturated shell, soft bloom. */
      var vg = ctx.createRadialGradient(vx - v.r * 0.25, vy - v.r * 0.3, 0, vx, vy, v.r * 2.1);
      vg.addColorStop(0.00, 'rgba(255,255,255,' + (v.a * 0.85) + ')');
      vg.addColorStop(0.30, v.col + v.a + ')');
      vg.addColorStop(1.00, v.col + '0)');
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(vx, vy, v.r * 2.1, 0, 6.2832); ctx.fill();
    }

    /* --- band 4: near dust ---------------------------------------------- */
    for (i = 0; i < motes.length; i++) {
      var m = motes[i];
      var mx = m.x + ox(m.depth) * 1.6;
      var my = m.y + oy(m.depth) * 1.6;
      var tw = 0.45 + 0.55 * Math.abs(Math.sin(t * m.sp + m.ph));
      ctx.fillStyle = 'rgba(214,232,255,' + (m.a * tw) + ')';
      ctx.beginPath(); ctx.arc(mx, my, m.r, 0, 6.2832); ctx.fill();
    }

    ctx.restore();
  }

  function drawHelix(ctx, x, y, h) {
    if (Assets.drawFit(ctx, 'bg.helix', x, y, h.len, h.len, h.rot, h.a * 3)) { return; }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(h.rot);
    ctx.lineWidth = Math.max(1.2, h.len * 0.018);
    ctx.lineCap = 'round';

    var half = h.len / 2;
    var amp = h.len * 0.13;
    var turns = 2.4;
    var s;

    /* Two out-of-phase strands... */
    for (var strand = 0; strand < 2; strand++) {
      ctx.strokeStyle = strand === 0
        ? 'rgba(79,240,255,' + h.a + ')'
        : 'rgba(176,130,255,' + h.a + ')';
      ctx.beginPath();
      for (s = 0; s <= 40; s++) {
        var tt = s / 40;
        var yy = -half + h.len * tt;
        var xx = Math.sin(tt * Math.PI * 2 * turns + h.ph + strand * Math.PI) * amp;
        if (s === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
      }
      ctx.stroke();
    }

    /* ...joined by base-pair rungs. */
    ctx.strokeStyle = 'rgba(255,255,255,' + (h.a * 0.6) + ')';
    ctx.lineWidth = Math.max(0.8, h.len * 0.011);
    for (s = 0; s <= 9; s++) {
      var t2 = (s + 0.5) / 10;
      var y2 = -half + h.len * t2;
      var x2 = Math.sin(t2 * Math.PI * 2 * turns + h.ph) * amp;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(-x2, y2); ctx.stroke();
    }
    ctx.restore();
  }

  /* Broad diagonal light bar, as if the lamp were being re-aimed. */
  function drawSweep(ctx) {
    var pos = sweep;
    if (pos < -0.4 || pos > 1.4) { return; }

    var w = W * 0.5;
    var cx = -w + (W + w * 2) * pos;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, H);
    g.addColorStop(0.00, 'rgba(150,120,255,0)');
    g.addColorStop(0.50, 'rgba(168,142,255,0.055)');
    g.addColorStop(1.00, 'rgba(150,120,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  return {
    build: build,
    update: update,
    draw: draw,
    pointAt: pointAt,
    setEnabled: setEnabled
  };
}());
