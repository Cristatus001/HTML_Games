/* ============================================================
   Shared UI plumbing: screen switching, dialogs, pointer input
   and the little bits of juice (sparks, flash, shake).
   ============================================================ */
(function (global) {
  'use strict';

  var UI = {
    current: null,
    dialogStack: [],

    /* ---------- Screens ---------- */
    show: function (id) {
      var all = document.querySelectorAll('.screen');
      for (var i = 0; i < all.length; i++) all[i].classList.remove('is-on');
      var el = document.getElementById(id);
      if (el) {
        el.classList.add('is-on');
        this.current = id;
        var sc = el.querySelector('.scroll');
        if (sc) sc.scrollTop = 0;
      }
    },

    /* ---------- Dialogs ---------- */
    openDialog: function (id) {
      var el = document.getElementById(id);
      if (!el || el.classList.contains('is-on')) return;
      el.classList.add('is-on');
      this.dialogStack.push(id);
      var sc = el.querySelector('.scroll');
      if (sc) sc.scrollTop = 0;
      if (global.Sound) global.Sound.open();
    },

    closeDialog: function (id) {
      var el = document.getElementById(id);
      if (!el || !el.classList.contains('is-on')) return;
      el.classList.remove('is-on');
      var at = this.dialogStack.indexOf(id);
      if (at >= 0) this.dialogStack.splice(at, 1);
      if (global.Sound) global.Sound.close();
    },

    closeTop: function () {
      if (!this.dialogStack.length) return false;
      this.closeDialog(this.dialogStack[this.dialogStack.length - 1]);
      return true;
    },

    isDialogOpen: function (id) {
      var el = document.getElementById(id);
      return !!(el && el.classList.contains('is-on'));
    },

    /* ---------- Unified pointer / keyboard activation ----------
       One path for mouse, touch and pen. Pointer capture keeps the
       gesture attached to the element, and the release is bounds-checked
       so dragging off cancels the press the way a native button does. */
    onPress: function (el, handler) {
      if (!el) return;
      var armed = false;

      el.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button > 0) return;
        armed = true;
        el.classList.add('is-press');
        if (el.setPointerCapture) {
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
        }
        if (global.Sound) global.Sound.resume();
      });

      el.addEventListener('pointerup', function (e) {
        el.classList.remove('is-press');
        if (!armed) return;
        armed = false;
        var r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          handler(e);
        }
      });

      el.addEventListener('pointercancel', function () {
        armed = false;
        el.classList.remove('is-press');
      });

      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          handler(e);
        }
      });
    },

    /* ---------- Toggle switch ---------- */
    setToggle: function (el, on) {
      if (!el) return;
      el.classList.toggle('on', !!on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    },

    /* ---------- Juice ---------- */

    /* Sparks thrown from a point, used on a correct verdict and on selection. */
    burst: function (x, y, opts) {
      var host = document.getElementById('fx');
      if (!host || !document.body.animate) return;

      var o = opts || {};
      var n = o.count || 16;
      var colors = o.colors || ['#8fd94a', '#d8ffb0', '#ffc94a', '#43c9e8'];
      var spread = o.spread || 150;
      var life = o.life || 900;

      for (var i = 0; i < n; i++) {
        var p = document.createElement('div');
        p.className = 'spark';
        var size = 5 + Math.random() * 9;
        var col = colors[(Math.random() * colors.length) | 0];
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.background =
          'radial-gradient(circle at 34% 30%, #ffffff, ' + col + ' 55%, rgba(0,0,0,0))';
        p.style.boxShadow = '0 0 10px ' + col;
        host.appendChild(p);

        var ang = Math.random() * Math.PI * 2;
        var dist = spread * (0.35 + Math.random() * 0.85);
        var dx = Math.cos(ang) * dist;
        var dy = Math.sin(ang) * dist - dist * 0.35;
        var dur = life * (0.6 + Math.random() * 0.6);

        var anim = p.animate(
          [
            { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' +
                         (dy + dist * 0.7).toFixed(1) + 'px) scale(.2)', opacity: 0 }
          ],
          { duration: dur, easing: 'cubic-bezier(.15,.75,.35,1)', fill: 'forwards' }
        );
        anim.onfinish = (function (node) {
          return function () { if (node.parentNode) node.parentNode.removeChild(node); };
        })(p);
      }
    },

    /* Bloom the whole screen briefly. */
    flash: function (bad) {
      var el = document.getElementById('flash');
      if (!el) return;
      el.classList.toggle('bad', !!bad);
      el.classList.remove('go');
      /* Force a reflow so the animation restarts on repeat calls. */
      void el.offsetWidth;
      el.classList.add('go');
    },

    shake: function (el) {
      if (!el) return;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      setTimeout(function () { el.classList.remove('shake'); }, 500);
    },

    centerOf: function (el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },

    /* Build a row of earned / unearned seals. */
    seals: function (host, earned, total) {
      host.innerHTML = '';
      for (var i = 0; i < (total || 3); i++) {
        var on = i < earned;
        var node = global.Assets.el(on ? 'seal-earned' : 'seal-empty', on ? 'earned' : '', '');
        host.appendChild(node);
      }
    },

    clear: function (el) { while (el.firstChild) el.removeChild(el.firstChild); }
  };

  global.UI = UI;
})(window);
