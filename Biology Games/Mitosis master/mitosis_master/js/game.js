/* ==========================================================================
   game.js - simulation, input and the stage loop.

   Gameplay is unchanged from the original prototype: five stages with the
   same actions, thresholds and completion rules.  What changed is that every
   threshold is now expressed relative to the cell radius (so the game plays
   identically at any screen size), input runs through Pointer Events, and
   the stage state machine is guarded against the stale-timer and
   no-visual-feedback bugs in the original.
   ========================================================================== */

/* Stage table, shared with the UI layer. */
var PHASES = [
  {
    n: 1, name: 'PROPHASE', icon: 'phase_1', par: 30,
    blurb: 'Chromatin condenses and the spindle poles separate.',
    obj: 'Tap each chromatin thread to condense it, then drag both centrosomes to opposite poles.'
  },
  {
    n: 2, name: 'METAPHASE', icon: 'phase_2', par: 26,
    blurb: 'Every chromosome lines up on the equator.',
    obj: 'Drag all four chromosomes onto the metaphase plate down the centre.'
  },
  {
    n: 3, name: 'ANAPHASE', icon: 'phase_3', par: 18,
    blurb: 'Sister chromatids are pulled to opposite poles.',
    obj: 'Tap each centromere to separate the sister chromatids.'
  },
  {
    n: 4, name: 'TELOPHASE', icon: 'phase_4', par: 44,
    blurb: 'Two new nuclei are assembled.',
    obj: 'Tap the chromatids to unwind them back into chromatin.'
  },
  {
    n: 5, name: 'CYTOKINESIS', icon: 'phase_5', par: 26,
    blurb: 'The cytoplasm is finally split in two.',
    obj: 'Choose the cell type, then divide the cytoplasm.'
  }
];

var TELO_OBJ = [
  'Tap the chromatids to unwind them back into chromatin.',
  'Press and trace around each dotted ring to rebuild the nuclear envelope.',
  'Drag each nucleolus into a new nucleus.'
];

var Game = (function () {
  'use strict';

  var canvas, ctx;
  var dpr = 1;

  /* ---------------------------------------------------------- geometry --- */
  /* All gameplay distances derive from st.R, so play is size-independent. */
  var st = { w: 0, h: 0, cx: 0, cy: 0, R: 1, poleOff: 1 };

  var K = {
    HIT:        0.145,   /* tap / grab radius            */
    SNAP:       0.260,   /* drop tolerance               */
    POLE:       0.520,   /* pole distance from centre    */
    CLUSTER:    0.130,   /* chromatid offset from pole   */
    ENV_R:      0.235,   /* nuclear envelope radius      */
    ENV_TOL:    0.100,   /* trace tolerance              */
    ALIGN_TOL:  0.062,   /* metaphase snap window        */
    ARRIVE:     0.034,   /* anaphase arrival window      */
    PINCH_MIN:  0.160,   /* animal: min |dy| for a pinch */
    JITTER:     0.007    /* unaligned drift              */
  };

  function px(k) { return st.R * K[k]; }

  /* ------------------------------------------------------------- state --- */
  var S = null;
  var mode = 'attract';          /* 'attract' | 'play' */
  var paused = false;
  var advanceToken = 0;          /* invalidates stale auto-advance timers */

  var chromosomes = [];
  var centrosomes = [];
  var nucleoli = [];
  var vesicles = [];

  /* ------------------------------------------------------------- input --- */
  var activeId = null;
  var isDown = false;
  var dragged = null;
  var lastPos = { x: 0, y: 0 };

  var lastT = 0;
  var running = false;

  /* ====================================================================== */
  /*                              BOOTSTRAP                                 */
  /* ====================================================================== */
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    /* Older WebViews lack roundRect; the renderer uses its own path helper,
       but keep a polyfill in case a future edit reaches for the native one. */
    if (ctx && !ctx.roundRect) {
      ctx.roundRect = function (x, y, w, h, r) {
        Render.roundRectPath(this, x, y, w, h, Array.isArray(r) ? r[0] : r);
        return this;
      };
    }

    measure();
    Backdrop.build(st.w, st.h);
    bindInput();

    window.addEventListener('resize', onResize, false);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize, false);
    }
    window.addEventListener('orientationchange', function () {
      window.setTimeout(onResize, 220);
    }, false);
  }

  /* ------------------------------------------------------------ measure -- */
  function measure() {
    var prev = { cx: st.cx, cy: st.cy, R: st.R, w: st.w, h: st.h };

    var w = Math.max(1, window.innerWidth);
    var h = Math.max(1, window.innerHeight);

    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    st.w = w;
    st.h = h;

    /* Reserve only the solid HUD bezel at the top and the control band at
       the bottom, then give the specimen everything that is left. The
       objective pill and the counter lozenges are translucent and float
       over the cell's outer edge on purpose, which keeps the cell as large
       as the screen allows.                                              */
    var hud = document.getElementById('hud');
    var bezel = hud ? hud.querySelector('.bezel') : null;
    var topPad;
    if (bezel && !hud.hidden && bezel.offsetHeight) {
      topPad = bezel.getBoundingClientRect().bottom + 8;
    } else {
      topPad = (h < 520 ? 62 : 78);
    }
    var botPad = Math.max(70, Math.min(124, h * 0.155));
    var avail = Math.max(80, h - topPad - botPad);

    st.cx = w / 2;
    st.cy = topPad + avail / 2;

    /* Fill as much of the free area as possible while staying circular. */
    st.R = Math.min(w * 0.470, avail * 0.492);
    st.R = Math.max(st.R, Math.min(w, h) * 0.21);
    st.poleOff = st.R * K.POLE;

    return prev;
  }

  /* Keep the simulation valid across a resize / rotation by mapping every
     entity through the old -> new (centre, radius) transform. */
  function onResize() {
    var prev = measure();
    Backdrop.build(st.w, st.h);

    if (!prev.R || prev.R === st.R) {
      if (prev.cx === st.cx && prev.cy === st.cy) { return; }
    }
    var k = st.R / (prev.R || st.R);

    function map(o, xk, yk) {
      o[xk] = st.cx + (o[xk] - prev.cx) * k;
      o[yk] = st.cy + (o[yk] - prev.cy) * k;
    }

    chromosomes.forEach(function (c) {
      map(c, 'x', 'y');
      map(c, 'lx', 'ly');
      map(c, 'rx', 'ry');
      if (c.isAligned) { c.x = st.cx; }
    });

    centrosomes.forEach(function (c) {
      if (c.isPlaced) {
        c.x = st.cx + (c.side === 'left' ? -st.poleOff : st.poleOff);
        c.y = st.cy;
      } else {
        map(c, 'x', 'y');
      }
    });

    nucleoli.forEach(function (o) { map(o, 'x', 'y'); });
    vesicles.forEach(function (v) { map(v, 'x', 'y'); map(v, 'tx', 'ty'); });

    Fx.reset();
    if (typeof UI !== 'undefined' && UI.refreshHud) { UI.refreshHud(); }
  }

  /* ====================================================================== */
  /*                             NEW GAME / STAGES                          */
  /* ====================================================================== */
  function blankState() {
    return {
      phase: 0,
      teloStep: 0,
      sub: '',
      pinch: 0,
      plate: 0,
      env: { left: 0, right: 0 },
      parentEnv: 1,        /* parent nuclear envelope integrity, 1 -> 0 */
      autoAdv: false,
      nextReady: false,
      startedAt: 0,
      phaseStartedAt: 0,
      misses: 0,
      phaseMisses: 0,
      stars: [0, 0, 0, 0, 0],
      startPhase: 0,
      finished: false
    };
  }

  function poleX(side) {
    return st.cx + (side === 'left' ? -st.poleOff : st.poleOff);
  }

  /* Vertical position a chromatid settles at once it reaches a pole. The
     spread is compressed so the whole cluster sits inside the nuclear
     envelope radius (ENV_R) that telophase builds around it. */
  function clusterY(y) {
    return st.cy + (y - st.cy) * 0.45;
  }

  function makeChromosomes() {
    chromosomes = [];
    for (var i = 0; i < 4; i++) {
      /* Spread the threads around the nucleus instead of overlapping. */
      var a = (i / 4) * 6.2832 + 0.6;
      var rr = st.R * (0.16 + (i % 2) * 0.10);
      chromosomes.push({
        id: i,
        tint: i,
        x: st.cx + Math.cos(a) * rr,
        y: st.cy + Math.sin(a) * rr,
        isCondensed: false,
        isAligned: false,
        isSplit: false,
        lx: 0, ly: 0, rx: 0, ry: 0
      });
    }
  }

  function makeCentrosomes() {
    centrosomes = [
      { x: st.cx - st.R * 0.31, y: st.cy - st.R * 0.42, isPlaced: false, side: 'left'  },
      { x: st.cx + st.R * 0.31, y: st.cy - st.R * 0.42, isPlaced: false, side: 'right' }
    ];
  }

  function spawnNucleoli() {
    if (nucleoli.length) { return; }
    /* One nucleolus per daughter nucleus. The prototype also asked for ER
       and Golgi here; the design review marked those two as not needed, and
       the nucleolus is the organelle that genuinely reappears in telophase. */
    nucleoli = [
      { x: st.cx - st.R * 0.14, y: st.cy + st.R * 0.72, targetSide: 'left',  isPlaced: false },
      { x: st.cx + st.R * 0.14, y: st.cy + st.R * 0.72, targetSide: 'right', isPlaced: false }
    ];
  }

  /* Spread the chromosomes well clear of the metaphase plate and stack them
     down the cell. Used both by Stage Select and by the prophase -> metaphase
     transition; the prototype only reset Y on the transition, so a chromosome
     left near the centre could count as aligned the instant the stage began. */
  function layoutMetaphaseStart() {
    chromosomes.forEach(function (c, i) {
      var dir = (i % 2 === 0) ? -1 : 1;
      c.x = st.cx + dir * st.R * (0.36 + 0.14 * Math.random());
      c.y = st.cy + (i - 1.5) * st.R * 0.30;
      c.isAligned = false;
    });
  }

  /* Build whatever prior state a stage needs, so Stage Select can start
     anywhere and still present a coherent cell. */
  function buildStage(n) {
    makeChromosomes();
    makeCentrosomes();
    nucleoli = [];
    vesicles = [];

    S.phase = n;
    S.teloStep = 0;
    S.sub = '';
    S.pinch = 0;
    S.plate = 0;
    S.env = { left: 0, right: 0 };
    S.autoAdv = false;
    S.nextReady = false;
    S.parentEnv = (n === 0) ? 1 : 0;

    if (n >= 1) {
      /* condensed chromosomes, poles established */
      chromosomes.forEach(function (c) { c.isCondensed = true; });
      centrosomes.forEach(function (c) {
        c.isPlaced = true; c.x = poleX(c.side); c.y = st.cy;
      });
    }

    if (n === 1) { layoutMetaphaseStart(); }

    if (n >= 2) {
      chromosomes.forEach(function (c, i) {
        c.isAligned = true;
        c.x = st.cx;
        c.y = st.cy + (i - 1.5) * st.R * 0.28;
      });
    }

    if (n >= 3) {
      /* chromatids already at the poles */
      chromosomes.forEach(function (c) {
        c.isSplit = true;
        c.lx = poleX('left')  + px('CLUSTER');
        c.rx = poleX('right') - px('CLUSTER');
        c.ly = clusterY(c.y);
        c.ry = clusterY(c.y);
      });
    }

    if (n >= 4) {
      chromosomes.forEach(function (c) { c.isCondensed = false; });
      S.env = { left: 1, right: 1 };
      S.teloStep = 2;
      spawnNucleoli();
      nucleoli.forEach(function (o) {
        var tx = o.targetSide === 'left' ? poleX('left') + px('CLUSTER')
                                         : poleX('right') - px('CLUSTER');
        o.x = tx; o.y = st.cy + st.R * 0.10; o.isPlaced = true;
      });
    }

    S.phaseStartedAt = clock();
    S.phaseMisses = 0;
  }

  function clock() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function startRun(fromStage) {
    var n = Math.max(0, Math.min(4, (fromStage || 1) - 1));

    S = blankState();
    S.startPhase = n;
    S.startedAt = clock();

    Fx.reset();
    buildStage(n);

    mode = 'play';
    paused = false;
    advanceToken++;
    dragged = null;
    isDown = false;
    activeId = null;

    if (typeof UI !== 'undefined' && UI.onStageEnter) { UI.onStageEnter(n); }
  }

  function toAttract() {
    mode = 'attract';
    paused = false;
    advanceToken++;
    dragged = null;
    isDown = false;
    Fx.reset();
    if (!S) { S = blankState(); }
  }

  /* ====================================================================== */
  /*                                 UPDATE                                 */
  /* ====================================================================== */
  function update(dt, t) {
    Backdrop.update(dt, t);
    Fx.update(dt);
    updateVesicles(dt);

    if (mode !== 'play' || paused || !S || S.finished) { return; }

    var p = S.phase;

    /* --- PROPHASE ------------------------------------------------------- */
    if (p === 0) {
      var condensed = countCondensed();
      /* The parent envelope dissolves as the chromatin packs away. */
      var target = 1 - condensed / 4;
      S.parentEnv += (target - S.parentEnv) * Math.min(1, dt * 3);

      if (placedPoles() === 2 && condensed === 4) { markReady(); }
    }

    /* --- METAPHASE ------------------------------------------------------ */
    else if (p === 1) {
      var aligned = 0;
      var tol = px('ALIGN_TOL');
      var jit = px('JITTER');

      for (var i = 0; i < chromosomes.length; i++) {
        var c = chromosomes[i];
        if (c === dragged) {
          /* Leave the held chromosome alone; it snaps on release. */
          if (Math.abs(c.x - st.cx) < tol) { c.isAligned = false; }
          continue;
        }
        if (Math.abs(c.x - st.cx) < tol) {
          if (!c.isAligned) {
            c.isAligned = true;
            Fx.ring(st.cx, c.y, 'rgba(79,240,255,', st.R * 0.05, st.R * 0.20, 3);
            Fx.burst(st.cx, c.y, TINTS[c.tint].glow, 12, 1.1);
            Sound.play('snap');
          }
          c.x = st.cx;
          aligned++;
        } else {
          c.isAligned = false;
          /* Unattached chromosomes wobble, exactly as before. */
          c.x += (Math.random() - 0.5) * 2 * jit;
        }
      }
      if (aligned === 4) { markReady(); }
    }

    /* --- ANAPHASE ------------------------------------------------------- */
    else if (p === 2) {
      var splitCount = 0;
      var arrived = 0;
      var lTarget = poleX('left')  + px('CLUSTER');
      var rTarget = poleX('right') - px('CLUSTER');
      var arriveTol = px('ARRIVE');
      var lerp = Math.min(1, dt * 6);

      for (var j = 0; j < chromosomes.length; j++) {
        var ch = chromosomes[j];
        if (!ch.isSplit) { continue; }
        splitCount++;

        /* Chromatids also draw together vertically as they reach the pole,
           so the cluster fits inside the nuclear envelope that forms around
           it in telophase. */
        var yTarget = clusterY(ch.y);

        ch.lx += (lTarget - ch.lx) * lerp;
        ch.rx += (rTarget - ch.rx) * lerp;
        ch.ly += (yTarget - ch.ly) * lerp;
        ch.ry += (yTarget - ch.ry) * lerp;

        /* Trail sparks while a chromatid is still travelling. */
        if (Math.abs(ch.lx - lTarget) > arriveTol) {
          if (Math.random() < 0.28) { Fx.drift(ch.lx, ch.ly, TINTS[ch.tint].glow, 1); }
          if (Math.random() < 0.28) { Fx.drift(ch.rx, ch.ry, TINTS[ch.tint].glow, 1); }
        } else {
          arrived++;
        }
      }

      /* Original bug: only chromosome 0 was checked, and the 800ms timer
         could be armed more than once. Now every chromatid must arrive and
         the timer is guarded by a generation token. */
      if (splitCount === 4 && arrived === 4 && !S.autoAdv) {
        S.autoAdv = true;
        var token = ++advanceToken;
        window.setTimeout(function () {
          if (token === advanceToken && mode === 'play' && S && S.phase === 2) {
            advance();
          }
        }, 800);
      }
    }

    /* --- TELOPHASE ------------------------------------------------------ */
    else if (p === 3) {
      if (S.teloStep === 0) {
        if (countCondensed() === 0) {
          S.teloStep = 1;
          Sound.play('clear');
          announceTelo();
        }
      } else if (S.teloStep === 1) {
        if (S.env.left >= 1 && S.env.right >= 1) {
          S.teloStep = 2;
          spawnNucleoli();
          Sound.play('clear');
          announceTelo();
        }
      } else if (S.teloStep === 2) {
        if (nucleoli.length && allPlaced(nucleoli)) { markReady(); }
      }
    }

    /* --- CYTOKINESIS ---------------------------------------------------- */
    else if (p === 4) {
      if (S.sub === 'ANIMAL' && S.pinch >= 1) { finishRun(); }
      if (S.sub === 'PLANT'  && S.plate >= 1) { finishRun(); }
    }
  }

  function updateVesicles(dt) {
    var k = Math.min(3, dt * 60);
    for (var i = vesicles.length - 1; i >= 0; i--) {
      var v = vesicles[i];
      v.x += (v.tx - v.x) * 0.09 * k;
      v.y += (v.ty - v.y) * 0.09 * k;
      v.life -= 0.012 * k;
      if (v.life <= 0 || Math.hypot(v.tx - v.x, v.ty - v.y) < 4) {
        Fx.burst(v.x, v.y, 'rgba(143,255,79,', 6, 0.7);
        vesicles.splice(i, 1);
      }
    }
  }

  function countCondensed() {
    var n = 0;
    for (var i = 0; i < chromosomes.length; i++) { if (chromosomes[i].isCondensed) { n++; } }
    return n;
  }
  function placedPoles() {
    var n = 0;
    for (var i = 0; i < centrosomes.length; i++) { if (centrosomes[i].isPlaced) { n++; } }
    return n;
  }
  function allPlaced(list) {
    for (var i = 0; i < list.length; i++) { if (!list[i].isPlaced) { return false; } }
    return true;
  }

  function announceTelo() {
    if (typeof UI !== 'undefined' && UI.refreshHud) { UI.refreshHud(); }
  }

  function markReady() {
    if (S.nextReady) { return; }
    S.nextReady = true;
    Sound.play('clear');
    Fx.ring(st.cx, st.cy, 'rgba(143,255,79,', st.R * 0.4, st.R * 1.15, 5);
    if (typeof UI !== 'undefined' && UI.onStageReady) { UI.onStageReady(); }
  }

  /* ====================================================================== */
  /*                              STAGE FLOW                                */
  /* ====================================================================== */
  function starsFor(phaseIdx, seconds, misses) {
    var par = PHASES[phaseIdx].par;
    if (seconds <= par && misses <= 2) { return 3; }
    if (seconds <= par * 1.9 && misses <= 6) { return 2; }
    return 1;
  }

  function bankStage() {
    var idx = S.phase;
    var secs = (clock() - S.phaseStartedAt) / 1000;
    var stars = starsFor(idx, secs, S.phaseMisses);
    S.stars[idx] = stars;
    Save.recordStars(idx + 1, stars);
    Save.unlockThrough(idx + 2);
    return stars;
  }

  function advance() {
    if (mode !== 'play' || !S || S.finished) { return; }
    if (S.phase >= 4) { return; }
    /* Anaphase advances on its own timer; every other stage must actually
       have met its objective. Guards against a stray call skipping a stage. */
    if (!S.nextReady && S.phase !== 2) { return; }

    var stars = bankStage();
    advanceToken++;

    S.misses += S.phaseMisses;
    S.phase++;
    S.nextReady = false;
    S.autoAdv = false;
    S.phaseStartedAt = clock();
    S.phaseMisses = 0;
    dragged = null;

    /* Stage entry set-up, matching the original transitions. */
    if (S.phase === 1) {
      layoutMetaphaseStart();
      Fx.burst(st.cx, st.cy, 'rgba(79,240,255,', 26, 1.7);
    } else if (S.phase === 2) {
      Fx.burst(st.cx, st.cy, 'rgba(143,255,79,', 26, 1.7);
    } else if (S.phase === 3) {
      S.teloStep = 0;
      Fx.burst(st.cx, st.cy, 'rgba(176,130,255,', 26, 1.7);
    } else if (S.phase === 4) {
      Fx.burst(st.cx, st.cy, 'rgba(255,201,63,', 30, 1.9);
    }

    Sound.play('clear');
    if (typeof UI !== 'undefined' && UI.onStageEnter) { UI.onStageEnter(S.phase, stars); }
  }

  function chooseCellType(kind) {
    if (mode !== 'play' || !S || S.phase !== 4 || S.sub) { return; }
    S.sub = kind;
    Save.setCellType(kind);
    Sound.play('click');
    Fx.ring(st.cx, st.cy, kind === 'PLANT' ? 'rgba(143,255,79,' : 'rgba(255,95,168,',
            st.R * 0.2, st.R * 1.1, 4);
    if (typeof UI !== 'undefined' && UI.onCellTypeChosen) { UI.onCellTypeChosen(kind); }
  }

  function finishRun() {
    if (S.finished) { return; }

    var stars = bankStage();
    S.misses += S.phaseMisses;
    S.finished = true;
    advanceToken++;

    var secs = (clock() - S.startedAt) / 1000;
    /* Only a genuine full run (started at stage 1) counts as a best time. */
    if (S.startPhase === 0) { Save.recordRun(secs); }

    Sound.play('victory');
    Fx.burst(st.cx - st.R * 0.5, st.cy, 'rgba(255,201,63,', 40, 2.4);
    Fx.burst(st.cx + st.R * 0.5, st.cy, 'rgba(255,201,63,', 40, 2.4);
    Fx.ring(st.cx, st.cy, 'rgba(255,255,255,', st.R * 0.3, st.R * 1.6, 6);

    if (typeof UI !== 'undefined' && UI.onRunComplete) {
      UI.onRunComplete({
        seconds: secs,
        stars: S.stars.slice(0),
        totalStars: S.stars.reduce(function (a, b) { return a + b; }, 0),
        misses: S.misses,
        cellType: S.sub,
        fullRun: S.startPhase === 0,
        stagesPlayed: 5 - S.startPhase
      });
    }
  }

  /* ====================================================================== */
  /*                                 INPUT                                  */
  /* ====================================================================== */
  function posFrom(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function near(x, y, ox, oy, radius) {
    var dx = x - ox, dy = y - oy;
    return (dx * dx + dy * dy) <= radius * radius;
  }

  function bindInput() {
    if (window.PointerEvent) {
      canvas.addEventListener('pointerdown', onDown, false);
      canvas.addEventListener('pointermove', onMove, false);
      canvas.addEventListener('pointerup', onUp, false);
      canvas.addEventListener('pointercancel', onUp, false);
      canvas.addEventListener('pointerleave', onUp, false);
    } else {
      /* Fallback for very old WebViews with no Pointer Events. */
      canvas.addEventListener('mousedown', shimMouse(onDown), false);
      canvas.addEventListener('mousemove', shimMouse(onMove), false);
      canvas.addEventListener('mouseup', shimMouse(onUp), false);
      canvas.addEventListener('touchstart', shimTouch(onDown), { passive: false });
      canvas.addEventListener('touchmove', shimTouch(onMove), { passive: false });
      canvas.addEventListener('touchend', shimTouch(onUp), false);
      canvas.addEventListener('touchcancel', shimTouch(onUp), false);
    }
  }

  function shimMouse(fn) {
    return function (e) { e.pointerId = 'mouse'; e.isPrimary = true; fn(e); };
  }
  function shimTouch(fn) {
    return function (e) {
      var t = e.touches[0] || e.changedTouches[0];
      if (!t) { return; }
      fn({
        pointerId: t.identifier, isPrimary: true,
        clientX: t.clientX, clientY: t.clientY,
        preventDefault: function () { e.preventDefault(); }
      });
    };
  }

  function onDown(e) {
    /* Only track one pointer, so a second finger cannot hijack a drag. */
    if (activeId !== null) { return; }
    if (e.isPrimary === false) { return; }

    activeId = e.pointerId;
    isDown = true;
    if (e.preventDefault) { e.preventDefault(); }
    if (canvas.setPointerCapture && typeof e.pointerId === 'number') {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    Sound.unlock();

    var p = posFrom(e);
    lastPos = p;
    Backdrop.pointAt(p.x, p.y);

    if (mode !== 'play' || paused || !S || S.finished) { return; }
    handleStart(p.x, p.y);
  }

  function onMove(e) {
    if (activeId !== null && e.pointerId !== activeId && e.isPrimary === false) { return; }
    var p = posFrom(e);
    Backdrop.pointAt(p.x, p.y);

    if (activeId !== null && e.pointerId !== activeId) { return; }
    lastPos = p;

    if (mode !== 'play' || paused || !S || S.finished) { return; }
    if (isDown && e.preventDefault) { e.preventDefault(); }
    handleMove(p.x, p.y);
  }

  function onUp(e) {
    if (activeId !== null && e.pointerId !== activeId) { return; }
    if (canvas.releasePointerCapture && typeof e.pointerId === 'number') {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    activeId = null;
    isDown = false;
    handleEnd();
  }

  /* ------------------------------------------------------------- press --- */
  function handleStart(x, y) {
    var hit = px('HIT');
    var acted = false;
    var i, c;

    /* --- PROPHASE: tap chromatin, grab centrosomes ---------------------- */
    if (S.phase === 0) {
      for (i = 0; i < chromosomes.length; i++) {
        c = chromosomes[i];
        if (!c.isCondensed && near(x, y, c.x, c.y, hit)) {
          c.isCondensed = true;
          acted = true;
          Fx.burst(c.x, c.y, TINTS[c.tint].glow, 18, 1.3);
          Fx.ring(c.x, c.y, TINTS[c.tint].glow, st.R * 0.03, st.R * 0.16, 3);
          Sound.play('condense');
          break;
        }
      }
      if (!acted) {
        for (i = 0; i < centrosomes.length; i++) {
          c = centrosomes[i];
          if (!c.isPlaced && near(x, y, c.x, c.y, hit)) {
            dragged = c; acted = true;
            Sound.play('grab');
            break;
          }
        }
      }
    }

    /* --- METAPHASE: grab chromosomes ------------------------------------ */
    else if (S.phase === 1) {
      for (i = 0; i < chromosomes.length; i++) {
        c = chromosomes[i];
        if (!c.isAligned && near(x, y, c.x, c.y, hit)) {
          dragged = c; acted = true;
          Sound.play('grab');
          break;
        }
      }
    }

    /* --- ANAPHASE: tap centromeres -------------------------------------- */
    else if (S.phase === 2) {
      for (i = 0; i < chromosomes.length; i++) {
        c = chromosomes[i];
        if (!c.isSplit && near(x, y, c.x, c.y, hit)) {
          c.isSplit = true;
          c.lx = c.x; c.ly = c.y;
          c.rx = c.x; c.ry = c.y;
          acted = true;
          Fx.jet(c.x, c.y, -1, 0, TINTS[c.tint].glow, 12);
          Fx.jet(c.x, c.y,  1, 0, TINTS[c.tint].glow, 12);
          Fx.ring(c.x, c.y, 'rgba(255,255,255,', st.R * 0.02, st.R * 0.18, 3);
          Sound.play('split');
          break;
        }
      }
    }

    /* --- TELOPHASE ------------------------------------------------------ */
    else if (S.phase === 3) {
      if (S.teloStep === 0) {
        for (i = 0; i < chromosomes.length; i++) {
          c = chromosomes[i];
          if (c.isCondensed &&
              (near(x, y, c.lx, c.ly, hit) || near(x, y, c.rx, c.ry, hit))) {
            c.isCondensed = false;
            acted = true;
            Fx.burst(c.lx, c.ly, TINTS[c.tint].glow, 12, 1.0);
            Fx.burst(c.rx, c.ry, TINTS[c.tint].glow, 12, 1.0);
            Sound.play('condense');
            break;
          }
        }
      } else if (S.teloStep === 2) {
        for (i = 0; i < nucleoli.length; i++) {
          var o = nucleoli[i];
          if (!o.isPlaced && near(x, y, o.x, o.y, hit)) {
            dragged = o; acted = true;
            Sound.play('grab');
            break;
          }
        }
      } else {
        /* Step 1 is a trace, so a press anywhere on the ring is legitimate
           and must not be scored as a miss. */
        acted = onEnvelopeRing(x, y);
        traceAt(x, y);
      }
    }

    /* --- CYTOKINESIS ---------------------------------------------------- */
    else if (S.phase === 4) {
      if (S.sub === 'ANIMAL') {
        if (Math.abs(y - st.cy) > px('PINCH_MIN')) {
          S.pinch = Math.min(1, S.pinch + 0.15);
          acted = true;
          var neck = Render.furrowRadius(st.R, Math.PI / 2, S.pinch);
          Fx.burst(st.cx, st.cy - neck, 'rgba(255,95,168,', 10, 1.1);
          Fx.burst(st.cx, st.cy + neck, 'rgba(255,95,168,', 10, 1.1);
          Sound.play('pinch');
        }
      } else if (S.sub === 'PLANT') {
        S.plate = Math.min(1, S.plate + 0.1);
        acted = true;
        /* Vesicles fly in and fuse into the plate. */
        var half = (S.plate * st.R * 1.5) / 2;
        for (var v = 0; v < 3; v++) {
          var side = Math.random() < 0.5 ? -1 : 1;
          vesicles.push({
            x: st.cx + side * st.R * (0.30 + Math.random() * 0.35),
            y: st.cy + (Math.random() - 0.5) * st.R * 0.9,
            tx: st.cx + (Math.random() - 0.5) * st.R * 0.03,
            ty: st.cy + (Math.random() - 0.5) * half * 1.8,
            r: st.R * (0.012 + Math.random() * 0.012),
            life: 1
          });
        }
        Sound.play('plate');
      }
    }

    if (!acted) { registerMiss(); }
  }

  /* A wasted tap costs a little star progress, and says so audibly. */
  function registerMiss() {
    S.phaseMisses++;
    if (S.phaseMisses <= 24) { Sound.play('deny'); }
  }

  /* ------------------------------------------------------------- drag ---- */
  function handleMove(x, y) {
    /* Envelope tracing: original ran on hover, so a desktop mouse could
       trace the ring without ever pressing. Now it needs the button down. */
    if (S.phase === 3 && S.teloStep === 1 && isDown) { traceAt(x, y); }

    if (dragged) {
      dragged.x = x;
      dragged.y = y;
    }
  }

  function envCentre(side) {
    return {
      x: side === 'left' ? poleX('left') + px('CLUSTER')
                         : poleX('right') - px('CLUSTER'),
      y: st.cy
    };
  }

  function onEnvelopeRing(x, y) {
    var r = px('ENV_R');
    var tol = px('ENV_TOL');
    var l = envCentre('left');
    var rr = envCentre('right');
    return (Math.abs(Math.hypot(x - l.x, y - l.y) - r) < tol) ||
           (Math.abs(Math.hypot(x - rr.x, y - rr.y) - r) < tol);
  }

  function traceAt(x, y) {
    var r = px('ENV_R');
    var tol = px('ENV_TOL');

    [['left', S.env], ['right', S.env]].forEach(function (pair, idx) {
      var side = idx === 0 ? 'left' : 'right';
      var ctr = envCentre(side);
      var d = Math.abs(Math.hypot(x - ctr.x, y - ctr.y) - r);

      if (d < tol && S.env[side] < 1) {
        S.env[side] = Math.min(1, S.env[side] + 0.05);

        var a = Math.atan2(y - ctr.y, x - ctr.x);
        Fx.drift(ctr.x + Math.cos(a) * r, ctr.y + Math.sin(a) * r,
                 'rgba(176,130,255,', 2);
        Sound.play('trace');

        if (S.env[side] >= 1) {
          Sound.play('envelope');
          Fx.ring(ctr.x, ctr.y, 'rgba(176,130,255,', r * 0.5, r * 1.8, 4);
          Fx.burst(ctr.x, ctr.y, 'rgba(176,130,255,', 22, 1.5);
        }
      }
    });
  }

  /* ------------------------------------------------------------ release -- */
  function handleEnd() {
    if (!dragged || mode !== 'play' || !S) { dragged = null; return; }

    var snap = px('SNAP');

    /* Centrosome to its pole. */
    if (S.phase === 0 && centrosomes.indexOf(dragged) !== -1) {
      var tx = poleX(dragged.side);
      if (Math.abs(dragged.x - tx) < snap) {
        dragged.x = tx;
        dragged.y = st.cy;
        dragged.isPlaced = true;
        Fx.ring(tx, st.cy, 'rgba(143,255,79,', st.R * 0.05, st.R * 0.30, 4);
        Fx.burst(tx, st.cy, 'rgba(143,255,79,', 20, 1.5);
        Sound.play('snap');
      } else {
        Sound.play('deny');
      }
    }

    /* Metaphase chromosome onto the plate. */
    else if (S.phase === 1 && chromosomes.indexOf(dragged) !== -1) {
      if (Math.abs(dragged.x - st.cx) < snap) {
        dragged.x = st.cx;   /* update() confirms the alignment next frame */
      }
    }

    /* Nucleolus into its nucleus - the original only tested the X axis,
       so a nucleolus dropped far above or below still snapped in. */
    else if (S.phase === 3 && nucleoli.indexOf(dragged) !== -1) {
      var ctr = envCentre(dragged.targetSide);
      if (Math.hypot(dragged.x - ctr.x, dragged.y - ctr.y) < px('ENV_R') + snap * 0.4) {
        var a = Math.random() * 6.2832;
        var rr2 = px('ENV_R') * 0.42 * Math.random();
        dragged.x = ctr.x + Math.cos(a) * rr2;
        dragged.y = ctr.y + Math.sin(a) * rr2;
        dragged.isPlaced = true;
        Fx.burst(dragged.x, dragged.y, 'rgba(255,201,63,', 20, 1.4);
        Fx.ring(dragged.x, dragged.y, 'rgba(255,201,63,', st.R * 0.02, st.R * 0.14, 3);
        Sound.play('snap');
      } else {
        Sound.play('deny');
      }
    }

    dragged = null;
  }

  /* ====================================================================== */
  /*                                  DRAW                                  */
  /* ====================================================================== */
  function draw(t) {
    ctx.clearRect(0, 0, st.w, st.h);

    Backdrop.draw(ctx, t);

    if (mode === 'attract') { drawAttract(t); }
    else { drawPlay(t); }

    Fx.draw(ctx);
  }

  /* Menu / result backdrop: a calm, slowly turning specimen. */
  function drawAttract(t) {
    var cx = st.cx, cy = st.cy, R = st.R * 0.86;

    Render.dish(ctx, cx, cy, R, t);

    var round = function (x) { x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); };
    Render.cellBody(ctx, cx, cy, R, round, t);
    Render.strokeMembrane(ctx, round, R, t);
    Render.membraneStuds(ctx, cx, cy, R, t, 0, false);
    Render.parentEnvelope(ctx, cx, cy, R, 0.55, t);

    /* Four chromosomes drifting on slow, offset orbits. */
    var poles = [
      { x: cx - R * K.POLE, y: cy },
      { x: cx + R * K.POLE, y: cy }
    ];

    var demo = [];
    for (var i = 0; i < 4; i++) {
      var a = t * 0.16 + i * 1.5708;
      var orbit = R * (0.30 + 0.08 * Math.sin(t * 0.4 + i));
      demo.push({
        id: i, tint: i, isSplit: false,
        x: cx + Math.cos(a) * orbit,
        y: cy + Math.sin(a) * orbit * 0.82
      });
    }

    Render.spindle(ctx, demo, poles, R, t);
    for (var k = 0; k < 2; k++) {
      Render.centrosome(ctx, { x: poles[k].x, y: poles[k].y, side: k ? 'right' : 'left' }, R, t, false);
    }
    for (var j = 0; j < demo.length; j++) {
      Render.chromosome(ctx, demo[j], R, t, false);
    }

    if (Math.random() < 0.06) {
      Fx.drift(cx + (Math.random() - 0.5) * R * 1.5,
               cy + (Math.random() - 0.5) * R * 1.5,
               'rgba(255,180,225,', 1);
    }
  }

  function drawPlay(t) {
    var cx = st.cx, cy = st.cy, R = st.R;
    var p = S.phase;
    var plantMode = (p === 4 && S.sub === 'PLANT');
    var animalMode = (p === 4 && S.sub === 'ANIMAL');

    /* ---------------------------------------------------- cell boundary -- */
    if (plantMode) {
      var s = R * 1.5;
      Render.plantWall(ctx, cx, cy, s, t);
      Render.daughterGhost(ctx, cx - s * 0.25, cy, s * 0.22, t);
      Render.daughterGhost(ctx, cx + s * 0.25, cy, s * 0.22, t);
      Render.cellPlate(ctx, cx, cy, s, S.plate, t);
    } else if (animalMode) {
      Render.dish(ctx, cx, cy, R, t);

      var furrow = function (x) { Render.furrowPath(x, cx, cy, R, S.pinch); };
      Render.cellBody(ctx, cx, cy, R, furrow, t);
      Render.strokeMembrane(ctx, furrow, R, t);
      Render.membraneStuds(ctx, cx, cy, R, t, S.pinch, true);
      Render.contractileRing(ctx, cx, cy, R, S.pinch, t);

      var off = R * (0.44 + 0.20 * S.pinch);
      Render.daughterGhost(ctx, cx - off, cy, R * 0.52, t);
      Render.daughterGhost(ctx, cx + off, cy, R * 0.52, t);
    } else {
      Render.dish(ctx, cx, cy, R, t);

      var round = function (x) { x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); };
      Render.cellBody(ctx, cx, cy, R, round, t);
      Render.strokeMembrane(ctx, round, R, t);
      Render.membraneStuds(ctx, cx, cy, R, t, 0, false);
    }

    /* Parent nuclear envelope, only while it still exists. */
    if (p === 0 && S.parentEnv > 0.01) {
      Render.parentEnvelope(ctx, cx, cy, R, S.parentEnv, t);
    }

    /* Metaphase plate guide. */
    if (p === 1) {
      Render.equator(ctx, cx, cy, R, t, 1);
    }

    /* ------------------------------------------------- reformed nuclei --- */
    /* The daughter nuclei persist through cytokinesis, so keep drawing them
       once telophase has sealed them. */
    if ((p === 3 && S.teloStep >= 1) || (p === 4 && S.env.left >= 1)) {
      Render.envelope(ctx, envCentre('left').x,  cy, px('ENV_R'), S.env.left,  t);
      Render.envelope(ctx, envCentre('right').x, cy, px('ENV_R'), S.env.right, t);
    }

    /* --------------------------------------------------------- spindle --- */
    if (p >= 1 && p <= 2) {
      Render.spindle(ctx, chromosomes, centrosomes, R, t);
    }

    /* ----------------------------------------------------- centrosomes --- */
    for (var ci = 0; ci < centrosomes.length; ci++) {
      var cs = centrosomes[ci];
      var csHot = (p === 0 && !cs.isPlaced && cs !== dragged);
      Render.centrosome(ctx, cs, R, t, csHot);

      /* Pole drop zone while prophase is still open. */
      if (p === 0 && !cs.isPlaced) {
        var tx = poleX(cs.side);
        ctx.save();
        ctx.setLineDash([R * 0.035, R * 0.04]);
        ctx.lineDashOffset = -t * 16;
        ctx.strokeStyle = 'rgba(143,255,79,0.42)';
        ctx.lineWidth = Math.max(1.4, R * 0.010);
        ctx.beginPath(); ctx.arc(tx, cy, px('SNAP') * 0.6, 0, 6.2832); ctx.stroke();
        ctx.restore();
      }
    }

    /* ----------------------------------------------------- chromosomes --- */
    for (var i = 0; i < chromosomes.length; i++) {
      var c = chromosomes[i];
      var tint = TINTS[c.tint];

      if (!c.isSplit) {
        if (!c.isCondensed) {
          Render.chromatin(ctx, c, R, t, p === 0 && c !== dragged);
        } else {
          Render.chromosome(ctx, c, R, t,
            (p === 1 && !c.isAligned && c !== dragged) || (p === 2 && !c.isSplit));
        }
      } else if (!c.isCondensed) {
        /* Original bug: decondensing in telophase changed nothing on screen
           because the split branch was checked first. Separated chromatids
           now visibly relax back into chromatin threads. */
        Render.chromatin(ctx, { id: c.id, tint: c.tint, x: c.lx, y: c.ly }, R, t, false);
        Render.chromatin(ctx, { id: c.id + 4, tint: c.tint, x: c.rx, y: c.ry }, R, t, false);
      } else {
        var hot = (p === 3 && S.teloStep === 0);
        Render.chromatid(ctx, c.lx, c.ly, tint, 'left',  R, t, hot);
        Render.chromatid(ctx, c.rx, c.ry, tint, 'right', R, t, hot);
      }
    }

    /* ------------------------------------------------------- nucleoli ---- */
    for (var ni = 0; ni < nucleoli.length; ni++) {
      Render.nucleolus(ctx, nucleoli[ni], R, t,
                       !nucleoli[ni].isPlaced && nucleoli[ni] !== dragged);
    }

    /* -------------------------------------------------- plant vesicles --- */
    if (vesicles.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var vi = 0; vi < vesicles.length; vi++) {
        var v = vesicles[vi];
        var g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r * 3);
        g.addColorStop(0.00, 'rgba(255,255,255,' + (0.85 * v.life) + ')');
        g.addColorStop(0.34, 'rgba(143,255,79,' + (0.70 * v.life) + ')');
        g.addColorStop(1.00, 'rgba(143,255,79,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(v.x, v.y, v.r * 3, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ====================================================================== */
  /*                                  LOOP                                  */
  /* ====================================================================== */
  function loop(now) {
    if (!running) { return; }

    var t = now / 1000;
    var dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
    lastT = t;

    try {
      update(dt, t);
      draw(t);
      if (typeof UI !== 'undefined' && UI.tick) { UI.tick(); }
    } catch (err) {
      /* One bad frame must never end the session. */
      if (window.console && console.error) { console.error(err); }
    }

    window.requestAnimationFrame(loop);
  }

  function start() {
    if (running) { return; }
    running = true;
    lastT = 0;
    window.requestAnimationFrame(loop);
  }

  /* ====================================================================== */
  /*                              UI QUERIES                                */
  /* ====================================================================== */

  /* 0..1 completion of the current stage objective. */
  function progress() {
    if (!S || mode !== 'play') { return 0; }
    var p = S.phase;

    if (p === 0) { return (placedPoles() + countCondensed()) / 6; }
    if (p === 1) {
      var a = 0;
      chromosomes.forEach(function (c) { if (c.isAligned) { a++; } });
      return a / 4;
    }
    if (p === 2) {
      var done = 0;
      var lT = poleX('left') + px('CLUSTER');
      chromosomes.forEach(function (c) {
        if (c.isSplit) { done += Math.abs(c.lx - lT) < px('ARRIVE') ? 1 : 0.5; }
      });
      return done / 4;
    }
    if (p === 3) {
      if (S.teloStep === 0) { return ((4 - countCondensed()) / 4) / 3; }
      if (S.teloStep === 1) { return (1 + (S.env.left + S.env.right) / 2) / 3; }
      var placed = 0;
      nucleoli.forEach(function (o) { if (o.isPlaced) { placed++; } });
      return (2 + (nucleoli.length ? placed / nucleoli.length : 0)) / 3;
    }
    if (p === 4) {
      if (!S.sub) { return 0; }
      return S.sub === 'ANIMAL' ? S.pinch : S.plate;
    }
    return 0;
  }

  /* Small lit readouts for the bottom bar. */
  function counters() {
    if (!S || mode !== 'play') { return []; }
    var p = S.phase;

    if (p === 0) {
      return [
        { icon: 'chromosome', tone: 'rose', label: 'CONDENSED', value: countCondensed() + '/4' },
        { icon: 'centrosome', tone: 'lime', label: 'POLES',     value: placedPoles() + '/2' }
      ];
    }
    if (p === 1) {
      var a = 0;
      chromosomes.forEach(function (c) { if (c.isAligned) { a++; } });
      return [{ icon: 'chromosome', tone: 'cyan', label: 'ON PLATE', value: a + '/4' }];
    }
    if (p === 2) {
      var s = 0;
      chromosomes.forEach(function (c) { if (c.isSplit) { s++; } });
      return [{ icon: 'chromosome', tone: 'lime', label: 'SEPARATED', value: s + '/4' }];
    }
    if (p === 3) {
      if (S.teloStep === 0) {
        return [{ icon: 'chromosome', tone: 'rose', label: 'UNWOUND', value: (4 - countCondensed()) + '/4' }];
      }
      if (S.teloStep === 1) {
        var pct = Math.round(((S.env.left + S.env.right) / 2) * 100);
        return [{ icon: 'dna', tone: 'cyan', label: 'ENVELOPE', value: pct + '%' }];
      }
      var placed = 0;
      nucleoli.forEach(function (o) { if (o.isPlaced) { placed++; } });
      return [{ icon: 'nucleolus', tone: 'amber', label: 'NUCLEOLI', value: placed + '/' + nucleoli.length }];
    }
    if (p === 4 && S.sub) {
      var v = Math.round((S.sub === 'ANIMAL' ? S.pinch : S.plate) * 100);
      return [{
        icon: S.sub === 'ANIMAL' ? 'animal_cell' : 'plant_cell',
        tone: S.sub === 'ANIMAL' ? 'rose' : 'lime',
        label: S.sub === 'ANIMAL' ? 'FURROW' : 'CELL PLATE',
        value: v + '%'
      }];
    }
    return [];
  }

  function objectiveText() {
    if (!S || mode !== 'play') { return ''; }
    if (S.phase === 3) { return TELO_OBJ[S.teloStep] || TELO_OBJ[0]; }
    if (S.phase === 4 && S.sub) {
      return S.sub === 'ANIMAL'
        ? 'Tap away from the equator to tighten the cleavage furrow.'
        : 'Tap the centre repeatedly to build the cell plate outward.';
    }
    return PHASES[S.phase].obj;
  }

  function setPaused(v) { paused = !!v; }
  function isPaused() { return paused; }
  function getMode() { return mode; }
  function getPhase() { return S ? S.phase : 0; }
  function isReady() { return !!(S && S.nextReady); }
  function needsCellType() { return !!(S && S.phase === 4 && !S.sub && mode === 'play'); }
  function state() { return S; }

  return {
    init: init, start: start,
    startRun: startRun, toAttract: toAttract,
    advance: advance, chooseCellType: chooseCellType,
    progress: progress, counters: counters, objectiveText: objectiveText,
    setPaused: setPaused, isPaused: isPaused,
    getMode: getMode, getPhase: getPhase, isReady: isReady,
    needsCellType: needsCellType, state: state,
    resize: onResize
  };
}());
