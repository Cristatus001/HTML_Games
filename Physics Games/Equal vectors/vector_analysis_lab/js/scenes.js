/* ==========================================================================
   scenes.js — a real-world animated scene behind every case.

   Each case gets its own environment: rain falling over two yards, a lift
   shaft, a two-lane road, a moving escalator, a swimming pool, and so on.
   Everything here is PURELY DECORATIVE. It is drawn underneath the scanner
   grid and the vectors, never reads or writes gameplay state, and never
   affects a hitbox.

   Every scene is split in two so drop-in art still animates:
     bg(ctx, L)           static backdrop — skipped when assets/images/scenes/<key>.png exists
     fx(ctx, t, dt, L, s) moving elements — always drawn
   ========================================================================== */
var Scenes = (function () {
  'use strict';

  var store = {};        // key -> seeded state
  var sized = {};        // key -> "WxH" the state was seeded for

  /* ------------------------------------------------------------------ utils */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function lg(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function rg(ctx, x, y, r0, r1, stops) {
    var g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, fill) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function poly(ctx, pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function label(ctx, txt, x, y, size, col, align) {
    ctx.font = '600 ' + size.toFixed(1) + 'px Rajdhani, Segoe UI, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.fillText(txt, x, y);
  }
  /* a small standing figure — used by several scenes */
  function figure(ctx, x, yFeet, h, col, lean) {
    var hd = h * 0.19;
    ctx.save();
    ctx.translate(x, yFeet);
    ctx.rotate(lean || 0);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -h + hd, hd, 0, 6.2832); ctx.fill();
    rr(ctx, -h * 0.15, -h + hd * 1.7, h * 0.30, h * 0.46, h * 0.12); ctx.fill();
    ctx.fillRect(-h * 0.13, -h * 0.36, h * 0.10, h * 0.36);
    ctx.fillRect(h * 0.03, -h * 0.36, h * 0.10, h * 0.36);
    ctx.restore();
  }

  /* ==================================================================== */
  /* 01 — RAIN: two neighbouring yards in a downpour                      */
  /* ==================================================================== */
  var rainScene = {
    scrim: 0.20,
    seed: function (L) {
      var n = Math.round(clamp(L.W * L.H / 5200, 90, 260));
      var drops = [];
      for (var i = 0; i < n; i++) {
        drops.push({
          x: rand(-60, L.W + 60), y: rand(-L.H, L.H),
          len: rand(10, 34), sp: rand(620, 1150), a: rand(0.10, 0.42), w: rand(0.8, 1.9)
        });
      }
      var lit = [];
      for (var j = 0; j < 40; j++) lit.push(Math.random() < 0.4);
      return { drops: drops, lit: lit, splash: [] };
    },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, yG = H * 0.80, k = L.k;
      ctx.fillStyle = lg(ctx, 0, 0, 0, yG, [
        [0, '#070f1b'], [0.45, '#0e1f31'], [0.82, '#1b3a52'], [1, '#25506b']]);
      ctx.fillRect(0, 0, W, yG + 2);

      /* heavy clouds */
      for (var c = 0; c < 6; c++) {
        var cxp = (c / 5) * W + (c % 2 ? 40 : -30), cyp = H * (0.06 + (c % 3) * 0.05);
        var r0 = W * 0.16;
        ctx.fillStyle = rg(ctx, cxp, cyp, 2, r0, [[0, 'rgba(6,12,22,.85)'], [1, 'rgba(6,12,22,0)']]);
        ctx.beginPath(); ctx.arc(cxp, cyp, r0, 0, 6.2832); ctx.fill();
      }

      /* distant treeline */
      ctx.fillStyle = '#0a1a22';
      ctx.beginPath();
      ctx.moveTo(0, yG);
      for (var x = 0; x <= W; x += 26) {
        ctx.lineTo(x, yG - 26 * k - Math.abs(Math.sin(x * 0.013)) * 30 * k);
      }
      ctx.lineTo(W, yG); ctx.closePath(); ctx.fill();

      /* two houses, one per yard */
      house(ctx, W * 0.13, yG, 132 * k, L.lit, 0);
      house(ctx, W * 0.74, yG, 120 * k, L.lit, 12);

      /* wet lawn */
      ctx.fillStyle = lg(ctx, 0, yG, 0, H, [[0, '#123125'], [0.5, '#0c2118'], [1, '#07130f']]);
      ctx.fillRect(0, yG, W, H - yG);
      ctx.strokeStyle = 'rgba(150,220,255,.05)';
      ctx.lineWidth = 1;
      for (var g = 0; g < 26; g++) {
        var gy = yG + (g / 26) * (H - yG);
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      /* the fence dividing the two yards */
      var fx = W * 0.5, fh = 52 * k;
      ctx.fillStyle = '#132a33';
      for (var p = -3; p <= 3; p++) {
        ctx.fillRect(fx + p * 15 * k - 2.5 * k, yG - fh, 5 * k, fh);
      }
      ctx.fillRect(fx - 48 * k, yG - fh * 0.72, 96 * k, 4 * k);
      ctx.fillRect(fx - 48 * k, yG - fh * 0.34, 96 * k, 4 * k);
    },
    fx: function (ctx, t, dt, L, s) {
      var W = L.W, H = L.H, yG = H * 0.80;

      /* mist */
      ctx.fillStyle = rg(ctx, W * 0.5, yG, 10, W * 0.6,
        [[0, 'rgba(140,200,235,.055)'], [1, 'rgba(140,200,235,0)']]);
      ctx.fillRect(0, yG - H * 0.2, W, H * 0.3);

      /* falling rain */
      ctx.lineCap = 'round';
      for (var i = 0; i < s.drops.length; i++) {
        var d = s.drops[i];
        d.y += d.sp * dt;
        d.x += d.sp * 0.16 * dt;
        if (d.y > yG) {
          if (Math.random() < 0.10) s.splash.push({ x: d.x, y: yG + rand(0, H - yG), r: 1, a: 0.5 });
          d.y = rand(-160, -10); d.x = rand(-60, W + 40);
        }
        if (d.x > W + 60) d.x = -50;
        ctx.strokeStyle = 'rgba(178,224,255,' + d.a.toFixed(3) + ')';
        ctx.lineWidth = d.w;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.16, d.y - d.len);
        ctx.stroke();
      }

      /* splash rings on the wet lawn */
      for (var j = s.splash.length - 1; j >= 0; j--) {
        var sp = s.splash[j];
        sp.r += 46 * dt; sp.a -= 1.5 * dt;
        if (sp.a <= 0) { s.splash.splice(j, 1); continue; }
        ctx.strokeStyle = 'rgba(180,228,255,' + Math.max(0, sp.a).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.34, 0, 0, 6.2832); ctx.stroke();
      }
    }
  };
  function house(ctx, x, yG, h, lit, off) {
    var w = h * 1.15;
    poly(ctx, [[x - w / 2, yG], [x - w / 2, yG - h * 0.62], [x + w / 2, yG - h * 0.62], [x + w / 2, yG]], '#132430');
    poly(ctx, [[x - w * 0.58, yG - h * 0.62], [x, yG - h], [x + w * 0.58, yG - h * 0.62]], '#0d1b25');
    for (var i = 0; i < 4; i++) {
      var wx = x - w * 0.30 + (i % 2) * w * 0.36;
      var wy = yG - h * 0.52 + Math.floor(i / 2) * h * 0.26;
      var on = lit ? lit[(i + off) % lit.length] : (i % 2 === 0);
      ctx.fillStyle = on ? lg(ctx, 0, wy, 0, wy + h * 0.17, [[0, '#ffd79a'], [1, '#c98118']]) : '#0a141c';
      rr(ctx, wx, wy, w * 0.20, h * 0.17, 2); ctx.fill();
      if (on) {
        ctx.fillStyle = rg(ctx, wx + w * 0.10, wy + h * 0.085, 1, h * 0.24,
          [[0, 'rgba(255,190,90,.30)'], [1, 'rgba(255,190,90,0)']]);
        ctx.beginPath(); ctx.arc(wx + w * 0.10, wy + h * 0.085, h * 0.24, 0, 6.2832); ctx.fill();
      }
    }
  }

  /* ==================================================================== */
  /* 02 — ELEVATORS: a lift shaft cross-section                           */
  /* ==================================================================== */
  var liftScene = {
    scrim: 0.19,
    seed: function () {
      var lit = [];
      for (var i = 0; i < 90; i++) lit.push(Math.random() < 0.42);
      return { lit: lit, aY: 0.72, bY: 0.30 };
    },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k;
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#050b14'], [0.5, '#0a1524'], [1, '#060d18']]);
      ctx.fillRect(0, 0, W, H);

      /* facade window grid */
      var cw = 46 * k, ch = 34 * k, i = 0;
      var lit = L.lit || [];
      for (var y = H * 0.06; y < H * 0.95; y += ch * 1.9) {
        for (var x = W * 0.02; x < W * 0.98; x += cw * 1.55) {
          var on = lit.length ? lit[i++ % lit.length] : (i++ % 3 !== 1);
          ctx.fillStyle = on
            ? lg(ctx, 0, y, 0, y + ch, [[0, 'rgba(255,206,140,.42)'], [1, 'rgba(190,120,30,.16)']])
            : 'rgba(18,34,50,.55)';
          ctx.fillRect(x, y, cw, ch);
        }
      }
      ctx.fillStyle = 'rgba(4,9,16,.55)';
      ctx.fillRect(0, 0, W, H);

      /* the two shafts, either side of the play area */
      L.shafts = [
        { x: L.cx - 190 * L.S, w: 118 * k },
        { x: L.cx + 90 * L.S, w: 118 * k }
      ];
      var fh = H / 7;
      for (var sI = 0; sI < 2; sI++) {
        var sh = L.shafts[sI];
        ctx.fillStyle = lg(ctx, sh.x, 0, sh.x + sh.w, 0,
          [[0, 'rgba(10,20,32,.94)'], [0.5, 'rgba(20,38,56,.9)'], [1, 'rgba(8,16,26,.94)']]);
        ctx.fillRect(sh.x, 0, sh.w, H);
        ctx.strokeStyle = 'rgba(120,190,225,.20)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sh.x, 0, sh.w, H);
        for (var f = 1; f < 7; f++) {
          var fy = H - f * fh;
          ctx.strokeStyle = 'rgba(120,190,225,.16)';
          ctx.beginPath(); ctx.moveTo(sh.x, fy); ctx.lineTo(sh.x + sh.w, fy); ctx.stroke();
          label(ctx, String(f), sh.x + sh.w + 13 * k, fy - fh * 0.5,
            12 * k, 'rgba(150,205,235,.45)', 'left');
        }
        ctx.fillStyle = 'rgba(150,205,235,.10)';
        ctx.fillRect(sh.x + sh.w * 0.16, 0, 2.5 * k, H);
        ctx.fillRect(sh.x + sh.w * 0.82, 0, 2.5 * k, H);
      }
    },
    fx: function (ctx, t, dt, L, s) {
      if (!L.shafts) return;
      var H = L.H, k = L.k, fh = H / 7;
      s.aY -= dt * 0.045; if (s.aY < -0.15) s.aY = 1.05;
      s.bY -= dt * 0.045; if (s.bY < -0.15) s.bY = 1.05;
      car(ctx, L.shafts[0], s.aY * H, fh, k);
      car(ctx, L.shafts[1], s.bY * H, fh, k);
    }
  };
  function car(ctx, sh, y, fh, k) {
    var h = fh * 0.74, w = sh.w * 0.74, x = sh.x + (sh.w - w) / 2;
    ctx.strokeStyle = 'rgba(170,215,240,.22)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sh.x + sh.w / 2, 0); ctx.lineTo(sh.x + sh.w / 2, y - h); ctx.stroke();
    ctx.fillStyle = lg(ctx, x, y - h, x + w, y, [[0, '#2c4a63'], [0.5, '#1a3145'], [1, '#0f2131']]);
    rr(ctx, x, y - h, w, h, 3 * k); ctx.fill();
    ctx.strokeStyle = 'rgba(180,230,255,.34)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, y - h, 0, y,
      [[0, 'rgba(255,214,150,.42)'], [1, 'rgba(255,180,80,.12)']]);
    ctx.fillRect(x + w * 0.10, y - h * 0.90, w * 0.80, h * 0.80);
    figure(ctx, x + w * 0.5, y - h * 0.12, h * 0.62, 'rgba(10,20,30,.72)');
    ctx.strokeStyle = 'rgba(10,20,30,.5)';
    ctx.beginPath(); ctx.moveTo(x + w / 2, y - h * 0.9); ctx.lineTo(x + w / 2, y - h * 0.1); ctx.stroke();
    ctx.fillStyle = rg(ctx, x + w / 2, y - h / 2, 2, w * 1.5,
      [[0, 'rgba(255,190,110,.16)'], [1, 'rgba(255,190,110,0)']]);
    ctx.beginPath(); ctx.arc(x + w / 2, y - h / 2, w * 1.5, 0, 6.2832); ctx.fill();
  }

  /* ==================================================================== */
  /* 03 / 10 — ROAD: two lanes of traffic, seen from above                */
  /* ==================================================================== */
  function roadScene(night) {
    /* same speed for "Parallel Driving", clearly different for the speed check */
    var SP = night ? [230, 78] : [150, 150];
    return {
      scrim: night ? 0.15 : 0.19,
      seed: function (L) {
        var cars = [];
        for (var lane = 0; lane < 2; lane++) {
          for (var i = 0; i < 3; i++) {
            cars.push({
              lane: lane, x: (i / 3) * L.W + rand(-40, 40),
              hue: lane ? (night ? 1 : 2) : 0, size: rand(0.92, 1.08)
            });
          }
        }
        return { dash: 0, cars: cars };
      },
      bg: function (ctx, L) {
        var W = L.W, H = L.H, k = L.k;
        var half = Math.min(H * 0.24, 172 * L.S + 40);
        var rT = L.cy - half, rB = L.cy + half;
        L.road = { t: rT, b: rB, mid: (rT + rB) / 2, half: half };

        ctx.fillStyle = night
          ? lg(ctx, 0, 0, 0, rT, [[0, '#030710'], [0.6, '#071120'], [1, '#0d1c2e']])
          : lg(ctx, 0, 0, 0, rT, [[0, '#0a1c2e'], [0.55, '#16405c'], [1, '#2c6883']]);
        ctx.fillRect(0, 0, W, rT + 1);

        /* skyline */
        ctx.fillStyle = night ? '#050b14' : '#0a1a26';
        ctx.beginPath(); ctx.moveTo(0, rT);
        for (var bx = 0; bx <= W; bx += 30 * k) {
          var bh = (26 + ((bx * 7919) % 70)) * k;
          ctx.lineTo(bx, rT - bh);
          ctx.lineTo(bx + 30 * k, rT - bh);
        }
        ctx.lineTo(W, rT); ctx.closePath(); ctx.fill();
        if (night) {
          for (var wI = 0; wI < 60; wI++) {
            var wx = ((wI * 3571) % W), wy = rT - ((wI * 7919) % (70 * k)) - 6 * k;
            ctx.fillStyle = 'rgba(255,214,140,' + (0.10 + (wI % 4) * 0.07).toFixed(2) + ')';
            ctx.fillRect(wx, wy, 3 * k, 4 * k);
          }
        }

        /* verges */
        ctx.fillStyle = night
          ? lg(ctx, 0, rB, 0, H, [[0, '#0a1512'], [1, '#060d0b']])
          : lg(ctx, 0, rB, 0, H, [[0, '#123c26'], [1, '#0a2016']]);
        ctx.fillRect(0, rB, W, H - rB);
        ctx.fillStyle = night ? '#0a1512' : '#10331f';
        ctx.fillRect(0, rT - 16 * k, W, 16 * k);

        /* asphalt with a little wear */
        ctx.fillStyle = lg(ctx, 0, rT, 0, rB,
          [[0, '#20272f'], [0.10, '#333d48'], [0.48, '#3a4550'], [0.52, '#333d48'],
           [0.9, '#2a323b'], [1, '#1b2129']]);
        ctx.fillRect(0, rT, W, rB - rT);
        ctx.fillStyle = 'rgba(255,255,255,.022)';
        for (var p = 0; p < 30; p++) {
          var px = ((p * 5779) % W), py = rT + ((p * 3413) % (rB - rT));
          ctx.fillRect(px, py, (18 + (p % 5) * 14) * k, 2 * k);
        }

        /* kerbs and edge lines */
        ctx.fillStyle = night ? '#3b4653' : '#525e6c';
        ctx.fillRect(0, rT - 6 * k, W, 6 * k);
        ctx.fillRect(0, rB, W, 6 * k);
        ctx.fillStyle = 'rgba(255,255,255,.30)';
        ctx.fillRect(0, rT + 9 * k, W, 2.6 * k);
        ctx.fillRect(0, rB - 12 * k, W, 2.6 * k);

        if (night) {
          /* speed-check gantry over the carriageway */
          ctx.fillStyle = '#1d2937';
          ctx.fillRect(W * 0.62, rT - 96 * k, 8 * k, 96 * k);
          ctx.fillRect(W * 0.62, rT - 96 * k, W * 0.26, 7 * k);
          fillRR(ctx, W * 0.80, rT - 112 * k, 30 * k, 19 * k, 3 * k, '#2a3846');
          ctx.fillStyle = rg(ctx, W * 0.815, rT - 100 * k, 1, 34 * k,
            [[0, 'rgba(140,240,255,.75)'], [1, 'rgba(140,240,255,0)']]);
          ctx.beginPath(); ctx.arc(W * 0.815, rT - 100 * k, 34 * k, 0, 6.2832); ctx.fill();
          /* speed-limit plate */
          ctx.fillStyle = '#f2f6fa';
          ctx.beginPath(); ctx.arc(W * 0.30, rT - 52 * k, 20 * k, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#d02a3c';
          ctx.beginPath(); ctx.arc(W * 0.30, rT - 52 * k, 20 * k, 0, 6.2832);
          ctx.arc(W * 0.30, rT - 52 * k, 14 * k, 0, 6.2832, true); ctx.fill();
          label(ctx, '60', W * 0.30, rT - 51 * k, 17 * k, '#16202a');
          ctx.fillStyle = '#2b3846';
          ctx.fillRect(W * 0.30 - 2 * k, rT - 34 * k, 4 * k, 34 * k);
        } else {
          for (var l = 0; l < 4; l++) {
            var lx = (l + 0.5) * (W / 4);
            ctx.fillStyle = '#16232f';
            ctx.fillRect(lx - 2.5 * k, rT - 74 * k, 5 * k, 74 * k);
            ctx.fillRect(lx - 2.5 * k, rT - 74 * k, 22 * k, 4 * k);
          }
        }
      },
      fx: function (ctx, t, dt, L, s) {
        if (!L.road) return;
        var W = L.W, k = L.k, r = L.road;
        s.dash = (s.dash + dt * (night ? 150 : 120)) % (60 * k);
        ctx.fillStyle = 'rgba(255,228,150,.6)';
        for (var x = -60 * k + s.dash; x < W + 60 * k; x += 60 * k) {
          ctx.fillRect(x, r.mid - 2.6 * k, 32 * k, 5.2 * k);
        }
        for (var i = 0; i < s.cars.length; i++) {
          var c = s.cars[i];
          c.x += SP[c.lane] * dt;
          if (c.x > W + 90 * k) c.x = -90 * k;
          var y = c.lane ? r.mid + r.half * 0.5 : r.t + r.half * 0.5;
          topCar(ctx, c.x, y, 74 * k * c.size, c.hue, night);
        }
      }
    };
  }
  /* a small car seen from above, nose pointing right */
  function topCar(ctx, x, y, len, hue, night) {
    var w = len * 0.46;
    var top = hue === 0 ? '#bfeaf7' : hue === 1 ? '#ffd08a' : '#ff9aa8';
    var mid = hue === 0 ? '#3d86a3' : hue === 1 ? '#e07f1c' : '#c8384c';
    var low = hue === 0 ? '#17384a' : hue === 1 ? '#7a4306' : '#6b1c27';
    ctx.save();
    fillRR(ctx, x - len * 0.5 + 3, y - w * 0.5 + 4, len, w, w * 0.30, 'rgba(0,0,0,.34)');
    ctx.fillStyle = lg(ctx, 0, y - w * 0.5, 0, y + w * 0.5, [[0, top], [0.45, mid], [1, low]]);
    rr(ctx, x - len * 0.5, y - w * 0.5, len, w, w * 0.30); ctx.fill();
    ctx.fillStyle = 'rgba(12,26,38,.85)';
    rr(ctx, x - len * 0.10, y - w * 0.34, len * 0.30, w * 0.68, w * 0.16); ctx.fill();
    rr(ctx, x + len * 0.26, y - w * 0.30, len * 0.13, w * 0.60, w * 0.14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    rr(ctx, x - len * 0.34, y - w * 0.40, len * 0.20, w * 0.22, w * 0.10); ctx.fill();
    if (night) {
      ctx.fillStyle = rg(ctx, x + len * 0.52, y, 1, len * 0.62,
        [[0, 'rgba(255,244,205,.55)'], [1, 'rgba(255,244,205,0)']]);
      ctx.beginPath(); ctx.arc(x + len * 0.52, y, len * 0.62, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,90,90,.9)';
      ctx.fillRect(x - len * 0.52, y - w * 0.34, 3.5, w * 0.20);
      ctx.fillRect(x - len * 0.52, y + w * 0.14, 3.5, w * 0.20);
    }
    ctx.restore();
  }

  /* ==================================================================== */
  /* 04 — LIVING ROOM: two people lifting a sofa                          */
  /* ==================================================================== */
  var roomScene = {
    scrim: 0.20,
    seed: function () { return {}; },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k, yF = H * 0.78;
      ctx.fillStyle = lg(ctx, 0, 0, 0, yF, [[0, '#16202e'], [0.6, '#1b2736'], [1, '#131c28']]);
      ctx.fillRect(0, 0, W, yF);
      ctx.fillStyle = 'rgba(255,255,255,.014)';
      for (var x = 0; x < W; x += 46 * k) ctx.fillRect(x, 0, 22 * k, yF);
      /* window with night outside */
      var wx = W * 0.13, wy = H * 0.18, ww = 150 * k, wh = 130 * k;
      fillRR(ctx, wx - 7 * k, wy - 7 * k, ww + 14 * k, wh + 14 * k, 4 * k, '#0d1622');
      ctx.fillStyle = lg(ctx, 0, wy, 0, wy + wh, [[0, '#0a1830'], [1, '#122a44']]);
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(180,225,255,.5)';
      for (var st = 0; st < 12; st++) {
        ctx.fillRect(wx + ((st * 3571) % ww), wy + ((st * 7919) % (wh * 0.6)), 1.6 * k, 1.6 * k);
      }
      ctx.fillStyle = '#0d1622';
      ctx.fillRect(wx + ww / 2 - 2 * k, wy, 4 * k, wh);
      ctx.fillRect(wx, wy + wh / 2 - 2 * k, ww, 4 * k);
      /* standard lamp */
      var lx = W * 0.88;
      ctx.fillStyle = '#243444';
      ctx.fillRect(lx - 2 * k, H * 0.34, 4 * k, yF - H * 0.34);
      poly(ctx, [[lx - 26 * k, H * 0.34], [lx + 26 * k, H * 0.34], [lx + 17 * k, H * 0.24], [lx - 17 * k, H * 0.24]], '#3a4c60');
      ctx.fillStyle = rg(ctx, lx, H * 0.34, 4, 210 * k,
        [[0, 'rgba(255,198,120,.26)'], [1, 'rgba(255,198,120,0)']]);
      ctx.beginPath(); ctx.arc(lx, H * 0.34, 210 * k, 0, 6.2832); ctx.fill();
      /* skirting + floorboards */
      ctx.fillStyle = '#0c151f';
      ctx.fillRect(0, yF - 9 * k, W, 9 * k);
      ctx.fillStyle = lg(ctx, 0, yF, 0, H, [[0, '#2a1d12'], [0.5, '#1d140c'], [1, '#120c07']]);
      ctx.fillRect(0, yF, W, H - yF);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 1.4;
      for (var b = 0; b < 9; b++) {
        var by = yF + (b / 9) * (H - yF);
        ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.stroke();
      }
      L.floorY = yF;
    },
    fx: function (ctx, t, dt, L) {
      var k = L.k, yF = L.floorY || L.H * 0.78;
      var bob = Math.sin(t * 1.5) * 7 * k;
      var cx = L.cx, sw = 250 * L.S, sh = 74 * L.S;
      var y = yF - 60 * k + bob;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath();
      ctx.ellipse(cx, yF + 6 * k, sw * 0.5, 12 * k, 0, 0, 6.2832);
      ctx.fill();
      var body = lg(ctx, 0, y - sh, 0, y, [[0, '#5b4682'], [0.55, '#412f63'], [1, '#281a42']]);
      fillRR(ctx, cx - sw * 0.44, y - sh * 0.95, sw * 0.88, sh * 0.62, 10 * k, body);
      fillRR(ctx, cx - sw * 0.5, y - sh * 0.5, sw, sh * 0.55, 12 * k, body);
      fillRR(ctx, cx - sw * 0.54, y - sh * 0.62, sw * 0.11, sh * 0.7, 9 * k, body);
      fillRR(ctx, cx + sw * 0.43, y - sh * 0.62, sw * 0.11, sh * 0.7, 9 * k, body);
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fillRect(cx - sw * 0.4, y - sh * 0.92, sw * 0.8, 2.5 * k);
      ctx.restore();
      figure(ctx, cx - sw * 0.62, yF + bob * 0.25, 108 * k, 'rgba(8,16,24,.85)', -0.05);
      figure(ctx, cx + sw * 0.62, yF + bob * 0.25, 108 * k, 'rgba(8,16,24,.85)', 0.05);
      ctx.strokeStyle = 'rgba(8,16,24,.85)';
      ctx.lineWidth = 7 * k; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - sw * 0.62, yF - 74 * k + bob * 0.25);
      ctx.lineTo(cx - sw * 0.5, y - sh * 0.3);
      ctx.moveTo(cx + sw * 0.62, yF - 74 * k + bob * 0.25);
      ctx.lineTo(cx + sw * 0.5, y - sh * 0.3);
      ctx.stroke();
    }
  };

  /* ==================================================================== */
  /* 05 — PIANO: low C and high C struck with the same force              */
  /* ==================================================================== */
  var pianoScene = {
    scrim: 0.19,
    seed: function () { return { rings: [], last: -1 }; },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k;
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#0a0f1a'], [0.6, '#10151f'], [1, '#070a11']]);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rg(ctx, W * 0.5, H * 0.1, 10, H * 0.95,
        [[0, 'rgba(255,232,190,.13)'], [1, 'rgba(255,232,190,0)']]);
      ctx.fillRect(0, 0, W, H);

      var kbY = H * 0.66, kbH = H * 0.30;
      fillRR(ctx, -10, kbY - 22 * k, W + 20, 22 * k, 4 * k,
        lg(ctx, 0, kbY - 22 * k, 0, kbY, [[0, '#2b1c10'], [1, '#150d07']]));
      ctx.fillStyle = '#0b0d12';
      ctx.fillRect(0, kbY, W, kbH);

      var white = 40 * k, n = Math.ceil(W / white) + 1;
      L.keys = { y: kbY, h: kbH, w: white, n: n };
      for (var i = 0; i < n; i++) {
        var x = i * white;
        var g = lg(ctx, 0, kbY, 0, kbY + kbH, [[0, '#ffffff'], [0.55, '#e7eef6'], [1, '#9fb0c1']]);
        fillRR(ctx, x + 1.5, kbY, white - 3, kbH, 3 * k, g);
      }
      var pat = [1, 1, 0, 1, 1, 1, 0];
      for (var j = 0; j < n; j++) {
        if (!pat[j % 7]) continue;
        var bg2 = lg(ctx, 0, kbY, 0, kbY + kbH * 0.62, [[0, '#20262f'], [1, '#05070b']]);
        fillRR(ctx, j * white + white * 0.68, kbY, white * 0.62, kbH * 0.62, 2.5 * k, bg2);
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, kbY, W, 4 * k);
    },
    fx: function (ctx, t, dt, L, s) {
      if (!L.keys) return;
      var K = L.keys, k = L.k;
      var beat = Math.floor(t / 1.15);
      var ph = (t / 1.15) % 1;
      var down = ph < 0.28 ? 1 - ph / 0.28 : 0;
      var lowI = Math.max(1, Math.round(K.n * 0.20));
      var hiI = Math.min(K.n - 2, Math.round(K.n * 0.78));
      if (beat !== s.last) {
        s.last = beat;
        s.rings.push({ x: (lowI + 0.5) * K.w, y: K.y, r: 4, a: 0.5 });
        s.rings.push({ x: (hiI + 0.5) * K.w, y: K.y, r: 4, a: 0.5 });
      }
      [lowI, hiI].forEach(function (i) {
        var x = i * K.w;
        ctx.fillStyle = lg(ctx, 0, K.y, 0, K.y + K.h,
          [[0, 'rgba(255,240,205,' + (0.55 + 0.4 * down).toFixed(2) + ')'],
           [1, 'rgba(240,160,40,' + (0.45 + 0.4 * down).toFixed(2) + ')']]);
        rr(ctx, x + 1.5, K.y, K.w - 3, K.h, 3 * k); ctx.fill();
        ctx.fillStyle = rg(ctx, x + K.w / 2, K.y, 2, K.w * 3.2,
          [[0, 'rgba(255,190,90,' + (0.30 * (0.4 + down)).toFixed(3) + ')'],
           [1, 'rgba(255,190,90,0)']]);
        ctx.beginPath(); ctx.arc(x + K.w / 2, K.y, K.w * 3.2, 0, 6.2832); ctx.fill();
      });
      for (var r = s.rings.length - 1; r >= 0; r--) {
        var ring = s.rings[r];
        ring.r += 74 * dt; ring.y -= 24 * dt; ring.a -= 1.05 * dt;
        if (ring.a <= 0) { s.rings.splice(r, 1); continue; }
        ctx.strokeStyle = 'rgba(255,206,130,' + Math.max(0, ring.a).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(ring.x, ring.y, ring.r, ring.r * 0.38, 0, 0, 6.2832);
        ctx.stroke();
      }
    }
  };

  /* ==================================================================== */
  /* 06 — ESCALATORS: one going up, one going down, steps really moving   */
  /* ==================================================================== */
  var escScene = {
    scrim: 0.16,
    seed: function () { return { off: 0 }; },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k;
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#0b1523'], [0.5, '#101d2c'], [1, '#080f18']]);
      ctx.fillRect(0, 0, W, H);

      var upperY = L.cy - 130 * L.S;
      var lowerY = L.cy + 155 * L.S;
      L.esc = { upperY: upperY, lowerY: lowerY };

      /* ceiling slab, anchored to the upper concourse */
      var ceil = Math.max(H * 0.05, upperY - 250 * k);
      ctx.fillStyle = lg(ctx, 0, 0, 0, ceil, [[0, '#060c15'], [1, '#0e1a28']]);
      ctx.fillRect(0, 0, W, ceil);
      ctx.fillStyle = '#16232f';
      ctx.fillRect(0, ceil - 10 * k, W, 10 * k);
      for (var c = 0; c < 4; c++) {
        var lx = (c + 0.5) * (W / 4);
        fillRR(ctx, lx - 62 * k, ceil - 6 * k, 124 * k, 9 * k, 4 * k, 'rgba(200,240,255,.32)');
        ctx.fillStyle = rg(ctx, lx, ceil, 4, 210 * k,
          [[0, 'rgba(170,225,255,.13)'], [1, 'rgba(170,225,255,0)']]);
        ctx.beginPath(); ctx.arc(lx, ceil, 210 * k, 0, 6.2832); ctx.fill();
      }

      /* lit shopfronts behind the upper concourse */
      var shopH = Math.max(40 * k, (upperY - 74 * k) - ceil);
      for (var sh2 = 0; sh2 < Math.ceil(W / (128 * k)); sh2++) {
        var sx2 = sh2 * 128 * k + 8 * k, warm = sh2 % 3 !== 1;
        ctx.fillStyle = warm
          ? lg(ctx, 0, ceil, 0, ceil + shopH, [[0, 'rgba(255,206,140,.20)'], [1, 'rgba(190,120,30,.07)']])
          : lg(ctx, 0, ceil, 0, ceil + shopH, [[0, 'rgba(150,220,255,.14)'], [1, 'rgba(60,120,170,.05)']]);
        ctx.fillRect(sx2, ceil, 112 * k, shopH);
        ctx.fillStyle = 'rgba(10,20,32,.75)';
        ctx.fillRect(sx2 + 112 * k, ceil, 16 * k, shopH);
        ctx.fillStyle = 'rgba(190,235,255,.16)';
        ctx.fillRect(sx2, ceil + 4 * k, 112 * k, 3 * k);
      }
      ctx.fillStyle = 'rgba(6,12,20,.45)';
      ctx.fillRect(0, ceil, W, shopH);

      /* upper floor slab + balustrade */
      ctx.fillStyle = lg(ctx, 0, upperY - 16 * k, 0, upperY + 12 * k,
        [[0, '#2b3d51'], [0.55, '#1b2a3a'], [1, '#0d1825']]);
      ctx.fillRect(0, upperY - 16 * k, W, 28 * k);
      ctx.fillStyle = 'rgba(190,235,255,.16)';
      ctx.fillRect(0, upperY - 16 * k, W, 2 * k);
      for (var g = 0; g < Math.ceil(W / (76 * k)); g++) {
        var gx = g * 76 * k + 5 * k;
        ctx.fillStyle = 'rgba(150,215,245,.055)';
        ctx.fillRect(gx, upperY - 74 * k, 66 * k, 58 * k);
        ctx.strokeStyle = 'rgba(180,230,255,.16)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(gx, upperY - 74 * k, 66 * k, 58 * k);
      }

      /* lower floor */
      ctx.fillStyle = lg(ctx, 0, lowerY, 0, H, [[0, '#16202c'], [1, '#0a121b']]);
      ctx.fillRect(0, lowerY, W, H - lowerY);
      ctx.fillStyle = 'rgba(190,235,255,.14)';
      ctx.fillRect(0, lowerY, W, 2 * k);
      ctx.strokeStyle = 'rgba(160,215,245,.05)';
      for (var tx = 0; tx < W; tx += 54 * k) {
        ctx.beginPath(); ctx.moveTo(tx, lowerY); ctx.lineTo(tx - 40 * k, H); ctx.stroke();
      }
      for (var ty = lowerY; ty < H; ty += 26 * k) {
        ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke();
      }
    },
    fx: function (ctx, t, dt, L, s) {
      if (!L.esc) return;
      s.off = (s.off + dt * 34) % 1e6;
      var S = L.S, U = L.esc.upperY, D = L.esc.lowerY;
      /* left run climbs to the upper floor, right run descends to the lower one */
      escalator(ctx, L, s.off, L.cx - 215 * S, D, L.cx - 30 * S, U, +1);
      escalator(ctx, L, s.off, L.cx + 30 * S, U, L.cx + 215 * S, D, -1);
    }
  };
  function escalator(ctx, L, off, x0, y0, x1, y1, dir) {
    var k = L.k;
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.hypot(dx, dy);
    if (len < 1) return;
    var ux = dx / len, uy = dy / len;      // along the slope
    var nx = -uy, ny = ux;                 // across the slope
    var wide = 58 * k;
    var step = 26 * k;

    ctx.save();
    /* truss underneath */
    poly(ctx, [
      [x0 + nx * wide * 0.5, y0 + ny * wide * 0.5],
      [x1 + nx * wide * 0.5, y1 + ny * wide * 0.5],
      [x1 - nx * wide * 0.5, y1 - ny * wide * 0.5 + 26 * k],
      [x0 - nx * wide * 0.5, y0 - ny * wide * 0.5 + 26 * k]
    ], 'rgba(12,22,34,.92)');

    /* step band */
    ctx.beginPath();
    ctx.moveTo(x0 + nx * wide * 0.5, y0 + ny * wide * 0.5);
    ctx.lineTo(x1 + nx * wide * 0.5, y1 + ny * wide * 0.5);
    ctx.lineTo(x1 - nx * wide * 0.5, y1 - ny * wide * 0.5);
    ctx.lineTo(x0 - nx * wide * 0.5, y0 - ny * wide * 0.5);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = 'rgba(22,34,48,.95)';
    ctx.fill();

    /* the moving stairs: treads slide along the slope */
    var phase = ((dir > 0 ? -off : off) % step + step) % step;
    var count = Math.ceil(len / step) + 2;
    for (var i = -1; i < count; i++) {
      var d = i * step + phase;
      var sx = x0 + ux * d, sy = y0 + uy * d;
      ctx.fillStyle = lg(ctx, sx - nx * wide * 0.5, sy - ny * wide * 0.5,
        sx + nx * wide * 0.5, sy + ny * wide * 0.5,
        [[0, '#4a6480'], [0.5, '#33485e'], [1, '#223346']]);
      ctx.beginPath();
      ctx.moveTo(sx - nx * wide * 0.5, sy - ny * wide * 0.5);
      ctx.lineTo(sx + nx * wide * 0.5, sy + ny * wide * 0.5);
      ctx.lineTo(sx + nx * wide * 0.5 + ux * step * 0.62, sy + ny * wide * 0.5 + uy * step * 0.62);
      ctx.lineTo(sx - nx * wide * 0.5 + ux * step * 0.62, sy - ny * wide * 0.5 + uy * step * 0.62);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(190,235,255,.30)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx - nx * wide * 0.5, sy - ny * wide * 0.5);
      ctx.lineTo(sx + nx * wide * 0.5, sy + ny * wide * 0.5);
      ctx.stroke();
    }
    ctx.restore();

    /* riders standing on the treads, carried with the steps */
    var ridePhase = ((dir > 0 ? -off : off) / (step * 3.6)) % 1;
    for (var r = 0; r < 2; r++) {
      var rd = (((ridePhase + r * 0.5) % 1) + 1) % 1 * len;
      if (rd < len * 0.08 || rd > len * 0.92) continue;
      figure(ctx, x0 + ux * rd, y0 + uy * rd - 2 * k, 62 * k, 'rgba(8,15,24,.85)');
    }

    /* handrail: a thick band that catches the light and slides */
    var hx = nx * wide * 0.52, hy = ny * wide * 0.52;
    ctx.lineWidth = 7 * k; ctx.lineCap = 'round';
    ctx.strokeStyle = lg(ctx, x0, y0, x1, y1,
      [[0, '#22384c'], [0.5, '#3d5f7c'], [1, '#22384c']]);
    ctx.beginPath();
    ctx.moveTo(x0 - hx, y0 - hy - 54 * k);
    ctx.lineTo(x1 - hx, y1 - hy - 54 * k);
    ctx.stroke();
    /* balustrade glass */
    poly(ctx, [
      [x0 - hx, y0 - hy], [x1 - hx, y1 - hy],
      [x1 - hx, y1 - hy - 54 * k], [x0 - hx, y0 - hy - 54 * k]
    ], 'rgba(150,215,245,.07)');
    /* travelling highlight so the rail visibly moves */
    var hp = (dir > 0 ? 1 - (off / 160) % 1 : (off / 160) % 1);
    var gx2 = x0 + ux * len * hp, gy2 = y0 + uy * len * hp;
    ctx.strokeStyle = 'rgba(200,245,255,.5)';
    ctx.lineWidth = 6 * k;
    ctx.beginPath();
    ctx.moveTo(gx2 - hx - ux * 22 * k, gy2 - hy - uy * 22 * k - 54 * k);
    ctx.lineTo(gx2 - hx + ux * 22 * k, gy2 - hy + uy * 22 * k - 54 * k);
    ctx.stroke();

    /* comb plate + direction arrow at the boarding end */
    var bx = dir > 0 ? x0 : x1, by = dir > 0 ? y0 : y1;
    fillRR(ctx, bx - 26 * k, by - 4 * k, 52 * k, 9 * k, 3 * k, '#46617d');
    var ax = bx, ay = by + 20 * k;
    ctx.fillStyle = dir > 0 ? 'rgba(80,240,170,.85)' : 'rgba(255,150,90,.85)';
    ctx.beginPath();
    if (dir > 0) { ctx.moveTo(ax, ay - 11 * k); ctx.lineTo(ax + 9 * k, ay + 4 * k); ctx.lineTo(ax - 9 * k, ay + 4 * k); }
    else { ctx.moveTo(ax, ay + 11 * k); ctx.lineTo(ax + 9 * k, ay - 4 * k); ctx.lineTo(ax - 9 * k, ay - 4 * k); }
    ctx.closePath(); ctx.fill();
  }

  /* ==================================================================== */
  /* 07 — MARCHING BAND: a field, one column forward, one to the right    */
  /* ==================================================================== */
  var fieldScene = {
    scrim: 0.19,
    seed: function () {
      var a = [], b = [];
      for (var i = 0; i < 5; i++) { a.push({ o: i * 0.2 }); b.push({ o: i * 0.2 }); }
      return { a: a, b: b };
    },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k, hz = H * 0.30;
      ctx.fillStyle = lg(ctx, 0, 0, 0, hz, [[0, '#050b16'], [1, '#122236']]);
      ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = '#0a1420';
      ctx.fillRect(0, hz - 46 * k, W, 46 * k);
      for (var s = 0; s < 5; s++) {
        var lx = (s + 0.5) * (W / 5);
        ctx.fillStyle = '#16232f';
        ctx.fillRect(lx - 2 * k, hz - 118 * k, 4 * k, 74 * k);
        fillRR(ctx, lx - 20 * k, hz - 132 * k, 40 * k, 16 * k, 3 * k, '#2b3d4e');
        ctx.fillStyle = rg(ctx, lx, hz - 124 * k, 3, 200 * k,
          [[0, 'rgba(215,245,255,.16)'], [1, 'rgba(215,245,255,0)']]);
        ctx.beginPath(); ctx.arc(lx, hz - 124 * k, 200 * k, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = lg(ctx, 0, hz, 0, H, [[0, '#123a24'], [0.5, '#0d2c1b'], [1, '#0a2216']]);
      ctx.fillRect(0, hz, W, H - hz);
      ctx.strokeStyle = 'rgba(230,255,240,.13)';
      ctx.lineWidth = 1.6;
      for (var i = 0; i <= 10; i++) {
        var f = i / 10;
        var y = hz + Math.pow(f, 1.7) * (H - hz);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        if (i % 2 === 0 && i > 0) {
          label(ctx, String(50 - Math.abs(50 - i * 10)), W * 0.08, y - 9 * k,
            11 * k + f * 6 * k, 'rgba(230,255,240,.22)');
        }
      }
      var vSp = W / 9;
      for (var v = 0; v <= 9; v++) {
        var vx = v * vSp;
        ctx.strokeStyle = 'rgba(230,255,240,.05)';
        ctx.beginPath();
        ctx.moveTo(W * 0.5 + (vx - W * 0.5) * 0.55, hz);
        ctx.lineTo(vx, H); ctx.stroke();
      }
      L.hz = hz;
    },
    fx: function (ctx, t, dt, L, s) {
      var k = L.k, S = L.S;
      var colX = L.cx - 50 * S, rowY = L.cy;
      for (var i = 0; i < s.a.length; i++) {
        var p = ((t * 0.11 + s.a[i].o) % 1);
        marcher(ctx, colX, L.cy + 150 * S - p * 300 * S, 46 * k, t + i, 'rgba(255,232,190,.9)');
      }
      for (var j = 0; j < s.b.length; j++) {
        var q = ((t * 0.11 + s.b[j].o) % 1);
        marcher(ctx, L.cx - 100 * S + q * 300 * S, rowY, 46 * k, t + j, 'rgba(190,225,255,.9)');
      }
    }
  };
  function marcher(ctx, x, y, h, ph, plume) {
    var bob = Math.sin(ph * 7) * h * 0.06;
    figure(ctx, x, y + bob, h, 'rgba(8,16,26,.9)');
    ctx.fillStyle = plume;
    ctx.fillRect(x - h * 0.045, y - h * 1.16 + bob, h * 0.09, h * 0.16);
    ctx.fillStyle = 'rgba(220,235,250,.75)';
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.42 + bob, h * 0.13, h * 0.10, 0, 0, 6.2832);
    ctx.fill();
  }

  /* ==================================================================== */
  /* 08 — POOL: lane 1 and lane 8, perfectly synced                       */
  /* ==================================================================== */
  var poolScene = {
    scrim: 0.16,
    seed: function () { return { sw: [{ p: 0.1 }, { p: 0.1 }], wake: [] }; },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k;
      var top = L.cy - 190 * L.S, bot = L.cy + 190 * L.S;
      top = Math.max(top, H * 0.10); bot = Math.min(bot, H * 0.94);
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#16222e'], [1, '#0e1721']]);
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(180,225,250,.05)';
      for (var dx = 0; dx < W; dx += 40 * k) {
        ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, H); ctx.stroke();
      }
      ctx.fillStyle = lg(ctx, 0, top, 0, bot,
        [[0, '#093f56'], [0.35, '#0b5570'], [0.7, '#094a63'], [1, '#06354a']]);
      ctx.fillRect(0, top, W, bot - top);
      ctx.fillStyle = '#dfeaf3';
      ctx.fillRect(0, top - 7 * k, W, 7 * k);
      ctx.fillRect(0, bot, W, 7 * k);

      L.pool = { top: top, bot: bot };
      var lh = (bot - top) / 8;
      for (var l = 0; l < 8; l++) {
        var ly = top + (l + 0.5) * lh;
        ctx.strokeStyle = 'rgba(10,40,60,.45)';
        ctx.lineWidth = 7 * k;
        ctx.setLineDash([46 * k, 26 * k]);
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, String(l + 1), 16 * k, ly, 13 * k, 'rgba(225,245,255,.4)');
      }
      /* lane ropes: alternating floats, kept quiet so the vectors stay dominant */
      for (var r = 1; r < 8; r++) {
        var ry = top + r * lh;
        ctx.strokeStyle = 'rgba(8,44,64,.5)';
        ctx.lineWidth = 2 * k;
        ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();
        for (var b = 0; b < Math.ceil(W / (26 * k)); b++) {
          var bx = b * 26 * k + 10 * k;
          ctx.fillStyle = (Math.floor(b / 5) % 2) ? 'rgba(226,236,244,.6)' : 'rgba(196,72,64,.6)';
          ctx.beginPath(); ctx.arc(bx, ry, 3.4 * k, 0, 6.2832); ctx.fill();
        }
      }
      for (var s2 = 0; s2 < 8; s2++) {
        fillRR(ctx, -2, top + (s2 + 0.5) * lh - 11 * k, 20 * k, 22 * k, 3 * k, '#25384a');
      }
    },
    fx: function (ctx, t, dt, L, s) {
      if (!L.pool) return;
      var W = L.W, k = L.k, P = L.pool, lh = (P.bot - P.top) / 8;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, P.top, W, P.bot - P.top); ctx.clip();
      ctx.strokeStyle = 'rgba(200,245,255,.075)';
      ctx.lineWidth = 2.2 * k;
      for (var c = 0; c < 16; c++) {
        ctx.beginPath();
        for (var x = 0; x <= W; x += 22) {
          var y = P.top + (c / 16) * (P.bot - P.top)
                + Math.sin(x * 0.012 + t * 1.5 + c) * 5 * k
                + Math.sin(x * 0.031 - t * 0.9 + c * 2) * 3 * k;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      [0, 7].forEach(function (lane, idx) {
        var st = s.sw[idx];
        st.p += dt * 0.10;
        if (st.p > 1.12) st.p = -0.10;
        var x = st.p * W;
        var y = P.top + (lane + 0.5) * lh;
        if (Math.random() < 0.55) s.wake.push({ x: x - 14 * k, y: y + rand(-6, 6) * k, r: 2, a: 0.5 });
        ctx.fillStyle = 'rgba(255,190,90,.92)';
        ctx.beginPath();
        ctx.ellipse(x, y, 22 * k, 9 * k, 0, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 20 * k, y - 2 * k, 8 * k, 0, 6.2832); ctx.fill();
        var arm = Math.sin(t * 5 + idx * 0.1);
        ctx.strokeStyle = 'rgba(255,205,120,.92)';
        ctx.lineWidth = 6 * k; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 8 * k, y);
        ctx.lineTo(x + 26 * k + arm * 12 * k, y - 16 * k - Math.abs(arm) * 12 * k);
        ctx.stroke();
        ctx.fillStyle = 'rgba(235,252,255,.55)';
        for (var f = 0; f < 4; f++) {
          ctx.beginPath();
          ctx.arc(x - 26 * k - f * 7 * k, y + Math.sin(t * 12 + f) * 5 * k,
            (3.4 - f * 0.6) * k, 0, 6.2832);
          ctx.fill();
        }
      });
      for (var w = s.wake.length - 1; w >= 0; w--) {
        var wk = s.wake[w];
        wk.r += 26 * dt; wk.a -= 1.1 * dt; wk.x -= 10 * dt;
        if (wk.a <= 0) { s.wake.splice(w, 1); continue; }
        ctx.strokeStyle = 'rgba(235,252,255,' + Math.max(0, wk.a * 0.7).toFixed(3) + ')';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(wk.x, wk.y, wk.r, 0, 6.2832); ctx.stroke();
      }
      ctx.restore();
    }
  };

  /* ==================================================================== */
  /* 09 — PARK: walking the dog at dusk                                   */
  /* ==================================================================== */
  var parkScene = {
    scrim: 0.20,
    seed: function (L) {
      var f = [];
      for (var i = 0; i < 26; i++) {
        f.push({ x: rand(0, L.W), y: rand(L.H * 0.35, L.H), ph: rand(0, 6.28), sp: rand(6, 22) });
      }
      return { flies: f };
    },
    bg: function (ctx, L) {
      var W = L.W, H = L.H, k = L.k, hz = H * 0.44;
      ctx.fillStyle = lg(ctx, 0, 0, 0, hz,
        [[0, '#101a34'], [0.45, '#2a2a4a'], [0.78, '#5a3a52'], [1, '#8a5450']]);
      ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = rg(ctx, W * 0.78, hz - 8 * k, 4, 150 * k,
        [[0, 'rgba(255,190,120,.55)'], [0.4, 'rgba(255,140,90,.18)'], [1, 'rgba(255,140,90,0)']]);
      ctx.beginPath(); ctx.arc(W * 0.78, hz - 8 * k, 150 * k, 0, 6.2832); ctx.fill();
      for (var i = 0; i < 9; i++) {
        var tx = (i * 0.13 + 0.03) * W + ((i * 7919) % 40) * k;
        var th = (108 + ((i * 3571) % 70)) * k;
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(tx - 4 * k, hz - th * 0.42, 8 * k, th * 0.42);
        ctx.beginPath();
        ctx.ellipse(tx, hz - th * 0.62, th * 0.30, th * 0.34, 0, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(tx - th * 0.16, hz - th * 0.46, th * 0.22, th * 0.22, 0, 0, 6.2832);
        ctx.fill();
      }
      ctx.fillStyle = lg(ctx, 0, hz, 0, H, [[0, '#12281e'], [0.5, '#0d1e17'], [1, '#08130f']]);
      ctx.fillRect(0, hz, W, H - hz);
      ctx.fillStyle = lg(ctx, 0, hz, 0, H, [[0, '#2a2620'], [1, '#3a342b']]);
      ctx.beginPath();
      ctx.moveTo(L.cx - 26 * L.S, hz);
      ctx.lineTo(L.cx + 26 * L.S, hz);
      ctx.lineTo(L.cx + 150 * L.S, H);
      ctx.lineTo(L.cx - 150 * L.S, H);
      ctx.closePath(); ctx.fill();
      for (var p = 0; p < 2; p++) {
        var px = L.cx + (p ? 210 : -220) * L.S, py = hz + (p ? 90 : 40) * k;
        ctx.fillStyle = '#0e1520';
        ctx.fillRect(px - 2.5 * k, py - 128 * k, 5 * k, 128 * k);
        fillRR(ctx, px - 10 * k, py - 142 * k, 20 * k, 17 * k, 5 * k, '#1a2330');
        ctx.fillStyle = rg(ctx, px, py - 133 * k, 2, 130 * k,
          [[0, 'rgba(255,214,150,.42)'], [1, 'rgba(255,214,150,0)']]);
        ctx.beginPath(); ctx.arc(px, py - 133 * k, 130 * k, 0, 6.2832); ctx.fill();
      }
      L.hz = hz;
    },
    fx: function (ctx, t, dt, L, s) {
      var k = L.k, S = L.S;
      var bob = Math.abs(Math.sin(t * 2.4)) * 4 * k;
      var px = L.cx - 50 * S, py = L.cy + 150 * S;
      var dx2 = L.cx + 50 * S, dy2 = L.cy + 150 * S;
      ctx.strokeStyle = 'rgba(230,240,250,.42)';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(px + 10 * k, py - 74 * k + bob);
      ctx.quadraticCurveTo((px + dx2) / 2, py - 44 * k + Math.sin(t * 2) * 6 * k,
        dx2 - 12 * k, dy2 - 24 * k);
      ctx.stroke();
      figure(ctx, px, py + bob, 104 * k, 'rgba(8,14,22,.9)');
      dog(ctx, dx2, dy2, 40 * k, t);
      for (var i = 0; i < s.flies.length; i++) {
        var f = s.flies[i];
        f.x += Math.cos(f.ph + t * 0.6) * f.sp * dt;
        f.y += Math.sin(f.ph * 1.7 + t * 0.5) * f.sp * 0.6 * dt;
        if (f.x < -10) f.x = L.W + 10; else if (f.x > L.W + 10) f.x = -10;
        var a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3 + f.ph));
        ctx.fillStyle = 'rgba(255,236,150,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(f.x, f.y, 1.9 * k, 0, 6.2832); ctx.fill();
      }
    }
  };
  function dog(ctx, x, yFeet, h, t) {
    var st = Math.sin(t * 7) * h * 0.16;
    ctx.save();
    ctx.fillStyle = 'rgba(8,14,22,.9)';
    rr(ctx, x - h * 0.55, yFeet - h * 0.72, h * 1.02, h * 0.42, h * 0.18); ctx.fill();
    ctx.beginPath();
    ctx.arc(x + h * 0.52, yFeet - h * 0.84, h * 0.20, 0, 6.2832); ctx.fill();
    poly(ctx, [[x + h * 0.66, yFeet - h * 0.86], [x + h * 0.92, yFeet - h * 0.80],
               [x + h * 0.66, yFeet - h * 0.70]], 'rgba(8,14,22,.9)');
    poly(ctx, [[x + h * 0.42, yFeet - h * 0.98], [x + h * 0.36, yFeet - h * 1.22],
               [x + h * 0.58, yFeet - h * 1.02]], 'rgba(8,14,22,.9)');
    ctx.lineWidth = h * 0.11; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(8,14,22,.9)';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.34, yFeet - h * 0.34); ctx.lineTo(x - h * 0.34 - st, yFeet);
    ctx.moveTo(x + h * 0.30, yFeet - h * 0.34); ctx.lineTo(x + h * 0.30 + st, yFeet);
    ctx.moveTo(x - h * 0.54, yFeet - h * 0.60);
    ctx.lineTo(x - h * 0.80, yFeet - h * 0.86 - Math.sin(t * 7) * h * 0.10);
    ctx.stroke();
    ctx.restore();
  }

  /* ==================================================================== */
  var REG = {
    rain: rainScene,
    lift: liftScene,
    road: roadScene(false),
    room: roomScene,
    piano: pianoScene,
    escalator: escScene,
    field: fieldScene,
    pool: poolScene,
    park: parkScene,
    highway: roadScene(true)
  };

  /* ------------------------------------------------------------------ api */
  function reset(key) { delete store[key]; delete sized[key]; }
  function has(key) { return !!REG[key]; }
  function scrim(key) { return REG[key] ? REG[key].scrim : 0.2; }

  function draw(ctx, key, t, dt, L) {
    var sc = REG[key];
    if (!sc) return false;
    var tag = Math.round(L.W) + 'x' + Math.round(L.H);
    if (!store[key] || sized[key] !== tag) {
      store[key] = sc.seed(L) || {};
      sized[key] = tag;
    }
    var s = store[key];
    /* a few scenes want their seeded values while drawing the backdrop */
    L.lit = s.lit;
    L.k = clamp(Math.min(L.W / 900, L.H / 680), 0.42, 1.35);

    ctx.save();
    var img = Assets.get('scene/' + key);
    if (img && img.naturalWidth) {
      /* drop-in artwork replaces the painted backdrop; the animation stays */
      var ar = img.naturalWidth / img.naturalHeight, vr = L.W / L.H, dw, dh;
      if (vr > ar) { dw = L.W; dh = L.W / ar; } else { dh = L.H; dw = L.H * ar; }
      ctx.drawImage(img, (L.W - dw) / 2, (L.H - dh) / 2, dw, dh);
      /* scenes place their anchors during bg(), so run it invisibly */
      ctx.save(); ctx.globalAlpha = 0; sc.bg(ctx, L); ctx.restore();
    } else {
      sc.bg(ctx, L);
    }
    ctx.restore();

    ctx.save();
    sc.fx(ctx, t, dt, L, s);
    ctx.restore();
    return true;
  }

  return { draw: draw, reset: reset, has: has, scrim: scrim, keys: Object.keys(REG) };
})();
