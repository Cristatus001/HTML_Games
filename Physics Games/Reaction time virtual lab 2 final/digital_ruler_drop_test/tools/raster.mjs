/**
 * raster.mjs — tiny offline software rasterizer + PNG encoder.
 * No external dependencies (uses node:zlib only). Used by gen_icons.mjs to
 * bake the game's icon PNGs so the shipped game needs zero emoji glyphs.
 *
 * Everything is reduced to polygons; fills support solid colours plus linear
 * and radial gradients. Anti-aliasing is analytic in X and 4x supersampled in Y.
 */
import zlib from 'node:zlib';
import fs from 'node:fs';

const SS = 4; // subsample rows per pixel

/* ---------- colour helpers ---------- */
export function parseColor(c) {
  if (Array.isArray(c)) return c;
  let s = String(c).trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (s.length === 3) s = s.split('').map(ch => ch + ch).join('');
  if (s.length === 6) s += 'ff';
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
    parseInt(s.slice(6, 8), 16) / 255,
  ];
}
function lerpColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}
function sampleStops(stops, t) {
  if (t <= stops[0][0]) return stops[0].col;
  const last = stops[stops.length - 1];
  if (t >= last[0]) return last.col;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const u = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
      return lerpColor(a.col, b.col, u);
    }
  }
  return last.col;
}
function prepStops(stops) {
  return stops.map(s => { const o = [s[0]]; o.col = parseColor(s[1]); return o; });
}

/* ---------- fill resolution ---------- */
function makeFill(spec) {
  if (typeof spec === 'string' || Array.isArray(spec)) {
    const col = parseColor(spec);
    return () => col;
  }
  if (spec.lin) {
    const [x0, y0, x1, y1] = spec.lin;
    const st = prepStops(spec.stops);
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    return (x, y) => sampleStops(st, ((x - x0) * dx + (y - y0) * dy) / len2);
  }
  if (spec.rad) {
    const [cx, cy, r] = spec.rad;
    const st = prepStops(spec.stops);
    const sy = spec.ry ? r / spec.ry : 1;
    return (x, y) => {
      const ddx = x - cx, ddy = (y - cy) * sy;
      return sampleStops(st, Math.hypot(ddx, ddy) / (r || 1));
    };
  }
  throw new Error('unknown fill spec');
}

/* ---------- shapes (all return arrays of point-arrays) ---------- */
export function rect(x, y, w, h) {
  return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
}
export function roundRect(x, y, w, h, r, seg = 8) {
  r = Math.min(r, w / 2, h / 2);
  const p = [];
  const corner = (cx, cy, a0, a1) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (a1 - a0) * (i / seg);
      p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2, 0);
  corner(x + w - r, y + h - r, 0, Math.PI / 2);
  corner(x + r, y + h - r, Math.PI / 2, Math.PI);
  corner(x + r, y + r, Math.PI, Math.PI * 1.5);
  return [p];
}
export function ellipse(cx, cy, rx, ry, seg = 64) {
  const p = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return [p];
}
export function circle(cx, cy, r, seg = 64) { return ellipse(cx, cy, r, r, seg); }
export function poly(pts) { return [pts.slice()]; }

/** Annulus / ring (optionally a partial sweep). */
export function ring(cx, cy, rOuter, rInner, a0 = 0, a1 = Math.PI * 2, seg = 64) {
  const outer = [], inner = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg);
    outer.push([cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter]);
    inner.push([cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner]);
  }
  inner.reverse();
  return [outer.concat(inner)];
}

/** Thick line with round caps, as a single polygon. */
export function capsule(x0, y0, x1, y1, w, seg = 16) {
  const r = w / 2;
  const a = Math.atan2(y1 - y0, x1 - x0);
  const p = [];
  for (let i = 0; i <= seg; i++) {
    const t = a - Math.PI / 2 + (Math.PI * i) / seg;
    p.push([x1 + Math.cos(t) * r, y1 + Math.sin(t) * r]);
  }
  for (let i = 0; i <= seg; i++) {
    const t = a + Math.PI / 2 + (Math.PI * i) / seg;
    p.push([x0 + Math.cos(t) * r, y0 + Math.sin(t) * r]);
  }
  return [p];
}

/** Polyline stroked with round caps + joins. Returns many polygons. */
export function strokePath(pts, w, closed = false) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) out.push(...capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w));
  if (closed && n > 2) out.push(...capsule(pts[n - 1][0], pts[n - 1][1], pts[0][0], pts[0][1], w));
  for (let i = 0; i < n; i++) out.push(...circle(pts[i][0], pts[i][1], w / 2, 20));
  return out;
}

/** Regular polygon / star. */
export function star(cx, cy, points, rOuter, rInner, rot = -Math.PI / 2) {
  const p = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? rInner : rOuter;
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return [p];
}
export function ngon(cx, cy, n, r, rot = -Math.PI / 2) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return [p];
}

/** Flatten a cubic bezier chain: [p0, c1, c2, p1, c1, c2, p2, ...] */
export function bez(points, seg = 24) {
  const out = [points[0]];
  for (let i = 1; i + 2 < points.length; i += 3) {
    const p0 = out[out.length - 1], c1 = points[i], c2 = points[i + 1], p1 = points[i + 2];
    for (let s = 1; s <= seg; s++) {
      const t = s / seg, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
      ]);
    }
  }
  return out;
}

/* ---------- canvas ---------- */
export class Cvs {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.buf = new Float32Array(w * h * 4); // RGBA, alpha in 0..1
  }

  /** Rasterize polygons into a coverage Float32Array (nonzero winding). */
  coverage(polys, cov) {
    const { w, h } = this;
    if (!cov) cov = new Float32Array(w * h);
    const edges = [];
    let minY = Infinity, maxY = -Infinity;
    for (const p of polys) {
      const n = p.length;
      for (let i = 0; i < n; i++) {
        const a = p[i], b = p[(i + 1) % n];
        if (a[1] === b[1]) continue;
        edges.push([a[0], a[1], b[0], b[1]]);
        minY = Math.min(minY, a[1], b[1]);
        maxY = Math.max(maxY, a[1], b[1]);
      }
    }
    if (!edges.length) return cov;
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(h - 1, Math.ceil(maxY));
    const xs = [];
    for (let py = y0; py <= y1; py++) {
      for (let s = 0; s < SS; s++) {
        const sy = py + (s + 0.5) / SS;
        xs.length = 0;
        for (const e of edges) {
          const [ax, ay, bx, by] = e;
          if ((sy >= ay && sy < by) || (sy >= by && sy < ay)) {
            const t = (sy - ay) / (by - ay);
            xs.push([ax + (bx - ax) * t, by > ay ? 1 : -1]);
          }
        }
        if (xs.length < 2) continue;
        xs.sort((a, b) => a[0] - b[0]);
        let wind = 0;
        for (let i = 0; i < xs.length - 1; i++) {
          wind += xs[i][1];
          if (wind === 0) continue;
          let xa = xs[i][0], xb = xs[i + 1][0];
          if (xb <= 0 || xa >= w) continue;
          xa = Math.max(xa, 0); xb = Math.min(xb, w);
          if (xb <= xa) continue;
          const pa = Math.floor(xa), pb = Math.ceil(xb) - 1;
          const row = py * w;
          for (let px = pa; px <= pb; px++) {
            const ov = Math.min(px + 1, xb) - Math.max(px, xa);
            if (ov > 0) cov[row + px] += ov / SS;
          }
        }
      }
    }
    return cov;
  }

  /** Composite a coverage mask with a fill. */
  compositeCov(cov, fillSpec, alpha = 1) {
    const f = makeFill(fillSpec);
    const { w, h, buf } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let a = cov[i];
        if (a <= 0) continue;
        if (a > 1) a = 1;
        const col = f(x + 0.5, y + 0.5);
        a *= alpha * col[3];
        if (a <= 0) continue;
        const o = i * 4;
        const da = buf[o + 3];
        const na = a + da * (1 - a);
        if (na <= 0) continue;
        for (let k = 0; k < 3; k++) {
          buf[o + k] = (col[k] * a + buf[o + k] * da * (1 - a)) / na;
        }
        buf[o + 3] = na;
      }
    }
  }

  fill(polys, fillSpec, alpha = 1) {
    this.compositeCov(this.coverage(polys), fillSpec, alpha);
  }

  /** Union-fill: each polygon rasterized independently, coverage max-combined.
   *  Use when overlapping sub-shapes would punch holes under nonzero winding. */
  fillU(polys, fillSpec, alpha = 1) {
    this.compositeCov(this.covUnion(polys), fillSpec, alpha);
  }

  covUnion(polys) {
    const cov = new Float32Array(this.w * this.h);
    for (const p of polys) {
      const c2 = this.coverage([p]);
      for (let i = 0; i < cov.length; i++) {
        const v = Math.min(1, c2[i]);
        if (v > cov[i]) cov[i] = v;
      }
    }
    return cov;
  }

  /** Soft glow: blurred coverage of the given shape. */
  glow(polys, fillSpec, radius = 8, alpha = 0.8, passes = 3) {
    let cov = this.coverage(polys);
    cov = boxBlur(cov, this.w, this.h, radius, passes);
    let mx = 0;
    for (let i = 0; i < cov.length; i++) if (cov[i] > mx) mx = cov[i];
    if (mx > 0) for (let i = 0; i < cov.length; i++) cov[i] = Math.min(1, cov[i] / mx * 1.35);
    this.compositeCov(cov, fillSpec, alpha);
  }

  /** Glow driven by a union coverage mask (same semantics as fillU). */
  glowU(polys, fillSpec, radius = 8, alpha = 0.8, passes = 3) {
    let cov = boxBlur(this.covUnion(polys), this.w, this.h, radius, passes);
    let mx = 0;
    for (let i = 0; i < cov.length; i++) if (cov[i] > mx) mx = cov[i];
    if (mx > 0) for (let i = 0; i < cov.length; i++) cov[i] = Math.min(1, (cov[i] / mx) * 1.35);
    this.compositeCov(cov, fillSpec, alpha);
  }

  /** Stroke helper (union of round-capped segments). */
  stroke(polysPts, fillSpec, w, alpha = 1, closed = false) {
    const shapes = [];
    for (const pts of polysPts) shapes.push(...strokePath(pts, w, closed));
    this.compositeCov(this.covUnion(shapes), fillSpec, alpha);
  }

  toPNG() {
    const { w, h, buf } = this;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    let p = 0;
    for (let y = 0; y < h; y++) {
      raw[p++] = 0;
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const a = Math.max(0, Math.min(1, buf[o + 3]));
        raw[p++] = clamp255(buf[o]);
        raw[p++] = clamp255(buf[o + 1]);
        raw[p++] = clamp255(buf[o + 2]);
        raw[p++] = Math.round(a * 255);
      }
    }
    const idat = zlib.deflateSync(raw, { level: 9 });
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
    ]);
  }

  save(file) {
    const dir = file.substring(0, Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\')));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, this.toPNG());
  }
}

function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function boxBlur(src, w, h, radius, passes) {
  let a = src, b = new Float32Array(src.length);
  const r = Math.max(1, Math.round(radius / passes));
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[row + clampI(x, w)];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / (2 * r + 1);
        sum += a[row + clampI(x + r + 1, w)] - a[row + clampI(x - r, w)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[clampI(y, h) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / (2 * r + 1);
        sum += b[clampI(y + r + 1, h) * w + x] - b[clampI(y - r, h) * w + x];
      }
    }
  }
  return a;
}
function clampI(v, n) { return v < 0 ? 0 : v >= n ? n - 1 : v; }

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/* transform helpers */
export function tf(polys, { s = 1, r = 0, tx = 0, ty = 0, ox = 0, oy = 0, sx = null, sy = null } = {}) {
  const cs = Math.cos(r), sn = Math.sin(r);
  const kx = sx === null ? s : sx, ky = sy === null ? s : sy;
  return polys.map(p => p.map(([x, y]) => {
    let X = (x - ox) * kx, Y = (y - oy) * ky;
    const rx = X * cs - Y * sn, ry = X * sn + Y * cs;
    return [rx + ox + tx, ry + oy + ty];
  }));
}
export function union(...groups) { return groups.flat(); }
