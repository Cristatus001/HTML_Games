/**
 * gen_icons.mjs — bakes every icon PNG used by Vector Analysis Lab.
 * Run:  node tools/gen_icons.mjs
 * Output: assets/images/ui/emoji/*.png  and  assets/images/icons/*.png
 *
 * The game ships with these PNGs already generated; this script exists so the
 * icon set can be regenerated or tweaked without any image editor.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Cvs, roundRect, ellipse, circle, poly, ring, capsule, strokePath,
  star, ngon, bez, tf, union,
} from './raster.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMOJI = path.join(ROOT, 'assets', 'images', 'ui', 'emoji');
const ICONS = path.join(ROOT, 'assets', 'images', 'icons');

/* ---------------- palette ---------------- */
const P = {
  cyan:   { hi: '#c9fbff', lo: '#12a7cc', glow: '#22d3ee' },
  amber:  { hi: '#ffe9bd', lo: '#e2820a', glow: '#ffa726' },
  red:    { hi: '#ffc4cf', lo: '#d61e45', glow: '#ff5470' },
  green:  { hi: '#c8ffe8', lo: '#0fae79', glow: '#34e0a1' },
  steel:  { hi: '#e6eef7', lo: '#6d8195', glow: '#9fb4c9' },
  violet: { hi: '#e4d4ff', lo: '#7b46d6', glow: '#a970ff' },
  dark:   { hi: '#1b2a3d', lo: '#080f1a', glow: '#0b1220' },
};
const vg = (c, y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, c.hi], [1, c.lo]] });
const radial = (c, cx, cy, r) => ({ rad: [cx, cy, r], stops: [[0, c.hi], [0.55, c.glow], [1, c.lo]] });

/* ---------------- helpers ---------------- */
function make(size, fn) {
  const c = new Cvs(size, size);
  fn(c, size);
  return c;
}
/** Hex plate used behind badge-style icons. */
function hexPlate(c, s, pal, { r = null } = {}) {
  const R = r || s * 0.44;
  const cx = s / 2, cy = s / 2;
  c.glow(ngon(cx, cy, 6, R * 1.02), pal.glow, s * 0.14, 0.42);
  c.fill(ngon(cx, cy, 6, R), vg(pal, cy - R, cy + R));
  c.fill(ngon(cx, cy, 6, R * 0.84), { rad: [cx, cy - R * 0.3, R], stops: [[0, '#1d3048'], [1, '#070d16']] });
}

const OUT = [];
const add = (dir, name, size, fn) => OUT.push({ dir, name, size, fn });

/* =======================================================================
   UI / EMOJI-REPLACEMENT ICONS
   ======================================================================= */

add(EMOJI, 'check', 128, (c) => {
  const sh = strokePath([[26, 68], [52, 94], [102, 34]], 18);
  c.glowU(sh, P.green.glow, 16, 0.7);
  c.fillU(sh, vg(P.green, 30, 96));
});

add(EMOJI, 'cross', 128, (c) => {
  const sh = union(capsule(36, 36, 92, 92, 17), capsule(92, 36, 36, 92, 17));
  c.glowU(sh, P.red.glow, 16, 0.7);
  c.fillU(sh, vg(P.red, 34, 94));
});

add(EMOJI, 'close', 128, (c) => {
  const sh = union(capsule(40, 40, 88, 88, 13), capsule(88, 40, 40, 88, 13));
  c.glowU(sh, P.steel.glow, 10, 0.4);
  c.fillU(sh, vg(P.steel, 38, 90));
});

add(EMOJI, 'scanning', 128, (c) => {
  const arc = ring(64, 64, 48, 34, -1.2, 3.6);
  c.glow(arc, P.cyan.glow, 14, 0.6);
  c.fill(arc, { lin: [20, 20, 108, 108], stops: [[0, P.cyan.hi], [1, '#0d6f8a']] });
  c.fill(ngon(64, 64, 6, 17), radial(P.cyan, 64, 58, 20));
  c.fill(circle(104, 82, 8), P.cyan.hi);
});

/* magnitude = dimension line (length measurement) */
add(EMOJI, 'magnitude', 128, (c) => {
  const sh = union(
    capsule(30, 64, 98, 64, 10),
    capsule(20, 36, 20, 92, 11),
    capsule(108, 36, 108, 92, 11),
    poly([[16, 64], [42, 50], [42, 78]]),
    poly([[112, 64], [86, 50], [86, 78]]),
  );
  c.glowU(sh, P.amber.glow, 14, 0.6);
  c.fillU(sh, vg(P.amber, 36, 92));
});

/* direction = compass rose */
add(EMOJI, 'direction', 128, (c) => {
  const rim = ring(64, 64, 50, 42);
  c.glow(rim, P.cyan.glow, 12, 0.45);
  c.fill(rim, vg(P.steel, 14, 114));
  const needle = star(64, 64, 4, 36, 9);
  c.glow(needle, P.cyan.glow, 14, 0.65);
  c.fill(needle, { lin: [64, 28, 64, 100], stops: [[0, P.cyan.hi], [0.5, '#2fbedd'], [1, '#0d7a95']] });
  c.fill(circle(64, 64, 8), '#08131f');
  c.fill(circle(64, 64, 4), P.cyan.hi);
});

/* codex = stacked data slabs (replaces book) */
add(EMOJI, 'codex', 128, (c) => {
  const slab = (y, w) => roundRect(64 - w / 2, y, w, 20, 5);
  const stack = union(slab(84, 92), slab(58, 84), slab(32, 74));
  c.glowU(stack, P.cyan.glow, 12, 0.4);
  c.fillU(stack, { lin: [0, 28, 0, 106], stops: [[0, '#3a5f84'], [1, '#0c1723']] });
  for (const [y, w] of [[84, 92], [58, 84], [32, 74]]) {
    const line = roundRect(64 - w / 2 + 8, y + 7, w - 16, 5, 2.5);
    c.glow(line, P.cyan.glow, 8, 0.7);
    c.fill(line, vg(P.cyan, y + 6, y + 13));
  }
});

/* insight = lit starburst (replaces sparkle) */
add(EMOJI, 'insight', 128, (c) => {
  c.glow(circle(64, 64, 30), P.amber.glow, 22, 0.5);
  const big = star(64, 64, 4, 52, 13);
  c.glow(big, P.amber.glow, 14, 0.6);
  c.fill(big, radial(P.amber, 64, 64, 54));
  const sm = tf(star(64, 64, 4, 26, 7), { r: Math.PI / 4, ox: 64, oy: 64 });
  c.fill(sm, P.amber.hi, 0.9);
});

/* certified = hex seal with check (replaces graduation cap) */
add(EMOJI, 'certified', 160, (c, s) => {
  hexPlate(c, s, P.amber, { r: 66 });
  const sh = strokePath([[52, 84], [72, 104], [112, 56]], 15);
  c.glowU(sh, P.green.glow, 14, 0.7);
  c.fillU(sh, vg(P.green, 54, 106));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    c.fill(circle(80 + Math.cos(a) * 58, 80 + Math.sin(a) * 58, 4), P.amber.hi, 0.85);
  }
});

/* burst = celebration spray (replaces party popper) */
add(EMOJI, 'burst', 128, (c) => {
  const cols = [P.cyan, P.amber, P.green, P.red, P.violet];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const pal = cols[i % cols.length];
    const x0 = 64 + Math.cos(a) * 22, y0 = 64 + Math.sin(a) * 22;
    const x1 = 64 + Math.cos(a) * 52, y1 = 64 + Math.sin(a) * 52;
    const sh = capsule(x0, y0, x1, y1, 9);
    c.glow(sh, pal.glow, 9, 0.55);
    c.fill(sh, vg(pal, y0 - 10, y1 + 10));
  }
  c.glow(circle(64, 64, 16), P.amber.glow, 16, 0.8);
  c.fill(circle(64, 64, 15), radial(P.amber, 64, 60, 17));
});

/* note = data slate with stylus (replaces memo) */
add(EMOJI, 'note', 128, (c) => {
  const plate = roundRect(24, 22, 66, 84, 9);
  c.glow(plate, P.cyan.glow, 12, 0.35);
  c.fill(plate, vg(P.steel, 22, 106));
  c.fill(roundRect(29, 27, 56, 74, 6), { lin: [0, 27, 0, 101], stops: [[0, '#1c3049'], [1, '#0a1420']] });
  for (let i = 0; i < 4; i++) {
    const y = 38 + i * 15;
    const line = roundRect(37, y, i === 3 ? 24 : 40, 5, 2.5);
    c.glow(line, P.cyan.glow, 6, 0.6);
    c.fill(line, P.cyan.hi, 0.95);
  }
  const st = capsule(96, 96, 116, 30, 11);
  c.glow(st, P.amber.glow, 10, 0.6);
  c.fill(st, vg(P.amber, 28, 100));
});

/* chevron / forward arrow */
add(EMOJI, 'chevron', 128, (c) => {
  const sh = union(capsule(28, 64, 78, 64, 14), poly([[70, 38], [108, 64], [70, 90]]));
  c.glowU(sh, P.cyan.glow, 12, 0.6);
  c.fillU(sh, vg(P.cyan, 38, 92));
});

add(EMOJI, 'back', 128, (c) => {
  const sh = union(capsule(100, 64, 50, 64, 14), poly([[58, 38], [20, 64], [58, 90]]));
  c.glowU(sh, P.steel.glow, 10, 0.45);
  c.fillU(sh, vg(P.steel, 38, 92));
});

/* speaker on/off */
function speaker(c, pal) {
  const body = poly([[26, 50], [50, 50], [76, 24], [76, 104], [50, 78], [26, 78]]);
  c.glow(body, pal.glow, 12, 0.5);
  c.fill(body, vg(pal, 24, 104));
  return body;
}
add(EMOJI, 'sfx_on', 128, (c) => {
  speaker(c, P.cyan);
  for (const [ro, ri] of [[26, 20], [40, 34]]) {
    const a = ring(80, 64, ro, ri, -0.85, 0.85);
    c.glow(a, P.cyan.glow, 8, 0.6);
    c.fill(a, P.cyan.hi, 0.95);
  }
});
add(EMOJI, 'sfx_off', 128, (c) => {
  speaker(c, P.steel);
  const sl = capsule(84, 42, 116, 86, 12);
  c.glow(sl, P.red.glow, 10, 0.7);
  c.fill(sl, vg(P.red, 42, 86));
});

/* music equaliser on/off */
function bars(c, pal, alpha = 1) {
  const hs = [34, 58, 44, 70, 28];
  const sh = [];
  hs.forEach((h, i) => { sh.push(...roundRect(22 + i * 18, 100 - h, 12, h, 6)); });
  c.glowU(sh, pal.glow, 11, 0.5 * alpha);
  c.fillU(sh, vg(pal, 30, 100), alpha);
}
add(EMOJI, 'music_on', 128, (c) => bars(c, P.violet));
add(EMOJI, 'music_off', 128, (c) => {
  bars(c, P.steel, 0.85);
  const sl = capsule(20, 96, 108, 30, 12);
  c.glow(sl, P.red.glow, 10, 0.7);
  c.fill(sl, vg(P.red, 30, 96));
});

/* lock (locked level) */
add(EMOJI, 'lock', 128, (c) => {
  const sh = ring(64, 56, 26, 15, Math.PI, Math.PI * 2);
  c.fill(sh, vg(P.steel, 30, 58));
  const body = roundRect(32, 54, 64, 52, 12);
  c.glow(body, P.steel.glow, 10, 0.32);
  c.fill(body, vg(P.steel, 54, 106));
  c.fill(roundRect(38, 60, 52, 40, 8), { lin: [0, 60, 0, 100], stops: [[0, '#243b53'], [1, '#0b1622']] });
  c.fill(circle(64, 76, 8), P.steel.hi, 0.9);
  c.fill(poly([[60, 76], [68, 76], [66, 94], [62, 94]]), P.steel.hi, 0.9);
});

/* settings = console faders (thematic, not a gear) */
add(EMOJI, 'settings', 128, (c) => {
  const rows = [[38, 76], [64, 44], [90, 88]];
  for (const [y, kx] of rows) {
    const rail = capsule(24, y, 104, y, 9);
    c.fill(rail, { lin: [24, 0, 104, 0], stops: [[0, '#31465c'], [1, '#1a2735']] });
    c.fill(capsule(24, y - 2, 104, y - 2, 3), '#48627c', 0.5);
    const knob = roundRect(kx - 9, y - 15, 18, 30, 7);
    c.glow(knob, P.cyan.glow, 10, 0.6);
    c.fill(knob, vg(P.cyan, y - 15, y + 15));
  }
});

/* help = hex plate with question glyph */
add(EMOJI, 'help', 128, (c, s) => {
  hexPlate(c, s, P.cyan, { r: 54 });
  const hook = ring(64, 50, 20, 11, Math.PI, Math.PI * 2.28);
  const endA = Math.PI * 2.28;
  const ex = 64 + Math.cos(endA) * 15.5, ey = 50 + Math.sin(endA) * 15.5;
  const sh = union(hook, capsule(ex, ey, 64, 78, 11), circle(64, 96, 8.5));
  c.glowU(sh, P.cyan.glow, 10, 0.65);
  c.fillU(sh, vg(P.cyan, 30, 100));
});

/* menu = deck grid */
add(EMOJI, 'menu', 128, (c) => {
  const cells = [[26, 26], [70, 26], [26, 70], [70, 70]];
  cells.forEach(([x, y], i) => {
    const sh = roundRect(x, y, 32, 32, 7);
    c.glow(sh, i % 2 ? P.amber.glow : P.cyan.glow, 9, 0.5);
    c.fill(sh, vg(i % 2 ? P.amber : P.cyan, y, y + 32));
  });
});

/* retry = recalibrate loop */
add(EMOJI, 'retry', 128, (c) => {
  const sh = union(ring(64, 66, 40, 28, -2.5, 1.9), poly([[54, 20], [96, 26], [66, 54]]));
  c.glowU(sh, P.amber.glow, 13, 0.6);
  c.fillU(sh, vg(P.amber, 20, 108));
});

add(EMOJI, 'play', 128, (c) => {
  const sh = poly([[42, 30], [104, 64], [42, 98]]);
  c.glow(sh, P.green.glow, 16, 0.6);
  c.fill(sh, vg(P.green, 30, 98));
});

/* progress cores (thematic stand-in for stars) */
add(EMOJI, 'core_on', 96, (c, s) => {
  const cx = s / 2, cy = s / 2;
  c.glow(ngon(cx, cy, 6, 34), P.amber.glow, 14, 0.7);
  c.fill(ngon(cx, cy, 6, 34), vg(P.amber, cy - 34, cy + 34));
  c.fill(ngon(cx, cy, 6, 24), radial(P.amber, cx, cy - 6, 30));
});
add(EMOJI, 'core_off', 96, (c, s) => {
  const cx = s / 2, cy = s / 2;
  c.fill(ngon(cx, cy, 6, 34), '#2a3a4c');
  c.fill(ngon(cx, cy, 6, 25), '#101a26');
});

/* target reticle */
add(EMOJI, 'target', 128, (c) => {
  const sh = union(ring(64, 64, 48, 40), ring(64, 64, 26, 19), circle(64, 64, 7));
  const ticks = union(
    capsule(64, 4, 64, 22, 8), capsule(64, 106, 64, 124, 8),
    capsule(4, 64, 22, 64, 8), capsule(106, 64, 124, 64, 8),
  );
  c.glowU(union(sh, ticks), P.cyan.glow, 12, 0.5);
  c.fill(sh, vg(P.cyan, 14, 114));
  c.fillU(ticks, vg(P.cyan, 14, 114), 0.85);
});

/* drag = move handle */
add(EMOJI, 'drag', 128, (c) => {
  const arrows = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const tip = [64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56];
    const b1 = [64 + Math.cos(a + 0.36) * 34, 64 + Math.sin(a + 0.36) * 34];
    const b2 = [64 + Math.cos(a - 0.36) * 34, 64 + Math.sin(a - 0.36) * 34];
    arrows.push(...poly([tip, b1, b2]));
  }
  c.glowU(arrows, P.cyan.glow, 11, 0.55);
  c.fillU(arrows, vg(P.cyan, 10, 118));
  c.glow(circle(64, 64, 18), P.amber.glow, 12, 0.7);
  c.fill(circle(64, 64, 17), radial(P.amber, 64, 60, 19));
});

/* equals emblem — the game's core concept */
add(EMOJI, 'equals', 128, (c) => {
  const a = roundRect(24, 44, 80, 14, 7);
  const b = roundRect(24, 72, 80, 14, 7);
  c.glow(a, P.cyan.glow, 12, 0.65);
  c.fill(a, vg(P.cyan, 44, 58));
  c.glow(b, P.amber.glow, 12, 0.65);
  c.fill(b, vg(P.amber, 72, 86));
});

/* warn triangle */
add(EMOJI, 'warn', 128, (c) => {
  const tri = poly([[64, 18], [114, 104], [14, 104]]);
  c.glow(tri, P.amber.glow, 14, 0.6);
  c.fill(tri, vg(P.amber, 18, 104));
  c.fill(poly([[64, 36], [98, 96], [30, 96]]), '#0b1220', 0.85);
  c.fill(roundRect(59, 50, 10, 28, 5), P.amber.hi);
  c.fill(circle(64, 86, 6), P.amber.hi);
});

/* =======================================================================
   LEVEL SCENARIO ICONS  (drawn on the canvas at each vector's tip)
   ======================================================================= */

add(ICONS, 'rain', 128, (c) => {
  const drop = poly(bez([
    [64, 12], [88, 46], [104, 62], [104, 82],
    [104, 106], [86, 118], [64, 118],
    [42, 118], [24, 106], [24, 82],
    [24, 62], [40, 46], [64, 12],
  ], 16));
  c.glow(drop, P.cyan.glow, 14, 0.6);
  c.fill(drop, { rad: [56, 76, 52], stops: [[0, '#e8feff'], [0.5, '#38c6e8'], [1, '#0b7b9c']] });
  c.fill(ellipse(50, 74, 9, 14), '#ffffff', 0.55);
});

add(ICONS, 'elevator', 128, (c) => {
  const frame = roundRect(22, 16, 84, 96, 10);
  c.glow(frame, P.cyan.glow, 12, 0.4);
  c.fill(frame, vg(P.steel, 16, 112));
  c.fill(roundRect(28, 22, 72, 84, 6), { lin: [0, 22, 0, 106], stops: [[0, '#1d3550'], [1, '#0a141f']] });
  c.fill(capsule(64, 24, 64, 104, 3), '#3d5b78', 0.8);
  const up = poly([[46, 44], [56, 32], [66, 44]]);
  const dn = poly([[62, 84], [72, 96], [82, 84]]);
  c.glowU(union(up, dn), P.amber.glow, 9, 0.6);
  c.fill(up, P.cyan.hi);
  c.fill(dn, P.amber.hi);
});

add(ICONS, 'car', 128, (c) => {
  const body = poly([[14, 88], [18, 68], [40, 66], [54, 44], [88, 44], [104, 68], [116, 72], [116, 88]]);
  c.glow(body, P.amber.glow, 12, 0.5);
  c.fill(body, vg(P.amber, 44, 90));
  c.fill(poly([[58, 62], [66, 50], [82, 50], [90, 62]]), '#0d1c2b', 0.9);
  for (const x of [40, 96]) {
    c.fill(circle(x, 92, 15), '#101c28');
    c.fill(circle(x, 92, 8), P.steel.hi, 0.85);
  }
});

add(ICONS, 'sofa', 128, (c) => {
  const back = roundRect(20, 34, 88, 34, 12);
  const seat = roundRect(14, 62, 100, 32, 12);
  const arms = union(roundRect(10, 54, 18, 40, 9), roundRect(100, 54, 18, 40, 9));
  const legs = union(roundRect(24, 92, 10, 14, 4), roundRect(94, 92, 10, 14, 4));
  c.glowU(union(back, seat, arms), P.violet.glow, 12, 0.45);
  c.fill(back, vg(P.violet, 34, 68));
  c.fill(seat, vg(P.violet, 62, 94));
  c.fillU(arms, vg(P.violet, 54, 94));
  c.fillU(legs, vg(P.steel, 92, 106));
  c.fill(capsule(64, 66, 64, 90, 3), '#00000055');
});

/* press = piano keys with a downward strike arrow */
add(ICONS, 'press', 128, (c) => {
  c.fill(roundRect(12, 66, 104, 56, 6), '#0b141f');
  for (const [x, depressed] of [[16, false], [50, true], [84, false]]) {
    const h = depressed ? 44 : 50;
    const y = 118 - h;
    const k = roundRect(x, y, 28, h, 4);
    if (depressed) {
      c.glow(k, P.amber.glow, 13, 0.8);
      c.fill(k, { lin: [0, y, 0, y + h], stops: [[0, '#fff3d6'], [0.5, '#ffc65e'], [1, '#e08a10']] });
    } else {
      c.fill(k, { lin: [0, y, 0, y + h], stops: [[0, '#ffffff'], [0.55, '#e8f0f8'], [1, '#a9bccd']] });
    }
  }
  c.fill(roundRect(38, 66, 16, 28, 3), '#060c14');
  c.fill(roundRect(74, 66, 16, 28, 3), '#060c14');
  const arrow = union(capsule(64, 10, 64, 40, 12), poly([[46, 34], [82, 34], [64, 62]]));
  c.glowU(arrow, P.amber.glow, 12, 0.65);
  c.fillU(arrow, vg(P.amber, 10, 62));
});

add(ICONS, 'escalator', 128, (c) => {
  const steps = [];
  for (let i = 0; i < 5; i++) {
    steps.push(...roundRect(18 + i * 18, 96 - i * 16, 26, 12, 3));
  }
  const rail = capsule(18, 92, 106, 20, 8);
  c.glowU(union(steps, rail), P.cyan.glow, 12, 0.45);
  c.fillU(steps, vg(P.steel, 20, 108));
  c.fill(rail, vg(P.cyan, 20, 96), 0.9);
  const up = poly([[92, 12], [108, 34], [76, 34]]);
  c.glow(up, P.amber.glow, 9, 0.6);
  c.fill(up, vg(P.amber, 12, 34));
});

add(ICONS, 'drum', 128, (c) => {
  const bodyPoly = poly([[26, 44], [102, 44], [96, 96], [32, 96]]);
  c.glow(bodyPoly, P.red.glow, 12, 0.45);
  c.fill(bodyPoly, { lin: [26, 0, 102, 0], stops: [[0, '#a51733'], [0.4, '#ff8ea3'], [1, '#8e1029']] });
  c.fill(ellipse(64, 44, 38, 13), vg(P.steel, 31, 57));
  c.fill(ellipse(64, 44, 31, 9), '#f4f9ff');
  for (let i = 0; i < 4; i++) {
    const x0 = 30 + i * 18, x1 = 39 + i * 18;
    c.fill(capsule(x0, 52, x1, 90, 4), '#ffd8a0', 0.75);
    c.fill(capsule(x1, 52, x0 + 18, 90, 4), '#ffd8a0', 0.4);
  }
  c.fill(capsule(88, 12, 116, 42, 7), vg(P.amber, 12, 42));
  c.fill(capsule(16, 16, 44, 40, 7), vg(P.amber, 16, 40));
});

add(ICONS, 'swimmer', 128, (c) => {
  const body = capsule(44, 60, 92, 50, 17);
  const head = circle(32, 50, 15);
  const armPts = bez([[64, 48], [72, 18], [98, 14], [106, 34]], 18);
  const armS = strokePath(armPts, 12);
  const leg = strokePath([[90, 52], [108, 40], [120, 54]], 11);
  const swimmer = union(body, head, armS, leg);
  c.glowU(swimmer, P.amber.glow, 13, 0.55);
  c.fillU(swimmer, vg(P.amber, 14, 78));
  c.fill(circle(26, 46, 4.5), '#3a1e02', 0.9);
  for (let i = 0; i < 2; i++) {
    const y = 88 + i * 16;
    const wave = strokePath([[12, y], [34, y - 7], [56, y], [78, y - 7], [100, y], [118, y - 6]], 7);
    c.glowU(wave, P.cyan.glow, 8, 0.55);
    c.fillU(wave, vg(P.cyan, y - 8, y + 6), 0.95);
  }
});

add(ICONS, 'dog', 128, (c) => {
  const body = roundRect(30, 54, 62, 34, 16);
  const head = union(roundRect(84, 40, 34, 30, 12), poly([[110, 56], [124, 60], [110, 68]]));
  const ear = poly([[88, 42], [82, 20], [102, 34]]);
  const tail = strokePath([[32, 60], [18, 46], [24, 32]], 10);
  const legs = union(
    roundRect(36, 82, 12, 26, 6), roundRect(56, 82, 12, 26, 6),
    roundRect(76, 82, 12, 26, 6),
  );
  const all = union(body, head, ear, tail, legs);
  c.glowU(all, P.amber.glow, 12, 0.5);
  c.fillU(all, vg(P.amber, 20, 108));
  c.fill(circle(120, 60, 5), '#2b1704');
  c.fill(circle(100, 50, 4), '#2b1704');
});

/* racecar = side-view formula wedge (matches the plain `car` silhouette) */
add(ICONS, 'racecar', 128, (c) => {
  const body = poly([[8, 86], [26, 74], [50, 72], [58, 58], [86, 58], [92, 74], [116, 76], [120, 86]]);
  c.glowU(body, P.red.glow, 13, 0.5);
  c.fill(body, { lin: [0, 58, 0, 90], stops: [[0, '#ff9db0'], [0.45, '#e6294f'], [1, '#8d1330']] });
  c.fill(poly([[62, 70], [66, 60], [80, 60], [84, 70]]), '#0d1c2b', 0.92);
  c.fill(roundRect(96, 46, 30, 9, 3), vg(P.steel, 46, 55));
  c.fill(roundRect(108, 52, 7, 24, 3), vg(P.steel, 52, 76));
  c.fill(roundRect(4, 80, 26, 8, 3), vg(P.steel, 80, 88));
  for (const x of [38, 100]) {
    c.fill(circle(x, 88, 18), '#0d1723');
    c.fill(circle(x, 88, 9), { rad: [x - 3, 85, 10], stops: [[0, '#e9f2fb'], [1, '#6a7f95']] });
  }
  c.fill(capsule(30, 66, 46, 66, 4), P.amber.hi, 0.7);
});

/* ---------------- run ---------------- */
let count = 0;
for (const { dir, name, size, fn } of OUT) {
  const c = make(size, fn);
  c.save(path.join(dir, name + '.png').replace(/\\/g, '/'));
  count++;
  process.stdout.write(`  ${name}.png (${size}px)\n`);
}
console.log(`\nGenerated ${count} PNG icons.`);
