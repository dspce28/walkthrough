import { itemFootprint } from '../plan/compile';
import type { HousePlan, Item, Rect } from '../plan/types';
import { roomType, type RoomType } from './kit';

/**
 * Room-level decor placed by rule: a tall plant in free corners of the chosen room types. A corner is free when
 * it clears every furniture footprint, every door opening plus its swing, and the stairs.
 */
const IGNORE = new Set<Item['type']>(['rug', 'art', 'chandelier', 'pendant', 'clock', 'wallTv', 'pergola']);
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const grow = (r: Rect, g: number): Rect => [r[0] - g, r[1] - g, r[2] + g, r[3] + g];

export function cornerPlants(plan: HousePlan, rooms: RoomType[], size = 1.6, maxPerRoom = 2): Item[] {
  const out: Item[] = [];
  for (const room of plan.rooms) {
    if (!rooms.includes(roomType(room))) continue;
    const L = room.level, [x1, y1, x2, y2] = room.rect;
    if (x2 - x1 < 6 || y2 - y1 < 6) continue;
    const blocked: Rect[] = [
      ...plan.items.filter((it) => it.level === L && !IGNORE.has(it.type)).map((it) => grow(itemFootprint(it), 0.25)),
      ...[...plan.items, ...out].filter((it) => it.level === L && it.type === 'plant').map((it) => grow(itemFootprint(it), 1.5)),
      // doors: opening plus its swing on both sides
      ...plan.openings.filter((o) => o.level === L && o.type !== 'window').map((o): Rect => {
        const sw = (o.width ?? 2.6) + 0.4;
        return o.axis === 'h' ? [o.a1, o.t1 - sw, o.a2, o.t2 + sw] : [o.t1 - sw, o.a1, o.t2 + sw, o.a2];
      }),
      ...plan.flights.filter((f) => f.level === L).map((f): Rect => (f.axis === 'x'
        ? [Math.min(f.from, f.to), f.c1, Math.max(f.from, f.to), f.c2] : [f.c1, Math.min(f.from, f.to), f.c2, Math.max(f.from, f.to)])),
    ];
    let n = 0;
    for (const [cx, cy] of [[x1, y1], [x2, y1], [x1, y2], [x2, y2]]) {
      if (n >= maxPerRoom) break;
      const px = cx === x1 ? x1 + 0.15 : x2 - 0.15 - size, py = cy === y1 ? y1 + 0.15 : y2 - 0.15 - size;
      const r: Rect = [px, py, px + size, py + size];
      if (blocked.some((b) => overlaps(r, b))) continue;
      const it: Item = { level: L, type: 'plant', x: px, y: py, rot: 0, w: size, d: size, o: { decor: true } };
      out.push(it); blocked.push(grow(r, 1.5)); n++;
    }
  }
  return out;
}
