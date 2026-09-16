/* =====================================================================
   DECISION CARDS: Cell Cycle Control - game controller
   Original rules preserved: 100% genome stability, -25% per wrong call,
   card flip reveal, TEJA advisory on failure, three end states.
   ===================================================================== */
(function (global) {
  "use strict";

  var doc = global.document;
  var D = global.DC_DATA;
  var A = global.DC_AUDIO;
  var FX = global.DC_FX;
  var ICON = D.ICON;

  function $(id) { return doc.getElementById(id); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); }

  var SAVE_KEY = "dc_cellcycle_save_v1";
  var WRONG_PENALTY = 25;

  /* ------------------------------------------------------------------
     PERSISTENCE
     ------------------------------------------------------------------ */
  var store = {
    unlocked: 1,
    best: {},
    settings: { sfx: true, music: true, fx: true }
  };

  function loadSave() {
    try {
      var raw = global.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return;
      if (typeof obj.unlocked === "number") store.unlocked = Math.max(1, Math.min(D.LEVELS.length, obj.unlocked));
      if (obj.best && typeof obj.best === "object") store.best = obj.best;
      if (obj.settings && typeof obj.settings === "object") {
        store.settings.sfx = obj.settings.sfx !== false;
        store.settings.music = obj.settings.music !== false;
        store.settings.fx = obj.settings.fx !== false;
      }
    } catch (e) { /* storage unavailable - run with defaults */ }
  }

  function persist() {
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(store));
    } catch (e) { /* ignore quota / private mode */ }
  }

  /* ------------------------------------------------------------------
     STATE
     ------------------------------------------------------------------ */
  var state = {
    screen: "boot",
    levelIndex: 0,
    deck: [],
    index: 0,
    health: 100,
    isProcessing: false,
    streak: 0,
    bestStreak: 0,
    mutations: 0,
    correct: 0,
    log: [],
    paused: false
  };

  /* ------------------------------------------------------------------
     SCREENS
     ------------------------------------------------------------------ */
  var SCREENS = ["boot", "menu", "levels", "game", "results"];

  function showScreen(name) {
    for (var i = 0; i < SCREENS.length; i++) {
      var el = $("screen-" + SCREENS[i]);
      if (el) el.classList.toggle("is-active", SCREENS[i] === name);
    }
    state.screen = name;
    doc.body.classList.toggle("is-booting", name === "boot");
  }

  /* ------------------------------------------------------------------
     MODALS
     ------------------------------------------------------------------ */
  var openModals = [];

  function openModal(id) {
    var m = $(id);
    if (!m || m.classList.contains("is-open")) return;
    m.classList.add("is-open");
    openModals.push(id);
    A.sfx.open();
  }

  function closeModal(id) {
    var m = $(id);
    if (!m) return;
    m.classList.remove("is-open");
    var at = openModals.indexOf(id);
    if (at >= 0) openModals.splice(at, 1);
    /* dismissing the pause dialog by any route must release the shift */
    if (id === "modal-pause") state.paused = false;
    A.sfx.close();
  }

  function closeTopModal() {
    if (!openModals.length) return false;
    closeModal(openModals[openModals.length - 1]);
    return true;
  }

  /* ------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------ */
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    $("toast-msg").textContent = msg;
    t.classList.add("is-on");
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  /* ------------------------------------------------------------------
     OPTIONAL IMAGE OVERRIDES (graceful, never required)
     ------------------------------------------------------------------ */
  function optionalImage(url, apply) {
    var probe = new global.Image();
    probe.onload = function () { try { apply(url); } catch (e) {} };
    probe.onerror = function () { /* keep built-in art */ };
    probe.src = url;
  }

  function wireOptionalArt() {
    optionalImage("assets/images/backgrounds/bg_far.png", function (u) {
      var el = doc.querySelector(".bg-deep");
      if (el) {
        el.style.backgroundImage = "url('" + u + "')";
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      }
    });
    optionalImage("assets/images/backgrounds/bg_near.png", function (u) {
      var el = doc.querySelector(".bg-grid");
      if (el) {
        el.style.backgroundImage = "url('" + u + "')";
        el.style.backgroundSize = "cover";
        el.style.opacity = "0.35";
        el.style.animation = "none";
      }
    });
    optionalImage("assets/images/characters/teja.png", function (u) {
      var list = doc.querySelectorAll(".teja-avatar, .teja-head img, .result-teja img");
      for (var i = 0; i < list.length; i++) list[i].src = u;
    });
    optionalImage("assets/images/ui/logo.png", function (u) {
      var host = $("title-emblem");
      if (host) {
        host.innerHTML = "";
        var img = doc.createElement("img");
        img.src = u;
        img.alt = "";
        img.className = "logo-img";
        host.appendChild(img);
      }
    });
    optionalImage("assets/images/ui/panels/panel_texture.png", function (u) {
      doc.documentElement.style.setProperty("--panel-tex", "url('" + u + "')");
    });
  }

  /* card art with vector fallback */
  var artStatus = {};

  function applyCardArt(card) {
    var img = $("card-art-img");
    var fb = $("card-art-fallback");

    function useVector() {
      img.classList.add("is-hidden");
      img.removeAttribute("src");
      $("card-visual").innerHTML = card.vector || "";
      $("fallback-title").textContent = card.title;
      fb.classList.add("is-on");
    }
    function useArt() {
      fb.classList.remove("is-on");
      img.src = card.art;
      img.alt = card.title;
      img.classList.remove("is-hidden");
    }

    if (artStatus[card.id] === "ok") { useArt(); return; }
    if (artStatus[card.id] === "no") { useVector(); return; }

    useVector();                       /* show fallback until the art resolves */
    var probe = new global.Image();
    probe.onload = function () { artStatus[card.id] = "ok"; if (currentCard() === card) useArt(); };
    probe.onerror = function () { artStatus[card.id] = "no"; if (currentCard() === card) useVector(); };
    probe.src = card.art;
  }

  /* ------------------------------------------------------------------
     BOOT SEQUENCE
     ------------------------------------------------------------------ */
  var BOOT_LINES = [
    "<b>TEJA_SYS</b> v4.2 :: genome integrity division",
    "mounting cytoplasm telemetry ......... <b>OK</b>",
    "calibrating checkpoint sensors ....... <b>OK</b>",
    "loading specimen archive (10) ........ <b>OK</b>",
    "spindle assembly monitor ............. <b>OK</b>",
    "apoptosis authority ......... <i>ARMED</i>",
    "controller station ready. awaiting operator."
  ];

  var bootReady = false;

  function enterMenu() {
    if (!bootReady || state.screen !== "boot") return;
    A.unlock();
    showScreen("menu");
    refreshMenu();
    A.sfx.boot();
  }

  function runBoot() {
    var logEl = $("boot-log");
    var fill = $("boot-fill");
    var skip = $("boot-skip");
    logEl.innerHTML = "";
    var i = 0;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      fill.style.width = "100%";
      skip.classList.add("is-ready");
      bootReady = true;
    }

    function nextLine() {
      if (i >= BOOT_LINES.length) { finish(); return; }
      var row = doc.createElement("div");
      row.innerHTML = BOOT_LINES[i];
      logEl.appendChild(row);
      while (logEl.childNodes.length > 7) logEl.removeChild(logEl.firstChild);
      i++;
      fill.style.width = Math.round((i / BOOT_LINES.length) * 100) + "%";
      global.setTimeout(nextLine, 260);
    }
    global.setTimeout(nextLine, 220);
    global.setTimeout(finish, 3200);      /* safety: always reachable */
  }

  /* ------------------------------------------------------------------
     MENU
     ------------------------------------------------------------------ */
  function bestOverall() {
    var top = null;
    for (var k in store.best) {
      if (!Object.prototype.hasOwnProperty.call(store.best, k)) continue;
      var b = store.best[k];
      if (b && typeof b.health === "number" && (top === null || b.health > top)) top = b.health;
    }
    return top;
  }

  function refreshMenu() {
    var b = bestOverall();
    $("menu-best").textContent = (b === null ? "--" : b + "%");
    $("menu-clearance").textContent = "LV " + store.unlocked + "/" + D.LEVELS.length;
    var next = Math.min(store.unlocked, D.LEVELS.length) - 1;
    $("start-sub").textContent = D.LEVELS[next].name;
  }

  /* ------------------------------------------------------------------
     LEVEL SELECT
     ------------------------------------------------------------------ */
  function rankIcons(n) {
    var html = "";
    for (var i = 0; i < 3; i++) {
      html += '<img src="' + ICON + (i < n ? "rank_filled" : "rank_empty") + '.png" alt="">';
    }
    return html;
  }

  function renderLevels() {
    var host = $("level-grid");
    host.innerHTML = "";
    for (var i = 0; i < D.LEVELS.length; i++) {
      var lv = D.LEVELS[i];
      var locked = (i + 1) > store.unlocked;
      var best = store.best[lv.id];
      var card = doc.createElement("button");
      card.type = "button";
      card.className = "level-card" + (locked ? " is-locked" : "") + (best ? " is-cleared" : "");
      card.setAttribute("data-index", String(i));
      if (locked) card.setAttribute("aria-disabled", "true");
      card.innerHTML =
        '<div class="lc-top">' +
          '<span class="lc-index">FILE ' + (i + 1 < 10 ? "0" : "") + (i + 1) + '</span>' +
          '<img class="ico ico--sm lc-lock" src="' + ICON + (locked ? "lock" : "unlock") + '.png" alt="">' +
        '</div>' +
        '<h3 class="lc-name">' + lv.name + '</h3>' +
        '<p class="lc-desc">' + (locked ? "Sealed. Clear the previous case file to gain access." : lv.desc) + '</p>' +
        '<div class="lc-foot">' +
          '<span class="lc-count">' + lv.cards.length + ' CARDS</span>' +
          (best ? '<span class="lc-best">' + best.health + '%</span>' : '') +
          '<span class="lc-ranks">' + rankIcons(best ? best.rank : 0) + '</span>' +
        '</div>';
      host.appendChild(card);
    }
  }

  /* ------------------------------------------------------------------
     GAME FLOW
     ------------------------------------------------------------------ */
  function currentCard() {
    return state.deck[state.index] || null;
  }

  function startLevel(index) {
    state.levelIndex = index;
    var lv = D.LEVELS[index];
    state.deck = [];
    for (var i = 0; i < lv.cards.length; i++) {
      var c = D.cardById(lv.cards[i]);
      if (c) state.deck.push(c);
    }
    state.index = 0;
    state.health = 100;
    state.isProcessing = false;
    state.streak = 0;
    state.bestStreak = 0;
    state.mutations = 0;
    state.correct = 0;
    state.log = [];

    $("hud-case-name").textContent = lv.name;
    $("total-card-num").textContent = String(state.deck.length);
    $("game-card").style.display = "";
    $("controls-panel").style.display = "";

    setControlsEnabled(true);
    updateHealth(0);
    updateCounters();
    showScreen("game");
    renderCard();
  }

  function renderCard() {
    var card = currentCard();
    if (!card) return;
    var cardEl = $("game-card");
    cardEl.classList.remove("flipped", "is-good", "is-bad");

    /* Content swaps mid-flip so the player never sees it change. */
    global.setTimeout(function () {
      if (currentCard() !== card) return;
      $("current-card-num").textContent = String(state.index + 1);
      $("card-strip").style.background = card.stripColor;
      $("card-strip").style.color = card.stripColor;
      $("card-title").textContent = card.title;
      $("card-phase-note").textContent = card.note;
      $("phase-chip").textContent = card.phase;
      $("card-foot-id").textContent = "SPECIMEN " + (state.index + 1 < 10 ? "0" : "") + (state.index + 1) +
        " / " + state.deck.length;
      $("card-foot-tag").textContent = "AWAIT DECISION";

      var html = "";
      for (var i = 0; i < card.conditions.length; i++) {
        var c = card.conditions[i];
        html += '<div class="cond-item" style="animation-delay:' + (i * 70) + 'ms">' +
          '<img class="ico" src="' + ICON + c.icon + '.png" alt="">' +
          '<span>' + c.text + '</span></div>';
      }
      $("card-conditions").innerHTML = html;

      var track = $("phase-track");
      var segs = track.children;
      var wanted = card.track || [];
      var isAlert = (card.stripColor === "#fb7185" || card.stripColor === "#f472b6");

      function litFor(key) {
        for (var w = 0; w < wanted.length; w++) { if (wanted[w] === key) return true; }
        return false;
      }

      for (var t = 0; t < segs.length; t++) {
        segs[t].classList.toggle("is-on", litFor(segs[t].getAttribute("data-p")));
      }
      track.classList.toggle("is-alert", isAlert);

      /* the dial mirrors the same track data */
      var dial = $("cycle-dial");
      if (dial) {
        var marks = dial.querySelectorAll("[data-p]");
        for (var m = 0; m < marks.length; m++) {
          marks[m].classList.toggle("is-on", litFor(marks[m].getAttribute("data-p")));
        }
        dial.classList.toggle("is-alert", isAlert);
        $("dial-caption").textContent = wanted.length ? wanted.join(" › ") + "  POSITION" : "CYCLE POSITION";
      }

      var teja = $("teja-overlay");
      teja.classList.remove("is-on");
      $("teja-msg").textContent = "";

      applyCardArt(card);
      setControlsEnabled(true);
      state.isProcessing = false;
    }, 220);
  }

  function updateHealth(change) {
    state.health += change;
    if (state.health > 100) state.health = 100;
    if (state.health < 0) state.health = 0;

    var bar = $("health-bar");
    var val = $("health-val");
    bar.style.width = state.health + "%";
    val.textContent = state.health + "%";

    var cls = state.health > 60 ? "" : (state.health > 30 ? "is-warn" : "is-crit");
    bar.className = "meter-fill" + (cls ? " " + cls : "");
    val.className = "meter-val" + (cls ? " " + cls : "");
  }

  function updateCounters() {
    $("streak-val").textContent = String(state.streak);
    $("mut-val").textContent = String(state.mutations);
  }

  function setControlsEnabled(on) {
    var btns = doc.querySelectorAll(".action-btn");
    for (var i = 0; i < btns.length; i++) btns[i].disabled = !on;
    $("next-btn").disabled = false;
  }

  function makeDecision(action, sourceEl) {
    if (state.isProcessing || state.paused) return;
    var card = currentCard();
    if (!card) return;
    state.isProcessing = true;
    setControlsEnabled(false);

    var isCorrect = (action === card.correct);
    var cardEl = $("game-card");
    var stage = doc.querySelector(".stage");

    state.log.push({ id: card.id, title: card.title, ok: isCorrect, chosen: action });

    if (isCorrect) {
      state.correct++;
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;

      cardEl.classList.add("is-good");
      stage.classList.add("hit-good");
      $("result-icon").src = ICON + "check.png";
      $("result-title").textContent = "DECISION OPTIMAL";
      $("result-title").style.color = "#34d399";
      $("result-desc").innerHTML = card.correctMsg + "<br><br><small>" + card.explanation + "</small>";
      $("result-teja").classList.remove("is-on");
      $("card-foot-tag").textContent = "OPTIMAL";

      updateHealth(0);                       /* correct calls preserve stability */
      A.sfx.correct();
      A.duck(0.35, 1.2);
      if (sourceEl) {
        FX.burstAt(sourceEl, { color: FX.COLORS.green, count: 30, speed: 340 });
      }
      FX.shockAt(cardEl, { color: FX.COLORS.green, r1: 320, dur: 0.7, width: 6 });
      FX.burstAt(cardEl, { color: FX.COLORS.cyan, count: 26, speed: 260, life: 1.2, gravity: -60 });
      if (state.streak >= 3) toast("STREAK x" + state.streak + " - CLEAN REGULATION");
    } else {
      state.streak = 0;
      state.mutations++;

      cardEl.classList.add("shake", "is-bad");
      stage.classList.add("hit-bad");
      $("result-icon").src = ICON + "cross.png";
      $("result-title").textContent = "GENOME UNSTABLE";
      $("result-title").style.color = "#fb7185";
      $("result-desc").innerHTML = card.wrongMsg + "<br><br><small>" + card.explanation + "</small>";
      $("card-foot-tag").textContent = "FAILED";

      /* TEJA advisory - shown on the readout AND on the revealed face */
      $("teja-msg").textContent = card.teja;
      $("teja-overlay").classList.add("is-on");
      $("result-teja-msg").textContent = card.teja;
      $("result-teja").classList.add("is-on");

      updateHealth(-WRONG_PENALTY);
      A.sfx.wrong();
      A.duck(0.45, 1.4);
      if (sourceEl) FX.burstAt(sourceEl, { color: FX.COLORS.rose, count: 26, speed: 300 });
      FX.shockAt(cardEl, { color: FX.COLORS.rose, r1: 300, dur: 0.6, width: 7 });
      FX.rain(FX.COLORS.rose);
    }

    updateCounters();

    global.setTimeout(function () {
      stage.classList.remove("hit-good", "hit-bad");
    }, 520);

    global.setTimeout(function () {
      cardEl.classList.remove("shake");
      cardEl.classList.add("flipped");
      A.sfx.flip();
    }, 800);
  }

  function nextCard() {
    state.isProcessing = false;
    var cardEl = $("game-card");
    cardEl.classList.remove("is-good", "is-bad");

    if (state.health <= 0) {
      triggerGameOver(false);
      return;
    }
    state.index++;
    if (state.index < state.deck.length) {
      renderCard();
    } else {
      triggerGameOver(true);
    }
  }

  function rankFor(win, health) {
    if (!win) return 0;
    if (health >= 100) return 3;
    if (health >= 75) return 2;
    if (health > 50) return 1;
    return 0;
  }

  function triggerGameOver(win) {
    var lv = D.LEVELS[state.levelIndex];
    var health = state.health;
    var rank = rankFor(win, health);

    var title = $("end-title");
    var msg = $("end-msg");
    var crest = $("crest-img");

    if (win && health > 50) {
      title.textContent = "CYCLE SUCCESSFUL";
      title.style.color = "#34d399";
      msg.textContent = "Cell division regulated perfectly.";
      crest.src = ICON + "dna_shield.png";
      A.sfx.win();
      FX.celebrate();
    } else if (win && health <= 50) {
      title.textContent = "CYCLE COMPLETED (RISKY)";
      title.style.color = "#fbbf24";
      msg.textContent = "The cell survived, but mutations have accumulated.";
      crest.src = ICON + "warning.png";
      A.sfx.unlock();
      FX.celebrate([FX.COLORS.amber, FX.COLORS.cyan]);
    } else {
      title.textContent = "APOPTOSIS TRIGGERED";
      title.style.color = "#fb7185";
      msg.textContent = "Too much damage. System shutdown initiated.";
      crest.src = ICON + "apoptosis.png";
      A.sfx.lose();
      FX.rain(FX.COLORS.rose);
    }

    $("end-score").textContent = health + "%";
    $("end-correct").textContent = state.correct + "/" + state.deck.length;
    $("end-streak").textContent = String(state.bestStreak);
    $("rank-row").innerHTML = rankIcons(rank);

    var rows = "";
    for (var i = 0; i < state.log.length; i++) {
      var r = state.log[i];
      rows += '<div class="review-row ' + (r.ok ? "ok" : "no") + '">' +
        '<img src="' + ICON + (r.ok ? "check" : "cross") + '.png" alt="">' +
        '<span class="review-name">' + r.title + '</span>' +
        '<span class="review-verdict">' + (r.ok ? "OPTIMAL" : r.chosen.toUpperCase() + " - WRONG") + '</span>' +
        '</div>';
    }
    $("review-list").innerHTML = rows;

    /* save progress */
    var prev = store.best[lv.id];
    if (win && (!prev || health > prev.health)) {
      store.best[lv.id] = { health: health, rank: rank, correct: state.correct, total: state.deck.length };
    }
    var unlockedNew = false;
    if (win && state.levelIndex + 1 >= store.unlocked && store.unlocked < D.LEVELS.length) {
      store.unlocked = state.levelIndex + 2;
      unlockedNew = true;
    }
    persist();

    var nextBtn = $("btn-next-level");
    var hasNext = state.levelIndex + 1 < D.LEVELS.length && (state.levelIndex + 2) <= store.unlocked;
    nextBtn.style.display = hasNext ? "" : "none";

    showScreen("results");
    if (unlockedNew) {
      global.setTimeout(function () {
        toast("CASE FILE UNLOCKED: " + D.LEVELS[store.unlocked - 1].name);
        A.sfx.unlock();
      }, 900);
    }
    refreshMenu();
  }

  /* ------------------------------------------------------------------
     CODEX (Learn More)
     ------------------------------------------------------------------ */
  var codexBuilt = false;

  function buildCodex() {
    if (codexBuilt) return;
    codexBuilt = true;

    /* case notes are generated from the card data */
    for (var i = 0; i < D.CODEX.length; i++) {
      if (D.CODEX[i].entries === null) {
        var list = [];
        for (var k = 0; k < D.CARDS.length; k++) {
          var c = D.CARDS[k];
          list.push({
            h: c.title,
            p: c.explanation + " " + (c.learn || ""),
            tag: "Correct action: " + c.correct.toUpperCase() + "  //  " + c.phase
          });
        }
        D.CODEX[i].entries = list;
      }
    }

    var tabs = $("codex-tabs");
    tabs.innerHTML = "";
    for (var t = 0; t < D.CODEX.length; t++) {
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "codex-tab" + (t === 0 ? " is-active" : "");
      b.textContent = D.CODEX[t].tab;
      b.setAttribute("data-tab", String(t));
      tabs.appendChild(b);
    }
    showCodexTab(0);
  }

  function showCodexTab(idx) {
    var section = D.CODEX[idx];
    if (!section) return;
    var tabs = $("codex-tabs").children;
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle("is-active", i === idx);
    }
    var html = "";
    for (var k = 0; k < section.entries.length; k++) {
      var e = section.entries[k];
      html += '<div class="codex-entry"><h4>' + e.h + '</h4><p>' + e.p + '</p>' +
        (e.tag ? '<span class="tagline">' + e.tag + '</span>' : '') + '</div>';
    }
    $("codex-body").innerHTML = html;
    $("codex-body").scrollTop = 0;
  }

  /* ------------------------------------------------------------------
     SETTINGS
     ------------------------------------------------------------------ */
  function applySettings() {
    A.setSfx(store.settings.sfx);
    A.setMusic(store.settings.music);
    FX.setEnabled(store.settings.fx);
    doc.body.classList.toggle("fx-off", !store.settings.fx);

    $("sfx-icon").src = ICON + (store.settings.sfx ? "sound_on" : "sound_off") + ".png";
    $("sfx-state").textContent = store.settings.sfx ? "ON" : "OFF";
    $("toggle-sfx").setAttribute("aria-pressed", store.settings.sfx ? "true" : "false");

    $("music-icon").src = ICON + (store.settings.music ? "music_on" : "music_off") + ".png";
    $("music-state").textContent = store.settings.music ? "ON" : "OFF";
    $("toggle-music").setAttribute("aria-pressed", store.settings.music ? "true" : "false");

    $("fx-icon").src = ICON + (store.settings.fx ? "fx_on" : "fx_off") + ".png";
    $("fx-state").textContent = store.settings.fx ? "ON" : "OFF";
    $("toggle-fx").setAttribute("aria-pressed", store.settings.fx ? "true" : "false");
  }

  function noteMusicSource(kind) {
    var el = $("music-src-note");
    if (el) el.textContent = kind === "file" ? "Music: assets/audio/bgm.mp3" : "Music: procedural synth";
  }

  /* ------------------------------------------------------------------
     INPUT WIRING (unified pointer events + keyboard)
     ------------------------------------------------------------------ */
  function tactile(el) {
    /* pointerdown gives immediate feedback for mouse, touch and pen alike */
    on(el, "pointerdown", function () { A.unlock(); A.sfx.tap(); });
  }

  function wireButtons() {
    var pressables = doc.querySelectorAll("button");
    for (var i = 0; i < pressables.length; i++) tactile(pressables[i]);

    on($("boot-skip"), "click", function (ev) { ev.stopPropagation(); enterMenu(); });
    /* tapping anywhere on the boot panel also proceeds, once the log completes */
    on($("screen-boot"), "click", function () { enterMenu(); });

    on($("btn-start"), "click", function () {
      startLevel(Math.min(store.unlocked, D.LEVELS.length) - 1);
    });
    on($("btn-levels"), "click", function () { renderLevels(); showScreen("levels"); });
    on($("btn-howto"), "click", function () { openModal("modal-howto"); });
    on($("btn-settings"), "click", function () { openModal("modal-settings"); });

    on($("levels-back"), "click", function () { showScreen("menu"); refreshMenu(); });
    on($("levels-reset"), "click", function () {
      store.unlocked = 1;
      store.best = {};
      persist();
      renderLevels();
      refreshMenu();
      toast("PROGRESS WIPED");
    });

    on($("level-grid"), "click", function (ev) {
      var card = ev.target.closest ? ev.target.closest(".level-card") : null;
      if (!card) return;
      if (card.classList.contains("is-locked")) {
        toast("FILE SEALED - CLEAR THE PREVIOUS CASE");
        return;
      }
      startLevel(parseInt(card.getAttribute("data-index"), 10) || 0);
    });

    /* action buttons */
    var acts = doc.querySelectorAll(".action-btn");
    for (var a = 0; a < acts.length; a++) {
      (function (btn) {
        on(btn, "click", function () {
          makeDecision(btn.getAttribute("data-action"), btn);
        });
      })(acts[a]);
    }

    on($("next-btn"), "click", function () { nextCard(); });

    on($("btn-pause"), "click", function () { pauseShift(); });
    on($("btn-game-settings"), "click", function () { openModal("modal-settings"); });

    on($("pause-resume"), "click", function () { resumeShift(); });
    on($("pause-howto"), "click", function () { openModal("modal-howto"); });
    on($("pause-quit"), "click", function () {
      closeModal("modal-pause");
      state.paused = false;
      showScreen("menu");
      refreshMenu();
    });

    on($("btn-retry"), "click", function () { startLevel(state.levelIndex); });
    on($("btn-next-level"), "click", function () {
      var n = Math.min(state.levelIndex + 1, D.LEVELS.length - 1);
      startLevel(n);
    });
    on($("btn-learn"), "click", function () { buildCodex(); openModal("modal-codex"); });
    on($("btn-home"), "click", function () { showScreen("menu"); refreshMenu(); });

    on($("codex-tabs"), "click", function (ev) {
      var tab = ev.target.closest ? ev.target.closest(".codex-tab") : null;
      if (!tab) return;
      showCodexTab(parseInt(tab.getAttribute("data-tab"), 10) || 0);
    });

    /* settings toggles */
    on($("toggle-sfx"), "click", function () {
      store.settings.sfx = !store.settings.sfx;
      applySettings();
      persist();
      if (store.settings.sfx) A.sfx.tap();
    });
    on($("toggle-music"), "click", function () {
      store.settings.music = !store.settings.music;
      applySettings();
      persist();
    });
    on($("toggle-fx"), "click", function () {
      store.settings.fx = !store.settings.fx;
      applySettings();
      persist();
    });

    /* modal dismissal */
    var modals = doc.querySelectorAll(".modal");
    for (var m = 0; m < modals.length; m++) {
      (function (modal) {
        on(modal, "click", function (ev) {
          if (ev.target === modal) {
            if (modal.id === "modal-pause") { resumeShift(); return; }
            closeModal(modal.id);
          }
          var closer = ev.target.closest ? ev.target.closest("[data-close]") : null;
          if (closer) closeModal(modal.id);
        });
      })(modals[m]);
    }
  }

  function pauseShift() {
    if (state.screen !== "game") return;
    state.paused = true;
    openModal("modal-pause");
  }

  function resumeShift() {
    state.paused = false;
    closeModal("modal-pause");
  }

  function wireKeyboard() {
    on(doc, "keydown", function (ev) {
      var k = ev.key;

      if (k === "Escape") {
        if (closeTopModal()) { ev.preventDefault(); return; }
        if (state.screen === "game") { pauseShift(); ev.preventDefault(); }
        else if (state.screen === "levels" || state.screen === "results") { showScreen("menu"); refreshMenu(); }
        return;
      }

      if (openModals.length) return;

      if (state.screen === "boot") {
        if (k === "Enter" || k === " ") { enterMenu(); ev.preventDefault(); }
        return;
      }

      if (state.screen === "menu") {
        if (k === "Enter" || k === " ") { $("btn-start").click(); ev.preventDefault(); }
        return;
      }

      if (state.screen !== "game") return;

      var map = { "1": "allow", "2": "pause", "3": "repair", "4": "destroy" };
      if (map[k]) {
        var btn = doc.querySelector('.action-btn[data-action="' + map[k] + '"]');
        if (btn && !btn.disabled) { A.unlock(); makeDecision(map[k], btn); }
        ev.preventDefault();
        return;
      }
      if (k === "Enter" || k === " ") {
        if ($("game-card").classList.contains("flipped")) { nextCard(); }
        ev.preventDefault();
      }
    });
  }

  function wireViewportGuards() {
    /* no pinch zoom, no double-tap zoom, no long-press menu, no rubber band */
    on(doc, "gesturestart", function (ev) { ev.preventDefault(); }, { passive: false });
    on(doc, "gesturechange", function (ev) { ev.preventDefault(); }, { passive: false });
    on(doc, "dblclick", function (ev) { ev.preventDefault(); }, { passive: false });
    on(doc, "contextmenu", function (ev) { ev.preventDefault(); });
    on(doc, "touchmove", function (ev) {
      if (ev.touches && ev.touches.length > 1) ev.preventDefault();
    }, { passive: false });
    on(doc, "touchstart", function () { A.unlock(); }, { passive: true });

    on(doc, "visibilitychange", function () {
      if (doc.hidden) A.suspendAll(); else A.resumeAll();
    });
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  function init() {
    loadSave();

    FX.init();
    A.init({
      sfx: store.settings.sfx,
      music: store.settings.music,
      onMusicSource: noteMusicSource
    });
    applySettings();
    noteMusicSource(A.musicSource());

    wireOptionalArt();
    wireButtons();
    wireKeyboard();
    wireViewportGuards();

    refreshMenu();
    renderLevels();
    runBoot();
    showScreen("boot");
  }

  if (doc.readyState === "loading") {
    on(doc, "DOMContentLoaded", init);
  } else {
    init();
  }

  /* Kept on the global for parity with the original API. */
  global.makeDecision = function (action) {
    var btn = doc.querySelector('.action-btn[data-action="' + action + '"]');
    makeDecision(action, btn);
  };
  global.nextCard = nextCard;
})(window);
