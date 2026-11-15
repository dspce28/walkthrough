import { itemFootprint } from '../plan/compile';
import type { HousePlan, Item, ItemType } from '../plan/types';

/**
 * Feature walls, placed by rule: find the wall an item backs onto (bed headboard, temple) and clad a span of it.
 * The result is described in "wall space": the wall runs along `axis` at plan coordinate `plane`, the room lies on
 * the `inward` side, and the clad span is a1..a2 along the wall. Renderers work in local (u along, v up, depth in).
 */
export interface FeatureWall {
  level: number;
  kind: 'bedPanel' | 'templeArch';
  axis: 'x' | 'y';   // direction the wall runs
  plane: number;     // plan coordinate of the wall's room-side face
  inward: 1 | -1;    // the room is on the +/− side of the plane
  a1: number; a2: number;
  item: Item;
}

const RULES: Partial<Record<ItemType, { kind: FeatureWall['kind']; extra: number }>> = {
  bed: { kind: 'bedPanel', extra: 1.7 },      // wide enough to sit behind both bedside tables
  temple: { kind: 'templeArch', extra: 0.6 },
};

export function featureWalls(plan: HousePlan): FeatureWall[] {
  const out: FeatureWall[] = [];
  for (const it of plan.items) {
    const rule = RULES[it.type];
    if (!rule) continue;
    const [fx1, fy1, fx2, fy2] = itemFootprint(it);
    const cx = (fx1 + fx2) / 2, cy = (fy1 + fy2) / 2;
    const room = plan.rooms.find((r) => r.level === it.level && cx >= r.rect[0] && cx <= r.rect[2] && cy >= r.rect[1] && cy <= r.rect[3]);
    if (!room) continue;
    const [rx1, ry1, rx2, ry2] = room.rect;
    // back edge (local depth 0) faces: rot0 -> y min, rot1 -> x max, rot2 -> y max, rot3 -> x min
    const side = [
      { axis: 'x' as const, plane: ry1, inward: 1 as const, back: fy1, c: cx, lo: rx1, hi: rx2 },
      { axis: 'y' as const, plane: rx2, inward: -1 as const, back: fx2, c: cy, lo: ry1, hi: ry2 },
      { axis: 'x' as const, plane: ry2, inward: -1 as const, back: fy2, c: cx, lo: rx1, hi: rx2 },
      { axis: 'y' as const, plane: rx1, inward: 1 as const, back: fx1, c: cy, lo: ry1, hi: ry2 },
    ][it.rot];
    if (Math.abs(side.back - side.plane) > 0.8) continue; // not against a wall
    const half = it.w / 2 + rule.extra;
    out.push({
      level: it.level, kind: rule.kind, axis: side.axis, plane: side.plane, inward: side.inward,
      a1: Math.max(side.lo, side.c - half), a2: Math.min(side.hi, side.c + half), item: it,
    });
  }
  return out;
}
