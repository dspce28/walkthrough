import { useMemo } from 'react';
import * as THREE from 'three';
import type { HousePlan } from '../plan/types';
import { activeStyle } from '../style';
import { falseCeilings, type GlowWash } from '../style/falseCeiling';
import { mergedBoxes } from './geometry';
import { getMat } from './materials';

/**
 * Renders the rule-generated false ceilings. Bands and LED strips are named `arch|L<n>|…` so the offline bake
 * includes them (the emissive strips become real light sources in Cycles). The light washes are a real-time
 * stand-in for that bounce light and are left out of the bake.
 */
export function FalseCeilings({ plan, visibleLevels }: { plan: HousePlan; visibleLevels: number }) {
  const { batches, washes } = useMemo(() => build(plan), [plan]);
  const washMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: gradientTexture(), color: '#ffc77a', transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }), []);
  return (
    <group>
      {batches.map((b) => (
        <mesh key={`${b.level}:${b.mat}`} name={`arch|L${b.level}|${b.mat === 'glow' ? 'coveGlow' : 'ceilingBand'}`} geometry={b.geo}
          material={getMat(b.mat)} visible={b.level <= visibleLevels} castShadow={b.mat !== 'glow'} receiveShadow />
      ))}
      {washes.map((w) => (
        <mesh key={w.level} name={`fx|L${w.level}|coveWash`} geometry={w.geo} material={washMat} visible={w.level <= visibleLevels} renderOrder={6} />
      ))}
    </group>
  );
}

function build(plan: HousePlan) {
  const FH = plan.floorHeight;
  const { boxes, washes } = falseCeilings(plan, activeStyle().ceiling);
  const groups = new Map<string, { level: number; mat: string; boxes: Parameters<typeof mergedBoxes>[0] }>();
  for (const b of boxes) {
    const k = `${b.level}:${b.mat}`;
    if (!groups.has(k)) groups.set(k, { level: b.level, mat: b.mat, boxes: [] });
    const [x1, y1, x2, y2] = b.rect;
    groups.get(k)!.boxes.push({ x1, x2, z1: y1, z2: y2, y1: b.level * FH + b.z0, y2: b.level * FH + b.z1 });
  }
  const batches = [...groups.values()].map((g) => ({ level: g.level, mat: g.mat, geo: mergedBoxes(g.boxes) }));
  const byLevel = new Map<number, GlowWash[]>();
  for (const w of washes) { if (!byLevel.has(w.level)) byLevel.set(w.level, []); byLevel.get(w.level)!.push(w); }
  return { batches, washes: [...byLevel.entries()].map(([level, ws]) => ({ level, geo: washGeometry(ws, level * FH, plan.ceilingHeight) })) };
}

/** Quads whose u coordinate runs from the light source (u = 0, bright) to where the wash fades out (u = 1). */
function washGeometry(ws: GlowWash[], base: number, CH: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const quad = (p: number[][], u: number[]) => {
    const i0 = pos.length / 3;
    p.forEach((q, i) => { pos.push(q[0], q[1], q[2]); uv.push(u[i], 0.5); });
    idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  };
  for (const w of ws) {
    const [x1, y1, x2, y2] = w.rect;
    if (w.face === 'down') {
      const y = base + w.z;
      const p = [[x1, y, y1], [x2, y, y1], [x2, y, y2], [x1, y, y2]];
      const u = w.fadeTo === 'y+' ? [0, 0, 1, 1] : w.fadeTo === 'y-' ? [1, 1, 0, 0] : w.fadeTo === 'x+' ? [0, 1, 1, 0] : [1, 0, 0, 1];
      quad(p, u);
    } else {
      // vertical face of the band's inner edge, lit from the cove shelf upwards
      const z0 = base + w.z, z1 = base + CH, off = 0.012;
      if (w.fadeTo[0] === 'y') {
        const y = y1 + (w.fadeTo === 'y+' ? off : -off);
        quad([[x1, z0, y], [x2, z0, y], [x2, z1, y], [x1, z1, y]], [0, 0, 1, 1]);
      } else {
        const x = x1 + (w.fadeTo === 'x+' ? off : -off);
        quad([[x, z0, y1], [x, z0, y2], [x, z1, y2], [x, z1, y1]], [0, 0, 1, 1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

let grad: THREE.Texture | null = null;
function gradientTexture() {
  if (grad) return grad;
  const c = document.createElement('canvas'); c.width = 256; c.height = 1;
  const g = c.getContext('2d')!, img = g.createImageData(256, 1);
  for (let i = 0; i < 256; i++) {
    const u = i / 255, v = Math.exp(-3.2 * u) * (1 - u) * 255;
    img.data.set([v, v, v, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  grad = new THREE.CanvasTexture(c);
  grad.colorSpace = THREE.SRGBColorSpace;
  return grad;
}
