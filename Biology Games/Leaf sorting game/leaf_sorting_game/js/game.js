/* =============================================================================
   Leaf Sorter — game logic
   Core loop is the original one: a specimen is presented, the player files it
   into the SIMPLE or COMPOUND tray, score / total are tracked and feedback
   names the correct type. Everything else here is packaging: screens, levels,
   saved progress, pointer input, feedback juice.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.LeafData;
  var A = global.LeafAudio;
  var FX = global.LeafFx;

  var ICON = 'assets/images/ui/emoji/';
  var LEAF_IMG = 'assets/images/leaves/';
  var SAVE_KEY = 'leafSorter.v1';
  var MAX_STARS = D.LEVELS.length * 3;

  /* ------------------------------------------------------------------ utils */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (html !== undefined) { n.innerHTML = html; }
    return n;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Unified tap binding. Pointer Events cover mouse / touch / stylus and fire
     first; the click listener is the keyboard (Enter / Space) path and is
     suppressed when a pointer already handled the same activation.           */
  function onTap(node, fn) {
    var handled = 0;
    node.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      var r = node.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right ||
          e.clientY < r.top || e.clientY > r.bottom) { return; }
      handled = Date.now();
      fn(e);
    });
    node.addEventListener('click', function (e) {
      if (Date.now() - handled < 700) { return; }
      fn(e);
    });
  }

  /* ------------------------------------------------------------- save state */
  var DEFAULT_SAVE = {
    levels: {},
    seen: {},
    settings: { music: true, sfx: true, motion: false },
    bestAcc: 0
  };

  var save = null;

  function loadSave() {
    var data = null;
    try {
      var raw = global.localStorage.getItem(SAVE_KEY);
      if (raw) { data = JSON.parse(raw); }
    } catch (e) { data = null; }
    save = {
      levels: (data && data.levels) || {},
      seen: (data && data.seen) || {},
      settings: {
        music: data && data.settings && typeof data.settings.music === 'boolean' ? data.settings.music : true,
        sfx: data && data.settings && typeof data.settings.sfx === 'boolean' ? data.settings.sfx : true,
        motion: !!(data && data.settings && data.settings.motion)
      },
      bestAcc: (data && data.bestAcc) || 0
    };
  }

  function persist() {
    try { global.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ }
  }

  function levelRecord(id) {
    if (!save.levels[id]) { save.levels[id] = { stars: 0, best: 0, plays: 0 }; }
    return save.levels[id];
  }
  function totalStars() {
    var n = 0;
    for (var k in save.levels) {
      if (Object.prototype.hasOwnProperty.call(save.levels, k)) { n += save.levels[k].stars || 0; }
    }
    return n;
  }
  function seenCount() {
    var n = 0;
    for (var k in save.seen) {
      if (Object.prototype.hasOwnProperty.call(save.seen, k)) { n++; }
    }
    return n;
  }
  function isUnlocked(levelId) {
    if (levelId <= 1) { return true; }
    var prev = save.levels[levelId - 1];
    return !!(prev && prev.stars > 0);
  }

  /* ---------------------------------------------------------------- runtime */
  var state = {
    screen: 'boot',
    level: null,
    queue: [],
    index: 0,
    score: 0,
    total: 0,
    streak: 0,
    bestStreak: 0,
    misses: [],
    busy: false,
    card: null,
    drag: null
  };

  /* ============================================================== screens */
  var screens = {};
  ['boot', 'menu', 'levels', 'game', 'result'].forEach(function (name) {
    screens[name] = $('scr-' + name);
  });

  function show(name) {
    var target = screens[name];
    if (!target) { return; }
    Object.keys(screens).forEach(function (k) {
      var s = screens[k];
      if (k === name) { return; }
      if (s.classList.contains('is-mounted')) {
        s.classList.remove('is-active');
        global.setTimeout(function () {
          if (!s.classList.contains('is-active')) { s.classList.remove('is-mounted'); }
        }, 340);
      }
    });
    target.classList.add('is-mounted');
    /* next frame so the transition actually runs */
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () { target.classList.add('is-active'); });
    });
    state.screen = name;
  }

  /* ================================================================ toast */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('is-show');
    if (toastTimer) { global.clearTimeout(toastTimer); }
    toastTimer = global.setTimeout(function () { t.classList.remove('is-show'); }, 2100);
  }

  /* =============================================================== modals */
  var modalLayer = $('modalLayer');
  var openModal = null;

  function modal(id) {
    if (openModal) { closeModal(); }
    var m = $(id);
    if (!m) { return; }
    modalLayer.hidden = false;
    m.hidden = false;
    openModal = m;
    A.play('tap');
    var focusable = m.querySelector('.modal-cta') || m.querySelector('button');
    if (focusable) { focusable.focus({ preventScroll: true }); }
  }

  function closeModal() {
    if (!openModal) { return; }
    openModal.hidden = true;
    openModal = null;
    modalLayer.hidden = true;
  }

  onTap(modalLayer, function (e) {
    if (e.target && e.target.id === 'modalScrim') { closeModal(); return; }
    var t = e.target && e.target.closest ? e.target.closest('[data-close]') : null;
    if (t) { A.play('tap'); closeModal(); }
  });

  /* ================================================ optional drop-in art */
  /* Every slot below is opt-in: if the file is absent nothing is requested a
     second time and the CSS/SVG artwork already in place simply stays. See
     assets/images/README.md for the expected filenames and sizes.            */
  function optionalImage(src, apply) {
    var im = new global.Image();
    im.onload = function () {
      if (!im.naturalWidth) { return; }
      try { apply(src, im); } catch (e) { /* never break the game over art */ }
    };
    im.onerror = function () { /* keep the built-in look */ };
    im.src = src;
  }

  function probeOptionalArt() {
    var root = document.documentElement;

    /* material overlays — layered on top of the CSS gradients, not instead */
    optionalImage('assets/images/ui/card_paper.png', function (src) {
      root.style.setProperty('--card-paper', 'url("' + src + '")');
      document.body.classList.add('has-card-paper');
    });
    optionalImage('assets/images/ui/tray_wood.png', function (src) {
      root.style.setProperty('--tray-wood', 'url("' + src + '")');
      document.body.classList.add('has-tray-wood');
    });
    optionalImage('assets/images/ui/panel_parchment.png', function (src) {
      root.style.setProperty('--panel-parch', 'url("' + src + '")');
      document.body.classList.add('has-panel-parch');
    });

    /* a painted wordmark replaces the type-set title */
    optionalImage('assets/images/ui/logo.png', function (src) {
      var block = document.querySelector('.title-block');
      if (!block || block.querySelector('.logo-img')) { return; }
      var img = new global.Image();
      img.className = 'logo-img';
      img.alt = 'Leaf Sorter';
      img.src = src;
      block.insertBefore(img, block.querySelector('.game-title'));
      block.classList.add('has-logo');
    });

    /* an optional guide character, shown on the menu and the result scroll */
    optionalImage('assets/images/characters/mentor.png', function (src) {
      ['menu-wrap', 'scroll-body'].forEach(function (cls) {
        var host = document.querySelector('.' + cls);
        if (!host || host.querySelector('.mentor')) { return; }
        var img = new global.Image();
        img.className = 'mentor mentor-' + cls;
        img.alt = '';
        img.src = src;
        host.appendChild(img);
      });
      document.body.classList.add('has-mentor');
    });
  }

  /* ==================================================== leaf art rendering */
  /* An <img> is attempted first; on error the vector fallback is swapped in so
     new artwork can be dropped into assets/images/leaves/ at any time.        */
  function leafArt(leaf, cls) {
    var wrap = el('div', 'spec-frame');
    var img = new global.Image();
    img.className = 'spec-img' + (cls ? ' ' + cls : '');
    img.alt = leaf.name + ' leaf';
    img.decoding = 'async';
    img.draggable = false;
    img.onerror = function () {
      if (img.parentNode) { img.parentNode.removeChild(img); }
      wrap.insertAdjacentHTML('afterbegin', D.vector(leaf.shape));
    };
    img.src = LEAF_IMG + leaf.id + '.png';
    wrap.appendChild(img);
    return wrap;
  }

  /* tiny thumbnail (miss list / reference table) */
  function leafThumb(leaf) {
    var img = new global.Image();
    img.alt = '';
    img.draggable = false;
    img.onerror = function () { img.src = ICON + (leaf.type === 'simple' ? 'leaf_simple.png' : 'leaf_compound.png'); };
    img.src = ICON + (leaf.type === 'simple' ? 'leaf_simple.png' : 'leaf_compound.png');
    return img;
  }

  /* ========================================================== level select */
  function buildLevels() {
    var grid = $('levelGrid');
    grid.innerHTML = '';
    var stars = totalStars();
    $('levelsStars').textContent = stars + ' / ' + MAX_STARS;

    var firstLocked = true;
    D.LEVELS.forEach(function (lv) {
      var rec = save.levels[lv.id] || { stars: 0, best: 0, plays: 0 };
      var unlocked = isUnlocked(lv.id);
      var card = el('button', 'level-card' + (unlocked ? '' : ' is-locked'));
      card.type = 'button';
      if (unlocked && rec.stars === 0 && firstLocked) {
        card.classList.add('is-next');
        firstLocked = false;
      }

      var starHtml = '';
      for (var s = 0; s < 3; s++) {
        starHtml += '<img src="' + ICON + (s < rec.stars ? 'star_filled.png' : 'star_empty.png') + '" alt="">';
      }

      card.innerHTML =
        '<div class="lvl-top">' +
          '<span class="lvl-num">' + lv.id + '</span>' +
          '<span><span class="lvl-name">' + esc(lv.name) + '</span><br>' +
          '<span class="lvl-sub">' + esc(lv.sub) + '</span></span>' +
        '</div>' +
        '<div class="lvl-meta">' +
          '<span class="lvl-stars">' + starHtml + '</span>' +
          '<span class="lvl-count">' + lv.rounds + ' specimens</span>' +
        '</div>' +
        (rec.best ? '<span class="lvl-best">Best ' + rec.best + ' / ' + lv.rounds + '</span>' : '') +
        (unlocked ? '' : '<img class="lvl-lock" src="' + ICON + 'lock.png" alt="Locked">');

      onTap(card, function () {
        if (!unlocked) {
          A.play('wrong');
          toast('Earn a star in level ' + (lv.id - 1) + ' to open this drawer.');
          return;
        }
        A.play('tap');
        startLevel(lv);
      });
      grid.appendChild(card);
    });
  }

  function refreshMenuStats() {
    var stars = totalStars();
    $('statStars').innerHTML = stars + '<span class="plaque-of">/' + MAX_STARS + '</span>';
    $('statAcc').textContent = save.bestAcc ? save.bestAcc + '%' : '–';
    $('statSpec').innerHTML = seenCount() + '<span class="plaque-of">/' + D.LEAVES.length + '</span>';

    var next = null;
    for (var i = 0; i < D.LEVELS.length; i++) {
      var rec = save.levels[D.LEVELS[i].id];
      if (isUnlocked(D.LEVELS[i].id) && (!rec || rec.stars < 3)) { next = D.LEVELS[i]; break; }
    }
    $('playNote').textContent = next
      ? (stars ? 'Continue: ' + next.name : 'Start the field study')
      : 'All drawers mastered';
  }

  /* ============================================================ level flow */
  function pickQueue(level) {
    var simple = shuffle(D.LEAVES.filter(function (l) { return l.type === 'simple'; }));
    var compound = shuffle(D.LEAVES.filter(function (l) { return l.type === 'compound'; }));
    var poolHalf = Math.ceil(level.pool / 2);
    var pool = shuffle(simple.slice(0, poolHalf).concat(compound.slice(0, poolHalf)));

    /* Balanced draw: alternate types where possible so a run never turns into
       "everything is compound", then shuffle the order of presentation.       */
    var wantS = Math.ceil(level.rounds / 2);
    var wantC = level.rounds - wantS;
    if (Math.random() < 0.5) { var tmp = wantS; wantS = wantC; wantC = tmp; }

    var ps = pool.filter(function (l) { return l.type === 'simple'; });
    var pc = pool.filter(function (l) { return l.type === 'compound'; });
    var out = ps.slice(0, wantS).concat(pc.slice(0, wantC));

    /* top up if a pool ran short */
    var i = 0;
    while (out.length < level.rounds && i < pool.length) {
      if (out.indexOf(pool[i]) === -1) { out.push(pool[i]); }
      i++;
    }
    return shuffle(out).slice(0, level.rounds);
  }

  function startLevel(level) {
    state.level = level;
    state.queue = pickQueue(level);
    state.index = 0;
    state.score = 0;
    state.total = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.misses = [];
    state.busy = false;

    $('hudLevel').textContent = level.name;
    $('hudScore').textContent = '0';
    $('hudStreak').textContent = '0';
    $('verdict').innerHTML = '';
    $('tally-simple').innerHTML = '';
    $('tally-compound').innerHTML = '';
    buildTrack();
    show('game');
    A.startMusic();
    global.setTimeout(spawnCard, 260);
  }

  function buildTrack() {
    var track = $('roundTrack');
    track.innerHTML = '';
    for (var i = 0; i < state.queue.length; i++) {
      track.appendChild(el('span', 'rt-dot'));
    }
    markTrack();
  }

  function markTrack() {
    var dots = $('roundTrack').children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-now', i === state.index);
    }
    $('hudRound').textContent = 'Specimen ' + Math.min(state.index + 1, state.queue.length) +
                                ' / ' + state.queue.length;
  }

  /* --------------------------------------------------------------- the card */
  function spawnCard() {
    var slot = $('cardSlot');
    slot.innerHTML = '';
    if (state.index >= state.queue.length) { finishLevel(); return; }

    var leaf = state.queue[state.index];
    state.card = leaf;

    var card = el('div', 'spec-card is-enter');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', leaf.name + ' — file as simple or compound');
    card.appendChild(leafArt(leaf));

    var label = el('div', 'spec-label');
    label.innerHTML =
      '<div class="spec-name">' + esc(leaf.name) + '</div>' +
      '<div class="spec-sci">' + esc(leaf.sci) + '</div>' +
      '<span class="spec-tag">Specimen ' + (state.index + 1) + '</span>';
    card.appendChild(label);
    slot.appendChild(card);

    bindDrag(card);
    drawStack();
    markTrack();

    if (!save.seen[leaf.id]) { save.seen[leaf.id] = 1; persist(); }
  }

  function drawStack() {
    var stack = $('stack');
    stack.innerHTML = '';
    var left = state.queue.length - state.index - 1;
    var n = Math.min(3, left);
    var slot = $('cardSlot');
    var w = slot.offsetWidth, h = slot.offsetHeight;
    for (var i = n; i >= 1; i--) {
      var g = el('div', 'stack-ghost');
      g.style.setProperty('--cw', w + 'px');
      g.style.setProperty('--ch', h + 'px');
      g.style.transform = 'translate(-50%, -50%) translate(' + (i * 5) + 'px, ' + (i * 6) + 'px) rotate(' + (i * 1.4) + 'deg)';
      g.style.opacity = String(0.34 - i * 0.07);
      stack.appendChild(g);
    }
  }

  /* ================================================== pointer / drag input */
  var bins = { simple: $('bin-simple'), compound: $('bin-compound') };

  function binUnder(x, y) {
    var keys = ['simple', 'compound'];
    for (var i = 0; i < keys.length; i++) {
      var r = bins[keys[i]].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { return keys[i]; }
    }
    return null;
  }

  function armBin(which) {
    ['simple', 'compound'].forEach(function (k) {
      bins[k].classList.toggle('is-armed', k === which);
    });
  }

  var lastDragEnd = 0;

  function bindDrag(card) {
    var moved = false;
    var origin = { x: 0, y: 0 };
    var armed = null;

    /* Move/up are bound on window rather than the card: pointer capture is not
       reliable in every WebView, and a lost pointerup must never leave the
       drag state stuck. */
    function move(e) {
      if (!state.drag || e.pointerId !== state.drag.id) { return; }
      var dx = e.clientX - origin.x;
      var dy = e.clientY - origin.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 6) { moved = true; }
      state.drag.dx = dx; state.drag.dy = dy;
      card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' +
        clamp(dx * 0.05, -13, 13) + 'deg) scale(1.04)';
      var over = binUnder(e.clientX, e.clientY);
      if (over !== armed) {
        armed = over;
        armBin(over);
        if (over) { A.play('hoverBin'); }
      }
      if (moved) { FX.fx.trail(e.clientX, e.clientY); }
      if (e.cancelable) { e.preventDefault(); }
    }

    function detach() {
      global.removeEventListener('pointermove', move);
      global.removeEventListener('pointerup', up);
      global.removeEventListener('pointercancel', cancel);
    }

    function up(e) {
      if (!state.drag || e.pointerId !== state.drag.id) { return; }
      var drag = state.drag;
      state.drag = null;
      lastDragEnd = Date.now();
      detach();
      card.classList.remove('is-dragging');
      try { card.releasePointerCapture(e.pointerId); } catch (err) { /* ignored */ }
      var over = binUnder(e.clientX, e.clientY);
      armBin(null);
      armed = null;

      if (over) {
        resolve(over, e.clientX, e.clientY);
      } else {
        card.style.transform = '';
        if (!moved || (Math.abs(drag.dx) + Math.abs(drag.dy) < 8)) {
          toast('Drag me to a tray, or tap a tray.');
        }
      }
      if (e.cancelable) { e.preventDefault(); }
    }

    function cancel(e) {
      if (!state.drag || (e && e.pointerId !== state.drag.id)) { return; }
      state.drag = null;
      lastDragEnd = Date.now();
      detach();
      card.classList.remove('is-dragging');
      card.style.transform = '';
      armBin(null);
      armed = null;
    }

    card.addEventListener('pointerdown', function (e) {
      if (state.busy || state.drag) { return; }
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      moved = false;
      origin.x = e.clientX; origin.y = e.clientY;
      state.drag = { id: e.pointerId, dx: 0, dy: 0 };
      card.classList.add('is-dragging');
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignored */ }
      global.addEventListener('pointermove', move);
      global.addEventListener('pointerup', up);
      global.addEventListener('pointercancel', cancel);
      A.play('pick');
      if (e.cancelable) { e.preventDefault(); }
    });

    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toast('Press the left or right arrow key to file this specimen.');
      }
    });

    card._cancelDrag = cancel;
  }

  /* tap a tray to file directly */
  ['simple', 'compound'].forEach(function (k) {
    onTap(bins[k], function () {
      if (state.busy || !state.card || state.drag) { return; }
      if (Date.now() - lastDragEnd < 350) { return; }
      var r = bins[k].getBoundingClientRect();
      resolve(k, r.left + r.width / 2, r.top + r.height / 2);
    });
    bins[k].addEventListener('pointerenter', function () {
      if (!state.busy && state.card && !state.drag) { bins[k].classList.add('is-armed'); }
    });
    bins[k].addEventListener('pointerleave', function () { bins[k].classList.remove('is-armed'); });
  });

  /* ====================================================== resolve an answer */
  var COMBO_WORDS = [
    { at: 3, text: 'Sharp Eye' },
    { at: 5, text: 'Keen Botanist' },
    { at: 8, text: 'Herbarium Hand' },
    { at: 12, text: 'Master Taxonomist' }
  ];

  function resolve(binType, px, py) {
    if (state.busy || !state.card) { return; }
    if (state.index >= state.queue.length) { return; }
    state.busy = true;
    armBin(null);

    var leaf = state.card;
    var correct = (binType === leaf.type);
    var bin = bins[binType];
    var card = $('cardSlot').querySelector('.spec-card');

    state.total++;
    if (correct) {
      state.score++;
      state.streak++;
      if (state.streak > state.bestStreak) { state.bestStreak = state.streak; }
    } else {
      state.streak = 0;
      state.misses.push(leaf);
    }

    /* a pip in the tray it was filed into */
    var tally = $('tally-' + binType);
    if (tally) { tally.appendChild(el('span', 'bin-pip ' + (correct ? 'is-good' : 'is-bad'))); }

    /* dot for this round */
    var dot = $('roundTrack').children[state.index];
    if (dot) {
      dot.classList.remove('is-now');
      dot.classList.add(correct ? 'is-hit' : 'is-miss');
    }

    /* ------- feedback ------- */
    var verdict = $('verdict');
    if (correct) {
      bin.classList.add('is-right');
      global.setTimeout(function () { bin.classList.remove('is-right'); }, 520);
      if (card) {
        var br = bin.getBoundingClientRect();
        var cr = card.getBoundingClientRect();
        card.classList.add('is-away');
        card.style.transform =
          'translate(' + (br.left + br.width / 2 - cr.left - cr.width / 2) + 'px,' +
          (br.top + br.height / 2 - cr.top - cr.height / 2) + 'px) scale(.34) rotate(9deg)';
      }
      FX.fx.burst(px, py, 'good', 1);
      FX.fx.burst(px, py, 'gold', 0.55);
      A.play('correct');
      A.duck(0.55, 0.5);

      verdict.innerHTML = '';
      var okPill = el('div', 'verdict-pill verdict-good');
      okPill.innerHTML = '<img src="' + ICON + 'check.png" alt=""><span>Correct &mdash; <b>' +
        esc(leaf.name) + '</b> <em>(' + esc(leaf.sci) + ')</em> is a <b>' + leaf.type + '</b> leaf.</span>';
      verdict.appendChild(okPill);

      $('hudScore').textContent = state.score;
      pop($('chipScore'));
      $('hudStreak').textContent = state.streak;
      pop($('chipStreak'));

      for (var i = 0; i < COMBO_WORDS.length; i++) {
        if (state.streak === COMBO_WORDS[i].at) { combo(COMBO_WORDS[i].text + '!'); break; }
      }
    } else {
      bin.classList.add('is-wrong');
      global.setTimeout(function () { bin.classList.remove('is-wrong'); }, 520);
      if (card) {
        card.style.transform = '';
        card.classList.add('is-shake');
      }
      FX.fx.burst(px, py, 'bad', 0.85);
      A.play('wrong');
      document.body.classList.add('flash-bad');
      global.setTimeout(function () { document.body.classList.remove('flash-bad'); }, 520);

      verdict.innerHTML = '';
      var badPill = el('div', 'verdict-pill verdict-bad');
      badPill.innerHTML = '<img src="' + ICON + 'cross.png" alt=""><span>Not quite &mdash; <b>' +
        esc(leaf.name) + '</b> <em>(' + esc(leaf.sci) + ')</em> is a <b>' + leaf.type + '</b> leaf.</span>';
      verdict.appendChild(badPill);

      $('hudStreak').textContent = '0';

      /* show the right tray glowing so the lesson lands */
      var right = bins[leaf.type];
      global.setTimeout(function () {
        right.classList.add('is-armed');
        global.setTimeout(function () { right.classList.remove('is-armed'); }, 780);
      }, 420);
    }

    global.setTimeout(function () {
      state.index++;
      state.busy = false;
      if (state.index >= state.queue.length) { finishLevel(); } else { spawnCard(); }
    }, correct ? 900 : 1500);
  }

  function pop(node) {
    node.classList.remove('is-pop');
    /* force reflow so the animation restarts */
    void node.offsetWidth;
    node.classList.add('is-pop');
  }

  function combo(text) {
    var b = $('comboBanner');
    b.textContent = text;
    b.classList.remove('is-show');
    void b.offsetWidth;
    b.classList.add('is-show');
    A.play('star', 1);
    var r = b.getBoundingClientRect();
    FX.fx.rise(r.left + r.width / 2, r.top + r.height / 2, 'gold');
  }

  /* ============================================================ level ended */
  var btnNextAction = null;
  function starsFor(pct) {
    if (pct >= 100) { return 3; }
    if (pct >= 80) { return 2; }
    if (pct >= 60) { return 1; }
    return 0;
  }

  function finishLevel() {
    /* retire the specimen so nothing can be filed after the run ends */
    state.card = null;
    state.busy = true;
    if (state.drag) { state.drag = null; }
    $('cardSlot').innerHTML = '';
    $('stack').innerHTML = '';
    armBin(null);

    var lv = state.level;
    var pct = state.total ? Math.round(state.score / state.total * 100) : 0;
    var stars = starsFor(pct);
    var rec = levelRecord(lv.id);
    var wasStars = rec.stars;

    rec.plays++;
    if (stars > rec.stars) { rec.stars = stars; }
    if (state.score > rec.best) { rec.best = state.score; }
    if (pct > save.bestAcc) { save.bestAcc = pct; }
    persist();

    /* ---- populate the result scroll ---- */
    $('resultTitle').textContent = lv.name;
    $('resultKicker').textContent = stars === 3 ? 'Flawless field study' :
                                    (stars ? 'Field study complete' : 'Study incomplete');
    $('resScore').textContent = state.score + '/' + state.total;
    $('resAcc').textContent = pct + '%';
    $('resStreak').textContent = state.bestStreak;

    var msg;
    if (stars === 3) { msg = 'Every specimen filed correctly. The cabinet is in perfect order.'; }
    else if (stars === 2) { msg = 'A steady hand. Check the margins again on the ones you missed.'; }
    else if (stars === 1) { msg = 'A pass. Remember: lobes that stop short of the midrib are still simple.'; }
    else { msg = 'Not enough correct files to earn a star. Read the journal and try the drawer again.'; }
    $('resultMsg').textContent = msg;

    /* misses */
    var missBlock = $('missBlock');
    var missList = $('missList');
    missList.innerHTML = '';
    if (state.misses.length) {
      missBlock.hidden = false;
      state.misses.forEach(function (leaf) {
        var li = el('li');
        li.appendChild(leafThumb(leaf));
        li.appendChild(el('span', null, '<b>' + esc(leaf.name) + '</b> &mdash; ' + leaf.type));
        missList.appendChild(li);
      });
    } else {
      missBlock.hidden = true;
    }

    /* next-level button */
    var nextLv = null;
    for (var i = 0; i < D.LEVELS.length; i++) {
      if (D.LEVELS[i].id === lv.id + 1) { nextLv = D.LEVELS[i]; }
    }
    var btnNext = $('btnNextLevel');
    if (nextLv && stars > 0) {
      btnNext.hidden = false;
      btnNext.querySelector('.btn-label').textContent = 'Next: ' + nextLv.name;
      btnNextAction = function () { A.play('tap'); startLevel(nextLv); };
    } else {
      /* nothing to advance to (last drawer, or no star earned): drop the button
         and let Replay take the primary slot instead of duplicating Cabinet. */
      btnNext.hidden = true;
      btnNextAction = null;
    }
    var actions = $('resultActions');
    actions.classList.toggle('is-three', btnNext.hidden);
    var replay = $('btnReplay');
    replay.classList.toggle('btn-primary', btnNext.hidden);
    replay.classList.toggle('btn-wood', !btnNext.hidden);

    /* reset stars, then land them one by one */
    var starEls = $('starRow').children;
    for (var s = 0; s < starEls.length; s++) {
      starEls[s].src = ICON + 'star_empty.png';
      starEls[s].classList.remove('is-lit');
    }

    show('result');

    global.setTimeout(function () {
      for (var s2 = 0; s2 < stars; s2++) {
        (function (k) {
          global.setTimeout(function () {
            starEls[k].src = ICON + 'star_filled.png';
            starEls[k].classList.add('is-lit');
            A.play('star', k);
            var r = starEls[k].getBoundingClientRect();
            FX.fx.burst(r.left + r.width / 2, r.top + r.height / 2, 'gold', 0.7);
          }, k * 330);
        })(s2);
      }
      global.setTimeout(function () {
        if (stars > 0) { A.play('complete'); } else { A.play('fail'); }
        if (stars > 0 && wasStars === 0 && nextLv) {
          global.setTimeout(function () {
            A.play('unlock');
            toast('Drawer unlocked: ' + nextLv.name);
          }, 700);
        }
      }, Math.max(1, stars) * 330 + 120);
    }, 420);

    refreshMenuStats();
  }

  /* ============================================================ Learn More */
  function buildLearn() {
    var R = D.REFERENCE;
    var html = '';

    html += '<div class="learn-pair">';
    [['simple', 'leaf_simple.png'], ['compound', 'leaf_compound.png']].forEach(function (pair) {
      var sec = R[pair[0]];
      html += '<div class="learn-card"><h3><img src="' + ICON + pair[1] + '" alt="">' + esc(sec.title) + '</h3>' +
              '<p>' + esc(sec.body) + '</p><ul class="learn-tells">';
      sec.tells.forEach(function (t) { html += '<li>' + esc(t) + '</li>'; });
      html += '</ul></div>';
    });
    html += '</div>';

    html += '<div class="learn-note">' + esc(R.trap) + '</div>';

    html += '<h3 class="learn-sub">Kinds of compound &amp; lobed leaves</h3><ul class="learn-types">';
    R.types.forEach(function (t) {
      html += '<li><b>' + esc(t.k) + '</b> &mdash; ' + esc(t.v) + '</li>';
    });
    html += '</ul>';

    html += '<h3 class="learn-sub">Specimen index</h3><div class="learn-table">';
    D.LEAVES.slice().sort(function (a, b) {
      if (a.type !== b.type) { return a.type === 'simple' ? -1 : 1; }
      return a.name.localeCompare(b.name);
    }).forEach(function (leaf) {
      html += '<div class="learn-row">' +
        '<img src="' + ICON + (leaf.type === 'simple' ? 'leaf_simple.png' : 'leaf_compound.png') + '" alt="">' +
        '<span><span class="lr-name">' + esc(leaf.name) + '</span> ' +
        '<span class="lr-sci">' + esc(leaf.sci) + '</span><br>' +
        '<span class="lr-note">' + esc(leaf.note) + '</span></span>' +
        '<span class="lr-type ' + (leaf.type === 'simple' ? 'lr-simple' : 'lr-compound') + '">' +
        leaf.type + '</span></div>';
    });
    html += '</div>';

    $('learnBody').innerHTML = html;
  }

  /* ============================================================== settings */
  function syncSettingsUi() {
    var s = save.settings;
    $('swMusic').classList.toggle('is-on', s.music);
    $('swMusic').setAttribute('aria-checked', String(s.music));
    $('swSfx').classList.toggle('is-on', s.sfx);
    $('swSfx').setAttribute('aria-checked', String(s.sfx));
    $('swMotion').classList.toggle('is-on', s.motion);
    $('swMotion').setAttribute('aria-checked', String(s.motion));

    $('setMusicIco').src = ICON + (s.music ? 'music_on.png' : 'music_off.png');
    $('setSfxIco').src = ICON + (s.sfx ? 'sound_on.png' : 'sound_off.png');
    $('icoMusic').src = ICON + (s.music ? 'music_on.png' : 'music_off.png');
    $('icoSfx').src = ICON + (s.sfx ? 'sound_on.png' : 'sound_off.png');

    document.body.classList.toggle('reduced-motion', s.motion);
    FX.bg.reduced = s.motion;
    FX.fx.reduced = s.motion;
  }

  function applyAudioSettings() {
    A.setSfx(save.settings.sfx);
    A.setMusic(save.settings.music);
  }

  function toggleMusic() {
    save.settings.music = !save.settings.music;
    persist();
    syncSettingsUi();
    A.setMusic(save.settings.music);
    if (save.settings.sfx) { A.play('tap'); }
    toast(save.settings.music ? 'Music on' : 'Music off');
  }

  function toggleSfx() {
    save.settings.sfx = !save.settings.sfx;
    persist();
    syncSettingsUi();
    A.setSfx(save.settings.sfx);
    if (save.settings.sfx) { A.play('tap'); }
    toast(save.settings.sfx ? 'Sound effects on' : 'Sound effects off');
  }

  /* ================================================================= wiring */
  function wire() {
    onTap($('btnPlay'), function () {
      A.play('tap'); A.startMusic(); buildLevels(); show('levels');
    });
    onTap($('btnHowTo'), function () { modal('modalHowTo'); });
    onTap($('btnSettings'), function () { syncSettingsUi(); modal('modalSettings'); });
    onTap($('btnLevelsBack'), function () { A.play('tap'); refreshMenuStats(); show('menu'); });
    onTap($('btnGameBack'), function () {
      A.play('tap'); buildLevels(); show('levels');
    });
    onTap($('btnNextLevel'), function () { if (btnNextAction) { btnNextAction(); } });
    onTap($('btnReplay'), function () { A.play('tap'); startLevel(state.level); });
    onTap($('btnResultHome'), function () { A.play('tap'); buildLevels(); show('levels'); });
    onTap($('btnLearnMore'), function () { buildLearn(); modal('modalLearn'); });

    onTap($('btnMusicQuick'), toggleMusic);
    onTap($('btnSfxQuick'), toggleSfx);
    onTap($('swMusic'), toggleMusic);
    onTap($('swSfx'), toggleSfx);
    onTap($('swMotion'), function () {
      save.settings.motion = !save.settings.motion;
      persist(); syncSettingsUi(); A.play('tap');
      toast(save.settings.motion ? 'Reduced motion on' : 'Reduced motion off');
    });
    onTap($('btnReset'), function () {
      save.levels = {}; save.seen = {}; save.bestAcc = 0;
      persist();
      buildLevels(); refreshMenuStats();
      A.play('wrong');
      toast('Progress reset.');
    });

    /* keyboard */
    global.addEventListener('keydown', function (e) {
      if (openModal) {
        if (e.key === 'Escape') { closeModal(); }
        return;
      }
      if (state.screen === 'game') {
        if (e.key === 'ArrowLeft' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          var rs = bins.simple.getBoundingClientRect();
          resolve('simple', rs.left + rs.width / 2, rs.top + rs.height / 2);
        } else if (e.key === 'ArrowRight' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          var rc = bins.compound.getBoundingClientRect();
          resolve('compound', rc.left + rc.width / 2, rc.top + rc.height / 2);
        } else if (e.key === 'Escape') {
          buildLevels(); show('levels');
        }
      } else if (state.screen === 'levels' && e.key === 'Escape') {
        refreshMenuStats(); show('menu');
      } else if (state.screen === 'result' && e.key === 'Escape') {
        buildLevels(); show('levels');
      }
    });

    /* first gesture unlocks WebAudio in every mobile WebView */
    var unlock = function () {
      A.resume();
      applyAudioSettings();
      global.removeEventListener('pointerdown', unlock);
      global.removeEventListener('keydown', unlock);
    };
    global.addEventListener('pointerdown', unlock);
    global.addEventListener('keydown', unlock);

    /* keep drag maths honest when the layout changes */
    global.addEventListener('resize', function () { if (state.card) { drawStack(); } });
    global.addEventListener('orientationchange', function () {
      global.setTimeout(function () { if (state.card) { drawStack(); } }, 320);
    });

    /* pause music when the WebView is backgrounded */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (A.ready && A.musicRunning) { A.musicBus.gain.value = 0; }
      } else if (save.settings.music) {
        A.startMusic();
      }
    });

    /* kill browser gestures that would fight the game */
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    /* pinch-zoom off, and no rubber-band scroll outside declared scrollers */
    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) { e.preventDefault(); return; }
      var scroller = e.target.closest ? e.target.closest('.modal-scroll, .level-grid, .scroll-body') : null;
      if (!scroller) { e.preventDefault(); }
    }, { passive: false });
    global.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ==================================================================== boot */
  var BOOT_LINES = [
    'Pressing leaves…',
    'Labelling specimens…',
    'Warming the glasshouse…',
    'Sharpening the hand lens…',
    'Opening the cabinet…'
  ];

  function boot() {
    loadSave();
    FX.bg.init($('bgCanvas'));
    FX.fx.init($('fxCanvas'));
    FX.bg.reduced = save.settings.motion;
    FX.fx.reduced = save.settings.motion;
    document.body.classList.toggle('reduced-motion', save.settings.motion);

    probeOptionalArt();
    wire();
    syncSettingsUi();
    refreshMenuStats();
    show('boot');

    /* Warm the first few specimen photos so the opening card never pops in
       half-drawn; a failure here is harmless because of the vector fallback. */
    D.LEAVES.slice(0, 8).forEach(function (leaf) {
      var im = new global.Image();
      im.src = LEAF_IMG + leaf.id + '.png';
    });

    var pct = 0;
    var fill = $('bootFill');
    var hint = $('bootHint');
    var step = 0;
    var timer = global.setInterval(function () {
      pct = Math.min(100, pct + 14 + Math.random() * 16);
      fill.style.width = pct + '%';
      if (step < BOOT_LINES.length) { hint.textContent = BOOT_LINES[step++]; }
      if (pct >= 100) {
        global.clearInterval(timer);
        global.setTimeout(function () { refreshMenuStats(); show('menu'); }, 420);
      }
    }, 260);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
