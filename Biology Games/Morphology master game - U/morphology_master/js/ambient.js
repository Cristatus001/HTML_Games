/* ============================================================
   Ambient backdrop.

   Purely decorative: a canvas of drifting motes and bubbles
   over three parallax scenery bands. Nothing here is ever
   hit-tested and it holds no game state, so it cannot affect
   play. Honours prefers-reduced-motion.
   ============================================================ */
(function (global) {
  'use strict';

  var Ambient = {
    canvas: null,
    ctx: null,
    w: 0,
    h: 0,
    dpr: 1,
    motes: [],
    bubbles: [],
    raf: null,
    last: 0,
    reduced: false,

    init: function () {
      this.canvas = document.getElementById('bg-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      try {
        this.reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) {
        this.reduced = false;
      }

      this.resize();
      this.seed();
      this.applyScenery();

      var self = this;
      global.addEventListener('resize', function () { self.resize(); self.seed(); });
      global.addEventListener('orientationchange', function () {
        setTimeout(function () { self.resize(); self.seed(); }, 220);
      });

      /* Pause the loop while the app is backgrounded so a WebView does not
         burn battery redrawing an invisible canvas. */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) self.stop();
        else self.start();
      });

      this.start();
    },

    resize: function () {
      this.dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.w = global.innerWidth;
      this.h = global.innerHeight;
      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    /* Density scales with viewport area so a phone is not over-drawn. */
    count: function (per100k, min, max) {
      var n = Math.round((this.w * this.h) / 100000 * per100k);
      return Math.max(min, Math.min(max, n));
    },

    seed: function () {
      var i;
      this.motes = [];
      this.bubbles = [];

      var moteCount = this.reduced ? 0 : this.count(2.6, 14, 62);
      for (i = 0; i < moteCount; i++) {
        this.motes.push(this.newMote(true));
      }

      var bubbleCount = this.reduced ? 0 : this.count(1.1, 6, 26);
      for (i = 0; i < bubbleCount; i++) {
        this.bubbles.push(this.newBubble(true));
      }
    },

    newMote: function (anywhere) {
      var depth = 0.35 + Math.random() * 0.65;
      return {
        x: Math.random() * this.w,
        y: anywhere ? Math.random() * this.h : this.h + 12,
        r: (0.7 + Math.random() * 1.9) * depth,
        depth: depth,
        vy: -(3 + Math.random() * 11) * depth,
        vx: (Math.random() - 0.5) * 7 * depth,
        phase: Math.random() * Math.PI * 2,
        wob: 0.5 + Math.random() * 1.4,
        hue: Math.random() < 0.62 ? 'spec' : 'cyan',
        alpha: 0.18 + Math.random() * 0.42
      };
    },

    newBubble: function (anywhere) {
      var depth = 0.4 + Math.random() * 0.6;
      return {
        x: Math.random() * this.w,
        y: anywhere ? Math.random() * this.h : this.h + 20,
        r: (3 + Math.random() * 8) * depth,
        depth: depth,
        vy: -(14 + Math.random() * 26) * depth,
        phase: Math.random() * Math.PI * 2,
        wob: 0.6 + Math.random() * 1.2,
        alpha: 0.06 + Math.random() * 0.16
      };
    },

    start: function () {
      if (this.raf || this.reduced) {
        /* Still paint one static frame for reduced-motion users. */
        if (this.reduced && this.ctx) this.draw(0);
        return;
      }
      var self = this;
      this.last = performance.now();
      var step = function (now) {
        var dt = Math.min((now - self.last) / 1000, 0.05);
        self.last = now;
        self.draw(dt);
        self.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    },

    stop: function () {
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    },

    draw: function (dt) {
      var c = this.ctx;
      var t = performance.now() / 1000;
      c.clearRect(0, 0, this.w, this.h);

      var i, b, m;

      /* Bubbles first, so motes read as nearer the viewer. */
      c.lineWidth = 1;
      for (i = 0; i < this.bubbles.length; i++) {
        b = this.bubbles[i];
        b.y += b.vy * dt;
        b.x += Math.sin(t * b.wob + b.phase) * 10 * dt;
        if (b.y + b.r < -10) { this.bubbles[i] = this.newBubble(false); continue; }

        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(200, 245, 255, ' + b.alpha.toFixed(3) + ')';
        c.stroke();
        c.beginPath();
        c.arc(b.x - b.r * 0.3, b.y - b.r * 0.32, b.r * 0.26, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, ' + (b.alpha * 1.5).toFixed(3) + ')';
        c.fill();
      }

      for (i = 0; i < this.motes.length; i++) {
        m = this.motes[i];
        m.y += m.vy * dt;
        m.x += (m.vx + Math.sin(t * m.wob + m.phase) * 9) * dt;
        if (m.y + m.r < -8) { this.motes[i] = this.newMote(false); continue; }
        if (m.x < -20) m.x = this.w + 20;
        if (m.x > this.w + 20) m.x = -20;

        var pulse = 0.7 + 0.3 * Math.sin(t * 1.6 + m.phase);
        var a = (m.alpha * pulse).toFixed(3);
        var col = m.hue === 'spec'
          ? 'rgba(170, 235, 105, ' + a + ')'
          : 'rgba(110, 220, 245, ' + a + ')';

        var g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4.2);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(m.x, m.y, m.r * 4.2, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = 'rgba(240, 255, 220, ' + a + ')';
        c.beginPath();
        c.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        c.fill();
      }
    },

    /* If a scenery PNG was found, use it; otherwise leave the inline SVG
       silhouettes visible underneath. */
    applyScenery: function () {
      [['bg-far', 'bg-far'], ['bg-mid', 'bg-mid'], ['bg-near', 'bg-near']].forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        if (!el) return;
        if (global.Assets && global.Assets.has(pair[1])) {
          el.style.backgroundImage = 'url("' + global.Assets.src(pair[1]) + '")';
          el.style.backgroundSize = 'auto 100%';
          el.classList.add('has-image');
        }
      });
    }
  };

  global.Ambient = Ambient;
})(window);
