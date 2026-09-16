/* ==========================================================================
   Hybrid Shooter — Core Game
   Vanilla JS + Canvas. No build step, no external dependencies.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* DOM references                                                       */
  /* ------------------------------------------------------------------ */
  const root = document.getElementById('game-root');
  const bgCanvas = document.getElementById('bg-canvas');
  const gameCanvas = document.getElementById('game-canvas');
  const fxCanvas = document.getElementById('fx-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const gameCtx = gameCanvas.getContext('2d');
  const fxCtx = fxCanvas.getContext('2d');

  const screens = {
    boot: document.getElementById('screen-boot'),
    title: document.getElementById('screen-title'),
    gameplay: document.getElementById('screen-gameplay'),
    pause: document.getElementById('screen-pause'),
    result: document.getElementById('screen-result')
  };

  const el = (id) => document.getElementById(id);

  const loadingBarFill = el('loading-bar-fill');
  const bootFactText = el('boot-fact-text');
  const bestScoreValue = el('best-score-value');
  const livesRow = el('lives-row');
  const scoreValue = el('score-value');
  const timerPod = el('timer-pod');
  const timerValue = el('timer-value');
  const qtValue = el('qt-value');
  const qtDot = el('qt-dot');
  const questionTab = el('question-tab');
  const streakPod = el('streak-pod');
  const streakValue = el('streak-value');
  const toastEl = el('toast');

  const modalSettings = el('modal-settings');
  const modalInstructions = el('modal-instructions');

  const ftueDim = el('ftue-dim');
  const ftueHole = el('ftue-hole');
  const ftueCallout = el('ftue-callout');
  const ftueText = el('ftue-text');
  const ftueNext = el('ftue-next');

  const resultBadge = el('result-badge');
  const resultTitle = el('result-title');
  const resultScore = el('result-score');
  const resultCorrect = el('result-correct');
  const resultStreak = el('result-streak');
  const resultFactText = el('result-fact-text');
  const reviewPanel = el('review-panel');

  /* ------------------------------------------------------------------ */
  /* Persistent storage helpers                                           */
  /* ------------------------------------------------------------------ */
  const Store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }
  };

  let settings = {
    music: Store.get('hs_music_on', true),
    sfx: Store.get('hs_sfx_on', true)
  };
  let bestScore = Store.get('hs_best_score', 0);
  let ftueDone = Store.get('hs_ftue_done', false);
  bestScoreValue.textContent = String(bestScore);

  /* ------------------------------------------------------------------ */
  /* Canvas sizing                                                        */
  /* ------------------------------------------------------------------ */
  let W = 0, H = 0, DPR = 1;

  function resizeCanvases() {
    const rect = root.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    [bgCanvas, gameCanvas, fxCanvas].forEach((c) => {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    });
    bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    gameCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutShipTrack();
    layoutBgLayers();
  }
  window.addEventListener('resize', resizeCanvases);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvases, 50));

  /* ------------------------------------------------------------------ */
  /* Screen management                                                    */
  /* ------------------------------------------------------------------ */
  function showScreen(name) {
    Object.entries(screens).forEach(([key, node]) => {
      node.hidden = key !== name;
    });
  }

  function openModal(node) { node.hidden = false; }
  function closeModal(node) { node.hidden = true; }

  /* ------------------------------------------------------------------ */
  /* Ambient background (parallax starfield + drifting molecule glyphs)  */
  /* ------------------------------------------------------------------ */
  // "Orbital Lab" backdrop: a deep-space nebula behind a drifting field of
  // stars and glowing molecular-geometry diagrams (tetrahedral / trigonal
  // planar / linear) — the same three shapes the player is hunting for.
  const bgStars = [];
  const bgNebulae = [];
  const bgDrifters = [];
  const MOLECULE_KINDS = ['sp3', 'sp2', 'sp'];

  function layoutBgLayers() {
    bgStars.length = 0;
    const starCount = Math.round((W * H) / 7000);
    for (let i = 0; i < starCount; i++) {
      const colored = Math.random() < 0.16;
      bgStars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 8 + 3,
        twinkle: Math.random() * Math.PI * 2,
        color: colored ? (Math.random() < 0.5 ? '77,238,255' : '176,107,255') : '234,246,255'
      });
    }

    bgNebulae.length = 0;
    const nebulaColors = ['80,60,190', '30,140,170', '150,50,140'];
    for (let i = 0; i < 4; i++) {
      bgNebulae.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.min(W, H) * rand(0.35, 0.6),
        driftX: rand(-2, 2),
        driftY: rand(-1.5, 1.5),
        color: pick(nebulaColors),
        alpha: rand(0.08, 0.16)
      });
    }

    bgDrifters.length = 0;
    for (let i = 0; i < 6; i++) {
      bgDrifters.push(makeDrifter(true));
    }
  }

  function makeDrifter(randomY) {
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : H + 40,
      size: Math.random() * 16 + 16,
      speed: Math.random() * 10 + 5,
      drift: (Math.random() - 0.5) * 8,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.5,
      kind: pick(MOLECULE_KINDS),
      alpha: Math.random() * 0.22 + 0.14
    };
  }

  function drawMoleculeDiagram(ctx, kind, size, alpha) {
    const info = HYBRID_TYPES[kind];
    const rgb = hexToRgb(info.color);
    ctx.strokeStyle = `rgba(${rgb},${(alpha * 1.1).toFixed(2)})`;
    ctx.fillStyle = `rgba(${rgb},${(alpha * 1.4).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    let pts;
    if (kind === 'sp') {
      pts = [[-size, 0], [size, 0]];
    } else if (kind === 'sp2') {
      pts = [0, 120, 240].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return [Math.cos(a) * size, Math.sin(a) * size];
      });
    } else {
      pts = [-35, 55, 175, 265].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return [Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9];
      });
    }
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  function drawBackground(dt) {
    bgCtx.clearRect(0, 0, W, H);

    // drifting nebula clouds
    bgNebulae.forEach((n) => {
      n.x += n.driftX * dt;
      n.y += n.driftY * dt;
      if (n.x < -n.r) n.x = W + n.r; if (n.x > W + n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = H + n.r; if (n.y > H + n.r) n.y = -n.r;
      const grad = bgCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, `rgba(${n.color},${n.alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, 0, W, H);
    });

    // starfield
    bgStars.forEach((s) => {
      s.y += s.speed * dt;
      s.twinkle += dt * 3;
      if (s.y > H) { s.y = -4; s.x = Math.random() * W; }
      const a = 0.35 + Math.sin(s.twinkle) * 0.25;
      bgCtx.fillStyle = `rgba(${s.color},${Math.max(0, a).toFixed(2)})`;
      bgCtx.beginPath();
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    });

    // drifting molecular-geometry glyphs (tetrahedral / trigonal / linear)
    bgDrifters.forEach((d) => {
      d.y -= d.speed * dt;
      d.x += d.drift * dt;
      d.rot += d.rotSpeed * dt;
      if (d.y < -40) Object.assign(d, makeDrifter(false));
      if (d.x < -40) d.x = W + 40;
      if (d.x > W + 40) d.x = -40;
      bgCtx.save();
      bgCtx.translate(d.x, d.y);
      bgCtx.rotate(d.rot);
      drawMoleculeDiagram(bgCtx, d.kind, d.size, d.alpha);
      bgCtx.restore();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ship + track                                                         */
  /* ------------------------------------------------------------------ */
  const TRACK_Y_FRAC = 0.84;
  const TRACK_X_MIN_FRAC = 0.12;
  const TRACK_X_MAX_FRAC = 0.88;

  const ship = { x: 0, y: 0, r: 0, tiltVel: 0 };

  function layoutShipTrack() {
    ship.y = H * TRACK_Y_FRAC;
    ship.r = Math.max(18, Math.min(W, H) * 0.045);
    if (!ship.x) ship.x = W * 0.5;
    ship.x = clamp(ship.x, W * TRACK_X_MIN_FRAC, W * TRACK_X_MAX_FRAC);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ------------------------------------------------------------------ */
  /* Game state                                                           */
  /* ------------------------------------------------------------------ */
  const MAX_LIVES = 3;
  const WIN_TARGET_CORRECT = 15;
  const CONDITION_INTERVAL = 9000;
  const BASE_SPAWN_INTERVAL = 1650;
  const BASE_FALL_SPEED = 0.115; // fraction of height per second
  const SESSION_DURATION = 60; // seconds — minimum required session length is 30s

  let game = null;

  function newGameState() {
    return {
      lives: MAX_LIVES,
      score: 0,
      totalCorrect: 0,
      totalWrong: 0,
      streak: 0,
      bestStreak: 0,
      speedMult: 1,
      condition: pick(['sp3', 'sp2', 'sp']),
      conditionTimer: CONDITION_INTERVAL,
      spawnTimer: 400,
      timeRemaining: SESSION_DURATION,
      asteroids: [],
      projectiles: [],
      powerups: { sureHit: 0, slowTime: 0, timeFreeze: 0 },
      slowTimeUntil: 0,
      freezeUntil: 0,
      wrongLog: [],
      running: false,
      paused: false,
      lastShotAt: 0,
      idCounter: 1
    };
  }

  function startGame() {
    game = newGameState();
    game.running = true;
    ship.x = W * 0.5;
    updateLivesUI();
    updateScoreUI();
    updateQuestionTabUI(true);
    updateStreakUI();
    updatePowerupUI();
    updateTimerUI();
    showScreen('gameplay');
    AudioEngine.startMusic();

    if (!ftueDone) {
      runFtue();
    }
  }

  /* ------------------------------------------------------------------ */
  /* HUD updates                                                          */
  /* ------------------------------------------------------------------ */
  function updateLivesUI() {
    livesRow.innerHTML = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      const img = document.createElement('img');
      img.alt = i < game.lives ? 'Life' : 'Life lost';
      img.src = i < game.lives
        ? 'assets/images/ui/emoji/heart_full.png'
        : 'assets/images/ui/emoji/heart_empty.png';
      livesRow.appendChild(img);
    }
  }

  function updateScoreUI() {
    scoreValue.textContent = String(Math.max(0, game.score));
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function updateTimerUI() {
    const remaining = game ? game.timeRemaining : SESSION_DURATION;
    timerValue.textContent = formatTime(remaining);
    timerPod.classList.toggle('low', remaining <= 10);
  }

  function updateQuestionTabUI(skipFlash) {
    const info = HYBRID_TYPES[game.condition];
    qtValue.textContent = info.label + ' — ' + info.shape;
    qtDot.style.background = info.color;
    questionTab.style.borderColor = info.color;
    if (!skipFlash) {
      questionTab.classList.remove('flash');
      // force reflow to restart animation
      void questionTab.offsetWidth;
      questionTab.classList.add('flash');
    }
  }

  function updateStreakUI() {
    if (game.streak > 1) {
      streakPod.hidden = false;
      streakValue.textContent = 'Streak: ' + game.streak;
    } else {
      streakPod.hidden = true;
    }
  }

  function updatePowerupUI() {
    [
      ['sureHit', 'pw-surehit', 'pw-surehit-count'],
      ['slowTime', 'pw-slowtime', 'pw-slowtime-count'],
      ['timeFreeze', 'pw-timefreeze', 'pw-timefreeze-count']
    ].forEach(([key, btnId, countId]) => {
      const count = game.powerups[key];
      const btn = el(btnId);
      const badge = el(countId);
      btn.classList.toggle('ready', count > 0);
      if (count > 0) {
        badge.hidden = false;
        badge.textContent = String(count);
      } else {
        badge.hidden = true;
      }
    });
  }

  function showToast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = 'toast show ' + kind;
    // restart animation
    void toastEl.offsetWidth;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 900);
  }

  /* ------------------------------------------------------------------ */
  /* Asteroids / projectiles / particles                                  */
  /* ------------------------------------------------------------------ */
  function spawnAsteroid() {
    const compound = pick(COMPOUNDS);
    const size = Math.min(W, H) * rand(0.075, 0.1);
    game.asteroids.push({
      id: game.idCounter++,
      x: rand(W * (TRACK_X_MIN_FRAC + 0.03), W * (TRACK_X_MAX_FRAC - 0.03)),
      y: -size,
      r: size / 2,
      compound,
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.6, 0.6),
      shape: buildRockShape()
    });
  }

  function buildRockShape() {
    const points = 9;
    const shape = [];
    for (let i = 0; i < points; i++) {
      shape.push(0.78 + Math.random() * 0.28);
    }
    return shape;
  }

  function fireProjectile() {
    const now = performance.now();
    if (now - game.lastShotAt < 170) return;
    game.lastShotAt = now;
    game.projectiles.push({
      x: ship.x,
      y: ship.y - ship.r,
      speed: Math.min(W, H) * 1.15
    });
    AudioEngine.play('shoot');
    spawnMuzzleParticles(ship.x, ship.y - ship.r);
  }

  const particles = [];
  function spawnMuzzleParticles(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x, y,
        vx: rand(-40, 40),
        vy: rand(-160, -60),
        life: 0.25,
        maxLife: 0.25,
        color: '77,238,255',
        size: rand(2, 4)
      });
    }
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(60, 260);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.35, 0.7),
        maxLife: 0.7,
        color,
        size: rand(2, 5)
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Gameplay logic                                                       */
  /* ------------------------------------------------------------------ */
  function onCorrectHit(asteroid) {
    game.score += 10;
    game.totalCorrect++;
    game.streak++;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    AudioEngine.play('correct');
    spawnBurst(asteroid.x, asteroid.y, '61,220,151', 18);
    showToast('+10', 'correct');

    if (game.totalCorrect % 3 === 0) {
      game.speedMult = Math.min(2.4, game.speedMult + 0.14);
    }

    grantPowerupsForStreak();
    updateScoreUI();
    updateStreakUI();
    updatePowerupUI();
    checkWinCondition();
  }

  function grantPowerupsForStreak() {
    if (game.streak === 3) {
      game.powerups.sureHit++;
      showToast('Sure Hit Ready!', 'powerup');
      AudioEngine.play('powerup');
    } else if (game.streak === 4) {
      game.powerups.slowTime++;
      showToast('Slow Time Ready!', 'powerup');
      AudioEngine.play('powerup');
    } else if (game.streak === 5) {
      game.powerups.timeFreeze++;
      showToast('Time Freeze Ready!', 'powerup');
      AudioEngine.play('powerup');
    }
  }

  function onWrongAction(asteroid, reason) {
    // A missed compound (one that reached the line unshot) only costs
    // points — a life is deducted ONLY when the player actively shoots the
    // wrong compound. This keeps 3 lives from being unfairly punishing.
    const isWrongShot = reason === 'shot';

    game.score = Math.max(0, game.score - 5);
    game.totalWrong++;
    game.streak = 0;
    AudioEngine.play('wrong');
    if (isWrongShot) {
      game.lives--;
      AudioEngine.play('lifeLost');
    }
    spawnBurst(asteroid.x, asteroid.y, '255,92,138', 16);
    showToast(reason === 'missed' ? 'Missed! -5' : 'Wrong Target!', 'wrong');
    game.wrongLog.push({ name: asteroid.compound.name, type: asteroid.compound.type, reason });

    updateScoreUI();
    updateLivesUI();
    updateStreakUI();
    updatePowerupUI();

    if (isWrongShot && game.lives <= 0) {
      endGame(false);
    }
  }

  function checkWinCondition() {
    if (game.totalCorrect >= WIN_TARGET_CORRECT) {
      endGame(true);
    }
  }

  function activatePowerup(key) {
    if (!game.running || game.paused) return;
    if (game.powerups[key] <= 0) return;

    if (key === 'sureHit') {
      const target = findNearestMatchingAsteroid();
      if (!target) { showToast('No Target!', 'wrong'); return; }
      game.powerups.sureHit--;
      removeAsteroid(target);
      onCorrectHitSilentStreak(target);
    } else if (key === 'slowTime') {
      game.powerups.slowTime--;
      game.slowTimeUntil = performance.now() + 4000;
      showToast('Slow Time!', 'powerup');
      AudioEngine.play('powerup');
      game.streak = 0;
    } else if (key === 'timeFreeze') {
      game.powerups.timeFreeze--;
      game.freezeUntil = performance.now() + 4000;
      showToast('Time Freeze!', 'powerup');
      AudioEngine.play('powerup');
      game.streak = 0;
    }
    updateStreakUI();
    updatePowerupUI();
  }

  // Sure Hit destroys a matching asteroid and awards points, but per the
  // design doc activating a power-up resets the streak rather than growing it.
  function onCorrectHitSilentStreak(asteroid) {
    game.score += 10;
    game.totalCorrect++;
    game.streak = 0;
    AudioEngine.play('correct');
    spawnBurst(asteroid.x, asteroid.y, '61,220,151', 18);
    showToast('+10', 'correct');
    updateScoreUI();
    checkWinCondition();
  }

  function findNearestMatchingAsteroid() {
    let best = null;
    game.asteroids.forEach((a) => {
      if (a.compound.type === game.condition) {
        if (!best || a.y > best.y) best = a;
      }
    });
    return best;
  }

  function removeAsteroid(asteroid) {
    const idx = game.asteroids.indexOf(asteroid);
    if (idx >= 0) game.asteroids.splice(idx, 1);
  }

  /* ------------------------------------------------------------------ */
  /* Update loop                                                          */
  /* ------------------------------------------------------------------ */
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    drawBackground(dt);

    if (game && game.running && !game.paused) {
      updateGameplay(dt, now);
      renderGameplay();
    } else if (screens.gameplay.hidden === false) {
      renderGameplay();
    } else {
      gameCtx.clearRect(0, 0, W, H);
    }

    updateAndRenderParticles(dt);

    requestAnimationFrame(frame);
  }

  function updateGameplay(dt, now) {
    const frozen = now < game.freezeUntil;
    const slowed = now < game.slowTimeUntil;
    const speedScale = frozen ? 0 : (slowed ? 0.4 : 1);

    // session timer — counts down in real time regardless of power-ups;
    // reaching zero ends the run (a completed, successful session).
    game.timeRemaining -= dt;
    updateTimerUI();
    if (game.timeRemaining <= 0) {
      game.timeRemaining = 0;
      endGame(true, 'time');
      return;
    }

    // keyboard movement (A/D or Arrow keys) — additive to touch/mouse drag
    applyKeyboardMovement(dt);

    // condition cycling
    game.conditionTimer -= dt * 1000;
    if (game.conditionTimer <= 0) {
      let next = game.condition;
      while (next === game.condition) next = pick(['sp3', 'sp2', 'sp']);
      game.condition = next;
      game.conditionTimer = CONDITION_INTERVAL;
      updateQuestionTabUI(false);
    }

    // spawn
    game.spawnTimer -= dt * 1000;
    if (game.spawnTimer <= 0) {
      spawnAsteroid();
      game.spawnTimer = Math.max(650, BASE_SPAWN_INTERVAL / game.speedMult);
    }

    // move asteroids
    const fallSpeed = H * BASE_FALL_SPEED * game.speedMult * speedScale;
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
      const a = game.asteroids[i];
      a.y += fallSpeed * dt;
      a.rot += a.rotSpeed * dt;
      if (a.y - a.r > ship.y) {
        // reached / passed the line unshot
        game.asteroids.splice(i, 1);
        if (a.compound.type === game.condition) {
          onWrongAction(a, 'missed');
        }
      }
    }

    // move projectiles + collisions
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const p = game.projectiles[i];
      p.y -= p.speed * dt;
      let hit = false;
      for (let j = game.asteroids.length - 1; j >= 0; j--) {
        const a = game.asteroids[j];
        const dx = a.x - p.x;
        const dy = a.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) <= a.r + 6) {
          game.asteroids.splice(j, 1);
          if (a.compound.type === game.condition) {
            onCorrectHit(a);
          } else {
            onWrongAction(a, 'shot');
          }
          hit = true;
          break;
        }
      }
      if (hit || p.y < -20) game.projectiles.splice(i, 1);
    }
  }

  function renderGameplay() {
    gameCtx.clearRect(0, 0, W, H);

    // track line glow — the ship's docking rail
    gameCtx.save();
    gameCtx.shadowColor = 'rgba(77,238,255,0.8)';
    gameCtx.shadowBlur = 8;
    gameCtx.strokeStyle = 'rgba(77,238,255,0.65)';
    gameCtx.lineWidth = 2;
    gameCtx.setLineDash([2, 10]);
    gameCtx.beginPath();
    gameCtx.moveTo(W * TRACK_X_MIN_FRAC, ship.y);
    gameCtx.lineTo(W * TRACK_X_MAX_FRAC, ship.y);
    gameCtx.stroke();
    gameCtx.restore();

    // asteroids
    if (game) {
      game.asteroids.forEach((a) => drawAsteroid(a));
      game.projectiles.forEach((p) => drawProjectile(p));
    }

    drawShip();
  }

  function drawAsteroid(a) {
    const img = AssetLoader.get(
      a.compound.type === 'sp3' ? 'asteroidSp3' : a.compound.type === 'sp2' ? 'asteroidSp2' : 'asteroidSp'
    );
    gameCtx.save();
    gameCtx.translate(a.x, a.y);
    gameCtx.rotate(a.rot);
    if (img) {
      gameCtx.drawImage(img, -a.r, -a.r, a.r * 2, a.r * 2);
    } else {
      gameCtx.beginPath();
      const pts = a.shape.length;
      for (let i = 0; i <= pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const rr = a.r * a.shape[i % pts];
        const px = Math.cos(ang) * rr;
        const py = Math.sin(ang) * rr;
        if (i === 0) gameCtx.moveTo(px, py); else gameCtx.lineTo(px, py);
      }
      gameCtx.closePath();
      // crystalline space-mineral rock: cool slate facets with a frosty rim
      const grad = gameCtx.createRadialGradient(-a.r * 0.35, -a.r * 0.4, a.r * 0.1, 0, 0, a.r);
      grad.addColorStop(0, '#8fa4d6');
      grad.addColorStop(0.55, '#3d4a86');
      grad.addColorStop(1, '#181c40');
      gameCtx.fillStyle = grad;
      gameCtx.fill();
      gameCtx.lineWidth = 1.5;
      gameCtx.strokeStyle = 'rgba(77,238,255,0.55)';
      gameCtx.stroke();
      // faceted highlight streak
      gameCtx.beginPath();
      gameCtx.moveTo(-a.r * 0.25, -a.r * 0.6);
      gameCtx.lineTo(a.r * 0.1, -a.r * 0.15);
      gameCtx.strokeStyle = 'rgba(255,255,255,0.45)';
      gameCtx.lineWidth = 2;
      gameCtx.stroke();
    }
    gameCtx.restore();

    // holographic ID tag (drawn upright, not rotated)
    gameCtx.save();
    gameCtx.textAlign = 'center';
    gameCtx.textBaseline = 'middle';
    const fontSize = Math.max(10, a.r * 0.32);
    const tagW = Math.max(a.compound.name.length * fontSize * 0.52, a.compound.formula.length * fontSize * 0.5) + 14;
    const tagH = fontSize * 2.35;
    const tagY = a.y - a.r - tagH * 0.5 - 4;
    gameCtx.shadowColor = 'rgba(77,238,255,0.5)';
    gameCtx.shadowBlur = 6;
    gameCtx.fillStyle = 'rgba(6,12,36,0.72)';
    gameCtx.strokeStyle = 'rgba(77,238,255,0.55)';
    gameCtx.lineWidth = 1;
    roundRect(gameCtx, a.x - tagW / 2, tagY - tagH / 2, tagW, tagH, 5);
    gameCtx.fill();
    gameCtx.stroke();
    gameCtx.shadowBlur = 0;
    gameCtx.font = `800 ${fontSize}px Orbitron, sans-serif`;
    gameCtx.fillStyle = '#eaf6ff';
    gameCtx.fillText(a.compound.name, a.x, tagY - fontSize * 0.42);
    const smallSize = Math.max(9, a.r * 0.24);
    gameCtx.font = `700 ${smallSize}px Nunito, sans-serif`;
    gameCtx.fillStyle = '#4deeff';
    gameCtx.fillText(a.compound.formula, a.x, tagY + fontSize * 0.48);
    gameCtx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawProjectile(p) {
    gameCtx.save();
    gameCtx.shadowColor = 'rgba(77,238,255,0.9)';
    gameCtx.shadowBlur = 10;
    const grad = gameCtx.createLinearGradient(p.x, p.y - 16, p.x, p.y + 16);
    grad.addColorStop(0, 'rgba(77,238,255,0)');
    grad.addColorStop(0.6, 'rgba(77,238,255,0.9)');
    grad.addColorStop(1, '#eaf6ff');
    gameCtx.fillStyle = grad;
    gameCtx.beginPath();
    gameCtx.ellipse(p.x, p.y, 3.5, 15, 0, 0, Math.PI * 2);
    gameCtx.fill();
    gameCtx.restore();
  }

  function drawShip() {
    const img = AssetLoader.get('shipIdle');
    gameCtx.save();
    gameCtx.translate(ship.x, ship.y);
    if (img) {
      const w = ship.r * 2.4;
      const h = ship.r * 2.4;
      gameCtx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      // fallback vector ship: a sleek molecular-collector drone, top view
      // engine glow trail (drawn first, underneath the hull)
      const trail = gameCtx.createRadialGradient(0, ship.r * 1.25, 1, 0, ship.r * 1.25, ship.r * 0.8);
      trail.addColorStop(0, 'rgba(77,238,255,0.95)');
      trail.addColorStop(1, 'rgba(77,238,255,0)');
      gameCtx.fillStyle = trail;
      gameCtx.beginPath();
      gameCtx.arc(0, ship.r * 1.25, ship.r * 0.8, 0, Math.PI * 2);
      gameCtx.fill();

      // hull
      gameCtx.fillStyle = '#141c4a';
      gameCtx.strokeStyle = '#4deeff';
      gameCtx.lineWidth = 2;
      gameCtx.shadowColor = 'rgba(77,238,255,0.6)';
      gameCtx.shadowBlur = 10;
      gameCtx.beginPath();
      gameCtx.moveTo(0, -ship.r * 1.35);
      gameCtx.quadraticCurveTo(ship.r * 1.0, ship.r * 0.35, ship.r * 0.55, ship.r * 1.05);
      gameCtx.lineTo(-ship.r * 0.55, ship.r * 1.05);
      gameCtx.quadraticCurveTo(-ship.r * 1.0, ship.r * 0.35, 0, -ship.r * 1.35);
      gameCtx.closePath();
      gameCtx.fill();
      gameCtx.stroke();
      gameCtx.shadowBlur = 0;

      // circuit seam down the spine
      gameCtx.strokeStyle = 'rgba(176,107,255,0.7)';
      gameCtx.lineWidth = 1.2;
      gameCtx.beginPath();
      gameCtx.moveTo(0, -ship.r * 1.1);
      gameCtx.lineTo(0, ship.r * 0.85);
      gameCtx.stroke();

      // cockpit / sensor core
      gameCtx.fillStyle = '#4deeff';
      gameCtx.shadowColor = 'rgba(77,238,255,0.9)';
      gameCtx.shadowBlur = 8;
      gameCtx.beginPath();
      gameCtx.ellipse(0, -ship.r * 0.2, ship.r * 0.28, ship.r * 0.36, 0, 0, Math.PI * 2);
      gameCtx.fill();
      gameCtx.shadowBlur = 0;
      gameCtx.strokeStyle = '#eaf6ff';
      gameCtx.lineWidth = 1;
      gameCtx.stroke();

      // violet wingtip fins
      gameCtx.fillStyle = '#b06bff';
      gameCtx.beginPath();
      gameCtx.moveTo(-ship.r * 0.55, ship.r * 0.45);
      gameCtx.lineTo(-ship.r * 1.1, ship.r * 1.1);
      gameCtx.lineTo(-ship.r * 0.35, ship.r * 1.05);
      gameCtx.closePath();
      gameCtx.fill();
      gameCtx.beginPath();
      gameCtx.moveTo(ship.r * 0.55, ship.r * 0.45);
      gameCtx.lineTo(ship.r * 1.1, ship.r * 1.1);
      gameCtx.lineTo(ship.r * 0.35, ship.r * 1.05);
      gameCtx.closePath();
      gameCtx.fill();
    }
    gameCtx.restore();
  }

  function updateAndRenderParticles(dt) {
    fxCtx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      const alpha = Math.max(0, p.life / p.maxLife);
      fxCtx.fillStyle = `rgba(${p.color},${alpha.toFixed(2)})`;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      fxCtx.fill();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Input: drag ship along track                                        */
  /* ------------------------------------------------------------------ */
  let dragging = false;

  function pointFromEvent(evt) {
    const rect = root.getBoundingClientRect();
    const point = evt.touches ? evt.touches[0] : evt;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function onPointerDown(evt) {
    if (!game || !game.running || game.paused) return;
    if (evt.target.closest('.shoot-btn, .powerup-btn, .icon-btn')) return;
    dragging = true;
    moveShipToPointer(evt);
    evt.preventDefault();
  }
  function onPointerMove(evt) {
    if (!dragging) return;
    moveShipToPointer(evt);
    evt.preventDefault();
  }
  function onPointerUp() { dragging = false; }

  function moveShipToPointer(evt) {
    const p = pointFromEvent(evt);
    ship.x = clamp(p.x, W * TRACK_X_MIN_FRAC, W * TRACK_X_MAX_FRAC);
  }

  screens.gameplay.addEventListener('mousedown', onPointerDown);
  screens.gameplay.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  screens.gameplay.addEventListener('touchstart', onPointerDown, { passive: false });
  screens.gameplay.addEventListener('touchmove', onPointerMove, { passive: false });
  screens.gameplay.addEventListener('touchend', onPointerUp);
  screens.gameplay.addEventListener('touchcancel', onPointerUp);

  /* ------------------------------------------------------------------ */
  /* Input: keyboard controls (desktop) — A/D or Arrow keys to move,      */
  /* Spacebar to shoot. Purely additive: touch/mouse controls above are   */
  /* untouched and keep working exactly as before.                       */
  /* ------------------------------------------------------------------ */
  const KEY_MOVE_SPEED_FRAC = 0.9; // fraction of track width per second
  const keyState = { left: false, right: false };

  function isMoveLeftKey(code) { return code === 'KeyA' || code === 'ArrowLeft'; }
  function isMoveRightKey(code) { return code === 'KeyD' || code === 'ArrowRight'; }
  function isShootKey(code) { return code === 'Space'; }

  window.addEventListener('keydown', (evt) => {
    if (isMoveLeftKey(evt.code)) { keyState.left = true; evt.preventDefault(); }
    else if (isMoveRightKey(evt.code)) { keyState.right = true; evt.preventDefault(); }
    else if (isShootKey(evt.code)) {
      evt.preventDefault();
      if (game && game.running && !game.paused) fireProjectile();
    }
  });
  window.addEventListener('keyup', (evt) => {
    if (isMoveLeftKey(evt.code)) keyState.left = false;
    else if (isMoveRightKey(evt.code)) keyState.right = false;
  });
  // Stop tracking held keys if the window/tab loses focus, so the ship
  // never keeps drifting after alt-tabbing away.
  window.addEventListener('blur', () => { keyState.left = false; keyState.right = false; });

  function applyKeyboardMovement(dt) {
    if (!keyState.left && !keyState.right) return;
    const speed = W * KEY_MOVE_SPEED_FRAC;
    if (keyState.left) ship.x -= speed * dt;
    if (keyState.right) ship.x += speed * dt;
    ship.x = clamp(ship.x, W * TRACK_X_MIN_FRAC, W * TRACK_X_MAX_FRAC);
  }

  /* ------------------------------------------------------------------ */
  /* End of game / results                                                */
  /* ------------------------------------------------------------------ */
  function endGame(won, reason) {
    if (!game || !game.running) return;
    game.running = false;

    if (game.score > bestScore) {
      bestScore = game.score;
      Store.set('hs_best_score', bestScore);
      bestScoreValue.textContent = String(bestScore);
    }

    resultTitle.textContent = won
      ? (reason === 'time' ? "Time's Up!" : 'Mission Complete!')
      : 'Ship Down!';
    resultTitle.classList.toggle('fail', !won);
    resultBadge.src = won
      ? 'assets/images/ui/emoji/trophy.png'
      : 'assets/images/ui/emoji/retry.png';
    resultScore.textContent = String(game.score);
    resultCorrect.textContent = String(game.totalCorrect);
    resultStreak.textContent = String(game.bestStreak);
    resultFactText.textContent = pick(RANDOM_FACTS);

    reviewPanel.innerHTML = '';
    if (game.wrongLog.length > 0) {
      reviewPanel.hidden = false;
      game.wrongLog.forEach((entry) => {
        const info = HYBRID_TYPES[entry.type];
        const row = document.createElement('div');
        row.className = 'review-row';
        const name = document.createElement('span');
        name.className = 'rr-name';
        name.textContent = entry.name;
        const type = document.createElement('span');
        type.className = 'rr-type';
        type.style.background = info.color;
        type.textContent = info.label.replace(' Hybridized', '');
        row.appendChild(name);
        row.appendChild(type);
        reviewPanel.appendChild(row);
      });
    } else {
      reviewPanel.hidden = true;
    }

    AudioEngine.play(won ? 'win' : 'gameOver');
    showScreen('result');
  }

  /* ------------------------------------------------------------------ */
  /* FTUE (one-time interactive tutorial)                                 */
  /* ------------------------------------------------------------------ */
  const FTUE_STEPS = [
    {
      text: 'Drag anywhere on this line to steer your ship left and right.',
      target: () => ({ x: W * 0.5, y: H * TRACK_Y_FRAC, w: W * 0.7, h: 40 })
    },
    {
      text: 'Tap either glowing button to fire at the asteroid ahead of you.',
      target: () => ({ x: W * 0.5, y: H * 0.955, w: W * 0.94, h: 100 })
    },
    {
      text: 'This tab shows which hybridized compounds to shoot down. It changes over time!',
      target: () => ({ x: W * 0.5, y: H * 0.09, w: 220, h: 60 })
    }
  ];
  let ftueStep = 0;

  function runFtue() {
    game.paused = true;
    ftueStep = 0;
    showFtueStep();
    ftueDim.hidden = false;
    ftueHole.hidden = false;
    ftueCallout.hidden = false;
  }

  function showFtueStep() {
    const step = FTUE_STEPS[ftueStep];
    const t = step.target();
    ftueHole.style.left = (t.x - t.w / 2) + 'px';
    ftueHole.style.top = (t.y - t.h / 2) + 'px';
    ftueHole.style.width = t.w + 'px';
    ftueHole.style.height = t.h + 'px';
    ftueText.textContent = step.text;

    const calloutY = Math.min(H - 140, t.y + t.h / 2 + 20);
    ftueCallout.style.left = clamp(t.x, 130, W - 130) + 'px';
    ftueCallout.style.top = calloutY + 'px';
    ftueCallout.style.transform = 'translateX(-50%)';
    ftueNext.textContent = ftueStep === FTUE_STEPS.length - 1 ? "Let's Go!" : 'Next';
  }

  ftueNext.addEventListener('click', () => {
    AudioEngine.play('click');
    ftueStep++;
    if (ftueStep >= FTUE_STEPS.length) {
      ftueDim.hidden = true;
      ftueHole.hidden = true;
      ftueCallout.hidden = true;
      ftueDone = true;
      Store.set('hs_ftue_done', true);
      if (game) game.paused = false;
    } else {
      showFtueStep();
    }
  });

  /* ------------------------------------------------------------------ */
  /* UI wiring                                                            */
  /* ------------------------------------------------------------------ */
  function bindTap(elm, handler) {
    elm.addEventListener('click', (e) => { e.preventDefault(); handler(e); });
  }

  bindTap(el('btn-play'), () => { AudioEngine.resume(); AudioEngine.play('click'); startGame(); });
  bindTap(el('btn-instructions'), () => { AudioEngine.play('click'); openModal(modalInstructions); });
  bindTap(el('instructions-close'), () => { AudioEngine.play('click'); closeModal(modalInstructions); });
  bindTap(el('instructions-ok'), () => { AudioEngine.play('click'); closeModal(modalInstructions); });

  bindTap(el('btn-settings'), () => { AudioEngine.play('click'); openModal(modalSettings); });
  bindTap(el('settings-close'), () => { AudioEngine.play('click'); closeModal(modalSettings); });
  bindTap(el('btn-pause-settings'), () => { AudioEngine.play('click'); openModal(modalSettings); });

  bindTap(el('btn-pause'), () => {
    if (!game || !game.running) return;
    game.paused = true;
    showScreen('pause');
  });
  bindTap(el('btn-resume'), () => {
    if (game) game.paused = false;
    showScreen('gameplay');
  });
  bindTap(el('btn-pause-home'), () => {
    game = null;
    showScreen('title');
  });

  bindTap(el('btn-result-home'), () => { showScreen('title'); });
  bindTap(el('btn-result-retry'), () => { startGame(); });

  bindTap(el('btn-shoot-left'), () => { if (game && game.running && !game.paused) fireProjectile(); });
  bindTap(el('btn-shoot-right'), () => { if (game && game.running && !game.paused) fireProjectile(); });

  ['pw-surehit', 'pw-slowtime', 'pw-timefreeze'].forEach((id) => {
    bindTap(el(id), (e) => activatePowerup(e.currentTarget.dataset.pw));
  });

  function syncSwitch(switchEl, iconEl, onIcon, offIcon, value) {
    switchEl.classList.toggle('on', value);
    if (iconEl) iconEl.src = value ? onIcon : offIcon;
  }

  const switchMusic = el('switch-music');
  const switchSfx = el('switch-sfx');
  const musicIcon = el('settings-music-icon');
  const sfxIcon = el('settings-sfx-icon');

  syncSwitch(switchMusic, musicIcon, 'assets/images/ui/emoji/music_on.png', 'assets/images/ui/emoji/music_off.png', settings.music);
  syncSwitch(switchSfx, sfxIcon, 'assets/images/ui/emoji/sound_on.png', 'assets/images/ui/emoji/sound_off.png', settings.sfx);
  AudioEngine.setMusicOn(settings.music);
  AudioEngine.setSfxOn(settings.sfx);

  bindTap(switchMusic, () => {
    settings.music = !settings.music;
    Store.set('hs_music_on', settings.music);
    AudioEngine.setMusicOn(settings.music);
    syncSwitch(switchMusic, musicIcon, 'assets/images/ui/emoji/music_on.png', 'assets/images/ui/emoji/music_off.png', settings.music);
  });
  bindTap(switchSfx, () => {
    settings.sfx = !settings.sfx;
    Store.set('hs_sfx_on', settings.sfx);
    AudioEngine.setSfxOn(settings.sfx);
    syncSwitch(switchSfx, sfxIcon, 'assets/images/ui/emoji/sound_on.png', 'assets/images/ui/emoji/sound_off.png', settings.sfx);
    if (settings.sfx) AudioEngine.play('click');
  });

  // Prevent iOS/Android gesture zoom & context menu inside the game shell.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  /* ------------------------------------------------------------------ */
  /* Boot sequence                                                        */
  /* ------------------------------------------------------------------ */
  async function boot() {
    resizeCanvases();
    bootFactText.textContent = pick(RANDOM_FACTS);

    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(92, progress + rand(4, 12));
      loadingBarFill.style.width = progress + '%';
    }, 120);

    await AssetLoader.preload();

    clearInterval(tick);
    loadingBarFill.style.width = '100%';

    setTimeout(() => {
      showScreen('title');
      requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(frame); });
    }, 350);
  }

  boot();
})();
