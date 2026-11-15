import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergedBoxes } from './geometry';
import { getMat } from './materials';

/* Local item space: X = along width (0..w), Z = depth (0..d, front faces +Z), Y = up. All feet. */

export const MODEL_URL = (id: string) => `${import.meta.env.BASE_URL}assets/models/${id}.glb`;
const M_TO_FT = 3.28084;

type MatArg = string | THREE.Material;
const mat = (m: MatArg) => (typeof m === 'string' ? getMat(m) : m);

/** Box from x1..x2, z1..z2 (local plan) and y0..y1 (height), textures in world feet. */
export function Bx({ a, y, m, cast = true }: { a: [number, number, number, number]; y: [number, number]; m: MatArg; cast?: boolean }) {
  const geo = useMemo(() => {
    const [x1, z1, x2, z2] = a;
    return mergedBoxes([{ x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: y[0], y2: y[1], z1: Math.min(z1, z2), z2: Math.max(z1, z2) }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.join(','), y.join(',')]);
  return <mesh geometry={geo} material={mat(m)} castShadow={cast} receiveShadow />;
}

/** Rounded box (upholstery, mattresses, cushions). */
export function Rb({ a, y, m, r = 0.15, cast = true }: { a: [number, number, number, number]; y: [number, number]; m: MatArg; r?: number; cast?: boolean }) {
  const [x1, z1, x2, z2] = a;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1), h = y[1] - y[0];
  const geo = useMemo(() => roundedBox(w, h, d, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), [w, h, d, r]);
  return <mesh geometry={geo} material={mat(m)} position={[(x1 + x2) / 2, (y[0] + y[1]) / 2, (z1 + z2) / 2]} castShadow={cast} receiveShadow />;
}

const rbCache = new Map<string, THREE.BufferGeometry>();
function roundedBox(w: number, h: number, d: number, r: number) {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join(':');
  let g = rbCache.get(k);
  if (!g) {
    // superellipse-ish rounding via a subdivided box pushed towards a rounded shape
    const seg = 6;
    g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
    const p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3(), inner = new THREE.Vector3();
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      inner.set(THREE.MathUtils.clamp(v.x, -hx, hx), THREE.MathUtils.clamp(v.y, -hy, hy), THREE.MathUtils.clamp(v.z, -hz, hz));
      const n = v.clone().sub(inner);
      if (n.lengthSq() > 0) { n.normalize().multiplyScalar(r); v.copy(inner).add(n); }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    rbCache.set(k, g);
  }
  return g;
}

export function Cyl({ c, r, y, m, seg = 24, r2 }: { c: [number, number]; r: number; y: [number, number]; m: MatArg; seg?: number; r2?: number }) {
  return (
    <mesh position={[c[0], (y[0] + y[1]) / 2, c[1]]} material={mat(m)} castShadow receiveShadow>
      <cylinderGeometry args={[r2 ?? r, r, y[1] - y[0], seg]} />
    </mesh>
  );
}

export function Sph({ c, y, r, m }: { c: [number, number]; y: number; r: number; m: MatArg }) {
  return (
    <mesh position={[c[0], y, c[1]]} material={mat(m)} castShadow>
      <sphereGeometry args={[r, 20, 14]} />
    </mesh>
  );
}

/** Lathe (bowls, basins, pots). Profile points are [radius, height]. */
export function Lathe({ c, y = 0, pts, m, scale = [1, 1, 1] }: { c: [number, number]; y?: number; pts: [number, number][]; m: MatArg; scale?: [number, number, number] }) {
  const geo = useMemo(() => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 40), [pts]);
  return <mesh geometry={geo} material={mat(m)} position={[c[0], y, c[1]]} scale={scale} castShadow receiveShadow />;
}

export type Fit = 'stretch' | 'contain' | 'height' | 'native';
export interface ModelProps {
  id: string;
  /** target box in local item space */
  w: number; d: number; h?: number;
  fit?: Fit;
  /** max ratio between horizontal and vertical scale when stretching */
  maxStretch?: number;
  /** extra yaw applied before fitting (for models whose front is not +Z) */
  yaw?: number;
  at?: [number, number, number];
  /** anchor the model's top (ceiling fixtures) instead of its base at `at`'s y */
  hang?: boolean;
  scale?: number;
}

/** Loads a GLB and fits it into a footprint. Real-world size is preserved unless told to stretch. */
export function Model({ id, w, d, h, fit = 'stretch', maxStretch = 1.35, yaw = 0, at, hang, scale = 1 }: ModelProps) {
  const { scene } = useGLTF(MODEL_URL(id));
  const obj = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
    return o;
  }, [scene]);
  const t = useMemo(() => {
    const bb = new THREE.Box3();
    // bounds of the real geometry with the yaw applied, in feet
    const tmp = obj.clone(true); tmp.rotation.y = yaw; tmp.scale.setScalar(M_TO_FT); tmp.updateMatrixWorld(true);
    bb.setFromObject(tmp, true);
    const size = bb.getSize(new THREE.Vector3());
    let sx = 1, sy = 1, sz = 1;
    if (fit === 'native') { sx = sy = sz = scale; }
    else if (fit === 'height') { sx = sy = sz = (h ?? size.y) / size.y; }
    else {
      const cx = w / size.x, cz = d / size.z, cy = h ? h / size.y : Infinity;
      const uni = Math.min(cx, cz, cy);
      if (fit === 'contain') { sx = sy = sz = uni; }
      else {
        sy = Math.min(cy, Math.min(cx, cz));
        sx = Math.min(cx, sy * maxStretch); sz = Math.min(cz, sy * maxStretch);
      }
    }
    const pos = at ?? [w / 2, 0, d / 2];
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    return {
      scale: [sx * M_TO_FT, sy * M_TO_FT, sz * M_TO_FT] as [number, number, number],
      pos: [pos[0] - cx * sx, pos[1] - (hang ? bb.max.y : bb.min.y) * sy, pos[2] - cz * sz] as [number, number, number],
    };
  }, [obj, yaw, fit, w, d, h, maxStretch, at, hang, scale]);
  return (
    <group position={t.pos} scale={t.scale}>
      <primitive object={obj} rotation-y={yaw} />
    </group>
  );
}
