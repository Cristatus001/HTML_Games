/* ============================================================
   SET GARDEN — Difference of Sets
   Pure vanilla JS. Fully offline. Mouse + touch parity.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Short helpers ---------- */
  const $  = (id) => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  /* ============================================================
     STORAGE / PROGRESS
     ============================================================ */
  const SAVE_KEY = 'setGarden.v1';
  const DEFAULTS = {
    sound: true,
    tutAB: false, tutBA: false,
    bestStreak: 0, totalHarvested: 0,
    practiceAB: 0, practiceBA: 0
  };
  let progress = load();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULTS);
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  /* ============================================================
     AUDIO (synthesized — no external files)
     ============================================================ */
  let actx = null;
  function ac() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, delay) {
    if (!progress.sound) return;
    const a = ac(); if (!a) return;
    type = type || 'sine'; vol = vol || 0.2; delay = delay || 0;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  const snd = {
    pop:    () => tone(680, 0.12, 'triangle', 0.16),
    place:  () => tone(520, 0.10, 'sine', 0.14),
    correct:() => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.30, 'triangle', 0.18, i * 0.09)),
    wrong:  () => { tone(220, 0.22, 'sawtooth', 0.12); tone(160, 0.28, 'sawtooth', 0.10, 0.07); },
    click:  () => tone(440, 0.07, 'square', 0.10),
    unlock: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.32, 'sine', 0.16, i * 0.1))
  };

  /* ---------- Gentle ambient background music (synthesized loop) ---------- */
  // Soft I–V–vi–IV progression (C major) with a light bell arpeggio on top.
  const MUSIC_CHORDS = [
    [130.81, 164.81, 196.00], // C  (C3 E3 G3)
    [196.00, 246.94, 293.66], // G  (G3 B3 D4)
    [220.00, 261.63, 329.63], // Am (A3 C4 E4)
    [174.61, 220.00, 261.63]  // F  (F3 A3 C4)
  ];
  let musicGain = null, musicTimer = null, musicStep = 0;

  function musicNote(freq, dur, type, peak, attack) {
    const a = ac(); if (!a || !musicGain) return;
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function musicTick() {
    if (!progress.sound || !musicGain) return;
    const chord = MUSIC_CHORDS[Math.floor(musicStep / 4) % MUSIC_CHORDS.length];
    if (musicStep % 4 === 0) {                 // soft pad chord every 4 beats
      chord.forEach((f) => musicNote(f, 3.8, 'sine', 0.09, 0.9));
    }
    const bell = chord[musicStep % chord.length] * 2; // arpeggio, one octave up
    musicNote(bell, 1.3, 'triangle', 0.05, 0.02);
    musicStep++;
  }
  function startMusic() {
    if (musicTimer || !progress.sound) return;
    const a = ac(); if (!a) return;
    musicGain = a.createGain();
    musicGain.gain.setValueAtTime(0.0001, a.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.9, a.currentTime + 2.2); // gentle fade-in
    musicGain.connect(a.destination);
    musicStep = 0;
    musicTick();
    musicTimer = setInterval(musicTick, 720);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (musicGain) {
      const g = musicGain, a = ac();
      try { g.gain.cancelScheduledValues(a.currentTime); g.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.4); } catch (e) {}
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 600);
      musicGain = null;
    }
  }

  /* ============================================================
     OPTIONAL IMAGE ASSETS (graceful fallback to CSS/vector art)
     ============================================================ */
  const decorImg = {}, decorPath = {};
  const tokenImg = {}, tokenPath = {};

  function tryImg(path, onOk) {
    const img = new Image();
    img.onload = () => onOk(path);
    img.onerror = () => {}; // silently keep vector art
    img.src = path;
  }
  // Elements flagged with data-img (backgrounds/ui): swap in image if present.
  function applyStaticImages() {
    document.querySelectorAll('[data-img]').forEach((el) => {
      const path = 'assets/images/' + el.getAttribute('data-img');
      tryImg(path, (p) => {
        el.style.backgroundImage = 'url("' + p + '")';
        el.classList.add('has-img');
      });
    });
  }
  // Dynamic elements (tokens, leaves): remember which files exist.
  function preloadDynamicImages() {
    // Both sets use the same fruit artwork — only the plot tells them apart.
    tryImg('assets/images/tokens/apple.png', (p) => {
      tokenImg.a = tokenImg.b = true;
      tokenPath.a = tokenPath.b = p;
    });
    tryImg('assets/images/decor/leaf.png',   (p) => { decorImg.leaf = true; decorPath.leaf = p; });
  }

  /* ============================================================
     BACKGROUND — drifting leaves (decorative, no hitboxes)
     ============================================================ */
  const leavesEl = $('leaves');
  function spawnLeaf() {
    if (document.hidden) return;
    const l = document.createElement('div');
    const t = ['', 'p', 'y'][rand(0, 2)];
    l.className = 'leaf ' + t;
    const size = rand(12, 26);
    l.style.width = size + 'px';
    l.style.height = size + 'px';
    l.style.left = rand(0, 100) + 'vw';
    l.style.setProperty('--dx', rand(-90, 90) + 'px');
    const dur = rand(8, 16);
    l.style.animation = 'fall ' + dur + 's linear forwards';
    if (decorImg.leaf) {
      l.style.background = 'transparent';
      l.style.backgroundImage = 'url("' + decorPath.leaf + '")';
      l.style.backgroundSize = 'contain';
      l.style.backgroundRepeat = 'no-repeat';
      l.style.borderRadius = '0';
    }
    leavesEl.appendChild(l);
    setTimeout(() => l.remove(), dur * 1000 + 300);
  }

  /* ============================================================
     PARTICLE BURSTS
     ============================================================ */
  const fx = $('fx');
  function burst(x, y, n) {
    n = n || 26;
    const colors = ['#38a85a', '#66d182', '#e65d92', '#ff90ba', '#ffcb45', '#fff'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[i % colors.length];
      p.style.borderRadius = (i % 2) ? '50%' : '0 100% 0 100%';
      fx.appendChild(p);
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 40;
      p.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + (dy + 200) + 'px) rotate(' + (Math.random() * 720) + 'deg) scale(.3)', opacity: 0 }
      ], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' })
       .onfinish = () => p.remove();
    }
  }
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ============================================================
     NAVIGATION
     ============================================================ */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    const app = $('app'); if (app) app.scrollTop = 0;
  }
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => { snd.click(); show(b.getAttribute('data-nav')); if (b.getAttribute('data-nav') === 'levels-screen') renderLevels(); });
  });

  /* ============================================================
     LEVELS
     ============================================================ */
  const LEVELS = [
    { id: 'tut-ab',  type: 'tutorial', op: 'A-B', emoji: '🍏', title: 'Learn A − B',    tier: 'Tutorial',    card: 'a-card' },
    { id: 'tut-ba',  type: 'tutorial', op: 'B-A', emoji: '🍒', title: 'Learn B − A',    tier: 'Tutorial',    card: 'b-card' },
    { id: 'prac-ab', type: 'practice', op: 'A-B', emoji: '🧺', title: 'Practice A − B', tier: 'Green Patch', card: 'a-card', need: 'tutAB' },
    { id: 'prac-ba', type: 'practice', op: 'B-A', emoji: '🧺', title: 'Practice B − A', tier: 'Berry Patch', card: 'b-card', need: 'tutBA' }
  ];

  function levelDone(lv) {
    if (lv.id === 'tut-ab') return progress.tutAB;
    if (lv.id === 'tut-ba') return progress.tutBA;
    return false;
  }
  function levelLocked(lv) { return lv.need && !progress[lv.need]; }

  function renderLevels() {
    const grid = $('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lv) => {
      const card = document.createElement('div');
      card.className = 'level-card ' + lv.card + (levelLocked(lv) ? ' locked' : '');
      let sub = lv.type === 'tutorial' ? 'Guided example' :
        (lv.op === 'A-B' ? (progress.practiceAB + ' solved') : (progress.practiceBA + ' solved'));
      card.innerHTML =
        '<span class="lc-emoji">' + lv.emoji + '</span>' +
        '<div class="lc-title">' + lv.title + '</div>' +
        '<div class="lc-sub">' + sub + '</div>' +
        '<span class="tier">' + lv.tier + '</span>' +
        (levelDone(lv) ? '<span class="lc-badge">⭐</span>' : '');
      if (!levelLocked(lv)) {
        card.addEventListener('click', () => { snd.click(); startLevel(lv); });
      }
      grid.appendChild(card);
    });

    const stats = $('stats-row');
    stats.innerHTML =
      '<div class="stat-chip">🍎 Harvested: <b>' + progress.totalHarvested + '</b></div>' +
      '<div class="stat-chip">🌿 Best streak: <b>' + progress.bestStreak + '</b></div>';
  }

  /* ============================================================
     GAME STATE + PROBLEMS
     ============================================================ */
  const state = {
    level: null, op: 'A-B', mode: 'tutorial',
    problem: null,
    userSet: [],           // [{ v, set }]
    sessionHarvest: 0, streak: 0
  };

  const TUTORIAL = {
    setA: ['1', '2', '3', '4', '5', '6'],
    setB: ['2', '4', '6', '8'],
    differenceAB: ['1', '3', '5'],
    intersection: ['2', '4', '6'],
    differenceBA: ['8']
  };

  function randSet(size, min, max) {
    const s = new Set();
    while (s.size < size) s.add(String(rand(min, max)));
    return Array.from(s);
  }
  function genProblem(op) {
    let a, b, dab, dba, inter, target, guard = 0;
    do {
      a = randSet(rand(4, 6), 1, 12);
      b = randSet(rand(4, 6), 1, 12);
      dab = a.filter((x) => b.indexOf(x) === -1);
      dba = b.filter((x) => a.indexOf(x) === -1);
      inter = a.filter((x) => b.indexOf(x) !== -1);
      target = (op === 'A-B') ? dab : dba;
      guard++;
    } while ((target.length < 1 || target.length > 5 || inter.length < 1) && guard < 60);
    return { setA: a, setB: b, differenceAB: dab, intersection: inter, differenceBA: dba };
  }

  function correctSet() {
    return state.op === 'A-B' ? state.problem.differenceAB : state.problem.differenceBA;
  }
  function sameSet(userVals, correct) {
    if (userVals.length !== correct.length) return false;
    const s = userVals.slice().sort();
    const c = correct.slice().sort();
    return s.every((v, i) => v === c[i]);
  }

  /* ============================================================
     TOKENS + DRAG/DROP (mouse + touch unified via Pointer Events)
     ============================================================ */
  const plotA = $('plot-a'), plotB = $('plot-b'), basket = $('basket'), basketHint = $('basket-hint');

  function makeToken(value, setName, inBasket) {
    const el = document.createElement('div');
    el.className = 'token ' + (setName === 'B' ? 'b' : 'a') + (inBasket ? ' in-basket' : '') + ' pop';
    el.textContent = value;
    el.dataset.value = value;
    el.dataset.set = setName;
    const key = setName === 'B' ? 'b' : 'a';
    if (tokenImg[key]) {
      el.style.backgroundImage = 'url("' + tokenPath[key] + '")';
      el.classList.add('has-img');
    }
    setTimeout(() => el.classList.remove('pop'), 340);
    return el;
  }

  function renderSets() {
    plotA.innerHTML = ''; plotB.innerHTML = '';
    state.problem.setA.forEach((v) => {
      const t = makeToken(v, 'A', false);
      attachDrag(t, v, 'A');
      plotA.appendChild(t);
    });
    state.problem.setB.forEach((v) => {
      const t = makeToken(v, 'B', false);
      attachDrag(t, v, 'B');
      plotB.appendChild(t);
    });
  }

  function renderBasket() {
    basket.innerHTML = '';
    if (state.userSet.length === 0) {
      basket.appendChild(basketHint);
      basketHint.style.display = '';
      return;
    }
    basketHint.style.display = 'none';
    state.userSet.forEach((u) => {
      const t = makeToken(u.v, u.set, true);
      t.addEventListener('click', () => removeFromBasket(u.v, t));
      basket.appendChild(t);
    });
  }

  function addToBasket(value, setName) {
    if (state.userSet.some((u) => u.v === value)) return;
    state.userSet.push({ v: value, set: setName });
    renderBasket();
    snd.place();
    const c = centerOf(basket);
    burst(c.x, c.y, 8);
  }
  function removeFromBasket(value, el) {
    snd.pop();
    el.classList.add('removing');
    setTimeout(() => {
      state.userSet = state.userSet.filter((u) => u.v !== value);
      renderBasket();
    }, 200);
  }

  function overBasket(x, y) {
    const r = basket.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function attachDrag(el, value, setName) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      ac(); // unlock audio on first interaction
      const startX = e.clientX, startY = e.clientY;
      let moved = false, ghost = null;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}

      const onMove = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 8) {
          moved = true;
          ghost = el.cloneNode(true);
          ghost.className += ' drag-ghost';
          ghost.style.width = el.offsetWidth + 'px';
          ghost.style.height = el.offsetHeight + 'px';
          document.body.appendChild(ghost);
          el.style.opacity = '0.3';
        }
        if (moved && ghost) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          basket.classList.toggle('drag-over', overBasket(ev.clientX, ev.clientY));
        }
      };
      const onUp = (ev) => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        el.style.opacity = '';
        basket.classList.remove('drag-over');
        if (ghost) { ghost.remove(); ghost = null; }
        // Drag onto basket, OR a simple tap (no movement) both add the fruit.
        if (!moved || overBasket(ev.clientX, ev.clientY)) {
          addToBasket(value, setName);
        }
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  /* ============================================================
     LEVEL FLOW
     ============================================================ */
  function startLevel(lv) {
    state.level = lv;
    state.op = lv.op;
    state.mode = lv.type;
    state.userSet = [];
    state.problem = (lv.type === 'tutorial') ? TUTORIAL : genProblem(lv.op);

    $('hud-title').textContent = (lv.type === 'tutorial' ? 'Learn: ' : 'Practice: ') + lv.op.replace('-', ' − ');
    $('harvest-eq').textContent = lv.op.replace('-', ' − ');

    const inText = lv.op === 'A-B'
      ? 'in <strong>A</strong> but <strong>not</strong> in B'
      : 'in <strong>B</strong> but <strong>not</strong> in A';
    $('game-instruction').innerHTML =
      'Harvest the fruit that belongs to <strong>' + lv.op.replace('-', ' − ') +
      '</strong> &mdash; the ones ' + inText + '.';

    // reset views
    $('play-area').style.display = '';
    $('venn-area').style.display = 'none';
    resetVenn();
    renderSets();
    renderBasket();
    updateHud();
    show('game-screen');
  }

  function updateHud() {
    $('hud-score').querySelector('span').textContent = state.sessionHarvest;
    $('hud-streak').querySelector('span').textContent = state.streak;
  }

  function onValidate() {
    ac();
    const correct = correctSet();
    const userVals = state.userSet.map((u) => u.v);

    if (sameSet(userVals, correct)) {
      // success
      state.streak++;
      state.sessionHarvest += correct.length;
      progress.totalHarvested += correct.length;
      if (state.streak > progress.bestStreak) progress.bestStreak = state.streak;

      let unlocked = false;
      if (state.mode === 'tutorial') {
        if (state.op === 'A-B' && !progress.tutAB) { progress.tutAB = true; unlocked = true; }
        if (state.op === 'B-A' && !progress.tutBA) { progress.tutBA = true; unlocked = true; }
      } else {
        if (state.op === 'A-B') progress.practiceAB++; else progress.practiceBA++;
      }
      save();
      updateHud();

      basket.classList.add('flash-good');
      setTimeout(() => basket.classList.remove('flash-good'), 500);
      const c = centerOf(basket);
      burst(c.x, c.y, 30);
      snd.correct();

      const msg = state.mode === 'tutorial'
        ? 'Wonderful! You harvested ' + state.op.replace('-', ' − ') + ' perfectly.'
        : 'Sweet harvest! Streak: ' + state.streak + ' 🌿';
      state._pendingUnlock = unlocked;
      showModal('good', '🎉', 'Correct!', msg, () => revealVenn());
    } else {
      // failure
      state.streak = 0;
      updateHud();
      basket.classList.add('shake');
      setTimeout(() => basket.classList.remove('shake'), 420);
      snd.wrong();
      const hint = state.op === 'A-B'
        ? 'Remember: A − B means "in A, but NOT in B". Leave out anything that also grows in B.'
        : 'Remember: B − A means "in B, but NOT in A". Leave out anything that also grows in A.';
      showModal('bad', '🌧️', 'Not quite!', hint, null);
    }
  }

  /* ============================================================
     VENN
     ============================================================ */
  const shadeAB = $('shade-a-minus-b'), shadeBA = $('shade-b-minus-a');
  function resetVenn() {
    shadeAB.style.transition = 'none'; shadeBA.style.transition = 'none';
    shadeAB.style.opacity = '0'; shadeBA.style.opacity = '0';
  }
  function fillVenn() {
    const p = state.problem;
    const put = (host, arr) => {
      host.innerHTML = '';
      arr.forEach((v) => { const s = document.createElement('span'); s.className = 'venn-el'; s.textContent = v; host.appendChild(s); });
    };
    put($('venn-a'), p.differenceAB);
    put($('venn-i'), p.intersection);
    put($('venn-b'), p.differenceBA);
  }
  function revealVenn() {
    $('play-area').style.display = 'none';
    $('venn-area').style.display = '';
    $('venn-title').textContent = state.op === 'A-B'
      ? 'Green pond A − B is highlighted 🟢'
      : 'Berry pond B − A is highlighted 🔴';
    fillVenn();
    resetVenn();
    // animate the correct region in
    const target = state.op === 'A-B' ? shadeAB : shadeBA;
    requestAnimationFrame(() => {
      target.style.transition = 'opacity 0.9s ease-in-out 0.15s';
      target.style.opacity = '1';
    });
    if (state._pendingUnlock) {
      state._pendingUnlock = false;
      setTimeout(() => { snd.unlock(); toast('🔓 Practice patch unlocked!'); }, 500);
    }
    $('app').scrollTop = 0;
  }

  /* ============================================================
     MODAL + TOAST + INFO
     ============================================================ */
  const modalBack = $('modal-back');
  let modalCb = null;
  function showModal(kind, emoji, title, html, cb) {
    const m = $('modal');
    m.className = 'modal ' + (kind || '');
    $('modal-emoji').textContent = emoji;
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = '<p id="modal-text">' + html + '</p>';
    $('modal-ok').textContent = 'OK';
    modalCb = cb;
    modalBack.classList.add('show');
  }
  $('modal-ok').addEventListener('click', () => {
    snd.click();
    modalBack.classList.remove('show');
    const cb = modalCb; modalCb = null;
    if (cb) cb();
  });

  function toast(text) {
    const t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);' +
      'background:#2b8145;color:#fff;font-weight:800;padding:12px 20px;border-radius:16px;' +
      'box-shadow:0 8px 20px rgba(0,0,0,.3);z-index:600;font-family:Nunito,sans-serif;';
    document.body.appendChild(t);
    t.animate([{ opacity: 0, transform: 'translate(-50%,20px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 250, fill: 'forwards' });
    setTimeout(() => { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => t.remove(); }, 2000);
  }

  // Main-menu "How to Play" — gameplay instructions only.
  const HOWTO_HTML =
    '<div class="modal-scroll">' +
      '<p>Two garden plots contain the elements of <strong>Set A</strong> 🍏 and <strong>Set B</strong> 🍏.</p>' +
      '<p><strong>Each fruit represents one element of a set.</strong></p>' +
      '<p><strong>Drag</strong> — or simply <strong>tap</strong> — the correct fruit into the <strong>Harvest Basket</strong> 🧺, then press <strong>Check Harvest</strong>.</p>' +
      '<p>For <strong>A − B</strong>, pick the fruit that is in A but <strong>not</strong> in B. For <strong>B − A</strong>, pick the fruit in B but <strong>not</strong> in A.</p>' +
      '<p><strong>Clear</strong> empties the basket, or tap a fruit inside the basket to put it back.</p>' +
      '<p>Finish the two tutorials to unlock endless <strong>practice patches</strong>, then grow your harvest and streak!</p>' +
    '</div>';
  // Result-screen "Learn More" — the concept, notation and worked examples.
  const LEARN_HTML =
    '<div class="modal-scroll">' +
      '<h4>Difference of Sets</h4>' +
      '<p>The <strong>difference</strong> of sets A and B (in that order) is the set of elements that belong to A but <strong>not</strong> to B.</p>' +
      '<p>We write it <strong>A − B</strong> and read it "A minus B".</p>' +
      '<div class="eqbox">A − B = { x : x ∈ A and x ∉ B }</div>' +
      '<h4>Examples</h4>' +
      '<p>Let A = { 1, 2, 3, 4, 5, 6 } and B = { 2, 4, 6, 8 }.</p>' +
      '<div class="eqbox">A − B = { 1, 3, 5 }</div>' +
      '<p>(the elements in A but not in B)</p>' +
      '<div class="eqbox">B − A = { 8 }</div>' +
      '<p>(the elements in B but not in A)</p>' +
    '</div>';
  function showInfoModal(emoji, title, html) {
    $('modal').className = 'modal';
    $('modal-emoji').textContent = emoji;
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = html;
    modalCb = null;
    modalBack.classList.add('show');
  }
  function showHowTo()    { showInfoModal('🌻', 'How to Play', HOWTO_HTML); }
  function showLearnMore(){ showInfoModal('📖', 'Learn More', LEARN_HTML); }

  /* ============================================================
     WIRING
     ============================================================ */
  $('btn-play').addEventListener('click', () => { snd.click(); startMusic(); renderLevels(); show('levels-screen'); });
  $('btn-howto').addEventListener('click', () => { snd.click(); showHowTo(); });
  $('btn-learnmore').addEventListener('click', () => { snd.click(); showLearnMore(); });

  $('btn-clear').addEventListener('click', () => { snd.click(); state.userSet = []; renderBasket(); });
  $('btn-validate').addEventListener('click', onValidate);
  $('btn-next').addEventListener('click', () => {
    snd.click();
    if (state.mode === 'tutorial') { renderLevels(); show('levels-screen'); }
    else { startLevel(state.level); } // fresh random practice problem
  });

  function updateSoundLabels() {
    $('btn-sound').textContent = progress.sound ? '🔊 Sound: On' : '🔇 Sound: Off';
    $('hud-sound').textContent = progress.sound ? '🔊' : '🔇';
  }
  function toggleSound() {
    progress.sound = !progress.sound; save(); updateSoundLabels();
    if (progress.sound) { snd.click(); startMusic(); }
    else stopMusic();
  }
  $('btn-sound').addEventListener('click', toggleSound);
  $('hud-sound').addEventListener('click', () => { snd.click(); toggleSound(); });

  /* ---------- Prevent zoom / gesture / context menu (WebView) ---------- */
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault(); // block pinch-zoom
  }, { passive: false });
  // block double-tap zoom
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    applyStaticImages();
    preloadDynamicImages();
    updateSoundLabels();
    // ambient leaves
    for (let i = 0; i < 4; i++) setTimeout(spawnLeaf, i * 400);
    setInterval(spawnLeaf, 1500);
    // boot -> menu
    setTimeout(() => show('menu-screen'), 1700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
