/* ============================================================================
   game.js - screen flow, case loop, saved progress.

   The case loop is a faithful port of the original module: ten cases in fixed
   order, one point per correct answer, the explanation shown immediately, an
   eight-second hold before advancing, a skip button, and the same three rank
   tiers at the end. Everything added around it - boot sequence, menu, dossier,
   settings, particles, saved state - sits outside that loop.
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------- constants */

const STORE_KEY = 'biologic.froglab.v1';
const HOLD_MS = 8000;          /* auto-advance delay, unchanged from original */
const ICON = 'assets/images/ui/emoji/';

/* Case status codes kept in the save file. */
const UNSEEN = 0, CORRECT = 1, WRONG = 2;

/* --------------------------------------------------------------- game state */

let currentIdx = 0;
let score = 0;
let isAnswering = false;
let nextTimer = null;
let advancing = false;          /* guards double-advance from tap + timer */
let runResults = [];            /* per-case outcome for the session in play */
let currentOrder = [];          /* seat -> source option index, reshuffled per case */
let activeModal = null;
let wiping = false;
let booted = false;             /* the splash hands off exactly once */

const save = {
  v: 1,
  best: 0,
  runs: 0,
  cases: new Array(CASES.length).fill(UNSEEN),
  resume: null,
  settings: { music: true, sfx: true, motion: true }
};

/* --------------------------------------------------------------- shorthands */

const $ = (id) => document.getElementById(id);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

/* ============================================================================
   Anatomical plate artwork - line-art fallbacks drawn per discipline. A PNG
   dropped into assets/images/organs/<system>.png replaces the plate; nothing
   here is required.
   ========================================================================== */
const ORGAN_ART = {
  comparative: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <linearGradient id="pgGut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffb6c9"/><stop offset="100%" stop-color="#a2456a"/>
        </linearGradient>
      </defs>
      <path d="M40 18c34 0 34 16 0 16s-34 16 0 16 34 16 0 16 0 16 34 16h86" fill="none"
            stroke="url(#pgGut)" stroke-width="13" stroke-linecap="round"/>
      <path d="M40 18c34 0 34 16 0 16s-34 16 0 16 34 16 0 16 0 16 34 16h86" fill="none"
            stroke="#ffe0ea" stroke-width="3" stroke-linecap="round" opacity=".45"/>
      <text x="150" y="26" class="plate-tag">GUT</text>
    </svg>`,
  surgical: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <linearGradient id="pgBlade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#8ba7ba"/>
        </linearGradient>
        <radialGradient id="pgBile" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#e8ff9c"/><stop offset="100%" stop-color="#6f9a1f"/>
        </radialGradient>
      </defs>
      <path d="M22 98l40-40 11 11-40 40H22z" fill="#3d2258" stroke="#d9c6ef" stroke-width="2.4"/>
      <path d="M66 55l58-44c8-6 17 4 11 12L79 68z" fill="url(#pgBlade)" stroke="#4b6070" stroke-width="2.4"/>
      <path d="M150 34c14 4 24 18 22 34-2 15-14 26-28 24-12-2-19-13-17-27 2-13 11-22 23-31z"
            fill="url(#pgBile)" stroke="#f2ffd6" stroke-width="2.4"/>
      <path d="M150 34l-6-16" stroke="#c9e08a" stroke-width="5" stroke-linecap="round"/>
      <text x="120" y="110" class="plate-tag">BILE</text>
    </svg>`,
  environment: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <radialGradient id="pgDrop" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#e8fbff"/><stop offset="100%" stop-color="#2f92c2"/>
        </radialGradient>
        <radialGradient id="pgSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff0b8"/><stop offset="100%" stop-color="#ff9a2e"/>
        </radialGradient>
      </defs>
      <circle cx="158" cy="34" r="18" fill="url(#pgSun)"/>
      <g stroke="#ffc94d" stroke-width="3.4" stroke-linecap="round" opacity=".9">
        <path d="M158 6v-4"/><path d="M182 34h5"/><path d="M141 17l-4-4"/><path d="M175 17l4-4"/><path d="M158 56v4"/>
      </g>
      <path d="M62 14c20 26 30 39 30 54a30 30 0 0 1-60 0c0-15 10-28 30-54z"
            fill="url(#pgDrop)" stroke="#e6f9ff" stroke-width="2.6"/>
      <path d="M46 72c0 11 7 17 15 19" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".6"/>
      <g stroke="#7fdcff" stroke-width="3" stroke-linecap="round" opacity=".55">
        <path d="M108 40h22"/><path d="M112 58h26"/><path d="M108 76h20"/>
      </g>
      <text x="104" y="106" class="plate-tag">SKIN</text>
    </svg>`,
  circulatory: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <radialGradient id="pgHeart" cx="42%" cy="30%" r="72%">
          <stop offset="0%" stop-color="#ffb6c9"/><stop offset="100%" stop-color="#b52a4e"/>
        </radialGradient>
      </defs>
      <path d="M100 108S48 76 48 44a22 22 0 0 1 52-13 22 22 0 0 1 52 13c0 32-52 64-52 64z"
            fill="url(#pgHeart)" stroke="#ffdfe7" stroke-width="2.6"/>
      <path d="M100 31v52" stroke="#6d0d26" stroke-width="3" opacity=".55"/>
      <path d="M100 58h50" stroke="#6d0d26" stroke-width="3" opacity=".55"/>
      <path d="M62 38c4-6 12-8 19-6" stroke="#fff3f6" stroke-width="4.4" stroke-linecap="round" opacity=".7"/>
      <path d="M100 20l-14-14" stroke="#7fdcff" stroke-width="6" stroke-linecap="round"/>
      <text x="120" y="102" class="plate-tag">VENTRICLE</text>
    </svg>`,
  urogenital: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <radialGradient id="pgKid" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stop-color="#d99cb8"/><stop offset="100%" stop-color="#7e2a4c"/>
        </radialGradient>
      </defs>
      <path d="M58 12c17 0 27 17 27 36S75 80 58 80c-13 0-21-11-21-34S45 12 58 12z"
            fill="url(#pgKid)" stroke="#f1cfdd" stroke-width="2.6"/>
      <path d="M54 26c6-2 12 0 16 6" stroke="#ffe6ef" stroke-width="4" stroke-linecap="round" opacity=".65"/>
      <path d="M85 48h14c11 0 17 9 17 19v43" fill="none" stroke="#ffc94d" stroke-width="8" stroke-linecap="round"/>
      <path d="M85 48h14c11 0 17 9 17 19v43" fill="none" stroke="#fff0b8" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
      <path d="M150 20c10 0 16 8 16 18s-6 18-16 18" fill="none" stroke="#41e0d0" stroke-width="6" stroke-linecap="round"/>
      <text x="126" y="24" class="plate-tag">DUCT</text>
    </svg>`,
  systemic: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <radialGradient id="pgNode" cx="40%" cy="34%" r="70%">
          <stop offset="0%" stop-color="#b6fff6"/><stop offset="100%" stop-color="#1f9d95"/>
        </radialGradient>
      </defs>
      <g stroke="#b6fff6" stroke-width="3.4" stroke-linecap="round" opacity=".8">
        <path d="M100 60L44 20"/><path d="M100 60l56-40"/><path d="M100 60L44 100"/>
        <path d="M100 60l56 40"/><path d="M100 60H26"/><path d="M100 60h74"/>
      </g>
      <g fill="url(#pgNode)" stroke="#e9fffd" stroke-width="2.4">
        <circle cx="44" cy="20" r="10"/><circle cx="156" cy="20" r="10"/>
        <circle cx="44" cy="100" r="10"/><circle cx="156" cy="100" r="10"/>
        <circle cx="22" cy="60" r="8"/><circle cx="178" cy="60" r="8"/>
      </g>
      <circle cx="100" cy="60" r="17" fill="url(#pgNode)" stroke="#e9fffd" stroke-width="3"/>
      <text x="92" y="112" class="plate-tag">LINK</text>
    </svg>`,
  neural: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <radialGradient id="pgBrain" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#e7c4ff"/><stop offset="100%" stop-color="#7429d4"/>
        </radialGradient>
      </defs>
      <path d="M96 16a20 20 0 0 0-32 12 16 16 0 0 0-8 24 18 18 0 0 0 12 24c4 12 20 16 28 8z"
            fill="url(#pgBrain)" stroke="#f4e6ff" stroke-width="2.6"/>
      <path d="M104 16a20 20 0 0 1 32 12 16 16 0 0 1 8 24 18 18 0 0 1-12 24c-4 12-20 16-28 8z"
            fill="url(#pgBrain)" stroke="#f4e6ff" stroke-width="2.6"/>
      <path d="M100 16v70" stroke="#3d0a63" stroke-width="2.6" opacity=".5"/>
      <g stroke="#fbf2ff" stroke-width="2.8" stroke-linecap="round" opacity=".65">
        <path d="M80 34c8 2 10 10 6 16"/><path d="M120 34c-8 2-10 10-6 16"/>
      </g>
      <circle cx="164" cy="62" r="16" fill="none" stroke="#ffc94d" stroke-width="4"/>
      <circle cx="164" cy="62" r="7" fill="#ffc94d" opacity=".5"/>
      <text x="146" y="106" class="plate-tag">EAR</text>
    </svg>`,
  ecological: `
    <svg viewBox="0 0 200 120" class="plate-svg">
      <defs>
        <linearGradient id="pgLeaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a8f5b8"/><stop offset="100%" stop-color="#1f7a3c"/>
        </linearGradient>
      </defs>
      <path d="M150 12C86 12 44 40 44 76c0 12 4 22 10 28 6-32 30-54 76-64-34 16-56 36-64 64 44 4 90-28 90-68 0-10-2-18-6-24z"
            fill="url(#pgLeaf)" stroke="#d9ffe4" stroke-width="2.4"/>
      <ellipse cx="60" cy="34" rx="13" ry="8" transform="rotate(-24 60 34)" fill="#3b2258" stroke="#ffc94d" stroke-width="2.4"/>
      <g stroke="#ffc94d" stroke-width="2.6" stroke-linecap="round">
        <path d="M70 26l7-7"/><path d="M74 34l9-3"/>
      </g>
      <text x="26" y="110" class="plate-tag">FIELD</text>
    </svg>`
};

/**
 * A shuffled [0..n-1], via Fisher-Yates. Used to seat the answer options in a
 * fresh order each time a case is shown.
 */
function shuffled(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** Paint one element's discipline accent tokens. */
function applySystemTokens(el, sys) {
  if (!el) return;
  el.style.setProperty('--sys-accent', sys.accent);
  el.style.setProperty('--sys-glow', sys.glow);
  el.style.setProperty('--sys-soft', sys.soft);
  el.style.setProperty('--sys-soft2', sys.soft2);
}

/* ============================================================================
   Persistence
   ========================================================================== */

function loadSave() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;
    if (typeof d.best === 'number') save.best = Math.max(0, Math.min(CASES.length, d.best));
    if (typeof d.runs === 'number') save.runs = Math.max(0, d.runs);
    if (Array.isArray(d.cases)) {
      for (let i = 0; i < CASES.length; i++) {
        save.cases[i] = d.cases[i] === CORRECT || d.cases[i] === WRONG ? d.cases[i] : UNSEEN;
      }
    }
    if (d.resume && typeof d.resume.idx === 'number' &&
        d.resume.idx > 0 && d.resume.idx < CASES.length) {
      save.resume = {
        idx: d.resume.idx,
        score: typeof d.resume.score === 'number' ? d.resume.score : 0,
        results: Array.isArray(d.resume.results) ? d.resume.results : []
      };
    }
    if (d.settings) {
      save.settings.music = d.settings.music !== false;
      save.settings.sfx = d.settings.sfx !== false;
      save.settings.motion = d.settings.motion !== false;
    }
  } catch (e) {
    /* Corrupt or unavailable storage: run with defaults. */
  }
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(save));
  } catch (e) {
    /* Private mode or a full quota - the game still plays, just forgets. */
  }
}

/* ============================================================================
   Input - one unified tap path for mouse, touch and pen, plus keyboard.
   ========================================================================== */

function onTap(el, fn) {
  if (!el) return;
  let armed = false;

  el.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button > 0) return;
    armed = true;
    el.classList.add('is-press');
    Audio2.unlock();
    if (el.setPointerCapture && e.pointerId != null) {
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  });

  const clear = () => { armed = false; el.classList.remove('is-press'); };

  el.addEventListener('pointerup', (e) => {
    if (!armed) return;
    const r = el.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
    clear();
    if (inside && !el.disabled) fn(e);
  });

  el.addEventListener('pointercancel', clear);
  el.addEventListener('pointerleave', () => el.classList.remove('is-press'));

  /* Real buttons keep keyboard activation; click is never bound, so a key
     press cannot fire the handler twice. */
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      Audio2.unlock();
      if (!el.disabled) fn(e);
    }
  });
}

/* ============================================================================
   Screens
   ========================================================================== */

const SCENE_BG = {
  'boot-screen': 'bg-menu',
  'menu-screen': 'bg-menu',
  'game-screen': 'bg-lab',
  'dossier-screen': 'bg-dossier',
  'end-screen': 'bg-result'
};

const SCENE_FX = {
  'boot-screen': 'menu',
  'menu-screen': 'menu',
  'game-screen': 'lab',
  'dossier-screen': 'dossier',
  'end-screen': 'result'
};

function showScreen(id, opts) {
  const o = opts || {};
  const swap = () => {
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
    document.body.setAttribute('data-screen', id);
    FX.setScene(SCENE_FX[id] || 'menu');
    Assets.applyBackground(document.querySelector('.bg-deep'), SCENE_BG[id]);
    const first = document.querySelector('#' + id + ' .btn--primary, #' + id + ' .btn');
    if (first && o.focus !== false) {
      try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    if (o.after) o.after();
  };

  if (o.wipe === false || wiping) { swap(); return; }
  wiping = true;
  const wipe = $('wipe');
  wipe.classList.add('is-on');
  Audio2.play('advance');
  setTimeout(() => {
    swap();
    wipe.classList.add('is-out');
  }, 240);
  setTimeout(() => {
    wipe.classList.remove('is-on', 'is-out');
    wiping = false;
  }, 620);
}

/* ============================================================================
   Modals
   ========================================================================== */

function openModal(id) {
  const m = $(id);
  if (!m) return;
  activeModal = id;
  m.classList.add('is-open');
  document.body.classList.add('modal-open');
  Audio2.play('open');
  const close = m.querySelector('.modal-x');
  if (close) { try { close.focus({ preventScroll: true }); } catch (e) {} }
  const body = m.querySelector('.modal-body');
  if (body) body.scrollTop = 0;
}

function closeModal(id) {
  const m = $(id || activeModal);
  if (!m) return;
  m.classList.remove('is-open');
  if (activeModal === m.id) activeModal = null;
  if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
  Audio2.play('close');
}

/* ============================================================================
   Case loop
   ========================================================================== */

function initGame(from) {
  clearHold();
  advancing = false;

  if (from && from.resume && save.resume) {
    currentIdx = save.resume.idx;
    score = save.resume.score;
    runResults = save.resume.results.slice(0, currentIdx);
  } else {
    currentIdx = 0;
    score = 0;
    runResults = [];
    save.resume = null;
    persist();
  }

  updateScore();
  showScreen('game-screen', { focus: false, after: () => loadQuestion() });
}

function clearHold() {
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
}

function loadQuestion() {
  if (currentIdx >= CASES.length) { endGame(); return; }

  isAnswering = true;
  advancing = false;
  const data = CASES[currentIdx];
  const sys = SYSTEMS[data.system] || SYSTEMS.comparative;

  /* ---- header readouts (level indicator text matches the original) ---- */
  $('level-indicator').textContent = (currentIdx + 1) + ' / ' + CASES.length;
  $('q-tag-text').textContent = data.tag;
  $('q-serial').textContent = 'SPECIMEN ' + String(currentIdx + 1).padStart(2, '0');
  $('question-text').textContent = data.q;

  $('q-tag-icon').src = ICON + sys.icon + '.png';
  $('hud-sys-icon').src = ICON + sys.icon + '.png';
  applySystemTokens($('game-screen'), sys);

  /* ---- anatomical plate: vector art, optionally replaced by a PNG ------ */
  const plate = $('organ-plate');
  const oldRaster = plate.querySelector('.art-raster');
  if (oldRaster) oldRaster.remove();
  const vec = $('organ-vector');
  vec.classList.remove('art-vector-hidden');
  vec.innerHTML = ORGAN_ART[data.system] || '';
  plate.setAttribute('data-art', 'organ-' + data.system);
  Assets.applyArt(plate);

  /* ---- reset feedback panel ------------------------------------------- */
  const fbBox = $('feedback-text');
  fbBox.className = 'feedback';
  $('game-screen').classList.remove('is-verdict');
  resetCountdown();

  /* ---- progress ------------------------------------------------------- */
  const percent = (currentIdx / CASES.length) * 100;
  $('progress-bar').style.width = percent + '%';
  renderProgressNodes();

  /* ---- options --------------------------------------------------------
     Presentation order is shuffled every time a case is loaded, so the
     answer cannot be memorised by position. `data-index` is the seat on
     screen (what the 1-4 keys address) and `data-origin` is the index in
     the source data (what is compared against `data.answer`) - the two are
     deliberately kept apart. */
  const optionsDiv = $('options-area');
  optionsDiv.innerHTML = '';
  currentOrder = shuffled(data.options.length);

  currentOrder.forEach((origin, seat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.setAttribute('data-index', String(seat));
    btn.setAttribute('data-origin', String(origin));
    btn.style.setProperty('--stagger', (seat * 60) + 'ms');

    const key = document.createElement('span');
    key.className = 'opt-key';
    key.textContent = 'ABCD'.charAt(seat);

    const text = document.createElement('span');
    text.className = 'opt-text';
    text.textContent = data.options[origin];

    const mark = document.createElement('span');
    mark.className = 'opt-mark';

    btn.appendChild(key);
    btn.appendChild(text);
    btn.appendChild(mark);
    onTap(btn, () => handleAnswer(origin, btn, data));
    optionsDiv.appendChild(btn);
  });

  /* Re-entry animation for the slide. */
  const box = $('question-box');
  box.classList.remove('is-in');
  void box.offsetWidth;
  box.classList.add('is-in');
}

function handleAnswer(selectedIndex, btn, data) {
  if (!isAnswering) return;
  isAnswering = false;

  const allBtns = $$('#options-area button');
  allBtns.forEach(b => { b.disabled = true; });

  const fbBox = $('feedback-text');
  const fbContent = $('feedback-content');
  const correct = selectedIndex === data.answer;

  if (correct) {
    btn.classList.add('is-correct');
    setMark(btn, 'check');
    fbContent.innerHTML = data.explanation;
    fbBox.className = 'feedback correct-feedback is-shown';
    $('fb-title').textContent = 'CONFIRMED';
    $('fb-icon').src = Assets.url('frog-correct') || (ICON + 'check.png');
    score++;
    runResults[currentIdx] = CORRECT;
    if (save.cases[currentIdx] !== CORRECT) save.cases[currentIdx] = CORRECT;
    Audio2.play('correct');
    FX.burstAt(btn, { colors: ['#a8f5b8', '#41e0d0', '#4ce87b', '#f2e6ff'], count: 26, speed: 240 });
    popScore();
  } else {
    btn.classList.add('is-wrong');
    setMark(btn, 'cross');
    /* Reveal the correct option so the explanation lands. Options are
       shuffled, so find it by its source index rather than by seat. */
    const right = allBtns.filter(b => b.getAttribute('data-origin') === String(data.answer))[0];
    if (right) { right.classList.add('is-answer'); setMark(right, 'check'); }
    fbContent.innerHTML = '<b>Incorrect.</b> ' + data.explanation;
    fbBox.className = 'feedback wrong-feedback is-shown';
    $('fb-title').textContent = 'RE-EXAMINE';
    $('fb-icon').src = Assets.url('frog-wrong') || (ICON + 'cross.png');
    runResults[currentIdx] = WRONG;
    if (save.cases[currentIdx] === UNSEEN) save.cases[currentIdx] = WRONG;
    Audio2.play('wrong');
    FX.burstAt(btn, { colors: ['#ff4f68', '#ff9bb0', '#7b1fa2'], count: 18, speed: 190, gravity: 420 });
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 420);
  }

  /* The plate has done its job once the verdict is in; folding it away keeps
     the explanation and NEXT button on screen without a scroll. */
  $('game-screen').classList.add('is-verdict');
  if (fbBox.scrollIntoView) {
    setTimeout(() => {
      try { fbBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {
        fbBox.scrollIntoView(false);
      }
    }, 60);
  }

  updateScore();
  renderProgressNodes();

  /* Saved mid-session position, so a closed WebView can pick up where it
     stopped. Cleared once the evaluation screen is reached. */
  save.resume = (currentIdx + 1 < CASES.length)
    ? { idx: currentIdx + 1, score: score, results: runResults.slice() }
    : null;
  persist();

  startCountdown();
  nextTimer = setTimeout(() => { nextTimer = null; advance(); }, HOLD_MS);
}

function setMark(btn, icon) {
  const mark = btn.querySelector('.opt-mark');
  if (!mark) return;
  mark.innerHTML = '';
  const img = new Image();
  img.src = ICON + icon + '.png';
  img.alt = '';
  img.width = 28;
  img.height = 28;
  mark.appendChild(img);
}

/** Single entry point for moving on; safe against a double tap. */
function advance() {
  if (advancing) return;
  advancing = true;
  clearHold();
  currentIdx++;
  loadQuestion();
}

/* Preserved from the original public surface. */
window.forceNext = function () {
  if (isAnswering) return;    /* nothing to skip until an answer is in */
  if (!$('game-screen').classList.contains('is-active')) return;
  Audio2.play('tap');
  advance();
};

function updateScore() {
  $('score').textContent = score;
}

function popScore() {
  const pod = document.querySelector('.hud-score');
  if (!pod) return;
  pod.classList.remove('is-pop');
  void pod.offsetWidth;
  pod.classList.add('is-pop');

  const plus = document.createElement('span');
  plus.className = 'score-plus';
  plus.textContent = '+1';
  pod.appendChild(plus);
  setTimeout(() => plus.remove(), 900);
}

/* --------------------------------------------------------- countdown visual */

const CD_CIRC = 2 * Math.PI * 16;

function resetCountdown() {
  const el = $('cd-fill');
  if (!el) return;
  el.style.transition = 'none';
  el.style.strokeDasharray = CD_CIRC.toFixed(2);
  el.style.strokeDashoffset = '0';
}

function startCountdown() {
  const el = $('cd-fill');
  if (!el) return;
  resetCountdown();
  void el.getBoundingClientRect();
  el.style.transition = 'stroke-dashoffset ' + (HOLD_MS / 1000) + 's linear';
  el.style.strokeDashoffset = CD_CIRC.toFixed(2);
}

/* ------------------------------------------------------------ progress dots */

function renderProgressNodes() {
  const wrap = $('progress-nodes');
  if (!wrap) return;
  if (wrap.children.length !== CASES.length) {
    wrap.innerHTML = '';
    for (let i = 0; i < CASES.length; i++) {
      const n = document.createElement('span');
      n.className = 'pnode';
      wrap.appendChild(n);
    }
  }
  for (let i = 0; i < CASES.length; i++) {
    const n = wrap.children[i];
    n.className = 'pnode';
    if (runResults[i] === CORRECT) n.classList.add('is-correct');
    else if (runResults[i] === WRONG) n.classList.add('is-wrong');
    if (i === currentIdx) n.classList.add('is-current');
  }
}

/* ============================================================================
   Evaluation
   ========================================================================== */

function endGame() {
  clearHold();
  const total = CASES.length;
  const rank = rankFor(score);

  save.runs++;
  if (score > save.best) save.best = score;
  save.resume = null;
  persist();

  $('end-title').textContent = rank.title;
  $('end-title').style.color = rank.color;
  $('end-message').innerHTML = rank.message
    .replace('{score}', score)
    .replace('{total}', total);

  $('result-score').textContent = score + '/' + total;
  $('result-accuracy').textContent = Math.round((score / total) * 100) + '%';
  $('result-best').textContent = save.best + '/' + total;
  $('progress-bar').style.width = '100%';

  const row = $('star-row');
  row.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const img = new Image();
    img.src = ICON + (i < rank.stars ? 'star-filled' : 'star-empty') + '.png';
    img.alt = '';
    img.width = 54;
    img.height = 54;
    img.className = 'rank-star' + (i < rank.stars ? ' is-lit' : '');
    img.style.setProperty('--stagger', (i * 160) + 'ms');
    row.appendChild(img);
  }

  const crest = document.querySelector('.crest');
  if (crest) {
    crest.style.setProperty('--crest-color', rank.color);
    crest.style.setProperty('--crest-soft', rank.soft);
  }

  showScreen('end-screen', {
    after: () => {
      Audio2.play('rank');
      if (rank.stars >= 2) FX.celebrate();
      const c = document.querySelector('.crest-img');
      if (c) FX.burstAt(c, { colors: ['#ffc94d', '#e040fb', '#a8f5b8'], count: 34, speed: 280, ringR: 150 });
      refreshMenuStats();
    }
  });
}

/* ============================================================================
   Dossier
   ========================================================================== */

function renderDossier() {
  const grid = $('dossier-grid');
  grid.innerHTML = '';
  save.cases.forEach((state, i) => {
    const data = CASES[i];
    const sys = SYSTEMS[data.system] || SYSTEMS.comparative;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'dnode';
    applySystemTokens(node, sys);
    node.style.setProperty('--stagger', (i * 45) + 'ms');

    let statusIcon = 'lock';
    if (state === CORRECT) { node.classList.add('is-correct'); statusIcon = 'check'; }
    else if (state === WRONG) { node.classList.add('is-wrong'); statusIcon = 'cross'; }
    else node.classList.add('is-unseen');

    node.innerHTML =
      '<span class="dnode-no">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="dnode-dish"><img src="' + ICON + sys.icon + '.png" alt="" width="40" height="40"></span>' +
      '<span class="dnode-name">' + data.subject + '</span>' +
      '<span class="dnode-sys">' + sys.label + '</span>' +
      '<span class="dnode-flag"><img src="' + ICON + statusIcon + '.png" alt="" width="22" height="22"></span>';

    if (state === UNSEEN) {
      node.disabled = true;
      node.setAttribute('aria-disabled', 'true');
    } else {
      onTap(node, () => openReview(i));
    }
    grid.appendChild(node);
  });

  const mastered = save.cases.filter(c => c === CORRECT).length;
  $('dossier-mastered').textContent = mastered;
  $('dossier-best').textContent = save.best;
  $('dossier-runs').textContent = save.runs;
}

function openReview(i) {
  const data = CASES[i];
  const sys = SYSTEMS[data.system] || SYSTEMS.comparative;
  $('review-title').textContent = 'CASE ' + String(i + 1).padStart(2, '0');
  $('review-icon').src = ICON + sys.icon + '.png';
  $('review-tag-text').textContent = data.tag;
  $('review-q').textContent = data.q;
  $('review-a').textContent = data.options[data.answer];
  $('review-e').innerHTML = data.explanation;
  applySystemTokens($('review-modal').querySelector('.modal-card'), sys);
  openModal('review-modal');
}

/* ============================================================================
   Menu / reference panel
   ========================================================================== */

function refreshMenuStats() {
  const mastered = save.cases.filter(c => c === CORRECT).length;
  $('menu-best').textContent = save.best;
  $('menu-mastered').textContent = mastered + '/' + CASES.length;

  const line = $('menu-rank-line');
  if (save.runs > 0) {
    const rank = rankFor(save.best);
    line.innerHTML = 'Best standing: <b style="color:' + rank.color + '">' +
      rank.title.replace('Diagnosis: ', '') + '</b> &middot; ' + save.runs +
      (save.runs === 1 ? ' session logged' : ' sessions logged');
  } else {
    line.textContent = 'No sessions logged yet.';
  }

  const resumeBtn = $('resume-btn');
  if (save.resume) {
    resumeBtn.classList.remove('hidden');
    $('resume-num').textContent = save.resume.idx + 1;
    $('start-label').textContent = 'NEW SIMULATION';
  } else {
    resumeBtn.classList.add('hidden');
    $('start-label').textContent = 'ENTER SIMULATION';
  }
}

function buildReference() {
  const wrap = $('learn-sections');
  if (!wrap || wrap.children.length) return;
  REFERENCE.forEach((sec, i) => {
    const block = document.createElement('section');
    block.className = 'ref-block';
    block.style.setProperty('--stagger', (i * 40) + 'ms');
    block.innerHTML =
      '<h3 class="ref-head"><img src="' + ICON + sec.icon + '.png" alt="" width="30" height="30">' +
      '<span>' + sec.heading + '</span></h3>' +
      '<div class="ref-body">' + sec.body + '</div>';
    wrap.appendChild(block);
  });
}

/* ============================================================================
   Settings
   ========================================================================== */

function applySettings() {
  Audio2.musicOn = save.settings.music;
  Audio2.sfxOn = save.settings.sfx;
  Audio2.setMusic(save.settings.music);
  Audio2.setSfx(save.settings.sfx);
  FX.setReducedMotion(!save.settings.motion);
  document.body.classList.toggle('reduced-motion', !save.settings.motion);
  syncSettingUI();
}

function syncSettingUI() {
  const s = save.settings;

  const musicSrc = ICON + (s.music ? 'music-on' : 'music-off') + '.png';
  const sfxSrc = ICON + (s.sfx ? 'sound-on' : 'sound-off') + '.png';
  $('music-icon').src = musicSrc;
  $('music-icon').alt = s.music ? 'Music on' : 'Music off';
  $('set-music-icon').src = musicSrc;
  $('sfx-icon').src = sfxSrc;
  $('sfx-icon').alt = s.sfx ? 'Sound on' : 'Sound off';
  $('set-sfx-icon').src = sfxSrc;

  $('music-toggle').setAttribute('aria-pressed', String(s.music));
  $('sfx-toggle').setAttribute('aria-pressed', String(s.sfx));
  $('music-toggle').classList.toggle('is-off', !s.music);
  $('sfx-toggle').classList.toggle('is-off', !s.sfx);

  [['set-music', s.music], ['set-sfx', s.sfx], ['set-motion', s.motion]].forEach(([id, on]) => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle('is-on', !!on);
    el.setAttribute('aria-checked', String(!!on));
  });
}

function toggleSetting(key) {
  save.settings[key] = !save.settings[key];
  persist();
  applySettings();
  Audio2.play(save.settings[key] ? 'confirm' : 'close');
}

/* ============================================================================
   Boot
   ========================================================================== */

const BOOT_LINES = [
  'CALIBRATING OPTICS',
  'LOADING SPECIMEN PLATES',
  'PRIMING BILE ASSAY',
  'LAB READY'
];

function boot() {
  loadSave();
  buildReference();
  FX.init();
  applySettings();
  refreshMenuStats();
  renderProgressNodes();

  const fill = $('boot-fill');
  const status = $('boot-status');
  let shown = 0;

  const t0 = performance.now();
  Assets.preload((p) => {
    fill.style.width = Math.round(p * 100) + '%';
    const idx = Math.min(BOOT_LINES.length - 1, Math.floor(p * BOOT_LINES.length));
    if (idx !== shown) { shown = idx; status.textContent = BOOT_LINES[idx]; }
  }).then(() => {
    fill.style.width = '100%';
    status.textContent = BOOT_LINES[BOOT_LINES.length - 1];
    /* Hold the splash briefly so the boot never flashes past. */
    const wait = Math.max(0, 1100 - (performance.now() - t0));
    setTimeout(enterMenu, wait);
  });
}

/** Leave the splash for the menu. Idempotent - the tap-to-skip shares it. */
function enterMenu() {
  if (booted) return;
  booted = true;
  Assets.hydrateAll(document);
  Assets.publishSkins();
  /* An optional idle-frog painting stands in for the menu mark. */
  const idle = Assets.url('frog-idle');
  if (idle) {
    const mark = document.querySelector('.title-frog');
    if (mark) mark.src = idle;
  }
  refreshMenuStats();
  showScreen('menu-screen');
}

/* ============================================================================
   Wiring
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* --- menu ----------------------------------------------------------- */
  onTap($('start-game-btn'), () => { Audio2.play('confirm'); initGame(); });
  onTap($('resume-btn'), () => { Audio2.play('confirm'); initGame({ resume: true }); });
  onTap($('howto-btn'), () => openModal('howto-modal'));
  onTap($('settings-btn'), () => openModal('settings-modal'));
  onTap($('dossier-btn'), () => {
    renderDossier();
    showScreen('dossier-screen');
  });

  /* --- game ----------------------------------------------------------- */
  onTap($('next-btn'), () => window.forceNext());

  /* --- dossier -------------------------------------------------------- */
  onTap($('dossier-back'), () => {
    refreshMenuStats();
    showScreen(document.body.getAttribute('data-from-end') === '1' ? 'end-screen' : 'menu-screen');
    document.body.removeAttribute('data-from-end');
  });
  onTap($('dossier-reset'), () => {
    save.best = 0;
    save.runs = 0;
    save.resume = null;
    save.cases = new Array(CASES.length).fill(UNSEEN);
    persist();
    renderDossier();
    refreshMenuStats();
    Audio2.play('close');
  });

  /* --- results -------------------------------------------------------- */
  onTap($('restart-game-btn'), () => { Audio2.play('confirm'); initGame(); });
  onTap($('learn-btn'), () => openModal('learn-modal'));
  onTap($('result-menu-btn'), () => { refreshMenuStats(); showScreen('menu-screen'); });
  onTap($('result-dossier-btn'), () => {
    document.body.setAttribute('data-from-end', '1');
    renderDossier();
    showScreen('dossier-screen');
  });

  /* --- rail + settings ------------------------------------------------ */
  onTap($('music-toggle'), () => toggleSetting('music'));
  onTap($('sfx-toggle'), () => toggleSetting('sfx'));
  onTap($('rail-settings'), () => openModal('settings-modal'));
  onTap($('set-music'), () => toggleSetting('music'));
  onTap($('set-sfx'), () => toggleSetting('sfx'));
  onTap($('set-motion'), () => toggleSetting('motion'));

  /* --- modal dismissal ------------------------------------------------ */
  $$('[data-close]').forEach(btn => onTap(btn, () => closeModal(btn.getAttribute('data-close'))));
  $$('.modal').forEach(m => {
    m.addEventListener('pointerdown', (e) => { if (e.target === m) closeModal(m.id); });
  });

  /* --- keyboard ------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeModal) { closeModal(activeModal); e.preventDefault(); }
      return;
    }
    if (activeModal) return;
    if (!$('game-screen').classList.contains('is-active')) return;

    if (e.key >= '1' && e.key <= '4') {
      const seat = Number(e.key) - 1;
      const btn = document.querySelector('#options-area button[data-index="' + seat + '"]');
      if (btn && !btn.disabled && isAnswering) {
        Audio2.unlock();
        /* The key picks a seat; the seat knows which source option it holds. */
        handleAnswer(Number(btn.getAttribute('data-origin')), btn, CASES[currentIdx]);
      }
      e.preventDefault();
    } else if (e.key === 'Enter' && !isAnswering) {
      window.forceNext();
      e.preventDefault();
    }
  });

  /* --- WebView lifecycle ---------------------------------------------- */
  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden;
    Audio2.setSuspended(hidden);
    if (hidden) FX.stop(); else FX.start();
  });

  /* Kill pinch-zoom, double-tap zoom, long-press menus and rubber-band
     scrolling inside the WebView without disturbing button handling. */
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  /* First gesture anywhere starts the audio graph. */
  const kick = () => { Audio2.unlock(); };
  window.addEventListener('pointerdown', kick, { once: true });
  window.addEventListener('keydown', kick, { once: true });

  /* Tapping the splash skips the remaining hold. */
  onTap($('boot-screen'), enterMenu);

  boot();
});
