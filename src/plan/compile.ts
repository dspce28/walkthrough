import type { Axis, HousePlan, Item, Opening, Rect } from './types';

/** Architectural material keys produced by the compiler. */
export type ArchMat =
  | 'wall' | 'slab' | 'slabGround' | 'ceiling' | 'stairCore' | 'tread' | 'frame' | 'door' | 'doorPanel' | 'brass'
  | 'glass' | 'railing' | 'curtain' | 'coping';

export type BoxCat = 'wall' | 'lintel' | 'sill' | 'frame' | 'door' | 'glass' | 'slab' | 'stair' | 'rail' | 'curtain';

/** Axis-aligned box in world feet. z is absolute (level * floorHeight + local z). */
export interface Box { level: number; x1: number; y1: number; x2: number; y2: number; z0: number; z1: number; mat: ArchMat; cat: BoxCat }
export interface Collider { x1: number; y1: number; x2: number; y2: number; z0: number; z1: number }
export interface Surface { x1: number; y1: number; x2: number; y2: number; z: number }
export interface DoorSymbol { level: number; axis: Axis; oa: number; ob: number; t1: number; t2: number; swing: 1 | -1; hinge: 'a1' | 'a2'; double: boolean; width: number; slider?: boolean }
export interface WindowSymbol { level: number; axis: Axis; oa: number; ob: number; t1: number; t2: number }

export interface CompiledPlan {
  plan: HousePlan;
  boxes: Box[];
  colliders: Collider[];
  surfaces: Surface[];
  doors: DoorSymbol[];
  windows: WindowSymbol[];
}

const mm = (a: number, b: number) => (a < b ? [a, b] : [b, a]);

export function compilePlan(plan: HousePlan): CompiledPlan {
  const FH = plan.floorHeight, CH = plan.ceilingHeight;
  const boxes: Box[] = [], colliders: Collider[] = [], surfaces: Surface[] = [], doors: DoorSymbol[] = [], windows: WindowSymbol[] = [];

  function B(level: number, x1: number, y1: number, x2: number, y2: number, z0: number, z1: number, mat: ArchMat, cat: BoxCat, col = false) {
    const X = mm(x1, x2), Y = mm(y1, y2);
    const b: Box = { level, x1: X[0], x2: X[1], y1: Y[0], y2: Y[1], z0: level * FH + z0, z1: level * FH + z1, mat, cat };
    boxes.push(b);
    if (col) colliders.push({ x1: b.x1, x2: b.x2, y1: b.y1, y2: b.y2, z0: b.z0, z1: b.z1 });
    return b;
  }
  /** Box addressed along a wall axis: a = along, t = across. */
  function AT(level: number, ax: Axis, a1: number, a2: number, t1: number, t2: number, z0: number, z1: number, mat: ArchMat, cat: BoxCat, col = false) {
    return ax === 'h' ? B(level, a1, t1, a2, t2, z0, z1, mat, cat, col) : B(level, t1, a1, t2, a2, z0, z1, mat, cat, col);
  }
  const surf = (x1: number, y1: number, x2: number, y2: number, z: number) => {
    const X = mm(x1, x2), Y = mm(y1, y2); surfaces.push({ x1: X[0], x2: X[1], y1: Y[0], y2: Y[1], z });
  };

  /* slabs: structure below each level's floor; their top is walkable */
  for (const s of plan.slabs) {
    const [x1, y1, x2, y2] = s.rect;
    B(s.level, x1, y1, x2, y2, s.z0 ?? -0.5, s.z1 ?? 0, s.ground ? 'slabGround' : 'slab', 'slab');
    surf(x1, y1, x2, y2, s.level * FH + (s.z1 ?? 0));
  }
  // street and front yard
  const g = plan.slabs.find((s) => s.ground);
  if (g) surf(-30, plan.street.yRoad - 27, 42, g.rect[1], 0);

  /* walls */
  for (const w of plan.walls) {
    const [x1, y1, x2, y2] = w.rect, z0 = w.z0 ?? 0, z1 = w.z1 ?? CH;
    if (w.kind === 'lintel') B(w.level, x1, y1, x2, y2, z0, z1, 'wall', 'lintel');
    else {
      B(w.level, x1, y1, x2, y2, z0, z1, 'wall', 'wall', z0 < 3);
      if (z1 < 6) B(w.level, x1 - 0.04, y1 - 0.04, x2 + 0.04, y2 + 0.04, z1, z1 + 0.12, 'coping', 'wall');
    }
  }

  /* openings */
  for (const o of plan.openings) {
    const L = o.level, ax = o.axis, { a1, a2, t1, t2 } = o;
    const wallAT = (aa: number, ab: number) => { if (ab - aa > 0.02) AT(L, ax, aa, ab, t1, t2, 0, CH, 'wall', 'wall', true); };
    if (o.type === 'door') doorBoxes(o);
    else if (o.type === 'window') windowBoxes(o);
    else {
      // pocket glass slider: open width a1..a2, glass panel half-parked
      const tm = (t1 + t2) / 2, w = a2 - a1;
      AT(L, ax, a1, a2, t1, t2, 7, CH, 'wall', 'lintel');
      AT(L, ax, a1 + w * 0.5, a2 + w * 0.5, tm - 0.05, tm + 0.05, 0.05, 7, 'glass', 'glass');
      AT(L, ax, a1 + w * 0.5, a1 + w * 0.5 + 0.12, tm - 0.08, tm + 0.08, 0.05, 7, 'frame', 'frame');
      AT(L, ax, a1, a2, tm - 0.08, tm + 0.08, 6.88, 7, 'frame', 'frame');
      doors.push({ level: L, axis: ax, oa: a1, ob: a2, t1, t2, swing: 1, hinge: 'a1', double: false, width: w, slider: true });
    }

    function doorBoxes(d: Opening) {
      const w = d.width ?? 2.6, off = d.offset ?? (a2 - a1 - w) / 2, oa = a1 + off, ob = oa + w, head = d.head ?? 7, f = 0.14, lt = 0.13;
      const sw = d.swing ?? 1, hg = d.hinge ?? 'a1';
      wallAT(a1, oa); wallAT(ob, a2);
      AT(L, ax, oa, ob, t1, t2, head, CH, 'wall', 'lintel');
      // architrave frame (slightly proud of the wall on both faces)
      AT(L, ax, oa - 0.12, oa + f, t1 - 0.05, t2 + 0.05, 0, head, 'frame', 'frame');
      AT(L, ax, ob - f, ob + 0.12, t1 - 0.05, t2 + 0.05, 0, head, 'frame', 'frame');
      AT(L, ax, oa - 0.12, ob + 0.12, t1 - 0.05, t2 + 0.05, head - f, head + 0.12, 'frame', 'frame');
      const leaf = (aa: number, len: number, flip: boolean) => {
        // open ~75 degrees is hard with AABBs; leaves are shown slightly ajar along the wall normal
        const ta = sw > 0 ? t2 : t1 - len;
        AT(L, ax, aa, aa + lt, ta, ta + len, 0.05, head - f, 'door', 'door');
        // raised panels on both faces of the leaf
        for (const [z0, z1] of [[0.6, 3.1], [3.6, head - f - 0.5]] as const) {
          AT(L, ax, aa - 0.02, aa + lt + 0.02, ta + 0.3, ta + len - 0.3, z0, z1, 'doorPanel', 'door');
        }
        const hEnd = flip ? ta + 0.25 : ta + len - 0.5;
        AT(L, ax, aa - 0.08, aa + lt + 0.08, hEnd, hEnd + 0.25, 3.2, 3.32, 'brass', 'door');
      };
      if (d.double) { leaf(oa + f, w / 2 - f, false); leaf(ob - f - lt, w / 2 - f, false); }
      else if (hg === 'a1') leaf(oa + f, w - 2 * f, false); else leaf(ob - f - lt, w - 2 * f, false);
      doors.push({ level: L, axis: ax, oa, ob, t1, t2, swing: sw, hinge: hg, double: !!d.double, width: w });
    }

    function windowBoxes(wn: Opening) {
      const oa = a1 + (wn.offset ?? 0), ob = wn.width ? oa + wn.width : a2, sill = wn.sill ?? 2.5, head = wn.head ?? 7.5, tm = (t1 + t2) / 2, f = 0.12;
      wallAT(a1, oa); wallAT(ob, a2);
      AT(L, ax, oa, ob, t1, t2, 0, sill, 'wall', 'sill', true);
      AT(L, ax, oa - 0.1, ob + 0.1, t1 - 0.12, t2 + 0.12, sill - 0.08, sill, 'coping', 'sill');
      AT(L, ax, oa, ob, t1, t2, head, CH, 'wall', 'lintel');
      AT(L, ax, oa, ob, tm - 0.025, tm + 0.025, sill, head, 'glass', 'glass');
      AT(L, ax, oa, ob, tm - 0.1, tm + 0.1, sill, sill + f, 'frame', 'frame');
      AT(L, ax, oa, ob, tm - 0.1, tm + 0.1, head - f, head, 'frame', 'frame');
      const n = Math.max(1, Math.round((ob - oa) / 2));
      for (let i = 0; i <= n; i++) { const a = oa + (ob - oa - f) * i / n; AT(L, ax, a, a + f, tm - 0.1, tm + 0.1, sill, head, 'frame', 'frame'); }
      if (wn.curtain) {
        const ti = wn.curtain > 0 ? t2 + 0.15 : t1 - 0.45;
        AT(L, ax, oa - 0.5, oa + 0.9, ti, ti + 0.3, 0.15, 8.3, 'curtain', 'curtain');
        AT(L, ax, ob - 0.9, ob + 0.5, ti, ti + 0.3, 0.15, 8.3, 'curtain', 'curtain');
        AT(L, ax, oa - 0.7, ob + 0.7, ti + 0.1, ti + 0.18, 8.35, 8.45, 'brass', 'frame');
      }
      windows.push({ level: L, axis: ax, oa, ob, t1, t2 });
    }
  }

  /* railings (balustrade with turned balusters) */
  for (const r of plan.railings) {
    const h = r.height ?? 3.4, t = r.t, L = r.level;
    AT(L, r.axis, r.a1, r.a2, t - 0.18, t + 0.18, h - 0.25, h, 'railing', 'rail');
    AT(L, r.axis, r.a1, r.a2, t - 0.15, t + 0.15, 0, 0.3, 'railing', 'rail');
    colliders.push(r.axis === 'h' ? { x1: r.a1, x2: r.a2, y1: t - 0.15, y2: t + 0.15, z0: L * FH, z1: L * FH + h } : { x1: t - 0.15, x2: t + 0.15, y1: r.a1, y2: r.a2, z0: L * FH, z1: L * FH + h });
  }

  /* stairs */
  for (const s of plan.flights) {
    const r = (s.z1 - s.z0) / s.risers, len = (s.to - s.from) / (s.risers - 1);
    for (let i = 1; i < s.risers; i++) {
      const a = s.from + (i - 1) * len, bb = s.from + i * len, z = s.z0 + i * r;
      const [x1, x2, y1, y2] = s.axis === 'x' ? [a, bb, s.c1, s.c2] : [s.c1, s.c2, a, bb];
      B(s.level, x1, y1, x2, y2, Math.max(0, z - r - 0.3), z - 0.06, 'stairCore', 'stair');
      // tread with a small nosing over the lower step
      const lo = Math.min(a, bb) - (len > 0 ? 0.08 : 0), hi = Math.max(a, bb) + (len < 0 ? 0.08 : 0);
      if (s.axis === 'x') B(s.level, lo, s.c1, hi, s.c2, z - 0.06, z, 'tread', 'stair');
      else B(s.level, s.c1, lo, s.c2, hi, z - 0.06, z, 'tread', 'stair');
      surf(x1, y1, x2, y2, s.level * FH + z);
    }
  }
  for (const l of plan.landings) {
    const [x1, y1, x2, y2] = l.rect;
    B(l.level, x1, y1, x2, y2, l.z - 0.45, l.z - 0.06, 'stairCore', 'stair');
    B(l.level, x1, y1, x2, y2, l.z - 0.06, l.z, 'tread', 'stair');
    surf(x1, y1, x2, y2, l.level * FH + l.z);
  }

  return { plan, boxes, colliders, surfaces, doors, windows };
}

/** World-space footprint of an item (after rotation). */
export function itemFootprint(it: Item): Rect {
  const bw = it.rot % 2 ? it.d : it.w, bd = it.rot % 2 ? it.w : it.d;
  return [it.x, it.y, it.x + bw, it.y + bd];
}

/** Position of the item's local origin (back-left corner) in plan coordinates, and its yaw for three.js. */
export function itemTransform(it: Item): { x: number; y: number; yaw: number } {
  const { x, y, w, d, rot } = it;
  const o = rot === 0 ? [x, y] : rot === 1 ? [x + d, y] : rot === 2 ? [x + w, y + d] : [x, y + w];
  return { x: o[0], y: o[1], yaw: -rot * Math.PI / 2 };
}
