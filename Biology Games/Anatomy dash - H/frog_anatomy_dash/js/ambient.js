/* Ambient scenery: a full-bleed parallax swamp painted behind the play area.
   Everything here is decorative and runs in screen space — it never reads or
   writes gameplay state.                                                      */
(function (global) {
  'use strict';

  var PALETTES = [
    {   /* Zone 1 — dusk over the marsh */
      skyTop: '#071f2a', skyMid: '#0e3a3a', skyLow: '#1d5a4a', horizon: '#d79a3c',
      far: '#0a2c2b', mid: '#07211f', near: '#04181a',
      water: '#0d3a4a', waterLit: '#1f6f7f', orb: '#ffd08a', mist: '#7fd6c0'
    },
    {   /* Zone 2 — deep night, bioluminescent */
      skyTop: '#050f26', skyMid: '#0b2340', skyLow: '#123a4e', horizon: '#4fd4c8',
      far: '#08202f', mid: '#061722', near: '#030f16',
      water: '#0a2c42', waterLit: '#1c5f80', orb: '#cfeaff', mist: '#6fc9e8'
    },
    {   /* Zone 3 — first light in the canopy */
      skyTop: '#1a0f2e', skyMid: '#3a2050', skyLow: '#6b3a53', horizon: '#ffb06a',
      far: '#241636', mid: '#180f26', near: '#0e0918',
      water: '#2a1c3c', waterLit: '#6a4a72', orb: '#ffd0a0', mist: '#c39ad8'
    }
  ];

  var W = 0, H = 0;
  var pal = PALETTES[0];
  var t = 0;
  var stars = [];
  var motes = [];
  var flies = [];
  var pads = [];
  var reeds = [];
  var farLine = [];
  var midLine = [];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function build() {
    stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.55,
                   r: rnd(0.6, 1.9), ph: Math.random() * 6.28, sp: rnd(0.6, 2.2) });
    }
    motes = [];
    for (i = 0; i < 46; i++) {
      motes.push({ x: Math.random(), y: Math.random(), r: rnd(1.1, 3.4),
                   vy: rnd(-0.055, -0.014), ph: Math.random() * 6.28,
                   sw: rnd(0.15, 0.5), warm: Math.random() < 0.4 });
    }
    flies = [];
    for (i = 0; i < 3; i++) {
      flies.push({ x: Math.random(), y: rnd(0.18, 0.62), sp: rnd(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1),
                   ph: Math.random() * 6.28, sc: rnd(0.5, 0.95) });
    }
    pads = [];
    for (i = 0; i < 7; i++) {
      pads.push({ x: Math.random(), y: rnd(0.83, 0.98), sc: rnd(0.35, 0.9), ph: Math.random() * 6.28 });
    }
    reeds = [];
    for (i = 0; i < 14; i++) {
      reeds.push({ x: Math.random(), h: rnd(0.16, 0.4), sc: rnd(0.5, 1.15),
                   ph: Math.random() * 6.28, side: Math.random() < 0.5 });
    }
    farLine = [];
    for (i = 0; i <= 26; i++) farLine.push(rnd(0.06, 0.19));
    midLine = [];
    for (i = 0; i <= 18; i++) midLine.push(rnd(0.1, 0.28));
  }

  function resize(w, h) { W = w; H = h; if (!stars.length) build(); }

  function setZone(index) { pal = PALETTES[index % PALETTES.length]; }

  function update(dt) { t += dt; }

  /* ------------------------------------------------------------------ draw */

  function skyLayer(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.45, pal.skyMid);
    g.addColorStop(0.78, pal.skyLow);
    g.addColorStop(1, pal.water);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* Warm band just above the tree line. */
    var hg = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.86);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.6, hexA(pal.horizon, 0.16));
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, H * 0.42, W, H * 0.44);
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function moon(ctx, px) {
    var cx = W * 0.8 - px * 18;
    var cy = H * 0.18;
    var r = Math.max(26, Math.min(W, H) * 0.055);

    var glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 6);
    glow.addColorStop(0, hexA(pal.orb, 0.42));
    glow.addColorStop(0.35, hexA(pal.orb, 0.12));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, r * 6, 0, Math.PI * 2); ctx.fill();

    var body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    body.addColorStop(0, '#fffdf2');
    body.addColorStop(0.7, pal.orb);
    body.addColorStop(1, hexA(pal.orb, 0.6));
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }

  function starField(ctx) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 * s.sp + s.ph));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = '#e9fbff';
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Silhouette tree line built from the seeded bump list. */
  function treeLine(ctx, pts, baseY, color, px, depth) {
    var span = W / (pts.length - 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-40, H);
    for (var i = 0; i < pts.length; i++) {
      var x = i * span - px * depth;
      var y = baseY - pts[i] * H;
      if (i === 0) ctx.lineTo(x, y);
      else {
        var pxm = (i - 0.5) * span - px * depth;
        var pym = baseY - pts[i - 1] * H;
        ctx.quadraticCurveTo(pxm, Math.min(pym, y) - H * 0.02, x, y);
      }
    }
    ctx.lineTo(W + 40, H);
    ctx.closePath();
    ctx.fill();
  }

  function mist(ctx) {
    for (var i = 0; i < 3; i++) {
      var y = H * (0.6 + i * 0.11);
      var drift = ((t * (0.006 + i * 0.004)) % (W + 400)) - 200;
      var g = ctx.createLinearGradient(0, y - H * 0.05, 0, y + H * 0.05);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, hexA(pal.mist, 0.09 - i * 0.02));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(drift, y, W * 0.7, H * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(drift - W * 0.9, y, W * 0.7, H * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function water(ctx) {
    var top = H * 0.82;
    var g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, hexA(pal.waterLit, 0.85));
    g.addColorStop(0.4, pal.water);
    g.addColorStop(1, '#03151b');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, H - top);

    /* Shimmer strokes. */
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = hexA(pal.orb, 0.7);
    ctx.lineWidth = 1.6;
    for (var i = 0; i < 12; i++) {
      var y = top + (i / 12) * (H - top) + Math.sin(t * 0.002 + i) * 2;
      var wob = Math.sin(t * 0.0016 + i * 1.7) * W * 0.06;
      ctx.beginPath();
      ctx.moveTo(W * 0.62 + wob, y);
      ctx.lineTo(W * 0.62 + wob + (W * 0.1) * (1 - i / 14), y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Props are sized off the smaller screen axis, so a tall phone does not end
     up with reeds and pads several times their intended size. */
  function propUnit() { return Math.min(W, H * 0.8, 1400); }

  function lilypads(ctx, px) {
    var img = global.Assets && global.Assets.get('bg:lilypad');
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      var x = p.x * W - px * 26;
      var y = p.y * H + Math.sin(t * 0.0012 + p.ph) * 3;
      var w = 120 * p.sc * (propUnit() / 900);
      var h = w * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.9;
      if (img) {
        ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      } else {
        var g = ctx.createRadialGradient(x - w * 0.15, y - h * 0.3, h * 0.1, x, y, w * 0.5);
        g.addColorStop(0, '#a8e05a');
        g.addColorStop(0.65, '#4f9f30');
        g.addColorStop(1, '#22551d');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function cattails(ctx, px) {
    var img = global.Assets && global.Assets.get('bg:cattail');
    var unit = Math.min(H, W * 1.15);
    for (var i = 0; i < reeds.length; i++) {
      var r = reeds[i];
      var x = r.x * W - px * 40;
      var hgt = r.h * unit;
      var sway = Math.sin(t * 0.0011 + r.ph) * (hgt * 0.05);
      ctx.save();
      ctx.globalAlpha = 0.85;
      if (img) {
        var w = hgt * 0.33;
        ctx.translate(x, H);
        ctx.rotate(sway / hgt * 0.6);
        ctx.drawImage(img, -w / 2, -hgt, w, hgt);
      } else {
        ctx.strokeStyle = pal.near;
        ctx.lineWidth = Math.max(2, hgt * 0.03);
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.quadraticCurveTo(x + sway * 0.5, H - hgt * 0.6, x + sway, H - hgt);
        ctx.stroke();
        ctx.fillStyle = pal.near;
        ctx.beginPath();
        ctx.ellipse(x + sway, H - hgt - hgt * 0.04, hgt * 0.035, hgt * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function dragonflies(ctx) {
    var img = global.Assets && global.Assets.get('bg:dragonfly');
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.x += f.sp * 0.0016 * 16;
      if (f.x > 1.15) f.x = -0.15;
      if (f.x < -0.15) f.x = 1.15;
      var x = f.x * W;
      var y = f.y * H + Math.sin(t * 0.003 + f.ph) * H * 0.02;
      var w = 90 * f.sc * (propUnit() / 900 * 0.6 + 0.4);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(x, y);
      if (f.sp < 0) ctx.scale(-1, 1);
      if (img) {
        ctx.drawImage(img, -w / 2, -w * 0.33, w, w * 0.66);
      } else {
        ctx.fillStyle = hexA(pal.mist, 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.36, w * 0.05, Math.sin(t * 0.02) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#46e6c8';
        ctx.fillRect(-w * 0.3, -w * 0.02, w * 0.6, w * 0.04);
      }
      ctx.restore();
    }
  }

  function fireflies(ctx) {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y += m.vy * 0.016;
      if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      var x = m.x * W + Math.sin(t * 0.0009 + m.ph) * W * m.sw * 0.06;
      var y = m.y * H;
      var pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0022 + m.ph));
      var col = m.warm ? '#ffd766' : '#8ff2dd';
      ctx.save();
      ctx.globalAlpha = pulse * 0.75;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function vignette(ctx) {
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35,
                                     W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* A soft pool of light marking the play area so it reads as a stage. */
  function stageLight(ctx, rect) {
    if (!rect) return;
    var cx = rect.x + rect.w / 2;
    var cy = rect.y + rect.h / 2;
    var g = ctx.createRadialGradient(cx, cy * 0.9, rect.h * 0.08, cx, cy,
                                     Math.max(rect.w, rect.h) * 0.85);
    g.addColorStop(0, hexA(pal.mist, 0.13));
    g.addColorStop(0.5, hexA(pal.mist, 0.05));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* px is a small parallax offset in pixels derived from the player position. */
  function draw(ctx, parallax, stageRect) {
    var px = parallax || 0;
    skyLayer(ctx);
    starField(ctx);
    moon(ctx, px);
    treeLine(ctx, farLine, H * 0.78, pal.far, px, 16);
    mist(ctx);
    treeLine(ctx, midLine, H * 0.9, pal.mid, px, 34);
    water(ctx);
    lilypads(ctx, px);
    stageLight(ctx, stageRect);
    dragonflies(ctx);
    fireflies(ctx);
    cattails(ctx, px);
    vignette(ctx);
  }

  global.Ambient = {
    resize: resize, setZone: setZone, update: update, draw: draw, rebuild: build
  };
})(window);
