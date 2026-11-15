import * as THREE from 'three';
import type { CompiledPlan } from '../plan/compile';

export const EYE = 5.3; // eye height above floor, ft
const RADIUS = 0.45;

/** Mutable navigation state shared between the UI and the render loop (no React re-renders per frame). */
export interface NavState {
  mode: 'doll' | 'walk';
  px: number; py: number; pz: number; cz: number; heading: number; pitch: number;
  keys: Record<string, boolean>;
  tour: TourPlayer | null;
  onTourEnd?: () => void;
  /** set by the UI to snap the dollhouse camera back to its default framing */
  resetDoll?: boolean;
}

export function createNav(): NavState {
  return { mode: 'doll', px: 10, py: -12, pz: 0, cz: 0, heading: 0, pitch: 0, keys: {}, tour: null, resetDoll: true };
}

export function makeWalker(c: CompiledPlan) {
  const S = c.surfaces, C = c.colliders;
  /** Highest walkable surface under (x,y) within step reach of z. */
  function ground(x: number, y: number, z: number): number | null {
    let best: number | null = null;
    for (const s of S) {
      if (x >= s.x1 && x <= s.x2 && y >= s.y1 && y <= s.y2 && s.z <= z + 0.8 && s.z >= z - 1.05) {
        if (best === null || s.z > best) best = s.z;
      }
    }
    return best;
  }
  function blocked(x: number, y: number, z: number) {
    for (const w of C) if (z < w.z1 - 0.3 && z + 5 > w.z0 && x > w.x1 - RADIUS && x < w.x2 + RADIUS && y > w.y1 - RADIUS && y < w.y2 + RADIUS) return true;
    return false;
  }
  function tryMove(n: NavState, dx: number, dy: number, free = false) {
    if (free) {
      const gz = ground(n.px + dx, n.py + dy, n.pz);
      n.px += dx; n.py += dy; if (gz !== null) n.pz = gz; return;
    }
    let gz = ground(n.px + dx, n.py, n.pz);
    if (gz !== null && !blocked(n.px + dx, n.py, gz)) { n.px += dx; n.pz = gz; }
    gz = ground(n.px, n.py + dy, n.pz);
    if (gz !== null && !blocked(n.px, n.py + dy, gz)) { n.py += dy; n.pz = gz; }
  }
  return { ground, blocked, tryMove };
}

/**
 * Cinematic guided tour: a centripetal Catmull-Rom spline through the plan's tour points, walked at a
 * constant speed with a look-ahead heading, so the camera glides rather than snapping between points.
 */
export class TourPlayer {
  curve: THREE.CatmullRomCurve3;
  length: number;
  s = 0;
  speed = 3.4; // ft / s
  done = false;
  constructor(points: [number, number][]) {
    this.curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, 0, y)), false, 'centripetal', 0.5);
    this.curve.arcLengthDivisions = 2000;
    this.length = this.curve.getLength();
  }
  get progress() { return this.s / this.length; }
  step(n: NavState, dt: number, walker: ReturnType<typeof makeWalker>) {
    if (this.done) return;
    // slow down in tight turns so the view does not whip around
    const u = Math.min(1, this.s / this.length);
    const tA = this.curve.getTangentAt(u), tB = this.curve.getTangentAt(Math.min(1, u + 2 / this.length));
    const turn = 1 - Math.max(-1, Math.min(1, tA.dot(tB)));
    this.s += dt * this.speed * (turn > 0.02 ? 0.45 : 1);
    if (this.s >= this.length) { this.s = this.length; this.done = true; }
    const p = this.curve.getPointAt(this.s / this.length);
    walker.tryMove(n, p.x - n.px, p.z - n.py, true);
    const ahead = this.curve.getPointAt(Math.min(1, (this.s + 3.2) / this.length));
    const dx = ahead.x - p.x, dy = ahead.z - p.z;
    if (dx * dx + dy * dy > 1e-4) {
      const target = Math.atan2(dx, dy);
      let dh = target - n.heading;
      while (dh > Math.PI) dh -= 2 * Math.PI;
      while (dh < -Math.PI) dh += 2 * Math.PI;
      n.heading += dh * Math.min(1, dt * 2.2);
    }
    n.pitch += (0.04 - n.pitch) * Math.min(1, dt * 2);
  }
}
