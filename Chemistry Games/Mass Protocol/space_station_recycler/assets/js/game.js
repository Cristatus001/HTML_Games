/* =========================================================================
   SPACE STATION RECYCLER — game.js
   Fully offline, self-contained game logic.
   Sections: Storage, Config, Optional-Image Loader, Audio, Background FX,
   Particles, Screen Manager, Achievements, Core Simulation, Input, Init.
   ========================================================================= */

(function () {
  'use strict';

  /* ----------------------------- Storage -------------------------------- */
  const SAVE_KEY = 'ssr_save_v1';

  function defaultSave() {
    return {
      highScore: 0,
      bestCycles: 0,
      missionsCompleted: 0,
      unlockedDifficulty: ['trainee', 'officer'],
      achievements: {},
      muted: true,
      musicMuted: false,
      badges: {},
      seenTips: {},
      decisionsHandled: 0,
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultSave(), parsed);
    } catch (e) {
      return defaultSave();
    }
  }

  function persistSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) { /* storage unavailable, fail silently */ }
  }

  let save = loadSave();

  /* ------------------------------ Config -------------------------------- */
  const DIFFICULTIES = {
    trainee: {
      label: 'TRAINEE',
      time: 420,
      waterConsumption: 0.40,
      oxygenConsumption: 0.55,
      wasteWaterGen: 0.30,
      co2Gen: 0.45,
      eventChance: 0.10,
      maxCapacity: 150,
      desc: '7:00 · Gentle resource drain · Fewer emergencies',
      starThresholds: [400, 900, 1500],
    },
    officer: {
      label: 'OFFICER',
      time: 300,
      waterConsumption: 0.50,
      oxygenConsumption: 0.70,
      wasteWaterGen: 0.40,
      co2Gen: 0.60,
      eventChance: 0.15,
      maxCapacity: 150,
      desc: '5:00 · Standard station operations',
      starThresholds: [600, 1200, 2000],
    },
    commander: {
      label: 'COMMANDER',
      time: 240,
      waterConsumption: 0.65,
      oxygenConsumption: 0.85,
      wasteWaterGen: 0.50,
      co2Gen: 0.75,
      eventChance: 0.22,
      maxCapacity: 140,
      desc: '4:00 · Tight margins · Frequent emergencies',
      starThresholds: [800, 1600, 2600],
    },
  };

  const ACHIEVEMENTS = {
    first_cycle: { title: 'Recycler Rookie', desc: 'Complete your first recycling cycle.' },
    score_1000: { title: 'Overachiever', desc: 'Reach a score of 1000 in one mission.' },
    survivor: { title: 'Survivor', desc: 'Successfully complete a mission.' },
    bonus_hunter: { title: 'Scavenger', desc: 'Collect every supply bonus in one mission.' },
    commander_unlocked: { title: 'Top Brass', desc: 'Unlock Commander difficulty.' },
    well_stocked: { title: 'Well Stocked', desc: 'Finish a mission with over 80% water and oxygen.' },
    objective_ace: { title: 'Objective Ace', desc: 'Complete 3 mission objectives in a single run.' },
    quick_thinker: { title: 'Quick Thinker', desc: 'Respond to a quick-decision alert before time runs out.' },
    decisive_commander: { title: 'Decisive Commander', desc: 'Respond to 5 quick-decision alerts across all missions.' },
    balance_master: { title: 'Balance Master', desc: 'Hold both tanks in a healthy range for 60 seconds straight.' },
    phase_three_survivor: { title: 'Deep Shift Survivor', desc: 'Survive into Phase 3 of a mission.' },
    platinum_commander: { title: 'Platinum Commander', desc: 'Earn a Gold rating on Commander difficulty.' },
  };

  function unlockAchievement(id) {
    if (save.achievements[id]) return;
    save.achievements[id] = true;
    persistSave();
    const a = ACHIEVEMENTS[id];
    if (a) showAchievementToast(a.title, a.desc);
    playBonusSound();
  }

  /* ------------------------ Optional Image Loader ------------------------ */
  // Attempts to load a drop-in art asset. On success, swaps it in and hides
  // the existing vector/canvas fallback. On failure (404/missing file), the
  // fallback art already in the DOM remains untouched — nothing breaks.
  function wireOptionalImage(container) {
    const path = container.getAttribute('data-img');
    if (!path) return;
    const img = container.querySelector('img.art-img');
    const tester = new Image();
    tester.onload = function () {
      if (img) {
        img.src = path;
        img.classList.remove('hidden');
      }
      const fallback = container.querySelector('.art-fallback');
      if (fallback) fallback.classList.add('img-loaded-hide');
    };
    tester.onerror = function () { /* keep fallback, no-op */ };
    tester.src = path;
  }

  function initOptionalImages() {
    document.querySelectorAll('[data-img]').forEach(wireOptionalImage);
  }

  /* -------------------------------- Audio (SFX) --------------------------- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let audioEnabled = !save.muted;

  function initAudio() {
    if (!AudioCtx) return;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function playSound(frequency, duration, type) {
    if (!audioEnabled || !audioContext) return;
    type = type || 'sine';
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration);
  }

  function playClickSound() { playSound(600, 0.05); }
  function playSuccessSound() { playSound(523, 0.1); setTimeout(function () { playSound(784, 0.2); }, 100); }
  function playWarningSound() { playSound(440, 0.2, 'square'); }
  function playBonusSound() { playSound(880, 0.1); setTimeout(function () { playSound(1319, 0.15); }, 100); }
  function playAlarmSound() { playSound(800, 0.5, 'sawtooth'); }

  function refreshAudioUI() {
    document.querySelectorAll('.audio-icon').forEach(function (el) { el.src = audioEnabled ? 'assets/images/ui/emoji/speaker_high.png' : 'assets/images/ui/emoji/speaker_mute.png'; });
    document.querySelectorAll('.music-icon').forEach(function (el) { el.src = musicEnabled ? 'assets/images/ui/emoji/music_note.png' : 'assets/images/ui/emoji/speaker_mute.png'; });
    const sfxSwitch = document.getElementById('toggle-sfx');
    if (sfxSwitch) sfxSwitch.classList.toggle('on', audioEnabled);
    const musicSwitch = document.getElementById('toggle-music');
    if (musicSwitch) musicSwitch.classList.toggle('on', musicEnabled);
  }

  function setAudioEnabled(enabled) {
    audioEnabled = enabled;
    save.muted = !enabled;
    persistSave();
    refreshAudioUI();
    if (audioEnabled) initAudio();
  }

  function toggleAudio() {
    initAudio();
    setAudioEnabled(!audioEnabled);
  }

  /* ---------------------------- Background Music --------------------------- */
  // Looks for an optional drop-in music file first (assets/audio/bgm.mp3).
  // If it's missing, falls back to a fully procedural, generative ambient
  // synth pad built from Web Audio oscillators — zero network, zero assets,
  // still gives the game a real, evolving soundtrack.
  let musicEnabled = !save.musicMuted;
  let musicGain = null;
  let padVoices = [];
  let tensionOsc = null, tensionGain = null;
  let bgmFileEl = null;
  let bgmMode = null; // 'file' | 'procedural'
  let bgmDetecting = false;

  function ensureMusicGain() {
    if (!audioContext) return null;
    if (!musicGain) {
      musicGain = audioContext.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(audioContext.destination);
    }
    return musicGain;
  }

  function fadeMusicGain(target, duration) {
    if (!musicGain || !audioContext) return;
    const now = audioContext.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(target, now + (duration || 1.5));
  }

  function startProceduralPad() {
    if (!audioContext || padVoices.length) return;
    const master = ensureMusicGain();
    if (!master) return;
    // Calm ambient pad — a slow-breathing Cmaj9 chord, each voice drifting
    // in and out of phase so the texture never feels static or looped.
    const chord = [130.81, 164.81, 196.00, 246.94, 293.66]; // C3 E3 G3 B3 D4
    chord.forEach(function (freq, i) {
      const osc = audioContext.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const voiceGain = audioContext.createGain();
      voiceGain.gain.value = 0.12;
      osc.connect(voiceGain);
      voiceGain.connect(master);

      const lfo = audioContext.createOscillator();
      lfo.frequency.value = 0.045 + i * 0.013;
      const lfoGain = audioContext.createGain();
      lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain);

      osc.start();
      lfo.start();
      padVoices.push({ osc: osc, voiceGain: voiceGain, lfo: lfo, lfoGain: lfoGain });
    });

    // Tension layer: silent low drone that fades in during crew DANGER state.
    tensionOsc = audioContext.createOscillator();
    tensionOsc.type = 'sawtooth';
    tensionOsc.frequency.value = 54;
    tensionGain = audioContext.createGain();
    tensionGain.gain.value = 0;
    const tensionFilter = audioContext.createBiquadFilter();
    tensionFilter.type = 'lowpass';
    tensionFilter.frequency.value = 220;
    tensionOsc.connect(tensionFilter);
    tensionFilter.connect(tensionGain);
    tensionGain.connect(master);
    tensionOsc.start();
  }

  function setMusicTension(active) {
    if (!tensionGain || !audioContext) return;
    const now = audioContext.currentTime;
    tensionGain.gain.cancelScheduledValues(now);
    tensionGain.gain.setValueAtTime(tensionGain.gain.value, now);
    tensionGain.gain.linearRampToValueAtTime(active ? 0.11 : 0, now + 1.2);
  }

  function tryLoadBgmFile(cb) {
    let el;
    try { el = new Audio('assets/audio/bgm.mp3'); } catch (e) { cb(null); return; }
    let resolved = false;
    el.loop = true;
    el.preload = 'auto';
    el.addEventListener('canplaythrough', function () { if (resolved) return; resolved = true; cb(el); }, { once: true });
    el.addEventListener('error', function () { if (resolved) return; resolved = true; cb(null); }, { once: true });
    el.load();
    // Some WebViews never fire either event for a missing local file — don't
    // block music forever if that happens.
    setTimeout(function () { if (!resolved) { resolved = true; cb(null); } }, 2500);
  }

  function beginMusicPlayback() {
    if (bgmMode === 'file' && bgmFileEl) {
      bgmFileEl.volume = 0.4;
      bgmFileEl.play().catch(function () { /* needs a user gesture; will retry on next toggle/tap */ });
    } else if (bgmMode === 'procedural') {
      startProceduralPad();
      fadeMusicGain(0.5, 2);
    }
  }

  function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    save.musicMuted = !enabled;
    persistSave();
    refreshAudioUI();

    if (!enabled) {
      if (bgmMode === 'file' && bgmFileEl) bgmFileEl.pause();
      if (bgmMode === 'procedural') fadeMusicGain(0, 1);
      return;
    }

    initAudio();
    if (bgmMode) { beginMusicPlayback(); return; }
    if (bgmDetecting) return;
    bgmDetecting = true;
    tryLoadBgmFile(function (el) {
      bgmDetecting = false;
      if (el) { bgmMode = 'file'; bgmFileEl = el; }
      else { bgmMode = 'procedural'; }
      if (musicEnabled) beginMusicPlayback();
    });
  }

  function toggleMusic() {
    initAudio();
    setMusicEnabled(!musicEnabled);
  }

  /* --------------------------- Background FX ----------------------------- */
  // Ambient starfield + drifting debris on a full-screen canvas behind the UI.
  // Purely decorative — pointer-events are disabled and it never touches
  // gameplay hitboxes or logic.
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  let starsFar = [], starsNear = [], debris = [];

  function resizeBgCanvas() {
    if (!bgCanvas) return;
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  function makeStars(count, speed, sizeRange) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * (bgCanvas ? bgCanvas.width : window.innerWidth),
        y: Math.random() * (bgCanvas ? bgCanvas.height : window.innerHeight),
        r: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        speed: speed * (0.5 + Math.random()),
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }

  function makeDebris(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * (bgCanvas ? bgCanvas.width : window.innerWidth),
        y: Math.random() * (bgCanvas ? bgCanvas.height : window.innerHeight),
        size: 6 + Math.random() * 14,
        speed: 0.04 + Math.random() * 0.08,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.002,
      });
    }
    return arr;
  }

  function initBackground() {
    if (!bgCanvas) return;
    resizeBgCanvas();
    starsFar = makeStars(90, 0.05, [0.5, 1.4]);
    starsNear = makeStars(50, 0.15, [1, 2.4]);
    debris = makeDebris(6);
    requestAnimationFrame(bgLoop);
  }

  let bgTime = 0;
  function bgLoop() {
    if (bgCtx && bgCanvas) {
      bgTime += 1;
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

      // Nebula wash
      const grad = bgCtx.createRadialGradient(
        bgCanvas.width * 0.5, bgCanvas.height * 0.35, 0,
        bgCanvas.width * 0.5, bgCanvas.height * 0.35, bgCanvas.width * 0.8
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(0.5, 'rgba(255,240,200,0.12)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

      // Secondary soft color washes for extra depth/vibrancy
      const gradA = bgCtx.createRadialGradient(
        bgCanvas.width * 0.85, bgCanvas.height * 0.15, 0,
        bgCanvas.width * 0.85, bgCanvas.height * 0.15, bgCanvas.width * 0.5
      );
      gradA.addColorStop(0, 'rgba(165,107,240,0.10)');
      gradA.addColorStop(1, 'rgba(165,107,240,0)');
      bgCtx.fillStyle = gradA;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

      const gradB = bgCtx.createRadialGradient(
        bgCanvas.width * 0.1, bgCanvas.height * 0.85, 0,
        bgCanvas.width * 0.1, bgCanvas.height * 0.85, bgCanvas.width * 0.5
      );
      gradB.addColorStop(0, 'rgba(62,207,95,0.08)');
      gradB.addColorStop(1, 'rgba(62,207,95,0)');
      bgCtx.fillStyle = gradB;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

      drawStars(starsFar, 'rgba(255,255,255,');
      drawStars(starsNear, 'rgba(191,232,255,');
      drawDebris();
    }
    requestAnimationFrame(bgLoop);
  }

  function drawStars(list, colorPrefix) {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      s.x -= s.speed;
      if (s.x < -5) s.x = bgCanvas.width + 5;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(bgTime * 0.02 + s.phase));
      bgCtx.beginPath();
      bgCtx.fillStyle = colorPrefix + twinkle.toFixed(2) + ')';
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  const DEBRIS_COLORS = ['rgba(47,140,224,0.35)', 'rgba(62,207,95,0.35)', 'rgba(255,176,32,0.35)', 'rgba(165,107,240,0.35)', 'rgba(255,92,92,0.3)'];
  function drawDebris() {
    for (let i = 0; i < debris.length; i++) {
      const d = debris[i];
      d.x -= d.speed;
      d.rot += d.rotSpeed;
      if (d.x < -30) d.x = bgCanvas.width + 30;
      bgCtx.save();
      bgCtx.translate(d.x, d.y);
      bgCtx.fillStyle = DEBRIS_COLORS[i % DEBRIS_COLORS.length];
      bgCtx.beginPath();
      bgCtx.arc(0, 0, d.size * 0.6, 0, Math.PI * 2);
      bgCtx.fill();
      bgCtx.strokeStyle = 'rgba(255,255,255,0.6)';
      bgCtx.lineWidth = 1.5;
      bgCtx.stroke();
      bgCtx.restore();
    }
  }

  /* ------------------------------- Particles ------------------------------ */
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
  let particles = [];

  function resizeFxCanvas() {
    if (!fxCanvas) return;
    fxCanvas.width = window.innerWidth;
    fxCanvas.height = window.innerHeight;
  }

  function spawnParticles(x, y, color, count) {
    if (!fxCanvas) return;
    for (let i = 0; i < (count || 14); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: color,
      });
    }
  }

  function fxLoop() {
    if (fxCtx && fxCanvas) {
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        fxCtx.globalAlpha = Math.max(p.life, 0);
        fxCtx.fillStyle = p.color;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        fxCtx.fill();
      }
      fxCtx.globalAlpha = 1;
    }
    requestAnimationFrame(fxLoop);
  }

  function spawnFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'score-add';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color || '#10b981';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  }

  function burstAt(el, color, text) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnParticles(x, y, color, 16);
    if (text) spawnFloatingText(x, y - 10, text, color);
  }

  /* ---------------------------- Screen Manager ---------------------------- */
  const screens = {
    boot: document.getElementById('screen-boot'),
    menu: document.getElementById('screen-menu'),
    game: document.getElementById('screen-game'),
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      if (!screens[key]) return;
      if (key === name) screens[key].classList.add('active');
      else screens[key].classList.remove('active');
    });
  }

  function showAchievementToast(title, desc) {
    const el = document.getElementById('achievement');
    document.getElementById('achievement-title').textContent = title;
    document.getElementById('achievement-desc').textContent = desc;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  /* ------------------------------ Menu Logic ------------------------------ */
  let selectedDifficulty = 'officer';

  function renderMenu() {
    document.getElementById('menu-high-score').textContent = save.highScore;
    document.getElementById('menu-best-cycles').textContent = save.bestCycles;
    document.getElementById('menu-missions').textContent = save.missionsCompleted;

    document.querySelectorAll('.difficulty-btn').forEach(function (btn) {
      const diff = btn.getAttribute('data-difficulty');
      const unlocked = save.unlockedDifficulty.indexOf(diff) !== -1;
      btn.classList.toggle('locked', !unlocked);
      btn.classList.toggle('selected', diff === selectedDifficulty && unlocked);
      const lockIcon = btn.querySelector('.lock-icon');
      if (lockIcon) lockIcon.classList.toggle('hidden', unlocked);
    });

    document.querySelectorAll('.diff-badge').forEach(function (el) {
      const diff = el.getAttribute('data-badge-for');
      const rank = save.badges ? save.badges[diff] : null;
      el.classList.remove('badge-bronze', 'badge-silver', 'badge-gold');
      if (rank) {
        el.classList.add('badge-' + rank);
        el.textContent = rank === 'gold' ? 'G' : rank === 'silver' ? 'S' : 'B';
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    renderAchievementsList();
  }

  function renderAchievementsList() {
    const list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = '';
    Object.keys(ACHIEVEMENTS).forEach(function (id) {
      const a = ACHIEVEMENTS[id];
      const unlocked = !!save.achievements[id];
      const row = document.createElement('div');
      row.className = 'achievement-row' + (unlocked ? ' unlocked' : '');
      const iconFile = unlocked ? 'trophy.png' : 'lock.png';
      row.innerHTML =
        '<img class="achievement-row-icon emoji" src="assets/images/ui/emoji/' + iconFile + '" alt="">' +
        '<div><div class="achievement-row-title">' + a.title + '</div>' +
        '<div class="achievement-row-desc">' + a.desc + '</div></div>';
      list.appendChild(row);
    });
  }

  function selectDifficulty(diff) {
    if (save.unlockedDifficulty.indexOf(diff) === -1) {
      playWarningSound();
      return;
    }
    selectedDifficulty = diff;
    playClickSound();
    renderMenu();
  }

  /* ------------------------------ DOM Elements ----------------------------- */
  const elements = {
    score: document.getElementById('score'),
    cycles: document.getElementById('cycles'),
    totalMass: document.getElementById('total-mass'),
    missionTimer: document.getElementById('mission-timer'),
    crewStatus: document.getElementById('crew-status'),
    logPanel: document.getElementById('log-panel'),
    gameOverScreen: document.getElementById('game-over-screen'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameOverMessage: document.getElementById('game-over-message'),
    finalScore: document.getElementById('final-score'),
    finalCycles: document.getElementById('final-cycles'),
    finalTime: document.getElementById('final-time'),
    finalBest: document.getElementById('final-best'),
    efficiencyIndicator: document.getElementById('efficiency-indicator'),
    recycleWaterBtn: document.getElementById('recycle-water-btn'),
    recycleAirBtn: document.getElementById('recycle-air-btn'),
    waterBar: document.getElementById('water-bar'),
    waterMass: document.getElementById('water-mass'),
    oxygenBar: document.getElementById('oxygen-bar'),
    oxygenMass: document.getElementById('oxygen-mass'),
    wastewaterBar: document.getElementById('wastewater-bar'),
    wastewaterMass: document.getElementById('wastewater-mass'),
    co2Bar: document.getElementById('co2-bar'),
    co2Mass: document.getElementById('co2-mass'),
    solidWasteBar: document.getElementById('solid-waste-bar'),
    solidWasteMass: document.getElementById('solid-waste-mass'),
    waterTankContainer: document.getElementById('water-tank-container'),
    oxygenTankContainer: document.getElementById('oxygen-tank-container'),
    difficultyLabel: document.getElementById('hud-difficulty-label'),
    pauseOverlay: document.getElementById('pause-overlay'),
    morale: [
      document.getElementById('morale-1'),
      document.getElementById('morale-2'),
      document.getElementById('morale-3'),
    ],
    phaseLabel: document.getElementById('phase-label'),
    objectivePanel: document.getElementById('objective-panel'),
    objectiveText: document.getElementById('objective-text'),
    objectiveTimerFill: document.getElementById('objective-timer-fill'),
    decisionBanner: document.getElementById('decision-banner'),
    decisionText: document.getElementById('decision-text'),
    decisionChoiceA: document.getElementById('decision-choice-a'),
    decisionChoiceB: document.getElementById('decision-choice-b'),
    decisionTimerFill: document.getElementById('decision-timer-fill'),
    waterCooldownLabel: document.getElementById('water-cooldown-label'),
    airCooldownLabel: document.getElementById('air-cooldown-label'),
    star1: document.getElementById('star-1'),
    star2: document.getElementById('star-2'),
    star3: document.getElementById('star-3'),
    gameOverBadge: document.getElementById('game-over-badge'),
    finalObjectives: document.getElementById('final-objectives'),
  };

  /* ------------------------------ Game State ------------------------------- */
  let gameState = null;
  let loopHandle = null;

  function newGameState(diffKey) {
    const cfg = DIFFICULTIES[diffKey];
    return {
      diffKey: diffKey,
      cfg: cfg,
      score: 0,
      cycles: 0,
      timeLeft: cfg.time,
      missionTime: cfg.time,
      water: 100.0,
      oxygen: 100.0,
      wastewater: 10.0,
      co2: 10.0,
      solidWaste: 10.0,
      maxCapacity: cfg.maxCapacity,
      gameRunning: true,
      paused: false,
      event: null,
      eventTime: 0,
      bonusesTotal: 0,
      bonusesCollected: 0,
      phase: 1,
      phaseMultiplier: 1,
      objective: null,
      objectivesCompletedThisMission: 0,
      nextObjectiveDelay: 15,
      decisionEvent: null,
      waterCooldown: 0,
      airCooldown: 0,
      airOffline: false,
      balanceStreakSeconds: 0,
    };
  }

  function logMessage(message, type) {
    type = type || 'info';
    const colorMap = {
      info: 'text-slate-500',
      success: 'text-green-600',
      warning: 'text-amber-600',
      danger: 'text-red-500',
    };
    const entry = document.createElement('p');
    entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
    entry.className = colorMap[type];
    elements.logPanel.prepend(entry);
  }

  // Shows a short educational note the first time (ever) a given learning
  // moment happens, then never again — tracked permanently in save data.
  function showTip(id, message) {
    if (save.seenTips[id]) return;
    save.seenTips[id] = true;
    persistSave();
    const entry = document.createElement('p');
    entry.textContent = message;
    entry.className = 'text-tip';
    elements.logPanel.prepend(entry);
  }

  function moraleForLevel(level) {
    // level: 0 = healthy, 1 = warning, 2 = danger
    return level === 2 ? 'assets/images/ui/emoji/face_scared.png' : level === 1 ? 'assets/images/ui/emoji/face_worried.png' : 'assets/images/ui/emoji/face_happy.png';
  }

  function updateUI() {
    elements.score.textContent = gameState.score;
    elements.cycles.textContent = gameState.cycles;
    const totalMass = gameState.water + gameState.oxygen + gameState.wastewater + gameState.co2 + gameState.solidWaste;
    elements.totalMass.textContent = totalMass.toFixed(2) + ' kg';
    elements.waterMass.textContent = gameState.water.toFixed(2) + ' kg';
    elements.oxygenMass.textContent = gameState.oxygen.toFixed(2) + ' kg';
    elements.wastewaterMass.textContent = gameState.wastewater.toFixed(2) + ' kg';
    elements.co2Mass.textContent = gameState.co2.toFixed(2) + ' kg';
    elements.solidWasteMass.textContent = gameState.solidWaste.toFixed(2) + ' kg';
    elements.waterBar.style.height = ((gameState.water / gameState.maxCapacity) * 100) + '%';
    elements.oxygenBar.style.height = ((gameState.oxygen / gameState.maxCapacity) * 100) + '%';
    elements.wastewaterBar.style.height = ((gameState.wastewater / gameState.maxCapacity) * 100) + '%';
    elements.co2Bar.style.height = ((gameState.co2 / gameState.maxCapacity) * 100) + '%';
    elements.solidWasteBar.style.height = ((gameState.solidWaste / gameState.maxCapacity) * 100) + '%';

    const avgFill = ((gameState.water + gameState.oxygen) / (2 * gameState.maxCapacity)) * 100;
    elements.efficiencyIndicator.style.left = Math.max(0, Math.min(100, avgFill)) + '%';

    let level = 0;
    if (gameState.water < 20 || gameState.oxygen < 20) {
      level = 2;
      elements.crewStatus.textContent = 'DANGER';
      elements.crewStatus.classList.add('text-red-500', 'warning-flash');
      elements.crewStatus.classList.remove('text-green-600', 'text-amber-600');
    } else if (gameState.water < 50 || gameState.oxygen < 50) {
      level = 1;
      elements.crewStatus.textContent = 'WARNING';
      elements.crewStatus.classList.add('text-amber-600');
      elements.crewStatus.classList.remove('text-green-600', 'text-red-500', 'warning-flash');
    } else {
      elements.crewStatus.textContent = 'HEALTHY';
      elements.crewStatus.classList.add('text-green-600');
      elements.crewStatus.classList.remove('text-amber-600', 'text-red-500', 'warning-flash');
    }
    const moraleImg = moraleForLevel(level);
    elements.morale.forEach(function (m) { if (m) m.src = moraleImg; });

    const waterPct = (gameState.water / gameState.maxCapacity) * 100;
    const oxygenPct = (gameState.oxygen / gameState.maxCapacity) * 100;
    elements.recycleWaterBtn.classList.toggle('priority-glow', waterPct < oxygenPct - 8 && waterPct < 55);
    elements.recycleAirBtn.classList.toggle('priority-glow', oxygenPct < waterPct - 8 && oxygenPct < 55);

    if (level === 2) {
      screens.game.classList.add('danger-glow');
    } else {
      screens.game.classList.remove('danger-glow');
    }
    setMusicTension(level === 2);

    if (gameState.score >= 1000) unlockAchievement('score_1000');
  }

  function recycleWater(evt) {
    if (gameState.waterCooldown > 0) { playWarningSound(); return; }
    playClickSound();
    const recycleAmount = 20.0, efficiency = 0.9;
    if (gameState.wastewater >= recycleAmount) {
      const waterPct = (gameState.water / gameState.maxCapacity) * 100;
      const oxygenPct = (gameState.oxygen / gameState.maxCapacity) * 100;
      const wasPriority = waterPct < oxygenPct - 8;
      gameState.wastewater -= recycleAmount;
      const recoveredWater = recycleAmount * efficiency;
      const newSolidWaste = recycleAmount * (1 - efficiency);
      gameState.water = Math.min(gameState.maxCapacity, gameState.water + recoveredWater);
      gameState.solidWaste = Math.min(gameState.maxCapacity, gameState.solidWaste + newSolidWaste);
      let gained = 100;
      if (wasPriority) gained += 50;
      gameState.score += gained;
      gameState.cycles++;
      gameState.waterCooldown = 3;
      logMessage('Purified ' + recoveredWater.toFixed(2) + 'kg of H₂O.' + (wasPriority ? ' Priority bonus +50!' : ''), 'success');
      playSuccessSound();
      if (evt && evt.currentTarget) burstAt(evt.currentTarget, '#60a5fa', '+' + gained);
      unlockAchievement('first_cycle');
      showTip('mass_conservation', "TIP: Notice the Total Station Mass didn't change — matter converted form, but nothing was created or destroyed. That's the Law of Conservation of Mass in action.");
      if (wasPriority) showTip('priority_bonus', 'TIP: Recycling whichever resource is more critical right now earns a Priority Bonus — check the station status before you tap.');
      if (gameState.objective && gameState.objective.type === 'cycle_streak') {
        gameState.objective.progress++;
        renderObjective();
        if (checkObjectiveComplete()) completeObjective();
      }
      refreshProcessorButtons();
      updateUI();
    } else {
      logMessage('Not enough wastewater to purify.', 'warning');
      playWarningSound();
    }
  }

  function recycleAir(evt) {
    if (gameState.airCooldown > 0 || gameState.airOffline) { playWarningSound(); return; }
    playClickSound();
    const recycleAmount = 20.0, efficiency = 0.85;
    if (gameState.co2 >= recycleAmount) {
      const waterPct = (gameState.water / gameState.maxCapacity) * 100;
      const oxygenPct = (gameState.oxygen / gameState.maxCapacity) * 100;
      const wasPriority = oxygenPct < waterPct - 8;
      gameState.co2 -= recycleAmount;
      const recoveredOxygen = recycleAmount * efficiency;
      const newSolidWaste = recycleAmount * (1 - efficiency);
      gameState.oxygen = Math.min(gameState.maxCapacity, gameState.oxygen + recoveredOxygen);
      gameState.solidWaste = Math.min(gameState.maxCapacity, gameState.solidWaste + newSolidWaste);
      let gained = 120;
      if (wasPriority) gained += 50;
      gameState.score += gained;
      gameState.cycles++;
      gameState.airCooldown = 3;
      logMessage('Revitalized air, producing ' + recoveredOxygen.toFixed(2) + 'kg of O₂.' + (wasPriority ? ' Priority bonus +50!' : ''), 'success');
      playSuccessSound();
      if (evt && evt.currentTarget) burstAt(evt.currentTarget, '#4ade80', '+' + gained);
      unlockAchievement('first_cycle');
      showTip('mass_conservation', "TIP: Notice the Total Station Mass didn't change — matter converted form, but nothing was created or destroyed. That's the Law of Conservation of Mass in action.");
      if (wasPriority) showTip('priority_bonus', 'TIP: Recycling whichever resource is more critical right now earns a Priority Bonus — check the station status before you tap.');
      if (gameState.objective && gameState.objective.type === 'cycle_streak') {
        gameState.objective.progress++;
        renderObjective();
        if (checkObjectiveComplete()) completeObjective();
      }
      refreshProcessorButtons();
      updateUI();
    } else {
      logMessage('Not enough CO₂ to revitalize.', 'warning');
      playWarningSound();
    }
  }

  function endGame(isVictory) {
    if (!gameState.gameRunning) return;
    gameState.gameRunning = false;
    clearInterval(loopHandle);
    if (elements.objectivePanel) elements.objectivePanel.classList.add('hidden');
    endDecisionEvent();
    const timeSurvived = gameState.missionTime - gameState.timeLeft;
    const minutes = Math.floor(timeSurvived / 60);
    const seconds = timeSurvived % 60;

    if (gameState.score > save.highScore) save.highScore = gameState.score;
    if (gameState.cycles > save.bestCycles) save.bestCycles = gameState.cycles;

    let stars = 0;
    if (isVictory) {
      stars = computeStars();
      applyBadge(gameState.diffKey, stars);
    }
    renderStars(stars);

    if (isVictory) {
      save.missionsCompleted++;
      if (save.unlockedDifficulty.indexOf('commander') === -1 &&
          (gameState.diffKey === 'officer' || gameState.diffKey === 'commander')) {
        save.unlockedDifficulty.push('commander');
        unlockAchievement('commander_unlocked');
      }
      unlockAchievement('survivor');
      if (gameState.water >= gameState.maxCapacity * 0.8 && gameState.oxygen >= gameState.maxCapacity * 0.8) {
        unlockAchievement('well_stocked');
      }
      if (gameState.bonusesTotal > 0 && gameState.bonusesCollected >= gameState.bonusesTotal) {
        unlockAchievement('bonus_hunter');
      }
      elements.gameOverTitle.textContent = 'MISSION SUCCESS';
      elements.gameOverTitle.classList.add('text-green-600');
      elements.gameOverTitle.classList.remove('text-red-500');
      elements.gameOverMessage.textContent = 'You survived! The crew is safe.';
    } else {
      elements.gameOverTitle.textContent = 'MISSION FAILED';
      elements.gameOverTitle.classList.add('text-red-500');
      elements.gameOverTitle.classList.remove('text-green-600');
      elements.gameOverMessage.textContent = 'Critical resources depleted. The mission is lost.';
      playWarningSound();
    }
    persistSave();

    elements.finalScore.textContent = gameState.score;
    elements.finalCycles.textContent = gameState.cycles;
    elements.finalTime.textContent = minutes + ':' + seconds.toString().padStart(2, '0');
    if (elements.finalBest) elements.finalBest.textContent = save.highScore;
    if (elements.finalObjectives) elements.finalObjectives.textContent = gameState.objectivesCompletedThisMission;
    elements.gameOverScreen.style.display = 'flex';
  }

  /* ------------------------------ Event System ------------------------------ */
  function triggerRandomEvent() {
    if (gameState.event) return;
    const random = Math.random();
    if (random < gameState.cfg.eventChance * gameState.phaseMultiplier) {
      const eventType = Math.floor(Math.random() * 4);
      switch (eventType) {
        case 0:
          gameState.event = 'solar_flare';
          gameState.eventTime = 15;
          logMessage('WARNING: Solar flare detected! Life support consumption is doubled.', 'danger');
          playAlarmSound();
          break;
        case 1:
          gameState.event = 'micrometeoroid';
          gameState.eventTime = 20;
          logMessage('ALERT: Micrometeoroid strike! H₂O tank is leaking!', 'danger');
          playAlarmSound();
          break;
        case 2:
          gameState.event = 'system_malfunction';
          gameState.eventTime = 20;
          gameState.airOffline = true;
          refreshProcessorButtons();
          logMessage('CRITICAL: Air revitalization system offline!', 'danger');
          playAlarmSound();
          break;
        case 3:
          gameState.event = 'supply_pod';
          gameState.water = Math.min(gameState.maxCapacity, gameState.water + 30);
          gameState.oxygen = Math.min(gameState.maxCapacity, gameState.oxygen + 30);
          logMessage('Supply pod has arrived! Water and Oxygen replenished.', 'success');
          playSuccessSound();
          updateUI();
          break;
      }
    }
  }

  function handleEvents() {
    if (!gameState.event) return;
    gameState.eventTime--;
    if (gameState.event === 'micrometeoroid') {
      gameState.water -= 0.5;
      elements.waterTankContainer.classList.add('danger-pulse');
    }
    if (gameState.eventTime <= 0) {
      logMessage('Event ended: ' + gameState.event.replace('_', ' '), 'info');
      if (gameState.event === 'micrometeoroid') {
        elements.waterTankContainer.classList.remove('danger-pulse');
      } else if (gameState.event === 'system_malfunction') {
        gameState.airOffline = false;
        refreshProcessorButtons();
      }
      gameState.event = null;
    }
  }

  /* ------------------------------ Phase Escalation --------------------------- */
  // Every mission ramps through 3 phases based on elapsed time — later phases
  // increase consumption rates and event frequency, simulating a station
  // under mounting strain instead of one flat difficulty the whole run.
  function updatePhase() {
    const elapsedFrac = 1 - (gameState.timeLeft / gameState.missionTime);
    let newPhase = 1;
    if (elapsedFrac >= 0.66) newPhase = 3;
    else if (elapsedFrac >= 0.33) newPhase = 2;
    if (newPhase === gameState.phase) return;
    gameState.phase = newPhase;
    gameState.phaseMultiplier = newPhase === 3 ? 1.6 : newPhase === 2 ? 1.3 : 1;
    if (elements.phaseLabel) {
      elements.phaseLabel.textContent = String(newPhase);
      elements.phaseLabel.classList.add('phase-bump');
      setTimeout(function () { if (elements.phaseLabel) elements.phaseLabel.classList.remove('phase-bump'); }, 650);
    }
    if (newPhase > 1) {
      logMessage('PHASE ' + newPhase + ': station demands are increasing.', 'danger');
      showAchievementToast('Phase ' + newPhase, 'Resource demand and emergency frequency just went up.');
      playAlarmSound();
      if (newPhase === 3) unlockAchievement('phase_three_survivor');
      showTip('phase_explainer', 'TIP: Later phases simulate a station under growing strain — more crew activity and aging systems mean faster resource use. Stay ahead of it.');
    }
  }

  /* ----------------------------- Mission Objectives --------------------------- */
  // Rotating directed sub-goals that reward the player for something more
  // specific than "keep clicking the same button" — reinforces strategic
  // resource management instead of pure repetition.
  function pickObjective() {
    const pool = ['water_target', 'oxygen_target', 'cycle_streak', 'hold_balance'];
    const type = pool[Math.floor(Math.random() * pool.length)];
    const obj = { type: type, progress: 0, target: 0, need: 0 };
    if (type === 'water_target') {
      obj.target = Math.min(gameState.maxCapacity, Math.round(gameState.water + 30 + Math.random() * 25));
      obj.totalSeconds = 40;
      obj.text = 'Raise H₂O to ' + obj.target + 'kg';
    } else if (type === 'oxygen_target') {
      obj.target = Math.min(gameState.maxCapacity, Math.round(gameState.oxygen + 30 + Math.random() * 25));
      obj.totalSeconds = 40;
      obj.text = 'Raise O₂ to ' + obj.target + 'kg';
    } else if (type === 'cycle_streak') {
      obj.need = 3;
      obj.totalSeconds = 45;
      obj.text = 'Complete ' + obj.need + ' recycle actions';
    } else {
      obj.need = 15;
      obj.totalSeconds = 35;
      obj.text = 'Keep efficiency above 60% for ' + obj.need + 's';
    }
    obj.secondsLeft = obj.totalSeconds;
    return obj;
  }

  function renderObjective() {
    const o = gameState.objective;
    if (!o || !elements.objectiveText) return;
    elements.objectiveText.textContent = o.text + (o.need ? ' (' + o.progress + '/' + o.need + ')' : '');
    if (elements.objectiveTimerFill) {
      elements.objectiveTimerFill.style.width = Math.max(0, (o.secondsLeft / o.totalSeconds) * 100) + '%';
    }
  }

  function checkObjectiveComplete() {
    const o = gameState.objective;
    if (!o) return false;
    if (o.type === 'water_target') return gameState.water >= o.target;
    if (o.type === 'oxygen_target') return gameState.oxygen >= o.target;
    return o.progress >= o.need;
  }

  function startNextObjective() {
    gameState.objective = pickObjective();
    if (elements.objectivePanel) {
      elements.objectivePanel.classList.remove('hidden', 'objective-complete');
    }
    renderObjective();
  }

  function completeObjective() {
    gameState.objective = null;
    gameState.objectivesCompletedThisMission++;
    const bonus = 300;
    gameState.score += bonus;
    logMessage('Objective complete! +' + bonus + ' bonus score.', 'success');
    showAchievementToast('Objective Complete', '+' + bonus + ' bonus score');
    playBonusSound();
    if (elements.objectivePanel) {
      elements.objectivePanel.classList.add('objective-complete', 'objective-flash');
      setTimeout(function () { if (elements.objectivePanel) elements.objectivePanel.classList.remove('objective-flash'); }, 650);
      setTimeout(function () { if (elements.objectivePanel) elements.objectivePanel.classList.add('hidden'); }, 1500);
    }
    if (gameState.objectivesCompletedThisMission >= 3) unlockAchievement('objective_ace');
    gameState.nextObjectiveDelay = 8 + Math.floor(Math.random() * 6);
    updateUI();
  }

  function expireObjective() {
    if (gameState.objective) logMessage('Objective expired: ' + gameState.objective.text, 'warning');
    gameState.objective = null;
    if (elements.objectivePanel) elements.objectivePanel.classList.add('hidden');
    gameState.nextObjectiveDelay = 8 + Math.floor(Math.random() * 6);
  }

  function tickObjective() {
    const o = gameState.objective;
    if (!o) {
      if (gameState.nextObjectiveDelay > 0) gameState.nextObjectiveDelay--;
      else if (gameState.timeLeft > 20) startNextObjective();
      return;
    }
    o.secondsLeft--;
    if (o.type === 'hold_balance') {
      const avgFill = ((gameState.water + gameState.oxygen) / (2 * gameState.maxCapacity)) * 100;
      if (avgFill >= 60) o.progress++;
    }
    renderObjective();
    if (checkObjectiveComplete()) { completeObjective(); return; }
    if (o.secondsLeft <= 0) expireObjective();
  }

  /* ------------------------------ Quick-Decision Events ------------------------ */
  // Short, timed 2-choice events layered on top of the existing event system —
  // require a fast read of current station status rather than a scripted
  // response, and reward (or lightly punish) the outcome immediately.
  const DECISION_EVENTS = [
    {
      text: 'Meteor shower incoming! Divert shielding power to protect one tank.',
      choiceA: 'Shield Water', choiceB: 'Shield Oxygen',
      resolve: function (choice) {
        if (choice === 'a') { gameState.water = Math.min(gameState.maxCapacity, gameState.water + 6); logMessage('Water tank shielded in time.', 'success'); }
        else { gameState.oxygen = Math.min(gameState.maxCapacity, gameState.oxygen + 6); logMessage('Oxygen tank shielded in time.', 'success'); }
      },
      timeout: function () {
        gameState.water = Math.max(0, gameState.water - 8);
        gameState.oxygen = Math.max(0, gameState.oxygen - 8);
        logMessage('No shields raised in time — both tanks took a hit.', 'danger');
      },
    },
    {
      text: 'Power surge! Reroute power to Recycling or Life Support?',
      choiceA: 'Recycling', choiceB: 'Life Support',
      resolve: function (choice) {
        if (choice === 'a') { gameState.score += 150; logMessage('Recycling boosted — +150 score.', 'success'); }
        else {
          gameState.water = Math.min(gameState.maxCapacity, gameState.water + 10);
          gameState.oxygen = Math.min(gameState.maxCapacity, gameState.oxygen + 10);
          logMessage('Life support stabilized — resources topped up.', 'success');
        }
      },
      timeout: function () { logMessage('Power surge dissipated with no benefit — you hesitated.', 'warning'); },
    },
  ];

  function maybeTriggerDecisionEvent() {
    if (gameState.decisionEvent) return;
    if (Math.random() >= (0.02 * gameState.phaseMultiplier)) return;
    const def = DECISION_EVENTS[Math.floor(Math.random() * DECISION_EVENTS.length)];
    gameState.decisionEvent = { def: def, secondsLeft: 7, totalSeconds: 7 };
    if (elements.decisionText) elements.decisionText.textContent = def.text;
    if (elements.decisionChoiceA) elements.decisionChoiceA.textContent = def.choiceA;
    if (elements.decisionChoiceB) elements.decisionChoiceB.textContent = def.choiceB;
    if (elements.decisionTimerFill) elements.decisionTimerFill.style.width = '100%';
    if (elements.decisionBanner) elements.decisionBanner.classList.add('show');
    playWarningSound();
  }

  function endDecisionEvent() {
    gameState.decisionEvent = null;
    if (elements.decisionBanner) elements.decisionBanner.classList.remove('show');
  }

  function tickDecisionEvent() {
    const d = gameState.decisionEvent;
    if (!d) return;
    d.secondsLeft--;
    if (elements.decisionTimerFill) elements.decisionTimerFill.style.width = Math.max(0, (d.secondsLeft / d.totalSeconds) * 100) + '%';
    if (d.secondsLeft <= 0) {
      d.def.timeout();
      endDecisionEvent();
      updateUI();
    }
  }

  function resolveDecisionEvent(choice) {
    const d = gameState.decisionEvent;
    if (!d) return;
    d.def.resolve(choice);
    save.decisionsHandled = (save.decisionsHandled || 0) + 1;
    persistSave();
    unlockAchievement('quick_thinker');
    if (save.decisionsHandled >= 5) unlockAchievement('decisive_commander');
    playSuccessSound();
    endDecisionEvent();
    updateUI();
  }

  /* ------------------------- Cooldowns & Priority Highlight -------------------- */
  // Processor buttons need a short cooldown after use (can't spam both at
  // once), and whichever resource is meaningfully more urgent gets a visual
  // nudge — together these force an actual prioritization choice instead of
  // clicking whatever is available.
  function refreshProcessorButtons() {
    const waterDisabled = gameState.waterCooldown > 0;
    const airDisabled = gameState.airCooldown > 0 || gameState.airOffline;
    elements.recycleWaterBtn.disabled = waterDisabled;
    elements.recycleAirBtn.disabled = airDisabled;
    if (elements.waterCooldownLabel) {
      if (gameState.waterCooldown > 0) { elements.waterCooldownLabel.textContent = gameState.waterCooldown + 's'; elements.waterCooldownLabel.classList.remove('hidden'); }
      else elements.waterCooldownLabel.classList.add('hidden');
    }
    if (elements.airCooldownLabel) {
      if (gameState.airCooldown > 0) { elements.airCooldownLabel.textContent = gameState.airCooldown + 's'; elements.airCooldownLabel.classList.remove('hidden'); }
      else elements.airCooldownLabel.classList.add('hidden');
    }
  }

  function tickCooldowns() {
    if (gameState.waterCooldown > 0) gameState.waterCooldown--;
    if (gameState.airCooldown > 0) gameState.airCooldown--;
    refreshProcessorButtons();
  }

  function tickBalanceStreak() {
    const waterPct = (gameState.water / gameState.maxCapacity) * 100;
    const oxygenPct = (gameState.oxygen / gameState.maxCapacity) * 100;
    const inBand = waterPct >= 40 && waterPct <= 90 && oxygenPct >= 40 && oxygenPct <= 90;
    if (inBand) {
      gameState.balanceStreakSeconds++;
      if (gameState.balanceStreakSeconds % 10 === 0) {
        gameState.score += 15;
        logMessage('Balance bonus: +15 score for stable resource levels.', 'success');
        if (gameState.balanceStreakSeconds === 10) showTip('balance_bonus', 'TIP: Keeping both tanks in a healthy middle range (not maxed, not empty) earns steady Balance Bonuses over time.');
      }
      if (gameState.balanceStreakSeconds >= 60) unlockAchievement('balance_master');
    } else {
      gameState.balanceStreakSeconds = 0;
    }
  }

  /* ------------------------------ Stars & Badges ------------------------------- */
  function computeStars() {
    const thresholds = gameState.cfg.starThresholds || [500, 1000, 1600];
    let stars = 0;
    for (let i = 0; i < thresholds.length; i++) if (gameState.score >= thresholds[i]) stars = i + 1;
    return stars;
  }

  function applyBadge(diffKey, stars) {
    const rank = stars >= 3 ? 'gold' : stars === 2 ? 'silver' : stars === 1 ? 'bronze' : null;
    if (!rank) return;
    const order = { bronze: 1, silver: 2, gold: 3 };
    const current = save.badges[diffKey];
    if (!current || order[rank] > order[current]) {
      save.badges[diffKey] = rank;
      if (rank === 'gold' && diffKey === 'commander') unlockAchievement('platinum_commander');
    }
  }

  function renderStars(count) {
    [elements.star1, elements.star2, elements.star3].forEach(function (el, i) {
      if (el) el.classList.toggle('earned', i < count);
    });
    if (elements.gameOverBadge) {
      if (count > 0) {
        const rank = count >= 3 ? 'GOLD RATING' : count === 2 ? 'SILVER RATING' : 'BRONZE RATING';
        elements.gameOverBadge.textContent = rank;
        elements.gameOverBadge.classList.remove('hidden');
        elements.gameOverBadge.style.color = count >= 3 ? '#d97b00' : count === 2 ? '#5b7690' : '#a5622f';
      } else {
        elements.gameOverBadge.classList.add('hidden');
      }
    }
  }

  /* ------------------------------- Main Loop -------------------------------- */
  function gameLoop() {
    if (!gameState.gameRunning || gameState.paused) return;

    gameState.timeLeft--;
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    elements.missionTimer.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');

    updatePhase();
    if (gameState.timeLeft % 10 === 0) triggerRandomEvent();
    handleEvents();
    tickDecisionEvent();
    maybeTriggerDecisionEvent();

    let waterConsumption = gameState.cfg.waterConsumption * gameState.phaseMultiplier;
    let oxygenConsumption = gameState.cfg.oxygenConsumption * gameState.phaseMultiplier;
    if (gameState.event === 'solar_flare') {
      waterConsumption *= 2;
      oxygenConsumption *= 2;
    }
    gameState.water -= waterConsumption;
    gameState.oxygen -= oxygenConsumption;

    gameState.wastewater += gameState.cfg.wasteWaterGen * gameState.phaseMultiplier;
    gameState.co2 += gameState.cfg.co2Gen * gameState.phaseMultiplier;

    tickObjective();
    tickCooldowns();
    tickBalanceStreak();
    updateUI();

    if (gameState.water <= 0 || gameState.oxygen <= 0) {
      gameState.water = 0;
      gameState.oxygen = 0;
      updateUI();
      endGame(false);
    }
    if (gameState.timeLeft <= 0) {
      endGame(true);
    }
  }

  /* --------------------------- Bonus Collectibles ---------------------------- */
  function collectBonus(el) {
    initAudio();
    if (!gameState || !gameState.gameRunning || gameState.paused) return;
    if (el.classList.contains('collected')) return;
    el.classList.add('collected');
    playBonusSound();
    gameState.score += 500;
    gameState.bonusesCollected++;
    logMessage('Bonus collected: +500 score!', 'success');
    burstAt(el, '#fbbf24', '+500');
    updateUI();
    el.style.display = 'none';
  }

  /* -------------------------------- Pause -------------------------------- */
  function pauseGame() {
    if (!gameState || !gameState.gameRunning) return;
    gameState.paused = true;
    elements.pauseOverlay.classList.add('show');
  }

  function resumeGame() {
    if (!gameState) return;
    gameState.paused = false;
    elements.pauseOverlay.classList.remove('show');
  }

  /* ------------------------------ Mission Flow ------------------------------ */
  function startMission() {
    playClickSound();
    gameState = newGameState(selectedDifficulty);
    gameState.bonusesTotal = document.querySelectorAll('.astronaut').length;
    document.querySelectorAll('.astronaut').forEach(function (el) {
      el.classList.remove('collected');
      el.style.display = '';
    });
    elements.logPanel.innerHTML = '';
    elements.gameOverScreen.style.display = 'none';
    elements.pauseOverlay.classList.remove('show');
    elements.recycleWaterBtn.classList.remove('priority-glow');
    elements.recycleAirBtn.classList.remove('priority-glow');
    if (elements.objectivePanel) elements.objectivePanel.classList.add('hidden');
    endDecisionEvent();
    if (elements.phaseLabel) elements.phaseLabel.textContent = '1';
    refreshProcessorButtons();
    if (elements.difficultyLabel) elements.difficultyLabel.textContent = gameState.cfg.label;
    logMessage('Recycling systems online. Good luck, Commander.');
    updateUI();
    showScreen('game');
    clearInterval(loopHandle);
    loopHandle = setInterval(gameLoop, 1000);
  }

  function returnToMenu() {
    playClickSound();
    if (loopHandle) clearInterval(loopHandle);
    if (gameState) gameState.gameRunning = false;
    elements.pauseOverlay.classList.remove('show');
    renderMenu();
    showScreen('menu');
  }

  /* -------------------------------- Input --------------------------------- */
  function bindInput() {
    elements.recycleWaterBtn.addEventListener('click', recycleWater);
    elements.recycleAirBtn.addEventListener('click', recycleAir);

    document.querySelectorAll('.astronaut').forEach(function (el) {
      el.addEventListener('click', function () { collectBonus(el); });
    });

    document.getElementById('btn-start').addEventListener('click', startMission);
    document.getElementById('btn-boot-skip').addEventListener('click', function () {
      showScreen('menu'); renderMenu();
    });

    document.querySelectorAll('.difficulty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { selectDifficulty(btn.getAttribute('data-difficulty')); });
    });

    if (elements.decisionChoiceA) elements.decisionChoiceA.addEventListener('click', function () { resolveDecisionEvent('a'); });
    if (elements.decisionChoiceB) elements.decisionChoiceB.addEventListener('click', function () { resolveDecisionEvent('b'); });

    document.querySelectorAll('.audio-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggleAudio);
    });
    document.querySelectorAll('.music-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggleMusic);
    });

    const toggleSfx = document.getElementById('toggle-sfx');
    if (toggleSfx) toggleSfx.addEventListener('click', toggleAudio);
    const toggleMusicSwitch = document.getElementById('toggle-music');
    if (toggleMusicSwitch) toggleMusicSwitch.addEventListener('click', toggleMusic);

    const settingsBtn = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('modal-settings');
    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', function () { refreshAudioUI(); settingsModal.classList.add('show'); });
      settingsModal.querySelector('.modal-close').addEventListener('click', function () {
        settingsModal.classList.remove('show');
      });
    }

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.addEventListener('click', pauseGame);
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.addEventListener('click', resumeGame);
    const btnPauseQuit = document.getElementById('btn-pause-quit');
    if (btnPauseQuit) btnPauseQuit.addEventListener('click', function () {
      gameState.gameRunning = false;
      clearInterval(loopHandle);
      returnToMenu();
    });
    const btnPauseRestart = document.getElementById('btn-pause-restart');
    if (btnPauseRestart) btnPauseRestart.addEventListener('click', function () {
      gameState.gameRunning = false;
      clearInterval(loopHandle);
      startMission();
    });

    const btnRetry = document.getElementById('btn-retry');
    if (btnRetry) btnRetry.addEventListener('click', startMission);
    const btnMainMenu = document.getElementById('btn-main-menu');
    if (btnMainMenu) btnMainMenu.addEventListener('click', function () {
      elements.gameOverScreen.style.display = 'none';
      returnToMenu();
    });

    const briefingBtn = document.getElementById('btn-briefing');
    const briefingModal = document.getElementById('modal-briefing');
    if (briefingBtn && briefingModal) {
      briefingBtn.addEventListener('click', function () { briefingModal.classList.add('show'); });
      briefingModal.querySelector('.modal-close').addEventListener('click', function () {
        briefingModal.classList.remove('show');
      });
    }

    const achBtn = document.getElementById('btn-achievements');
    const achModal = document.getElementById('modal-achievements');
    if (achBtn && achModal) {
      achBtn.addEventListener('click', function () { renderAchievementsList(); achModal.classList.add('show'); });
      achModal.querySelector('.modal-close').addEventListener('click', function () {
        achModal.classList.remove('show');
      });
    }

    // Prevent iOS/Android pinch-zoom and double-tap zoom without blocking
    // normal single-touch button taps.
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('resize', function () {
      resizeBgCanvas();
      resizeFxCanvas();
    });
  }

  /* -------------------------------- Boot ---------------------------------- */
  function bootSequence() {
    const bar = document.getElementById('boot-progress');
    if (bar) {
      requestAnimationFrame(function () { bar.style.width = '100%'; });
    }
    setTimeout(function () {
      if (screens.boot.classList.contains('active')) {
        showScreen('menu');
        renderMenu();
      }
    }, 1600);
  }

  // Browsers block audio until a real user gesture. Music defaults to "on"
  // in the saved preferences, so start it the moment the player taps
  // anything for the first time (boot skip, a menu button, anywhere).
  function armMusicAutostart() {
    function handler() {
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('keydown', handler);
      if (musicEnabled) {
        initAudio();
        setMusicEnabled(true);
      }
    }
    document.addEventListener('pointerdown', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
  }

  /* -------------------------------- Init ----------------------------------- */
  function init() {
    initOptionalImages();
    initBackground();
    resizeFxCanvas();
    requestAnimationFrame(fxLoop);
    bindInput();
    refreshAudioUI();
    armMusicAutostart();
    showScreen('boot');
    bootSequence();
  }

  window.addEventListener('load', init);
})();
