/**
 * gen_icons.mjs — bakes every icon PNG used by Physics Riddle Challenge.
 *
 *   node tools/gen_icons.mjs
 *
 * Output: assets/images/ui/emoji/*.png
 *
 * The game ships with these PNGs already generated. This script exists so the
 * icon set can be regenerated or retuned without any image editor and without
 * a single emoji glyph ever entering the UI.
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
  amber:  { hi: '#ffeec2', lo: '#c2660a', glow: '#ffb020' },
  cyan:   { hi: '#d8f9ff', lo: '#0b7fa4', glow: '#38e0ff' },
  green:  { hi: '#d2ffee', lo: '#0a8f61', glow: '#3ce6a0' },
  red:    { hi: '#ffd0da', lo: '#b21739', glow: '#ff4d6d' },
  steel:  { hi: '#eef4fb', lo: '#5a6e84', glow: '#9fb6cc' },
  violet: { hi: '#ece0ff', lo: '#5c34ba', glow: '#a678ff' },
  slate:  { hi: '#2a3b53', lo: '#0a1220', glow: '#1a2c44' },
  mute:   { hi: '#f0f5fb', lo: '#68809b', glow: '#b3c5d8' },
};

/** vertical gradient across a band */
const vg = (c, y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, c.hi], [0.45, c.glow], [1, c.lo]] });
/** simple two-stop vertical gradient */
const vg2 = (a, b, y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, a], [1, b]] });
/** lit-from-within radial */
const rg = (c, cx, cy, r) => ({ rad: [cx, cy, r], stops: [[0, c.hi], [0.42, c.glow], [1, c.lo]] });

const OUT = [];
const add = (name, size, fn) => OUT.push({ name, size, fn });

/** Elliptical annulus (outer forward, inner reversed => nonzero-winding hole). */
function ellRing(cx, cy, rx, ry, t, seg = 72) {
  const o = ellipse(cx, cy, rx, ry, seg)[0];
  const i = ellipse(cx, cy, rx - t, ry - t, seg)[0].slice().reverse();
  return [o, i];
}

/** Dark recessed plate behind badge icons. */
function discPlate(c, s, pal, rFrac = 0.44) {
  const R = s * rFrac, cx = s / 2, cy = s / 2;
  c.glow(circle(cx, cy, R * 1.02), pal.glow, s * 0.13, 0.40);
  c.fill(circle(cx, cy, R), vg2(pal.glow, pal.lo, cy - R, cy + R));
  c.fill(circle(cx, cy, R * 0.86), { rad: [cx, cy - R * 0.35, R], stops: [[0, '#22344c'], [1, '#060c15']] });
}

/* A diagonal "disabled" slash used by the muted toggle icons. */
function slash(c) {
  const sh = capsule(30, 98, 98, 30, 15);
  c.glowU(sh, P.red.glow, 12, 0.6);
  c.fillU(sh, vg(P.red, 28, 100));
  c.fillU(capsule(32, 96, 96, 32, 7), '#ffe3e9', 0.55);
}

/* =========================================================================
   NAVIGATION
   ========================================================================= */

add('play', 128, (c) => {
  const tri = poly([[44, 28], [104, 64], [44, 100]]);
  c.glow(tri, P.amber.glow, 18, 0.75);
  c.fill(tri, rg(P.amber, 58, 52, 62));
  c.fill(poly([[50, 40], [86, 62], [50, 58]]), '#fff6e0', 0.35);
});

add('next', 128, (c) => {
  const sh = union(
    strokePath([[42, 32], [72, 64], [42, 96]], 16),
    strokePath([[74, 32], [104, 64], [74, 96]], 16)
  );
  c.glowU(sh, P.amber.glow, 14, 0.65);
  c.fillU(sh, vg(P.amber, 30, 98));
});

add('back', 128, (c) => {
  const sh = union(
    strokePath([[78, 30], [46, 64], [78, 98]], 16),
    capsule(48, 64, 100, 64, 15)
  );
  c.glowU(sh, P.steel.glow, 12, 0.45);
  c.fillU(sh, vg(P.steel, 28, 100));
});

add('home', 128, (c) => {
  /* the lab dome the player returns to, not a generic house */
  const half = (rx, ry) => ellipse(64, 90, rx, ry, 72)[0].filter((p) => p[1] <= 90);
  const dome = [half(46, 52).concat([[18, 90]])];
  c.glow(dome, P.cyan.glow, 16, 0.55);
  c.fill(dome, { rad: [50, 52, 60], stops: [[0, '#d8f9ff'], [0.4, '#3ec9ec'], [1, '#0a5f7d']] });
  c.fill([half(46, 52).concat([[18, 90]])], { lin: [0, 38, 0, 90], stops: [[0, '#ffffff'], [1, '#ffffff00']] }, 0.18);
  /* meridian ribs */
  [-30, -15, 0, 15, 30].forEach((k) => {
    c.fill([half(Math.abs(k) < 1 ? 1.6 : Math.abs(k) * 1.02, 52 * (1 - Math.abs(k) / 90))
      .concat([[64 - Math.abs(k), 90]])], '#0a5f7d', k === 0 ? 0.0 : 0.16);
  });
  c.fill(capsule(64, 34, 64, 20, 4), '#cfe6f2');
  c.fill(circle(64, 16, 8), rg(P.amber, 61, 13, 9));
  /* arched hatch */
  c.fill([ellipse(64, 90, 15, 22, 48)[0].filter((p) => p[1] <= 90).concat([[49, 90]])],
    vg2('#0d1a29', '#050b13', 68, 90));
  c.fill(roundRect(12, 86, 104, 16, 8), vg2('#e4edf7', '#4d6178', 86, 102));
  c.fill(roundRect(16, 89, 96, 5, 2), '#ffffff', 0.35);
});

add('close', 128, (c) => {
  const sh = union(capsule(40, 40, 88, 88, 13), capsule(88, 40, 40, 88, 13));
  c.glowU(sh, P.steel.glow, 10, 0.42);
  c.fillU(sh, vg(P.steel, 38, 90));
});

add('replay', 128, (c) => {
  const arc = ring(64, 66, 40, 27, -2.5, 2.0);
  c.glow(arc, P.cyan.glow, 14, 0.6);
  c.fill(arc, { lin: [24, 24, 104, 104], stops: [[0, P.cyan.hi], [0.5, P.cyan.glow], [1, '#0a6c8c']] });
  const head = poly([[24, 12], [62, 26], [26, 50]]);
  c.glow(head, P.cyan.glow, 12, 0.55);
  c.fill(head, vg(P.cyan, 12, 50));
});

/* =========================================================================
   ANSWER FEEDBACK
   ========================================================================= */

add('check', 128, (c) => {
  const sh = strokePath([[26, 68], [52, 94], [102, 32]], 18);
  c.glowU(sh, P.green.glow, 16, 0.72);
  c.fillU(sh, vg(P.green, 30, 96));
  c.fillU(strokePath([[28, 66], [52, 88], [100, 36]], 6), '#f0fff9', 0.4);
});

add('cross', 128, (c) => {
  const sh = union(capsule(36, 36, 92, 92, 17), capsule(92, 36, 36, 92, 17));
  c.glowU(sh, P.red.glow, 16, 0.72);
  c.fillU(sh, vg(P.red, 34, 94));
});

/* =========================================================================
   AUDIO TOGGLES
   ========================================================================= */

function noteBody(c, pal) {
  const stem = capsule(78, 22, 78, 82, 9);
  const head = ellipse(60, 84, 22, 17, 48);
  const flag = [bez([[78, 22], [98, 26], [106, 38], [104, 54]])
    .concat(bez([[104, 54], [104, 36], [94, 32], [78, 34]]).reverse())];
  const sh = union(stem, head, flag);
  c.glowU(sh, pal.glow, 14, 0.55);
  c.fillU(sh, vg(pal, 20, 100));
  c.fillU(ellipse(55, 79, 9, 6, 32), '#ffffff', 0.3);
}

add('music-on', 128, (c) => {
  noteBody(c, P.cyan);
  const waves = [ring(14, 60, 26, 20, -1.0, 1.0), ring(14, 60, 40, 34, -1.05, 1.05)];
  waves.forEach((w, i) => {
    c.glow(w, P.cyan.glow, 10, 0.45 - i * 0.1);
    c.fill(w, P.cyan.glow, 0.85 - i * 0.25);
  });
});

add('music-off', 128, (c) => {
  noteBody(c, P.mute);
  slash(c);
});

function speakerBody(c, pal) {
  const box = roundRect(18, 48, 26, 32, 5);
  const cone = poly([[42, 52], [76, 22], [76, 106], [42, 76]]);
  const sh = union(box, cone);
  c.glowU(sh, pal.glow, 13, 0.5);
  c.fillU(sh, vg(pal, 22, 106));
  c.fillU(poly([[46, 54], [70, 34], [70, 60], [46, 66]]), '#ffffff', 0.22);
}

add('sfx-on', 128, (c) => {
  speakerBody(c, P.amber);
  [0, 1, 2].forEach((i) => {
    const r = 20 + i * 14;
    const w = ring(80, 64, r, r - 6, -1.05, 1.05);
    c.glow(w, P.amber.glow, 9, 0.4 - i * 0.09);
    c.fill(w, P.amber.glow, 0.9 - i * 0.22);
  });
});

add('sfx-off', 128, (c) => {
  speakerBody(c, P.mute);
  slash(c);
});

/* =========================================================================
   PANELS / MENUS
   ========================================================================= */

add('settings', 128, (c) => {
  /* a calibration dial, not a generic gear */
  discPlate(c, 128, P.steel, 0.45);
  const bez1 = ring(64, 64, 48, 42, -Math.PI * 0.92, Math.PI * -0.08);
  c.glow(bez1, P.amber.glow, 12, 0.5);
  c.fill(bez1, vg(P.amber, 18, 64));
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (-0.92 + (0.84 * i) / 8);
    const x0 = 64 + Math.cos(a) * 38, y0 = 64 + Math.sin(a) * 38;
    const x1 = 64 + Math.cos(a) * 30, y1 = 64 + Math.sin(a) * 30;
    c.fill(capsule(x0, y0, x1, y1, i % 4 === 0 ? 5 : 3), i % 4 === 0 ? P.amber.hi : P.steel.glow, 0.9);
  }
  const needle = poly([[64, 22], [70, 66], [58, 66]]);
  c.glow(needle, P.cyan.glow, 12, 0.6);
  c.fill(tf(needle, { r: 0.55, ox: 64, oy: 66 }), vg(P.cyan, 22, 70));
  c.fill(circle(64, 66, 12), rg(P.steel, 60, 61, 14));
  c.fill(circle(64, 66, 5), '#0a1220');
});

add('briefing', 128, (c) => {
  /* mission card: header bar + rule lines + a chevron cue */
  const card = roundRect(20, 16, 88, 96, 10);
  c.glow(card, P.amber.glow, 14, 0.35);
  c.fill(card, vg2('#e9f0f8', '#93a7bc', 16, 112));
  c.fill(roundRect(25, 21, 78, 86, 7), vg2('#fdfaf2', '#d9dfe8', 21, 107));
  c.fill(roundRect(25, 21, 78, 22, 7), vg(P.amber, 21, 43));
  c.fill(rect(25, 38, 78, 5), '#b9700a', 0.6);
  [54, 68, 82, 96].forEach((y, i) => {
    c.fill(roundRect(34, y, i === 3 ? 34 : 60, 6, 3), i % 2 ? '#8fa2b6' : '#5d7186');
  });
  const chev = strokePath([[78, 74], [92, 86], [78, 98]], 9);
  c.glowU(chev, P.amber.glow, 9, 0.6);
  c.fillU(chev, vg(P.amber, 72, 100));
});

add('datapad', 128, (c) => {
  /* reference slate with a velocity plot on it */
  const slate = roundRect(14, 24, 100, 80, 10);
  c.glow(slate, P.cyan.glow, 14, 0.4);
  c.fill(slate, vg2('#4a5f79', '#131f30', 24, 104));
  c.fill(roundRect(20, 30, 88, 68, 7), vg2('#0b1a2a', '#061019', 30, 98));
  for (let i = 1; i < 4; i++) {
    c.fill(rect(20, 30 + i * 17, 88, 1.6), P.cyan.glow, 0.18);
  }
  const line = strokePath([[28, 88], [48, 74], [66, 78], [86, 46], [100, 40]], 6);
  c.glowU(line, P.cyan.glow, 12, 0.75);
  c.fillU(line, { lin: [28, 0, 100, 0], stops: [[0, P.cyan.hi], [1, '#7ef0ff']] });
  [[48, 74], [86, 46]].forEach((p) => {
    c.fill(circle(p[0], p[1], 6), rg(P.cyan, p[0] - 2, p[1] - 2, 7));
  });
  c.fill(roundRect(52, 106, 24, 6, 3), vg2('#8ea3ba', '#3d4f66', 106, 112));
});

add('lock', 128, (c) => {
  const shackle = ring(64, 52, 26, 17, Math.PI, Math.PI * 2);
  c.fill(shackle, vg2('#cdd9e6', '#5d7186', 26, 56));
  c.fill(rect(38, 52, 9, 16), vg2('#b9c6d5', '#54687d', 52, 68));
  c.fill(rect(81, 52, 9, 16), vg2('#b9c6d5', '#54687d', 52, 68));
  const body = roundRect(28, 62, 72, 50, 11);
  c.glow(body, P.steel.glow, 11, 0.35);
  c.fill(body, vg2('#dbe5f0', '#4c6076', 62, 112));
  c.fill(roundRect(33, 67, 62, 40, 8), vg2('#93a6bb', '#2b3a4c', 67, 107));
  c.fill(circle(64, 84, 9), '#0d1a28');
  c.fill(poly([[60, 84], [68, 84], [66, 100], [62, 100]]), '#0d1a28');
});

/* =========================================================================
   PROGRESS / REWARD
   ========================================================================= */

add('star-on', 128, (c) => {
  const st = star(64, 66, 5, 50, 21);
  c.glow(st, P.amber.glow, 20, 0.85);
  c.fill(st, rg(P.amber, 58, 54, 56));
  c.fill(star(64, 66, 5, 26, 11), '#fffdf3', 0.55);
});

add('star-off', 128, (c) => {
  const st = star(64, 66, 5, 50, 21);
  c.fill(st, vg2('#25344a', '#101b2a', 18, 112));
  c.stroke([star(64, 66, 5, 46, 19)[0]], '#4a5f79', 5, 0.9, true);
});

add('trophy', 128, (c) => {
  const bowl = [bez([[36, 20], [36, 66], [50, 86], [64, 86]])
    .concat(bez([[64, 86], [78, 86], [92, 66], [92, 20]]))
    .concat([[36, 20]])];
  c.glow(bowl, P.amber.glow, 20, 0.7);
  c.fill(ring(30, 34, 18, 11, Math.PI * 0.35, Math.PI * 1.75), vg(P.amber, 20, 52));
  c.fill(ring(98, 34, 18, 11, Math.PI * 1.25, Math.PI * 2.65), vg(P.amber, 20, 52));
  c.fill(bowl, { rad: [56, 32, 54], stops: [[0, '#fff6dc'], [0.45, P.amber.glow], [1, '#9c4f06']] });
  c.fill([bez([[46, 26], [46, 56], [54, 70], [60, 74]])
    .concat(bez([[60, 74], [52, 66], [56, 40], [58, 26]])).concat([[46, 26]])], '#fffaea', 0.35);
  c.fill(roundRect(56, 84, 16, 18, 3), vg2('#e0a233', '#8a4d05', 84, 102));
  c.fill(roundRect(42, 100, 44, 10, 4), vg(P.amber, 100, 110));
  c.fill(roundRect(36, 108, 56, 12, 5), vg2('#f3d08a', '#7c4304', 108, 120));
});

add('medal', 128, (c) => {
  c.fill(poly([[42, 8], [62, 8], [50, 56], [30, 52]]), vg2('#ff6b8a', '#a3123a', 8, 56));
  c.fill(poly([[66, 8], [86, 8], [98, 52], [78, 56]]), vg2('#68d3ff', '#0b6d94', 8, 56));
  const disc = circle(64, 80, 36);
  c.glow(disc, P.amber.glow, 18, 0.7);
  c.fill(disc, rg(P.amber, 56, 70, 42));
  c.fill(circle(64, 80, 28), vg2('#b8760d', '#f7d68f', 52, 108), 0.85);
  c.fill(circle(64, 80, 25), rg(P.amber, 58, 72, 28));
  c.fill(star(64, 80, 5, 18, 8), '#fffbee', 0.9);
});

add('bolt', 128, (c) => {
  const b = poly([[74, 10], [34, 70], [58, 70], [48, 118], [96, 54], [70, 54]]);
  c.glow(b, P.amber.glow, 18, 0.8);
  c.fill(b, { lin: [40, 10, 90, 118], stops: [[0, '#fff8e2'], [0.4, P.amber.glow], [1, '#b35c05']] });
});

add('spark', 128, (c) => {
  c.glow(circle(64, 64, 22), P.amber.glow, 22, 0.8);
  const s4 = star(64, 64, 4, 56, 12);
  c.fill(s4, rg(P.amber, 64, 64, 56));
  c.fill(star(64, 64, 4, 26, 6), '#fffdf5', 0.85);
});

add('beacon', 128, (c) => {
  c.fill(poly([[30, 118], [98, 118], [82, 92], [46, 92]]), vg2('#8ea3ba', '#2c3d52', 92, 118));
  c.fill(roundRect(52, 82, 24, 12, 4), vg2('#c3d2e2', '#5b6f86', 82, 94));
  c.glow(circle(64, 52, 30), P.amber.glow, 26, 0.9);
  c.fill(circle(64, 52, 28), rg(P.amber, 58, 44, 32));
  c.fill(circle(58, 44, 10), '#fffdf2', 0.55);
  [[-1, 0], [1, 0], [0, -1]].forEach(([dx, dy]) => {
    c.fill(capsule(64 + dx * 36, 52 + dy * 36, 64 + dx * 50, 52 + dy * 50, 7), P.amber.glow, 0.7);
  });
});

/* =========================================================================
   PHYSICS / THEME ICONS
   ========================================================================= */

add('speedometer', 128, (c) => {
  discPlate(c, 128, P.slate, 0.46);
  const arc = ring(64, 72, 44, 36, Math.PI * 1.06, Math.PI * 1.94);
  c.glow(arc, P.amber.glow, 14, 0.6);
  c.fill(arc, { lin: [20, 0, 108, 0], stops: [[0, P.green.glow], [0.55, P.amber.glow], [1, P.red.glow]] });
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * (1.06 + (0.88 * i) / 6);
    c.fill(capsule(64 + Math.cos(a) * 33, 72 + Math.sin(a) * 33,
      64 + Math.cos(a) * 25, 72 + Math.sin(a) * 25, 3.5), '#cfe0f0', 0.85);
  }
  const nd = poly([[64, 30], [69, 74], [59, 74]]);
  c.glow(nd, P.cyan.glow, 12, 0.65);
  c.fill(tf(nd, { r: 0.62, ox: 64, oy: 74 }), vg(P.cyan, 28, 76));
  c.fill(circle(64, 74, 11), rg(P.steel, 60, 70, 13));
});

add('stopwatch', 128, (c) => {
  c.fill(roundRect(54, 6, 20, 14, 4), vg2('#d5e1ee', '#5b6f86', 6, 20));
  c.fill(roundRect(44, 14, 40, 10, 5), vg2('#e4ecf6', '#66798f', 14, 24));
  const bezel = circle(64, 74, 46);
  c.glow(bezel, P.steel.glow, 14, 0.42);
  c.fill(bezel, vg2('#e2eaf4', '#465a70', 28, 120));
  c.fill(circle(64, 74, 39), vg2('#0e1c2c', '#050b13', 35, 113));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.fill(capsule(64 + Math.cos(a) * 34, 74 + Math.sin(a) * 34,
      64 + Math.cos(a) * 28, 74 + Math.sin(a) * 28, i % 3 === 0 ? 4 : 2.4),
      i % 3 === 0 ? P.amber.hi : '#8ea3ba', 0.9);
  }
  const h1 = capsule(64, 74, 64, 44, 5);
  const h2 = capsule(64, 74, 88, 84, 4);
  c.glowU(union(h1, h2), P.amber.glow, 10, 0.55);
  c.fillU(union(h1, h2), vg(P.amber, 44, 88));
  c.fill(circle(64, 74, 7), rg(P.steel, 61, 71, 8));
});

add('vector', 128, (c) => {
  /* arrow with a tail dot: a directed (vector) quantity */
  const shaft = capsule(20, 96, 88, 34, 13);
  const head = poly([[112, 20], [100, 62], [70, 32]]);
  const sh = union(shaft, head);
  c.glowU(sh, P.cyan.glow, 16, 0.75);
  c.fillU(sh, { lin: [20, 96, 112, 20], stops: [[0, '#0a6c8c'], [0.55, P.cyan.glow], [1, P.cyan.hi]] });
  c.fill(circle(20, 96, 12), rg(P.cyan, 17, 93, 13));
  c.fill(circle(16, 92, 4), '#ffffff', 0.6);
});

add('scalar', 128, (c) => {
  /* a magnitude orb over a measuring bar: size but no direction */
  c.glow(circle(64, 54, 34), P.violet.glow, 24, 0.85);
  c.fill(circle(64, 54, 33), rg(P.violet, 55, 44, 38));
  c.fill(circle(54, 43, 11), '#ffffff', 0.4);
  c.fill(roundRect(14, 98, 100, 18, 6), vg2('#96a9c0', '#33445a', 98, 116));
  c.fill(roundRect(17, 101, 94, 12, 4), vg2('#0d1a29', '#050b13', 101, 113));
  for (let i = 0; i <= 6; i++) {
    c.fill(rect(22 + i * 15, 101, 3, i % 2 ? 6 : 12), i % 2 ? '#7c8fa6' : P.violet.glow, 0.95);
  }
});

add('track', 128, (c) => {
  const outer = ellRing(64, 64, 56, 38, 5);
  c.glow(outer, P.green.glow, 14, 0.5);
  c.fill(outer, vg2(P.green.hi, P.green.lo, 26, 102));
  c.fill(ellRing(64, 64, 50, 32, 16), vg2('#c8623a', '#7a2f12', 32, 96));
  c.fill(ellRing(64, 64, 42, 24, 2), '#ffe6d5', 0.55);
  c.fill(ellipse(64, 64, 33, 15, 48), vg2('#2f7d4f', '#14472c', 49, 79));
  c.fill(rect(62, 26, 4, 14), '#ffffff', 0.9);
  c.fill(circle(64, 33, 7), rg(P.amber, 62, 31, 8));
});

add('flag', 128, (c) => {
  c.fill(capsule(30, 16, 30, 116, 8), vg2('#dbe6f2', '#4a5d73', 16, 116));
  const cloth = [bez([[36, 20], [64, 12], [92, 28], [114, 18]])
    .concat([[114, 66]])
    .concat(bez([[114, 66], [92, 76], [64, 60], [36, 68]]).slice().reverse())
    .concat([[36, 20]])];
  c.glow(cloth, P.steel.glow, 12, 0.4);
  c.fill(cloth, vg2('#f2f6fb', '#b9c7d8', 12, 76));
  /* chequered overlay clipped by re-filling squares inside the cloth box */
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 4; k++) {
      if ((r + k) % 2) { continue; }
      c.fill(rect(38 + k * 19, 22 + r * 15, 19, 15), '#101c2c', 0.88);
    }
  }
  c.fill(cloth, P.cyan.glow, 0.10);
  c.fill(circle(30, 14, 9), rg(P.amber, 27, 11, 10));
});

add('target', 128, (c) => {
  c.glow(circle(64, 64, 48), P.red.glow, 16, 0.55);
  c.fill(circle(64, 64, 48), vg2('#eef4fb', '#7b8fa6', 16, 112));
  c.fill(circle(64, 64, 38), vg(P.red, 26, 102));
  c.fill(circle(64, 64, 27), vg2('#f2f7fc', '#8fa2b8', 37, 91));
  c.fill(circle(64, 64, 16), vg(P.red, 48, 80));
  c.fill(circle(64, 64, 7), rg(P.amber, 62, 62, 8));
});

add('runner', 128, (c) => {
  [[8, 34, 40], [4, 56, 52], [10, 78, 44]].forEach(([x, y, w]) => {
    c.fill(capsule(x, y, x + w, y, 6), P.cyan.glow, 0.35);
  });
  const limbs = union(
    capsule(62, 46, 46, 66, 10),   /* back arm */
    capsule(62, 46, 86, 34, 10),   /* front arm */
    capsule(64, 64, 54, 98, 12),   /* back leg */
    capsule(64, 64, 88, 84, 12),   /* front leg */
    capsule(88, 84, 100, 100, 10),
    capsule(66, 34, 64, 66, 15)    /* torso */
  );
  c.glowU(limbs, P.amber.glow, 14, 0.5);
  c.fillU(limbs, { lin: [40, 20, 100, 110], stops: [[0, P.amber.hi], [0.5, P.amber.glow], [1, '#a95405']] });
  c.fill(circle(72, 22, 15), rg(P.amber, 68, 18, 17));
  c.fill(circle(67, 17, 5), '#fffaf0', 0.6);
});

/* =========================================================================
   render
   ========================================================================= */
let n = 0;
for (const item of OUT) {
  const c = new Cvs(item.size, item.size);
  item.fn(c, item.size);
  c.save(path.join(EMOJI, item.name + '.png'));
  n++;
}
console.log('wrote ' + n + ' icons -> ' + EMOJI);
