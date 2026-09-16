/* ==========================================================================
   game.js — the Vector Analysis Lab simulation.

   Gameplay is unchanged from the original build:
     • drag the amber (player) vector by its tail onto the reference tail
     • dropping it within the snap radius runs the scanner
     • magnitude match  = |ref| - |ply|  <  5 units
     • direction match  = smallest angle between them < 0.1 rad
     • both true -> EQUAL (glow + colour rain), otherwise the failing
       property is reported
   Everything else here is presentation, input robustness and juice.
   ========================================================================== */
var Game = (function () {
  'use strict';

  var cvs, ctx, W = 0, H = 0, dpr = 1;
  var mode = 'off';                 // 'off' | 'play' | 'fx'
  var levelIdx = 0;
  var isAnalysed = false;
  var arrows = [];
  var drag = null, dragOff = { x: 0, y: 0 };
  var particles = [], ripples = [], sparks = [];
  var scanT = -1;                   // scan sweep timer (seconds)
  var S = 1, cx = 0, cy = 0;
  var pendingTimers = [];

  /* content box the ten cases are authored against (unscaled units) */
  var BOX_W = 470, BOX_H = 405;

  /* ---------------------------------------------------------------- utils */
  function clearTimers() {
    for (var i = 0; i < pendingTimers.length; i++) clearTimeout(pendingTimers[i]);
    pendingTimers = [];
  }
  function later(fn, ms) { pendingTimers.push(setTimeout(fn, ms)); }
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------------------------------------------------------- layout */
  function insets() {
    var hud = $('hud');
    var top = (hud ? hud.offsetHeight : 110) + 62;
    var bottom = 104;
    var right = 12, left = 12;
    if (W >= 860) {
      right = 330;                        // scanner sits in a right-hand column
    } else {
      /* scanner is a bottom sheet: reserve its height, but scale the reservation
         on short screens so the deck itself never gets squeezed flat */
      bottom += clamp(H * 0.24, 112, 188);
    }
    if (H < 700) { top -= 14; bottom -= 20; }
    return { top: top, bottom: bottom, left: left, right: right };
  }

  /* pin the hint chip and the desktop scanner column to the real HUD height,
     which varies with the case description length */
  function layoutChrome() {
    var hud = $('hud'), obj = $('objective'), scan = $('scanner');
    if (!hud || !obj || !scan) return;
    var hudBottom = hud.offsetTop + hud.offsetHeight;
    obj.style.top = (hudBottom + 12) + 'px';
    scan.style.top = (W >= 860) ? (hudBottom + 22) + 'px' : '';
  }

  function computeLayout() {
    layoutChrome();
    var ins = insets();
    var availW = Math.max(200, W - ins.left - ins.right);
    var availH = Math.max(180, H - ins.top - ins.bottom);
    S = clamp(Math.min(availW / BOX_W, availH / BOX_H), 0.40, 1.12);
    /* Centre on the viewport when the cases still clear the scanner column,
       otherwise fall back to the centre of the reserved band. */
    var halfW = 155 * S + 52;
    var lo = ins.left + halfW, hi = W - ins.right - halfW;
    cx = (lo <= hi) ? clamp(W / 2, lo, hi) : (ins.left + (W - ins.right)) / 2;
    cy = ins.top + availH / 2;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cvs.width = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeLayout();
    if (mode === 'play') placeArrows(true);
  }

  /* ---------------------------------------------------------------- Arrow */
  function Arrow(props, isRef) {
    this.x = props.x; this.y = props.y;
    this.dx = props.dx; this.dy = props.dy;
    this.lbl = props.lbl;
    this.isRef = isRef;
    this.glow = false;
  }
  Arrow.prototype.len = function () { return Math.hypot(this.dx, this.dy); };
  Arrow.prototype.ang = function () { return Math.atan2(this.dy, this.dx); };

  Arrow.prototype.palette = function () {
    if (this.glow) return { a: '#0fae79', b: '#c8ffe8', glow: '#34e0a1', node: '#04241a' };
    if (this.isRef) return { a: '#4d6d84', b: '#cbe6f4', glow: '#8fd8ea', node: '#08141f' };
    return { a: '#c46a04', b: '#ffe0ae', glow: '#ffa726', node: '#221402' };
  };

  Arrow.prototype.draw = function (t) {
    var hx = this.x + this.dx, hy = this.y + this.dy;
    var a = this.ang();
    var p = this.palette();
    /* once the tails coincide the reference sits exactly underneath the player
       vector, so widen it a touch to leave a visible rim — it reads as
       "perfectly superimposed" instead of "the grey one vanished". */
    var over = (isAnalysed && this.isRef) ? 1.5 : 1;
    var lw = Math.max(6, 10 * S) * over;
    var hs = Math.max(10, 15 * S) * (over > 1 ? 1.28 : 1);

    var shaftImg = Assets.get(this.isRef ? 'vec/ref_shaft' : 'vec/ply_shaft');
    var headImg = Assets.get(this.isRef ? 'vec/ref_head' : 'vec/ply_head');

    /* --- glow pass --- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.glow;
    ctx.globalAlpha = this.glow ? 0.5 + 0.22 * Math.sin(t * 5) : (this.isRef ? 0.14 : 0.26);
    ctx.lineWidth = lw * 2.9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.restore();

    /* --- shaft: optional drop-in art, else drawn tube --- */
    var L = Math.hypot(this.dx, this.dy);
    if (shaftImg) {
      var shH = (shaftImg.naturalHeight / shaftImg.naturalWidth) * 64 * S;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(a);
      ctx.drawImage(shaftImg, 0, -shH / 2, Math.max(0, L - hs * 1.6), shH);
      ctx.restore();
    } else {
      strokeShaft(this, p, lw, hs);
    }

    /* --- head: optional drop-in art, else drawn chevron --- */
    if (headImg) {
      var hw = hs * 3.2, hh = hw * (headImg.naturalHeight / headImg.naturalWidth || 1);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(a);
      ctx.drawImage(headImg, L - hw, -hh / 2, hw, hh);
      ctx.restore();
    } else {
      drawHead(this, p, hs, hx, hy, a);
    }

    /* --- scenario icon just past the tip (kept legible on small screens) --- */
    var lvl = LEVELS[levelIdx];
    if (lvl) {
      var isz = Math.max(30, 40 * S);
      var off = hs * 0.9 + isz * 0.46;
      drawScenarioIcon(lvl.icon, hx + Math.cos(a) * off, hy + Math.sin(a) * off, isz, p);
    }

    /* --- tail node --- */
    drawNode(this.x, this.y, Math.max(5, 7 * S), p);

    /* --- label plate (lift the reference clear when the tails coincide) --- */
    var lift = Math.max(16, 20 * S);
    if (isAnalysed && this.isRef) lift += Math.max(19, 23 * S);
    drawLabel(this.lbl, this.x, this.y - lift, p);
  };

  function strokeShaft(ar, p, lw, hs) {
    var hx = ar.x + ar.dx, hy = ar.y + ar.dy;
    var a = ar.ang();
    var ex = hx - Math.cos(a) * hs * 0.9, ey = hy - Math.sin(a) * hs * 0.9;
    var g = ctx.createLinearGradient(ar.x, ar.y, hx, hy);
    g.addColorStop(0, p.a); g.addColorStop(1, p.b);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(ar.x, ar.y); ctx.lineTo(ex, ey); ctx.stroke();
    /* lit core so the shaft reads like a tube, not a flat line */
    var g2 = ctx.createLinearGradient(ar.x, ar.y, hx, hy);
    g2.addColorStop(0, 'rgba(255,255,255,0.20)');
    g2.addColorStop(1, 'rgba(255,255,255,0.72)');
    ctx.strokeStyle = g2;
    ctx.lineWidth = Math.max(1.4, lw * 0.26);
    ctx.beginPath(); ctx.moveTo(ar.x, ar.y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.restore();
  }

  function drawHead(ar, p, hs, hx, hy, a) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    var g = ctx.createLinearGradient(-hs, -hs, 0, hs);
    g.addColorStop(0, p.b); g.addColorStop(1, p.a);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-hs, -hs * 1.15);
    ctx.lineTo(-hs * 0.72, 0);
    ctx.lineTo(-hs, hs * 1.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function drawNode(x, y, r, p) {
    var img = Assets.get('vec/node');
    if (img) {
      var s = r * 5;
      ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
      return;
    }
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.2, x, y, r * 1.9);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, p.b);
    g.addColorStop(1, p.node);
    ctx.beginPath(); ctx.arc(x, y, r * 1.55, 0, 6.2832);
    ctx.fillStyle = p.node; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  function drawLabel(txt, x, y, p) {
    if (!txt) return;
    var fs = Math.max(10, 13 * S);
    ctx.save();
    ctx.font = '700 ' + fs.toFixed(1) + 'px Rajdhani, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(txt).width + fs * 1.1;
    var h = fs * 1.62;
    roundRectPath(x - w / 2, y - h / 2, w, h, h * 0.34);
    var g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, 'rgba(26,44,62,0.92)');
    g.addColorStop(1, 'rgba(6,13,22,0.92)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(' + (p.glow === '#ffa726' ? '255,167,38' : p.glow === '#34e0a1' ? '52,224,161' : '143,216,234') + ',0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#dcecf8';
    ctx.fillText(txt, x, y + 0.5);
    ctx.restore();
  }

  function roundRectPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* scenario icon with graceful fallback to a drawn holo token */
  function drawScenarioIcon(key, x, y, size, p) {
    var img = key ? Assets.get(key) : null;
    ctx.save();
    if (img) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      var r = size * 0.42;
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = -Math.PI / 2 + (i / 6) * 6.2832;
        var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.15, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, p.glow);
      g.addColorStop(1, p.a);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- level */
  function placeArrows(keepState) {
    var data = LEVELS[levelIdx];
    if (!data) return;
    var raw = data.setup(0, 0);
    var keepDrag = keepState && drag ? true : false;
    var mk = function (o) {
      return { x: cx + o.x * S, y: cy + o.y * S, dx: o.dx * S, dy: o.dy * S, lbl: o.lbl };
    };
    var wasGlow = arrows.length === 2 ? arrows[1].glow : false;
    arrows = [new Arrow(mk(raw.ref), true), new Arrow(mk(raw.ply), false)];
    if (isAnalysed) {
      arrows[1].x = arrows[0].x;
      arrows[1].y = arrows[0].y;
      arrows[1].glow = wasGlow;
    }
    if (keepDrag) drag = arrows[1];
  }

  function initLevel(idx) {
    clearTimers();
    levelIdx = idx;
    isAnalysed = false;
    drag = null;
    particles = []; ripples = []; sparks = [];
    scanT = -1;

    var data = LEVELS[levelIdx];
    if (!data) return;

    /* reseed the case's scene so its animation starts fresh */
    if (data.scene && window.Scenes) Scenes.reset(data.scene);

    computeLayout();
    placeArrows(false);

    /* HUD */
    $('case-num').textContent = (levelIdx + 1 < 10 ? '0' : '') + (levelIdx + 1);
    $('case-of').textContent = '/ ' + LEVELS.length;
    $('title-text').textContent = data.title;
    $('desc-text').innerHTML = data.desc;
    /* description length changes the HUD height, so re-pin the chrome */
    computeLayout();
    placeArrows(false);
    $('next-label').textContent = (levelIdx + 1 >= LEVELS.length) ? 'Finish Study' : 'Next Case';

    /* scanner reset */
    $('scanner').classList.remove('on');
    setWait($('s-mag')); setWait($('s-dir'));
    var res = $('res-box');
    res.className = '';
    res.innerHTML = '<span>Awaiting sample.</span>';
    $('g-ref').style.width = '0%';
    $('g-ply').style.width = '0%';
    $('n-ref').textContent = '--';
    $('n-ply').textContent = '--';

    /* buttons + hint */
    $('btn-re').classList.remove('show');
    $('btn-next').classList.remove('show');
    $('objective').classList.remove('hide');

    mode = 'play';
    document.body.classList.add('playing');
    document.body.classList.remove('fxonly');
    if (window.UI) UI.refreshHudCores();
  }

  function setWait(el) {
    el.className = 'cr-val status-wait';
    el.innerHTML = '<img src="assets/images/ui/emoji/scanning.png" alt="Scanning">';
  }
  function setResult(el, ok) {
    el.className = 'cr-val ' + (ok ? 'status-ok' : 'status-bad');
    el.innerHTML = '<img src="assets/images/ui/emoji/' + (ok ? 'check' : 'cross') + '.png" alt="">' +
      '<span>' + (ok ? 'Matches' : 'Different') + '</span>';
  }

  /* ---------------------------------------------------------------- scan */
  function runScan() {
    if (isAnalysed) return;
    isAnalysed = true;

    var scanIdx = levelIdx;           // pinned: a late timer must never record elsewhere
    var ref = arrows[0], ply = arrows[1];
    ply.x = ref.x; ply.y = ref.y;

    /* identical checks to the original build (tolerances scale with layout) */
    var mOk = Math.abs(ref.len() - ply.len()) < 5 * S;
    var diffAngle = Math.atan2(Math.sin(ref.ang() - ply.ang()), Math.cos(ref.ang() - ply.ang()));
    var dOk = Math.abs(diffAngle) < 0.1;
    var data = LEVELS[levelIdx];

    var panel = $('scanner'), mUi = $('s-mag'), dUi = $('s-dir'), rUi = $('res-box');

    panel.classList.add('on');
    setWait(mUi); setWait(dUi);
    rUi.className = '';
    rUi.innerHTML = '<span>Checking sample&hellip;</span>';
    $('objective').classList.add('hide');

    /* readouts (presentation only) */
    var lr = ref.len() / S, lp = ply.len() / S;
    var mx = Math.max(lr, lp, 1);
    $('g-ref').style.width = (lr / mx * 100).toFixed(1) + '%';
    $('g-ply').style.width = (lp / mx * 100).toFixed(1) + '%';
    $('n-ref').textContent = Math.round(lr) + 'u ' + fmtDeg(ref.ang());
    $('n-ply').textContent = Math.round(lp) + 'u ' + fmtDeg(ply.ang());

    scanT = 0;
    ripples.push({ x: ref.x, y: ref.y, r: 8, max: 130 * S, w: 4, col: '52,224,161', life: 1 });
    Snd.sfx.snap();
    Snd.sfx.scan();

    later(function () {
      setResult(mUi, mOk);
      Snd.sfx.tick();
    }, 400);

    later(function () {
      if (scanIdx !== levelIdx) return;
      setResult(dUi, dOk);
      Snd.sfx.tick();

      var pass = mOk && dOk;
      var msg;
      if (pass) {
        rUi.className = 'res-ok';
        msg = data.success || '<b>EQUAL!</b>';
      } else {
        rUi.className = 'res-bad';
        if (!mOk && !dOk) msg = '<b>NOT EQUAL.</b><br>Neither size nor direction match.';
        else if (!mOk) msg = data.failMag || '<b>NOT EQUAL.</b><br>Magnitude differs.';
        else msg = data.failDir || '<b>NOT EQUAL.</b><br>Direction differs.';
      }
      rUi.innerHTML = '<img class="verdict" src="assets/images/ui/emoji/' +
        (pass ? 'check' : 'warn') + '.png" alt=""><span>' + msg + '</span>';

      if (pass) {
        arrows[1].glow = true;
        confetti();
        burstSparks(arrows[0].x, arrows[0].y, '52,224,161', 34);
        ripples.push({ x: arrows[0].x, y: arrows[0].y, r: 10, max: 240 * S, w: 6, col: '52,224,161', life: 1 });
        flash('pass');
        Snd.sfx.pass();
      } else {
        burstSparks(arrows[0].x, arrows[0].y, '255,84,112', 22);
        ripples.push({ x: arrows[0].x, y: arrows[0].y, r: 10, max: 170 * S, w: 5, col: '255,84,112', life: 1 });
        flash('fail');
        shake();
        Snd.sfx.fail();
      }

      $('btn-next').classList.add('show');
      $('btn-re').classList.add('show');

      if (window.Progress) Progress.complete(scanIdx, pass);
      if (window.UI) UI.refreshHudCores();
    }, 800);
  }

  function fmtDeg(rad) {
    /* screen y grows downward; report the intuitive maths angle */
    var d = -rad * 180 / Math.PI;
    d = Math.round(d);
    if (d === -0) d = 0;
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d + '°';
  }

  /* ---------------------------------------------------------------- fx */
  function flash(kind) {
    var f = $('flash');
    f.className = kind;
    setTimeout(function () { f.className = ''; }, 260);
  }
  function shake() {
    document.body.classList.add('shake');
    setTimeout(function () { document.body.classList.remove('shake'); }, 460);
  }

  var CONF = ['#ff5470', '#a970ff', '#7b8cff', '#42a5f5', '#22d3ee', '#34e0a1', '#9ccc65', '#ffca28', '#ffa726'];

  function confetti() {
    for (var i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * W, y: -20 - Math.random() * 120,
        v: Math.random() * 3 + 1.5,
        vx: (Math.random() - 0.5) * 0.7,
        s: 6 + Math.random() * 6,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.22,
        c: CONF[Math.floor(Math.random() * CONF.length)]
      });
    }
  }

  function burstSparks(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.2832;
      var sp = 2.4 + Math.random() * 5.4;
      sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, col: col, len: 5 + Math.random() * 12
      });
    }
  }

  /* ---------------------------------------------------------------- render */
  /* real-world scene behind the scanner overlay (decoration only) */
  function drawScene(t, dt) {
    var data = LEVELS[levelIdx];
    if (!data || !data.scene || !window.Scenes || !Scenes.has(data.scene)) return false;
    var ok = Scenes.draw(ctx, data.scene, t, dt, { W: W, H: H, S: S, cx: cx, cy: cy });
    if (!ok) return false;
    /* scrim: pushes the scene behind glass so the HUD and vectors stay legible */
    var a = Scenes.scrim(data.scene);
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(4,9,17,' + (a + 0.10).toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(4,9,17,' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(3,7,14,' + (a + 0.12).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    /* keep the middle of the deck a touch clearer than the edges */
    var v = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.22, cx, cy, Math.max(W, H) * 0.70);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(2,6,12,0.30)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return true;
  }

  function drawGrid(t, faint) {
    var step = 48;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = faint ? 'rgba(34,211,238,0.036)' : 'rgba(34,211,238,0.055)';
    ctx.beginPath();
    for (var x = (cx % step); x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (var y = (cy % step); y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    /* stronger axis lines through the reference origin */
    if (arrows.length) {
      ctx.strokeStyle = 'rgba(34,211,238,0.11)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 9]);
      ctx.beginPath();
      ctx.moveTo(0, arrows[0].y); ctx.lineTo(W, arrows[0].y);
      ctx.moveTo(arrows[0].x, 0); ctx.lineTo(arrows[0].x, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawTarget(t) {
    if (!arrows.length) return;
    var a = arrows[0];
    var base = 34 * S;
    var img = Assets.get('vec/target');
    ctx.save();
    if (img) {
      var pulse = 1 + 0.06 * Math.sin(t * 2.4);
      var sz = base * 2.6 * pulse;
      ctx.globalAlpha = isAnalysed ? 0.35 : 0.85;
      ctx.drawImage(img, a.x - sz / 2, a.y - sz / 2, sz, sz);
    } else {
      ctx.globalAlpha = isAnalysed ? 0.32 : 1;
      var g = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, base * 1.5);
      g.addColorStop(0, 'rgba(34,211,238,0.20)');
      g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(a.x, a.y, base * 1.5, 0, 6.2832); ctx.fill();
      for (var i = 0; i < 2; i++) {
        var ph = (t * 0.55 + i * 0.5) % 1;
        ctx.beginPath();
        ctx.arc(a.x, a.y, base * (0.55 + ph * 0.85), 0, 6.2832);
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.42 * (1 - ph)).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(184,246,255,0.55)';
      ctx.lineWidth = 2;
      for (var k = 0; k < 4; k++) {
        var ang = k * Math.PI / 2 + Math.PI / 4;
        var r0 = base * 0.86, r1 = base * 1.16;
        ctx.beginPath();
        ctx.moveTo(a.x + Math.cos(ang) * r0, a.y + Math.sin(ang) * r0);
        ctx.lineTo(a.x + Math.cos(ang) * r1, a.y + Math.sin(ang) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawScanSweep(t, dt) {
    if (scanT < 0) return;
    scanT += dt;
    var dur = 1.05;
    if (scanT > dur) { scanT = -1; return; }
    var y = H * (scanT / dur);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(0, y - 54, 0, y + 54);
    g.addColorStop(0, 'rgba(34,211,238,0)');
    g.addColorStop(0.5, 'rgba(34,211,238,0.26)');
    g.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 54, W, 108);
    ctx.strokeStyle = 'rgba(184,246,255,0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.restore();
  }

  function stepParticles(dt) {
    var f = dt * 60;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.y += p.v * f;
      p.x += p.vx * f;
      p.rot += p.vr * f;
      if (p.y > H + 30) particles.splice(i, 1);
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.x += s.vx * f; s.y += s.vy * f;
      s.vx *= 0.96; s.vy = s.vy * 0.96 + 0.12 * f;
      s.life -= 0.022 * f;
      if (s.life <= 0) sparks.splice(j, 1);
    }
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r];
      rp.r += (rp.max - rp.r) * 0.12 * f;
      rp.life -= 0.028 * f;
      if (rp.life <= 0) ripples.splice(r, 1);
    }
  }

  function drawParticles() {
    ctx.save();
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.shadowColor = p.c;
      ctx.shadowBlur = 9;
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s * 0.62);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var j = 0; j < sparks.length; j++) {
      var s = sparks[j];
      var a = Math.max(0, s.life);
      ctx.strokeStyle = 'rgba(' + s.col + ',' + a.toFixed(3) + ')';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * (s.len / 6), s.y - s.vy * (s.len / 6));
      ctx.stroke();
    }
    for (var r = 0; r < ripples.length; r++) {
      var rp = ripples[r];
      ctx.strokeStyle = 'rgba(' + rp.col + ',' + Math.max(0, rp.life * 0.6).toFixed(3) + ')';
      ctx.lineWidth = rp.w;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, 6.2832); ctx.stroke();
    }
    ctx.restore();
  }

  var lastTs = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    var t = ts / 1000;

    /* some WebViews change size without firing `resize` (toolbars, keyboard) */
    if (window.innerWidth !== W || window.innerHeight !== H) resize();

    if (mode === 'off') { ctx.clearRect(0, 0, W, H); return; }

    ctx.clearRect(0, 0, W, H);

    if (mode === 'play') {
      var scened = drawScene(t, dt);
      drawGrid(t, scened);
      drawTarget(t);
      drawScanSweep(t, dt);
      if (arrows.length === 2) {
        arrows[0].draw(t);
        arrows[1].draw(t);
      }
      /* drag affordance: line to the target while carrying the vector */
      if (drag && !isAnalysed) {
        var d = Math.hypot(drag.x - arrows[0].x, drag.y - arrows[0].y);
        if (d < snapR() * 2.4) {
          ctx.save();
          ctx.setLineDash([5, 7]);
          ctx.strokeStyle = 'rgba(52,224,161,' + (0.6 * (1 - d / (snapR() * 2.4))).toFixed(3) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(drag.x, drag.y); ctx.lineTo(arrows[0].x, arrows[0].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    stepParticles(dt);
    drawParticles();
  }

  /* ---------------------------------------------------------------- input */
  function snapR() { return Math.max(48, 60 * S); }
  function grabR() { return Math.max(42, 50 * S); }

  function blocked() {
    return mode !== 'play' || !!document.querySelector('.modal.on');
  }

  function onDown(x, y) {
    if (blocked() || isAnalysed) return;
    var ply = arrows[1];
    if (ply && Math.hypot(x - ply.x, y - ply.y) < grabR()) {
      drag = ply;
      dragOff.x = x - ply.x;
      dragOff.y = y - ply.y;
      $('objective').classList.add('hide');
      Snd.sfx.pickup();
    }
  }
  function onMove(x, y) {
    if (!drag) return;
    drag.x = x - dragOff.x;
    drag.y = y - dragOff.y;
  }
  function onUp() {
    if (!drag) return;
    var near = Math.hypot(drag.x - arrows[0].x, drag.y - arrows[0].y) < snapR();
    drag = null;
    if (near) runScan();
    else {
      Snd.sfx.drop();
      $('objective').classList.remove('hide');
    }
  }

  function bindInput() {
    var opts = { passive: false };
    window.addEventListener('pointerdown', function (e) {
      if (e.target !== cvs && e.target !== document.body) return;
      onDown(e.clientX, e.clientY);
    }, opts);
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    }, opts);
    window.addEventListener('pointerup', onUp, opts);
    window.addEventListener('pointercancel', onUp, opts);
    /* keyboard nudge + shortcuts (desktop convenience, same outcomes) */
    window.addEventListener('keydown', function (e) {
      if (blocked()) return;
      var ply = arrows[1];
      if (!ply || isAnalysed) {
        if (e.key === 'Enter' && isAnalysed) { e.preventDefault(); next(); }
        return;
      }
      var step = e.shiftKey ? 24 : 8;
      var moved = true;
      if (e.key === 'ArrowLeft') ply.x -= step;
      else if (e.key === 'ArrowRight') ply.x += step;
      else if (e.key === 'ArrowUp') ply.y -= step;
      else if (e.key === 'ArrowDown') ply.y += step;
      else if (e.key === 'Enter' || e.key === ' ') {
        if (Math.hypot(ply.x - arrows[0].x, ply.y - arrows[0].y) < snapR()) runScan();
        moved = false;
      } else moved = false;
      if (moved) { e.preventDefault(); $('objective').classList.add('hide'); }
    });
  }

  /* ---------------------------------------------------------------- api */
  function next() {
    if (levelIdx + 1 >= LEVELS.length) {
      if (window.UI) UI.showOutro();
      return;
    }
    Snd.sfx.click();
    initLevel(levelIdx + 1);
  }
  function retry() {
    Snd.sfx.click();
    initLevel(levelIdx);
  }

  function setMode(m) {
    mode = m;
    document.body.classList.toggle('playing', m === 'play');
    document.body.classList.toggle('fxonly', m === 'fx');
    if (m === 'off') { clearTimers(); particles = []; sparks = []; ripples = []; }
  }

  function init() {
    cvs = document.getElementById('c');
    ctx = cvs.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 260); });
    bindInput();
    requestAnimationFrame(loop);
  }

  return {
    init: init, resize: resize,
    start: initLevel, next: next, retry: retry,
    setMode: setMode, confetti: confetti,
    currentIndex: function () { return levelIdx; },
    isAnalysed: function () { return isAnalysed; }
  };
})();
