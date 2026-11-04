/* Twin-Seal Tomb: DOM effects. Purely visual; nothing here changes game state.
   Every effect ends on a timer, so a stalled animation timeline cannot leave debris. */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var layer = null;
  function L() { return layer || (layer = document.getElementById('fly-layer')); }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  /* coins fly from a source element into the HUD counter */
  function flyCoins(fromEl, toEl, count, onEach, done) {
    var a = centre(fromEl), b = centre(toEl), landed = 0;
    count = Math.max(1, Math.min(14, count));
    for (var i = 0; i < count; i++) (function (i) {
      var img = document.createElement('img');
      img.src = 'assets/images/ui/icons/coin.png'; img.alt = ''; img.className = 'fly-coin';
      img.style.left = a.x + 'px'; img.style.top = a.y + 'px';
      L().appendChild(img);
      var dx = b.x - a.x, dy = b.y - a.y;
      var sx = (Math.random() - 0.5) * 160, sy = -60 - Math.random() * 90;
      var delay = i * 70, dur = RM ? 10 : 720;
      var anim = null;
      if (!RM && img.animate) {
        anim = img.animate([
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
          { transform: 'translate(calc(-50% + ' + sx + 'px), calc(-50% + ' + sy + 'px)) scale(1.1)', opacity: 1, offset: 0.35 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.6)', opacity: 1 }
        ], { duration: dur, delay: delay, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'backwards' });
      }
      setTimeout(function () {
        if (anim) try { anim.cancel(); } catch (e) {}
        if (img.parentNode) img.parentNode.removeChild(img);
        landed++;
        if (onEach) onEach(landed, count);
        if (landed === count && done) done();
      }, delay + dur + 20);
    })(i);
  }

  function pop(el) {
    if (!el) return;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    setTimeout(function () { el.classList.remove('pop'); }, 420);
  }

  function burst(x, y, opts) {
    if (RM) return;
    opts = opts || {};
    var n = opts.count || 18, colors = opts.colors || ['#ffe08a', '#f2b532', '#fff4cf'];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      s.className = 'spark';
      var ang = Math.random() * Math.PI * 2, dist = (opts.radius || 90) * (0.4 + Math.random() * 0.8);
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.background = colors[i % colors.length];
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      s.style.animationDuration = (520 + Math.random() * 380) + 'ms';
      L().appendChild(s);
      (function (s) { setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1000); })(s);
    }
  }
  function burstAt(el, opts) { var c = centre(el); burst(c.x, c.y, opts); }

  function shake(el) {
    if (!el || RM) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(function () { el.classList.remove('shake'); }, 520);
  }
  function rim(kind) {
    var r = document.getElementById('rim');
    r.className = 'rim'; void r.offsetWidth; r.className = 'rim on ' + (kind || 'bad');
    setTimeout(function () { r.className = 'rim'; }, 700);
  }

  var toastT = null;
  function toast(html, kind, ms) {
    var t = document.getElementById('toast');
    t.innerHTML = html; t.className = 'toast show ' + (kind || '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = 'toast'; }, ms || 2600);
  }

  /* golden shower for the final escape */
  function shower(ms) {
    if (RM) return;
    var end = Date.now() + (ms || 3000);
    (function drop() {
      if (Date.now() > end) return;
      var img = document.createElement('img');
      img.src = 'assets/images/ui/icons/coin.png'; img.alt = ''; img.className = 'rain-coin';
      img.style.left = (Math.random() * 100) + 'vw';
      img.style.animationDuration = (1800 + Math.random() * 1400) + 'ms';
      img.style.width = img.style.height = (18 + Math.random() * 22) + 'px';
      L().appendChild(img);
      setTimeout(function () { if (img.parentNode) img.parentNode.removeChild(img); }, 3400);
      setTimeout(drop, 60);
    })();
  }

  /* counter that rolls up */
  function rollNumber(el, from, to, ms) {
    ms = RM ? 1 : (ms || 600);
    var t0 = Date.now();
    var iv = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / ms);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) { clearInterval(iv); el.textContent = to; }
    }, 30);
  }

  window.TST.fx = { RM: RM, flyCoins: flyCoins, pop: pop, burst: burst, burstAt: burstAt, shake: shake, rim: rim,
    toast: toast, shower: shower, rollNumber: rollNumber, centre: centre };
})();
