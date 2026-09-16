/* Game core: input, fixed-step physics, rendering, zone flow.

   The platforming numbers below are the original ones (gravity 0.6, friction
   0.85, jump -14, speed 6.5, 40x40 hitbox) and physics runs on a fixed 60 Hz
   step, so behaviour is identical on any refresh rate.                        */
(function (global) {
  'use strict';

  var D = global.document;

  /* --------------------------------------------------------------- config */

  var WORLD_W = 900;
  var WORLD_H = 600;

  var GRAVITY = 0.6;
  var FRICTION = 0.85;
  var JUMP_FORCE = -14;
  var SPEED = 6.5;
  var STEP_MS = 1000 / 60;
  var COYOTE_STEPS = 6;      /* brief grace after leaving a ledge */

  var STATE = { BOOT: 'BOOT', MENU: 'MENU', PLAY: 'PLAY', QUIZ: 'QUIZ',
                PAUSED: 'PAUSED', RESULT: 'RESULT' };

  /* Per-zone platform and foliage colours. */
  var ZONE_SKIN = [
    { bark: '#4a2f1d', barkLit: '#7b5232', barkDark: '#2a180d',
      moss: '#5cb63a', mossLit: '#b9f062', mossDark: '#2c6b2a', vine: '#3f8a2c' },
    { bark: '#2f3f4a', barkLit: '#556f7d', barkDark: '#17222a',
      moss: '#2fa89a', mossLit: '#7ff0dd', mossDark: '#12615a', vine: '#1d7a70' },
    { bark: '#432a4a', barkLit: '#6d4a78', barkDark: '#241328',
      moss: '#9a6ad0', mossLit: '#d9bcff', mossDark: '#4e2f74', vine: '#7a4fae' }
  ];

  /* ---------------------------------------------------------------- state */

  var canvas, ctx;
  var dpr = 1;
  var vw = 0, vh = 0;

  /* The world is scaled to fit the screen, then allowed to grow up to
     OVERSCALE beyond that so the play area really fills the display. When the
     scaled world is larger than the available box on an axis, the camera
     follows the player on that axis, clamped to the world edges. */
  var OVERSCALE = 1.15;
  var view = {
    scale: 1, ox: 0, oy: 0, w: WORLD_W, h: WORLD_H,
    ax: 0, ay: 0, aw: WORLD_W, ah: WORLD_H,
    camX: false, camY: false
  };

  var state = STATE.BOOT;
  var zoneIndex = 0;
  var zone = null;
  var skin = ZONE_SKIN[0];
  var orbs = [];
  var platforms = [];

  var collected = 0;
  var runStartedAt = 0;
  var runElapsed = 0;
  var lastFrame = 0;
  var accumulator = 0;
  var animId = 0;
  var frameClock = 0;

  var player = {
    x: 140, y: 500, width: 40, height: 40,
    velX: 0, velY: 0,
    jumping: false, grounded: false, coyote: 0,
    facingRight: true, squash: 0, wasVelY: 0
  };

  var keys = { left: false, right: false, up: false };
  var audioUnlocked = false;

  /* ------------------------------------------------------------- sizing */

  function resize() {
    vw = global.innerWidth;
    vh = global.innerHeight;
    dpr = Math.min(global.devicePixelRatio || 1, 2.5);

    canvas.width = Math.max(1, Math.round(vw * dpr));
    canvas.height = Math.max(1, Math.round(vh * dpr));
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';

    /* Reserve room for the HUD strip, then fill what is left with the world.
       The scenery bleeds across the whole screen behind it. */
    var padTop = vw < 620 ? 52 : 62;
    var padBottom = 10;
    var padSide = 10;

    view.ax = padSide;
    view.ay = padTop;
    view.aw = Math.max(80, vw - padSide * 2);
    view.ah = Math.max(80, vh - padTop - padBottom);

    var sx = view.aw / WORLD_W;
    var sy = view.ah / WORLD_H;
    var fit = Math.min(sx, sy);
    view.scale = Math.min(Math.max(sx, sy), fit * OVERSCALE);
    view.w = WORLD_W * view.scale;
    view.h = WORLD_H * view.scale;

    view.camX = view.w > view.aw + 0.5;
    view.camY = view.h > view.ah + 0.5;

    if (!view.camX) view.ox = view.ax + (view.aw - view.w) / 2;
    if (!view.camY) view.oy = view.ay + (view.ah - view.h) / 2;
    centreCamera(true);

    global.Ambient.resize(vw, vh);
  }

  /* Keeps the player roughly centred on any axis the world overflows. */
  function centreCamera(snap) {
    var cx = player.x + player.width / 2;
    var cy = player.y + player.height / 2;

    if (view.camX) {
      var tx = view.ax + view.aw / 2 - cx * view.scale;
      tx = Math.min(view.ax, Math.max(view.ax + view.aw - view.w, tx));
      view.ox = snap ? tx : view.ox + (tx - view.ox) * 0.12;
    }
    if (view.camY) {
      var ty = view.ay + view.ah / 2 - cy * view.scale;
      ty = Math.min(view.ay, Math.max(view.ay + view.ah - view.h, ty));
      view.oy = snap ? ty : view.oy + (ty - view.oy) * 0.12;
    }
  }

  /* -------------------------------------------------------------- input */

  function setKey(name, down) {
    if (!(name in keys)) return;
    if (down && name === 'up' && state === STATE.PLAY) tryJump();
    keys[name] = !!down;
  }

  function clearKeys() { keys.left = keys.right = keys.up = false; }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    global.Sound.start();
    global.UI.syncSettings();
  }

  function onKeyDown(e) {
    unlockAudio();

    var code = e.code || '';
    if (code === 'ArrowLeft' || code === 'KeyA') { keys.left = true; e.preventDefault(); }
    else if (code === 'ArrowRight' || code === 'KeyD') { keys.right = true; e.preventDefault(); }
    else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
      if (state === STATE.PLAY) tryJump();
      keys.up = true;
      e.preventDefault();
    } else if (code === 'Escape') {
      if (state === STATE.PLAY) pause();
      else if (state === STATE.PAUSED && global.UI.topModal() === 'modalPause') resume();
      else {
        var top = global.UI.topModal();
        if (top && top !== 'modalQuiz') global.UI.closeModal(top);
      }
      e.preventDefault();
    } else if (code === 'KeyP') {
      if (state === STATE.PLAY) pause();
      else if (state === STATE.PAUSED) resume();
    }
  }

  function onKeyUp(e) {
    var code = e.code || '';
    if (code === 'ArrowLeft' || code === 'KeyA') keys.left = false;
    else if (code === 'ArrowRight' || code === 'KeyD') keys.right = false;
    else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') keys.up = false;
  }

  function tryJump() {
    if (player.grounded || player.coyote > 0) {
      player.velY = JUMP_FORCE;
      player.jumping = true;
      player.grounded = false;
      player.coyote = 0;
      player.squash = -0.32;
      global.Sound.play('hop');
      global.FX.dust(player.x + player.width / 2, player.y + player.height, 0);
    }
  }

  /* -------------------------------------------------------------- physics */

  function step() {
    /* Horizontal movement — unchanged from the original. */
    if (keys.right) {
      player.velX = SPEED;
      player.facingRight = true;
    } else if (keys.left) {
      player.velX = -SPEED;
      player.facingRight = false;
    } else {
      player.velX *= FRICTION;
    }

    player.x += player.velX;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > WORLD_W) player.x = WORLD_W - player.width;

    /* Gravity. */
    var prevBottom = player.y + player.height;
    player.wasVelY = player.velY;
    player.velY += GRAVITY;
    player.y += player.velY;

    var landed = false;
    var bottom = player.y + player.height;

    for (var i = 0; i < platforms.length; i++) {
      var plat = platforms[i];
      var overlapX = player.x + player.width > plat.x + 5 &&
                     player.x < plat.x + plat.w - 5;
      if (!overlapX || player.velY < 0) continue;

      /* The original forgiving window, plus a swept test so a fast fall can
         never pass straight through a thin platform. */
      var inWindow = bottom > plat.y && bottom < plat.y + plat.h + 20;
      var swept = prevBottom <= plat.y && bottom >= plat.y;

      if (inWindow || swept) {
        player.y = plat.y - player.height;
        player.velY = 0;
        player.jumping = false;
        landed = true;
      }
    }

    if (landed) {
      if (!player.grounded) {
        if (player.wasVelY > 6) {
          global.Sound.play('land');
          global.FX.dust(player.x + player.width / 2, player.y + player.height,
                         player.velX * 0.2);
          player.squash = Math.min(0.42, player.wasVelY * 0.02);
        }
      }
      player.grounded = true;
      player.coyote = COYOTE_STEPS;
    } else {
      if (player.grounded) player.coyote = COYOTE_STEPS;
      player.grounded = false;
      if (player.coyote > 0) player.coyote--;
    }

    /* Trail motes while hopping about. */
    if (Math.abs(player.velX) > 2 && frameClock % 4 === 0) {
      global.FX.trail(player.x + player.width / 2, player.y + player.height - 6);
    }

    /* Fell into the water. */
    if (player.y > WORLD_H) respawn();

    /* Orb pickups — stop at the first one so only one quiz opens per step. */
    for (i = 0; i < orbs.length; i++) {
      var orb = orbs[i];
      if (!orb.active) continue;
      if (player.x < orb.x + orb.w &&
          player.x + player.width > orb.x &&
          player.y < orb.y + orb.h &&
          player.y + player.height > orb.y) {
        openQuiz(orb);
        break;
      }
    }

    if (player.squash !== 0) player.squash *= 0.86;
    if (Math.abs(player.squash) < 0.004) player.squash = 0;
    frameClock++;
  }

  function respawn() {
    global.FX.splash(player.x + player.width / 2, WORLD_H - 26);
    global.FX.kick(7);
    global.Sound.play('splash');
    player.x = zone.spawn.x;
    player.y = zone.spawn.y;
    player.velX = 0;
    player.velY = 0;
    player.grounded = false;
    player.coyote = 0;
    centreCamera(true);
    global.FX.dust(player.x + player.width / 2, player.y + player.height, 0);
  }

  /* ----------------------------------------------------------------- quiz */

  function openQuiz(orb) {
    state = STATE.QUIZ;
    clearKeys();
    global.UI.showPads(false);

    global.UI.showQuiz(orb, !!orb.hots,
      function onCorrect() {
        orb.active = false;
        collected++;
        var cx = orb.x + orb.w / 2;
        var cy = orb.y + orb.h / 2;
        global.FX.burst(cx, cy, { count: 30, color: '#46e6c8', power: 1.15 });
        global.FX.ring(cx, cy, '#c4fff4', 120);
        global.FX.pop(cx, cy - 18, '+1 ORB', '#ffd766');
        global.FX.kick(4);
        global.Sound.play('collect');
        global.Sound.duck(false);
        global.UI.setHudOrbs(collected, global.GameData.ORBS_PER_ZONE);

        if (collected >= global.GameData.ORBS_PER_ZONE) winZone();
        else resumePlay();
      },
      function onWrong() {
        orb.missed = true;
        global.FX.kick(3);
      });
  }

  function resumePlay() {
    state = STATE.PLAY;
    lastFrame = global.performance.now();
    accumulator = 0;
    runStartedAt = global.performance.now() - runElapsed;
    global.Sound.duck(false);
    updatePadVisibility();
  }

  function winZone() {
    state = STATE.RESULT;
    clearKeys();
    global.UI.showPads(false);
    global.UI.showHud(false);
    global.Sound.duck(false);
    global.Sound.play('win');

    var misses = orbs.filter(function (o) { return o.missed; }).length;
    var seals = global.Save.sealsFor(misses);
    var improved = global.Save.recordClear(zone.id, Math.round(runElapsed), misses);

    /* Celebration burst across the play area. */
    for (var i = 0; i < 8; i++) {
      global.FX.burst(120 + Math.random() * 660, 120 + Math.random() * 380,
                      { count: 18, color: i % 2 ? '#ffd766' : '#46e6c8', power: 1.3 });
    }
    global.FX.kick(9);

    global.UI.refreshMenu();
    global.UI.showResult({
      zone: zone,
      zoneIndex: zoneIndex,
      timeMs: Math.round(runElapsed),
      orbs: collected,
      misses: misses,
      seals: seals,
      improved: improved
    });
  }

  /* ---------------------------------------------------------- zone flow */

  function startZone(index) {
    var zones = global.GameData.ZONES;
    zoneIndex = Math.max(0, Math.min(zones.length - 1, index));
    zone = zones[zoneIndex];
    skin = ZONE_SKIN[zoneIndex % ZONE_SKIN.length];

    platforms = zone.platforms.map(function (p) {
      return { x: p.x, y: p.y, w: p.w, h: p.h };
    });
    orbs = zone.orbs.map(function (o) {
      return {
        id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, art: o.art, hots: !!o.hots,
        q: o.q, opts: o.opts.slice(), ans: o.ans,
        active: true, missed: false, phase: Math.random() * 6.28
      };
    });

    collected = 0;
    runElapsed = 0;
    runStartedAt = global.performance.now();
    player.x = zone.spawn.x;
    player.y = zone.spawn.y;
    player.velX = 0;
    player.velY = 0;
    player.grounded = false;
    player.coyote = 0;
    player.facingRight = true;
    player.squash = 0;
    clearKeys();
    centreCamera(true);

    global.FX.clear();
    global.Ambient.setZone(zoneIndex);
    global.UI.hideScreens();
    global.UI.closeModal('modalPause');
    global.UI.closeModal('modalLearn');
    global.UI.closeModal('modalSettings');
    global.UI.closeModal('modalHow');
    global.UI.setHudZone(zone, zoneIndex);
    global.UI.setHudOrbs(0, global.GameData.ORBS_PER_ZONE);
    global.UI.setHudTime(0);
    global.UI.showHud(true);
    global.UI.flashZone(zone, zoneIndex);

    state = STATE.PLAY;
    updatePadVisibility();
    lastFrame = global.performance.now();
    accumulator = 0;
    unlockAudio();
  }

  function restartZone() { startZone(zoneIndex); }

  function pause() {
    if (state !== STATE.PLAY) return;
    state = STATE.PAUSED;
    clearKeys();
    global.UI.showPads(false);
    global.UI.openModal('modalPause');
    global.Sound.duck(true);
  }

  function resume() {
    if (state !== STATE.PAUSED) return;
    global.UI.closeModal('modalPause');
    global.UI.closeModal('modalSettings');
    global.UI.closeModal('modalHow');
    resumePlay();
  }

  function toMenu() {
    state = STATE.MENU;
    clearKeys();
    global.UI.showPads(false);
    global.UI.showHud(false);
    global.UI.closeModal('modalPause');
    global.UI.closeModal('modalLearn');
    global.UI.closeModal('modalSettings');
    global.UI.closeModal('modalHow');
    global.UI.refreshMenu();
    global.UI.showScreen('screenMenu');
    global.Sound.duck(false);
  }

  function updatePadVisibility() {
    var touchy = (global.navigator.maxTouchPoints || 0) > 0 ||
                 ('ontouchstart' in global) ||
                 (global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    global.UI.showPads(state === STATE.PLAY && touchy);
  }

  /* -------------------------------------------------------------- drawing */

  function drawPlatform(plat) {
    var x = plat.x, y = plat.y, w = plat.w, h = plat.h;
    var img = global.Assets.get('bg:platform');

    if (img) {
      ctx.drawImage(img, x, y, w, h);
      return;
    }

    /* Earth body with a lit top edge. */
    var body = ctx.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, skin.barkLit);
    body.addColorStop(0.32, skin.bark);
    body.addColorStop(1, skin.barkDark);
    ctx.fillStyle = body;
    roundRect(x, y, w, h, Math.min(9, h / 2));
    ctx.fill();

    /* Moss cap, lit from above. */
    var moss = ctx.createLinearGradient(0, y - 3, 0, y + 13);
    moss.addColorStop(0, skin.mossLit);
    moss.addColorStop(0.45, skin.moss);
    moss.addColorStop(1, skin.mossDark);
    ctx.fillStyle = moss;
    roundRect(x, y - 3, w, 14, 7);
    ctx.fill();

    /* Scalloped moss fringe hanging over the edge. */
    ctx.fillStyle = skin.mossDark;
    var lobes = Math.max(3, Math.round(w / 22));
    for (var i = 0; i < lobes; i++) {
      var lx = x + (i + 0.5) * (w / lobes);
      var ly = y + 10;
      var lr = w / lobes * 0.42;
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, 5.5, 0, 0, Math.PI);
      ctx.fill();
    }

    /* Highlight and shadow lines for the embossed read. */
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 1.5);
    ctx.lineTo(x + w - 6, y - 1.5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h - 1);
    ctx.lineTo(x + w - 4, y + h - 1);
    ctx.stroke();

    /* Hanging vines on the wider ledges. */
    if (w >= 100) {
      ctx.strokeStyle = skin.vine;
      ctx.lineWidth = 2.2;
      for (i = 0; i < 2; i++) {
        var vx = x + (i === 0 ? 16 : w - 18);
        var len = 16 + ((plat.x + i * 37) % 17);
        var sway = Math.sin(frameClock * 0.03 + i + plat.x) * 3;
        ctx.beginPath();
        ctx.moveTo(vx, y + h - 2);
        ctx.quadraticCurveTo(vx + sway, y + h + len * 0.6, vx + sway * 1.4, y + h + len);
        ctx.stroke();
        ctx.fillStyle = skin.mossLit;
        ctx.beginPath();
        ctx.arc(vx + sway * 1.4, y + h + len, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawOrb(orb, time) {
    var bob = Math.sin(time / 250 + orb.phase) * 6;
    var cx = orb.x + orb.w / 2;
    var cy = orb.y + orb.h / 2 + bob;
    var r = 21;

    ctx.save();

    /* Outer bloom — the orb is lit from within. */
    var glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 2.5);
    var tint = orb.hots ? 'rgba(255,140,170,' : 'rgba(70,230,200,';
    glow.addColorStop(0, tint + '0.55)');
    glow.addColorStop(0.4, tint + '0.18)');
    glow.addColorStop(1, tint + '0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    /* Rotating halo. */
    var spin = time / 900 + orb.phase;
    ctx.strokeStyle = orb.hots ? 'rgba(255,180,200,0.55)' : 'rgba(196,255,244,0.55)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r + 6, (r + 6) * 0.42, spin, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Glass shell. */
    var shell = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.15, cx, cy, r);
    shell.addColorStop(0, 'rgba(255,255,255,0.85)');
    shell.addColorStop(0.45, orb.hots ? 'rgba(255,138,151,0.4)' : 'rgba(70,230,200,0.38)');
    shell.addColorStop(1, orb.hots ? 'rgba(110,20,45,0.55)' : 'rgba(6,50,44,0.6)');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    /* The specimen inside. */
    var img = global.Assets.get('orb:' + orb.art);
    if (img) {
      var s = r * 1.5;
      ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
    } else {
      ctx.fillStyle = '#04231f';
      ctx.font = '700 18px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(orb.id), cx, cy + 1);
    }

    /* Rim and sheen. */
    ctx.strokeStyle = orb.hots ? 'rgba(255,200,210,0.75)' : 'rgba(196,255,244,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.34, cy - r * 0.45, r * 0.3, r * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayerVector(w, h) {
    /* Fallback frog, drawn around the origin at the hitbox centre. */
    var g = ctx.createRadialGradient(-w * 0.1, -h * 0.2, w * 0.1, 0, 0, w * 0.75);
    g.addColorStop(0, '#a8e05a');
    g.addColorStop(0.55, '#5cb63a');
    g.addColorStop(1, '#2c6b2a');

    ctx.fillStyle = '#2c6b2a';
    ctx.beginPath();
    ctx.ellipse(-w * 0.42, h * 0.34, w * 0.22, h * 0.13, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.42, h * 0.34, w * 0.22, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.1, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(232,255,196,0.75)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.24, w * 0.3, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(-w * 0.26, -h * 0.3, w * 0.17, 0, Math.PI * 2);
    ctx.arc(w * 0.26, -h * 0.3, w * 0.17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd766';
    ctx.beginPath();
    ctx.arc(-w * 0.26, -h * 0.3, w * 0.1, 0, Math.PI * 2);
    ctx.arc(w * 0.26, -h * 0.3, w * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d2410';
    ctx.beginPath();
    ctx.arc(-w * 0.26, -h * 0.28, w * 0.045, 0, Math.PI * 2);
    ctx.arc(w * 0.26, -h * 0.28, w * 0.045, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2c6b2a';
    ctx.lineWidth = w * 0.06;
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, h * 0.02);
    ctx.quadraticCurveTo(0, h * 0.16, w * 0.2, h * 0.02);
    ctx.stroke();
  }

  function drawPlayer() {
    var cx = player.x + player.width / 2;
    var baseY = player.y + player.height;

    /* Contact shadow. */
    ctx.save();
    ctx.globalAlpha = player.grounded ? 0.32 : 0.16;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 2, player.width * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var sq = player.squash;
    var sx = 1 - sq * 0.6;
    var sy = 1 + sq * 0.6;

    var sprite = null;
    if (player.grounded) sprite = global.Assets.get('char:idle');
    else if (player.velY < 0) sprite = global.Assets.get('char:jump');
    else sprite = global.Assets.get('char:fall');
    if (!sprite) sprite = global.Assets.get('char:idle');

    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(player.facingRight ? sx : -sx, sy);

    if (sprite) {
      /* Sprite is drawn larger than the hitbox for a fuller silhouette. */
      var dw = player.width * 1.65;
      var dh = dw * (sprite.naturalHeight / sprite.naturalWidth || 1);
      ctx.drawImage(sprite, -dw / 2, -dh + player.height * 0.16, dw, dh);
    } else {
      ctx.translate(0, -player.height / 2);
      drawPlayerVector(player.width * 1.25, player.height * 1.2);
    }
    ctx.restore();
  }

  /* Water surface across the bottom of the play area. */
  function drawStageWater(time) {
    var top = WORLD_H - 34;
    var g = ctx.createLinearGradient(0, top, 0, WORLD_H);
    g.addColorStop(0, 'rgba(70,230,200,0.16)');
    g.addColorStop(1, 'rgba(4,32,29,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, WORLD_W, 34);

    ctx.strokeStyle = 'rgba(196,255,244,0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (var x = 0; x <= WORLD_W; x += 12) {
      var y = top + Math.sin(x * 0.03 + time * 0.002) * 2.2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    var parallax = ((player.x + player.width / 2) / WORLD_W - 0.5) * 2;
    global.Ambient.draw(ctx, parallax,
      { x: view.ox, y: view.oy, w: view.w, h: view.h });

    if (state === STATE.BOOT || state === STATE.MENU) return;

    var shake = global.FX.shakeOffset();
    ctx.save();
    ctx.translate(view.ox + shake.x, view.oy + shake.y);
    ctx.scale(view.scale, view.scale);

    /* Soft frame so the stage edge reads without a hard box. */
    ctx.save();
    var edge = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    edge.addColorStop(0, 'rgba(4,32,29,0.35)');
    edge.addColorStop(0.35, 'rgba(4,32,29,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.restore();

    for (var i = 0; i < platforms.length; i++) drawPlatform(platforms[i]);

    drawStageWater(time);

    for (i = 0; i < orbs.length; i++) {
      if (orbs[i].active) drawOrb(orbs[i], time);
    }

    drawPlayer();
    global.FX.draw(ctx);

    ctx.restore();
  }

  /* ------------------------------------------------------------------ loop */

  function frame(now) {
    animId = global.requestAnimationFrame(frame);

    var delta = now - lastFrame;
    if (!(delta >= 0) || delta > 400) delta = 16.7;
    lastFrame = now;

    global.Ambient.update(delta);
    if (state === STATE.PLAY) centreCamera(false);

    if (state === STATE.PLAY) {
      accumulator += delta;
      var steps = 0;
      while (accumulator >= STEP_MS && steps < 5) {
        step();
        accumulator -= STEP_MS;
        steps++;
        if (state !== STATE.PLAY) { accumulator = 0; break; }
      }
      runElapsed = now - runStartedAt;
      global.UI.setHudTime(runElapsed);
    }

    if (state === STATE.PLAY || state === STATE.QUIZ || state === STATE.PAUSED ||
        state === STATE.RESULT) {
      global.FX.update(Math.min(2.5, delta / STEP_MS));
    }

    draw(now);
  }

  /* ------------------------------------------------------------------ boot */

  function bindGlobalEvents() {
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', function () {
      global.setTimeout(resize, 220);
    });
    global.addEventListener('keydown', onKeyDown, { passive: false });
    global.addEventListener('keyup', onKeyUp);

    /* First gesture unlocks audio in every browser policy. */
    D.addEventListener('pointerdown', unlockAudio, { once: false });

    /* Kill browser gestures that would fight the game in a WebView. */
    D.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    D.addEventListener('dblclick', function (e) { e.preventDefault(); });
    D.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    D.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    D.addEventListener('visibilitychange', function () {
      if (D.hidden) {
        if (state === STATE.PLAY) pause();
        global.Sound.suspend();
      } else if (audioUnlocked) {
        global.Sound.resume();
      }
    });

    global.addEventListener('blur', function () {
      clearKeys();
      if (state === STATE.PLAY) pause();
    });

    /* Reveal the touch pads the moment a real touch happens. */
    global.addEventListener('touchstart', function () {
      if (state === STATE.PLAY) global.UI.showPads(true);
    }, { passive: true });
  }

  function init() {
    canvas = D.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    global.Save.load();
    global.UI.init();
    resize();
    bindGlobalEvents();

    lastFrame = global.performance.now();
    animId = global.requestAnimationFrame(frame);

    global.Assets.preload(function (f) {
      global.UI.setBootProgress(f);
    }).then(function () {
      global.UI.setBootProgress(1);
      global.setTimeout(function () {
        state = STATE.MENU;
        global.UI.refreshMenu();
        global.UI.showScreen('screenMenu');
      }, 280);
    });
  }

  global.Game = {
    startZone: startZone,
    restartZone: restartZone,
    pause: pause,
    resume: resume,
    toMenu: toMenu,
    setKey: setKey,
    state: function () { return state; }
  };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
