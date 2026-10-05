// Stick-figure animation engine: forward kinematics over keyframes designed in content-src/animations.py.

export type Vec = [number, number];
export interface Pose {
  t: number;
  hip: Vec;
  torso: number;
  head: number;
  bend: number;
  armN: [number, number];
  armF: [number, number];
  legN: [number, number, number];
  legF: [number, number, number];
}
export interface Animation { duration: number; alternate?: boolean; surface?: 'floor' | 'water' | 'board'; frames: Pose[] }

const L = { T: 50, U: 28, F: 26, TH: 42, SH: 40, FOOT: 13, NECK: 16, HEAD: 11 };
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number, len: number): Vec => [Math.cos(rad(d)) * len, Math.sin(rad(d)) * len];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;

function lerpAngle(a: number, b: number, k: number) {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return a + d * k;
}

function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const A = (x: number, y: number) => lerpAngle(x, y, k);
  return {
    t: 0,
    hip: [a.hip[0] + (b.hip[0] - a.hip[0]) * k, a.hip[1] + (b.hip[1] - a.hip[1]) * k],
    torso: A(a.torso, b.torso),
    head: A(a.head, b.head),
    bend: a.bend + (b.bend - a.bend) * k,
    armN: [A(a.armN[0], b.armN[0]), A(a.armN[1], b.armN[1])],
    armF: [A(a.armF[0], b.armF[0]), A(a.armF[1], b.armF[1])],
    legN: [A(a.legN[0], b.legN[0]), A(a.legN[1], b.legN[1]), A(a.legN[2], b.legN[2])],
    legF: [A(a.legF[0], b.legF[0]), A(a.legF[1], b.legF[1]), A(a.legF[2], b.legF[2])],
  };
}

/** Pose at phase t ∈ [0, 1). */
export function poseAt(anim: Animation, t: number): Pose {
  const f = anim.frames;
  const x = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < f.length - 2 && f[i + 1].t <= x) i += 1;
  const a = f[i];
  const b = f[i + 1];
  const span = b.t - a.t || 1;
  return lerpPose(a, b, ease(Math.min(1, Math.max(0, (x - a.t) / span))));
}

export interface Figure {
  spine: string;
  head: Vec;
  near: { arm: Vec[]; leg: Vec[] };
  far: { arm: Vec[]; leg: Vec[] };
}

/** Joint positions (y up) of a pose; `farArm` lets the far arm run on its own phase. */
export function figure(p: Pose, farArm?: [number, number]): Figure {
  const hip = p.hip;
  const sh = add(hip, dir(p.torso, L.T));
  const mid: Vec = [(hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2];
  const ctrl = add(mid, dir(p.torso + 90, p.bend * 2));
  const arm = (a: [number, number]) => {
    const e = add(sh, dir(a[0], L.U));
    return [sh, e, add(e, dir(a[1], L.F))];
  };
  const leg = (l: [number, number, number]) => {
    const k = add(hip, dir(l[0], L.TH));
    const an = add(k, dir(l[1], L.SH));
    return [hip, k, an, add(an, dir(l[2], L.FOOT))];
  };
  return {
    spine: `M${hip[0]},${-hip[1]} Q${ctrl[0]},${-ctrl[1]} ${sh[0]},${-sh[1]}`,
    head: add(sh, dir(p.head, L.NECK)),
    near: { arm: arm(p.armN), leg: leg(p.legN) },
    far: { arm: arm(farArm || p.armF), leg: leg(p.legF) },
  };
}

/** Bounding box (svg coordinates) covering every keyframe, plus the ground. */
export function viewBox(anim: Animation, pad = 24) {
  let minX = Infinity; let maxX = -Infinity; let minY = 0; let maxY = -Infinity;
  for (let i = 0; i <= 40; i += 1) {
    const fig = figure(poseAt(anim, i / 40));
    const pts = [...fig.near.arm, ...fig.near.leg, ...fig.far.arm, ...fig.far.leg, fig.head];
    for (const [x, y] of pts) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y + (pts.indexOf(fig.head) >= 0 ? L.HEAD : 0));
    }
    maxY = Math.max(maxY, fig.head[1] + L.HEAD);
  }
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const side = Math.max(w, h * 1.2);
  const cx = (minX + maxX) / 2;
  return { x: cx - side / 2, y: -(maxY + pad), w: side, h: h, ground: 0, headR: L.HEAD };
}

export const polyline = (pts: Vec[]) => pts.map(([x, y]) => `${x},${-y}`).join(' ');

// ---------------------------------------------------------------------------------------------------------
// Line-art body (black outline, white fill): every body part is a union of circles and tapered quads.
// Each group is drawn twice: a dark pass with a thick stroke, then a white fill on top, so overlapping
// pieces merge into one clean silhouette; details (hems, hair, ear) go last.

export type Prim = { c: Vec; r: number } | { q: Vec[] };
export interface Group { far?: boolean; prims: Prim[]; details?: { d: string; fill?: boolean }[] }

const svg = (p: Vec): Vec => [p[0], -p[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const len = (v: Vec) => Math.hypot(v[0], v[1]) || 1;
const lerp = (a: Vec, b: Vec, k: number): Vec => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

/** Tapered capsule from a (half-width ra) to b (half-width rb), in y-up coordinates. */
function capsule(a: Vec, b: Vec, ra: number, rb: number): Prim[] {
  const d = sub(b, a);
  const l = len(d);
  const n: Vec = [-d[1] / l, d[0] / l];
  return [
    { c: svg(a), r: ra },
    { c: svg(b), r: rb },
    { q: [add(a, [n[0] * ra, n[1] * ra]), add(b, [n[0] * rb, n[1] * rb]), add(b, [-n[0] * rb, -n[1] * rb]), add(a, [-n[0] * ra, -n[1] * ra])].map(svg) },
  ];
}

/** Garment piece (shorts leg, sleeve): rounded at the joint, cut straight at the hem. */
function band(a: Vec, b: Vec, ra: number, rb: number): Prim[] {
  const caps = capsule(a, b, ra, rb);
  return [caps[0], caps[2]];
}

/** Hem line across a capsule at point p (perpendicular to a→b), half-width r. */
function hem(a: Vec, b: Vec, p: Vec, r: number) {
  const d = sub(b, a);
  const l = len(d);
  const n: Vec = [(-d[1] / l) * r, (d[0] / l) * r];
  const s1 = svg(add(p, n));
  const s2 = svg(sub(p, n));
  return { d: `M${s1[0]},${s1[1]} L${s2[0]},${s2[1]}` };
}

/** Short crease line along a garment piece (the cloth folds on shorts). */
function fold(a: Vec, b: Vec) {
  const p1 = svg(lerp(a, b, 0.45));
  const p2 = svg(lerp(a, b, 0.9));
  const d = sub(b, a);
  const l = len(d);
  const o: Vec = [(-d[1] / l) * 2.5, (d[0] / l) * 2.5];
  return `M${p1[0] + o[0]},${p1[1] - o[1]} L${p2[0] + o[0] * 1.6},${p2[1] - o[1] * 1.6}`;
}

const W = { thigh: [8.6, 6.4], shin: [6.2, 4], upper: [5, 4.1], fore: [4.1, 3.2], hand: 3.9, waist: 9.6, chest: 12, neck: 4.2, head: 10 };

function legGroups(pts: Vec[], far: boolean): Group[] {
  const [hip, knee, ankle, toe] = pts;
  const shortsEnd = lerp(hip, knee, 0.5);
  const footDir = sub(toe, ankle);
  const heel = sub(ankle, [footDir[0] * 0.25, footDir[1] * 0.25]);
  return [
    { far, prims: [...capsule(hip, knee, W.thigh[0], W.thigh[1]), ...capsule(knee, ankle, W.shin[0], W.shin[1])] },
    // shorts over the upper thigh
    { far, prims: band(hip, shortsEnd, W.thigh[0] + 1.8, W.thigh[0] + 1.2), details: [{ d: fold(hip, shortsEnd) }] },
    // shoe
    { far, prims: capsule(heel, toe, 4.6, 3.6), details: [hem(heel, toe, lerp(heel, toe, 0.45), 2.6)] },
  ];
}

function armGroups(pts: Vec[], far: boolean): Group[] {
  const [sh, el, wr] = pts;
  const fd = sub(wr, el);
  const hand = add(wr, [(fd[0] / len(fd)) * 3, (fd[1] / len(fd)) * 3]);
  const sleeveEnd = lerp(sh, el, 0.48);
  return [
    { far, prims: [...capsule(sh, el, W.upper[0], W.upper[1]), ...capsule(el, wr, W.fore[0], W.fore[1]), { c: svg(hand), r: W.hand }] },
    { far, prims: band(sh, sleeveEnd, W.upper[0] + 2.4, W.upper[0] + 1.8) },
  ];
}

/** Outlined body for a pose; the far arm can run on its own phase (alternating strokes). */
export function body(p: Pose, farArm?: [number, number]): Group[] {
  const f = figure(p, farArm);
  const hip = p.hip;
  const sh = add(hip, dir(p.torso, L.T));
  const mid: Vec = [(hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2];
  const ctrl = add(mid, dir(p.torso + 90, p.bend * 2));
  const spine = (t: number): Vec => [
    (1 - t) ** 2 * hip[0] + 2 * (1 - t) * t * ctrl[0] + t * t * sh[0],
    (1 - t) ** 2 * hip[1] + 2 * (1 - t) * t * ctrl[1] + t * t * sh[1],
  ];
  const width = (t: number) => (t < 0.75 ? W.waist + (W.chest - W.waist) * (t / 0.75) : W.chest - (t - 0.75) * 8);
  const torso: Prim[] = [];
  const N = 8;
  for (let i = 0; i < N; i += 1) torso.push(...capsule(spine(i / N), spine((i + 1) / N), width(i / N), width((i + 1) / N)));
  const head = f.head;
  const neckBase = lerp(sh, head, 0.15);
  // hair on the back/top of the head: the face looks 90° clockwise from the neck direction
  const face = p.head - 90;
  const hr = W.head + 1.2;
  const h1 = svg(add(head, dir(face + 62, hr)));
  const h2 = svg(add(head, dir(face + 232, hr)));
  const hairEdge = svg(add(head, dir(face + 147, W.head * 0.15)));
  const ear = svg(add(head, dir(face + 180, 1.5)));
  const nose = svg(add(head, dir(face - 8, W.head + 2.2)));
  const noseA = svg(add(head, dir(face + 10, W.head - 0.3)));
  const noseB = svg(add(head, dir(face - 25, W.head - 0.3)));

  return [
    ...legGroups(f.far.leg, true),
    ...armGroups(f.far.arm, true),
    {
      prims: [...torso, ...capsule(neckBase, head, W.neck, W.neck)],
      // waistband of the shorts
      details: [hem(spine(0), spine(0.2), spine(0.18), width(0.18) - 0.3)],
    },
    {
      prims: [{ c: svg(head), r: W.head }, { q: [noseA, nose, noseB, svg(head)] }],
      details: [
        { d: `M${h1[0]},${h1[1]} A${hr},${hr} 0 0 1 ${h2[0]},${h2[1]} Q${hairEdge[0]},${hairEdge[1]} ${h1[0]},${h1[1]} Z`, fill: true },
        { d: `M${ear[0] - 2},${ear[1]} a2.2,2.6 0 1 0 4,0` },
      ],
    },
    ...legGroups(f.near.leg, false),
    ...armGroups(f.near.arm, false),
  ];
}

export const primPath = (pr: Prim) => ('c' in pr
  ? `M${pr.c[0] - pr.r},${pr.c[1]} a${pr.r},${pr.r} 0 1 0 ${pr.r * 2},0 a${pr.r},${pr.r} 0 1 0 ${-pr.r * 2},0 Z`
  : `M${pr.q.map((v) => `${v[0]},${v[1]}`).join(' L')} Z`);
