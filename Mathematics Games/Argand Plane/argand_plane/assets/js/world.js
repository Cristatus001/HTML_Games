/* Mirror River City — the Argand plane, drawn on a canvas.
 * Math coordinates: x = real part (right), y = imaginary part (up).
 * The real axis is a river: the conjugate of a house is its reflection in the water. */
(function () {
  'use strict';
  var AP = (window.AP = window.AP || {});

  var C = {
    skyTop: '#1d1030', skyMid: '#4a2552', skyLow: '#b24d5a', skyGlow: '#f08a5d',
    deepTop: '#5a3a7a', deep1: '#3b2560', deep2: '#22143d', deep3: '#150b26',
    gridUp: 'rgba(255,214,170,0.10)', gridUp5: 'rgba(255,214,170,0.20)',
    gridDn: 'rgba(196,176,255,0.09)', gridDn5: 'rgba(196,176,255,0.18)',
    cream: '#fff4e2', creamDk: '#e9cfa6', ink: '#3a1f2b',
    terra: '#c4532f', terraLit: '#ec7b4f',
    lantern: '#ffcc4d', lanternLit: '#fff1b8',
    violet: '#8c6bd9', violetLit: '#c9b6ff',
    rose: '#ff4d5e'
  };
  var MINUS = '−';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var W = {
    canvas: null, ctx: null, dpr: 1, w: 0, h: 0, unit: 40,
    cam: { x: 0, y: 0, zoom: 1 },
    particles: [], floats: [], motes: [], shake: 0,
    sprites: {}, boats: [],
    safeTop: 80, safeBottom: 0, offX: 0, offY: 0
  };

  W.init = function (canvas) {
    W.canvas = canvas; W.ctx = canvas.getContext('2d');
    W.resize();
    for (var i = 0; i < 34; i++) {
      W.motes.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.8, sp: 0.004 + Math.random() * 0.012, ph: Math.random() * 6.28 });
    }
    // Sprite art (see README). Any missing file falls back to the canvas-drawn art.
    var names = ['car', 'boat', 'moon', 'skyline'];
    HOUSE_STYLES.forEach(function (st) { HOUSE_LOOKS.forEach(function (lk) { names.push('house-' + st + '-' + lk); }); });
    names.forEach(function (k) {
      var im = new Image();
      im.onload = function () { W.sprites[k] = im; };
      im.src = 'assets/images/sprites/' + k + '.png';
    });
    W.boats = [{ p: 0.15, sp: 0.018, s: 1 }, { p: 0.62, sp: -0.012, s: 0.8 }];
  };

  // Each house gets one of three building styles from its address (not from its role),
  // so a building's look never hints at which house is z or z-bar.
  var HOUSE_STYLES = ['cottage', 'tower', 'shop'], HOUSE_LOOKS = ['dark', 'failing', 'lit', 'mirror'];
  function styleOf(x, y) {
    var hsh = (x * 73856093) ^ (y * 19349663);
    return HOUSE_STYLES[Math.abs(hsh) % 3];
  }
  W.styleOf = styleOf;

  W.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W.dpr = dpr; W.w = window.innerWidth; W.h = window.innerHeight;
    W.canvas.width = Math.round(W.w * dpr); W.canvas.height = Math.round(W.h * dpr);
    W.canvas.style.width = W.w + 'px'; W.canvas.style.height = W.h + 'px';
    W.unit = clamp(Math.min(W.w, W.h) / 15, 30, 76);
  };

  W.toScreen = function (x, y) {
    var u = W.unit * W.cam.zoom;
    return { x: W.w / 2 + W.offX + (x - W.cam.x) * u, y: W.h / 2 + W.offY - (y - W.cam.y) * u };
  };

  /* ---------- effects ---------- */
  W.burst = function (x, y, color, n, speed, opts) {
    opts = opts || {};
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65);
      W.particles.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (opts.up || 0),
        g: opts.gravity == null ? -3 : opts.gravity, life: 0, max: (opts.life || 0.9) * (0.6 + Math.random() * 0.6),
        color: Array.isArray(color) ? color[i % color.length] : color, size: (opts.size || 4) * (0.6 + Math.random() * 0.8)
      });
    }
  };
  W.floatText = function (x, y, text, color) {
    W.floats.push({ x: x, y: y, text: text, color: color || C.lantern, life: 0, max: 1.4 });
  };
  W.kick = function (amount) { W.shake = Math.max(W.shake, amount); };

  /* ---------- main render ---------- */
  W.render = function (dt, S) {
    var ctx = W.ctx, dpr = W.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sx = 0, sy = 0;
    if (W.shake > 0.01 && !S.reduced) {
      sx = (Math.random() - 0.5) * W.shake * 14; sy = (Math.random() - 0.5) * W.shake * 14;
    }
    W.shake = Math.max(0, W.shake - dt * 2.6);
    ctx.save();
    ctx.translate(sx, sy);
    drawBackdrop(ctx, S);
    drawScenery(ctx, S);
    drawGrid(ctx);
    drawRiver(ctx, S);
    drawBoats(ctx, dt, S);
    drawAxes(ctx, S);
    if (S.active) {
      drawGuides(ctx, S);
      drawHouses(ctx, S);
      drawCar(ctx, S);
      drawLabels(ctx, S);
    }
    drawParticles(ctx, dt);
    ctx.restore();
    drawMotes(ctx, dt, S);
  };

  function drawBackdrop(ctx, S) {
    var w = W.w, h = W.h, ry = W.toScreen(0, 0).y;
    var top = clamp(ry, 0, h);
    if (top > 0) {
      var g = ctx.createLinearGradient(0, ry - h * 1.3, 0, ry);
      g.addColorStop(0, C.skyTop); g.addColorStop(0.55, C.skyMid); g.addColorStop(0.86, C.skyLow); g.addColorStop(1, C.skyGlow);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, top);
      // twinkling stars far above the river
      ctx.save();
      for (var i = 0; i < 60; i++) {
        var px = ((i * 137.5 + W.cam.x * 6) % w + w) % w;
        var py = (i * 71.3) % (h * 1.2) - (W.cam.y * 4) % (h * 1.2);
        py = ((py % top) + top) % top;
        if (py > ry - 40) continue;
        var tw = 0.35 + 0.35 * Math.sin(S.time * 1.7 + i);
        ctx.globalAlpha = tw * clamp((ry - py) / 260, 0, 1);
        ctx.fillStyle = C.lanternLit;
        ctx.fillRect(px, py, 1.6, 1.6);
      }
      ctx.restore();
    }
    if (top < h) {
      var g2 = ctx.createLinearGradient(0, ry, 0, ry + h * 1.3);
      g2.addColorStop(0, C.deepTop); g2.addColorStop(0.14, C.deep1); g2.addColorStop(0.6, C.deep2); g2.addColorStop(1, C.deep3);
      ctx.fillStyle = g2; ctx.fillRect(0, top, w, h - top);
      // slow reflected ripples in the mirror half
      ctx.save();
      ctx.strokeStyle = 'rgba(201,182,255,0.06)'; ctx.lineWidth = 1;
      for (var k = 0; k < 14; k++) {
        var yy = top + 20 + k * 46 + Math.sin(S.time * 0.6 + k) * 4;
        if (yy > h) break;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 24) {
          var wy = yy + Math.sin(x * 0.03 + S.time * 0.9 + k) * 2.5;
          if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---------- scenery: moon, a far skyline on the river bank, and its reflection ---------- */
  function drawScenery(ctx, S) {
    var ry = W.toScreen(0, 0).y, u = W.unit * W.cam.zoom;
    var moon = W.sprites.moon, sky = W.sprites.skyline;
    if (moon && ry > 40) {
      var ms = clamp(Math.min(W.w, W.h) * 0.2, 90, 200);
      var mx = W.w * 0.82 - W.cam.x * u * 0.04, my = Math.min(ry - ms * 0.9, W.h * 0.2) - W.cam.y * u * 0.02;
      ctx.globalAlpha = 0.9; ctx.drawImage(moon, mx - ms / 2, my - ms / 2, ms, ms); ctx.globalAlpha = 1;
    }
    if (!sky) return;
    // parallax: the skyline drifts at a third of the map's speed, so it reads as far away
    var hs = clamp(W.h * 0.2, 80, 200), ws = hs * sky.width / sky.height;
    var x0 = ((-W.cam.x * u * 0.3) % ws + ws) % ws - ws;
    if (ry > 0) {
      ctx.globalAlpha = 0.3;
      for (var x = x0; x < W.w; x += ws - 1) ctx.drawImage(sky, x, ry - hs, ws, hs);
    }
    if (ry < W.h) { // the mirror image across the river (the whole city is reflected: z to z-bar)
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.translate(0, ry); ctx.scale(1, -1);
      for (var x2 = x0; x2 < W.w; x2 += ws - 1) ctx.drawImage(sky, x2, -hs, ws, hs);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawBoats(ctx, dt, S) {
    var b = W.sprites.boat; if (!b) return;
    var ry = W.toScreen(0, 0).y, u = W.unit * W.cam.zoom;
    var bw = clamp(u * 0.78, 28, 64), bh = bw * b.height / b.width; // smaller than the taxi: scenery, not a player
    if (ry < -bh || ry > W.h + bh) return;
    W.boats.forEach(function (bt, i) {
      if (!S.reduced) bt.p += bt.sp * dt;
      bt.p = ((bt.p % 1.3) + 1.3) % 1.3;
      var span = W.w + bw * 2;
      var x = ((bt.p / 1.3 * span - W.cam.x * u * 0.15) % span + span) % span - bw;
      var bob = S.reduced ? 0 : Math.sin(S.time * 1.6 + i * 2) * 1.6;
      var w = bw * bt.s, h = bh * bt.s;
      ctx.save();
      ctx.translate(x, ry - h * 0.72 + bob);
      if (bt.sp < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.globalAlpha = 0.72; ctx.drawImage(b, 0, 0, w, h);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function viewBounds() {
    var u = W.unit * W.cam.zoom;
    return {
      x0: Math.floor(W.cam.x - (W.w / 2 + W.offX) / u) - 1, x1: Math.ceil(W.cam.x + (W.w / 2 - W.offX) / u) + 1,
      y0: Math.floor(W.cam.y - (W.h / 2 - W.offY) / u) - 1, y1: Math.ceil(W.cam.y + (W.h / 2 + W.offY) / u) + 1, u: u
    };
  }

  function drawGrid(ctx) {
    var b = viewBounds(), ry = clamp(W.toScreen(0, 0).y, 0, W.h);
    ctx.lineWidth = 1;
    for (var x = b.x0; x <= b.x1; x++) {
      var px = Math.round(W.toScreen(x, 0).x) + 0.5;
      var five = x % 5 === 0;
      if (ry > 0) { ctx.strokeStyle = five ? C.gridUp5 : C.gridUp; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ry); ctx.stroke(); }
      if (ry < W.h) { ctx.strokeStyle = five ? C.gridDn5 : C.gridDn; ctx.beginPath(); ctx.moveTo(px, ry); ctx.lineTo(px, W.h); ctx.stroke(); }
    }
    for (var y = b.y0; y <= b.y1; y++) {
      if (y === 0) continue;
      var py = Math.round(W.toScreen(0, y).y) + 0.5;
      ctx.strokeStyle = y > 0 ? (y % 5 === 0 ? C.gridUp5 : C.gridUp) : (y % 5 === 0 ? C.gridDn5 : C.gridDn);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W.w, py); ctx.stroke();
    }
  }

  function drawRiver(ctx, S) {
    var u = W.unit * W.cam.zoom, ry = W.toScreen(0, 0).y, half = u * 0.26;
    if (ry < -half - 4 || ry > W.h + half + 4) return;
    var g = ctx.createLinearGradient(0, ry - half, 0, ry + half);
    g.addColorStop(0, 'rgba(90,63,168,0.65)'); g.addColorStop(0.5, 'rgba(140,107,217,0.92)'); g.addColorStop(1, 'rgba(59,37,96,0.75)');
    ctx.fillStyle = g; ctx.fillRect(0, ry - half, W.w, half * 2);
    // glints drifting downstream
    ctx.save();
    ctx.strokeStyle = 'rgba(255,241,184,0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    var off = (S.time * 26) % 60;
    for (var x = -60 + off - (W.cam.x * u) % 60; x < W.w + 60; x += 60) {
      for (var r = 0; r < 2; r++) {
        var yy = ry + (r ? half * 0.45 : -half * 0.4);
        var len = 8 + 6 * Math.sin(x * 0.07 + S.time * 2 + r);
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(x * 0.11 + S.time * 3 + r * 2);
        ctx.beginPath(); ctx.moveTo(x + r * 26, yy); ctx.lineTo(x + r * 26 + len, yy); ctx.stroke();
      }
    }
    ctx.restore();
    // the real axis itself
    ctx.strokeStyle = 'rgba(255,244,226,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, Math.round(ry) + 0.5); ctx.lineTo(W.w, Math.round(ry) + 0.5); ctx.stroke();
  }

  function pill(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.font = opts.font || '600 12px Lexend, sans-serif';
    var tw = ctx.measureText(text).width, ph = opts.h || 18, pw = tw + (opts.pad || 10);
    var align = opts.align || 'center';
    var lx = align === 'center' ? x - pw / 2 : align === 'right' ? x - pw : x;
    ctx.fillStyle = opts.bg || 'rgba(29,16,48,0.72)';
    ctx.beginPath(); ctx.roundRect(lx, y - ph / 2, pw, ph, ph / 2); ctx.fill();
    if (opts.stroke) { ctx.strokeStyle = opts.stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.fillStyle = opts.color || C.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + pw / 2, y + 1);
    return { x: lx, w: pw };
  }

  function drawAxes(ctx, S) {
    var b = viewBounds(), u = b.u, o = W.toScreen(0, 0);
    var top = W.safeTop, bottom = W.h - W.safeBottom;
    // imaginary axis: Lantern Avenue
    if (o.x > -10 && o.x < W.w + 10) {
      ctx.save();
      ctx.shadowColor = C.lantern; ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(255,214,140,0.95)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(Math.round(o.x) + 0.5, 0); ctx.lineTo(Math.round(o.x) + 0.5, W.h); ctx.stroke();
      ctx.restore();
    }
    var step = u < 34 ? 2 : 1;
    var fs = Math.round(clamp(u * 0.24, 12, 17)), LF = '600 ' + fs + 'px Lexend, sans-serif';
    function tick(text, x, y, align) {
      ctx.font = LF; ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(29,16,48,0.55)'; ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = 'rgba(255,244,226,0.95)'; ctx.fillText(text, x, y);
    }
    // real-axis numbers, pinned to the screen edge if the river is off-screen
    var ly = clamp(o.y + u * 0.5, top + 12, bottom - 14), pinned = ly !== o.y + u * 0.5;
    for (var x = b.x0; x <= b.x1; x++) {
      if (x === 0 || x % step) continue;
      var p = W.toScreen(x, 0);
      if (pinned) pill(ctx, AP.num(x), p.x, ly, { h: 16, pad: 8, font: '600 11px Lexend, sans-serif' });
      else tick(AP.num(x), p.x, ly, 'center');
    }
    // imaginary-axis numbers ("3i"), pinned to the side if Lantern Avenue is off-screen
    var lx = clamp(o.x - 8, 34, W.w - 8), pinnedY = lx !== o.x - 8;
    for (var y = b.y0; y <= b.y1; y++) {
      if (y === 0 || y % step) continue;
      var q = W.toScreen(0, y);
      if (q.y < top + 4 || q.y > bottom - 4) continue;
      var label = (y < 0 ? MINUS : '') + Math.abs(y) + 'i';
      if (pinnedY) pill(ctx, label, lx, q.y, { align: 'right', h: 16, pad: 8, font: '600 11px Lexend, sans-serif' });
      else tick(label, lx, q.y, 'right');
    }
    // origin + axis names
    if (o.x > 0 && o.x < W.w && o.y > top && o.y < bottom) {
      ctx.font = '700 12px Lexend, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.cream; ctx.fillText('0', o.x - 6, o.y + 5);
    }
    if (o.y > top && o.y < bottom) {
      pill(ctx, 'Real axis (Re)', W.w - 10, clamp(o.y - u * 0.55, top + 12, bottom - 12), { align: 'right', bg: 'rgba(90,63,168,0.85)', font: '700 12px Lexend, sans-serif' });
    }
    if (o.x > 0 && o.x < W.w) {
      pill(ctx, 'Imaginary axis (Im)', clamp(o.x + 10, 4, W.w - 150), top + 14, { align: 'left', bg: 'rgba(138,53,25,0.85)', font: '700 12px Lexend, sans-serif' });
    }
  }

  /* ---------- houses ---------- */
  function houseScreen(h, S) {
    var y = h.y, sc = 1, al = 1;
    if (S.introT < 1) {
      var p = clamp((S.introT * 1.0 - h.delay) / 0.45, 0, 1);
      y = h.y * easeInOut(p); sc = p <= 0 ? 0 : easeOutBack(p); al = clamp(p * 2, 0, 1);
    }
    var pt = W.toScreen(h.x, y);
    return { x: pt.x, y: pt.y, sc: sc, al: al };
  }

  function heartbeat(t) {
    var m = t % 1.15;
    var k1 = m < 0.14 ? Math.sin(m / 0.14 * Math.PI) : 0;
    var k2 = m > 0.24 && m < 0.38 ? Math.sin((m - 0.24) / 0.14 * Math.PI) : 0;
    return k1 * 0.22 + k2 * 0.14;
  }

  function drawHouses(ctx, S) {
    var u = W.unit * W.cam.zoom, b = viewBounds();
    // back to front, so a tall building never covers the one standing in front of it
    var order = S.houses.slice().sort(function (p, q) { return q.y - p.y; });
    var tStyle = S.target ? styleOf(S.target.a, S.target.b) : null;
    order.forEach(function (h) {
      if (h.x < b.x0 - 1 || h.x > b.x1 + 1 || h.y < b.y0 - 1 || h.y > b.y1 + 1) return;
      var p = houseScreen(h, S);
      if (p.sc <= 0) return;
      var size = u * 0.82 * p.sc, look = h.look;
      var assist = S.assistRole && S.assistRole === h.role;
      if (assist) {
        var hb = S.reduced ? 0.12 : heartbeat(S.time);
        size *= 1 + hb;
        ctx.save();
        var rg = ctx.createRadialGradient(p.x, p.y, size * 0.2, p.x, p.y, size * 1.25);
        rg.addColorStop(0, 'rgba(255,204,77,' + (0.55 + hb) + ')'); rg.addColorStop(1, 'rgba(255,204,77,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, size * 1.25, 0, 7); ctx.fill();
        ctx.restore();
      }
      if (S.onHouse === h) {
        ctx.save();
        ctx.strokeStyle = C.cream; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -S.time * 20;
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 0.78, 0, 7); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = p.al;
      // once z-bar is reached it turns into the mirror image of z's own building
      drawHouse(ctx, p.x, p.y, size, look, S.time, look === 'mirror' && tStyle ? tStyle : styleOf(h.x, h.y));
      ctx.globalAlpha = 1;
    });
  }

  function drawHouse(ctx, cx, cy, s, look, t, style) {
    var lk = look === 'powered' ? 'lit' : (look || 'dark');
    if (lk === 'failing' && Math.sin(t * 22) <= 0.2) lk = 'dark-failing';
    var spr = W.sprites['house-' + (style || 'cottage') + '-' + (lk === 'dark-failing' ? 'dark' : lk)];
    if (spr) {
      {
        // dark houses get a faint cream backlight so they stand off the dusk sky and the skyline
        var hc = lk === 'dark' ? 'rgba(255,244,226,' : lk === 'mirror' ? 'rgba(160,130,255,' : lk === 'lit' ? 'rgba(255,204,77,' : 'rgba(255,77,94,';
        var a = lk === 'dark' ? 0.16 : lk === 'failing' ? 0.55 : lk === 'dark-failing' ? 0.2 : 0.5;
        var rg0 = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 1.1);
        rg0.addColorStop(0, hc + a + ')'); rg0.addColorStop(1, hc + '0)');
        ctx.fillStyle = rg0; ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, 7); ctx.fill();
      }
      // sprite ground line sits where the canvas house's ground was (cy + 0.40 s)
      var D = s * 1.3;
      ctx.drawImage(spr, cx - D / 2, cy + s * 0.4 - D * (226 / 256), D, D);
      return;
    }
    drawHouseCanvas(ctx, cx, cy, s, look, t);
  }

  function drawHouseCanvas(ctx, cx, cy, s, look, t) {
    var wall, wall2, roof, roofDk, win, halo = null, line = C.ink;
    if (look === 'powered' || look === 'lit') {
      wall = C.cream; wall2 = C.creamDk; roof = C.terraLit; roofDk = C.terra; win = C.lantern; halo = 'rgba(255,204,77,';
    } else if (look === 'mirror') {
      wall = '#f3ecff'; wall2 = '#cbbcf2'; roof = '#9d7ff0'; roofDk = '#5a3fa8'; win = C.lanternLit; halo = 'rgba(160,130,255,';
    } else if (look === 'failing') {
      wall = '#7a5a6c'; wall2 = '#5b4258'; roof = '#8a4a4a'; roofDk = '#5e2c2c';
      win = Math.sin(t * 22) > 0.2 ? C.rose : '#4a1d26'; halo = 'rgba(255,77,94,';
    } else {
      wall = '#6b5470'; wall2 = '#4d3954'; roof = '#7d4a52'; roofDk = '#57303a'; win = '#2a1a2e';
    }
    if (halo) {
      var a = look === 'failing' ? 0.35 + 0.25 * Math.sin(t * 22) : 0.5;
      var rg = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 1.05);
      rg.addColorStop(0, halo + a + ')'); rg.addColorStop(1, halo + '0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, s * 1.05, 0, 7); ctx.fill();
    }
    // shadow
    ctx.fillStyle = 'rgba(10,4,18,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.44, s * 0.46, s * 0.09, 0, 0, 7); ctx.fill();
    // walls
    var g = ctx.createLinearGradient(0, cy - s * 0.12, 0, cy + s * 0.42);
    g.addColorStop(0, wall); g.addColorStop(1, wall2);
    ctx.fillStyle = g; ctx.strokeStyle = line; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.rect(cx - s * 0.36, cy - s * 0.12, s * 0.72, s * 0.54); ctx.fill(); ctx.stroke();
    // roof tiles
    var rg2 = ctx.createLinearGradient(0, cy - s * 0.52, 0, cy - s * 0.08);
    rg2.addColorStop(0, roof); rg2.addColorStop(1, roofDk);
    ctx.fillStyle = rg2;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.08); ctx.lineTo(cx, cy - s * 0.52); ctx.lineTo(cx + s * 0.5, cy - s * 0.08); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // window, lit from within when powered
    var ww = s * 0.24, wh = s * 0.26, wx = cx - ww / 2, wy = cy + s * 0.02;
    if (halo) {
      var wg = ctx.createRadialGradient(cx, wy + wh / 2, 1, cx, wy + wh / 2, ww);
      wg.addColorStop(0, '#fffbe8'); wg.addColorStop(1, win);
      ctx.fillStyle = wg;
    } else ctx.fillStyle = win;
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    // little power mast on the roof: a station marker
    ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(cx + s * 0.2, cy - s * 0.26); ctx.lineTo(cx + s * 0.2, cy - s * 0.46); ctx.stroke();
    ctx.fillStyle = halo ? (look === 'failing' ? win : C.lantern) : '#4d3954';
    ctx.beginPath(); ctx.arc(cx + s * 0.2, cy - s * 0.48, s * 0.05, 0, 7); ctx.fill();
  }

  /* ---------- guides: modulus line and conjugate reflection ---------- */
  function drawGuides(ctx, S) {
    var t = S.target; if (!t) return;
    var u = W.unit * W.cam.zoom;
    var O = W.toScreen(0, 0), Z = W.toScreen(t.a, t.b), A = W.toScreen(t.a, 0), Zc = W.toScreen(t.a, -t.b);
    if (S.modLine > 0) {
      var p = clamp(S.modLine, 0, 1);
      ctx.save();
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,244,226,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(A.x, A.y); ctx.lineTo(Z.x, Z.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = C.lantern; ctx.shadowBlur = 12; ctx.strokeStyle = C.lantern; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(O.x + (Z.x - O.x) * p, O.y + (Z.y - O.y) * p); ctx.stroke();
      ctx.restore();
      if (p >= 1) {
        var mod = Math.round(Math.hypot(t.a, t.b) * 100) / 100;
        pill(ctx, '|z| = ' + mod, (O.x + Z.x) / 2 - (t.b > 0 ? u * 0.4 : -u * 0.4) * Math.sign(t.a || 1), (O.y + Z.y) / 2, { bg: 'rgba(217,144,26,0.92)', color: C.ink, font: '700 13px Lexend, sans-serif', h: 20 });
        pill(ctx, 'a = ' + AP.num(t.a), (O.x + A.x) / 2, A.y + (t.b > 0 ? u * 0.85 : -u * 0.85), { h: 17, font: '600 11px Lexend, sans-serif' });
        pill(ctx, 'b = ' + AP.num(t.b), A.x + (t.a > 0 ? u * 0.75 : -u * 0.75), (A.y + Z.y) / 2, { h: 17, font: '600 11px Lexend, sans-serif' });
      }
    }
    if (S.conjLine > 0) {
      var q = clamp(S.conjLine, 0, 1);
      ctx.save();
      ctx.setLineDash([7, 7]); ctx.lineDashOffset = -S.time * 18;
      ctx.strokeStyle = C.violetLit; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(Z.x, Z.y); ctx.lineTo(Z.x, Z.y + (Zc.y - Z.y) * q); ctx.stroke();
      ctx.restore();
      if (q < 1) { // the ghost house flipping across the river
        var gy = Z.y + (Zc.y - Z.y) * easeInOut(q);
        ctx.save(); ctx.globalAlpha = 0.55;
        ctx.translate(Z.x, gy); ctx.scale(1, Math.cos(q * Math.PI) || 0.01); ctx.translate(-Z.x, -gy);
        drawHouse(ctx, Z.x, gy, u * 0.82, 'mirror', S.time, styleOf(t.a, t.b));
        ctx.restore();
      }
    }
  }

  function zbarText(ctx, text, x, y, opts) {
    // draws text then an overbar over its first character (the "z" of z-bar)
    var r = pill(ctx, text, x, y, opts);
    ctx.font = (opts && opts.font) || '600 12px Lexend, sans-serif';
    var zw = ctx.measureText('z').width, full = ctx.measureText(text).width;
    var x0 = r.x + (r.w - full) / 2;
    ctx.strokeStyle = (opts && opts.color) || C.cream; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y - 6); ctx.lineTo(x0 + zw, y - 6); ctx.stroke();
  }

  function drawLabels(ctx, S) {
    var t = S.target; if (!t) return;
    var u = W.unit * W.cam.zoom;
    if (S.zLabel) {
      var Z = W.toScreen(t.a, t.b);
      pill(ctx, 'z = ' + AP.fmtZ(t.a, t.b), Z.x, Z.y - u * 0.8, { bg: 'rgba(196,83,47,0.95)', font: '700 13px Lexend, sans-serif', h: 22, pad: 14 });
    }
    if (S.zbarLabel) {
      var Zc = W.toScreen(t.a, -t.b);
      zbarText(ctx, 'z = ' + AP.fmtZ(t.a, -t.b), Zc.x, Zc.y + u * 0.78, { bg: 'rgba(90,63,168,0.95)', font: '700 13px Lexend, sans-serif', h: 22, pad: 14 });
    }
  }

  /* ---------- the car ---------- */
  function drawCar(ctx, S) {
    var u = W.unit * W.cam.zoom, P = S.player, p = W.toScreen(P.rx, P.ry);
    var L = u * 0.62, Wd = u * 0.4;
    ctx.save();
    ctx.translate(p.x, p.y - (P.hop || 0) * u * 0.08);
    ctx.rotate(-P.dir);
    // headlight cones
    var hg = ctx.createLinearGradient(L * 0.4, 0, L * 1.9, 0);
    hg.addColorStop(0, 'rgba(255,241,184,0.42)'); hg.addColorStop(1, 'rgba(255,241,184,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(L * 0.42, -Wd * 0.32); ctx.lineTo(L * 1.9, -Wd * 1.0); ctx.lineTo(L * 1.9, Wd * 1.0); ctx.lineTo(L * 0.42, Wd * 0.32); ctx.closePath(); ctx.fill();
    var car = W.sprites.car;
    if (car) {
      // keep the sprite's own proportions; it faces right and is rotated with the car
      var cw = u * 0.74, chh = cw * car.height / car.width;
      ctx.drawImage(car, -cw / 2, -chh / 2, cw, chh);
      ctx.restore(); return;
    }
    // shadow
    ctx.fillStyle = 'rgba(10,4,18,0.45)';
    ctx.beginPath(); ctx.roundRect(-L / 2 + 2, -Wd / 2 + 4, L, Wd, Wd * 0.4); ctx.fill();
    // wheels
    ctx.fillStyle = '#22121c';
    [[-0.3, -0.56], [0.26, -0.56], [-0.3, 0.42], [0.26, 0.42]].forEach(function (w) {
      ctx.beginPath(); ctx.roundRect(L * w[0] - L * 0.08, Wd * w[1], L * 0.18, Wd * 0.14, 2); ctx.fill();
    });
    // body: glossy terracotta toy taxi
    var bg = ctx.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
    bg.addColorStop(0, C.terraLit); bg.addColorStop(0.55, C.terra); bg.addColorStop(1, '#8a3519');
    ctx.fillStyle = bg; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.5, u * 0.04);
    ctx.beginPath(); ctx.roundRect(-L / 2, -Wd / 2, L, Wd, Wd * 0.42); ctx.fill(); ctx.stroke();
    // windows
    ctx.fillStyle = C.violetLit; ctx.lineWidth = Math.max(1, u * 0.025);
    ctx.beginPath(); ctx.roundRect(L * 0.06, -Wd * 0.34, L * 0.2, Wd * 0.68, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-L * 0.36, -Wd * 0.3, L * 0.16, Wd * 0.6, 3); ctx.fill(); ctx.stroke();
    // roof light
    ctx.fillStyle = C.lantern;
    ctx.beginPath(); ctx.roundRect(-L * 0.14, -Wd * 0.18, L * 0.14, Wd * 0.36, 2); ctx.fill(); ctx.stroke();
    // shine
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-L * 0.36, -Wd * 0.4); ctx.lineTo(L * 0.3, -Wd * 0.4); ctx.stroke();
    // headlights
    ctx.fillStyle = C.lanternLit;
    ctx.beginPath(); ctx.arc(L * 0.47, -Wd * 0.28, Wd * 0.08, 0, 7); ctx.arc(L * 0.47, Wd * 0.28, Wd * 0.08, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---------- particles / floats / ambient ---------- */
  function drawParticles(ctx, dt) {
    var u = W.unit * W.cam.zoom;
    for (var i = W.particles.length - 1; i >= 0; i--) {
      var q = W.particles[i];
      q.life += dt; if (q.life >= q.max) { W.particles.splice(i, 1); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      var p = W.toScreen(q.x, q.y), k = 1 - q.life / q.max;
      ctx.globalAlpha = k; ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, q.size * (0.5 + k * 0.5), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (var j = W.floats.length - 1; j >= 0; j--) {
      var f = W.floats[j];
      f.life += dt; if (f.life >= f.max) { W.floats.splice(j, 1); continue; }
      var fp = W.toScreen(f.x, f.y), e = f.life / f.max;
      ctx.globalAlpha = 1 - Math.pow(e, 3);
      ctx.font = '800 ' + Math.round(clamp(u * 0.5, 18, 30)) + 'px "Baloo 2", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.strokeText(f.text, fp.x, fp.y - e * u * 1.4);
      ctx.fillStyle = f.color; ctx.fillText(f.text, fp.x, fp.y - e * u * 1.4);
    }
    ctx.globalAlpha = 1;
  }

  function drawMotes(ctx, dt, S) {
    var n = S.reduced ? 12 : W.motes.length;
    for (var i = 0; i < n; i++) {
      var m = W.motes[i];
      if (!S.reduced) { m.y -= m.sp * dt; m.x += Math.sin(S.time * 0.5 + m.ph) * 0.0006; }
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      var a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(S.time * 2 + m.ph));
      var x = m.x * W.w, y = m.y * W.h, r = m.s * 2.2;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      g.addColorStop(0, 'rgba(255,224,140,' + a + ')'); g.addColorStop(1, 'rgba(255,224,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    }
  }

  W.COLORS = C;
  AP.World = W;
})();
