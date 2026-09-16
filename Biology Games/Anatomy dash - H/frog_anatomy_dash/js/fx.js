/* Particle and feedback effects drawn in world space. Purely cosmetic — no
   effect here touches physics or hitboxes.                                    */
(function (global) {
  'use strict';

  var parts = [];
  var rings = [];
  var pops = [];
  var shake = { mag: 0, t: 0 };

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function spawn(p) { if (parts.length < 420) parts.push(p); }

  /* Bright outward burst — used when an orb is absorbed. */
  function burst(x, y, opts) {
    opts = opts || {};
    var n = opts.count || 26;
    var hue = opts.color || '#46e6c8';
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + rnd(-0.2, 0.2);
      var sp = rnd(1.6, 5.2) * (opts.power || 1);
      spawn({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6,
        life: 1, decay: rnd(0.012, 0.026),
        r: rnd(1.8, 4.4), color: hue, glow: true, grav: 0.05
      });
    }
  }

  /* Soft dust puff — landing, respawn. */
  function dust(x, y, dir) {
    for (var i = 0; i < 12; i++) {
      spawn({
        x: x + rnd(-14, 14), y: y + rnd(-3, 3),
        vx: rnd(-1.4, 1.4) + (dir || 0) * 0.6, vy: rnd(-1.4, -0.2),
        life: 1, decay: rnd(0.02, 0.04),
        r: rnd(2.4, 6), color: '#8fb98a', glow: false, grav: -0.01
      });
    }
  }

  /* Trailing motes behind the frog while it moves. */
  function trail(x, y) {
    spawn({
      x: x + rnd(-6, 6), y: y + rnd(-4, 4),
      vx: rnd(-0.3, 0.3), vy: rnd(-0.5, -0.1),
      life: 1, decay: 0.05, r: rnd(1.2, 2.6),
      color: '#b9f062', glow: true, grav: -0.005
    });
  }

  function splash(x, y) {
    for (var i = 0; i < 22; i++) {
      spawn({
        x: x + rnd(-16, 16), y: y,
        vx: rnd(-3, 3), vy: rnd(-5.6, -1.6),
        life: 1, decay: rnd(0.014, 0.03),
        r: rnd(1.6, 4), color: '#7fdcf5', glow: true, grav: 0.16
      });
    }
    ring(x, y, '#7fdcf5', 90);
  }

  function ring(x, y, color, max) {
    rings.push({ x: x, y: y, r: 6, max: max || 70, color: color || '#46e6c8', life: 1 });
  }

  /* Floating label, e.g. "+1 ORB". */
  function pop(x, y, text, color) {
    pops.push({ x: x, y: y, text: text, color: color || '#ffd766', life: 1, vy: -0.7 });
  }

  function kick(mag) {
    shake.mag = Math.max(shake.mag, mag || 6);
    shake.t = 1;
  }

  function update(dt) {
    var f = dt;
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.vy += p.grav * f;
      p.vx *= 0.985;
      p.life -= p.decay * f;
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (i = rings.length - 1; i >= 0; i--) {
      var r = rings[i];
      r.r += (r.max - r.r) * 0.12 * f;
      r.life -= 0.03 * f;
      if (r.life <= 0) rings.splice(i, 1);
    }
    for (i = pops.length - 1; i >= 0; i--) {
      var q = pops[i];
      q.y += q.vy * f;
      q.life -= 0.014 * f;
      if (q.life <= 0) pops.splice(i, 1);
    }
    if (shake.t > 0) {
      shake.t -= 0.06 * f;
      if (shake.t <= 0) { shake.t = 0; shake.mag = 0; }
    }
  }

  function draw(ctx) {
    var i;
    ctx.save();
    for (i = 0; i < rings.length; i++) {
      var r = rings[i];
      ctx.globalAlpha = Math.max(0, r.life) * 0.5;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * r.life + 0.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      var a = Math.max(0, Math.min(1, p.life));
      ctx.globalAlpha = a;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12 * a;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (i = 0; i < pops.length; i++) {
      var q = pops[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life));
      ctx.font = '700 22px Oswald, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(4,32,29,0.75)';
      ctx.strokeText(q.text, q.x, q.y);
      ctx.fillStyle = q.color;
      ctx.fillText(q.text, q.x, q.y);
    }
    ctx.restore();
  }

  function shakeOffset() {
    if (shake.t <= 0) return { x: 0, y: 0 };
    var m = shake.mag * shake.t;
    return { x: rnd(-m, m), y: rnd(-m, m) };
  }

  function clear() { parts.length = 0; rings.length = 0; pops.length = 0; shake.t = 0; shake.mag = 0; }

  global.FX = {
    burst: burst, dust: dust, trail: trail, splash: splash, ring: ring,
    pop: pop, kick: kick, update: update, draw: draw,
    shakeOffset: shakeOffset, clear: clear
  };
})(window);
