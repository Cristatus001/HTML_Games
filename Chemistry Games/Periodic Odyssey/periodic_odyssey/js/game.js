/* ==========================================================================
   PERIODIC ODYSSEY  -  game logic
   Victorian Alchemy edition. Fully offline. Unified Pointer Events (mouse+touch).
   All original gameplay preserved; bugs fixed; packaging/presentation upgraded.
   ========================================================================== */
(function () {
  'use strict';

  var IMG = 'assets/images/';

  /* -------- optional-image loader with graceful fallback ---------------- */
  function tryImage(src, onLoad) {
    var im = new Image();
    im.onload = function () { onLoad(im); };
    im.onerror = function () { /* missing file -> keep vector art */ };
    im.src = src;
  }

  /* =======================================================================
     AUDIO  (SFX + procedural / optional-file background music)
     ======================================================================= */
  var Audio = {
    ctx: null, sfxOn: true, musicOn: true,
    _fileTried: false, usingFile: false, fileEl: null,
    nodes: null, _beat: 0, _nextTime: 0,

    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },

    sfx: function (type, freq, duration) {
      if (!this.sfxOn) return;
      var ctx = this.ensure(); if (!ctx) return;
      freq = freq || 440; duration = duration || 0.1;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
      switch (type) {
        case 'correct':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(783.99, ctx.currentTime + duration);
          break;
        case 'wrong':
          osc.type = 'square';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + duration * 2);
          break;
        case 'lock':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(880, ctx.currentTime); break;
        case 'note':
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime); break;
        case 'celebrate':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
          var self = this;
          setTimeout(function () {
            var c = self.ctx; if (!c) return;
            var o2 = c.createOscillator(), g2 = c.createGain();
            o2.connect(g2); g2.connect(c.destination); o2.type = 'sine';
            g2.gain.setValueAtTime(0.4, c.currentTime);
            o2.frequency.setValueAtTime(523.25, c.currentTime);
            o2.frequency.linearRampToValueAtTime(1046.5, c.currentTime + 0.4);
            g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
            o2.start(); o2.stop(c.currentTime + 0.4);
          }, 100);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
          osc.stop(ctx.currentTime + duration);
          return;
      }
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    },

    applyMusic: function () { if (this.musicOn) this.startMusic(); else this.stopMusic(); },

    startMusic: function () {
      var ctx = this.ensure(); if (!ctx) return;
      if (!this._fileTried) { this._fileTried = true; this._tryFile(); }
      if (this.usingFile) { if (this.fileEl) this.fileEl.play().catch(function () {}); return; }
      this._startProcedural();
    },

    stopMusic: function () {
      if (this.usingFile && this.fileEl) { this.fileEl.pause(); return; }
      this._stopProcedural();
    },

    _tryFile: function () {
      var self = this;
      var a = new window.Audio(); a.loop = true; a.volume = 0.5; a.preload = 'auto';
      a.src = 'assets/audio/bgm.mp3';
      a.addEventListener('canplaythrough', function () {
        self.usingFile = true; self.fileEl = a; self._stopProcedural();
        if (self.musicOn) a.play().catch(function () {});
      }, { once: true });
      a.addEventListener('error', function () { /* no file -> procedural stays */ });
      try { a.load(); } catch (e) {}
    },

    /* ---- Victorian music-box waltz (3/4, oom-pah-pah + plucked melody) ---- */
    _startProcedural: function () {
      if (this.nodes) return;
      var ctx = this.ctx; if (!ctx) return;
      var master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
      // gentle warmth
      var filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
      filter.frequency.value = 3200; filter.Q.value = 0.4; filter.connect(master);
      this.nodes = { master: master, filter: filter, timer: null };
      this._beat = 0;
      this._nextTime = ctx.currentTime + 0.15;
      var self = this;
      this.nodes.timer = setInterval(function () { self._scheduler(); }, 55);
    },

    _scheduler: function () {
      var ctx = this.ctx; if (!ctx || !this.nodes) return;
      var beatDur = 0.5; // seconds per beat -> ~120 bpm waltz feel
      while (this._nextTime < ctx.currentTime + 0.25) {
        this._playBeat(this._beat, this._nextTime);
        this._beat++;
        this._nextTime += beatDur;
      }
    },

    _playBeat: function (beat, t) {
      // 8-bar loop, 3 beats/bar = 24 beats
      var pos = beat % 24;
      var bar = Math.floor(pos / 3);
      var inBar = pos % 3;
      // chords bars: C, G, Am, F, C, G, F, G
      var bass = [130.81, 98.00, 110.00, 87.31, 130.81, 98.00, 87.31, 98.00];
      var chords = [
        [261.63, 329.63, 392.00], [196.00, 246.94, 293.66],
        [220.00, 261.63, 329.63], [174.61, 220.00, 261.63],
        [261.63, 329.63, 392.00], [196.00, 246.94, 293.66],
        [174.61, 220.00, 261.63], [196.00, 246.94, 293.66]
      ];
      // lilting music-box melody (24 notes; null = rest)
      var melody = [
        659.25, 783.99, 659.25,   587.33, 493.88, 392.00,
        523.25, 659.25, 440.00,   349.23, 440.00, 523.25,
        659.25, 587.33, 523.25,   587.33, 392.00, 493.88,
        440.00, 523.25, 440.00,   392.00, 493.88, 587.33
      ];
      // oom (bass) on beat 1, pah-pah (chord plucks) on beats 2 & 3
      if (inBar === 0) this._tone('triangle', bass[bar], t, 0.55, 0.26);
      else {
        var c = chords[bar];
        for (var i = 0; i < c.length; i++) this._tone('triangle', c[i], t, 0.42, 0.085);
      }
      // music-box melody note: bright bell (fundamental + shimmer harmonic)
      var m = melody[pos];
      if (m) { this._tone('sine', m, t, 1.05, 0.30); this._tone('triangle', m * 2, t, 0.55, 0.07); }
    },

    _tone: function (type, freq, t, dur, peak) {
      var ctx = this.ctx; if (!ctx || !this.nodes) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      o.connect(g); g.connect(this.nodes.filter);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    },

    _stopProcedural: function () {
      if (this.nodes) {
        if (this.nodes.timer) clearInterval(this.nodes.timer);
        var nodes = this.nodes;
        try {
          var t = this.ctx.currentTime;
          nodes.master.gain.cancelScheduledValues(t);
          nodes.master.gain.setValueAtTime(nodes.master.gain.value, t);
          nodes.master.gain.linearRampToValueAtTime(0.0001, t + 0.3);
        } catch (e) {}
        setTimeout(function () { try { nodes.master.disconnect(); } catch (e) {} }, 450);
        this.nodes = null;
      }
    }
  };

  /* =======================================================================
     ELEMENT DATA (unchanged values)
     ======================================================================= */
  var elements = {
    'H': { name: 'Hydrogen', symbol: 'H', atomicMass: 1.01, atomicNumber: 1, type: 'nonmetal', period: 1, group: 1 },
    'Li': { name: 'Lithium', symbol: 'Li', atomicMass: 6.94, atomicNumber: 3, type: 'alkali', period: 2, group: 1 },
    'Na': { name: 'Sodium', symbol: 'Na', atomicMass: 22.99, atomicNumber: 11, type: 'alkali', period: 3, group: 1 },
    'K': { name: 'Potassium', symbol: 'K', atomicMass: 39.10, atomicNumber: 19, type: 'alkali', period: 4, group: 1 },
    'Be': { name: 'Beryllium', symbol: 'Be', atomicMass: 9.01, atomicNumber: 4, type: 'alkaline-earth', period: 2, group: 2 },
    'Mg': { name: 'Magnesium', symbol: 'Mg', atomicMass: 24.31, atomicNumber: 12, type: 'alkaline-earth', period: 3, group: 2 },
    'Ca': { name: 'Calcium', symbol: 'Ca', atomicMass: 40.08, atomicNumber: 20, type: 'alkaline-earth', period: 4, group: 2 },
    'Sr': { name: 'Strontium', symbol: 'Sr', atomicMass: 87.62, atomicNumber: 38, type: 'alkaline-earth', period: 5, group: 2 },
    'Ba': { name: 'Barium', symbol: 'Ba', atomicMass: 137.33, atomicNumber: 56, type: 'alkaline-earth', period: 6, group: 2 },
    'B': { name: 'Boron', symbol: 'B', atomicMass: 10.81, atomicNumber: 5, type: 'metalloid', period: 2, group: 13 },
    'Al': { name: 'Aluminum', symbol: 'Al', atomicMass: 26.98, atomicNumber: 13, type: 'post-transition', period: 3, group: 13 },
    'C': { name: 'Carbon', symbol: 'C', atomicMass: 12.01, atomicNumber: 6, type: 'nonmetal', period: 2, group: 14 },
    'Si': { name: 'Silicon', symbol: 'Si', atomicMass: 28.09, atomicNumber: 14, type: 'metalloid', period: 3, group: 14 },
    'N': { name: 'Nitrogen', symbol: 'N', atomicMass: 14.01, atomicNumber: 7, type: 'nonmetal', period: 2, group: 15 },
    'P': { name: 'Phosphorus', symbol: 'P', atomicMass: 30.97, atomicNumber: 15, type: 'nonmetal', period: 3, group: 15 },
    'O': { name: 'Oxygen', symbol: 'O', atomicMass: 16.00, atomicNumber: 8, type: 'nonmetal', period: 2, group: 16 },
    'S': { name: 'Sulfur', symbol: 'S', atomicMass: 32.07, atomicNumber: 16, type: 'nonmetal', period: 3, group: 16 },
    'F': { name: 'Fluorine', symbol: 'F', atomicMass: 19.00, atomicNumber: 9, type: 'halogen', period: 2, group: 17 },
    'Cl': { name: 'Chlorine', symbol: 'Cl', atomicMass: 35.45, atomicNumber: 17, type: 'halogen', period: 3, group: 17 },
    'Br': { name: 'Bromine', symbol: 'Br', atomicMass: 79.90, atomicNumber: 35, type: 'halogen', period: 4, group: 17 },
    'I': { name: 'Iodine', symbol: 'I', atomicMass: 126.90, atomicNumber: 53, type: 'halogen', period: 5, group: 17 },
    'He': { name: 'Helium', symbol: 'He', atomicMass: 4.00, atomicNumber: 2, type: 'noble-gas', period: 1, group: 18 },
    'Ne': { name: 'Neon', symbol: 'Ne', atomicMass: 20.18, atomicNumber: 10, type: 'noble-gas', period: 2, group: 18 },
    'Ar': { name: 'Argon', symbol: 'Ar', atomicMass: 39.95, atomicNumber: 18, type: 'noble-gas', period: 3, group: 18 },
    'Sc': { name: 'Scandium', symbol: 'Sc', atomicMass: 44.96, atomicNumber: 21, type: 'transition', period: 4, group: 3 },
    'Ti': { name: 'Titanium', symbol: 'Ti', atomicMass: 47.87, atomicNumber: 22, type: 'transition', period: 4, group: 4 },
    'V': { name: 'Vanadium', symbol: 'V', atomicMass: 50.94, atomicNumber: 23, type: 'transition', period: 4, group: 5 },
    'Cr': { name: 'Chromium', symbol: 'Cr', atomicMass: 52.00, atomicNumber: 24, type: 'transition', period: 4, group: 6 },
    'Mn': { name: 'Manganese', symbol: 'Mn', atomicMass: 54.94, atomicNumber: 25, type: 'transition', period: 4, group: 7 },
    'Fe': { name: 'Iron', symbol: 'Fe', atomicMass: 55.85, atomicNumber: 26, type: 'transition', period: 4, group: 8 },
    'Co': { name: 'Cobalt', symbol: 'Co', atomicMass: 58.93, atomicNumber: 27, type: 'transition', period: 4, group: 9 },
    'Ni': { name: 'Nickel', symbol: 'Ni', atomicMass: 58.69, atomicNumber: 28, type: 'transition', period: 4, group: 10 },
    'Cu': { name: 'Copper', symbol: 'Cu', atomicMass: 63.55, atomicNumber: 29, type: 'transition', period: 4, group: 11 },
    'Zn': { name: 'Zinc', symbol: 'Zn', atomicMass: 65.38, atomicNumber: 30, type: 'transition', period: 4, group: 12 },
    'Ga': { name: 'Gallium', symbol: 'Ga', atomicMass: 69.72, atomicNumber: 31, type: 'post-transition', period: 4, group: 13 },
    'Ge': { name: 'Germanium', symbol: 'Ge', atomicMass: 72.63, atomicNumber: 32, type: 'metalloid', period: 4, group: 14 },
    'As': { name: 'Arsenic', symbol: 'As', atomicMass: 74.92, atomicNumber: 33, type: 'metalloid', period: 4, group: 15 },
    'Se': { name: 'Selenium', symbol: 'Se', atomicMass: 78.97, atomicNumber: 34, type: 'nonmetal', period: 4, group: 16 },
    'Kr': { name: 'Krypton', symbol: 'Kr', atomicMass: 83.80, atomicNumber: 36, type: 'noble-gas', period: 4, group: 18 },
    'Te': { name: 'Tellurium', symbol: 'Te', atomicMass: 127.60, atomicNumber: 52, type: 'metalloid', period: 5, group: 16 }
  };

  /* Atomic mass numbers (A) to print on each card, per the reference chart
     supplied by the team ("Atomic number, symbols and atomic mass number"). */
  var MASS_DISPLAY = {
    'H': '1', 'He': '4', 'Li': '6.9', 'Be': '9', 'B': '10.8', 'C': '12', 'N': '14',
    'O': '16', 'F': '18.9', 'Ne': '20', 'Na': '23', 'Mg': '24', 'Al': '27', 'Si': '28',
    'P': '31', 'S': '32', 'Cl': '35.5', 'Ar': '40', 'K': '39', 'Ca': '40', 'Sc': '45',
    'Ti': '47.8', 'V': '51', 'Cr': '52', 'Mn': '55', 'Fe': '55.8', 'Co': '58.9',
    'Ni': '58.6', 'Cu': '63.5', 'Zn': '65.3', 'Ga': '69.7', 'Ge': '72.6', 'As': '74.9',
    'Se': '78.9', 'Br': '79.9', 'Kr': '83.7', 'Sr': '87.6', 'Te': '127.6', 'I': '126.9', 'Ba': '137'
  };
  function massOf(symbol) {
    if (MASS_DISPLAY[symbol] != null) return MASS_DISPLAY[symbol];
    var el = elements[symbol];
    return el ? String(Math.round(el.atomicMass)) : '';
  }

  var CHAPTERS = {
    1: { name: 'The Chaos Era', year: 'Pre-1829', icon: 'badge-chaos', title: 'The Chaotic Beginning' },
    2: { name: "Dobereiner's Triads", year: '1829', icon: 'badge-triad', title: 'Triad Triumph' },
    3: { name: "Newlands' Octaves", year: '1864', icon: 'badge-octave', title: 'Octave Organizer' },
    4: { name: "Mendeleev's Table", year: '1869', icon: 'badge-mendeleev', title: "Mendeleev's Vision" },
    5: { name: 'The Modern Table', year: '1913', icon: 'badge-modern', title: 'Modern Master' }
  };

  /* =======================================================================
     PROGRESS (localStorage)
     ======================================================================= */
  var SAVE_KEY = 'periodic_odyssey_v1';
  var progress = { unlocked: 1, completed: [], music: true, sfx: true };

  function loadProgress() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        progress.unlocked = p.unlocked || 1;
        progress.completed = p.completed || [];
        progress.music = (p.music !== false);
        progress.sfx = (p.sfx !== false);
      }
    } catch (e) { /* storage unavailable -> defaults */ }
  }
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {}
  }
  function markStageComplete(stage) {
    if (progress.completed.indexOf(stage) === -1) progress.completed.push(stage);
    if (stage + 1 > progress.unlocked) progress.unlocked = Math.min(stage + 1, 6);
    saveProgress();
  }

  /* =======================================================================
     GAME STATE
     ======================================================================= */
  var gameState = {};
  function resetGameState() {
    gameState = {
      currentStage: 0,
      badges: [],
      stage2: { completedTriads: 0, correctTriads: [['Li', 'Na', 'K'], ['Ca', 'Sr', 'Ba'], ['Cl', 'Br', 'I']] },
      stage3: { placedCount: 0,
        correctOrder: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca'],
        notes: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88] },
      stage4: { placedCount: 0, totalElements: 25 },
      stage5: { selectedElement: null, pairsToSwap: [['Ar', 'K'], ['Co', 'Ni']], swappedCorrectly: 0 }
    };
  }

  /* handy element refs */
  var $ = function (id) { return document.getElementById(id); };
  var mentorText, mentorBubble, nextStageButton;

  /* =======================================================================
     TILE CREATION (lit-from-within brass plate; optional element art)
     ======================================================================= */
  function createTile(symbol, isStatic) {
    var el = elements[symbol];
    if (!el) return document.createElement('div');
    var tile = document.createElement('div');
    tile.className = 'tile cat-' + el.type;
    tile.dataset.symbol = symbol;
    tile.innerHTML =
      '<span class="tile-glow"></span>' +
      '<span class="tile-mass" title="Atomic mass">' + massOf(symbol) + '</span>' +
      '<span class="tile-num" title="Atomic number">' + el.atomicNumber + '</span>' +
      '<span class="tile-core">' +
        '<span class="tile-sym">' + symbol + '</span>' +
      '</span>' +
      '<span class="tile-name">' + el.name.substring(0, 9) + '</span>';
    tryImage(IMG + 'elements/' + symbol + '.png', function (img) {
      var ph = document.createElement('img');
      ph.className = 'tile-photo'; ph.src = img.src; ph.alt = '';
      tile.insertBefore(ph, tile.firstChild);
      tile.classList.add('tile-img');
    });
    if (isStatic) tile.classList.add('static');
    else DragMgr.makeDraggable(tile);
    return tile;
  }

  function lockTile(tile) { tile.classList.add('static'); tile.style.pointerEvents = 'none'; }

  /* =======================================================================
     UNIFIED POINTER DRAG MANAGER  (mouse + touch identical)
     ======================================================================= */
  var DragMgr = (function () {
    var active = null, lastZone = null, cloneLayer = null;

    function layer() { if (!cloneLayer) cloneLayer = $('drag-clone-layer'); return cloneLayer; }

    function makeDraggable(tile) { tile.addEventListener('pointerdown', onDown); }

    function detach(tile, id) {
      tile.removeEventListener('pointermove', onMove);
      tile.removeEventListener('pointerup', onUp);
      tile.removeEventListener('pointercancel', onUp);
      tile.removeEventListener('lostpointercapture', onLost);
      try { tile.releasePointerCapture(id); } catch (_) {}
    }

    /* belt & braces: remove ANY orphaned ghost tile / stale source styling */
    function sweepGhosts() {
      Array.prototype.forEach.call(document.querySelectorAll('.drag-clone'), function (c) { c.remove(); });
      Array.prototype.forEach.call(document.querySelectorAll('.tile.dragging-src'), function (t) {
        t.classList.remove('dragging-src'); t.style.pointerEvents = '';
      });
    }

    /* fully abort the current drag; safe to call at any time, never throws */
    function cancelActive() {
      if (active) {
        var tile = active.tile;
        detach(tile, active.id);
        if (active.clone) active.clone.remove();
        tile.classList.remove('dragging-src');
        tile.style.pointerEvents = '';
        active = null;
      }
      setHighlight(null);
      sweepGhosts();
    }

    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      /* a drag is already running (second finger, or a stale one after an
         interruption): abort it cleanly so no ghost is ever left behind */
      if (active) {
        if (e.pointerId === active.id) return;
        cancelActive();
      }
      var tile = e.currentTarget;
      if (tile.classList.contains('static')) return;
      var rect = tile.getBoundingClientRect();
      active = {
        tile: tile, id: e.pointerId, sx: e.clientX, sy: e.clientY,
        ox: e.clientX - rect.left, oy: e.clientY - rect.top,
        w: rect.width, h: rect.height, moved: false, clone: null
      };
      try { tile.setPointerCapture(e.pointerId); } catch (_) {}
      tile.addEventListener('pointermove', onMove);
      tile.addEventListener('pointerup', onUp);
      tile.addEventListener('pointercancel', onUp);
      tile.addEventListener('lostpointercapture', onLost);
      e.preventDefault();
    }

    function onMove(e) {
      if (!active || e.pointerId !== active.id) return;
      var dx = e.clientX - active.sx, dy = e.clientY - active.sy;
      if (!active.moved) {
        if (Math.sqrt(dx * dx + dy * dy) < 6) return;
        active.moved = true;
        var c = active.tile.cloneNode(true);
        c.classList.add('drag-clone');
        c.style.width = active.w + 'px'; c.style.height = active.h + 'px';
        layer().appendChild(c);
        active.clone = c;
        active.tile.classList.add('dragging-src');
        active.tile.style.pointerEvents = 'none';
      }
      active.clone.style.left = (e.clientX - active.ox) + 'px';
      active.clone.style.top = (e.clientY - active.oy) + 'px';
      setHighlight(zoneUnder(e.clientX, e.clientY));
    }

    function onUp(e) {
      if (!active || e.pointerId !== active.id) return;
      var tile = active.tile, moved = active.moved, clone = active.clone;
      var x = e.clientX, y = e.clientY;
      detach(tile, active.id);
      active = null;
      if (moved) {
        if (clone) clone.remove();
        tile.classList.remove('dragging-src'); tile.style.pointerEvents = '';
        setHighlight(null);
        var z = zoneUnder(x, y);
        if (z) handleDrop(z, tile);
        sweepGhosts();
      } else if (typeof tile._onTap === 'function') {
        tile._onTap();
      }
    }

    /* the browser revoked our pointer capture (tab switch, system gesture,
       node reparented mid-drag ...): pointerup will never arrive, so abort */
    function onLost() { if (active) cancelActive(); }

    function zoneUnder(x, y) {
      var el = document.elementFromPoint(x, y);
      return el ? el.closest('.drop-zone') : null;
    }
    function setHighlight(z) {
      if (lastZone && lastZone !== z) lastZone.classList.remove('drop-zone-hover');
      if (z) z.classList.add('drop-zone-hover');
      lastZone = z;
    }

    /* global safety nets: anything that can interrupt a drag cancels it */
    window.addEventListener('blur', cancelActive);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelActive();
    });

    return { makeDraggable: makeDraggable, cancel: cancelActive };
  })();

  function handleDrop(zone, tile) {
    var handlers = { 2: handleStage2Drop, 3: handleStage3Drop, 4: handleStage4Drop };
    if (handlers[gameState.currentStage]) handlers[gameState.currentStage](zone, tile);
  }

  /* =======================================================================
     MENTOR / BADGES / EFFECTS
     ======================================================================= */
  function showMentorMessage(text, showButton) {
    mentorText.textContent = text;
    mentorBubble.classList.add('show');
    nextStageButton.classList.toggle('hidden', !showButton);
  }

  function awardBadge(stage, silent) {
    markStageComplete(stage);
    if (gameState.badges.indexOf(stage) !== -1) return;
    gameState.badges.push(stage);
    var badge = document.createElement('div');
    badge.className = 'badge';
    badge.title = (CHAPTERS[stage] && CHAPTERS[stage].title) || ('Chapter ' + stage);
    var img = document.createElement('img');
    img.src = IMG + 'ui/emoji/' + CHAPTERS[stage].icon + '.png'; img.alt = badge.title;
    badge.appendChild(img);
    $('badge-container').appendChild(badge);
    if (silent) { badge.classList.add('earned'); }
    else setTimeout(function () { badge.classList.add('earned'); }, 100);
  }

  function triggerConfetti() {
    var container = $('confetti-container');
    if (container.children.length > 300) container.innerHTML = '';
    var colors = ['#ffd76a', '#f2c14e', '#c98a1f', '#43c9a6', '#7be0c8', '#a5b4fc', '#e879f9', '#fb7185', '#eef0ec'];
    for (var i = 0; i < 50; i++) {
      var c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDelay = (Math.random() * 1) + 's';
      c.style.transform = 'scale(' + (Math.random() * 0.6 + 0.5) + ')';
      container.appendChild(c);
    }
    setTimeout(function () { if (container.children.length > 0) container.innerHTML = ''; }, 4000);
  }

  /* =======================================================================
     STAGE 1: CHAOS
     ======================================================================= */
  function setupStage1() {
    var chaosZone = $('chaos-zone');
    chaosZone.innerHTML = '';
    ['H', 'Li', 'C', 'O', 'Na', 'Mg', 'S', 'Cl', 'K', 'Ca', 'Br', 'I'].forEach(function (symbol) {
      var tile = createTile(symbol, true);
      tile.style.left = (Math.random() * 82) + '%';
      tile.style.top = (Math.random() * 78) + '%';
      tile.style.transform = 'rotate(' + (Math.random() * 24 - 12) + 'deg)';
      tile.addEventListener('pointerdown', function () {
        tile.classList.add('incorrect-shake');
        Audio.sfx('wrong');
        setTimeout(function () { tile.classList.remove('incorrect-shake'); }, 500);
      });
      chaosZone.appendChild(tile);
    });
    showMentorMessage("What a jumble! The early chemists were baffled. We need a system to bring order to these elements.", true);
    awardBadge(1);
  }

  /* =======================================================================
     STAGE 2: DOBEREINER'S TRIADS
     ======================================================================= */
  function setupStage2() {
    var source = $('triad-elements-source');
    source.innerHTML = '';
    ['Li', 'Na', 'K', 'Ca', 'Sr', 'Ba', 'Cl', 'Br', 'I'].sort(function () { return Math.random() - 0.5; })
      .forEach(function (s) { source.appendChild(createTile(s)); });
    Array.prototype.forEach.call($('triad-drop-zones').children, function (dz, i) {
      dz.innerHTML = '<span class="slot-hint">Triad ' + ['I', 'II', 'III'][i] + '</span>';
      dz.className = 'drop-zone triad-slot';
    });
    showMentorMessage("Dobereiner spotted 'triads' - families of three. Group them in order of increasing atomic mass!");
  }

  function handleStage2Drop(dropZone, tile) {
    if (dropZone.children.length < 3 && !dropZone.classList.contains('locked')) {
      var hint = dropZone.querySelector('.slot-hint');
      if (hint) hint.remove();
      dropZone.appendChild(tile);
      if (dropZone.children.length !== 3) return;
      var symbolsInZone = Array.prototype.map.call(dropZone.children, function (t) { return t.dataset.symbol; });
      var isCorrect = gameState.stage2.correctTriads.some(function (triad) {
        return JSON.stringify(triad) === JSON.stringify(symbolsInZone);
      });
      if (isCorrect) {
        dropZone.classList.add('locked');
        Array.prototype.forEach.call(dropZone.children, lockTile);
        Audio.sfx('lock');
        gameState.stage2.completedTriads++;
        showMentorMessage("Excellent! A perfect triad. " + (3 - gameState.stage2.completedTriads) + " to go!");
        if (gameState.stage2.completedTriads === 3) {
          setTimeout(function () {
            showMentorMessage("You found them all! But triads don't work for every element. Let's try another way.", true);
            awardBadge(2);
          }, 1000);
        }
      } else {
        Audio.sfx('wrong');
        showMentorMessage("Hmm - that isn't a known triad, or they aren't ordered by atomic mass. Try again.");
        var source = $('triad-elements-source');
        Array.prototype.slice.call(dropZone.children).forEach(function (child) {
          child.classList.add('incorrect-shake');
          setTimeout(function () { child.classList.remove('incorrect-shake'); source.appendChild(child); }, 500);
        });
      }
    }
  }

  /* =======================================================================
     STAGE 3: NEWLANDS' OCTAVES
     ======================================================================= */
  function setupStage3() {
    var source = $('octave-elements-source');
    var dropZone = $('octave-drop-zone');
    source.innerHTML = ''; dropZone.innerHTML = '';
    gameState.stage3.correctOrder.forEach(function (_, i) {
      var slot = document.createElement('div');
      slot.className = 'drop-zone'; slot.dataset.index = i;
      dropZone.appendChild(slot);
    });
    gameState.stage3.correctOrder.slice().sort(function () { return Math.random() - 0.5; })
      .forEach(function (s) { source.appendChild(createTile(s)); });
    showMentorMessage("Newlands arranged elements by atomic mass and found a pattern every 8th element - like musical octaves!");
  }

  function handleStage3Drop(dropZone, tile) {
    if (dropZone.children.length > 0) return;
    var index = parseInt(dropZone.dataset.index, 10);
    if (isNaN(index)) return;
    var symbol = tile.dataset.symbol;
    var source = $('octave-elements-source');
    if (gameState.stage3.correctOrder[index] === symbol) {
      dropZone.appendChild(tile);
      dropZone.classList.add('locked'); lockTile(tile);
      var noteIndex = index % gameState.stage3.notes.length;
      Audio.sfx('note', gameState.stage3.notes[noteIndex], 0.3);
      var noteEl = document.createElement('span');
      noteEl.className = 'musical-note';
      noteEl.innerHTML = '<img src="' + IMG + 'ui/emoji/note.png" alt="">';
      dropZone.appendChild(noteEl);
      setTimeout(function () { noteEl.remove(); }, 1000);
      gameState.stage3.placedCount++;
      if (gameState.stage3.placedCount === gameState.stage3.correctOrder.length) {
        setTimeout(function () {
          showMentorMessage("Hear that? A pattern emerges! But it breaks down with heavier elements. On to a better model.", true);
          awardBadge(3); Audio.sfx('celebrate');
        }, 500);
      }
    } else {
      Audio.sfx('wrong');
      tile.classList.add('incorrect-shake');
      setTimeout(function () { tile.classList.remove('incorrect-shake'); source.appendChild(tile); }, 500);
    }
  }

  /* =======================================================================
     STAGE 4: MENDELEEV'S TABLE
     ======================================================================= */
  function setupStage4() {
    var source = $('mendeleev-elements-source');
    var table = $('mendeleev-table');
    source.innerHTML = ''; table.innerHTML = '';

    var layout = [
      'H', null, null, null, null, null, null, null,
      'Li', 'Be', 'B', 'C', 'N', 'O', 'F', null,
      'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', null,
      'K', 'Ca', 'gap-45', 'Ti', 'V', null, null, null,
      'Cu', 'Zn', 'gap-68', 'gap-70', 'As', 'Se', 'Br', null,
      null, null, 'Sr', null, null, null, null, null
    ];
    var preFilled = ['H', 'Be', 'C', 'O', 'F', 'Na', 'Si', 'Cl', 'Ca', 'Ti', 'Zn', 'As'];
    var toDrag = ['Li', 'B', 'N', 'Mg', 'Al', 'P', 'S', 'K', 'V', 'Cu', 'Se', 'Br', 'Sr'];

    layout.forEach(function (symbol) {
      if (symbol) {
        var cell = document.createElement('div');
        cell.className = 'drop-zone';
        cell.dataset.expected = symbol;
        if (preFilled.indexOf(symbol) !== -1) {
          var tile = createTile(symbol, true);
          cell.appendChild(tile);
          cell.classList.add('locked');
          gameState.stage4.placedCount++;
        }
        if (symbol.indexOf('gap') === 0) {
          cell.classList.add('mendeleev-gap');
          cell.innerHTML = '?<span class="gap-mass">Mass ' + symbol.split('-')[1] + '</span>';
        }
        table.appendChild(cell);
      } else {
        table.appendChild(document.createElement('div'));
      }
    });

    toDrag.sort(function () { return Math.random() - 0.5; })
      .forEach(function (s) { source.appendChild(createTile(s)); });

    showMentorMessage("Mentor: I've placed the known elements. Fill in the rest - and notice the glowing gaps Mendeleev left for elements not yet discovered!");
  }

  function handleStage4Drop(dropZone, tile) {
    if (dropZone.children.length > 0 && !dropZone.classList.contains('mendeleev-gap')) return;
    var expected = dropZone.dataset.expected;
    var symbol = tile.dataset.symbol;
    var source = $('mendeleev-elements-source');
    var ok = (expected === symbol) ||
      (expected === 'gap-45' && symbol === 'Sc') ||
      (expected === 'gap-68' && symbol === 'Ga') ||
      (expected === 'gap-70' && symbol === 'Ge');
    if (ok) {
      dropZone.innerHTML = '';
      dropZone.appendChild(tile);
      dropZone.classList.add('locked'); lockTile(tile);
      Audio.sfx('correct');
      gameState.stage4.placedCount++;
      if (expected.indexOf('gap') === 0) {
        dropZone.style.animation = 'glowGold 1s ease-in-out';
        showMentorMessage("A predicted element fits perfectly!");
      }
      if (gameState.stage4.placedCount === gameState.stage4.totalElements) {
        setTimeout(function () {
          showMentorMessage("Incredible! His table even predicted undiscovered elements. But some sit oddly by mass...", true);
          awardBadge(4); Audio.sfx('celebrate');
        }, 500);
      }
    } else {
      Audio.sfx('wrong');
      tile.classList.add('incorrect-shake');
      setTimeout(function () { tile.classList.remove('incorrect-shake'); source.appendChild(tile); }, 500);
    }
  }

  /* =======================================================================
     STAGE 5: MODERN TABLE (tap-to-swap)
     ======================================================================= */
  function setupStage5() {
    var table = $('modern-table');
    table.innerHTML = '';
    var modernLayout = [
      'H', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'He',
      'Li', 'Be', null, null, null, null, null, null, null, null, null, null, 'B', 'C', 'N', 'O', 'F', 'Ne',
      'Na', 'Mg', null, null, null, null, null, null, null, null, null, null, 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
      'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'
    ];
    var displayLayout = modernLayout.slice();
    function swap(arr, a, b) {
      var i1 = arr.indexOf(a), i2 = arr.indexOf(b);
      if (i1 > -1 && i2 > -1) { var t = arr[i1]; arr[i1] = arr[i2]; arr[i2] = t; }
    }
    swap(displayLayout, 'Ar', 'K');
    swap(displayLayout, 'Co', 'Ni');
    displayLayout.forEach(function (symbol) {
      if (symbol) {
        var tile = createTile(symbol, true);
        tile.classList.add('swap-tile');
        tile.addEventListener('click', handleStage5Swap);
        table.appendChild(tile);
      } else {
        table.appendChild(document.createElement('div'));
      }
    });
    showMentorMessage("Moseley reordered the table by ATOMIC NUMBER, not mass. Tap two plates to swap them into their true places!");
  }

  function swapNodes(a, b) {
    var am = document.createComment(''); a.parentNode.insertBefore(am, a);
    var bm = document.createComment(''); b.parentNode.insertBefore(bm, b);
    bm.parentNode.insertBefore(a, bm);
    am.parentNode.insertBefore(b, am);
    am.remove(); bm.remove();
  }

  function handleStage5Swap(e) {
    var clickedTile = e.currentTarget;
    if (clickedTile.classList.contains('locked')) return;
    if (!gameState.stage5.selectedElement) {
      gameState.stage5.selectedElement = clickedTile;
      clickedTile.classList.add('element-swap-selected');
      return;
    }
    var firstTile = gameState.stage5.selectedElement;
    if (firstTile === clickedTile) {
      firstTile.classList.remove('element-swap-selected');
      gameState.stage5.selectedElement = null;
      return;
    }
    swapNodes(firstTile, clickedTile);
    firstTile.classList.remove('element-swap-selected');
    gameState.stage5.selectedElement = null;

    var sym1 = firstTile.dataset.symbol, sym2 = clickedTile.dataset.symbol;
    var isCorrect = gameState.stage5.pairsToSwap.some(function (pair) {
      return pair.indexOf(sym1) !== -1 && pair.indexOf(sym2) !== -1;
    });

    if (isCorrect) {
      firstTile.classList.add('locked'); clickedTile.classList.add('locked');
      Audio.sfx('lock');
      gameState.stage5.swappedCorrectly++;
      var left = gameState.stage5.pairsToSwap.length - gameState.stage5.swappedCorrectly;
      showMentorMessage("Perfect! " + sym1 + " and " + sym2 + " are in order now. " + left + " pair" + (left === 1 ? '' : 's') + " left.");
      if (gameState.stage5.swappedCorrectly === gameState.stage5.pairsToSwap.length) {
        setTimeout(function () {
          showMentorMessage("You've mastered the modern Periodic Table! The odyssey is complete.", true);
          awardBadge(5); Audio.sfx('celebrate');
        }, 500);
      }
    } else {
      Audio.sfx('wrong');
      firstTile.classList.add('incorrect-shake'); clickedTile.classList.add('incorrect-shake');
      setTimeout(function () {
        firstTile.classList.remove('incorrect-shake'); clickedTile.classList.remove('incorrect-shake');
        swapNodes(firstTile, clickedTile); /* BUGFIX: revert wrong swap */
      }, 520);
    }
  }

  /* =======================================================================
     STAGE 6: VICTORY
     ======================================================================= */
  function setupStage6() {
    showMentorMessage("Astonishing work - you are now a Grandmaster of the Elements!");
    Audio.sfx('celebrate');
    markStageComplete(5);
    var count = 0;
    var interval = setInterval(function () { triggerConfetti(); count++; if (count > 5) clearInterval(interval); }, 500);
  }

  /* =======================================================================
     GAME FLOW
     ======================================================================= */
  function updateHud(stage) {
    var track = $('progress-track');
    track.innerHTML = '';
    for (var s = 1; s <= 5; s++) {
      var pip = document.createElement('div');
      pip.className = 'progress-pip';
      if (stage > s || stage === 6) pip.classList.add('done');
      else if (stage === s) pip.classList.add('current');
      track.appendChild(pip);
    }
    var ch = CHAPTERS[stage];
    if (ch) { $('hud-year').textContent = ch.year; $('hud-era').textContent = ch.name; }
    else { $('hud-year').textContent = ''; $('hud-era').textContent = 'Journey Complete'; }
  }

  function changeStage(newStage) {
    DragMgr.cancel(); /* never carry a drag (or its ghost) across stages */
    /* deactivate EVERY stage (not just the tracked one) so nothing stacks,
       e.g. when Play Again resets currentStage before switching */
    Array.prototype.forEach.call(document.querySelectorAll('.stage'), function (s) {
      s.classList.remove('active');
    });
    gameState.currentStage = newStage;
    var next = $('stage-' + newStage);
    if (next) next.classList.add('active');

    var setups = { 1: setupStage1, 2: setupStage2, 3: setupStage3, 4: setupStage4, 5: setupStage5, 6: setupStage6 };
    if (setups[newStage]) setups[newStage]();

    updateHud(newStage);
    var resettable = (newStage >= 2 && newStage <= 5);
    $('reset-stage-button').classList.toggle('hidden', !resettable);
    if (newStage === 6) mentorBubble.classList.remove('show');
  }

  function startGame(startStage) {
    resetGameState();
    $('badge-container').innerHTML = '';
    $('confetti-container').innerHTML = '';
    /* pre-award badges for chapters already completed before the start point */
    for (var s = 1; s < startStage; s++) {
      if (progress.completed.indexOf(s) !== -1) { gameState.badges.push(s); renderSilentBadge(s); }
    }
    showScreen('screen-game');
    changeStage(startStage);
  }

  function renderSilentBadge(stage) {
    var badge = document.createElement('div');
    badge.className = 'badge earned';
    badge.title = CHAPTERS[stage].title;
    var img = document.createElement('img');
    img.src = IMG + 'ui/emoji/' + CHAPTERS[stage].icon + '.png'; img.alt = badge.title;
    badge.appendChild(img);
    $('badge-container').appendChild(badge);
  }

  /* =======================================================================
     SCREEN / OVERLAY MANAGEMENT
     ======================================================================= */
  function showScreen(id) {
    DragMgr.cancel(); /* leaving mid-drag must never leave a ghost behind */
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) {
      s.classList.toggle('active', s.id === id);
    });
  }
  function openOverlay(id) { $(id).classList.add('open'); }
  function closeOverlay(id) { $(id).classList.remove('open'); }

  function buildChapterSelect() {
    var grid = $('chapters-grid');
    grid.innerHTML = '';
    for (var s = 1; s <= 5; s++) {
      (function (stage) {
        var ch = CHAPTERS[stage];
        var unlocked = stage <= progress.unlocked;
        var done = progress.completed.indexOf(stage) !== -1;
        var card = document.createElement('button');
        card.className = 'chapter-card' + (unlocked ? '' : ' locked') + (done ? ' done' : '');
        var statusImg = done
          ? '<img src="' + IMG + 'ui/check.png" alt="Completed">'
          : (unlocked ? '<img src="' + IMG + 'ui/star-empty.png" alt="Available">' : '');
        card.innerHTML =
          (unlocked ? '' : '<img class="ch-lock" src="' + IMG + 'ui/lock.png" alt="Locked">') +
          '<img class="ch-medallion" src="' + IMG + 'ui/emoji/' + ch.icon + '.png" alt="">' +
          '<div class="ch-num">Chapter ' + stage + ' &middot; ' + ch.year + '</div>' +
          '<div class="ch-name">' + ch.name + '</div>' +
          '<div class="ch-status">' + statusImg + '</div>';
        if (unlocked) card.addEventListener('click', function () { startGame(stage); });
        grid.appendChild(card);
      })(s);
    }
  }

  function refreshBeginLabel() {
    var lbl = $('begin-label');
    if (progress.unlocked > 1 && progress.unlocked <= 5) lbl.textContent = 'Continue Odyssey';
    else if (progress.unlocked >= 6) lbl.textContent = 'Replay Odyssey';
    else lbl.textContent = 'Begin the Odyssey';
  }

  /* =======================================================================
     AMBIENT BACKGROUND (decorative)
     ======================================================================= */
  function buildBackground() {
    var glyphs = ['Au', 'Ag', 'Hg', 'Fe', 'Cu', 'Sn', 'Pb', 'Sb', 'Zn', 'S', 'H', 'O', 'N', 'C'];
    var symWrap = $('bg-symbols');
    for (var i = 0; i < 14; i++) {
      var g = document.createElement('span');
      g.className = 'bg-symbol';
      g.textContent = glyphs[i % glyphs.length];
      g.style.left = (Math.random() * 96) + 'vw';
      g.style.fontSize = (Math.random() * 40 + 26) + 'px';
      g.style.animationDuration = (Math.random() * 24 + 26) + 's';
      g.style.animationDelay = (-Math.random() * 40) + 's';
      symWrap.appendChild(g);
    }
    var moteWrap = $('bg-motes');
    for (var j = 0; j < 32; j++) {
      var m = document.createElement('span');
      m.className = 'bg-mote';
      var sz = Math.random() * 5 + 2;
      m.style.width = sz + 'px'; m.style.height = sz + 'px';
      m.style.left = (Math.random() * 100) + 'vw';
      m.style.animationDuration = (Math.random() * 16 + 12) + 's';
      m.style.animationDelay = (-Math.random() * 24) + 's';
      moteWrap.appendChild(m);
    }
  }

  /* =======================================================================
     SETTINGS TOGGLES
     ======================================================================= */
  function applyToggleUi() {
    var m = $('toggle-music'), mi = $('toggle-music-img');
    m.dataset.on = progress.music ? 'true' : 'false';
    m.setAttribute('aria-pressed', progress.music ? 'true' : 'false');
    mi.src = IMG + 'ui/' + (progress.music ? 'music-on.png' : 'music-off.png');
    mi.alt = progress.music ? 'Music on' : 'Music off';
    var s = $('toggle-sfx'), si = $('toggle-sfx-img');
    s.dataset.on = progress.sfx ? 'true' : 'false';
    s.setAttribute('aria-pressed', progress.sfx ? 'true' : 'false');
    si.src = IMG + 'ui/' + (progress.sfx ? 'sound-on.png' : 'sound-off.png');
    si.alt = progress.sfx ? 'Sound on' : 'Sound off';
  }

  /* =======================================================================
     WIRING
     ======================================================================= */
  function wire() {
    mentorText = $('mentor-text');
    mentorBubble = $('mentor-bubble');
    nextStageButton = $('next-stage-button');

    // menu
    $('btn-begin').addEventListener('click', function () {
      var start = (progress.unlocked >= 6) ? 1 : progress.unlocked;
      startGame(start || 1);
    });
    $('btn-chapters').addEventListener('click', function () { buildChapterSelect(); showScreen('screen-levels'); });
    $('btn-howto').addEventListener('click', function () { openOverlay('ov-howto'); });
    $('btn-levels-back').addEventListener('click', function () { showScreen('screen-menu'); refreshBeginLabel(); });

    // in-game
    $('btn-home').addEventListener('click', function () { showScreen('screen-menu'); refreshBeginLabel(); });
    $('btn-settings').addEventListener('click', function () { openOverlay('ov-settings'); });
    $('reset-stage-button').addEventListener('click', function () {
      DragMgr.cancel(); /* reset always clears any in-flight drag + ghosts */
      Audio.sfx('wrong', 150, 0.2);
      switch (gameState.currentStage) {
        case 2: gameState.stage2.completedTriads = 0; setupStage2(); break;
        case 3: gameState.stage3.placedCount = 0; setupStage3(); break;
        case 4: gameState.stage4.placedCount = 0; setupStage4(); break;
        case 5: gameState.stage5.swappedCorrectly = 0; gameState.stage5.selectedElement = null; setupStage5(); break;
      }
    });
    nextStageButton.addEventListener('click', function () {
      if (gameState.currentStage < 6) changeStage(gameState.currentStage + 1);
    });
    $('restart-button').addEventListener('click', function () { startGame(1); });
    $('btn-learn').addEventListener('click', function () { openOverlay('ov-learn'); });

    // overlays: any [data-close]
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', function () { closeOverlay(btn.getAttribute('data-close')); });
    });
    // click backdrop to close
    Array.prototype.forEach.call(document.querySelectorAll('.overlay'), function (ov) {
      ov.addEventListener('click', function (e) { if (e.target === ov) closeOverlay(ov.id); });
    });

    // settings toggles
    $('toggle-music').addEventListener('click', function () {
      progress.music = !progress.music; saveProgress(); applyToggleUi();
      Audio.musicOn = progress.music; Audio.ensure(); Audio.applyMusic();
    });
    $('toggle-sfx').addEventListener('click', function () {
      progress.sfx = !progress.sfx; saveProgress(); applyToggleUi();
      Audio.sfxOn = progress.sfx; if (progress.sfx) Audio.sfx('lock');
    });

    // first user gesture -> unlock audio + start ambient music
    function firstGesture() {
      Audio.ensure();
      if (Audio.musicOn) Audio.applyMusic();
      document.removeEventListener('pointerdown', firstGesture);
    }
    document.addEventListener('pointerdown', firstGesture);

    // block zoom / context menu / selection gestures (mobile WebView)
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    }, { passive: false });
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function init() {
    loadProgress();
    Audio.musicOn = progress.music;
    Audio.sfxOn = progress.sfx;
    resetGameState();
    wire();
    applyToggleUi();
    buildBackground();
    refreshBeginLabel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
