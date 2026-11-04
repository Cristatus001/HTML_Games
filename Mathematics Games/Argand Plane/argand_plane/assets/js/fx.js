/* Mirror River City — DOM juice: flying coins, counter pops, rim flashes, toasts, banners, lantern showers. */
(function () {
  'use strict';
  var AP = (window.AP = window.AP || {});
  var FX = {};
  var ICON = 'assets/images/ui/icons/';

  function reduced() { return AP.reducedMotion && AP.reducedMotion(); }

  // Fly n coins from a screen point into the HUD score chip, then call onEach per landing.
  FX.coins = function (fromX, fromY, n, onEach) {
    var layer = document.getElementById('fly-layer');
    var target = document.getElementById('hud-coin');
    if (!target || !layer) { for (var k = 0; k < n; k++) onEach && onEach(k); return; }
    var r = target.getBoundingClientRect();
    var tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var img = document.createElement('img');
        img.src = ICON + 'bolt.png'; img.className = 'fly-coin'; img.alt = '';
        img.style.left = fromX + 'px'; img.style.top = fromY + 'px';
        layer.appendChild(img);
        var dx = tx - fromX, dy = ty - fromY;
        var mx = (Math.random() - 0.5) * 140, my = -60 - Math.random() * 80;
        var dur = reduced() ? 10 : 620 + i * 70;
        var anim = null;
        if (img.animate && !reduced()) {
          anim = img.animate([
            { transform: 'translate(-50%,-50%) translate(0,0) scale(.6)', opacity: 0 },
            { transform: 'translate(-50%,-50%) translate(' + mx + 'px,' + my + 'px) scale(1.15)', opacity: 1, offset: 0.35 },
            { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.7)', opacity: 1 }
          ], { duration: dur, delay: i * 60, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'backwards' });
        }
        // The timer, not the animation, decides when the coin lands (animations stall in hidden WebViews).
        setTimeout(function () {
          if (anim) try { anim.cancel(); } catch (e) {}
          img.remove();
          onEach && onEach(i);
        }, dur + i * 60);
      })(i);
    }
  };

  FX.pop = function (el) {
    if (!el) return;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  };

  FX.countTo = function (el, from, to, ms) {
    if (!el) return;
    if (reduced() || ms <= 0) { el.textContent = to; return; }
    var t0 = performance.now();
    (function step() {
      var p = Math.min(1, (performance.now() - t0) / ms);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })();
    setTimeout(function () { el.textContent = to; }, ms + 60);
  };

  FX.rim = function (kind) {
    var rim = document.getElementById('rim');
    rim.className = 'rim'; void rim.offsetWidth; rim.className = 'rim show ' + kind;
    clearTimeout(FX._rimT); FX._rimT = setTimeout(function () { rim.className = 'rim'; }, 700);
  };

  FX.shake = function (el) {
    if (reduced() || !el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(function () { el.classList.remove('shake'); }, 500);
  };

  FX.toast = function (html, kind, ms) {
    var t = document.getElementById('toast');
    t.innerHTML = '<img src="' + ICON + (kind === 'good' ? 'check' : kind === 'bad' ? 'cross' : 'hint') + '.png" alt=""><span>' + html + '</span>';
    t.className = 'toast show ' + (kind || '');
    clearTimeout(FX._toastT);
    FX._toastT = setTimeout(function () { t.className = 'toast'; }, ms || 3600);
  };
  FX.hideToast = function () { clearTimeout(FX._toastT); document.getElementById('toast').className = 'toast'; };

  FX.banner = function (title, sub, icon, ms) {
    var b = document.getElementById('banner');
    b.innerHTML = (icon ? '<img src="' + ICON + icon + '.png" alt="">' : '') + '<div><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>';
    b.className = 'banner show';
    clearTimeout(FX._banT);
    FX._banT = setTimeout(function () { b.className = 'banner'; }, ms || 2400);
  };

  // Lantern shower for level / city completion.
  FX.shower = function (count) {
    var layer = document.getElementById('fly-layer');
    if (reduced()) count = Math.min(count, 10);
    var kinds = ['star', 'bolt', 'trophy'];
    for (var i = 0; i < count; i++) {
      var img = document.createElement('img');
      img.src = ICON + kinds[i % kinds.length] + '.png'; img.alt = ''; img.className = 'shower';
      var x = Math.random() * window.innerWidth, size = 18 + Math.random() * 22;
      img.style.left = x + 'px'; img.style.width = size + 'px';
      var dur = 1800 + Math.random() * 1800, delay = Math.random() * 900;
      layer.appendChild(img);
      if (img.animate && !reduced()) {
        img.animate([
          { transform: 'translate(0,-40px) rotate(0deg)', opacity: 0 },
          { opacity: 1, offset: 0.1 },
          { transform: 'translate(' + ((Math.random() - 0.5) * 160) + 'px,' + (window.innerHeight + 60) + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0.9 }
        ], { duration: dur, delay: delay, easing: 'cubic-bezier(.3,.1,.7,1)', fill: 'backwards' });
      } else { img.style.top = (Math.random() * 60) + '%'; }
      (function (img) { setTimeout(function () { img.remove(); }, dur + delay + 50); })(img);
    }
  };

  AP.FX = FX;
})();
