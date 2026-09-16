/* ==========================================================================
   render.js - all canvas drawing plus the particle system.

   Every element tries its optional PNG first (via Assets.drawFit) and falls
   back to procedural vector art, so art can be dropped in per element
   without touching this file.
   ========================================================================== */

/* ------------------------------------------------------------------------- */
/* Chromosome colour ramps: a bright core, a saturated body and a deep edge  */
/* so each rod reads as a lit cylinder rather than a flat fill.              */
/* ------------------------------------------------------------------------- */
var TINTS = [
  { key: 'red',    core: '#ffd9d9', body: '#ff4d4d', deep: '#8e1414', glow: 'rgba(255,77,77,'   },
  { key: 'orange', core: '#ffe9c4', body: '#ff9f1a', deep: '#8c4d00', glow: 'rgba(255,159,26,'  },
  { key: 'green',  core: '#d6ffd2', body: '#2ecc71', deep: '#12622f', glow: 'rgba(46,204,113,'  },
  { key: 'blue',   core: '#cfe9ff', body: '#3498db', deep: '#0e4670', glow: 'rgba(52,152,219,'  }
];

/* ========================================================================== */
/*                              PARTICLE SYSTEM                               */
/* ========================================================================== */
var Fx = (function () {
  'use strict';

  var parts = [];
  var rings = [];
  var MAX = 420;

  function reset() { parts = []; rings = []; }

  function spawn(p) {
    if (parts.length >= MAX) { parts.shift(); }
    parts.push(p);
  }

  /* Radial spray of sparks. */
  function burst(x, y, colour, count, power) {
    var n = count || 14;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.2832;
      var s = (0.6 + Math.random() * 1.5) * (power || 1);
      spawn({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: 1.4 + Math.random() * 2.6,
        life: 1, decay: 0.014 + Math.random() * 0.020,
        col: colour, grav: 0.006, kind: 'spark'
      });
    }
  }

  /* Sparks thrown along one axis - used when chromatids tear apart. */
  function jet(x, y, dirX, dirY, colour, count) {
    var n = count || 10;
    for (var i = 0; i < n; i++) {
      var spread = (Math.random() - 0.5) * 0.9;
      var s = 1.0 + Math.random() * 2.2;
      spawn({
        x: x, y: y,
        vx: (dirX + spread) * s, vy: (dirY + spread * 0.5) * s,
        r: 1.2 + Math.random() * 2.2,
        life: 1, decay: 0.020 + Math.random() * 0.022,
        col: colour, grav: 0, kind: 'spark'
      });
    }
  }

  /* Slow rising motes - a "this is alive" ambience around the cell. */
  function drift(x, y, colour, count) {
    var n = count || 5;
    for (var i = 0; i < n; i++) {
      spawn({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 22,
        vx: (Math.random() - 0.5) * 0.28,
        vy: -0.16 - Math.random() * 0.3,
        r: 0.9 + Math.random() * 1.9,
        life: 1, decay: 0.006 + Math.random() * 0.009,
        col: colour, grav: -0.0016, kind: 'mote'
      });
    }
  }

  /* Expanding shockwave ring. */
  function ring(x, y, colour, r0, r1, width) {
    rings.push({
      x: x, y: y, r: r0 || 6, max: r1 || 70,
      w: width || 3, life: 1, decay: 0.035, col: colour
    });
  }

  function update(dt) {
    var k = Math.min(3, dt * 60);
    var i;

    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.vy += p.grav * k;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay * k;
      if (p.life <= 0) { parts.splice(i, 1); }
    }

    for (i = rings.length - 1; i >= 0; i--) {
      var g = rings[i];
      g.r += (g.max - g.r) * 0.16 * k;
      g.life -= g.decay * k;
      if (g.life <= 0) { rings.splice(i, 1); }
    }
  }

  function draw(ctx) {
    var i;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (i = 0; i < rings.length; i++) {
      var g = rings[i];
      ctx.strokeStyle = g.col + (g.life * 0.85) + ')';
      ctx.lineWidth = g.w * g.life;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, 6.2832);
      ctx.stroke();
    }

    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      var a = Math.max(0, Math.min(1, p.life));
      var r = p.r * (p.kind === 'spark' ? (0.4 + a * 0.6) : 1);

      if (Assets.drawFit(ctx, 'fx.spark', p.x, p.y, r * 6, r * 6, 0, a * 0.9)) { continue; }

      var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      grd.addColorStop(0.00, 'rgba(255,255,255,' + (a * 0.95) + ')');
      grd.addColorStop(0.35, p.col + (a * 0.8) + ')');
      grd.addColorStop(1.00, p.col + '0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  function count() { return parts.length + rings.length; }

  return {
    reset: reset, burst: burst, jet: jet, drift: drift, ring: ring,
    update: update, draw: draw, count: count
  };
}());

/* ========================================================================== */
/*                                 RENDERER                                   */
/* ========================================================================== */
var Render = (function () {
  'use strict';

  /* ------------------------------------------------------------ helpers -- */

  /* Run a path-building function twice: once as a blurred glow, once solid. */
  function glow(ctx, colour, blur, fn) {
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = blur;
    fn(ctx);
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    if (w < 2 * r) { r = w / 2; }
    if (h < 2 * r) { r = h / 2; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  /* ------------------------------------------------------- the cell body -- */

  /* Outline radius for the animal cleavage furrow at angle a.
     The furrow bites in from top and bottom, so the waist is where
     |cos a| is small.                                                     */
  function furrowRadius(R, a, p) {
    var flank = Math.abs(Math.cos(a));
    var bite = Math.pow(1 - flank, 2.1);
    return R * (1 - 0.97 * p * bite);
  }

  function furrowPath(ctx, cx, cy, R, p) {
    var stretch = 1 + 0.20 * p;
    ctx.beginPath();
    for (var i = 0; i <= 128; i++) {
      var a = (i / 128) * 6.2832;
      var r = furrowRadius(R, a, p);
      var x = cx + Math.cos(a) * r * stretch;
      var y = cy + Math.sin(a) * r;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.closePath();
  }

  /* Cytoplasm body: a lit sphere, not a flat disc. The rim falls off hard
     into deep rose so the luminous chromosomes read against it, and the
     interior carries mottling plus drifting organelles so it never looks
     like an empty fill.                                                   */
  function cellBody(ctx, cx, cy, R, pathFn, t) {
    if (Assets.drawFit(ctx, 'cell.cytoplasm', cx, cy, R * 2, R * 2, 0, 1)) { return; }

    ctx.save();
    pathFn(ctx);

    /* Base sphere shading: hotspot up-left, deep shadow at the rim. */
    var g = ctx.createRadialGradient(cx - R * 0.30, cy - R * 0.36, R * 0.02,
                                     cx, cy, R * 1.02);
    g.addColorStop(0.00, 'rgba(255,247,252,0.99)');
    g.addColorStop(0.16, 'rgba(255,216,236,0.98)');
    g.addColorStop(0.42, 'rgba(241,168,206,0.96)');
    g.addColorStop(0.68, 'rgba(206,116,168,0.95)');
    g.addColorStop(0.87, 'rgba(155,72,126,0.95)');
    g.addColorStop(1.00, 'rgba(104,42,87,0.96)');
    ctx.fillStyle = g;
    ctx.fill();

    /* Everything below stays inside the cell. */
    pathFn(ctx);
    ctx.clip();

    /* Mottled cytosol - broad, very soft blobs on deterministic orbits. */
    ctx.globalCompositeOperation = 'overlay';
    for (var i = 0; i < 9; i++) {
      var a = i * 2.399 + t * 0.05 * (i % 2 ? 1 : -1);
      var d = R * (0.20 + 0.52 * ((i * 0.37) % 1));
      var bx = cx + Math.cos(a) * d;
      var by = cy + Math.sin(a) * d * 0.92;
      var br = R * (0.16 + 0.16 * ((i * 0.61) % 1));
      var mg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      mg.addColorStop(0, 'rgba(255,236,248,0.16)');
      mg.addColorStop(1, 'rgba(255,236,248,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832); ctx.fill();
    }

    /* Resident organelles: small lit capsules drifting on slow paths. */
    ctx.globalCompositeOperation = 'source-over';
    for (var k = 0; k < 11; k++) {
      var ka = k * 1.7952 + t * (0.045 + (k % 3) * 0.018);
      var kd = R * (0.34 + 0.46 * ((k * 0.53) % 1));
      var ox = cx + Math.cos(ka) * kd;
      var oy = cy + Math.sin(ka) * kd * 0.90;
      var ol = R * 0.052;
      var ow = R * 0.024;
      var rot = ka * 0.7;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      var og = ctx.createLinearGradient(0, -ow, 0, ow);
      og.addColorStop(0.00, 'rgba(255,232,206,0.50)');
      og.addColorStop(0.45, 'rgba(233,152,176,0.42)');
      og.addColorStop(1.00, 'rgba(160,76,124,0.34)');
      ctx.fillStyle = og;
      roundRectPath(ctx, -ol, -ow, ol * 2, ow * 2, ow);
      ctx.fill();
      ctx.restore();
    }

    /* Inner shadow hugging the membrane - the strongest depth cue. */
    var sg = ctx.createRadialGradient(cx, cy, R * 0.66, cx, cy, R);
    sg.addColorStop(0.00, 'rgba(74,26,62,0)');
    sg.addColorStop(0.72, 'rgba(74,26,62,0.16)');
    sg.addColorStop(1.00, 'rgba(58,18,48,0.52)');
    ctx.fillStyle = sg;
    ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);

    /* Specular sheen sliding across the top of the sphere. */
    ctx.globalCompositeOperation = 'lighter';
    var hx = cx - R * 0.30;
    var hy = cy - R * 0.42;
    var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.62);
    hg.addColorStop(0.00, 'rgba(255,255,255,0.17)');
    hg.addColorStop(0.55, 'rgba(255,236,248,0.05)');
    hg.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hx, hy, R * 0.62, 0, 6.2832); ctx.fill();

    ctx.restore();
  }

  /* Phospholipid bilayer: an outer bloom, a bright rail, and a darker inner
     rail so the boundary reads as two leaflets rather than one white line. */
  function strokeMembrane(ctx, pathFn, R, t) {
    ctx.save();
    ctx.lineJoin = 'round';

    /* Outer bloom. */
    ctx.shadowColor = 'rgba(255,170,220,0.75)';
    ctx.shadowBlur = R * 0.14;
    pathFn(ctx);
    ctx.strokeStyle = 'rgba(255,224,242,0.80)';
    ctx.lineWidth = Math.max(2.4, R * 0.022);
    ctx.stroke();
    ctx.shadowBlur = 0;

    /* Bright outer leaflet. */
    pathFn(ctx);
    ctx.strokeStyle = 'rgba(255,252,255,0.95)';
    ctx.lineWidth = Math.max(1.4, R * 0.010);
    ctx.stroke();

    /* Darker inner leaflet, offset inward by scaling about the centre. */
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = 'rgba(176,84,138,0.9)';
    ctx.lineWidth = Math.max(1, R * 0.007);
    pathFn(ctx);
    ctx.stroke();

    ctx.restore();
  }

  function membraneStuds(ctx, cx, cy, R, t, p, pinched) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var n = 46;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.2832 + t * 0.045;
      var r = pinched ? furrowRadius(R, a, p) * (1 + 0.20 * p) : R;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * (pinched ? furrowRadius(R, a, p) : R);
      var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.1 + i));
      var rr = Math.max(1.1, R * 0.011);
      var g = ctx.createRadialGradient(x, y, 0, x, y, rr * 3.4);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.55 * tw) + ')');
      g.addColorStop(1, 'rgba(255,180,225,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr * 3.4, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }

  /* Glass petri dish sitting under the specimen. */
  function dish(ctx, cx, cy, R, t) {
    var Rd = R * 1.26;

    if (!Assets.drawFit(ctx, 'cell.dish', cx, cy, Rd * 2.4, Rd * 2.4, 0, 1)) {
      /* Soft shadow the dish casts on the bench. */
      ctx.save();
      var sh = ctx.createRadialGradient(cx, cy + R * 0.12, R * 0.4, cx, cy + R * 0.12, Rd * 1.4);
      sh.addColorStop(0, 'rgba(0,0,0,0.55)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh;
      ctx.beginPath(); ctx.arc(cx, cy + R * 0.12, Rd * 1.4, 0, 6.2832); ctx.fill();
      ctx.restore();

      /* Glass rim: a thin bright annulus with a specular arc. */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var rim = ctx.createRadialGradient(cx, cy, Rd * 0.93, cx, cy, Rd * 1.03);
      rim.addColorStop(0.00, 'rgba(120,190,230,0)');
      rim.addColorStop(0.55, 'rgba(150,215,255,0.16)');
      rim.addColorStop(0.86, 'rgba(205,240,255,0.34)');
      rim.addColorStop(1.00, 'rgba(140,200,240,0)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, Rd * 1.03, 0, 6.2832); ctx.fill();

      ctx.strokeStyle = 'rgba(196,232,255,0.30)';
      ctx.lineWidth = Math.max(1.5, R * 0.012);
      ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, 6.2832); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(2, R * 0.018);
      ctx.beginPath(); ctx.arc(cx, cy, Rd, -2.5, -1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Rd, 0.7, 1.3); ctx.stroke();
      ctx.restore();
    }
  }

  /* Rigid plant cell wall - layered like real cellulose. */
  function plantWall(ctx, cx, cy, s, t) {
    var x = cx - s / 2, y = cy - s / 2;

    if (Assets.drawFit(ctx, 'cell.wall', cx, cy, s * 1.1, s * 1.1, 0, 1)) { return; }

    ctx.save();
    /* Outer wall slab with a bevel. */
    var wall = Math.max(7, s * 0.045);
    roundRectPath(ctx, x - wall, y - wall, s + wall * 2, s + wall * 2, s * 0.055);
    var wg = ctx.createLinearGradient(x, y - wall, x, y + s + wall);
    wg.addColorStop(0.00, 'rgba(206,236,168,0.95)');
    wg.addColorStop(0.30, 'rgba(150,196,110,0.95)');
    wg.addColorStop(0.72, 'rgba(104,152,72,0.95)');
    wg.addColorStop(1.00, 'rgba(142,188,104,0.95)');
    ctx.fillStyle = wg;
    ctx.fill();

    /* Inner face, darker, so the wall reads as thick. */
    roundRectPath(ctx, x, y, s, s, s * 0.035);
    ctx.fillStyle = 'rgba(58,86,40,0.55)';
    ctx.fill();

    /* Bevel highlight + shade. */
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = Math.max(1.4, s * 0.006);
    roundRectPath(ctx, x - wall + 1, y - wall + 1, s + wall * 2 - 2, s + wall * 2 - 2, s * 0.05);
    ctx.stroke();
    ctx.restore();

    /* Cytoplasm inside the box, using the same lit body treatment. */
    cellBody(ctx, cx, cy, s * 0.5, function (c2) {
      roundRectPath(c2, x, y, s, s, s * 0.035);
    }, t);
  }

  /* The growing cell plate, built from fused vesicles. */
  function cellPlate(ctx, cx, cy, s, p, t) {
    if (p <= 0) { return; }
    var half = (p * s) / 2;
    var w = Math.max(6, s * 0.022);

    if (Assets.drawFit(ctx, 'fx.plate', cx, cy, w * 3, half * 2, 0, 1)) { return; }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(cx - w * 1.6, cy, cx + w * 1.6, cy);
    g.addColorStop(0.00, 'rgba(143,255,79,0)');
    g.addColorStop(0.32, 'rgba(180,255,130,0.55)');
    g.addColorStop(0.50, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.68, 'rgba(180,255,130,0.55)');
    g.addColorStop(1.00, 'rgba(143,255,79,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - w * 1.6, cy - half, w * 3.2, half * 2);
    ctx.restore();

    /* Solid core with a bright leading edge at each growing tip. */
    ctx.save();
    roundRectPath(ctx, cx - w / 2, cy - half, w, half * 2, w / 2);
    var cg = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
    cg.addColorStop(0.00, '#2f7a20');
    cg.addColorStop(0.42, '#b7ff86');
    cg.addColorStop(0.58, '#eaffd6');
    cg.addColorStop(1.00, '#3d8f26');
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.restore();

    if (p < 1) {
      var pulse = 0.6 + 0.4 * Math.sin(t * 7);
      [cy - half, cy + half].forEach(function (ty) {
        var tg = ctx.createRadialGradient(cx, ty, 0, cx, ty, w * 2.6);
        tg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * pulse) + ')');
        tg.addColorStop(1, 'rgba(143,255,79,0)');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(cx, ty, w * 2.6, 0, 6.2832); ctx.fill();
      });
    }
  }

  /* ----------------------------------------------------------- entities -- */

  /* Relaxed chromatin: a loose luminous thread. */
  function chromatin(ctx, c, R, t, hot) {
    var tint = TINTS[c.tint];
    var span = R * 0.20;
    var wob = Math.sin(t * 1.7 + c.id * 1.9) * span * 0.16;

    if (Assets.drawFit(ctx, 'chromatin.' + tint.key, c.x, c.y, span * 2.4, span * 2.4,
                       Math.sin(t * 0.6 + c.id) * 0.2, 1)) { return; }

    var pulse = hot ? 0.55 + 0.45 * Math.sin(t * 5) : 1;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function path(x) {
      x.beginPath();
      x.moveTo(c.x - span, c.y - span * 0.5 + wob);
      x.bezierCurveTo(
        c.x - span * 0.3, c.y - span * 1.25 - wob,
        c.x + span * 0.5, c.y + span * 0.55 + wob,
        c.x + span * 0.95, c.y + span * 0.35 - wob
      );
    }

    glow(ctx, tint.glow + (0.9 * pulse) + ')', R * 0.13, function (x) {
      path(x);
      x.strokeStyle = tint.body;
      x.lineWidth = Math.max(3.5, R * 0.030);
      x.stroke();
    });

    /* Bright inner filament makes the thread look lit from inside. */
    path(ctx);
    ctx.strokeStyle = tint.core;
    ctx.lineWidth = Math.max(1.3, R * 0.012);
    ctx.globalAlpha = 0.9 * pulse;
    ctx.stroke();
    ctx.restore();
  }

  /* One lit chromatid rod. */
  function rod(ctx, x, y, len, wide, tint, tilt, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    if (alpha !== undefined) { ctx.globalAlpha *= alpha; }

    /* Cross-section gradient = cylinder shading. */
    var g = ctx.createLinearGradient(-wide / 2, 0, wide / 2, 0);
    g.addColorStop(0.00, tint.deep);
    g.addColorStop(0.22, tint.body);
    g.addColorStop(0.46, tint.core);
    g.addColorStop(0.70, tint.body);
    g.addColorStop(1.00, tint.deep);

    roundRectPath(ctx, -wide / 2, -len / 2, wide, len, wide / 2);
    ctx.fillStyle = g;
    ctx.fill();

    /* Lengthwise specular streak. */
    roundRectPath(ctx, -wide * 0.30, -len * 0.42, wide * 0.26, len * 0.84, wide * 0.13);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fill();

    ctx.restore();
  }

  /* Bright centromere bead. */
  function centromere(ctx, x, y, r) {
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 2.2);
    g.addColorStop(0.00, 'rgba(255,255,255,1)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.85)');
    g.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 6.2832); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  /* Condensed X-shaped chromosome (two chromatids joined at the waist). */
  function chromosome(ctx, c, R, t, hot) {
    var tint = TINTS[c.tint];
    var len = R * 0.30;
    var wide = Math.max(6, R * 0.055);

    if (Assets.drawFit(ctx, 'chromosome.' + tint.key, c.x, c.y, len * 1.9, len * 1.9, 0, 1)) {
      return;
    }

    var pulse = hot ? 0.6 + 0.4 * Math.sin(t * 6) : 1;

    ctx.save();
    ctx.shadowColor = tint.glow + (0.85 * pulse) + ')';
    ctx.shadowBlur = R * 0.16;
    rod(ctx, c.x, c.y, len, wide, tint,  0.30);
    ctx.shadowBlur = R * 0.10;
    rod(ctx, c.x, c.y, len, wide, tint, -0.30);
    ctx.restore();

    centromere(ctx, c.x, c.y, Math.max(2.4, R * 0.022));
  }

  /* A single separated chromatid. */
  function chromatid(ctx, x, y, tint, side, R, t, hot) {
    var len = R * 0.30;
    var wide = Math.max(6, R * 0.055);

    if (Assets.drawFit(ctx, 'chromatid.' + tint.key, x, y, len * 1.5, len * 1.5,
                       side === 'left' ? -0.2 : 0.2, 1)) {
      return;
    }

    var pulse = hot ? 0.6 + 0.4 * Math.sin(t * 6) : 1;

    ctx.save();
    ctx.shadowColor = tint.glow + (0.85 * pulse) + ')';
    ctx.shadowBlur = R * 0.15;
    rod(ctx, x, y, len, wide, tint, side === 'left' ? -0.2 : 0.2);
    ctx.restore();

    centromere(ctx, side === 'left' ? x + wide * 0.55 : x - wide * 0.55, y,
               Math.max(2.2, R * 0.020));
  }

  /* Centrosome: a lit star surrounded by a shimmering aster. */
  function centrosome(ctx, c, R, t, hot) {
    var size = R * 0.11;

    /* Aster microtubules radiating outward. */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(163,255,120,0.30)';
    ctx.lineWidth = Math.max(1, R * 0.006);
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * 6.2832 + t * 0.10 + c.side.length;
      var wob = 0.86 + 0.14 * Math.sin(t * 2.4 + i);
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(a) * size * 1.1, c.y + Math.sin(a) * size * 1.1);
      ctx.lineTo(c.x + Math.cos(a) * size * 2.6 * wob, c.y + Math.sin(a) * size * 2.6 * wob);
      ctx.stroke();
    }
    ctx.restore();

    if (Assets.drawFit(ctx, 'centrosome', c.x, c.y, size * 4, size * 4, t * 0.35, 1)) { return; }

    var pulse = hot ? 0.62 + 0.38 * Math.sin(t * 5.5) : 1;

    /* Halo. */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var hg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, size * 2.5);
    hg.addColorStop(0.00, 'rgba(214,255,180,' + (0.55 * pulse) + ')');
    hg.addColorStop(0.40, 'rgba(143,255,79,'  + (0.26 * pulse) + ')');
    hg.addColorStop(1.00, 'rgba(143,255,79,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(c.x, c.y, size * 2.5, 0, 6.2832); ctx.fill();
    ctx.restore();

    /* Six-point star body with an internal radial core. */
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(t * 0.30);
    ctx.beginPath();
    for (var k = 0; k < 12; k++) {
      var ang = -Math.PI / 2 + k * Math.PI / 6;
      var rr = (k % 2 === 0) ? size : size * 0.44;
      var px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (k === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
    }
    ctx.closePath();

    var sg = ctx.createRadialGradient(-size * 0.2, -size * 0.25, 0, 0, 0, size);
    sg.addColorStop(0.00, '#f4ffe6');
    sg.addColorStop(0.35, '#bcff86');
    sg.addColorStop(0.72, '#4fc42c');
    sg.addColorStop(1.00, '#1f5e12');
    ctx.fillStyle = sg;
    ctx.shadowColor = 'rgba(143,255,79,0.9)';
    ctx.shadowBlur = size * 1.4;
    ctx.fill();
    ctx.restore();

    /* Bright core. */
    ctx.save();
    var cg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, size * 0.42);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(c.x, c.y, size * 0.42, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  /* Spindle fibres from each pole to every chromosome. */
  function spindle(ctx, chroms, poles, R, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (var pi = 0; pi < poles.length; pi++) {
      var pole = poles[pi];
      for (var ci = 0; ci < chroms.length; ci++) {
        var c = chroms[ci];
        var tx, ty;
        if (c.isSplit) {
          tx = pi === 0 ? c.lx : c.rx;
          ty = pi === 0 ? c.ly : c.ry;
        } else {
          tx = c.x; ty = c.y;
        }

        var shimmer = 0.16 + 0.14 * Math.abs(Math.sin(t * 2.1 + ci * 1.3 + pi));
        var g = ctx.createLinearGradient(pole.x, pole.y, tx, ty);
        g.addColorStop(0.00, 'rgba(190,255,150,' + (shimmer * 1.5) + ')');
        g.addColorStop(0.55, 'rgba(255,255,255,' + (shimmer * 0.7) + ')');
        g.addColorStop(1.00, 'rgba(255,214,236,' + (shimmer * 1.2) + ')');
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(1.1, R * 0.0075);
        ctx.beginPath();
        ctx.moveTo(pole.x, pole.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* The parent nuclear envelope, dissolving through prophase. */
  function parentEnvelope(ctx, cx, cy, R, intact, t) {
    if (intact <= 0.01) { return; }

    ctx.save();
    ctx.globalAlpha = intact;
    ctx.setLineDash([R * 0.05, R * 0.05 * (1 + (1 - intact) * 5)]);
    ctx.lineDashOffset = -t * 14;
    ctx.strokeStyle = 'rgba(255,225,245,0.55)';
    ctx.lineWidth = Math.max(1.6, R * 0.014);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.56, 0, 6.2832); ctx.stroke();

    ctx.setLineDash([]);
    var g = ctx.createRadialGradient(cx, cy, R * 0.40, cx, cy, R * 0.58);
    g.addColorStop(0, 'rgba(255,235,248,0)');
    g.addColorStop(1, 'rgba(255,214,238,0.22)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.58, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  /* Metaphase plate guide - a glowing equator to aim at. */
  function equator(ctx, cx, cy, R, t, strength) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    var g = ctx.createLinearGradient(cx - R * 0.05, cy, cx + R * 0.05, cy);
    g.addColorStop(0.00, 'rgba(79,240,255,0)');
    g.addColorStop(0.50, 'rgba(79,240,255,' + (0.16 * strength) + ')');
    g.addColorStop(1.00, 'rgba(79,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 0.05, cy - R, R * 0.10, R * 2);

    ctx.setLineDash([R * 0.045, R * 0.05]);
    ctx.lineDashOffset = t * 22;
    ctx.strokeStyle = 'rgba(200,251,255,' + (0.55 * strength) + ')';
    ctx.lineWidth = Math.max(1.3, R * 0.009);
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 0.96);
    ctx.lineTo(cx, cy + R * 0.96);
    ctx.stroke();
    ctx.restore();
  }

  /* Reforming nuclear envelope: dotted target + luminous progress arc. */
  function envelope(ctx, cx, cy, r, progress, t) {
    ctx.save();

    if (progress < 1) {
      ctx.setLineDash([r * 0.16, r * 0.16]);
      ctx.lineDashOffset = -t * 20;
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = Math.max(1.6, r * 0.038);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([]);

      if (progress > 0) {
        ctx.shadowColor = 'rgba(176,130,255,0.95)';
        ctx.shadowBlur = r * 0.34;
        var g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        g.addColorStop(0, '#e6dcff');
        g.addColorStop(1, '#b082ff');
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(3, r * 0.075);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * progress);
        ctx.stroke();
      }

      /* Leading tip marker so it is obvious where to keep tracing. */
      var a = -Math.PI / 2 + 6.2832 * progress;
      var tipX = cx + Math.cos(a) * r;
      var tipY = cy + Math.sin(a) * r;
      var tg = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, r * 0.16);
      tg.addColorStop(0, 'rgba(255,255,255,0.95)');
      tg.addColorStop(1, 'rgba(176,130,255,0)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tipX, tipY, r * 0.16, 0, 6.2832); ctx.fill();
    } else {
      /* Sealed: double membrane plus a faint nucleoplasm fill. */
      var fg = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      fg.addColorStop(0.00, 'rgba(214,196,255,0.20)');
      fg.addColorStop(0.72, 'rgba(176,130,255,0.13)');
      fg.addColorStop(1.00, 'rgba(176,130,255,0.05)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();

      ctx.shadowColor = 'rgba(176,130,255,0.8)';
      ctx.shadowBlur = r * 0.22;
      ctx.strokeStyle = 'rgba(238,230,255,0.92)';
      ctx.lineWidth = Math.max(2.4, r * 0.055);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(1, r * 0.018);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.90, 0, 6.2832); ctx.stroke();

      /* Nuclear pores. */
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (var i = 0; i < 12; i++) {
        var pa = (i / 12) * 6.2832 + t * 0.06;
        var px = cx + Math.cos(pa) * r * 0.95;
        var py = cy + Math.sin(pa) * r * 0.95;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, r * 0.026), 0, 6.2832); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* A nucleolus: amber sphere, clearly lit from within. */
  function nucleolus(ctx, o, R, t, hot) {
    var rad = R * 0.055;
    var size = rad * 2;

    if (Assets.drawFit(ctx, 'organelle.nucleolus', o.x, o.y, size * 2.4, size * 2.4, 0,
                       o.isPlaced ? 1 : 0.9)) {
      return;
    }

    var pulse = hot ? 0.6 + 0.4 * Math.sin(t * 5.5) : 1;
    var lit = o.isPlaced ? 1 : 0.72;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var hg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, rad * 3.4);
    hg.addColorStop(0.00, 'rgba(255,244,196,' + (0.62 * pulse * lit) + ')');
    hg.addColorStop(0.34, 'rgba(255,201,63,'  + (0.30 * pulse * lit) + ')');
    hg.addColorStop(1.00, 'rgba(255,201,63,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(o.x, o.y, rad * 3.4, 0, 6.2832); ctx.fill();
    ctx.restore();

    var g = ctx.createRadialGradient(o.x - rad * 0.34, o.y - rad * 0.38, rad * 0.05,
                                     o.x, o.y, rad);
    if (o.isPlaced) {
      g.addColorStop(0.00, '#fffdf0');
      g.addColorStop(0.30, '#ffe9a8');
      g.addColorStop(0.68, '#ffc93f');
      g.addColorStop(1.00, '#a3630a');
    } else {
      g.addColorStop(0.00, '#f2f4f8');
      g.addColorStop(0.34, '#c3cad8');
      g.addColorStop(0.72, '#8c96a8');
      g.addColorStop(1.00, '#4a5364');
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.x, o.y, rad, 0, 6.2832); ctx.fill();

    /* Specular dot. */
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(o.x - rad * 0.32, o.y - rad * 0.36, rad * 0.24, 0, 6.2832);
    ctx.fill();

    /* Drop target ring while it still needs placing. */
    if (!o.isPlaced) {
      ctx.save();
      ctx.setLineDash([rad * 0.5, rad * 0.5]);
      ctx.lineDashOffset = -t * 12;
      ctx.strokeStyle = 'rgba(255,201,63,0.55)';
      ctx.lineWidth = Math.max(1.2, rad * 0.16);
      ctx.beginPath(); ctx.arc(o.x, o.y, rad * 1.9, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
  }

  /* Faint daughter-cell outlines previewed during cytokinesis. */
  function daughterGhost(ctx, cx, cy, r, t) {
    ctx.save();
    ctx.setLineDash([r * 0.10, r * 0.09]);
    ctx.lineDashOffset = t * 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = Math.max(1.2, r * 0.016);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }

  /* Contractile ring cinching the animal cell at the waist. */
  function contractileRing(ctx, cx, cy, R, p, t) {
    if (p <= 0.01) { return; }
    var neck = furrowRadius(R, Math.PI / 2, p);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ['-', '+'].forEach(function (s) {
      var y = cy + (s === '-' ? -neck : neck);
      var g = ctx.createRadialGradient(cx, y, 0, cx, y, R * 0.24);
      g.addColorStop(0.00, 'rgba(255,255,255,' + (0.55 * p) + ')');
      g.addColorStop(0.30, 'rgba(255,95,168,' + (0.42 * p) + ')');
      g.addColorStop(1.00, 'rgba(255,95,168,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, y, R * 0.24, 0, 6.2832); ctx.fill();
    });
    ctx.restore();
  }

  return {
    dish: dish,
    cellBody: cellBody,
    strokeMembrane: strokeMembrane,
    membraneStuds: membraneStuds,
    furrowPath: furrowPath,
    furrowRadius: furrowRadius,
    contractileRing: contractileRing,
    plantWall: plantWall,
    cellPlate: cellPlate,
    chromatin: chromatin,
    chromosome: chromosome,
    chromatid: chromatid,
    centrosome: centrosome,
    spindle: spindle,
    parentEnvelope: parentEnvelope,
    equator: equator,
    envelope: envelope,
    nucleolus: nucleolus,
    daughterGhost: daughterGhost,
    roundRectPath: roundRectPath
  };
}());
