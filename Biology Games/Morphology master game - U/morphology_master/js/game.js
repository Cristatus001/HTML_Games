/* ============================================================
   Morphology Master :: game controller.

   The examination itself is unchanged from the original build:
   the same three levels, the same options, the same answer key
   and the same verdict copy. What is new around it is the boot
   flow, station select, saved progress, settings and feedback.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.GAME_DATA;

  var Game = {
    levelIndex: 0,      // index into D.levels
    state: {},          // questionId -> chosen value, for the level in play
    wrongTries: 0,      // failed submissions in this sitting, drives the seal count
    booted: false,

    /* ============ Boot ============ */

    boot: function () {
      var self = this;
      var bar = document.querySelector('#boot-fill');
      var note = document.getElementById('boot-note');

      /* Settings are restored before anything can make a sound. */
      global.Sound.sfxOn = global.Store.get('sfx');
      global.Sound.musicOn = global.Store.get('music');

      global.Assets.preload(function (p) {
        if (bar) bar.style.width = Math.round(p * 100) + '%';
      }).then(function () {
        if (note) note.textContent = 'Bench ready';
        global.Ambient.init();
        self.build();
        setTimeout(function () { self.goMenu(); }, 380);
      });
    },

    /* Wire the static chrome once; per-level markup is built on demand. */
    build: function () {
      if (this.booted) return;
      this.booted = true;

      var self = this;
      var A = global.Assets;

      /* --- Icons that live in the static markup --- */
      [
        ['ico-menu-jar',     'frog-specimen'],
        ['ico-play',         'play'],
        ['ico-stations',     'microscope'],
        ['ico-howto',        'clipboard'],
        ['ico-menu-dial',    'dial'],
        ['ico-stations-back','arrow-left'],
        ['ico-lab-back',     'arrow-left'],
        ['ico-lab-dial',     'dial'],
        ['ico-howto-close',  'close'],
        ['ico-set-close',    'close'],
        ['ico-learn-close',  'close'],
        ['ico-medal',        'medal'],
        ['ico-learn',        'notebook'],
        ['ico-win-replay',   'replay'],
        ['ico-win-stations', 'microscope'],
        ['ico-win-home',     'lab-home'],
        ['ico-boot-mark',    'specimen']
      ].forEach(function (pair) {
        var slot = document.getElementById(pair[0]);
        if (!slot) return;
        var node = A.el(pair[1], slot.className, slot.getAttribute('data-alt') || '');
        node.id = pair[0];
        slot.parentNode.replaceChild(node, slot);
      });

      /* --- Menu --- */
      global.UI.onPress(document.getElementById('btn-play'), function () { self.playNext(); });
      global.UI.onPress(document.getElementById('btn-stations'), function () { self.goStations(); });
      global.UI.onPress(document.getElementById('btn-howto'), function () { global.UI.openDialog('dlg-howto'); });
      global.UI.onPress(document.getElementById('btn-menu-settings'), function () { global.UI.openDialog('dlg-settings'); });

      /* --- Stations --- */
      global.UI.onPress(document.getElementById('btn-stations-back'), function () { self.goMenu(); });

      /* --- Lab --- */
      global.UI.onPress(document.getElementById('btn-lab-back'), function () { self.goStations(); });
      global.UI.onPress(document.getElementById('btn-lab-settings'), function () { global.UI.openDialog('dlg-settings'); });

      /* --- Dialog close buttons --- */
      global.UI.onPress(document.getElementById('btn-howto-close'), function () { global.UI.closeDialog('dlg-howto'); });
      global.UI.onPress(document.getElementById('btn-howto-ok'), function () { global.UI.closeDialog('dlg-howto'); });
      global.UI.onPress(document.getElementById('btn-set-close'), function () { global.UI.closeDialog('dlg-settings'); });
      global.UI.onPress(document.getElementById('btn-learn-close'), function () { global.UI.closeDialog('dlg-learn'); });

      /* --- Victory --- */
      global.UI.onPress(document.getElementById('btn-learn'), function () { global.UI.openDialog('dlg-learn'); });
      global.UI.onPress(document.getElementById('btn-win-replay'), function () { self.restartRun(); });
      global.UI.onPress(document.getElementById('btn-win-stations'), function () { self.goStations(); });
      global.UI.onPress(document.getElementById('btn-win-home'), function () { self.goMenu(); });

      /* --- Settings --- */
      this.wireSettings();

      /* --- Static content --- */
      this.fillHowTo();
      this.fillReference();

      /* --- Keyboard --- */
      document.addEventListener('keydown', function (e) { self.onKey(e); });

      /* The first gesture anywhere unlocks audio and starts the music. */
      var kick = function () {
        global.Sound.resume();
        if (global.Store.get('music')) global.Sound.startMusic();
        document.removeEventListener('pointerdown', kick);
        document.removeEventListener('keydown', kick);
      };
      document.addEventListener('pointerdown', kick);
      document.addEventListener('keydown', kick);
    },

    /* ============ Settings ============ */

    wireSettings: function () {
      var self = this;
      var sfxT = document.getElementById('tgl-sfx');
      var musT = document.getElementById('tgl-music');
      var sfxI = document.getElementById('ico-sfx');
      var musI = document.getElementById('ico-music');

      /* Replace the placeholder spans with real icon nodes we can re-point. */
      this.sfxIcon = global.Assets.el(global.Store.get('sfx') ? 'sound-on' : 'sound-off', 'set-ico', 'Sound effects');
      this.sfxIcon.id = 'ico-sfx';
      if (sfxI) sfxI.parentNode.replaceChild(this.sfxIcon, sfxI);

      this.musIcon = global.Assets.el(global.Store.get('music') ? 'music-on' : 'music-off', 'set-ico', 'Music');
      this.musIcon.id = 'ico-music';
      if (musI) musI.parentNode.replaceChild(this.musIcon, musI);

      global.UI.setToggle(sfxT, global.Store.get('sfx'));
      global.UI.setToggle(musT, global.Store.get('music'));

      global.UI.onPress(sfxT, function () {
        var on = !global.Store.get('sfx');
        global.Store.set('sfx', on);
        global.Sound.setSfx(on);
        global.UI.setToggle(sfxT, on);
        /* State change swaps the image source, never a text glyph. */
        self.sfxIcon = global.Assets.swap(self.sfxIcon, on ? 'sound-on' : 'sound-off', 'Sound effects');
        self.sfxIcon.id = 'ico-sfx';
        if (on) global.Sound.select();
      });

      global.UI.onPress(musT, function () {
        var on = !global.Store.get('music');
        global.Store.set('music', on);
        global.Sound.setMusic(on);
        if (on) global.Sound.startMusic();
        global.UI.setToggle(musT, on);
        self.musIcon = global.Assets.swap(self.musIcon, on ? 'music-on' : 'music-off', 'Music');
        self.musIcon.id = 'ico-music';
      });

      global.UI.onPress(document.getElementById('btn-reset'), function () {
        var btn = document.getElementById('btn-reset');
        if (btn.dataset.armed === '1') {
          global.Store.reset();
          btn.dataset.armed = '0';
          btn.querySelector('.btn-txt').textContent = 'Progress cleared';
          global.Sound.warn();
          self.renderStations();
          setTimeout(function () { btn.querySelector('.btn-txt').textContent = 'Reset progress'; }, 1800);
        } else {
          btn.dataset.armed = '1';
          btn.querySelector('.btn-txt').textContent = 'Tap again to confirm';
          global.Sound.warn();
          setTimeout(function () {
            if (btn.dataset.armed === '1') {
              btn.dataset.armed = '0';
              btn.querySelector('.btn-txt').textContent = 'Reset progress';
            }
          }, 3500);
        }
      });
    },

    /* ============ Static content ============ */

    fillHowTo: function () {
      var host = document.getElementById('howto-list');
      if (!host) return;
      host.innerHTML = '';
      D.howToPlay.forEach(function (text, i) {
        var li = document.createElement('li');
        var step = document.createElement('span');
        step.className = 'step';
        step.textContent = String(i + 1);
        var body = document.createElement('span');
        body.innerHTML = text;
        li.appendChild(step);
        li.appendChild(body);
        host.appendChild(li);
      });
    },

    fillReference: function () {
      var host = document.getElementById('learn-body');
      if (!host) return;
      host.innerHTML = '';
      D.reference.forEach(function (sec) {
        var h = document.createElement('h3');
        h.textContent = sec.h;
        host.appendChild(h);

        if (sec.p) {
          var p = document.createElement('p');
          p.textContent = sec.p;
          host.appendChild(p);
        }
        if (sec.dl) {
          var dl = document.createElement('dl');
          sec.dl.forEach(function (row) {
            var dt = document.createElement('dt');
            dt.textContent = row[0];
            var dd = document.createElement('dd');
            dd.textContent = row[1];
            dl.appendChild(dt);
            dl.appendChild(dd);
          });
          host.appendChild(dl);
        }
        if (sec.tags) {
          var row = document.createElement('div');
          row.className = 'tagrow';
          sec.tags.forEach(function (t) {
            var s = document.createElement('span');
            s.className = 'tag';
            s.textContent = t;
            row.appendChild(s);
          });
          host.appendChild(row);
        }
      });
    },

    /* ============ Navigation ============ */

    goMenu: function () {
      global.UI.show('screen-menu');
      this.refreshMenu();
    },

    refreshMenu: function () {
      var seals = document.getElementById('menu-seals');
      if (seals) global.UI.seals(seals, global.Store.totalSeals(), D.levels.length * 3);
      var txt = document.getElementById('btn-play-txt');
      if (!txt) return;
      var next = this.nextUnfinished();
      txt.textContent = next === 0 ? 'Start Examination' : 'Continue Examination';
    },

    /* First level not yet completed; falls back to the last one. */
    nextUnfinished: function () {
      for (var i = 0; i < D.levels.length; i++) {
        if (!global.Store.levelInfo(D.levels[i].id).done) return i;
      }
      return D.levels.length - 1;
    },

    playNext: function () { this.openLevel(this.nextUnfinished()); },

    goStations: function () {
      global.UI.show('screen-stations');
      this.renderStations();
    },

    renderStations: function () {
      var host = document.getElementById('station-grid');
      if (!host) return;
      var self = this;
      host.innerHTML = '';

      D.levels.forEach(function (lvl, idx) {
        var info = global.Store.levelInfo(lvl.id);
        var unlocked = global.Store.isUnlocked(lvl.id);

        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'station panel riveted' + (unlocked ? '' : ' is-locked');
        card.setAttribute('aria-label', 'Station ' + lvl.id + ': ' + lvl.name +
          (unlocked ? '' : ' (locked)'));
        if (!unlocked) card.setAttribute('aria-disabled', 'true');

        var no = document.createElement('div');
        no.className = 'no';
        no.textContent = 'Station ' + (idx + 1 < 10 ? '0' : '') + (idx + 1);

        var badge = document.createElement('div');
        badge.className = 'badge';
        badge.appendChild(global.Assets.el(unlocked ? lvl.badge : 'lock', '', ''));

        var h3 = document.createElement('h3');
        h3.textContent = lvl.name;

        var p = document.createElement('p');
        p.textContent = unlocked ? lvl.tagline : 'Complete the previous station to unlock.';

        var seals = document.createElement('div');
        seals.className = 'seals';
        global.UI.seals(seals, info.seals || 0, 3);

        card.appendChild(no);
        card.appendChild(badge);
        card.appendChild(h3);
        card.appendChild(p);
        card.appendChild(seals);

        if (info.done) {
          var flag = global.Assets.el('verdict-correct', 'done-flag', 'Completed');
          card.appendChild(flag);
        }

        global.UI.onPress(card, function () {
          if (!unlocked) { global.Sound.warn(); global.UI.shake(card); return; }
          self.openLevel(idx);
        });

        host.appendChild(card);
      });
    },

    /* ============ A level ============ */

    openLevel: function (idx) {
      this.levelIndex = idx;
      this.state = {};
      this.wrongTries = 0;
      this.renderLevel();
      global.UI.show('screen-lab');
    },

    level: function () { return D.levels[this.levelIndex]; },

    renderLevel: function () {
      var lvl = this.level();
      var self = this;

      document.getElementById('lab-title').innerHTML =
        'Station ' + (this.levelIndex + 1 < 10 ? '0' : '') + (this.levelIndex + 1) +
        ' &ndash; <b>' + lvl.name + '</b>';

      /* Tell the stylesheet how many questions share the vertical space, so the
         answer art scales up to fill the screen without pushing Submit off it. */
      document.getElementById('screen-lab').style.setProperty('--qc', lvl.questions.length);

      /* Progress pips: one per level, filled up to the current one. */
      var pips = document.getElementById('lab-pips');
      pips.innerHTML = '';
      D.levels.forEach(function (l, i) {
        var pip = document.createElement('i');
        if (i <= self.levelIndex) pip.className = 'on';
        pips.appendChild(pip);
      });

      /* --- Specimen vitrine --- */
      var stage = document.getElementById('vitrine-stage');
      stage.innerHTML = '';
      this.slots = {};
      lvl.questions.forEach(function (q) {
        var slot = document.createElement('div');
        slot.className = 'slot is-empty';

        /* Art and caption are separate boxes so the captions space themselves
           out instead of overlapping when three slots share a phone width. */
        var art = document.createElement('span');
        art.className = 'slot-art';
        art.appendChild(global.Assets.el('specimen', '', ''));

        var tag = document.createElement('span');
        tag.className = 'slot-tag';
        tag.textContent = q.label.replace(/^Select\s+/i, '');

        slot.appendChild(art);
        slot.appendChild(tag);
        stage.appendChild(slot);
        self.slots[q.id] = slot;
      });

      /* --- Worksheet --- */
      document.getElementById('lab-brief').innerHTML = lvl.brief;

      var qhost = document.getElementById('lab-questions');
      qhost.innerHTML = '';
      this.optionEls = {};

      lvl.questions.forEach(function (q, qi) {
        var block = document.createElement('div');
        block.className = 'qblock';

        var head = document.createElement('div');
        head.className = 'qhead';
        var no = document.createElement('span');
        no.className = 'qno';
        no.textContent = String(qi + 1);
        var label = document.createElement('span');
        label.className = 'qlabel';
        label.textContent = q.label;
        head.appendChild(no);
        head.appendChild(label);

        var opts = document.createElement('div');
        opts.className = 'opts';
        opts.setAttribute('role', 'radiogroup');
        opts.setAttribute('aria-label', q.label);

        self.optionEls[q.id] = [];

        q.options.forEach(function (opt) {
          var card = document.createElement('button');
          card.type = 'button';
          card.className = 'opt';
          card.setAttribute('role', 'radio');
          card.setAttribute('aria-checked', 'false');
          card.setAttribute('aria-label', opt.label);

          var thumb = document.createElement('span');
          thumb.className = 'thumb';
          thumb.appendChild(global.Assets.el(opt.img, '', ''));

          var lab = document.createElement('span');
          lab.className = 'label';
          lab.textContent = opt.label;

          card.appendChild(thumb);
          card.appendChild(lab);

          global.UI.onPress(card, function () { self.choose(q, opt, card); });

          opts.appendChild(card);
          self.optionEls[q.id].push({ el: card, opt: opt });
        });

        block.appendChild(head);
        block.appendChild(opts);
        qhost.appendChild(block);
      });

      /* --- Submit --- */
      var submit = document.getElementById('btn-submit');
      var txt = submit.querySelector('.btn-txt');
      txt.textContent = lvl.submitLabel;
      if (!submit.dataset.wired) {
        submit.dataset.wired = '1';
        global.UI.onPress(submit, function () { self.check(); });
      }

      this.updateReadout();
    },

    /* Selecting an option: only clears siblings inside the same question,
       exactly as the original highlight logic did. */
    choose: function (question, option, card) {
      this.state[question.id] = option.value;

      this.optionEls[question.id].forEach(function (entry) {
        var on = entry.opt.value === option.value;
        entry.el.classList.toggle('is-sel', on);
        entry.el.setAttribute('aria-checked', on ? 'true' : 'false');
      });

      /* Mirror the choice into the specimen case. */
      var slot = this.slots[question.id];
      if (slot) {
        var art = slot.querySelector('.slot-art');
        var old = art.querySelector('img, svg');
        var next = global.Assets.el(option.img, '', option.label);
        if (old) art.replaceChild(next, old);
        else art.appendChild(next);
        slot.classList.remove('is-empty');
        slot.classList.remove('pop');
        void slot.offsetWidth;
        slot.classList.add('pop');
      }

      global.Sound.select();
      var c = global.UI.centerOf(card);
      global.UI.burst(c.x, c.y, { count: 8, spread: 70, life: 620 });

      this.updateReadout();
    },

    /* Live trait readout under the vitrine. */
    updateReadout: function () {
      var lvl = this.level();
      var out = document.getElementById('vitrine-readout');
      var parts = [];

      lvl.questions.forEach(function (q) {
        var v = this.state[q.id];
        if (v === undefined) return;
        var map = D.readout[q.id];
        parts.push(map && map[v] ? map[v] : v);
      }, this);

      if (!parts.length) {
        out.textContent = 'Awaiting observations';
        out.classList.add('warn');
      } else if (parts.length < lvl.questions.length) {
        out.textContent = parts.join('  /  ');
        out.classList.add('warn');
      } else {
        out.textContent = parts.join('  /  ');
        out.classList.remove('warn');
      }
    },

    /* ============ Verification ============ */

    check: function () {
      var lvl = this.level();
      var self = this;

      /* Incomplete: same guard, same wording as the original. */
      var missing = lvl.questions.some(function (q) { return self.state[q.id] === undefined; });
      if (missing) {
        global.Sound.warn();
        global.UI.shake(document.getElementById('lab-worksheet'));
        this.verdict('warn', 'Incomplete Data', lvl.incomplete);
        return;
      }

      var correct = Object.keys(lvl.key).every(function (k) {
        return self.state[k] === lvl.key[k];
      });

      if (correct) {
        var seals = Math.max(1, 3 - Math.min(2, this.wrongTries));
        global.Store.recordResult(lvl.id, seals);

        global.Sound.correct();
        global.UI.flash(false);
        var mid = { x: global.innerWidth / 2, y: global.innerHeight * 0.42 };
        global.UI.burst(mid.x, mid.y, { count: 34, spread: 260, life: 1150 });

        var last = this.levelIndex >= D.levels.length - 1;
        this.verdict('ok', lvl.successTitle, lvl.successText, seals, function () {
          if (last) self.win();
          else self.openLevel(self.levelIndex + 1);
        });
      } else {
        this.wrongTries++;
        global.Store.bumpTries(lvl.id);

        global.Sound.wrong();
        global.UI.flash(true);
        global.UI.shake(document.getElementById('lab-worksheet'));

        if (lvl.failDetail) {
          var detail = lvl.failDetail(this.state);
          this.verdict('bad', lvl.failTitle, detail.lead, 0, null, detail.bullets);
        } else {
          this.verdict('bad', lvl.failTitle, lvl.failText);
        }
      }
    },

    /* One dialog covers all three outcomes; the icon is swapped by src. */
    verdict: function (kind, title, text, seals, onContinue, bullets) {
      var icoName = kind === 'ok' ? 'verdict-correct'
                  : kind === 'bad' ? 'verdict-wrong'
                  : 'verdict-incomplete';

      var slot = document.getElementById('verdict-ico');
      var next = global.Assets.el(icoName, 'verdict-ico', title);
      next.id = 'verdict-ico';
      slot.parentNode.replaceChild(next, slot);

      var h = document.getElementById('verdict-title');
      h.textContent = title;
      h.className = kind;

      var body = document.getElementById('verdict-text');
      body.textContent = text;

      if (bullets && bullets.length) {
        var ul = document.createElement('ul');
        bullets.forEach(function (line) {
          var li = document.createElement('li');
          li.appendChild(global.Assets.el('verdict-wrong', 'tick', ''));
          var span = document.createElement('span');
          span.textContent = line;
          li.appendChild(span);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      }

      var sealRow = document.getElementById('verdict-seals');
      if (kind === 'ok' && seals) {
        sealRow.classList.remove('hidden');
        global.UI.seals(sealRow, seals, 3);
      } else {
        sealRow.classList.add('hidden');
      }

      var btn = document.getElementById('btn-verdict');
      var btnTxt = btn.querySelector('.btn-txt');
      btnTxt.textContent = onContinue ? 'Continue' : 'Try Again';
      btn.className = 'btn btn--wide ' + (kind === 'ok' ? 'btn--go' : 'btn--ghost');

      /* Rebind cleanly each time so an old callback can never fire twice. */
      this.verdictAction = onContinue || null;
      if (!btn.dataset.wired) {
        btn.dataset.wired = '1';
        var self = this;
        global.UI.onPress(btn, function () {
          global.UI.closeDialog('dlg-verdict');
          var fn = self.verdictAction;
          self.verdictAction = null;
          if (fn) fn();
        });
      }

      global.UI.openDialog('dlg-verdict');
    },

    /* ============ Victory ============ */

    win: function () {
      global.Store.set('completed', true);

      var host = document.getElementById('win-summary');
      host.innerHTML = '';
      D.victorySummary.forEach(function (line) {
        var li = document.createElement('li');
        li.appendChild(global.Assets.el('verdict-correct', '', ''));
        var span = document.createElement('span');
        span.innerHTML = line;
        li.appendChild(span);
        host.appendChild(li);
      });

      var seals = document.getElementById('win-seals');
      global.UI.seals(seals, global.Store.totalSeals(), D.levels.length * 3);
      document.getElementById('win-seal-count').textContent =
        global.Store.totalSeals() + ' / ' + (D.levels.length * 3);

      global.UI.show('screen-win');
      global.Sound.fanfare();

      /* Celebratory sparks from three points across the top of the card. */
      var w = global.innerWidth;
      var h = global.innerHeight;
      [0.25, 0.5, 0.75].forEach(function (fx, i) {
        setTimeout(function () {
          global.UI.burst(w * fx, h * 0.3, { count: 26, spread: 240, life: 1300 });
        }, i * 190);
      });
    },

    /* "Run Again" replays the examination from station one. Earned seals are
       kept; clearing them is a deliberate action in Settings instead. */
    restartRun: function () {
      this.openLevel(0);
    },

    /* ============ Keyboard ============ */

    onKey: function (e) {
      if (e.key === 'Escape') {
        if (global.UI.closeTop()) e.preventDefault();
        return;
      }

      /* While any dialog is up, Enter dismisses the verdict and runs whatever
         was queued to happen next. */
      if (global.UI.dialogStack.length) {
        if (e.key === 'Enter' && global.UI.isDialogOpen('dlg-verdict')) {
          e.preventDefault();
          global.UI.closeDialog('dlg-verdict');
          var fn = this.verdictAction;
          this.verdictAction = null;
          if (fn) fn();
        }
        return;
      }

      if (global.UI.current !== 'screen-lab') return;

      if (e.key === 'Enter') { e.preventDefault(); this.check(); return; }

      /* Digits pick within the question currently being answered: the first
         unanswered one, or the last if everything is filled in. */
      var n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= 4) {
        var lvl = this.level();
        var target = null;
        for (var i = 0; i < lvl.questions.length; i++) {
          if (this.state[lvl.questions[i].id] === undefined) { target = lvl.questions[i]; break; }
        }
        if (!target) target = lvl.questions[lvl.questions.length - 1];
        var entry = this.optionEls[target.id][n - 1];
        if (entry) { e.preventDefault(); this.choose(target, entry.opt, entry.el); }
      }
    }
  };

  global.Game = Game;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Game.boot(); });
  } else {
    Game.boot();
  }
})(window);
