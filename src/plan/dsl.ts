import type { Axis, Finish, HousePlan, Item, ItemType, Opening, Rect } from './types';

/** Small helpers for writing a HousePlan by hand. They only append plain data. */
export function createPlanBuilder(base: Pick<HousePlan, 'id' | 'name' | 'floorHeight' | 'ceilingHeight' | 'levels' | 'extents' | 'street'>) {
  const plan: HousePlan = {
    ...base, slabs: [], walls: [], openings: [], railings: [], flights: [], landings: [], floors: [], rooms: [], items: [],
    stairArrows: [], dashed: [], viewpoints: [], tour: [],
  };
  const CH = base.ceilingHeight;
  const r = (x1: number, y1: number, x2: number, y2: number): Rect => [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];

  const api = {
    plan,
    slab(level: number, x1: number, y1: number, x2: number, y2: number, o: { z0?: number; z1?: number; ground?: boolean } = {}) {
      plan.slabs.push({ level, rect: r(x1, y1, x2, y2), ...o });
    },
    wall(level: number, x1: number, y1: number, x2: number, y2: number, z0 = 0, z1 = CH) {
      plan.walls.push({ level, rect: r(x1, y1, x2, y2), z0, z1, kind: z1 <= 6 ? 'parapet' : 'wall' });
    },
    lintel(level: number, x1: number, y1: number, x2: number, y2: number, z0: number, z1 = CH) {
      plan.walls.push({ level, rect: r(x1, y1, x2, y2), z0, z1, kind: 'lintel' });
    },
    door(level: number, axis: Axis, a1: number, a2: number, t1: number, t2: number, o: Partial<Opening> = {}) {
      plan.openings.push({ level, type: 'door', axis, a1, a2, t1, t2, ...o });
    },
    win(level: number, axis: Axis, a1: number, a2: number, t1: number, t2: number, o: Partial<Opening> = {}) {
      plan.openings.push({ level, type: 'window', axis, a1, a2, t1, t2, ...o });
    },
    slider(level: number, axis: Axis, a1: number, a2: number, t1: number, t2: number, o: Partial<Opening> = {}) {
      plan.openings.push({ level, type: 'slider', axis, a1, a2, t1, t2, ...o });
    },
    railing(level: number, axis: Axis, a1: number, a2: number, t: number, height?: number) {
      plan.railings.push({ level, axis, a1, a2, t, height });
    },
    flight(level: number, axis: 'x' | 'y', from: number, to: number, c1: number, c2: number, z0: number, risers: number, z1: number) {
      plan.flights.push({ level, axis, from, to, c1, c2, z0, z1, risers });
    },
    landing(level: number, x1: number, y1: number, x2: number, y2: number, z: number) {
      plan.landings.push({ level, rect: r(x1, y1, x2, y2), z });
    },
    floor(level: number, x1: number, y1: number, x2: number, y2: number, finish: Finish) {
      plan.floors.push({ level, rect: r(x1, y1, x2, y2), finish });
    },
    room(level: number, name: string, x1: number, y1: number, x2: number, y2: number, dim: string, lx?: number, ly?: number) {
      plan.rooms.push({ level, name, rect: r(x1, y1, x2, y2), dim, label: lx == null ? undefined : [lx, ly as number] });
    },
    item(level: number, type: ItemType, x: number, y: number, rot: Item['rot'], w: number, d: number, o?: Item['o'] & { label?: string; h?: number }) {
      const { label, h, ...rest } = o ?? {};
      plan.items.push({ level, type, x, y, rot, w, d, h: h as number | undefined, label: label as string | undefined, o: Object.keys(rest).length ? rest : undefined });
    },
    /** Item centred on cx,cy with a square footprint of size s. */
    itemC(level: number, type: ItemType, cx: number, cy: number, s: number, o?: Item['o'] & { label?: string; h?: number }) {
      api.item(level, type, cx - s / 2, cy - s / 2, 0, s, s, o);
    },
    /** Wall-hung frame. axis/t/side follow the wall: side=+1 faces +t. */
    art(level: number, axis: Axis, a: number, len: number, t: number, side: 1 | -1, z0: number, z1: number, art: string) {
      const dpt = 0.12;
      if (axis === 'v') api.item(level, 'art', side > 0 ? t : t - dpt, a, side > 0 ? 3 : 1, len, dpt, { z0, z1, art });
      else api.item(level, 'art', a, side > 0 ? t : t - dpt, side > 0 ? 0 : 2, len, dpt, { z0, z1, art });
    },
    planter(level: number, x1: number, y1: number, x2: number, y2: number) {
      const R = r(x1, y1, x2, y2);
      api.item(level, 'planter', R[0], R[1], 0, R[2] - R[0], R[3] - R[1]);
    },
  };
  return api;
}
