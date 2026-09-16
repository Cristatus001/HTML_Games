/* ===========================================================================
   Visual juice: the drifting tidal backdrop, particle bursts, the flight of
   sand grains into the HUD counter, and the completion shower.

   Nothing in here reads or writes game state, and nothing here is allowed to
   affect layout — both canvases are pointer-events:none and sit behind the
   interactive content.
   ======================================================================== */
(function (global) {
  'use strict';

  var reduced = false;
  var ambientCv = null, ambientCx = null, ambientRaf = 0;
  var fxCv = null, fxCx = null, fxRaf = 0;
  var motes = [], sparkles = [], parts = [];
  var dpr = Math.min(global.devicePixelRatio || 1, 2);

  function sizeCanvas(cv) {
    if (!cv) return;
    var w = global.innerWidth, h = global.innerHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    var cx = cv.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return cx;
  }

  function seedAmbient() {
    var w = global.innerWidth, h = global.innerHeight;
    var count = Math.round(Math.min(90, Math.max(28, w * h / 26000)));
    motes = [];
    for (var i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.7 + Math.random() * 2.6,
        /* three parallax bands — near motes drift faster */
        band: Math.random() < 0.34 ? 0 : (Math.random() < 0.5 ? 1 : 2),
        vy: -(0.05 + Math.random() * 0.22),
        vx: (Math.random() - 0.5) * 0.16,
        a: 0.10 + Math.random() * 0.3,
        ph: Math.random() * Math.PI * 2
      });
    }
    sparkles = [];
    for (var j = 0; j < 16; j++) {
      sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.55,
        r: 6 + Math.random() * 26,
        ph: Math.random() * Math.PI * 2,
        sp: 0.0006 + Math.random() * 0.0016
      });
    }
  }

  function drawAmbient(t) {
    var w = global.innerWidth, h = global.innerHeight;
    ambientCx.clearRect(0, 0, w, h);

    /* shallow-water caustic blooms, very low contrast */
    for (var s = 0; s < sparkles.length; s++) {
      var sp = sparkles[s];
      var k = 0.5 + 0.5 * Math.sin(t * sp.sp + sp.ph);
      var g = ambientCx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * (0.7 + k * 0.6));
      g.addColorStop(0, 'rgba(255,255,255,' + (0.055 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ambientCx.fillStyle = g;
      ambientCx.beginPath();
      ambientCx.arc(sp.x, sp.y, sp.r * 1.4, 0, Math.PI * 2);
      ambientCx.fill();
    }

    /* suspended sand and shell grit rising through the water column */
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var speed = [1.5, 1.0, 0.55][m.band];
      m.y += m.vy * speed;
      m.x += (m.vx + Math.sin(t * 0.0004 + m.ph) * 0.10) * speed;
      if (m.y < -12) { m.y = h + 10; m.x = Math.random() * w; }
      if (m.x < -12) m.x = w + 10;
      if (m.x > w + 12) m.x = -10;
      var alpha = m.a * (0.55 + 0.45 * Math.sin(t * 0.0011 + m.ph));
      ambientCx.fillStyle = m.band === 0
        ? 'rgba(120,96,60,' + (alpha * 0.5).toFixed(3) + ')'
        : 'rgba(255,252,242,' + alpha.toFixed(3) + ')';
      ambientCx.beginPath();
      ambientCx.arc(m.x, m.y, m.r * [1.25, 1, 0.8][m.band], 0, Math.PI * 2);
      ambientCx.fill();
    }
  }

  function ambientLoop(t) {
    drawAmbient(t);
    ambientRaf = global.requestAnimationFrame(ambientLoop);
  }

  /* ---- burst particles ---------------------------------------------------- */
  var PALETTE = {
    ochre: ['#f5c073', '#d98f3c', '#8a5316', '#fdf6ea'],
    glass: ['#a8e3cd', '#6fbfa0', '#2f7a63', '#fdf6ea'],
    rust: ['#e07a5f', '#b4472f', '#6d2618', '#efe6d6'],
    sand: ['#fdf6ea', '#d9c9ac', '#b9a583', '#9c8862']
  };

  function fxLoop() {
    var w = global.innerWidth, h = global.innerHeight;
    fxCx.clearRect(0, 0, w, h);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      p.rot += p.vr;
      if (p.life <= 0 || p.y > h + 40) { parts.splice(i, 1); continue; }
      var a = Math.max(0, Math.min(1, p.life / p.life0));
      fxCx.save();
      fxCx.globalAlpha = a;
      fxCx.translate(p.x, p.y);
      fxCx.rotate(p.rot);
      fxCx.fillStyle = p.c;
      if (p.shape === 'bar') fxCx.fillRect(-p.r, -p.r * 0.42, p.r * 2, p.r * 0.84);
      else { fxCx.beginPath(); fxCx.arc(0, 0, p.r, 0, Math.PI * 2); fxCx.fill(); }
      if (p.shape === 'bar') { /* already filled */ }
      fxCx.restore();
    }
    if (parts.length) fxRaf = global.requestAnimationFrame(fxLoop);
    else { fxRaf = 0; fxCx.clearRect(0, 0, w, h); }
  }

  function spawn(x, y, opts) {
    if (reduced || !fxCx) return;
    var o = opts || {};
    var n = o.count || 22;
    var pal = PALETTE[o.palette || 'ochre'];
    for (var i = 0; i < n; i++) {
      var ang = o.angle != null
        ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI)
        : Math.random() * Math.PI * 2;
      var sp = (o.speed || 3.4) * (0.35 + Math.random() * 0.95);
      parts.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        g: o.gravity != null ? o.gravity : 0.08,
        drag: o.drag || 0.975,
        r: (o.size || 3.4) * (0.45 + Math.random()),
        c: pal[(Math.random() * pal.length) | 0],
        life: (o.life || 60) * (0.6 + Math.random() * 0.7),
        life0: (o.life || 60),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.24,
        shape: o.shape || 'dot'
      });
    }
    parts.length = Math.min(parts.length, 900);
    if (!fxRaf) fxRaf = global.requestAnimationFrame(fxLoop);
  }

  function centreOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
  }

  var FX = {
    init: function (ambient, fx, isReduced) {
      reduced = !!isReduced;
      ambientCv = ambient;
      fxCv = fx;
      ambientCx = sizeCanvas(ambientCv);
      fxCx = sizeCanvas(fxCv);
      seedAmbient();
      if (!reduced) {
        drawAmbient(0);
        if (!ambientRaf) ambientRaf = global.requestAnimationFrame(ambientLoop);
      } else {
        drawAmbient(0);
      }
      global.addEventListener('resize', FX.resize);
    },

    setReduced: function (v) {
      reduced = !!v;
      if (reduced) {
        if (ambientRaf) { global.cancelAnimationFrame(ambientRaf); ambientRaf = 0; }
        parts.length = 0;
        if (fxCx) fxCx.clearRect(0, 0, global.innerWidth, global.innerHeight);
        drawAmbient(0);
      } else if (!ambientRaf) {
        ambientRaf = global.requestAnimationFrame(ambientLoop);
      }
    },

    resize: function () {
      ambientCx = sizeCanvas(ambientCv);
      fxCx = sizeCanvas(fxCv);
      seedAmbient();
      if (reduced) drawAmbient(0);
    },

    burstAt: function (x, y, opts) { spawn(x, y, opts); },

    burstFrom: function (el, opts) {
      if (!el) return;
      var c = centreOf(el);
      spawn(c.x, c.y, opts);
    },

    /* A curtain of sand and shell grit down the whole viewport. */
    shower: function () {
      if (reduced || !fxCx) return;
      var w = global.innerWidth;
      var waves = 0;
      var iv = setInterval(function () {
        for (var i = 0; i < 26; i++) {
          parts.push({
            x: Math.random() * w,
            y: -20 - Math.random() * 120,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 1.2 + Math.random() * 2.6,
            g: 0.045, drag: 0.996,
            r: 2 + Math.random() * 4.5,
            c: (Math.random() < 0.5 ? PALETTE.ochre : PALETTE.sand)[(Math.random() * 4) | 0],
            life: 210, life0: 210,
            rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.2,
            shape: Math.random() < 0.35 ? 'bar' : 'dot'
          });
        }
        if (!fxRaf) fxRaf = global.requestAnimationFrame(fxLoop);
        if (++waves > 16) clearInterval(iv);
      }, 110);
    },

    /* Sand grains lift off the console and fly into the HUD counter. */
    flyGrains: function (fromEl, toEl, count, layer, onEach, onDone) {
      if (!fromEl || !toEl || !layer) { if (onDone) onDone(); return; }
      var from = centreOf(fromEl), to = centreOf(toEl);
      var n = reduced ? 1 : Math.max(1, Math.min(count, 12));
      var landed = 0;
      for (var i = 0; i < n; i++) {
        (function (i) {
          var el = document.createElement('img');
          el.className = 'grain-fly';
          el.src = 'assets/images/ui/emoji/currency.png';
          el.alt = '';
          el.setAttribute('aria-hidden', 'true');
          var jitterX = (Math.random() - 0.5) * 90;
          var jitterY = (Math.random() - 0.5) * 60;
          el.style.left = (from.x - 15) + 'px';
          el.style.top = (from.y - 15) + 'px';
          layer.appendChild(el);
          var dur = reduced ? 260 : 520 + Math.random() * 300;
          var anim = el.animate([
            { transform: 'translate(0px,0px) scale(0.45) rotate(0deg)', opacity: 0 },
            { transform: 'translate(' + jitterX + 'px,' + (jitterY - 60) + 'px) scale(1.15) rotate(120deg)', opacity: 1, offset: 0.32 },
            { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px) scale(0.5) rotate(430deg)', opacity: 0.95 }
          ], { duration: dur, delay: i * (reduced ? 0 : 55), easing: 'cubic-bezier(.35,.05,.25,1)', fill: 'forwards' });
          anim.onfinish = function () {
            el.remove();
            if (onEach) onEach(i);
            if (++landed >= n && onDone) onDone();
          };
        })(i);
      }
    },

    pop: function (el, cls) {
      if (!el) return;
      var c = cls || 'is-pop';
      el.classList.remove(c);
      /* force reflow so the animation restarts on rapid repeats */
      void el.offsetWidth;
      el.classList.add(c);
      setTimeout(function () { el.classList.remove(c); }, 620);
    }
  };

  global.QuestFX = FX;
})(window);
