/* ==========================================================================
   game.js - flight, trail, hazards and the Reveal.

   The player flies; they never draw. The trail is a CONSEQUENCE of flying, and
   it is sampled by distance travelled (not per frame) so the distance reading is
   framerate-independent - it has to be, because it is a score.
   ========================================================================== */
'use strict';

var COL = {
  initial: '56,189,248',   /* r_initial  - sky blue, from the original file */
  final: '251,191,36',     /* r_final    - gold */
  disp: '248,113,113',     /* displacement - red */
  path: '255,255,255',     /* trail      - white */
  brass: '217,164,65',
  crystal: '150,225,255',
  green: '120,196,106',
  storm: '120,140,165'
};

/* ---------------------------------------------------------------- particles
   Field-space, pooled. FX (fx.js) stays screen-space for menu bursts. */
function PField(max) {
  this.p = [];
  for (var i = 0; i < max; i++) this.p.push({ live: false });
  this.n = max;
}
PField.prototype.emit = function (x, y, o) {
  var count = o.count || 8;
  for (var i = 0; i < this.n && count > 0; i++) {
    var q = this.p[i];
    if (q.live) continue;
    count--;
    var a = o.angle === undefined ? Util.rand(0, TAU) : o.angle + Util.rand(-(o.spread || 0.6), o.spread || 0.6);
    var sp = Util.rand(o.spMin || 30, o.spMax || 160);
    q.live = true;
    q.x = x; q.y = y;
    q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp;
    q.g = o.g === undefined ? 40 : o.g;
    q.life = 0; q.max = Util.rand(o.lifeMin || 0.3, o.lifeMax || 0.8);
    q.r = Util.rand(o.rMin || 2, o.rMax || 5);
    q.rgb = o.rgb; q.drag = o.drag === undefined ? 1.6 : o.drag;
    q.shape = o.shape || 'dot';
    q.rot = Util.rand(0, TAU); q.vr = Util.rand(-8, 8);
  }
};
PField.prototype.update = function (dt) {
  for (var i = 0; i < this.n; i++) {
    var q = this.p[i];
    if (!q.live) continue;
    q.life += dt;
    if (q.life >= q.max) { q.live = false; continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt;
    var f = 1 - q.drag * dt; if (f < 0) f = 0;
    q.vx *= f; q.vy *= f;
    q.rot += q.vr * dt;
  }
};
PField.prototype.draw = function (ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < this.n; i++) {
    var q = this.p[i];
    if (!q.live) continue;
    var k = 1 - q.life / q.max;
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.fillStyle = 'rgba(' + q.rgb + ',1)';
    if (q.shape === 'chip') {
      ctx.save();
      ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillRect(-q.r, -q.r * 0.5, q.r * 2, q.r);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * (0.5 + k), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
};

/* -------------------------------------------------------------------- ship */
function Ship(x, y) {
  this.x = x; this.y = y;
  this.vx = 0; this.vy = 0;
  this.ang = -Math.PI / 2;
  this.r = 14;
  this.thrusting = false;
}
Ship.MAX = 215;
Ship.ACC = 980;
Ship.DRAG = 4.6;

Ship.prototype.update = function (dt, inp, wind) {
  var mag = Math.hypot(inp.x, inp.y);
  this.thrusting = mag > 0.08;
  if (this.thrusting) {
    var nx = inp.x / mag, ny = inp.y / mag;
    var th = Math.min(1, mag);
    this.vx += nx * Ship.ACC * th * dt;
    this.vy += ny * Ship.ACC * th * dt;
    this.ang = Math.atan2(ny, nx);
  }
  if (wind) { this.vx += wind.x * dt; this.vy += wind.y * dt; }
  var f = 1 - Ship.DRAG * dt; if (f < 0) f = 0;
  this.vx *= f; this.vy *= f;
  var sp = Math.hypot(this.vx, this.vy);
  if (sp > Ship.MAX) { this.vx = this.vx / sp * Ship.MAX; this.vy = this.vy / sp * Ship.MAX; }
  this.x += this.vx * dt;
  this.y += this.vy * dt;
};

/* ------------------------------------------------------------------- trail
   Sampled every SAMPLE units of travel so `d` never depends on framerate. */
function Trail(x, y) {
  this.pts = [{ x: x, y: y }];
  this.d = 0;
  this._lx = x; this._ly = y;
}
Trail.SAMPLE = 3;
Trail.prototype.advance = function (x, y) {
  var dx = x - this._lx, dy = y - this._ly;
  var step = Math.hypot(dx, dy);
  if (step < Trail.SAMPLE) return 0;
  this.d += step;
  this._lx = x; this._ly = y;
  this.pts.push({ x: x, y: y });
  if (this.pts.length > 2200) this.pts.shift();
  return step;
};

/* ================================================================== GAME */

var Game = {
  lv: null,
  ship: null, trail: null,
  crystals: [], hazards: [], beacons: [],
  state: 'FLY',                 /* FLY | REVEAL | WON | FAILED */
  inp: { x: 0, y: 0 },
  target: null,          /* field-space point the player is holding */
  inv: 0,                /* post-respawn grace, seconds */
  t: 0, flightTime: 0,
  hulls: 3, damage: 0, got: 0,
  stormY: 0, windNow: { x: 0, y: 0 },
  disp: { x: 0, y: 0 }, dispLen: 0, eff: 0,
  reveal: null, failWhy: '',
  shake: 0, flash: 0, zoom: 1,
  pfx: null,
  view: { s: 1, ox: 0, oy: 0 },
  onWin: null, onFail: null, onChange: null, onWhy: null,

  /* ------------------------------------------------------------- load */
  load: function (lv) {
    this.lv = lv;
    this.ship = new Ship(lv.launch.x, lv.launch.y);
    this.trail = new Trail(lv.launch.x, lv.launch.y);
    this.crystals = (lv.crystals || []).map(function (c) { return { x: c.x, y: c.y, got: false, ph: Math.random() * TAU }; });
    this.hazards = (lv.hazards || []).map(function (h) {
      var o = {};
      for (var k in h) o[k] = h[k];
      o.hot = true; o.cx = h.x; o.cy = h.y;
      return o;
    });
    this.beacons = [];
    if (lv.beacons) lv.beacons.forEach(function (b) { Game.beacons.push({ x: b.x, y: b.y, fixed: true }); });
    this.state = 'FLY';
    this.t = 0; this.flightTime = 0;
    this.hulls = 3; this.damage = 0; this.got = 0;
    this.inv = 0; this.target = null;
    this.stormY = FIELD.h + 60;
    this.windNow = lv.wind ? { x: lv.wind.x, y: lv.wind.y } : { x: 0, y: 0 };
    this.disp = { x: 0, y: 0 }; this.dispLen = 0; this.eff = 0;
    this.reveal = null; this.failWhy = '';
    this.shake = 0; this.flash = 0; this.zoom = 1;
    this.inp.x = 0; this.inp.y = 0;
    if (!this.pfx) this.pfx = new PField(260);
    for (var i = 0; i < this.pfx.n; i++) this.pfx.p[i].live = false;
    if (this.onChange) this.onChange();
  },

  fuelLeft: function () { return Math.max(0, this.lv.fuel - this.trail.d); },
  fuelFrac: function () { return this.fuelLeft() / this.lv.fuel; },
  needMet: function () { return this.got >= (this.lv.need || 0); },

  /* target the mission wants: a pad, or a stated displacement */
  padPos: function () { return this.lv.pad; },

  /* ----------------------------------------------------------- objective */
  atGoal: function () {
    var lv = this.lv;
    if (lv.targetDisp) {
      var ex = this.disp.x - lv.targetDisp.x, ey = this.disp.y - lv.targetDisp.y;
      return Math.hypot(ex, ey) <= (lv.dispTol || 30) && Math.hypot(this.ship.vx, this.ship.vy) < 60;
    }
    var p = lv.pad;
    if (!p) return false;
    var dd = Math.hypot(this.ship.x - p.x, this.ship.y - p.y);
    if (lv.loop && this.trail.d < 200) return false;    /* must actually leave */
    return dd < 54 && this.needMet();
  },

  /* -------------------------------------------------------------- update */
  update: function (dt) {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.6);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 6);
    this.zoom += (1 - this.zoom) * Math.min(1, dt * 8);
    this.pfx.update(dt);
    this.updateHazards(dt);

    if (this.state === 'FLY') this.updateFlight(dt);
    else if (this.state === 'REVEAL') this.updateReveal(dt);
  },

  updateHazards: function (dt) {
    for (var i = 0; i < this.hazards.length; i++) {
      var h = this.hazards[i];
      if (h.type === 'gate') {
        var ph = ((this.t / h.period) + (h.phase || 0)) % 1;
        h.hot = ph < (h.duty === undefined ? 0.5 : h.duty);
        h.phaseFrac = ph;
      } else if (h.type === 'mover') {
        var u = ((this.t / h.period) + (h.phase || 0)) % 1;
        var tri = u < 0.5 ? u * 2 : 2 - u * 2;
        h.cx = Util.lerp(h.x0, h.x1, tri);
        h.cy = Util.lerp(h.y0, h.y1, tri);
      }
    }
    /* reversing crosswind on the boss */
    if (this.lv.windReverse) {
      var s = Math.sin(this.t / this.lv.windReverse * Math.PI) >= 0 ? 1 : -1;
      this.windNow.x = this.lv.wind.x * s;
      this.windNow.y = this.lv.wind.y * s;
    }
    if (this.lv.thermal) {
      /* a slow vertical current: you cannot hold station for free, so waiting
         for a gate genuinely costs you path */
      this.windNow.y = (this.lv.wind ? this.windNow.y : 0) + Math.sin(this.t * 0.9) * this.lv.thermal;
      this.windNow.x = (this.lv.wind ? this.windNow.x : 0) + Math.cos(this.t * 0.62) * this.lv.thermal * 0.45;
    }
    if (this.lv.stormRise && this.state === 'FLY') {
      this.stormY = Math.max(-40, FIELD.h + 60 - this.lv.stormRise * this.flightTime);
    }
  },

  updateFlight: function (dt) {
    var lv = this.lv, s = this.ship;
    this.flightTime += dt;
    if (this.inv > 0) this.inv = Math.max(0, this.inv - dt);
    this.steerToTarget();

    s.update(dt, this.inp, (lv.wind || lv.thermal) ? this.windNow : null);

    /* soft walls: the field edge bleeds speed instead of killing */
    var m = 8;
    if (s.x < m) { s.x = m; s.vx = Math.abs(s.vx) * 0.4; }
    if (s.x > FIELD.w - m) { s.x = FIELD.w - m; s.vx = -Math.abs(s.vx) * 0.4; }
    if (s.y < m) { s.y = m; s.vy = Math.abs(s.vy) * 0.4; }
    if (s.y > FIELD.h - m) { s.y = FIELD.h - m; s.vy = -Math.abs(s.vy) * 0.4; }

    var moved = this.trail.advance(s.x, s.y);
    if (moved > 0) {
      this.pfx.emit(s.x, s.y, { rgb: COL.path, count: 1, spMax: 26, g: 0, rMin: 1.4, rMax: 3, lifeMin: 0.35, lifeMax: 0.7 });
    }
    if (s.thrusting) {
      this.pfx.emit(s.x - Math.cos(s.ang) * 14, s.y - Math.sin(s.ang) * 14, {
        rgb: COL.brass, count: 1, angle: s.ang + Math.PI, spread: 0.5,
        spMin: 60, spMax: 150, g: 0, rMin: 1.6, rMax: 3.4, lifeMin: 0.2, lifeMax: 0.45
      });
    }

    /* live displacement */
    this.disp.x = s.x - lv.launch.x;
    this.disp.y = s.y - lv.launch.y;
    this.dispLen = Math.hypot(this.disp.x, this.disp.y);
    this.eff = this.trail.d > 1 ? Util.clamp(this.dispLen / this.trail.d, 0, 1) : 0;

    /* crystals */
    for (var i = 0; i < this.crystals.length; i++) {
      var c = this.crystals[i];
      if (c.got) continue;
      if (Math.hypot(s.x - c.x, s.y - c.y) < 30) {
        c.got = true; this.got++;
        this.pfx.emit(c.x, c.y, { rgb: COL.crystal, count: 22, spMax: 200, g: 30, rMin: 2, rMax: 5 });
        this.shake = Math.max(this.shake, 0.22);
        Sound.play('crystal');
        if (this.onChange) this.onChange();
      }
    }

    /* hazards */
    for (var j = 0; j < this.hazards.length; j++) {
      var h = this.hazards[j];
      if (!h.hot || this.inv > 0) continue;
      var hr = h.r + s.r * 0.5;
      if (Math.hypot(s.x - h.cx, s.y - h.cy) < hr) { this.crash('You flew into it.'); return; }
    }
    if (this.lv.stormRise && s.y > this.stormY && this.inv <= 0) { this.crash('The storm caught you.'); return; }

    /* fuel */
    if (this.fuelLeft() <= 0) { this.fail('Out of fuel. Distance is a resource.'); return; }

    if (this.atGoal()) this.startReveal();
  },

  crash: function (why) {
    this.hulls--;
    this.damage++;
    this.shake = 0.9;
    this.flash = 0.5;
    this.zoom = 0.94;
    Sound.play('crash');
    this.pfx.emit(this.ship.x, this.ship.y, { rgb: COL.disp, count: 30, spMax: 260, g: 120, rMin: 2, rMax: 6 });
    this.pfx.emit(this.ship.x, this.ship.y, { rgb: COL.brass, count: 16, spMax: 200, g: 140, shape: 'chip', rMin: 2, rMax: 4 });
    if (this.hulls <= 0) { this.fail(why); return; }
    /* respawn at the launch pad - the distance already spent is NOT refunded */
    this.ship.x = this.lv.launch.x; this.ship.y = this.lv.launch.y;
    this.ship.vx = 0; this.ship.vy = 0;
    this.trail._lx = this.ship.x; this.trail._ly = this.ship.y;
    this.trail.pts.push({ x: this.ship.x, y: this.ship.y, cut: true });
    this.inv = 1.4;
    this.target = null;
    if (this.onChange) this.onChange();
  },

  fail: function (why) {
    this.state = 'FAILED';
    this.failWhy = why;
    Sound.play('fail');
    if (this.onFail) this.onFail(why);
  },

  /* -------------------------------------------------------------- reveal */
  startReveal: function () {
    this.state = 'REVEAL';
    this.flash = 0.6;
    this.zoom = 1.06;
    this.shake = 0.3;
    Sound.play('land');
    this.reveal = { t: 0, sweep: 0, dShown: 0, dispShown: 0, effShown: 0, laser: 0, whyFired: false, done: false };
    this.pfx.emit(this.ship.x, this.ship.y, { rgb: COL.final, count: 26, spMax: 220, g: 40, rMin: 2, rMax: 5 });
    if (this.onChange) this.onChange();
  },

  R: { SWEEP_START: 0.25, SWEEP_SPEED: 1400, HOLD: 0.25, LASER: 0.12 },

  updateReveal: function (dt) {
    var r = this.reveal, R = this.R;
    r.t += dt;

    if (r.t > R.SWEEP_START && r.sweep < this.trail.d) {
      r.sweep = Math.min(this.trail.d, r.sweep + R.SWEEP_SPEED * dt);
      r.dShown = r.sweep;
      if (Math.random() < 0.5) {
        var p = this.trailPointAt(r.sweep);
        if (p) this.pfx.emit(p.x, p.y, { rgb: COL.path, count: 1, spMax: 70, g: 0, rMin: 1.5, rMax: 3.2, lifeMin: 0.25, lifeMax: 0.5 });
      }
      if (r.sweep >= this.trail.d && !r.lockedAt) {
        r.lockedAt = r.t;
        r.dShown = this.trail.d;
        this.shake = Math.max(this.shake, 0.4);
        Sound.play('lock');
      }
    }

    /* laser fires after the hold */
    if (r.lockedAt && r.t > r.lockedAt + R.HOLD && r.laser < 1) {
      if (r.laser === 0) Sound.play('laser');
      r.laser = Math.min(1, r.laser + dt / R.LASER);
      r.dispShown = this.dispLen * r.laser;
    }

    /* efficiency bar */
    if (r.laser >= 1) {
      r.effShown += (this.eff - r.effShown) * Math.min(1, dt * 4);
      if (!r.whyFired && r.t > r.lockedAt + R.HOLD + 0.55) {
        r.whyFired = true;
        if (this.eff < 0.60 && this.onWhy) this.onWhy(Math.round(this.trail.d), Math.round(this.dispLen));
        else this.finish();
      }
    }
  },

  /* called by the Why card's dismiss, or straight from the reveal */
  finish: function () {
    if (this.reveal) this.reveal.done = true;
    this.state = 'WON';
    if (this.onWin) this.onWin();
  },

  trailPointAt: function (dist) {
    var acc = 0, p = this.trail.pts;
    for (var i = 1; i < p.length; i++) {
      var seg = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
      if (acc + seg >= dist) {
        var k = seg > 0 ? (dist - acc) / seg : 0;
        return { x: Util.lerp(p[i - 1].x, p[i].x, k), y: Util.lerp(p[i - 1].y, p[i].y, k) };
      }
      acc += seg;
    }
    return p[p.length - 1];
  },

  /* --------------------------------------------------------------- score */
  result: function () {
    var lv = this.lv;
    var d = Math.round(this.trail.d), dl = Math.round(this.dispLen);
    var E = this.eff;
    var stars = 1;
    if (lv.starD) {
      /* the loop mission grades on DISTANCE flown, not efficiency */
      if (this.got >= lv.need && d >= lv.starD[0]) stars = 2;
      if (this.got >= lv.need && d >= lv.starD[1]) stars = 3;
    } else {
      var needOK = this.needMet();
      if (needOK && E >= lv.starE[0]) stars = 2;
      if (needOK && E >= lv.starE[1] && this.damage === 0) stars = 3;
    }
    var base = 500;
    var effBonus = Math.floor(1500 * E * E);
    var crys = 120 * this.got;
    var timeBonus = Math.max(0, Math.floor((lv.parTime - this.flightTime) * 40));
    var dmg = 150 * this.damage;
    var score = Math.max(0, Math.floor(base + effBonus + crys + timeBonus - dmg));
    return {
      d: d, disp: dl, eff: E, stars: stars, score: score,
      time: this.flightTime, crystals: this.got, need: lv.need || 0,
      damage: this.damage,
      xp: 100 + stars * 25 + this.got * 10,
      coins: 40 + this.got * 5 + (stars === 3 ? 100 : 0)
    };
  },

  /* ---------------------------------------------------------------- view */
  fit: function (rect) {
    var s = Math.min(rect.w / FIELD.w, rect.h / FIELD.h) * 0.98;
    this.view.s = s;
    this.view.ox = rect.x + (rect.w - FIELD.w * s) / 2;
    this.view.oy = rect.y + (rect.h - FIELD.h * s) / 2;
  },
  s2f: function (sx, sy) {
    return { x: (sx - this.view.ox) / this.view.s, y: (sy - this.view.oy) / this.view.s };
  },

  /* --------------------------------------------------------------- input */
  setThrust: function (vx, vy) { this.inp.x = vx; this.inp.y = vy; },
  clearThrust: function () { this.inp.x = 0; this.inp.y = 0; },
  setTarget: function (fx, fy) { this.target = { x: fx, y: fy }; },
  clearTarget: function () { this.target = null; },

  /* turn a held point into a throttle vector, easing off as we close in so the
     ship settles instead of overshooting the pad */
  steerToTarget: function () {
    if (!this.target) return;
    var dx = this.target.x - this.ship.x, dy = this.target.y - this.ship.y;
    var d = Math.hypot(dx, dy);
    if (d < 6) { this.clearThrust(); return; }
    var th = Util.clamp(d / 90, 0, 1);
    this.setThrust(dx / d * th, dy / d * th);
  },

  /* ---------------------------------------------------------------- draw */
  draw: function (ctx) {
    var v = this.view, lv = this.lv;
    ctx.save();
    /* camera: shake + zoom about the field centre */
    var sh = this.shake * this.shake;
    var jx = (Math.random() - 0.5) * 14 * sh, jy = (Math.random() - 0.5) * 14 * sh;
    ctx.translate(v.ox + FIELD.w * v.s / 2 + jx, v.oy + FIELD.h * v.s / 2 + jy);
    ctx.scale(v.s * this.zoom, v.s * this.zoom);
    ctx.translate(-FIELD.w / 2, -FIELD.h / 2);

    this.drawField(ctx);
    if (this.state === 'FLY') this.drawGuide(ctx);
    this.drawIslands(ctx);
    this.drawHazards(ctx);
    this.drawCrystals(ctx);
    this.drawTrail(ctx);
    this.drawVectors(ctx);
    this.pfx.draw(ctx);
    this.drawShip(ctx);
    if (lv.stormRise) this.drawStorm(ctx);
    if (lv.fog) this.drawFog(ctx);
    if (this.state === 'REVEAL') this.drawReveal(ctx);

    ctx.restore();

    if (this.flash > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,' + (this.flash * 0.3) + ')';
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
  },

  drawField: function (ctx) {
    /* grid measured from the launch pad, so the origin reads as a real origin */
    var o = this.beacons.length ? this.beacons[0] : this.lv.launch;
    var step = 50;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.w, FIELD.h);
    ctx.clip();
    ctx.lineWidth = 1 / this.view.s;
    ctx.strokeStyle = 'rgba(226,240,255,0.06)';
    ctx.beginPath();
    for (var x = ((o.x % step) + step) % step; x < FIELD.w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); }
    for (var y = ((o.y % step) + step) % step; y < FIELD.h; y += step) { ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(' + COL.brass + ',0.22)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, o.y); ctx.lineTo(FIELD.w, o.y);
    ctx.moveTo(o.x, 0); ctx.lineTo(o.x, FIELD.h);
    ctx.stroke();
    ctx.setLineDash([]);
    /* field border */
    ctx.strokeStyle = 'rgba(' + COL.brass + ',0.3)';
    ctx.lineWidth = 2 / this.view.s;
    ctx.strokeRect(0, 0, FIELD.w, FIELD.h);
    ctx.restore();
  },


  /* Draw the landing zone you actually have to hit, and a chevron on the ship
     pointing at it. Without these the player is guessing. */
  drawGuide: function (ctx) {
    var lv = this.lv, s = this.ship;
    var goal = null;
    if (lv.targetDisp) goal = { x: lv.launch.x + lv.targetDisp.x, y: lv.launch.y + lv.targetDisp.y };
    else if (lv.pad) goal = lv.pad;
    if (!goal) return;

    var pulse = 0.5 + 0.5 * Math.sin(this.t * 3.2);
    var R = lv.targetDisp ? (lv.dispTol || 30) : 54;
    ctx.save();
    ctx.strokeStyle = 'rgba(' + COL.final + ',' + (0.35 + pulse * 0.4) + ')';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([9, 9]);
    ctx.lineDashOffset = -this.t * 22;
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, R, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    /* inner glow so it reads as a place to sit down */
    var gg = ctx.createRadialGradient(goal.x, goal.y, 0, goal.x, goal.y, R);
    gg.addColorStop(0, 'rgba(' + COL.final + ',' + (0.1 + pulse * 0.07) + ')');
    gg.addColorStop(1, 'rgba(' + COL.final + ',0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(goal.x, goal.y, R, 0, TAU); ctx.fill();

    /* chevron: which way is the objective, and how far */
    var dx = goal.x - s.x, dy = goal.y - s.y, d = Math.hypot(dx, dy);
    if (d > 90) {
      var a = Math.atan2(dy, dx);
      ctx.translate(s.x + Math.cos(a) * 46, s.y + Math.sin(a) * 46);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(' + COL.final + ',' + (0.5 + pulse * 0.35) + ')';
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
  drawIslands: function (ctx) {
    var lv = this.lv;
    (lv.islands || []).forEach(function (i) { Game.island(ctx, i.x, i.y, i.r, 'idle'); });
    Game.island(ctx, lv.launch.x, lv.launch.y, 40, 'start');
    if (lv.pad && !lv.loop) Game.island(ctx, lv.pad.x, lv.pad.y, 40, 'target');
    if (lv.loop) Game.island(ctx, lv.launch.x, lv.launch.y, 40, 'both');
    this.beacons.forEach(function (b, i) { Game.beacon(ctx, b.x, b.y, i); });
  },

  island: function (ctx, x, y, r, kind) {
    var img = Assets.get('islands/island_' + kind) || Assets.get('islands/island_idle');
    var accent = kind === 'start' ? COL.initial : (kind === 'target' || kind === 'both' ? COL.final : '148,170,190');
    /* mist pad */
    var mg = ctx.createRadialGradient(x, y + r * 1.3, 0, x, y + r * 1.3, r * 1.9);
    mg.addColorStop(0, 'rgba(226,236,246,0.26)');
    mg.addColorStop(1, 'rgba(200,215,230,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 1.25, r * 1.8, r * 0.7, 0, 0, TAU);
    ctx.fill();

    if (kind !== 'idle') {
      var pulse = 0.5 + 0.5 * Math.sin(this.t * 3);
      var hg = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.4);
      hg.addColorStop(0, 'rgba(' + accent + ',' + (0.26 + pulse * 0.16) + ')');
      hg.addColorStop(1, 'rgba(' + accent + ',0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, TAU);
      ctx.fill();
    }

    if (img) {
      ctx.drawImage(img, x - r * 1.2, y - r * 0.5, r * 2.4, r * 2.4);
    } else {
      /* rock */
      ctx.beginPath();
      ctx.moveTo(x - r, y + r * 0.03);
      ctx.lineTo(x - r * 0.82, y + r * 0.5);
      ctx.lineTo(x - r * 0.4, y + r * 0.95);
      ctx.lineTo(x + r * 0.05, y + r * 1.2);
      ctx.lineTo(x + r * 0.5, y + r * 0.9);
      ctx.lineTo(x + r * 0.85, y + r * 0.45);
      ctx.lineTo(x + r, y + r * 0.03);
      ctx.closePath();
      var rg = ctx.createLinearGradient(x - r * 0.6, y, x + r * 0.7, y + r * 1.2);
      rg.addColorStop(0, '#8a6038'); rg.addColorStop(0.45, '#5d3d20'); rg.addColorStop(1, '#2b1a0d');
      ctx.fillStyle = rg;
      ctx.fill();
      /* soil line */
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.05, r * 0.99, r * 0.13, 0, 0, TAU);
      ctx.fillStyle = 'rgba(48,30,14,0.85)';
      ctx.fill();
      /* grass dome, top half only */
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.45, 0, Math.PI, TAU);
      ctx.closePath();
      var gg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.34, r * 0.05, x, y, r * 1.05);
      if (kind === 'start') { gg.addColorStop(0, '#d8f6ff'); gg.addColorStop(0.35, '#79d0f2'); gg.addColorStop(1, '#1d6f96'); }
      else if (kind === 'target' || kind === 'both') { gg.addColorStop(0, '#fff3cf'); gg.addColorStop(0.35, '#ffc93d'); gg.addColorStop(1, '#8a5c10'); }
      else { gg.addColorStop(0, '#cdf0b4'); gg.addColorStop(0.4, '#77bd68'); gg.addColorStop(1, '#2c5f36'); }
      ctx.fillStyle = gg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.04, r * 0.9, r * 0.38, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    /* pad markers */
    if (kind === 'target' || kind === 'both') {
      var f = Assets.get('ui/flag');
      if (f) ctx.drawImage(f, x - r * 0.5, y - r * 1.5 + Math.sin(this.t * 1.6) * 3, r, r);
    }
  },

  beacon: function (ctx, x, y, i) {
    var pulse = 0.5 + 0.5 * Math.sin(this.t * 2.4 + i);
    var g = ctx.createRadialGradient(x, y, 0, x, y, 60);
    g.addColorStop(0, 'rgba(' + COL.initial + ',0.4)');
    g.addColorStop(1, 'rgba(' + COL.initial + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 60, 0, TAU); ctx.fill();
    var im = Assets.get('ui/origin');
    if (im) ctx.drawImage(im, x - 18, y - 18, 36, 36);
    ctx.strokeStyle = 'rgba(' + COL.brass + ',' + (0.4 + pulse * 0.4) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 26 + pulse * 5, 0, TAU); ctx.stroke();
  },

  drawHazards: function (ctx) {
    for (var i = 0; i < this.hazards.length; i++) {
      var h = this.hazards[i];
      if (h.type === 'spire') {
        var im = Assets.get('ui/spire');
        var g = ctx.createRadialGradient(h.cx, h.cy, h.r * 0.3, h.cx, h.cy, h.r);
        g.addColorStop(0, 'rgba(80,100,120,0.5)');
        g.addColorStop(1, 'rgba(40,56,72,0.15)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + COL.disp + ',0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 8]);
        ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        if (im) ctx.drawImage(im, h.cx - h.r * 0.62, h.cy - h.r * 0.85, h.r * 1.24, h.r * 1.6);
      } else if (h.type === 'gate') {
        var hot = h.hot;
        var col = hot ? COL.disp : COL.green;
        var gg = ctx.createRadialGradient(h.cx, h.cy, h.r * 0.2, h.cx, h.cy, h.r);
        gg.addColorStop(0, 'rgba(' + col + ',' + (hot ? 0.4 : 0.14) + ')');
        gg.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + col + ',' + (hot ? 0.95 : 0.5) + ')';
        ctx.lineWidth = hot ? 3.5 : 2;
        ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.stroke();
        /* phase ring shows when it opens */
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, h.r + 12, -Math.PI / 2, -Math.PI / 2 + TAU * (h.phaseFrac || 0));
        ctx.stroke();
        if (hot) {
          var gi = Assets.get('ui/gate');
          if (gi) ctx.drawImage(gi, h.cx - h.r * 0.45, h.cy - h.r * 0.45, h.r * 0.9, h.r * 0.9);
        }
      } else if (h.type === 'mover') {
        var mi = Assets.get('ui/storm');
        var mg = ctx.createRadialGradient(h.cx, h.cy, h.r * 0.2, h.cx, h.cy, h.r);
        mg.addColorStop(0, 'rgba(' + COL.storm + ',0.55)');
        mg.addColorStop(1, 'rgba(' + COL.storm + ',0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + COL.disp + ',0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 7]);
        ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        if (mi) ctx.drawImage(mi, h.cx - h.r * 0.6, h.cy - h.r * 0.6, h.r * 1.2, h.r * 1.2);
      }
    }
  },

  drawCrystals: function (ctx) {
    var im = Assets.get('ui/crystal');
    for (var i = 0; i < this.crystals.length; i++) {
      var c = this.crystals[i];
      if (c.got) continue;
      var bob = Math.sin(this.t * 2 + c.ph) * 5;
      var g = ctx.createRadialGradient(c.x, c.y + bob, 0, c.x, c.y + bob, 34);
      g.addColorStop(0, 'rgba(' + COL.crystal + ',0.55)');
      g.addColorStop(1, 'rgba(' + COL.crystal + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y + bob, 34, 0, TAU); ctx.fill();
      if (im) ctx.drawImage(im, c.x - 15, c.y + bob - 18, 30, 36);
      else {
        ctx.fillStyle = 'rgba(' + COL.crystal + ',1)';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + bob - 16); ctx.lineTo(c.x + 11, c.y + bob);
        ctx.lineTo(c.x, c.y + bob + 16); ctx.lineTo(c.x - 11, c.y + bob);
        ctx.closePath(); ctx.fill();
      }
    }
  },

  drawTrail: function (ctx) {
    var p = this.trail.pts;
    if (p.length < 2) return;
    var reveal = this.state === 'REVEAL';
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* glow */
    ctx.strokeStyle = 'rgba(' + COL.path + ',0.14)';
    ctx.lineWidth = 13;
    this.strokeTrail(ctx, p);
    ctx.strokeStyle = 'rgba(' + COL.path + ',' + (reveal ? 0.35 : 0.6) + ')';
    ctx.lineWidth = 3;
    this.strokeTrail(ctx, p);
    ctx.restore();
  },

  strokeTrail: function (ctx, p) {
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i < p.length; i++) {
      if (p[i].cut) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p[i].x, p[i].y); pen = true; }
      else ctx.lineTo(p[i].x, p[i].y);
    }
    ctx.stroke();
  },

  drawVectors: function (ctx) {
    var lv = this.lv, s = this.ship;
    /* position vector from the reference beacon (or launch pad) to the ship */
    var o = this.beacons.length ? this.beacons[0] : lv.launch;
    if (this.state === 'FLY' && this.trail.d > 6) {
      this.arrow(ctx, o.x, o.y, s.x, s.y, COL.initial, 0.42, 'r');
    }
    if (this.beacons.length > 1) {
      this.arrow(ctx, this.beacons[1].x, this.beacons[1].y, s.x, s.y, COL.final, 0.36, 'r2');
    }
    /* wind triad on the crosswind mission */
    if (lv.wind && this.state === 'FLY') {
      var wx = this.windNow.x, wy = this.windNow.y;
      var k = 0.9;
      this.arrow(ctx, s.x, s.y, s.x + wx * k, s.y + wy * k, COL.path, 0.6, 'wind');
      if (s.thrusting) {
        var tm = Math.hypot(this.inp.x, this.inp.y) || 1;
        this.arrow(ctx, s.x, s.y, s.x + this.inp.x / tm * 80, s.y + this.inp.y / tm * 80, COL.initial, 0.7, 'thrust');
        this.arrow(ctx, s.x, s.y, s.x + this.inp.x / tm * 80 + wx * k, s.y + this.inp.y / tm * 80 + wy * k, COL.final, 0.85, 'actual');
      }
    }
    /* the target displacement on TWO FRAMES */
    if (lv.targetDisp) {
      var tx = lv.launch.x + lv.targetDisp.x, ty = lv.launch.y + lv.targetDisp.y;
      ctx.save();
      ctx.strokeStyle = 'rgba(' + COL.disp + ',0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 9]);
      ctx.beginPath(); ctx.moveTo(lv.launch.x, lv.launch.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, lv.dispTol || 30, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  },

  arrow: function (ctx, x0, y0, x1, y1, rgb, alpha, label) {
    var dx = x1 - x0, dy = y1 - y0;
    var L = Math.hypot(dx, dy);
    if (L < 6) return;
    var a = Math.atan2(dy, dx), head = 16;
    ctx.save();
    ctx.strokeStyle = 'rgba(' + rgb + ',' + (alpha * 0.3) + ')';
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.translate(x1, y1); ctx.rotate(a);
    ctx.fillStyle = 'rgba(' + rgb + ',' + Math.min(1, alpha + 0.25) + ')';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-head, -head * 0.42); ctx.lineTo(-head * 0.65, 0); ctx.lineTo(-head, head * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  drawShip: function (ctx) {
    var s = this.ship;
    if (this.state === 'FAILED') return;
    if (this.inv > 0 && Math.floor(this.t * 14) % 2 === 0) return;
    var im = Assets.get('characters/airship') || Assets.get('ui/airship');
    var w = 54, h = 30;
    ctx.save();
    ctx.translate(s.x, s.y);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 44);
    g.addColorStop(0, 'rgba(' + COL.brass + ',0.32)');
    g.addColorStop(1, 'rgba(' + COL.brass + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
    ctx.rotate(Math.atan2(s.vy, s.vx) * 0.35);
    if (im) ctx.drawImage(im, -w / 2, -h / 2, w, h);
    else {
      ctx.fillStyle = '#f6efe0';
      ctx.beginPath(); ctx.ellipse(0, 0, w * 0.42, h * 0.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a5c1c';
      ctx.fillRect(-8, h * 0.28, 16, 7);
    }
    ctx.restore();
  },

  drawStorm: function (ctx) {
    var y = this.stormY;
    if (y > FIELD.h + 20) return;
    var g = ctx.createLinearGradient(0, y - 60, 0, FIELD.h);
    g.addColorStop(0, 'rgba(60,72,96,0)');
    g.addColorStop(0.35, 'rgba(72,86,112,0.7)');
    g.addColorStop(1, 'rgba(30,38,54,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 60, FIELD.w, FIELD.h - y + 80);
    ctx.strokeStyle = 'rgba(' + COL.disp + ',0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (var x = 0; x <= FIELD.w; x += 20) {
      var yy = y + Math.sin(x * 0.03 + this.t * 3) * 7;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  },

  drawFog: function (ctx) {
    var s = this.ship;
    var R = 190;
    var g = ctx.createRadialGradient(s.x, s.y, R * 0.35, s.x, s.y, R);
    g.addColorStop(0, 'rgba(16,24,40,0)');
    g.addColorStop(1, 'rgba(16,24,40,0.96)');
    ctx.save();
    ctx.fillStyle = 'rgba(16,24,40,0.96)';
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.w, FIELD.h);
    ctx.arc(s.x, s.y, R, 0, TAU, true);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.fill();
    ctx.restore();
    /* the destination still pings through the fog */
    if (this.lv.pad) {
      var p = this.lv.pad;
      var pulse = (this.t % 1.6) / 1.6;
      ctx.save();
      ctx.strokeStyle = 'rgba(' + COL.final + ',' + (1 - pulse) * 0.5 + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 30 + pulse * 90, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  },

  drawReveal: function (ctx) {
    var r = this.reveal, lv = this.lv;
    /* the swept ribbon */
    if (r.sweep > 0) {
      var acc = 0, p = this.trail.pts;
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(' + COL.path + ',0.95)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      var pen = false;
      for (var i = 1; i < p.length; i++) {
        if (p[i].cut || p[i - 1].cut) { pen = false; continue; }
        var seg = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
        if (acc + seg <= r.sweep) {
          if (!pen) { ctx.moveTo(p[i - 1].x, p[i - 1].y); pen = true; }
          ctx.lineTo(p[i].x, p[i].y);
        } else if (acc < r.sweep) {
          var k = (r.sweep - acc) / seg;
          if (!pen) { ctx.moveTo(p[i - 1].x, p[i - 1].y); pen = true; }
          ctx.lineTo(Util.lerp(p[i - 1].x, p[i].x, k), Util.lerp(p[i - 1].y, p[i].y, k));
          break;
        }
        acc += seg;
      }
      ctx.stroke();
      ctx.restore();
    }
    /* the laser: displacement, fired last on purpose */
    if (r.laser > 0) {
      var a = lv.launch, b = { x: this.ship.x, y: this.ship.y };
      var ex = Util.lerp(a.x, b.x, r.laser), ey = Util.lerp(a.y, b.y, r.laser);
      ctx.save();
      ctx.strokeStyle = 'rgba(' + COL.disp + ',0.3)';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(' + COL.disp + ',1)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
      [[a.x, a.y], [ex, ey]].forEach(function (q) {
        var fg = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 34);
        fg.addColorStop(0, 'rgba(255,255,255,0.85)');
        fg.addColorStop(0.4, 'rgba(' + COL.disp + ',0.5)');
        fg.addColorStop(1, 'rgba(' + COL.disp + ',0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(q[0], q[1], 34, 0, TAU); ctx.fill();
      });
      /* zero-displacement case: it collapses to a pulsing dot */
      if (this.dispLen < 12) {
        var pr = 14 + Math.sin(this.t * 8) * 5;
        ctx.strokeStyle = 'rgba(' + COL.disp + ',0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(a.x, a.y, pr, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }
};
