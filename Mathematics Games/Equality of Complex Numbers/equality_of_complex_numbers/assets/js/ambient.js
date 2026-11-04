/* Twin-Seal Tomb: ambient background motion. Drawn behind the UI with
   pointer-events: none; it never touches hit-boxes or game state. */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv, cx, W = 0, H = 0, dpr = 1, motes = [], running = false, last = 0, tone = 'warm';

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() {
    var n = Math.round(Math.min(90, Math.max(30, W * H / 22000)));
    motes = [];
    for (var i = 0; i < n; i++) motes.push(make(true));
  }
  function make(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
      r: 0.6 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 6, vy: -(3 + Math.random() * 10),
      ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.2, a: 0.25 + Math.random() * 0.5
    };
  }
  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    cx.clearRect(0, 0, W, H);
    var col = tone === 'cool' ? '200,190,255' : '255,214,140';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.ph += dt * m.sp;
      m.x += (m.vx + Math.sin(m.ph) * 8) * dt; m.y += m.vy * dt;
      if (m.y < -10 || m.x < -20 || m.x > W + 20) motes[i] = m = make(false);
      var a = m.a * (0.6 + 0.4 * Math.sin(m.ph * 2));
      cx.beginPath(); cx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
      cx.arc(m.x, m.y, m.r, 0, 6.283); cx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.TST.ambient = {
    init: function () {
      cv = document.getElementById('ambient'); if (!cv) return;
      cx = cv.getContext('2d');
      resize(); seed();
      window.addEventListener('resize', function () { resize(); seed(); });
      if (RM) return;
      running = true; requestAnimationFrame(function (t) { last = t; frame(t); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) running = false;
        else if (!running && !RM) { running = true; requestAnimationFrame(function (t) { last = t; frame(t); }); }
      });
    },
    setTone: function (t) { tone = t; }
  };
})();
