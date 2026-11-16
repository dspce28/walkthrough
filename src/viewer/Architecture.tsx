import { useMemo } from 'react';
import * as THREE from 'three';
import type { CompiledPlan } from '../plan/compile';
import { curtainGeometry, mergedBoxes, mergedFloors } from './geometry';
import { getMat } from './materials';

interface Batch { level: number; mat: string; geo: THREE.BufferGeometry; cast: boolean }
interface Curtain { level: number; pos: [number, number, number]; yaw: number; geo: THREE.BufferGeometry }

/** All structure (walls, slabs, stairs, doors, windows, floors) merged into one mesh per level and material. */
/**
 * `cutAt`: in dollhouse view the top visible floor's walls are cut at this absolute height so you can see into
 * the rooms. Cut levels use cloned materials with a clipping plane; other levels keep the shared ones.
 */
export function Architecture({ compiled, visibleLevels, visibleFrom = 0, cutAt, glazingOnly = false }: { compiled: CompiledPlan; visibleLevels: number; visibleFrom?: number; cutAt: number | null; glazingOnly?: boolean }) {
  const shown = (l: number) => l >= visibleFrom && l <= visibleLevels;
  const { batches, curtains } = useMemo(() => build(compiled), [compiled]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  plane.constant = cutAt ?? 1e6;
  const clipped = useMemo(() => {
    const m = new Map<string, THREE.Material>();
    return (key: string) => {
      if (!m.has(key)) { const c = getMat(key).clone(); c.clippingPlanes = [plane]; c.clipShadows = true; m.set(key, c); }
      return m.get(key)!;
    };
  }, [plane]);
  const topLevel = Math.min(visibleLevels, compiled.plan.levels.length - 1);
  const matFor = (level: number, key: string) => (cutAt != null && level === topLevel ? clipped(key) : getMat(key));
  return (
    <group>
      {batches.filter((b) => !glazingOnly || b.mat === 'glass').map((b) => (
        <mesh key={`${b.level}:${b.mat}`} name={`arch|L${b.level}|${b.mat}`} geometry={b.geo} material={matFor(b.level, b.mat)} visible={shown(b.level)}
          castShadow={b.cast} receiveShadow renderOrder={b.mat === 'glass' ? 5 : 0} />
      ))}
      {curtains.map((c, i) => (
        <mesh key={i} name={`arch|L${c.level}|curtain${i}`} geometry={c.geo} material={matFor(c.level, 'curtain')} position={c.pos} rotation-y={c.yaw} visible={shown(c.level)} castShadow receiveShadow />
      ))}
    </group>
  );
}

function build(c: CompiledPlan) {
  const groups = new Map<string, { level: number; mat: string; boxes: Parameters<typeof mergedBoxes>[0] }>();
  const curtains: Curtain[] = [];
  for (const b of c.boxes) {
    if (b.cat === 'curtain') {
      const alongX = b.x2 - b.x1 > b.y2 - b.y1;
      const len = alongX ? b.x2 - b.x1 : b.y2 - b.y1, depth = alongX ? b.y2 - b.y1 : b.x2 - b.x1;
      curtains.push({ level: b.level, pos: [(b.x1 + b.x2) / 2, (b.z0 + b.z1) / 2, (b.y1 + b.y2) / 2], yaw: alongX ? 0 : Math.PI / 2, geo: curtainGeometry(len, b.z1 - b.z0, depth) });
      continue;
    }
    // slab bottoms read as the ceiling of the room below
    const mat = b.mat;
    const k = `${b.level}:${mat}`;
    if (!groups.has(k)) groups.set(k, { level: b.level, mat, boxes: [] });
    groups.get(k)!.boxes.push({ x1: b.x1, x2: b.x2, y1: b.z0, y2: b.z1, z1: b.y1, z2: b.y2 });
  }
  const batches: Batch[] = [];
  for (const g of groups.values()) batches.push({ level: g.level, mat: g.mat, geo: mergedBoxes(g.boxes), cast: g.mat !== 'glass' });

  const FH = c.plan.floorHeight;
  const floors = new Map<string, { level: number; finish: string; rects: Parameters<typeof mergedFloors>[0] }>();
  c.plan.floors.forEach((f, i) => {
    const k = `${f.level}:${f.finish}`;
    if (!floors.has(k)) floors.set(k, { level: f.level, finish: f.finish, rects: [] });
    const [x1, y1, x2, y2] = f.rect;
    floors.get(k)!.rects.push({ x1, x2, z1: y1, z2: y2, y: f.level * FH + 0.01 + i * 0.0015 });
  });
  for (const f of floors.values()) batches.push({ level: f.level, mat: `floor:${f.finish}`, geo: mergedFloors(f.rects), cast: false });
  return { batches, curtains };
}
