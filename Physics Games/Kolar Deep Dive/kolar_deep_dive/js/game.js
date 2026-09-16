/* ==========================================================================
   ISRO MISSION: KOLAR DEEP DIVE
   Production build — p5.js game logic
   Core physics/collision formulas are preserved exactly from the original
   prototype. Everything else (menu flow, HUD skin, ambient background,
   particles, sound, save/progress, touch controls) is additive polish.
   ========================================================================== */

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const R = 6400;              // Earth radius in km (unchanged core constant)
const TARGET_DEPTH = 6400;   // Finish line (unchanged core constant)
const MAX_G_PIXELS = 0.8;    // Game-feel gravity scale (unchanged core constant)
const SAVE_KEY = 'kolarDeepDive_save_v1';
const SOUND_KEY = 'kolarDeepDive_sound_v1';

const LAYERS = [
    { key: 'crust',      name: 'CRUST',       startDepth: 0,    unlockAt: 0    },
    { key: 'mantle',     name: 'MANTLE',      startDepth: 35,   unlockAt: 35   },
    { key: 'outerCore',  name: 'OUTER CORE',  startDepth: 2900, unlockAt: 2900 },
    { key: 'innerCore',  name: 'INNER CORE',  startDepth: 5100, unlockAt: 5100 }
];

// Optional background art bands (matched to the layer thresholds above)
const BANDS = [
    { from: 0,    to: 35,   artKey: 'bgCrust' },
    { from: 35,   to: 2900, artKey: 'bgMantle' },
    { from: 2900, to: 5100, artKey: 'bgOuterCore' },
    { from: 5100, to: 6400, artKey: 'bgInnerCore' }
];

// ---------------------------------------------------------------------------
// ACHIEVEMENTS
// Derived entirely from existing save fields (no new save schema needed).
// Each has an optional badge icon with a graceful emoji fallback.
// ---------------------------------------------------------------------------
const ACHIEVEMENTS = [
    { id: 'first_drop',     name: 'First Drop',     desc: 'Complete your first mission',        icon: 'assets/images/ui/badges/first_drop.png',    fallback: '🪂', check: (s) => s.attempts >= 1 },
    { id: 'mantle_breach',  name: 'Mantle Breach',  desc: 'Reach the Mantle (35 km)',            icon: 'assets/images/ui/badges/mantle_breach.png', fallback: '🪨', check: (s) => !!s.unlocked.mantle },
    { id: 'outer_core',     name: 'Outer Core',     desc: 'Reach the Outer Core (2,900 km)',     icon: 'assets/images/ui/badges/outer_core.png',    fallback: '🌋', check: (s) => !!s.unlocked.outerCore },
    { id: 'inner_core',     name: 'Inner Core',     desc: 'Reach the Inner Core (5,100 km)',     icon: 'assets/images/ui/badges/inner_core.png',    fallback: '⚪', check: (s) => !!s.unlocked.innerCore },
    { id: 'core_master',    name: 'Core Master',    desc: 'Reach the center of the Earth',       icon: 'assets/images/ui/badges/core_master.png',   fallback: '🏆', check: (s) => s.wins >= 1 }
];

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let gameState = 'BOOT'; // BOOT, MENU, BRIEFING, LAYERSELECT, LOG, PLAYING, PAUSED, WON, CRASHED
let depth = 0, velocity = 0, probeX;
let obstacles = [], particles = [], explosionParticles = [], thrusterParticles = [];
let shockwaves = [], debris = [];
let flashAlpha = 0;
let crashAnimTimer = 0;
const CRASH_ANIM_FRAMES = 42; // ~0.7s at 60fps of "hit stop" before the result modal appears
let bgRocks = [], embers = [];
let distanceTraveled = 0;
let startDepth = 0;
let selectedLayerKey = 'crust';
let missionStartMillis = 0;
let screenShake = 0;
let save = null;
let soundOn = true;
let touchLeft = false, touchRight = false, touchThrust = false;
let idlePseudoDepth = 1600;

// ---------------------------------------------------------------------------
// OPTIONAL IMAGE ASSETS (graceful fallback to vector/canvas art if missing)
// ---------------------------------------------------------------------------
let ART = {};

// NOTE: this intentionally does NOT use p5's loadImage(). p5's loadImage()
// fetches the file via fetch()/XHR under the hood, which browsers (and most
// mobile WebViews) block for local file:// paths with a CORS error — so
// every custom asset would silently fail and fall back to vector art even
// when the file is present and correctly named. A plain `new Image()` with
// `.src` is a *declarative* resource load (same mechanism as <img src="">,
// <link>, or CSS background-image) and is NOT subject to that restriction,
// so it works identically whether the game is opened via file://, a local
// server, or bundled inside a WebView.
function safeLoad(path) {
    const holder = { img: null };
    const nativeImg = new Image();
    nativeImg.onload = () => { holder.img = nativeImg; };
    nativeImg.onerror = () => { holder.img = null; };
    nativeImg.src = path;
    return holder;
}

function preload() {
    ART.probe       = safeLoad('assets/images/characters/probe.png');
    ART.rock        = safeLoad('assets/images/obstacles/rock.png');
    ART.magma       = safeLoad('assets/images/obstacles/magma.png');
    ART.bgCrust     = safeLoad('assets/images/background/crust.png');
    ART.bgMantle    = safeLoad('assets/images/background/mantle.png');
    ART.bgOuterCore = safeLoad('assets/images/background/outer_core.png');
    ART.bgInnerCore = safeLoad('assets/images/background/inner_core.png');
}

function tryUIImage(path, onOk) {
    const test = new Image();
    test.onload = () => onOk(path);
    test.onerror = () => {};
    test.src = path;
}

// ---------------------------------------------------------------------------
// SAVE / PROGRESS SYSTEM (localStorage)
// ---------------------------------------------------------------------------
function defaultSave() {
    return {
        bestDepth: 0,
        attempts: 0,
        wins: 0,
        bestTime: null,
        unlocked: { crust: true, mantle: false, outerCore: false, innerCore: false }
    };
}

function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return Object.assign(defaultSave(), parsed, { unlocked: Object.assign(defaultSave().unlocked, parsed.unlocked || {}) });
        }
    } catch (e) { /* ignore corrupt storage */ }
    return defaultSave();
}

function persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
}

function loadSoundPref() {
    try {
        const v = localStorage.getItem(SOUND_KEY);
        return v === null ? true : v === '1';
    } catch (e) { return true; }
}
function persistSoundPref() {
    try { localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch (e) {}
}

// ---------------------------------------------------------------------------
// AUDIO (procedural WebAudio SFX — zero external files, fully offline)
// ---------------------------------------------------------------------------
let audioCtx = null;
function ensureAudio() {
    const hadCtx = !!audioCtx;
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    // Lazily kick off the ambient music loop the first time audio is
    // actually usable — this always happens from inside a real user gesture
    // (a button click/tap), which satisfies browsers' autoplay policies.
    if (audioCtx && !hadCtx) startMusic();
}

// ---------------------------------------------------------------------------
// BACKGROUND MUSIC — a procedural ambient loop (zero external audio files).
// A slow pad of two detuned low sine tones drifting between a handful of
// eerie root notes, plus a sparse higher arpeggio for movement. Runs
// continuously in the background across menu/gameplay/pause; the sound
// on/off toggle just fades its gain to 0 rather than tearing it down.
// ---------------------------------------------------------------------------
const MUSIC_NOTES = [55, 65.41, 73.42, 82.41]; // A1, C2, D2, E2 — low, moody
let musicStarted = false;
let musicGain = null;
let musicTimers = [];

function startMusic() {
    if (musicStarted || !audioCtx) return;
    musicStarted = true;
    musicGain = audioCtx.createGain();
    musicGain.gain.value = soundOn ? 0.06 : 0;
    musicGain.connect(audioCtx.destination);
    scheduleDrone();
    scheduleArp();
}

function setMusicVolume(v) {
    if (!musicGain || !audioCtx) return;
    musicGain.gain.setTargetAtTime(v, audioCtx.currentTime, 0.4);
}

function scheduleDrone() {
    if (!musicStarted) return;
    const note = MUSIC_NOTES[Math.floor(Math.random() * MUSIC_NOTES.length)];
    const dur = 6 + Math.random() * 4;
    [note, note * 1.006].forEach((f) => { // two barely-detuned tones = soft chorus
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 2);
        g.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        osc.connect(g); g.connect(musicGain);
        osc.start();
        osc.stop(audioCtx.currentTime + dur + 0.1);
    });
    musicTimers.push(setTimeout(scheduleDrone, (dur - 1.5) * 1000));
}

function scheduleArp() {
    if (!musicStarted) return;
    if (Math.random() < 0.55) {
        const note = MUSIC_NOTES[Math.floor(Math.random() * MUSIC_NOTES.length)] * 4;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = note;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
        osc.connect(g); g.connect(musicGain);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
    }
    musicTimers.push(setTimeout(scheduleArp, 1500 + Math.random() * 1500));
}
function beep(freq, dur, type, vol, delay) {
    if (!soundOn) return;
    ensureAudio();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.2, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.2));
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + (dur || 0.2) + 0.02);
}
function sfxClick() { beep(620, 0.07, 'square', 0.10); }
function sfxCrash() {
    beep(220, 0.08, 'square', 0.2);       // sharp crack transient
    beep(90, 0.35, 'sawtooth', 0.28, 0.02);
    beep(45, 0.5, 'square', 0.22, 0.07);  // low boom tail
}
function sfxWin() { [0, 1, 2, 3].forEach((i) => beep(440 + i * 130, 0.28, 'triangle', 0.16, i * 0.12)); }

let thrustOsc = null, thrustGain = null;
function thrustStart() {
    if (!soundOn) return;
    ensureAudio();
    if (!audioCtx || thrustOsc) return;
    thrustOsc = audioCtx.createOscillator();
    thrustGain = audioCtx.createGain();
    thrustOsc.type = 'sawtooth';
    thrustOsc.frequency.value = 85;
    thrustGain.gain.value = 0.0001;
    thrustOsc.connect(thrustGain); thrustGain.connect(audioCtx.destination);
    thrustOsc.start();
    thrustGain.gain.exponentialRampToValueAtTime(0.07, audioCtx.currentTime + 0.08);
}
function thrustStop() {
    if (thrustOsc) {
        try {
            thrustGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
            thrustOsc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {}
        thrustOsc = null; thrustGain = null;
    }
}

// ---------------------------------------------------------------------------
// DOM REFERENCES
// ---------------------------------------------------------------------------
const screens = {
    boot: document.getElementById('boot-screen'),
    menu: document.getElementById('menu-screen'),
    briefing: document.getElementById('briefing-screen'),
    layer: document.getElementById('layer-screen'),
    log: document.getElementById('log-screen')
};
const bgTint = document.getElementById('bg-tint');
const hudLayer = document.getElementById('hud-layer');
const touchControls = document.getElementById('touch-controls');
const pauseOverlay = document.getElementById('pause-overlay');
const resModal = document.getElementById('result-modal');

const hudDepth = document.getElementById('hud-depth');
const hudG = document.getElementById('hud-g');
const hudBest = document.getElementById('hud-best');
const layerText = document.getElementById('layer-text');
const hudVel = document.getElementById('hud-vel');
const centerAlert = document.getElementById('center-alert');
const gaugeFill = document.getElementById('depth-gauge-fill');
const gaugeLabel = document.getElementById('depth-gauge-label');

const resTitle = document.getElementById('res-title');
const resDesc = document.getElementById('res-desc');
const resDepth = document.getElementById('res-depth');
const resTime = document.getElementById('res-time');
const resNewBest = document.getElementById('res-newbest');
const resBtn = document.getElementById('res-btn');

function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    if (name && screens[name]) screens[name].classList.add('active');
    if (name && name !== 'boot') bgTint.classList.add('active');
    else bgTint.classList.remove('active');
}

// ---------------------------------------------------------------------------
// P5 LIFECYCLE
// ---------------------------------------------------------------------------
function setup() {
    const cnv = createCanvas(windowWidth, windowHeight);
    cnv.canvas.id = 'game-canvas';
    probeX = width / 2;

    save = loadSave();
    soundOn = loadSoundPref();
    document.getElementById('sound-state').innerText = soundOn ? 'ON' : 'OFF';

    initAmbient();
    resetGame();

    tryUIImage('assets/images/ui/logo.png', (p) => {
        const el = document.getElementById('menu-logo-img');
        el.style.backgroundImage = "url('" + p + "')";
        el.style.display = 'block';
    });

    setIconBg('btn-left', 'assets/images/ui/icons/left.png', '55%');
    setIconBg('btn-right', 'assets/images/ui/icons/right.png', '55%');
    setIconBg('btn-thrust', 'assets/images/ui/icons/thrust.png', '48%');
    updatePauseIcon();
    updateSoundIcon();

    wireUI();
    initBoot();
    frameRate(60);
}

// ---------------------------------------------------------------------------
// OPTIONAL ICON WIRING (buttons keep their text/emoji glyph as the guaranteed
// fallback; an icon image, if present, is layered on as a background so a
// missing/renamed file never breaks the control)
// ---------------------------------------------------------------------------
function setIconBg(elId, path, sizePercent) {
    tryUIImage(path, (p) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.style.backgroundImage = "url('" + p + "')";
        el.style.backgroundSize = sizePercent || '60%';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center';
        el.classList.add('has-icon');
    });
}

function updatePauseIcon() {
    const el = document.getElementById('btn-pause');
    if (!el) return;
    const paused = gameState === 'PAUSED';
    el.textContent = paused ? '▶' : '⏸';
    setIconBg('btn-pause', paused ? 'assets/images/ui/icons/play.png' : 'assets/images/ui/icons/pause.png', '55%');
}

function updateSoundIcon() {
    setIconBg('sound-icon', soundOn ? 'assets/images/ui/icons/sound_on.png' : 'assets/images/ui/icons/sound_off.png', 'contain');
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    probeX = constrain(probeX, 20, width - 20);
}

// ---------------------------------------------------------------------------
// BOOT / MENU FLOW
// ---------------------------------------------------------------------------
function initBoot() {
    gameState = 'BOOT';
    const bootEl = screens.boot;
    const advance = () => { if (gameState === 'BOOT') goMenu(); };
    setTimeout(advance, 2000);
    bootEl.addEventListener('click', advance, { once: true });
}

function goMenu() {
    gameState = 'MENU';
    showScreen('menu');
    hudLayer.classList.remove('active');
    touchControls.classList.remove('active');
    pauseOverlay.classList.remove('active');
    resModal.style.display = 'none';
    refreshMenuButtons();
}

function refreshMenuButtons() {
    hudBest.innerText = Math.floor(save.bestDepth) + ' km';
}

function renderLayerList() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    LAYERS.forEach((layer) => {
        const unlocked = !!save.unlocked[layer.key];
        const row = document.createElement('div');
        row.className = 'layer-option' + (unlocked ? '' : ' locked') + (selectedLayerKey === layer.key ? ' selected' : '');
        row.innerHTML =
            '<div><div class="lname">' + layer.name + '</div>' +
            '<div class="ldepth">Start depth: ' + layer.startDepth + ' km</div></div>' +
            (unlocked ? '' : '<div class="llock">LOCKED</div>');
        if (unlocked) {
            row.onclick = () => { selectedLayerKey = layer.key; sfxClick(); renderLayerList(); };
        }
        list.appendChild(row);
    });
}

function renderLog() {
    document.getElementById('log-best-depth').innerText = Math.floor(save.bestDepth) + ' km';
    document.getElementById('log-attempts').innerText = save.attempts;
    document.getElementById('log-wins').innerText = save.wins;
    document.getElementById('log-besttime').innerText = save.bestTime === null ? '--' : save.bestTime.toFixed(1) + 's';
    renderBadges();
}

// ---------------------------------------------------------------------------
// ACHIEVEMENT BADGES (Mission Log grid + unlock toast)
// ---------------------------------------------------------------------------
function renderBadges() {
    const grid = document.getElementById('badges-grid');
    if (!grid) return;
    grid.innerHTML = '';
    ACHIEVEMENTS.forEach((a) => {
        const unlocked = a.check(save);
        const cell = document.createElement('div');
        cell.className = 'badge' + (unlocked ? ' unlocked' : ' locked');
        cell.title = unlocked ? a.desc : '???';

        const art = document.createElement('div');
        art.className = 'badge-art';
        const img = document.createElement('img');
        img.alt = a.name;
        img.src = a.icon;
        img.onerror = () => {
            img.style.display = 'none';
            emoji.style.display = 'flex';
        };
        const emoji = document.createElement('div');
        emoji.className = 'badge-emoji';
        emoji.style.display = 'none';
        emoji.textContent = a.fallback;
        art.appendChild(img);
        art.appendChild(emoji);

        const label = document.createElement('div');
        label.className = 'badge-label';
        label.textContent = unlocked ? a.name : '???';

        cell.appendChild(art);
        cell.appendChild(label);
        grid.appendChild(cell);
    });
}

let toastQueue = [];
let toastShowing = false;
function queueAchievementToasts(before, after) {
    ACHIEVEMENTS.forEach((a, i) => {
        if (!before[i] && after[i]) toastQueue.push(a);
    });
    processToastQueue();
}
function processToastQueue() {
    if (toastShowing || toastQueue.length === 0) return;
    const a = toastQueue.shift();
    toastShowing = true;
    const el = document.getElementById('achievement-toast');
    if (!el) { toastShowing = false; processToastQueue(); return; }
    document.getElementById('toast-name').textContent = a.name;
    document.getElementById('toast-desc').textContent = a.desc;
    const img = document.getElementById('toast-icon-img');
    const emoji = document.getElementById('toast-icon-emoji');
    img.style.display = 'block';
    emoji.style.display = 'none';
    img.onerror = () => { img.style.display = 'none'; emoji.style.display = 'flex'; emoji.textContent = a.fallback; };
    img.src = a.icon;
    el.classList.add('show');
    sfxClick();
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => { toastShowing = false; processToastQueue(); }, 400);
    }, 2600);
}

function launchMission() {
    showScreen(null);
    hudLayer.classList.add('active');
    touchControls.classList.add('active');
    resetGame();
    gameState = 'PLAYING';
    missionStartMillis = millis();
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        thrustStop();
        swipeReset();
        pauseOverlay.classList.add('active');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        pauseOverlay.classList.remove('active');
    }
    updatePauseIcon();
}

function backToMenu() {
    thrustStop();
    resModal.style.display = 'none';
    pauseOverlay.classList.remove('active');
    hudLayer.classList.remove('active');
    touchControls.classList.remove('active');
    goMenu();
}

function wireUI() {
    document.getElementById('btn-menu-launch').onclick = () => { sfxClick(); startDepth = 0; selectedLayerKey = 'crust'; showScreen('briefing'); };
    document.getElementById('btn-menu-layers').onclick = () => { sfxClick(); renderLayerList(); showScreen('layer'); };
    document.getElementById('btn-menu-log').onclick = () => { sfxClick(); renderLog(); showScreen('log'); };
    document.getElementById('btn-menu-sound').onclick = () => {
        soundOn = !soundOn;
        document.getElementById('sound-state').innerText = soundOn ? 'ON' : 'OFF';
        persistSoundPref();
        updateSoundIcon();
        setMusicVolume(soundOn ? 0.06 : 0);
        sfxClick();
    };

    document.getElementById('btn-briefing-launch').onclick = () => { sfxClick(); launchMission(); };
    document.getElementById('btn-briefing-back').onclick = () => { sfxClick(); showScreen('menu'); };

    document.getElementById('btn-layer-back').onclick = () => { sfxClick(); showScreen('menu'); };
    document.getElementById('btn-layer-launch').onclick = () => {
        sfxClick();
        const layer = LAYERS.find((l) => l.key === selectedLayerKey);
        startDepth = layer ? layer.startDepth : 0;
        showScreen('briefing');
    };

    document.getElementById('btn-log-back').onclick = () => { sfxClick(); showScreen('menu'); };

    document.getElementById('btn-pause').onclick = () => { sfxClick(); togglePause(); };
    document.getElementById('btn-pause-resume').onclick = () => { sfxClick(); togglePause(); };
    document.getElementById('btn-pause-restart').onclick = () => { sfxClick(); pauseOverlay.classList.remove('active'); resetGame(); gameState = 'PLAYING'; missionStartMillis = millis(); };
    document.getElementById('btn-pause-menu').onclick = () => { sfxClick(); backToMenu(); };

    document.getElementById('res-menu-btn').onclick = () => { sfxClick(); backToMenu(); };

    // --- Touch / pointer controls ---
    bindHoldButton('btn-left', (v) => { touchLeft = v; });
    bindHoldButton('btn-right', (v) => { touchRight = v; });
    bindHoldButton('btn-thrust', (v) => {
        touchThrust = v;
        if (v) thrustStart(); else thrustStop();
    });

    // --- Keyboard niceties ---
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (gameState === 'PLAYING' || gameState === 'PAUSED') togglePause();
        }
    }, { passive: false });

    // --- Prevent mobile gestures interfering with gameplay ---
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameState === 'PLAYING') togglePause();
    });
}

function bindHoldButton(id, setter) {
    const el = document.getElementById(id);
    const start = (e) => { e.preventDefault(); el.classList.add('pressed'); setter(true); };
    const end = (e) => { if (e) e.preventDefault(); el.classList.remove('pressed'); setter(false); };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------------------------------------------------------------------------
// SWIPE / DRAG MOVEMENT
// Lets the player drag a finger (or mouse) anywhere on the play area to
// steer the probe left/right, in addition to the arrow keys and the on-screen
// buttons. Tracks touches by identifier so a swipe finger and a held
// thrust/left/right button can be used at the same time without interfering.
// ---------------------------------------------------------------------------
const SWIPE_SENSITIVITY = 1.4; // px of probe movement per px of finger movement
let swipeTouchId = null;       // active pointer id ('mouse' or a Touch.identifier), or null
let lastSwipeX = null;

function isInteractiveTarget(el) {
    return !!(el && el.closest && el.closest(
        '.touch-btn, .menu-btn, .btn-launch, .btn-ghost, .icon-btn, .layer-option'
    ));
}

function swipeBegin(id, x, targetEl) {
    if (swipeTouchId !== null) return; // already tracking a swipe pointer
    if (gameState !== 'PLAYING' || isInteractiveTarget(targetEl)) return;
    swipeTouchId = id;
    lastSwipeX = x;
}
function swipeMove(id, x) {
    if (swipeTouchId !== id || lastSwipeX === null) return;
    probeX += (x - lastSwipeX) * SWIPE_SENSITIVITY;
    lastSwipeX = x;
}
function swipeEnd(id) {
    if (swipeTouchId === id) { swipeTouchId = null; lastSwipeX = null; }
}
function swipeReset() { swipeTouchId = null; lastSwipeX = null; }

// p5 auto-binds these when defined globally, same as setup()/draw().
function touchStarted(e) {
    if (e && e.changedTouches) {
        for (const t of e.changedTouches) swipeBegin(t.identifier, t.clientX, t.target);
    }
    return true; // don't block default (buttons still need their own pointer events)
}
function touchMoved(e) {
    if (e && e.changedTouches) {
        for (const t of e.changedTouches) swipeMove(t.identifier, t.clientX);
    }
    return true;
}
function touchEnded(e) {
    if (e && e.changedTouches) {
        for (const t of e.changedTouches) swipeEnd(t.identifier);
    } else {
        swipeReset();
    }
    return true;
}
function mousePressed(e) { swipeBegin('mouse', mouseX, e && e.target); }
function mouseDragged() { swipeMove('mouse', mouseX); }
function mouseReleased() { swipeEnd('mouse'); }

// ---------------------------------------------------------------------------
// GAME RESET
// ---------------------------------------------------------------------------
function resetGame() {
    depth = startDepth;
    velocity = 0;
    distanceTraveled = 0;
    obstacles = [];
    particles = [];
    explosionParticles = [];
    thrusterParticles = [];
    shockwaves = [];
    debris = [];
    flashAlpha = 0;
    crashAnimTimer = 0;
    probeX = width / 2;
    screenShake = 0;
    swipeReset();
    resModal.style.display = 'none';
    centerAlert.style.display = 'none';
}

function initAmbient() {
    bgRocks = [];
    for (let i = 0; i < 9; i++) bgRocks.push(spawnBgRock(random(height)));
    embers = [];
    for (let i = 0; i < 45; i++) embers.push(spawnEmber(random(height)));
}
function spawnBgRock(y) {
    return { x: random(width), y: y === undefined ? height + 150 : y, size: random(60, 170), speed: random(0.3, 0.9), alpha: random(14, 34), wobble: random(1000) };
}
function spawnEmber(y) {
    return { x: random(width), y: y === undefined ? height + 20 : y, size: random(1.5, 4), speed: random(0.4, 1.6), alpha: random(60, 170), tw: random(1000) };
}
function updateAmbient(parallax) {
    for (const r of bgRocks) { r.y -= r.speed * parallax; if (r.y < -200) Object.assign(r, spawnBgRock()); }
    for (const e of embers) { e.y -= e.speed * parallax; if (e.y < -20) Object.assign(e, spawnEmber()); }
}
function drawAmbient(tint) {
    noStroke();
    for (const r of bgRocks) {
        fill(tint.r * 0.55, tint.g * 0.45 + 10, tint.b * 0.4 + 10, r.alpha);
        ellipse(r.x + sin((frameCount + r.wobble) * 0.01) * 12, r.y, r.size, r.size * 0.8);
    }
    for (const e of embers) {
        const a = e.alpha * (0.5 + 0.5 * sin((frameCount + e.tw) * 0.05));
        fill(255, 180, 100, a);
        circle(e.x, e.y, e.size);
    }
}

// ---------------------------------------------------------------------------
// SCENE COLOR / BACKGROUND ART
// ---------------------------------------------------------------------------
function computeSceneColor(d) {
    let rVal, gVal, bVal;
    if (d < 3200) {
        const t = map(d, 0, 3200, 0, 1);
        rVal = lerp(20, 150, t); gVal = lerp(10, 20, t); bVal = lerp(10, 0, t);
    } else {
        const t = map(d, 3200, 6400, 0, 1);
        rVal = lerp(150, 255, t); gVal = lerp(20, 255, t); bVal = lerp(0, 200, t);
    }
    return { r: rVal, g: gVal, b: bVal };
}

function currentBandArt(d) {
    for (const band of BANDS) {
        if (d >= band.from && d < band.to) {
            const holder = ART[band.artKey];
            return holder ? holder.img : null;
        }
    }
    return null;
}

function drawSceneBackground(d) {
    const c = computeSceneColor(d);
    background(c.r, c.g, c.b);
    const art = currentBandArt(d);
    if (art) {
        // Drawn via the raw 2D context (not p5's image()/tint()) since `art`
        // is a native HTMLImageElement — see the note on safeLoad() above.
        drawingContext.save();
        drawingContext.globalAlpha = 150 / 255; // ~60% blend over the gradient
        drawingContext.drawImage(art, 0, 0, width, height);
        drawingContext.restore();
    }
    return c;
}

// ---------------------------------------------------------------------------
// MAIN DRAW LOOP
// ---------------------------------------------------------------------------
function draw() {
    if (gameState === 'PLAYING') {
        runGameplayTick();
    } else if (gameState === 'CRASH_ANIM') {
        runCrashAnimTick();
    } else if (gameState === 'PAUSED') {
        renderFrozenWorld();
    } else {
        runIdleAmbient();
    }
}

function runIdleAmbient() {
    idlePseudoDepth = 1400 + Math.sin(frameCount * 0.0025) * 1300 + 1300;
    const c = drawSceneBackground(idlePseudoDepth);
    updateAmbient(0.55);
    drawAmbient(c);
}

function renderFrozenWorld() {
    // Keep last gameplay frame visible (without advancing physics) while paused
    const c = drawSceneBackground(depth);
    drawAmbient(c);
    drawTunnel();
    for (const obs of obstacles) drawObstacle(obs);
    drawProbe(false);
}

// Plays out the crash "blast" — background/obstacles freeze at the moment of
// impact while the shockwave, debris, and explosion particles animate on top,
// then hands off to the normal result modal. Purely cosmetic: does not touch
// probeX, collision, or physics values.
function runCrashAnimTick() {
    const c = drawSceneBackground(depth);
    drawAmbient(c);

    push();
    if (screenShake > 0) {
        translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    drawTunnel();
    for (const obs of obstacles) drawObstacle(obs); // frozen in place at impact
    handleExplosionParticles();
    handleShockwaves();
    handleDebris();
    pop();

    drawFlash();

    crashAnimTimer--;
    if (crashAnimTimer <= 0) {
        gameOver(false);
    }
}

function runGameplayTick() {
    // 1. Calculate Physics (The Core Mechanic) — UNCHANGED FORMULAS
    const remaining = R - depth;
    let currentG = map(remaining, 0, R, 0, MAX_G_PIXELS);
    if (currentG < 0) currentG = 0;

    velocity += currentG;
    velocity *= 0.98; // drag / terminal velocity feel

    // THRUSTERS (Player Input) — keyboard OR touch, identical effect
    let thrusting = false;
    const leftDown = keyIsDown(LEFT_ARROW) || touchLeft;
    const rightDown = keyIsDown(RIGHT_ARROW) || touchRight;
    const downDown = keyIsDown(DOWN_ARROW) || touchThrust;

    if (leftDown) probeX -= 8;
    if (rightDown) probeX += 8;
    if (downDown) {
        velocity += 1.5; // Artificial boost — unchanged
        thrusting = true;
        if (keyIsDown(DOWN_ARROW)) thrustStart(); // keyboard path also triggers audio
        addThrusterParticles();
    } else if (!touchThrust) {
        thrustStop();
    }

    // Move Game World (Scrolling Effect) — UNCHANGED FORMULAS
    depth += velocity * 0.1;
    distanceTraveled += velocity;

    // Bounds — UNCHANGED
    if (probeX < 20) probeX = 20;
    if (probeX > width - 20) probeX = width - 20;

    // 2. Background (dynamic color + optional art + ambient parallax)
    const c = drawSceneBackground(depth);
    updateAmbient(0.35 + Math.min(Math.abs(velocity), 20) * 0.05);
    drawAmbient(c);

    // Screen shake wrapper (cosmetic only — does not affect probeX/hitboxes)
    push();
    if (screenShake > 0) {
        translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    // 3. Spawners
    handleObstacles();
    handleParticles();
    handleThrusterParticles();
    handleExplosionParticles();

    // 4. Draw Tunnel Walls
    drawTunnel();

    // 5. Draw Probe
    drawProbe(thrusting);

    pop();

    // 6. UI Updates
    updateHUD(currentG, remaining);

    // 7. Win/Loss Logic — UNCHANGED
    checkCollisions();

    if (remaining < 500 && velocity < 2) {
        centerAlert.style.display = 'block';
    } else {
        centerAlert.style.display = 'none';
    }

    if (depth >= TARGET_DEPTH) {
        gameOver(true);
    }
}

// ---------------------------------------------------------------------------
// GAME OBJECTS
// ---------------------------------------------------------------------------
function drawProbe(thrusting) {
    push();
    translate(probeX, 200);
    if (velocity > 15) translate(random(-2, 2), 0);
    // The world scrolls UP past the probe (obstacles move up as depth
    // increases), meaning the probe is actually travelling DOWN into the
    // Earth. The art/vector shape below was drawn nose-up, engine-down, so
    // flip it vertically here: nose now leads the descent (points down) and
    // the engine/exhaust trails above it, consistent with thrust pushing the
    // probe further down. Purely cosmetic — does not touch probeX or physics.
    scale(1, -1);

    const art = ART.probe && ART.probe.img;
    if (art) {
        // translate() above already moved the origin to the probe's center,
        // so drawImage just needs a top-left offset of -width/2, -height/2.
        drawingContext.drawImage(art, -20, -32, 40, 64);
    } else {
        fill(255); noStroke();
        rectMode(CENTER);
        rect(0, 0, 30, 50, 5);
        fill(0, 100, 255); rect(0, -10, 20, 10);
        fill(50); rect(0, 25, 10, 5);
    }

    if (thrusting) {
        fill(0, 255, 255);
        triangle(-5, 30, 5, 30, 0, 60 + sin(frameCount * 0.6) * 5);
    }
    pop();
}

function handleObstacles() {
    if (frameCount % 20 === 0 && depth < 6000) {
        const obsType = random() > 0.5 ? 'ROCK' : 'MAGMA';
        const x = random(50, width - 50);
        obstacles.push({ x: x, y: height + 50, type: obsType, size: random(40, 80), spin: random(-0.02, 0.02), rot: random(TWO_PI) });
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y -= velocity;
        obs.rot += obs.spin;
        drawObstacle(obs);
        if (obs.y < -100) obstacles.splice(i, 1);
    }
}

function drawObstacle(obs) {
    push();
    translate(obs.x, obs.y);
    rotate(obs.rot);
    if (obs.type === 'ROCK') {
        const art = ART.rock && ART.rock.img;
        if (art) {
            drawingContext.drawImage(art, -obs.size / 2, -obs.size / 2, obs.size, obs.size);
        } else {
            fill(50, 40, 40); stroke(100); strokeWeight(2);
            rectMode(CENTER);
            square(0, 0, obs.size, 10);
        }
    } else {
        drawingContext.shadowBlur = 20; drawingContext.shadowColor = 'red';
        const art = ART.magma && ART.magma.img;
        if (art) {
            drawingContext.drawImage(art, -obs.size / 2, -obs.size / 2, obs.size, obs.size);
        } else {
            fill(255, 50, 0); noStroke();
            circle(0, 0, obs.size);
        }
        drawingContext.shadowBlur = 0;
    }
    pop();
}

function handleParticles() {
    if (frameCount % 2 === 0) {
        particles.push({ x: random(width), y: height, len: random(10, 30), speed: random(10, 20) });
    }
    stroke(255, 100); strokeWeight(1);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y -= (velocity + p.speed);
        line(p.x, p.y, p.x, p.y - p.len);
        if (p.y < 0) particles.splice(i, 1);
    }
}

function addThrusterParticles() {
    // Engine is now above the probe's center (see the vertical flip in
    // drawProbe), so exhaust spawns above it and drifts further up.
    for (let i = 0; i < 2; i++) {
        thrusterParticles.push({
            x: probeX + random(-6, 6), y: 200 - 30 - random(0, 8),
            vy: random(-7, -3), vx: random(-1, 1), life: 1, size: random(4, 9)
        });
    }
}
function handleThrusterParticles() {
    noStroke();
    for (let i = thrusterParticles.length - 1; i >= 0; i--) {
        const p = thrusterParticles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if (p.life <= 0) { thrusterParticles.splice(i, 1); continue; }
        fill(0, 230, 255, p.life * 200);
        circle(p.x, p.y, p.size * p.life);
    }
}

function spawnExplosion(x, y) {
    for (let i = 0; i < 50; i++) {
        const ang = random(TWO_PI);
        const spd = random(2, 13);
        const roll = random();
        let col;
        if (roll < 0.3) col = [255, 235, 150];       // white-hot core
        else if (roll < 0.65) col = [255, 150, 0];   // orange
        else if (roll < 0.88) col = [255, 60, 20];   // red
        else col = [80, 78, 80];                     // smoke fleck
        explosionParticles.push({
            x, y, vx: cos(ang) * spd, vy: sin(ang) * spd,
            life: 1, size: random(4, 16),
            col
        });
    }
}
function handleExplosionParticles() {
    noStroke();
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.022;
        if (p.life <= 0) { explosionParticles.splice(i, 1); continue; }
        fill(p.col[0], p.col[1], p.col[2], p.life * 255);
        circle(p.x, p.y, p.size * p.life);
    }
}

// Expanding ring of light at the impact point
function spawnShockwave(x, y) {
    shockwaves.push({ x, y, r: 8, alpha: 255 });
}
function handleShockwaves() {
    noFill();
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.r += 15;
        s.alpha -= 11;
        if (s.alpha <= 0) { shockwaves.splice(i, 1); continue; }
        stroke(255, 210, 140, s.alpha);
        strokeWeight(4);
        circle(s.x, s.y, s.r * 2);
    }
}

// Chunky rotating shrapnel flying outward from the probe
function spawnDebris(x, y) {
    for (let i = 0; i < 12; i++) {
        const ang = random(TWO_PI);
        const spd = random(3, 11);
        debris.push({
            x, y, vx: cos(ang) * spd, vy: sin(ang) * spd - 2,
            rot: random(TWO_PI), vrot: random(-0.35, 0.35),
            w: random(6, 16), h: random(4, 10), life: 1,
            col: random() > 0.5 ? [225, 228, 232] : [90, 95, 100]
        });
    }
}
function handleDebris() {
    noStroke();
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx; d.y += d.vy; d.vy += 0.3; d.rot += d.vrot; d.life -= 0.018;
        if (d.life <= 0) { debris.splice(i, 1); continue; }
        push();
        translate(d.x, d.y);
        rotate(d.rot);
        fill(d.col[0], d.col[1], d.col[2], d.life * 255);
        rectMode(CENTER);
        rect(0, 0, d.w, d.h, 2);
        pop();
    }
}

// Full-screen impact flash, fades over a few frames
function drawFlash() {
    if (flashAlpha <= 0) return;
    noStroke();
    fill(255, 230, 180, flashAlpha);
    rect(0, 0, width, height);
    flashAlpha -= 30;
    if (flashAlpha < 0) flashAlpha = 0;
}

function drawTunnel() {
    fill(0); noStroke();
    rect(0, 0, 20, height);
    rect(width - 20, 0, 20, height);

    fill(255, 150); textSize(10); textAlign(RIGHT);
    if (frameCount % 30 === 0) {
        text(Math.floor(depth) + 'km', width - 25, random(height));
    }
}

// ---------------------------------------------------------------------------
// HUD / LOGIC
// ---------------------------------------------------------------------------
function updateHUD(g, remaining) {
    hudDepth.innerText = Math.floor(depth) + ' km';

    let displayG = 9.8 * (remaining / R);
    if (displayG < 0) displayG = 0;

    hudG.innerText = displayG.toFixed(2) + ' m/s²';
    hudVel.innerText = Math.floor(velocity * 10) + ' m/s';
    hudBest.innerText = Math.max(Math.floor(save.bestDepth), Math.floor(depth)) + ' km';

    if (depth < 35) { layerText.innerText = 'CRUST'; layerText.style.color = '#aaa'; }
    else if (depth < 2900) { layerText.innerText = 'MANTLE'; layerText.style.color = '#ff5500'; }
    else if (depth < 5100) { layerText.innerText = 'OUTER CORE'; layerText.style.color = '#ffaa00'; }
    else { layerText.innerText = 'INNER CORE'; layerText.style.color = '#ffffff'; }

    const pct = constrain((depth / TARGET_DEPTH) * 100, 0, 100);
    gaugeFill.style.width = pct + '%';
    gaugeLabel.innerText = Math.floor(depth) + ' / ' + TARGET_DEPTH + ' KM TO CORE';
}

function checkCollisions() {
    for (const obs of obstacles) {
        const d = dist(probeX, 200, obs.x, obs.y);
        if (d < (30 + obs.size / 2) * 0.8) {
            triggerCrash();
            return;
        }
    }
}

// Kicks off the blast sequence (shockwave + debris + explosion + flash +
// screen shake) and holds on the impact for CRASH_ANIM_FRAMES before handing
// off to gameOver(false). Collision detection itself is unchanged above —
// this only decides what happens cosmetically once a hit is confirmed.
function triggerCrash() {
    gameState = 'CRASH_ANIM';
    crashAnimTimer = CRASH_ANIM_FRAMES;
    screenShake = 28;
    flashAlpha = 235;
    thrustStop();
    centerAlert.style.display = 'none';
    spawnExplosion(probeX, 200);
    spawnShockwave(probeX, 200);
    spawnDebris(probeX, 200);
    sfxCrash();
}

function gameOver(win) {
    gameState = win ? 'WON' : 'CRASHED';
    thrustStop();
    swipeReset();

    const elapsedSec = (millis() - missionStartMillis) / 1000;
    const depthReached = Math.floor(depth);
    const isNewBest = depthReached > save.bestDepth;
    const achievementsBefore = ACHIEVEMENTS.map((a) => a.check(save));

    save.attempts += 1;
    if (win) save.wins += 1;
    save.bestDepth = Math.max(save.bestDepth, depthReached);
    if (win && (save.bestTime === null || elapsedSec < save.bestTime)) save.bestTime = elapsedSec;
    if (save.bestDepth >= 35) save.unlocked.mantle = true;
    if (save.bestDepth >= 2900) save.unlocked.outerCore = true;
    if (save.bestDepth >= 5100) save.unlocked.innerCore = true;
    persistSave();

    const achievementsAfter = ACHIEVEMENTS.map((a) => a.check(save));
    queueAchievementToasts(achievementsBefore, achievementsAfter);

    resDepth.innerText = depthReached + ' km';
    resTime.innerText = elapsedSec.toFixed(1) + 's';
    resNewBest.style.display = isNewBest ? 'block' : 'none';

    resModal.style.display = 'block';

    if (win) {
        sfxWin();
        resTitle.innerText = 'CORE REACHED';
        resTitle.style.color = 'var(--success)';
        resDesc.innerHTML = 'Telemetry Confirmed.<br>Gravity is ZERO.<br>Mission Successful.';
        resBtn.innerText = 'RESTART MISSION';
        resBtn.onclick = () => { resModal.style.display = 'none'; startDepth = 0; resetGame(); gameState = 'PLAYING'; missionStartMillis = millis(); };
    } else {
        resTitle.innerText = 'SIGNAL LOST';
        resTitle.style.color = 'var(--fail)';
        resDesc.innerText = 'Probe impact detected.';
        resBtn.innerText = 'RETRY DROP';
        resBtn.onclick = () => { resModal.style.display = 'none'; resetGame(); gameState = 'PLAYING'; missionStartMillis = millis(); };
    }
}
