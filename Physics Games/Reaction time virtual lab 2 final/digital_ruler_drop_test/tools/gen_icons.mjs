/**
 * gen_icons.mjs — bakes every icon PNG used by Digital Ruler Drop Test.
 *
 *   node tools/gen_icons.mjs
 *
 * Output: assets/images/ui/emoji/*.png
 *
 * The game ships with these PNGs already generated. This script exists so the
 * icon set can be regenerated or retouched without an image editor, and so the
 * project never needs an emoji glyph (or any network access) to render its UI.
 *
 * Theme: a neuro-physics reaction lab — brushed steel, lit cyan instrumentation,
 * amber warning lamps, violet neural signals.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Cvs, rect, roundRect, ellipse, circle, poly, ring, capsule, strokePath,
  star, ngon, bez, tf, union,
} from './raster.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMOJI = path.join(ROOT, 'assets', 'images', 'ui', 'emoji');

/* ---------------- palette ---------------- */
const P = {
  cyan:   { hi: '#d3fbff', lo: '#0e93b8', glow: '#22d3ee' },
  amber:  { hi: '#fff0c9', lo: '#d9760a', glow: '#ffb02e' },
  red:    { hi: '#ffc9d2', lo: '#c81a3f', glow: '#ff4d6d' },
  green:  { hi: '#ccffe9', lo: '#0aa070', glow: '#2fe3a0' },
  steel:  { hi: '#eff5fb', lo: '#63788d', glow: '#a4b8cc' },
  violet: { hi: '#ecdcff', lo: '#6d38cc', glow: '#a970ff' },
  brass:  { hi: '#ffeec2', lo: '#9a6a12', glow: '#e0a83c' },
  dim:    { hi: '#43566c', lo: '#1b2634', glow: '#2b3a4c' },
  dark:   { hi: '#1d2c40', lo: '#070d17', glow: '#0b1220' },
};
/** vertical gradient across a shape's y-range */
const vg = (c, y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, c.hi], [1, c.lo]] });
/** diagonal gradient — reads as a lit bevel */
const dg = (c, x0, y0, x1, y1) => ({ lin: [x0, y0, x1, y1], stops: [[0, c.hi], [0.5, c.glow], [1, c.lo]] });
/** lit-from-within radial */
const radial = (c, cx, cy, r) => ({ rad: [cx, cy, r], stops: [[0, c.hi], [0.5, c.glow], [1, c.lo]] });

/* ---------------- helpers ---------------- */
function make(size, fn) { const c = new Cvs(size, size); fn(c, size); return c; }

/** Hex instrument plate used behind badge-style icons. */
function hexPlate(c, s, pal, { r = null, glow = 0.42 } = {}) {
  const R = r || s * 0.44, cx = s / 2, cy = s / 2;
  c.glow(ngon(cx, cy, 6, R * 1.02), pal.glow, s * 0.14, glow);
  c.fill(ngon(cx, cy, 6, R), vg(pal, cy - R, cy + R));
  c.fill(ngon(cx, cy, 6, R * 0.84), { rad: [cx, cy - R * 0.32, R], stops: [[0, '#1e3350'], [1, '#060c15']] });
}

/** Round bevelled button plate. */
function discPlate(c, s, pal, { r = null, glow = 0.4 } = {}) {
  const R = r || s * 0.39, cx = s / 2, cy = s / 2;
  c.glow(circle(cx, cy, R), pal.glow, s * 0.09, glow);
  c.fill(circle(cx, cy, R), vg(pal, cy - R, cy + R));
  c.fill(circle(cx, cy, R * 0.85), { rad: [cx, cy - R * 0.35, R], stops: [[0, '#1c3049'], [1, '#060c14']] });
}

/** Diagonal "prohibited" slash — for the muted variants. */
function slash(c, s, pal = P.red) {
  const sh = capsule(s * 0.2, s * 0.2, s * 0.8, s * 0.8, s * 0.1);
  c.fillU(sh, '#05090f', 1);
  const bar = capsule(s * 0.22, s * 0.22, s * 0.78, s * 0.78, s * 0.062);
  c.glowU(bar, pal.glow, s * 0.1, 0.6);
  c.fillU(bar, dg(pal, s * 0.2, s * 0.2, s * 0.8, s * 0.8));
}

const OUT = [];
const add = (name, size, fn) => OUT.push({ name, size, fn });

/* =======================================================================
   Navigation & chrome
   ======================================================================= */

add('play', 128, (c, s) => {
  hexPlate(c, s, P.cyan);
  const tri = poly([[52, 40], [94, 64], [52, 88]]);
  c.glow(tri, P.cyan.glow, 14, 0.75);
  c.fill(tri, dg(P.cyan, 52, 40, 94, 88));
});

add('pause', 128, (c, s) => {
  hexPlate(c, s, P.steel);
  const bars = union(roundRect(50, 42, 11, 44, 5), roundRect(68, 42, 11, 44, 5));
  c.glowU(bars, P.cyan.glow, 12, 0.6);
  c.fillU(bars, vg(P.cyan, 42, 86));
});

add('back', 128, (c, s) => {
  const sh = union(
    capsule(46, 64, 96, 64, 15),
    capsule(46, 64, 70, 40, 15),
    capsule(46, 64, 70, 88, 15),
  );
  c.glowU(sh, P.cyan.glow, 13, 0.5);
  c.fillU(sh, dg(P.cyan, 40, 40, 100, 90));
});

add('next', 128, (c, s) => {
  const sh = union(
    capsule(32, 64, 84, 64, 15),
    capsule(84, 64, 58, 40, 15),
    capsule(84, 64, 58, 88, 15),
  );
  c.glowU(sh, P.cyan.glow, 13, 0.55);
  c.fillU(sh, dg(P.cyan, 30, 40, 90, 90));
});

add('chevron', 128, (c, s) => {
  const sh = union(capsule(48, 36, 82, 64, 14), capsule(82, 64, 48, 92, 14));
  c.glowU(sh, P.cyan.glow, 11, 0.45);
  c.fillU(sh, vg(P.cyan, 36, 92));
});

add('close', 128, (c, s) => {
  const sh = union(capsule(40, 40, 88, 88, 13), capsule(88, 40, 40, 88, 13));
  c.glowU(sh, P.steel.glow, 10, 0.42);
  c.fillU(sh, dg(P.steel, 38, 38, 90, 90));
});

add('home', 128, (c, s) => {
  const roof = poly([[64, 26], [108, 64], [96, 64], [96, 100], [32, 100], [32, 64], [20, 64]]);
  c.glow(roof, P.cyan.glow, 13, 0.45);
  c.fill(roof, vg(P.cyan, 26, 100));
  c.fill(roundRect(54, 72, 20, 28, 3), '#08131d');
});

add('menu', 128, (c, s) => {
  const sh = union(
    roundRect(28, 38, 72, 11, 5),
    roundRect(28, 58, 72, 11, 5),
    roundRect(28, 78, 72, 11, 5),
  );
  c.glowU(sh, P.cyan.glow, 11, 0.45);
  c.fillU(sh, vg(P.cyan, 38, 90));
});

/* =======================================================================
   Status glyphs
   ======================================================================= */

add('check', 128, (c) => {
  const sh = strokePath([[26, 68], [52, 94], [102, 34]], 18);
  c.glowU(sh, P.green.glow, 16, 0.72);
  c.fillU(sh, vg(P.green, 30, 96));
});

add('cross', 128, (c) => {
  const sh = union(capsule(36, 36, 92, 92, 17), capsule(92, 36, 36, 92, 17));
  c.glowU(sh, P.red.glow, 16, 0.72);
  c.fillU(sh, vg(P.red, 34, 94));
});

add('warn', 128, (c) => {
  const tri = poly([[64, 20], [114, 104], [14, 104]]);
  c.glow(tri, P.amber.glow, 16, 0.6);
  c.fill(tri, vg(P.amber, 20, 104));
  c.fill(poly([[64, 34], [102, 97], [26, 97]]), { lin: [0, 34, 0, 97], stops: [[0, '#2a1c05'], [1, '#120c02']] });
  c.fill(roundRect(58, 48, 12, 30, 6), P.amber.hi);
  c.fill(circle(64, 88, 7), P.amber.hi);
});

add('info', 128, (c, s) => {
  discPlate(c, s, P.cyan);
  c.fill(circle(64, 46, 6.5), P.cyan.hi);
  const bar = roundRect(57.5, 57, 13, 30, 6.5);
  c.glow(bar, P.cyan.glow, 8, 0.5);
  c.fill(bar, vg(P.cyan, 57, 87));
});

add('help', 128, (c, s) => {
  hexPlate(c, s, P.violet);
  const hook = strokePath([[48, 50], [56, 38], [72, 38], [80, 50], [72, 62], [64, 70], [64, 80]], 13);
  c.glowU(hook, P.violet.glow, 14, 0.65);
  c.fillU(hook, vg(P.violet, 38, 82));
  const dot = circle(64, 98, 8);
  c.glow(dot, P.violet.glow, 10, 0.7);
  c.fill(dot, radial(P.violet, 62, 95, 10));
});

add('lock', 128, (c) => {
  const shackle = ring(64, 54, 26, 16, Math.PI, Math.PI * 2);
  c.fill(shackle, vg(P.dim, 28, 54));
  const body = roundRect(30, 54, 68, 54, 10);
  c.glow(body, P.dim.glow, 12, 0.35);
  c.fill(body, vg(P.steel, 54, 108));
  c.fill(roundRect(36, 60, 56, 42, 7), { lin: [0, 60, 0, 102], stops: [[0, '#33445a'], [1, '#141d29']] });
  c.fill(circle(64, 78, 8), P.brass.glow);
  c.fill(roundRect(60, 82, 8, 14, 4), P.brass.lo);
});

add('unlocked', 128, (c) => {
  const shackle = ring(78, 52, 26, 16, Math.PI, Math.PI * 1.62);
  c.fill(shackle, vg(P.cyan, 26, 52));
  const body = roundRect(30, 54, 68, 54, 10);
  c.glow(body, P.cyan.glow, 12, 0.4);
  c.fill(body, vg(P.steel, 54, 108));
  c.fill(roundRect(36, 60, 56, 42, 7), { lin: [0, 60, 0, 102], stops: [[0, '#2d4d5e'], [1, '#111c25']] });
  c.fill(circle(64, 80, 9), radial(P.cyan, 62, 77, 11));
});

/* =======================================================================
   Rating — a lit synapse node instead of a generic star
   ======================================================================= */

function synapse(c, s, pal, lit) {
  const cx = 64, cy = 64;
  // dendrite spokes
  const spokes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * 46, y = cy + Math.sin(a) * 46;
    const mx = cx + Math.cos(a + 0.28) * 28, my = cy + Math.sin(a + 0.28) * 28;
    spokes.push(...strokePath([[cx, cy], [mx, my], [x, y]], lit ? 8 : 6));
    spokes.push(...circle(x, y, lit ? 7 : 5));
  }
  if (lit) c.glowU(spokes, pal.glow, 16, 0.62);
  c.fillU(spokes, lit ? dg(pal, 20, 20, 108, 108) : vg(P.dim, 20, 108));
  // soma
  const soma = circle(cx, cy, lit ? 22 : 18);
  if (lit) c.glow(soma, pal.glow, 20, 0.85);
  c.fill(soma, lit
    ? { rad: [cx - 4, cy - 6, 24], stops: [[0, '#ffffff'], [0.35, pal.hi], [0.7, pal.glow], [1, pal.lo]] }
    : { rad: [cx - 4, cy - 6, 20], stops: [[0, '#4a5f76'], [1, '#151e29']] });
}

add('grade_on', 128, (c, s) => synapse(c, s, P.amber, true));
add('grade_off', 128, (c, s) => synapse(c, s, P.dim, false));

/* =======================================================================
   Lab apparatus & concept icons
   ======================================================================= */

add('ruler', 128, (c) => {
  const body = roundRect(44, 12, 40, 104, 7);
  c.glow(body, P.brass.glow, 13, 0.4);
  c.fill(body, { lin: [44, 0, 84, 0], stops: [[0, P.brass.hi], [0.35, P.brass.glow], [1, P.brass.lo]] });
  c.fill(roundRect(48, 16, 32, 96, 5), { lin: [48, 0, 80, 0], stops: [[0, '#f7e6bd'], [0.5, '#e8d29a'], [1, '#b58f43']] });
  for (let i = 0; i <= 9; i++) {
    const y = 22 + i * 10;
    const long = i % 3 === 0;
    c.fill(rect(50, y, long ? 20 : 12, 2.4), '#4a3410');
  }
});

add('hand', 128, (c) => {
  // pinch grip: thumb + index closing on a gap
  const upper = poly([[30, 46], [58, 40], [78, 52], [72, 62], [46, 60], [28, 56]]);
  const lower = poly([[30, 88], [58, 94], [78, 82], [72, 72], [46, 74], [28, 78]]);
  const wrist = roundRect(80, 44, 24, 46, 11);
  const sh = union(upper, lower, wrist);
  c.glowU(sh, P.steel.glow, 12, 0.4);
  c.fillU(sh, dg(P.steel, 28, 40, 104, 94));
  const sp = circle(20, 67, 8);
  c.glow(sp, P.cyan.glow, 12, 0.8);
  c.fill(sp, radial(P.cyan, 19, 65, 9));
});

add('bolt', 128, (c) => {
  const sh = poly([[74, 12], [38, 66], [60, 66], [50, 116], [92, 56], [68, 56]]);
  c.glow(sh, P.amber.glow, 18, 0.8);
  c.fill(sh, { lin: [38, 12, 92, 116], stops: [[0, '#fffbe8'], [0.45, P.amber.glow], [1, P.amber.lo]] });
});

add('brain', 128, (c) => {
  const lobe = union(
    ellipse(52, 58, 30, 26),
    ellipse(80, 62, 26, 24),
    ellipse(64, 44, 26, 20),
    roundRect(44, 74, 42, 22, 10),
  );
  c.glowU(lobe, P.violet.glow, 16, 0.55);
  c.fillU(lobe, { rad: [58, 46, 52], stops: [[0, P.violet.hi], [0.5, P.violet.glow], [1, P.violet.lo]] });
  c.stroke([
    [[44, 50], [58, 56], [50, 66], [64, 74]],
    [[74, 44], [80, 56], [72, 64], [86, 72]],
  ], '#3d1d78', 5, 0.85);
  c.fill(roundRect(56, 94, 16, 16, 5), vg(P.dim, 94, 110));
});

add('timer', 128, (c) => {
  const R = 42;
  c.glow(circle(64, 70, R), P.cyan.glow, 16, 0.45);
  c.fill(circle(64, 70, R), vg(P.steel, 28, 112));
  c.fill(circle(64, 70, R - 6), { rad: [58, 56, R], stops: [[0, '#16283c'], [1, '#050a12']] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x0 = 64 + Math.cos(a) * (R - 12), y0 = 70 + Math.sin(a) * (R - 12);
    const x1 = 64 + Math.cos(a) * (R - 20), y1 = 70 + Math.sin(a) * (R - 20);
    c.fillU(capsule(x0, y0, x1, y1, 3), i % 3 === 0 ? P.cyan.hi : P.steel.lo);
  }
  const hands = union(capsule(64, 70, 64, 44, 5), capsule(64, 70, 86, 78, 4));
  c.glowU(hands, P.cyan.glow, 10, 0.7);
  c.fillU(hands, P.cyan.hi);
  c.fill(circle(64, 70, 5), P.amber.glow);
  c.fill(roundRect(54, 12, 20, 14, 5), vg(P.steel, 12, 26));
});

add('target', 128, (c) => {
  const r1 = ring(64, 64, 46, 38);
  const r2 = ring(64, 64, 28, 21);
  c.glow(r1, P.red.glow, 14, 0.5);
  c.fill(r1, vg(P.red, 18, 110));
  c.fill(r2, vg(P.red, 36, 92));
  const cr = union(capsule(64, 8, 64, 30, 5), capsule(64, 98, 64, 120, 5), capsule(8, 64, 30, 64, 5), capsule(98, 64, 120, 64, 5));
  c.fillU(cr, P.steel.glow, 0.9);
  const dot = circle(64, 64, 10);
  c.glow(dot, P.red.glow, 14, 0.9);
  c.fill(dot, radial(P.red, 62, 61, 12));
});

add('gravity', 128, (c) => {
  const shaft = union(capsule(64, 16, 64, 84, 13), poly([[40, 76], [88, 76], [64, 114]]));
  c.glowU(shaft, P.cyan.glow, 15, 0.55);
  c.fillU(shaft, { lin: [0, 16, 0, 114], stops: [[0, '#173b4c'], [0.4, P.cyan.glow], [1, P.cyan.hi]] });
});

add('chart', 128, (c) => {
  const axis = union(roundRect(22, 22, 7, 84, 3), roundRect(22, 99, 84, 7, 3));
  c.fillU(axis, vg(P.steel, 22, 106));
  const bars = [
    roundRect(38, 66, 16, 33, 4),
    roundRect(60, 46, 16, 53, 4),
    roundRect(82, 32, 16, 67, 4),
  ];
  c.glowU(bars, P.cyan.glow, 12, 0.55);
  bars.forEach((b, i) => c.fill(b, vg(P.cyan, 32 + i * 4, 99)));
});

add('stats', 128, (c) => {
  // bell curve over a baseline
  const curve = bez([[16, 100], [44, 100], [46, 26], [64, 26], [82, 26], [84, 100], [112, 100]], 32);
  const area = poly(curve.concat([[112, 104], [16, 104]]));
  c.fill(area, { lin: [0, 26, 0, 104], stops: [[0, '#22d3ee'], [1, '#0a2b38']] }, 0.45);
  c.stroke([curve], dg(P.cyan, 16, 26, 112, 100), 7, 1);
  c.fillU(roundRect(14, 102, 100, 6, 3), vg(P.steel, 102, 108));
  const mid = capsule(64, 30, 64, 104, 4);
  c.fillU(mid, P.amber.glow, 0.9);
});

add('table', 128, (c) => {
  const frame = roundRect(16, 22, 96, 84, 8);
  c.glow(frame, P.cyan.glow, 11, 0.32);
  c.fill(frame, vg(P.steel, 22, 106));
  c.fill(roundRect(21, 27, 86, 74, 5), { lin: [0, 27, 0, 101], stops: [[0, '#14263a'], [1, '#070e18']] });
  c.fill(roundRect(21, 27, 86, 18, 5), vg(P.cyan, 27, 45), 0.85);
  for (let i = 1; i < 4; i++) c.fill(rect(21, 45 + i * 14, 86, 2), '#2a3f55');
  c.fill(rect(50, 27, 2, 74), '#2a3f55');
  c.fill(rect(79, 27, 2, 74), '#2a3f55');
});

add('flask', 128, (c) => {
  const body = poly([[52, 18], [76, 18], [76, 58], [102, 106], [26, 106], [52, 58]]);
  c.glow(body, P.cyan.glow, 14, 0.42);
  c.fill(body, { lin: [26, 18, 102, 106], stops: [[0, '#dff6ff'], [1, '#4b6b80']] }, 0.5);
  const fluid = poly([[40, 78], [88, 78], [102, 106], [26, 106]]);
  c.glow(fluid, P.green.glow, 14, 0.75);
  c.fill(fluid, { lin: [0, 78, 0, 106], stops: [[0, P.green.glow], [1, P.green.lo]] });
  c.fill(circle(58, 92, 5), P.green.hi, 0.9);
  c.fill(circle(74, 86, 4), P.green.hi, 0.8);
  c.fillU(roundRect(46, 12, 36, 10, 5), vg(P.steel, 12, 22));
});

add('medal', 128, (c) => {
  const ribbon = union(poly([[44, 10], [62, 10], [70, 52], [50, 52]]), poly([[66, 10], [84, 10], [78, 52], [58, 52]]));
  c.fillU(ribbon, vg(P.cyan, 10, 52));
  const R = 34;
  c.glow(circle(64, 80, R), P.brass.glow, 18, 0.7);
  c.fill(circle(64, 80, R), vg(P.brass, 46, 114));
  c.fill(circle(64, 80, R - 6), { rad: [58, 70, R], stops: [[0, '#fff6dd'], [0.55, P.brass.glow], [1, '#7d520c']] });
  c.fill(star(64, 80, 5, 19, 8), '#6b430a');
});

add('trophy', 128, (c) => {
  const cup = poly([[38, 20], [90, 20], [86, 58], [76, 74], [52, 74], [42, 58]]);
  c.glow(cup, P.brass.glow, 16, 0.65);
  c.fill(cup, { lin: [38, 20, 90, 74], stops: [[0, P.brass.hi], [0.5, P.brass.glow], [1, P.brass.lo]] });
  c.fill(ring(30, 34, 14, 8, Math.PI * 0.5, Math.PI * 1.5), vg(P.brass, 20, 48));
  c.fill(ring(98, 34, 14, 8, -Math.PI * 0.5, Math.PI * 0.5), vg(P.brass, 20, 48));
  c.fillU(roundRect(56, 74, 16, 20, 4), vg(P.brass, 74, 94));
  c.fillU(roundRect(40, 94, 48, 14, 5), vg(P.steel, 94, 108));
});

add('retry', 128, (c) => {
  const arc = ring(64, 66, 40, 28, -Math.PI * 0.75, Math.PI * 0.95);
  c.glow(arc, P.cyan.glow, 14, 0.55);
  c.fill(arc, dg(P.cyan, 24, 26, 104, 106));
  const head = poly([[86, 8], [110, 34], [74, 42]]);
  c.glow(head, P.cyan.glow, 12, 0.6);
  c.fill(head, vg(P.cyan, 8, 42));
});

add('trash', 128, (c) => {
  c.fillU(roundRect(46, 14, 36, 10, 4), vg(P.steel, 14, 24));
  const lid = roundRect(24, 26, 80, 14, 5);
  c.glow(lid, P.red.glow, 11, 0.4);
  c.fill(lid, vg(P.steel, 26, 40));
  const can = poly([[32, 42], [96, 42], [88, 112], [40, 112]]);
  c.fill(can, { lin: [32, 0, 96, 0], stops: [[0, '#7d8fa3'], [0.5, '#aebfd1'], [1, '#5b6d80']] });
  for (const x of [50, 64, 78]) c.fill(roundRect(x - 3, 54, 6, 46, 3), '#33465c');
});

add('spark', 128, (c) => {
  const cx = 64, cy = 64;
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rays.push(...capsule(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, cx + Math.cos(a) * (i % 2 ? 32 : 44), cy + Math.sin(a) * (i % 2 ? 32 : 44), 6.5));
  }
  c.glowU(rays, P.amber.glow, 11, 0.7);
  c.fillU(rays, dg(P.amber, 12, 12, 116, 116));
  const core = circle(cx, cy, 20);
  c.glow(core, P.amber.glow, 20, 0.9);
  c.fill(core, { rad: [cx - 4, cy - 5, 22], stops: [[0, '#ffffff'], [0.4, P.amber.hi], [1, P.amber.glow]] });
});

add('neuron', 128, (c) => {
  const axon = strokePath([[24, 40], [50, 56], [74, 48], [104, 66]], 7);
  c.glowU(axon, P.violet.glow, 13, 0.55);
  c.fillU(axon, vg(P.violet, 40, 66));
  const dend = union(
    ...strokePath([[50, 56], [36, 82]], 6),
    ...strokePath([[50, 56], [62, 88]], 6),
    ...strokePath([[74, 48], [82, 24]], 6),
  );
  c.fillU(dend, P.violet.lo);
  const soma = ellipse(50, 56, 17, 15);
  c.glow(soma, P.violet.glow, 16, 0.8);
  c.fill(soma, { rad: [46, 51, 19], stops: [[0, '#ffffff'], [0.35, P.violet.hi], [1, P.violet.lo]] });
  const term = circle(104, 66, 9);
  c.glow(term, P.cyan.glow, 12, 0.85);
  c.fill(term, radial(P.cyan, 102, 63, 10));
});

/* =======================================================================
   Settings: a rotary lab control knob (not a generic gear)
   ======================================================================= */

add('settings', 128, (c, s) => {
  const R = 40;
  // tick ring
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const x0 = 64 + Math.cos(a) * (R + 16), y0 = 64 + Math.sin(a) * (R + 16);
    const x1 = 64 + Math.cos(a) * (R + 7), y1 = 64 + Math.sin(a) * (R + 7);
    const lit = i <= 6;
    const t = capsule(x0, y0, x1, y1, 4);
    if (lit) c.glowU(t, P.cyan.glow, 8, 0.55);
    c.fillU(t, lit ? P.cyan.hi : P.dim.hi);
  }
  c.glow(circle(64, 64, R), P.cyan.glow, 14, 0.35);
  c.fill(circle(64, 64, R), vg(P.steel, 24, 104));
  c.fill(circle(64, 64, R - 5), { rad: [54, 50, R], stops: [[0, '#43566d'], [0.6, '#22303f'], [1, '#0d151f']] });
  // knurled grip notches
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    c.fillU(capsule(64 + Math.cos(a) * (R - 8), 64 + Math.sin(a) * (R - 8), 64 + Math.cos(a) * (R - 15), 64 + Math.sin(a) * (R - 15), 3), '#0a121b', 0.8);
  }
  // pointer
  const ptr = capsule(64, 64, 64 + Math.cos(-Math.PI * 0.35) * (R - 9), 64 + Math.sin(-Math.PI * 0.35) * (R - 9), 7);
  c.glowU(ptr, P.amber.glow, 12, 0.85);
  c.fillU(ptr, dg(P.amber, 60, 40, 96, 70));
  c.fill(circle(64, 64, 7), radial(P.amber, 62, 62, 8));
});

/* =======================================================================
   Audio toggles — tuning fork (music) + horn (sfx)
   ======================================================================= */

function tuningFork(c) {
  const sh = union(
    roundRect(44, 24, 10, 46, 5),
    roundRect(74, 24, 10, 46, 5),
    roundRect(44, 62, 40, 12, 6),
    roundRect(58, 70, 12, 34, 6),
    ellipse(64, 108, 13, 10),
  );
  c.glowU(sh, P.cyan.glow, 13, 0.55);
  c.fillU(sh, dg(P.steel, 40, 24, 90, 112));
  c.fillU(union(roundRect(46, 26, 4, 40, 2), roundRect(76, 26, 4, 40, 2)), P.cyan.hi, 0.8);
}

add('music_on', 128, (c, s) => {
  tuningFork(c);
  for (let i = 0; i < 3; i++) {
    const arc = ring(64, 44, 25 + i * 9, 22 + i * 9, -Math.PI * 0.9, -Math.PI * 0.1);
    c.glow(arc, P.cyan.glow, 7, 0.45 - i * 0.1);
    c.fill(arc, P.cyan.glow, 0.75 - i * 0.2);
  }
});

add('music_off', 128, (c, s) => {
  tuningFork(c);
  slash(c, s);
});

function speaker(c) {
  const sh = union(
    poly([[24, 50], [46, 50], [72, 24], [72, 104], [46, 78], [24, 78]]),
  );
  c.glowU(sh, P.cyan.glow, 13, 0.5);
  c.fillU(sh, dg(P.steel, 24, 24, 74, 104));
  c.fill(poly([[28, 54], [46, 54], [66, 36], [66, 92], [46, 74], [28, 74]]), { lin: [0, 36, 0, 92], stops: [[0, '#3d5570'], [1, '#16202c']] });
}

add('sfx_on', 128, (c, s) => {
  speaker(c);
  for (let i = 0; i < 3; i++) {
    const arc = ring(74, 64, 18 + i * 13, 14 + i * 13, -Math.PI * 0.42, Math.PI * 0.42);
    c.glow(arc, P.amber.glow, 9, 0.5 - i * 0.11);
    c.fill(arc, P.amber.glow, 0.85 - i * 0.22);
  }
});

add('sfx_off', 128, (c, s) => {
  speaker(c);
  slash(c, s);
});

/* =======================================================================
   emit
   ======================================================================= */
let n = 0;
for (const it of OUT) {
  const cvs = make(it.size, it.fn);
  cvs.save(path.join(EMOJI, `${it.name}.png`));
  n++;
}
console.log(`generated ${n} icons -> ${path.relative(ROOT, EMOJI)}`);
