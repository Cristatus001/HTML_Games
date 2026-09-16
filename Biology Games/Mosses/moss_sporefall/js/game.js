/* ============================================================================
 * MOSS SPOREFALL — engine
 *
 * You are a moss spore released from the capsule, drifting down through a
 * damp forest to find ground wet enough to germinate on. Steer left and right,
 * gather the glowing Dew Orbs that carry the facts, and dodge the impostors
 * that are not mosses at all.
 *
 * All sprites are drawn procedurally here. Any of them is transparently
 * replaced by a PNG if one is dropped into assets/images (see Assets).
 * ==========================================================================*/
(function (global) {
  'use strict';

  var D = global.GameData;
  var Assets = global.Assets;
  var Sound = global.GameAudio;

  /* ------------------------------------------------------------ constants */
  var VIEW_H = 700;          // preferred world units visible vertically
  var MAX_VIEW_H = 1050;     // cap for very tall screens, so sprites stay legible
  var LANE_W = 460;          // nominal canyon width in world units
  var PLAYER_Y_FRAC = 0.36;  // where the spore sits on screen
  var STEP = 1 / 60;
  var MAX_MOISTURE = 3;

  /* --------------------------------------------------------------- state */
  var canvas = null, ctx = null;
  var cssW = 0, cssH = 0, scale = 1;
  var viewWorldH = VIEW_H;   // world units actually visible, derived from scale
  var laneHalfBase = LANE_W / 2;
  var wiggleScale = 1;
  var hooks = {};

  var mode = 'idle';         // idle | attract | playing | landing | over
  var rafId = 0;
  var lastTime = 0;
  var accumulator = 0;
  var clock = 0;             // seconds since init, unscaled (ambient motion)
  var timeScale = 1;
  var hudTimer = 0;

  var zone = null;
  var zoneIndex = 0;
  var camY = 0;
  var player = null;
  var orbs = [], hazards = [], pickups = [];
  var particles = [], rings = [], floaters = [];
  var motes = [];
  var shake = 0, flash = 0, flashColor = '107,255,158';
  var landing = null;

  var stats = null;

  var keys = { left: false, right: false, down: false };
  var pointerTarget = null;  // world x, or null

  /* ------------------------------------------------------------ utilities */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Stable pseudo-random in [0,1) from an integer — for scenery detail. */
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Fit the canyon to whatever screen we were given. The lane always stays
   * fully on screen, on a phone in portrait as much as on a desktop.
   */
  function computeLaneGeometry() {
    var viewW = cssW / scale;                       // world units across
    var maxHalf = viewW * 0.47;                     // leave a margin at each side

    // The canyon takes a share of the screen width that suits the shape of the
    // screen: most of a narrow phone, a generous strip of a wide monitor.
    var aspect = cssW / Math.max(1, cssH);
    var frac = clamp(0.62 - (aspect - 0.6) * 0.18, 0.40, 0.66);
    laneHalfBase = clamp(viewW * frac * 0.5, 110, LANE_W / 2 + 70);
    laneHalfBase = Math.min(laneHalfBase, maxHalf * 0.7);

    var room = maxHalf - (laneHalfBase + 34);
    var need = (zone ? zone.laneWiggle : 60) * 1.55;
    wiggleScale = clamp(room / Math.max(1, need), 0, 1);
  }

  /* The canyon meanders as you descend. Purely geometric, no gameplay state. */
  function laneCenter(y) {
    if (!zone) { return 0; }
    return (Math.sin(y * 0.0018) * zone.laneWiggle +
            Math.sin(y * 0.0007 + 1.3) * zone.laneWiggle * 0.55) * wiggleScale;
  }

  function laneHalf(y) {
    return laneHalfBase + Math.sin(y * 0.0011 + 0.7) * Math.min(34, laneHalfBase * 0.18);
  }

  function toScreenX(wx) { return cssW / 2 + wx * scale; }
  function toScreenY(wy) { return (wy - camY) * scale; }

  /* -------------------------------------------------------------- sizing */

  function resize() {
    if (!canvas) { return; }
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Prefer a consistent vertical view; never zoom so far out that the world
    // becomes tiny on a long phone screen.
    scale = Math.min(cssH / VIEW_H, cssW / (LANE_W + 60));
    scale = Math.max(scale, cssH / MAX_VIEW_H);
    viewWorldH = cssH / scale;

    computeLaneGeometry();
    if (zone && orbs.length) { refreshPositions(); }
    buildMotes();
  }

  function buildMotes() {
    motes = [];
    var n = Math.round((cssW * cssH) / 26000);
    n = clamp(n, 18, 70);
    for (var i = 0; i < n; i++) {
      motes.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        r: 0.9 + Math.random() * 2.6,
        sp: 0.12 + Math.random() * 0.5,
        drift: Math.random() * Math.PI * 2,
        a: 0.15 + Math.random() * 0.5
      });
    }
  }

  /* ---------------------------------------------------------- level build */

  /**
   * Entities remember where they sit as a fraction of the lane, so an
   * orientation change or window resize can never strand one inside a wall.
   */
  function refreshPositions() {
    function place(e) {
      var half = laneHalf(e.y) - e.margin;
      e.x = laneCenter(e.y) + e.xf * half;
    }
    orbs.forEach(place);
    pickups.forEach(place);
    hazards.forEach(function (h) {
      if (h.kind === 'spur') {
        h.x = laneCenter(h.y) + h.side * (laneHalf(h.y) - h.len * 0.42);
      } else {
        place(h);
      }
    });
  }

  function buildZone(zi) {
    zone = D.ZONES[zi];
    zoneIndex = zi;
    computeLaneGeometry();
    var rnd = mulberry32(9871 + zone.id * 4177);

    orbs = []; hazards = []; pickups = [];
    particles = []; rings = []; floaters = [];

    var startD = 420;
    var endD = zone.depth - 380;
    var span = endD - startD;
    var factCount = zone.factTo - zone.factFrom;

    // Five fact orbs, spread down the zone.
    for (var i = 0; i < factCount; i++) {
      var t = (i + 0.5) / factCount;
      var y = startD + span * t + (rnd() - 0.5) * span * 0.10;
      orbs.push({
        x: 0, y: y, r: 21,
        xf: rnd() * 2 - 1, margin: 46,
        factIndex: zone.factFrom + i,
        alive: true,
        phase: rnd() * Math.PI * 2
      });
    }

    // Hazards, kept clear of the orbs so nothing is unavoidable.
    var placed = 0, guard = 0;
    while (placed < zone.hazards && guard < 800) {
      guard++;
      var hy = startD - 60 + rnd() * (span + 220);
      var tooClose = false;
      for (var k = 0; k < orbs.length; k++) {
        if (Math.abs(orbs[k].y - hy) < 110) { tooClose = true; break; }
      }
      if (tooClose) { continue; }
      for (var m = 0; m < hazards.length; m++) {
        if (Math.abs(hazards[m].y - hy) < 150) { tooClose = true; break; }
      }
      if (tooClose) { continue; }

      var isSpur = rnd() < 0.38;
      if (isSpur) {
        var side = rnd() < 0.5 ? -1 : 1;
        var len = 58 + rnd() * 54;
        hazards.push({
          kind: 'spur', side: side, len: len,
          x: 0, y: hy, r: len * 0.40, seed: rnd() * 1000
        });
      } else {
        var type = D.IMPOSTORS[(rnd() * D.IMPOSTORS.length) | 0];
        hazards.push({
          kind: 'impostor', type: type,
          x: 0, y: hy, r: 27,
          xf: rnd() * 2 - 1, margin: 52,
          phase: rnd() * Math.PI * 2,
          sway: 0.4 + rnd() * 0.7
        });
      }
      placed++;
    }

    // One moisture restore per zone, about two thirds of the way down.
    var py = startD + span * 0.66;
    pickups.push({
      kind: 'moisture', x: 0, y: py, r: 20,
      xf: rnd() * 2 - 1, margin: 60,
      alive: true, phase: rnd() * Math.PI * 2
    });

    refreshPositions();

    player = {
      x: laneCenter(120), y: 120,
      vx: 0, vy: zone.fallBase,
      r: 15,
      invuln: 0,
      trail: [],
      wobble: 0
    };

    camY = player.y - viewWorldH * PLAYER_Y_FRAC;

    stats = {
      score: 0,
      moisture: MAX_MOISTURE,
      facts: [],
      streak: 0,
      bestStreak: 0,
      hits: 0,
      depth: 0
    };
  }

  /* ------------------------------------------------------------ lifecycle */

  function init(opts) {
    canvas = opts.canvas;
    ctx = canvas.getContext('2d');
    hooks = opts || {};
    resize();
    global.addEventListener('resize', resize);
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', resize);
    }
    lastTime = 0;
    startLoop();
  }

  function startLoop() {
    if (rafId) { return; }
    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  }

  function attract() {
    mode = 'attract';
    if (!zone) { zone = D.ZONES[0]; }
    camY += 0;
    startLoop();
  }

  function startZone(zi) {
    buildZone(clamp(zi, 0, D.ZONES.length - 1));
    timeScale = 1;
    shake = 0; flash = 0;
    mode = 'playing';
    landing = null;
    emitHud();
    startLoop();
  }

  function pause() {
    if (mode === 'playing') { mode = 'paused'; }
  }

  function resume() {
    if (mode === 'paused') { mode = 'playing'; lastTime = 0; }
  }

  function stop() {
    mode = 'attract';
  }

  function emitHud() {
    if (hooks.onHud && stats && zone) {
      hooks.onHud({
        score: stats.score,
        moisture: stats.moisture,
        maxMoisture: MAX_MOISTURE,
        collected: stats.facts.length,
        total: zone.factTo - zone.factFrom,
        depth: Math.max(0, Math.round(stats.depth)),
        totalDepth: zone.depth,
        streak: stats.streak,
        zoneName: zone.name
      });
    }
  }

  /* ------------------------------------------------------------- gameplay */

  function updatePlaying(dt) {
    var p = player;
    var prog = clamp(player.y / zone.depth, 0, 1);

    // --- horizontal control -------------------------------------------
    var accel = 0;
    if (pointerTarget !== null) {
      accel = clamp((pointerTarget - p.x) * 0.035, -0.95, 0.95);
    }
    if (keys.left) { accel -= 0.62; }
    if (keys.right) { accel += 0.62; }

    // A slow crosswind that grows with depth — ambient, never unfair.
    var wind = Math.sin(p.y * 0.0035 + clock * 0.5) * zone.windAmp * (0.5 + prog * 0.5);

    p.vx += (accel + wind) * (dt / STEP);
    p.vx *= Math.pow(0.90, dt / STEP);
    p.vx = clamp(p.vx, -7.2, 7.2);

    // --- descent -------------------------------------------------------
    var target = lerp(zone.fallBase, zone.fallMax, prog);
    if (keys.down) { target *= 1.75; }
    p.vy += (target - p.vy) * 0.06 * (dt / STEP);

    p.x += p.vx * (dt / STEP);
    p.y += p.vy * (dt / STEP);
    p.wobble += dt * 6;

    // --- canyon walls (soft bounds, no damage) --------------------------
    var cx = laneCenter(p.y);
    var hw = laneHalf(p.y) - p.r - 6;
    if (p.x < cx - hw) {
      p.x = cx - hw;
      if (p.vx < -1.4) { wallSpark(p.x, p.y, 1); }
      p.vx = Math.abs(p.vx) * 0.35;
    } else if (p.x > cx + hw) {
      p.x = cx + hw;
      if (p.vx > 1.4) { wallSpark(p.x, p.y, -1); }
      p.vx = -Math.abs(p.vx) * 0.35;
    }

    // --- trail ----------------------------------------------------------
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 16) { p.trail.shift(); }

    if (p.invuln > 0) { p.invuln -= dt; }

    stats.depth = p.y;
    camY = p.y - viewWorldH * PLAYER_Y_FRAC;

    // --- pickups --------------------------------------------------------
    var i;
    for (i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (!o.alive) { continue; }
      o.phase += dt * 2.2;
      if (hit(p, o, 6)) { collectOrb(o); }
    }

    for (i = 0; i < pickups.length; i++) {
      var pu = pickups[i];
      if (!pu.alive) { continue; }
      pu.phase += dt * 2.6;
      if (hit(p, pu, 6)) { collectMoisture(pu); }
    }

    for (i = 0; i < hazards.length; i++) {
      var hz = hazards[i];
      if (hz.kind === 'impostor') { hz.phase += dt * hz.sway; }
      if (p.invuln > 0) { continue; }
      if (hit(p, hz, hz.kind === 'spur' ? -4 : 2)) { takeHit(hz); }
    }

    // --- reached the bottom ---------------------------------------------
    if (p.y >= zone.depth) {
      beginLanding();
    }
  }

  function hit(a, b, pad) {
    var dx = a.x - b.x, dy = a.y - b.y;
    var rr = a.r + b.r + (pad || 0);
    return dx * dx + dy * dy < rr * rr;
  }

  function collectOrb(o) {
    o.alive = false;
    stats.facts.push(o.factIndex);
    stats.streak++;
    if (stats.streak > stats.bestStreak) { stats.bestStreak = stats.streak; }
    var mult = 1 + Math.min(stats.streak - 1, 4) * 0.25;
    stats.score += Math.round(100 * mult);

    burst(o.x, o.y, 22, '127,233,255', 3.4);
    rings.push({ x: o.x, y: o.y, r: 10, max: 96, life: 0.55, t: 0, color: '127,233,255' });
    floaters.push({ x: o.x, y: o.y, text: '+' + Math.round(100 * mult), life: 1.0, t: 0, color: '#bff7ff' });
    flash = 0.35; flashColor = '127,233,255';
    timeScale = 0.42;

    Sound.play('collect', stats.streak);
    if (hooks.onFact) { hooks.onFact(o.factIndex, stats.streak); }
    emitHud();
  }

  function collectMoisture(pu) {
    pu.alive = false;
    if (stats.moisture < MAX_MOISTURE) { stats.moisture++; }
    stats.score += 50;
    burst(pu.x, pu.y, 16, '150,235,255', 2.8);
    rings.push({ x: pu.x, y: pu.y, r: 8, max: 70, life: 0.45, t: 0, color: '150,235,255' });
    floaters.push({ x: pu.x, y: pu.y, text: '+MOISTURE', life: 1.1, t: 0, color: '#a8ecff' });
    Sound.play('moisture');
    if (hooks.onPickup) { hooks.onPickup('moisture'); }
    emitHud();
  }

  function takeHit(hz) {
    var p = player;
    stats.moisture--;
    stats.hits++;
    stats.streak = 0;
    p.invuln = 1.5;
    p.vx = (p.x < laneCenter(p.y) ? 1 : -1) * 4.2;
    p.vy = Math.max(1.2, p.vy * 0.45);
    shake = 14;
    flash = 0.55; flashColor = '255,120,90';

    burst(p.x, p.y, 18, '255,150,110', 3.2);
    Sound.play('hurt');

    if (hz.kind === 'impostor' && hooks.onWarn) {
      hooks.onWarn(hz.type);
    } else if (hooks.onWarn) {
      hooks.onWarn({ key: 'spur', name: 'Rock Spur', warn: 'A dry rock spur scraped you. Mosses need moisture to survive.' });
    }

    emitHud();

    if (stats.moisture <= 0) {
      finish(false);
    }
  }

  function beginLanding() {
    if (mode === 'landing') { return; }
    mode = 'landing';
    player.y = zone.depth;
    player.vy = 0;
    player.vx *= 0.2;
    landing = { t: 0, phase: 'settle' };
    shake = 8;
    Sound.play('land');
    burst(player.x, player.y + 10, 26, '160,255,190', 3.0);
    rings.push({ x: player.x, y: player.y + 8, r: 12, max: 150, life: 0.9, t: 0, color: '160,255,190' });
  }

  function updateLanding(dt) {
    landing.t += dt;
    camY = lerp(camY, zone.depth - viewWorldH * 0.62, 1 - Math.pow(0.001, dt));
    if (landing.t > 2.6) {
      finish(true);
    }
  }

  function finish(win) {
    if (mode === 'over') { return; }
    mode = 'over';
    var total = zone.factTo - zone.factFrom;
    var stars = 0;
    if (win) {
      stars = 1;
      if (stats.facts.length === total) { stars = 2; }
      if (stats.facts.length === total && stats.hits === 0) { stars = 3; }
      stats.score += stats.moisture * 250;
      stats.score += Math.round(zone.depth / 10);
      Sound.play('win');
    } else {
      Sound.play('lose');
    }
    if (hooks.onEnd) {
      hooks.onEnd({
        win: win,
        zoneIndex: zoneIndex,
        zone: zone,
        score: stats.score,
        stars: stars,
        facts: stats.facts.slice(),
        total: total,
        hits: stats.hits,
        moisture: stats.moisture,
        bestStreak: stats.bestStreak,
        depth: Math.round(Math.min(stats.depth, zone.depth))
      });
    }
  }

  /* --------------------------------------------------------------- effects */

  function burst(x, y, n, rgb, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = (0.35 + Math.random()) * (speed || 3);
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6,
        life: 0.5 + Math.random() * 0.6, t: 0,
        size: 1.6 + Math.random() * 3.2,
        rgb: rgb
      });
    }
  }

  function wallSpark(x, y, dir) {
    for (var i = 0; i < 5; i++) {
      particles.push({
        x: x, y: y,
        vx: dir * (0.6 + Math.random() * 1.6), vy: (Math.random() - 0.3) * 1.6,
        life: 0.3 + Math.random() * 0.3, t: 0,
        size: 1.2 + Math.random() * 2,
        rgb: '190,255,210'
      });
    }
  }

  function updateEffects(dt) {
    var i;
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.t += dt;
      if (p.t >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * (dt / STEP) * 0.9;
      p.y += p.vy * (dt / STEP) * 0.9;
      p.vy += 0.06 * (dt / STEP);
      p.vx *= 0.97;
    }
    for (i = rings.length - 1; i >= 0; i--) {
      var r = rings[i];
      r.t += dt;
      if (r.t >= r.life) { rings.splice(i, 1); }
    }
    for (i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      f.t += dt;
      if (f.t >= f.life) { floaters.splice(i, 1); }
    }
    if (shake > 0) { shake = Math.max(0, shake - dt * 42); }
    if (flash > 0) { flash = Math.max(0, flash - dt * 1.6); }
    timeScale += (1 - timeScale) * Math.min(1, dt * 3.2);
  }

  /* ============================== RENDERING ============================== */

  function drawSky() {
    var z = zone || D.ZONES[0];
    var prog = mode === 'playing' || mode === 'landing' || mode === 'paused'
      ? clamp(camY / Math.max(1, z.depth), 0, 1) : 0.25;
    var g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, z.sky[0]);
    g.addColorStop(clamp(0.34 - prog * 0.2, 0.05, 0.5), z.sky[1]);
    g.addColorStop(clamp(0.72 - prog * 0.18, 0.5, 0.9), z.sky[2]);
    g.addColorStop(1, z.sky[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);

    // A soft pool of light from high above, drifting.
    var lx = cssW * (0.5 + Math.sin(clock * 0.07) * 0.18);
    var rg = ctx.createRadialGradient(lx, -cssH * 0.15, 10, lx, -cssH * 0.15, cssH * 1.15);
    rg.addColorStop(0, 'rgba(255,255,235,0.24)');
    rg.addColorStop(0.5, 'rgba(255,255,235,0.06)');
    rg.addColorStop(1, 'rgba(255,255,235,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  /** Distant silhouette bands: trunks and fern crowns, parallaxed. */
  function drawParallax(depthOffset, factor, alpha, tint, sizeScale, seedBase) {
    var z = zone || D.ZONES[0];
    var key = 'bg_' + (factor < 0.3 ? 'far' : 'mid') + '_' + z.id;
    var img = Assets.get(key);
    var off = (camY * factor + depthOffset);

    if (img) {
      var iw = cssW * 1.2;
      var ih = iw * (img.naturalHeight / img.naturalWidth);
      var yy = -((off * 0.4) % ih);
      ctx.globalAlpha = alpha;
      for (var t = -1; t <= Math.ceil(cssH / ih) + 1; t++) {
        ctx.drawImage(img, (cssW - iw) / 2, yy + t * ih, iw, ih);
      }
      ctx.globalAlpha = 1;
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint;
    var band = 320 * sizeScale;
    var first = Math.floor(off / band) - 1;
    for (var i = first; i < first + Math.ceil(cssH / (band * 0.55)) + 3; i++) {
      var sy = (i * band - off) * 0.55;
      if (sy > cssH + 260 || sy < -360) { continue; }
      var count = 5;
      for (var k = 0; k < count; k++) {
        var h1 = hash(seedBase + i * 31 + k * 7);
        var h2 = hash(seedBase + i * 57 + k * 13);
        var h3 = hash(seedBase + i * 91 + k * 3);
        var x = h1 * cssW;
        var w = (26 + h2 * 54) * sizeScale;
        var h = (140 + h3 * 230) * sizeScale;
        drawConifer(x, sy + h2 * 120, w, h);
      }
    }
    ctx.restore();
  }

  function drawConifer(x, baseY, w, h) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.14, baseY);
    ctx.lineTo(x - w * 0.14, baseY - h * 0.22);
    ctx.lineTo(x - w, baseY - h * 0.24);
    ctx.lineTo(x - w * 0.42, baseY - h * 0.52);
    ctx.lineTo(x - w * 0.78, baseY - h * 0.55);
    ctx.lineTo(x - w * 0.3, baseY - h * 0.8);
    ctx.lineTo(x - w * 0.5, baseY - h * 0.82);
    ctx.lineTo(x, baseY - h);
    ctx.lineTo(x + w * 0.5, baseY - h * 0.82);
    ctx.lineTo(x + w * 0.3, baseY - h * 0.8);
    ctx.lineTo(x + w * 0.78, baseY - h * 0.55);
    ctx.lineTo(x + w * 0.42, baseY - h * 0.52);
    ctx.lineTo(x + w, baseY - h * 0.24);
    ctx.lineTo(x + w * 0.14, baseY - h * 0.22);
    ctx.lineTo(x + w * 0.14, baseY);
    ctx.closePath();
    ctx.fill();
  }

  /** Drifting mist bands — pure decoration, never touches collision. */
  function drawMist(factor, alpha) {
    var z = zone || D.ZONES[0];
    var off = camY * factor;
    ctx.save();
    for (var i = 0; i < 6; i++) {
      var seed = i * 137.5;
      var y = ((i * 240 - off * 0.5) % (cssH + 480));
      if (y < -240) { y += cssH + 480; }
      var x = cssW * 0.5 + Math.sin(clock * 0.13 + seed) * cssW * 0.32;
      var w = cssW * (0.55 + hash(i) * 0.5);
      var h = 60 + hash(i + 9) * 90;
      var g = ctx.createRadialGradient(x, y, 4, x, y, w * 0.5);
      g.addColorStop(0, z.fog.replace(/[\d.]+\)$/, (alpha) + ')'));
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Slanted light shafts falling through the canopy. */
  function drawLightShafts() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      var t = clock * 0.06 + i * 2.1;
      var x = cssW * (0.2 + 0.3 * i) + Math.sin(t) * cssW * 0.06;
      var w = cssW * 0.1;
      var g = ctx.createLinearGradient(x, 0, x + w * 1.6, cssH);
      var a = 0.05 + 0.03 * Math.sin(t * 1.7);
      g.addColorStop(0, 'rgba(210,255,220,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(210,255,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x + w, -10);
      ctx.lineTo(x + w * 2.6, cssH + 10);
      ctx.lineTo(x + w * 1.5, cssH + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function wallEdgePoints(side) {
    var pts = [];
    var top = camY - 60;
    var bot = camY + viewWorldH + 60;
    for (var y = top; y <= bot; y += 16) {
      pts.push([toScreenX(laneCenter(y) + side * laneHalf(y)), toScreenY(y)]);
    }
    return pts;
  }

  function drawWalls() {
    if (!zone) { return; }
    [-1, 1].forEach(function (side) {
      var pts = wallEdgePoints(side);
      var edgeX = side < 0 ? -20 : cssW + 20;

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) { ctx.lineTo(pts[i][0], pts[i][1]); }
      ctx.lineTo(edgeX, pts[pts.length - 1][1]);
      ctx.lineTo(edgeX, pts[0][1]);
      ctx.closePath();

      // Wet rock: deep in shadow at the screen edge, catching light at the rim.
      var innerX = pts[Math.floor(pts.length / 2)][0];
      var g = ctx.createLinearGradient(side < 0 ? 0 : cssW, 0, innerX, 0);
      g.addColorStop(0, '#04100e');
      g.addColorStop(0.55, '#0b1c18');
      g.addColorStop(0.86, '#16302a');
      g.addColorStop(1, '#2a5245');
      ctx.fillStyle = g;
      ctx.fill();

      // Rock striations, clipped to the wall body.
      ctx.save();
      ctx.clip();
      var startBand = Math.floor((camY - 120) / 58);
      for (var b = startBand; b < startBand + Math.ceil(viewWorldH / 58) + 4; b++) {
        var wy = b * 58;
        var jitter = hash(b * 3 + side * 17) * 40;
        var sy = toScreenY(wy + jitter);
        var wxx = laneCenter(wy) + side * laneHalf(wy);
        var sx = toScreenX(wxx);
        // Broad, overlapping strata rather than discrete blobs.
        var rw = (110 + hash(b * 7 + side * 5) * 150) * scale;
        var rh = (14 + hash(b * 13 + side) * 22) * scale;
        var cx2 = sx - side * (rw * 0.62 + hash(b * 29) * 40 * scale);

        ctx.globalAlpha = 0.20;
        ctx.fillStyle = '#040d0b';
        ctx.beginPath();
        ctx.ellipse(cx2, sy + rh * 0.4, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.13;
        ctx.fillStyle = '#5d9482';
        ctx.beginPath();
        ctx.ellipse(cx2, sy - rh * 0.45, rw * 0.86, rh * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // A crisp dark crease right where the stone meets open air.
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(3,12,10,0.85)';
      ctx.lineWidth = Math.max(1.5, 3 * scale);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length; j++) { ctx.lineTo(pts[j][0], pts[j][1]); }
      ctx.stroke();
      ctx.restore();

      drawMossBand(pts, side);
    });
  }

  /**
   * A dense cushion of moss clinging to the inner lip of the canyon: overlapping
   * lit beads with a few blades combing out into the open air.
   */
  function drawMossBand(pts, side) {
    var dir = -side;                       // into the lane
    ctx.save();

    // Soft bloom behind the cushion.
    ctx.strokeStyle = 'rgba(90,230,140,0.22)';
    ctx.lineWidth = Math.max(4, 13 * scale);
    ctx.shadowColor = 'rgba(110,255,155,0.8)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var j = 1; j < pts.length; j++) { ctx.lineTo(pts[j][0], pts[j][1]); }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Beads of moss, sampled densely down the edge.
    var stepW = 13;
    var startB = Math.floor((camY - 60) / stepW);
    var countB = Math.ceil(viewWorldH / stepW) + 8;
    for (var i = 0; i < countB; i++) {
      var b = startB + i;
      var wy = b * stepW;
      var h1 = hash(b * 7.3 + side * 41);
      var h2 = hash(b * 3.1 + side * 13);
      var ex = laneCenter(wy) + side * laneHalf(wy);
      var sx = toScreenX(ex);
      var sy = toScreenY(wy);
      if (sy < -30 || sy > cssH + 30) { continue; }

      // Two or three overlapping lobes per sample so the edge reads as a
      // ragged cushion rather than a string of beads.
      var lobes = h1 > 0.55 ? 3 : 2;
      for (var L = 0; L < lobes; L++) {
        var hl = hash(b * 5.9 + L * 17.3 + side * 7);
        var hm = hash(b * 2.7 + L * 9.1 + side * 23);
        var rad = (2.6 + hl * 8.5) * scale;
        var off = dir * (hm * 11 - 3) * scale;
        var oy = (hl - 0.5) * 11 * scale;
        var bg = ctx.createRadialGradient(sx + off - rad * 0.35, sy + oy - rad * 0.4, rad * 0.12,
                                          sx + off, sy + oy, rad);
        bg.addColorStop(0, 'rgba(214,255,224,0.95)');
        bg.addColorStop(0.42, 'rgba(' + (66 + hl * 78 | 0) + ',' + (192 + hl * 63 | 0) + ',' + (112 + hm * 58 | 0) + ',0.92)');
        bg.addColorStop(1, 'rgba(13,66,41,0.7)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(sx + off, sy + oy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Blades combing out into the lane, swaying gently.
    ctx.lineCap = 'round';
    var stepBl = 26;
    var startBl = Math.floor((camY - 60) / stepBl);
    var countBl = Math.ceil(viewWorldH / stepBl) + 4;
    for (var k = 0; k < countBl; k++) {
      var bb = startBl + k;
      var wy2 = bb * stepBl;
      var hh = hash(bb * 11.7 + side * 91);
      if (hh < 0.30) { continue; }
      var ex2 = laneCenter(wy2) + side * laneHalf(wy2);
      var bx = toScreenX(ex2);
      var by = toScreenY(wy2);
      if (by < -30 || by > cssH + 30) { continue; }

      var blades = 3;
      for (var n = 0; n < blades; n++) {
        var hn = hash(bb * 5 + n * 3.7 + side);
        var len = (7 + hn * 13) * scale;
        var lean = (hn - 0.5) * 0.8 + Math.sin(clock * 1.1 + bb * 0.4 + n) * 0.16;
        ctx.strokeStyle = 'rgba(' + (120 + hn * 90 | 0) + ',255,' + (150 + hn * 60 | 0) + ',0.7)';
        ctx.lineWidth = Math.max(1, 2.1 * scale);
        ctx.beginPath();
        ctx.moveTo(bx, by + (n - 1) * 3 * scale);
        ctx.quadraticCurveTo(
          bx + dir * len * 0.55, by + (n - 1) * 3 * scale - len * 0.30 + lean * len * 0.3,
          bx + dir * len, by + (n - 1) * 3 * scale - len * 0.55 + lean * len
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ entities */

  function drawOrb(o) {
    var sx = toScreenX(o.x);
    var sy = toScreenY(o.y + Math.sin(o.phase) * 5);
    if (sy < -80 || sy > cssH + 80) { return; }
    var r = o.r * scale;
    var pulse = 1 + Math.sin(o.phase * 1.6) * 0.07;

    if (Assets.drawCentered(ctx, 'dew_orb', sx, sy, r * 2.6 * pulse, r * 2.6 * pulse, 0)) { return; }

    ctx.save();
    // Outer halo — lit from within.
    var halo = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 2.6 * pulse);
    halo.addColorStop(0, 'rgba(150,240,255,0.55)');
    halo.addColorStop(0.45, 'rgba(120,220,255,0.20)');
    halo.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.6 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Body.
    var g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.28, '#d8fbff');
    g.addColorStop(0.62, '#6fe0ff');
    g.addColorStop(1, '#1a7fa8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Leaf glyph inside the drop.
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.sin(o.phase * 0.6) * 0.25);
    ctx.fillStyle = 'rgba(20,90,70,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.42, -r * 0.1, 0, r * 0.55);
    ctx.quadraticCurveTo(-r * 0.42, -r * 0.1, 0, -r * 0.55);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
    ctx.stroke();
    ctx.restore();

    // Spinning rim highlight.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, r * 0.10);
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.94, o.phase, o.phase + 1.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawMoisture(pu) {
    var sx = toScreenX(pu.x);
    var sy = toScreenY(pu.y + Math.sin(pu.phase) * 6);
    if (sy < -80 || sy > cssH + 80) { return; }
    var r = pu.r * scale;
    if (Assets.drawCentered(ctx, 'moisture_drop', sx, sy, r * 2.4, r * 2.8, 0)) { return; }

    ctx.save();
    var halo = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 2.3);
    halo.addColorStop(0, 'rgba(190,250,255,0.5)');
    halo.addColorStop(1, 'rgba(190,250,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, r * 2.3, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 1.5);
    ctx.quadraticCurveTo(sx + r, sy - r * 0.1, sx + r * 0.72, sy + r * 0.5);
    ctx.arc(sx, sy + r * 0.35, r * 0.78, 0.35, Math.PI - 0.35);
    ctx.quadraticCurveTo(sx - r, sy - r * 0.1, sx, sy - r * 1.5);
    var g = ctx.createRadialGradient(sx - r * 0.3, sy, r * 0.1, sx, sy, r * 1.3);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#bff3ff');
    g.addColorStop(1, '#2b93bd');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function drawHazard(hz) {
    var sy = toScreenY(hz.y);
    if (sy < -140 || sy > cssH + 140) { return; }
    var sx = toScreenX(hz.x);

    if (hz.kind === 'spur') { drawSpur(hz, sx, sy); return; }

    var key = 'hazard_' + hz.type.key;
    var sway = Math.sin(hz.phase) * 0.18;
    var size = hz.r * 2.5 * scale;
    if (Assets.drawCentered(ctx, key, sx, sy, size, size, sway)) { return; }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sway);
    var r = hz.r * scale;

    // Warning aura so hazards always read as dangerous.
    var aura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2);
    aura.addColorStop(0, 'rgba(255,120,80,0.22)');
    aura.addColorStop(1, 'rgba(255,120,80,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();

    if (hz.type.key === 'fern') { drawFern(r); }
    else if (hz.type.key === 'cone') { drawCone(r); }
    else { drawBloom(r); }

    ctx.restore();
  }

  /** A pinnate frond: arching rachis with paired leaflets tapering to the tip. */
  function drawFern(r) {
    var n = 9;

    // Rachis.
    ctx.strokeStyle = '#2b6d34';
    ctx.lineWidth = Math.max(1.4, r * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, r * 1.25);
    ctx.quadraticCurveTo(r * 0.22, 0, -r * 0.04, -r * 1.28);
    ctx.stroke();

    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);                       // 0 at the base, 1 at the tip
      var py = r * 1.18 - t * r * 2.4;
      var px = -r * 0.10 + Math.sin(t * Math.PI) * r * 0.18;
      var len = r * (0.95 - t * 0.66);
      var wide = len * 0.27;

      for (var s = -1; s <= 1; s += 2) {
        var ex = s * len * 0.92;
        var ey = -len * (0.42 + t * 0.22);
        var mag = Math.sqrt(ex * ex + ey * ey) || 1;
        var nx = -ey / mag, ny = ex / mag;       // unit normal to the leaflet axis

        var lg = ctx.createLinearGradient(px, py, px + ex, py + ey);
        lg.addColorStop(0, '#1f5c28');
        lg.addColorStop(0.55, '#43a04d');
        lg.addColorStop(1, '#7fd98a');
        ctx.fillStyle = lg;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + ex * 0.45 + nx * wide, py + ey * 0.45 + ny * wide, px + ex, py + ey);
        ctx.quadraticCurveTo(px + ex * 0.5 - nx * wide, py + ey * 0.5 - ny * wide, px, py);
        ctx.fill();

        // Sori on the underside of the lower leaflets: the fern giveaway.
        if (t < 0.55) {
          ctx.fillStyle = 'rgba(126,66,28,0.85)';
          for (var d = 1; d <= 3; d++) {
            var f = d / 4;
            ctx.beginPath();
            ctx.arc(px + ex * f - nx * wide * 0.35, py + ey * f - ny * wide * 0.35,
                    Math.max(0.8, r * 0.055), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  function drawCone(r) {
    var g = ctx.createLinearGradient(-r * 0.6, -r, r * 0.6, r);
    g.addColorStop(0, '#a5773f');
    g.addColorStop(0.5, '#7a5326');
    g.addColorStop(1, '#4a3116');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.72, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,225,180,0.28)';
    for (var row = -3; row <= 3; row++) {
      for (var c = -1; c <= 1; c++) {
        var yy = row * r * 0.3;
        var xx = c * r * 0.4 + (row % 2 ? r * 0.18 : 0);
        var w = r * 0.3 * (1 - Math.abs(row) * 0.12);
        ctx.beginPath();
        ctx.ellipse(xx, yy, w, r * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(40,26,12,0.7)';
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.72, r * 1.15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBloom(r) {
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI * 2 * i) / 6;
      ctx.save();
      ctx.rotate(a);
      var g = ctx.createLinearGradient(0, 0, 0, -r * 1.15);
      g.addColorStop(0, '#c94fa8');
      g.addColorStop(1, '#ffd0ee');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.72, r * 0.3, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    var cg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.05, 0, 0, r * 0.45);
    cg.addColorStop(0, '#fff6c2');
    cg.addColorStop(1, '#e0a028');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpur(hz, sx, sy) {
    var len = hz.len * scale;
    var dir = -hz.side;
    if (Assets.drawCentered(ctx, 'hazard_spur', sx, sy, len * 1.6, len * 1.2, hz.side < 0 ? 0 : Math.PI)) { return; }

    ctx.save();
    ctx.translate(sx, sy);

    var tipX = dir * len * 0.78;
    var tipY = -len * 0.06;
    var backTop = [-dir * len * 0.72, -len * 0.44];
    var backBot = [-dir * len * 0.72, len * 0.48];
    var midBot = [dir * len * 0.6, len * 0.16];

    // Shadow the spur casts on the wall behind it.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(backTop[0], backTop[1] + 6 * scale);
    ctx.lineTo(tipX, tipY + 8 * scale);
    ctx.lineTo(midBot[0], midBot[1] + 8 * scale);
    ctx.lineTo(backBot[0], backBot[1] + 6 * scale);
    ctx.closePath();
    ctx.fill();

    // Lit upper face.
    var gTop = ctx.createLinearGradient(0, -len * 0.44, 0, len * 0.06);
    gTop.addColorStop(0, '#6d9683');
    gTop.addColorStop(0.5, '#40685a');
    gTop.addColorStop(1, '#223c33');
    ctx.fillStyle = gTop;
    ctx.beginPath();
    ctx.moveTo(backTop[0], backTop[1]);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(-dir * len * 0.72, len * 0.04);
    ctx.closePath();
    ctx.fill();

    // Shaded underside.
    var gBot = ctx.createLinearGradient(0, 0, 0, len * 0.5);
    gBot.addColorStop(0, '#1c332b');
    gBot.addColorStop(1, '#08120f');
    ctx.fillStyle = gBot;
    ctx.beginPath();
    ctx.moveTo(-dir * len * 0.72, len * 0.02);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(midBot[0], midBot[1]);
    ctx.lineTo(backBot[0], backBot[1]);
    ctx.closePath();
    ctx.fill();

    // Bright edge catching the light from above.
    ctx.strokeStyle = 'rgba(196,235,212,0.6)';
    ctx.lineWidth = Math.max(1, 1.8 * scale);
    ctx.beginPath();
    ctx.moveTo(backTop[0], backTop[1]);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Moss growing along the top of the spur.
    var n = 7;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var mx = backTop[0] + (tipX - backTop[0]) * t;
      var my = backTop[1] + (tipY - backTop[1]) * t;
      var hs = hash(hz.seed + i * 13);
      var rad = (2.5 + hs * 4) * scale * (1 - t * 0.45);
      var mg = ctx.createRadialGradient(mx - rad * 0.3, my - rad * 0.4, rad * 0.1, mx, my - rad * 0.2, rad);
      mg.addColorStop(0, 'rgba(210,255,225,0.95)');
      mg.addColorStop(0.5, 'rgba(100,225,145,0.85)');
      mg.addColorStop(1, 'rgba(18,80,50,0.6)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my - rad * 0.25, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    var p = player;
    if (!p) { return; }
    var sx = toScreenX(p.x);
    var sy = toScreenY(p.y);
    var r = p.r * scale;

    // Dew trail.
    for (var i = 0; i < p.trail.length; i++) {
      var t = i / p.trail.length;
      var tx = toScreenX(p.trail[i].x);
      var ty = toScreenY(p.trail[i].y);
      ctx.fillStyle = 'rgba(140,255,190,' + (t * 0.22).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(tx, ty, r * (0.25 + t * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }

    var blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
    if (blink) { return; }

    if (Assets.drawCentered(ctx, p.invuln > 0 ? 'spore_hurt' : 'spore', sx, sy, r * 3.4, r * 3.4, Math.sin(p.wobble) * 0.1)) {
      return;
    }

    ctx.save();
    // Glow.
    var halo = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 3);
    halo.addColorStop(0, 'rgba(150,255,190,0.5)');
    halo.addColorStop(0.4, 'rgba(110,255,160,0.18)');
    halo.addColorStop(1, 'rgba(110,255,160,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, r * 3, 0, Math.PI * 2); ctx.fill();

    // Cilia.
    ctx.strokeStyle = 'rgba(190,255,215,0.75)';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.lineCap = 'round';
    for (var c = 0; c < 7; c++) {
      var a = (Math.PI * 2 * c) / 7 + Math.sin(p.wobble * 0.6) * 0.2;
      var wob = Math.sin(p.wobble + c) * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r * 0.9, sy + Math.sin(a) * r * 0.9);
      ctx.quadraticCurveTo(
        sx + Math.cos(a + wob) * r * 1.5, sy + Math.sin(a + wob) * r * 1.5,
        sx + Math.cos(a + wob * 1.6) * r * 1.9, sy + Math.sin(a + wob * 1.6) * r * 1.9
      );
      ctx.stroke();
    }

    // Body.
    var squash = 1 + Math.sin(p.wobble) * 0.06;
    var g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.08, sx, sy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, '#d6ffe2');
    g.addColorStop(0.6, '#6bff9e');
    g.addColorStop(1, '#0c6a3c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r / squash, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.34, sy - r * 0.38, r * 0.2, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The bottom of a zone: damp soil, then the spore germinating. */
  function drawGround() {
    if (!zone) { return; }
    var gy = toScreenY(zone.depth + 26);
    if (gy > cssH + 40) { return; }

    var img = Assets.get('ground');
    if (img) {
      ctx.drawImage(img, 0, gy - 20, cssW, Math.max(40, cssH - gy + 40));
    } else {
      var s0 = Math.max(0.6, scale);

      // Peat and soil: dark, damp, layered.
      var g = ctx.createLinearGradient(0, gy, 0, cssH);
      g.addColorStop(0, '#1a4a30');
      g.addColorStop(0.12, '#123a26');
      g.addColorStop(0.45, '#0b2519');
      g.addColorStop(1, '#050f0b');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy - 10, cssW, cssH - gy + 40);

      // Soil strata and grit.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, gy, cssW, cssH - gy + 40);
      ctx.clip();
      for (var st = 0; st < 5; st++) {
        var sy2 = gy + (24 + st * 46) * s0;
        if (sy2 > cssH) { break; }
        ctx.globalAlpha = 0.16 - st * 0.02;
        ctx.fillStyle = st % 2 ? '#3d6d4f' : '#04100b';
        ctx.beginPath();
        ctx.ellipse(cssW * (0.2 + hash(st * 13 + zone.id) * 0.6), sy2,
                    cssW * (0.35 + hash(st * 7) * 0.4), (12 + hash(st * 5) * 16) * s0,
                    0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.5;
      for (var gr = 0; gr < 46; gr++) {
        var hx = hash(gr * 31 + zone.id * 3);
        var hy2 = hash(gr * 17 + zone.id * 11);
        var py2 = gy + 14 * s0 + hy2 * (cssH - gy);
        if (py2 > cssH) { continue; }
        ctx.fillStyle = hash(gr * 5) > 0.6 ? 'rgba(140,190,160,0.5)' : 'rgba(4,14,10,0.7)';
        ctx.beginPath();
        ctx.arc(hx * cssW, py2, (0.8 + hash(gr * 3) * 2.2) * s0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // The living moss carpet on top, lit from within.
      var mg = ctx.createLinearGradient(0, gy - 16 * s0, 0, gy + 16 * s0);
      mg.addColorStop(0, '#a8ffc6');
      mg.addColorStop(0.35, '#4fd07f');
      mg.addColorStop(1, '#12603a');
      ctx.fillStyle = mg;
      ctx.fillRect(0, gy - 8 * s0, cssW, 18 * s0);

      // Moss cushions along the surface.
      for (var i = 0; i < 20; i++) {
        var h = hash(i * 23 + zone.id * 7);
        var h2 = hash(i * 41 + zone.id * 5);
        var cx2 = ((i + h * 0.8) / 20) * cssW;
        var w = (26 + h * 62) * s0;
        var cg = ctx.createRadialGradient(cx2 - w * 0.2, gy - w * 0.34, w * 0.08, cx2, gy, w);
        cg.addColorStop(0, 'rgba(216,255,230,0.95)');
        cg.addColorStop(0.4, 'rgba(96,222,140,0.85)');
        cg.addColorStop(1, 'rgba(18,80,50,0.1)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(cx2, gy - 2 * s0, w, w * (0.34 + h2 * 0.2), 0, Math.PI, 0);
        ctx.fill();
      }

      // Glow where the moss meets the air.
      var lg2 = ctx.createLinearGradient(0, gy - 40 * s0, 0, gy);
      lg2.addColorStop(0, 'rgba(120,255,170,0)');
      lg2.addColorStop(1, 'rgba(120,255,170,0.22)');
      ctx.fillStyle = lg2;
      ctx.fillRect(0, gy - 40 * s0, cssW, 40 * s0);
    }

    if (landing) { drawGermination(gy); }
  }

  /** Spore -> protonema -> leafy gametophyte, played on a successful landing. */
  function drawGermination(gy) {
    var t = clamp(landing.t / 2.4, 0, 1);
    var sx = toScreenX(player.x);
    var base = gy - 6;
    var s = Math.max(0.7, scale);

    ctx.save();

    if (Assets.has('protonema') && t < 0.55) {
      Assets.drawCentered(ctx, 'protonema', sx, base - 20 * s, 90 * s * t * 2, 60 * s * t * 2, 0);
    } else if (t > 0.05) {
      // Protonema: fine branching green filaments.
      var fil = clamp(t / 0.5, 0, 1);
      ctx.strokeStyle = 'rgba(140,255,175,' + (0.9 - Math.max(0, t - 0.6)).toFixed(2) + ')';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.lineCap = 'round';
      for (var i = 0; i < 9; i++) {
        var a = Math.PI + (i / 8) * Math.PI;
        var len = 46 * s * fil * (0.5 + hash(i * 5) * 0.8);
        ctx.beginPath();
        ctx.moveTo(sx, base);
        ctx.quadraticCurveTo(
          sx + Math.cos(a) * len * 0.6, base + Math.sin(a) * len * 0.35,
          sx + Math.cos(a) * len, base + Math.sin(a) * len * 0.5
        );
        ctx.stroke();
      }
    }

    if (t > 0.45) {
      var gt = clamp((t - 0.45) / 0.55, 0, 1);
      var h = 78 * s * gt;
      if (!Assets.drawCentered(ctx, 'gametophyte', sx, base - h * 0.5, 70 * s * gt, h, 0)) {
        // Leafy gametophyte rising out of the protonema.
        ctx.strokeStyle = '#4fd47f';
        ctx.lineWidth = Math.max(2, 4 * s);
        ctx.beginPath();
        ctx.moveTo(sx, base);
        ctx.lineTo(sx, base - h);
        ctx.stroke();
        for (var k = 0; k < 7; k++) {
          var ly = base - h * (0.22 + k * 0.12);
          if (ly > base) { continue; }
          var side = k % 2 ? 1 : -1;
          var ll = 26 * s * gt * (1 - k * 0.07);
          var lg = ctx.createLinearGradient(sx, ly, sx + side * ll, ly - ll * 0.4);
          lg.addColorStop(0, '#d6ffe2');
          lg.addColorStop(1, '#1f8a52');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(sx, ly);
          ctx.quadraticCurveTo(sx + side * ll * 0.6, ly - ll * 0.55, sx + side * ll, ly - ll * 0.15);
          ctx.quadraticCurveTo(sx + side * ll * 0.5, ly + ll * 0.12, sx, ly);
          ctx.fill();
        }
        // Glow of a new plant taking hold.
        var glow = ctx.createRadialGradient(sx, base - h * 0.5, 2, sx, base - h * 0.5, 70 * s);
        glow.addColorStop(0, 'rgba(150,255,190,' + (0.35 * gt).toFixed(2) + ')');
        glow.addColorStop(1, 'rgba(150,255,190,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sx, base - h * 0.5, 70 * s, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawEffects() {
    var i;
    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = 1 - p.t / p.life;
      ctx.fillStyle = 'rgba(' + p.rgb + ',' + (a * 0.9).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(toScreenX(p.x), toScreenY(p.y), p.size * scale * a, 0, Math.PI * 2);
      ctx.fill();
    }
    for (i = 0; i < rings.length; i++) {
      var r = rings[i];
      var rt = r.t / r.life;
      ctx.strokeStyle = 'rgba(' + r.color + ',' + ((1 - rt) * 0.8).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, (1 - rt) * 5 * scale);
      ctx.beginPath();
      ctx.arc(toScreenX(r.x), toScreenY(r.y), (r.r + (r.max - r.r) * rt) * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      var ft = f.t / f.life;
      ctx.save();
      ctx.globalAlpha = 1 - ft;
      ctx.fillStyle = f.color;
      ctx.font = 'bold ' + Math.round(16 * Math.max(0.8, scale)) + 'px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, toScreenX(f.x), toScreenY(f.y) - ft * 42);
      ctx.restore();
    }
  }

  /** Foreground motes drifting past the camera — ambient depth cue. */
  function drawMotes() {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y -= m.sp * (mode === 'playing' ? 1.6 : 0.5);
      m.x += Math.sin(clock * 0.5 + m.drift) * 0.22;
      if (m.y < -12) { m.y = cssH + 12; m.x = Math.random() * cssW; }
      if (m.x < -12) { m.x = cssW + 12; } else if (m.x > cssW + 12) { m.x = -12; }
      var g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3.2);
      g.addColorStop(0, 'rgba(210,255,225,' + m.a.toFixed(2) + ')');
      g.addColorStop(1, 'rgba(210,255,225,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVignette() {
    var g = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.32,
                                     cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function drawSpeedLines() {
    if (mode !== 'playing' || !player) { return; }
    var spd = player.vy / zone.fallMax;
    if (spd < 0.75) { return; }
    var a = (spd - 0.75) * 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(210,255,235,' + a.toFixed(3) + ')';
    ctx.lineWidth = 1.4;
    for (var i = 0; i < 14; i++) {
      var x = hash(i * 41 + Math.floor(clock * 6)) * cssW;
      var y = hash(i * 13 + Math.floor(clock * 6) + 5) * cssH;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 26 + spd * 30);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawSky();
    drawParallax(0, 0.14, 0.35, '#06231f', 1.25, 11);
    drawParallax(140, 0.30, 0.45, '#0a3128', 1.0, 233);
    drawLightShafts();
    drawMist(0.5, 0.13);

    if (mode !== 'attract' && zone) {
      drawWalls();
      drawGround();

      for (var i = 0; i < hazards.length; i++) { drawHazard(hazards[i]); }
      for (var j = 0; j < pickups.length; j++) { if (pickups[j].alive) { drawMoisture(pickups[j]); } }
      for (var k = 0; k < orbs.length; k++) { if (orbs[k].alive) { drawOrb(orbs[k]); } }

      if (mode !== 'over' || landing) { drawPlayer(); }
      drawEffects();
      drawSpeedLines();
    }

    drawMist(0.85, 0.06);
    drawMotes();
    drawVignette();

    if (flash > 0.01) {
      ctx.fillStyle = 'rgba(' + flashColor + ',' + (flash * 0.28).toFixed(3) + ')';
      ctx.fillRect(0, 0, cssW, cssH);
    }
    ctx.restore();
  }

  /* ----------------------------------------------------------- main loop */

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!lastTime) { lastTime = now; }
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.25) { dt = 0.25; }     // tab was backgrounded
    clock += dt;

    if (mode === 'playing' || mode === 'landing') {
      accumulator += dt * timeScale;
      var steps = 0;
      while (accumulator >= STEP && steps < 5) {
        if (mode === 'playing') { updatePlaying(STEP); }
        else if (mode === 'landing') { updateLanding(STEP); }
        accumulator -= STEP;
        steps++;
      }
      if (steps >= 5) { accumulator = 0; }

      // Keep the depth gauge live without writing to the DOM every frame.
      hudTimer += dt;
      if (hudTimer > 0.1) { hudTimer = 0; emitHud(); }
    }

    if (mode !== 'paused') { updateEffects(dt); }
    render();
  }

  /* ---------------------------------------------------------------- input */

  function setKey(name, down) {
    if (name in keys) { keys[name] = !!down; }
  }

  function clearKeys() {
    keys.left = keys.right = keys.down = false;
    pointerTarget = null;
  }

  /** Steer toward a screen-space x coordinate (pointer / touch). */
  function setPointer(clientX) {
    if (!canvas) { return; }
    var rect = canvas.getBoundingClientRect();
    pointerTarget = (clientX - rect.left - cssW / 2) / scale;
  }

  function clearPointer() { pointerTarget = null; }

  /* --------------------------------------------------------------- export */

  global.Game = {
    init: init,
    resize: resize,
    attract: attract,
    startZone: startZone,
    pause: pause,
    resume: resume,
    stop: stop,
    setKey: setKey,
    clearKeys: clearKeys,
    setPointer: setPointer,
    clearPointer: clearPointer,
    getMode: function () { return mode; },
    isPlayable: function () { return mode === 'playing' || mode === 'paused'; },
    MAX_MOISTURE: MAX_MOISTURE
  };
})(window);
