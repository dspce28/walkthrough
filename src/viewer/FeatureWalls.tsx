import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import type { HousePlan } from '../plan/types';
import { featureWalls, type FeatureWall } from '../style/featureWalls';
import { getMat } from './materials';
import { Bx, Rb } from './parts';

/**
 * Renders rule-placed feature walls. Each wall gets a local frame: x = along the wall (0..span), y = up,
 * z = depth into the room. Groups are named `arch|L<n>|feature…` so the offline bake includes them.
 */
export function FeatureWalls({ plan, visibleLevels, visibleFrom = 0 }: { plan: HousePlan; visibleLevels: number; visibleFrom?: number }) {
  const walls = useMemo(() => featureWalls(plan), [plan]);
  return (
    <group>
      {walls.map((w, i) => (
        <WallFrame key={i} w={w} base={w.level * plan.floorHeight} name={`arch|L${w.level}|feature${i}`} visible={w.level >= visibleFrom && w.level <= visibleLevels}>
          {w.kind === 'bedPanel' ? <BedPanel span={w.a2 - w.a1} top={plan.ceilingHeight - 1.3} /> : <TempleArch w={w} />}
        </WallFrame>
      ))}
    </group>
  );
}

/** Positions/rotates a group so local +x runs along the wall and local +z points into the room. */
function WallFrame({ w, base, name, visible, children }: { w: FeatureWall; base: number; name: string; visible: boolean; children: ReactNode }) {
  let pos: [number, number, number], rotY: number;
  if (w.axis === 'x') { pos = w.inward > 0 ? [w.a1, base, w.plane] : [w.a2, base, w.plane]; rotY = w.inward > 0 ? 0 : Math.PI; }
  else { pos = w.inward > 0 ? [w.plane, base, w.a2] : [w.plane, base, w.a1]; rotY = w.inward > 0 ? Math.PI / 2 : -Math.PI / 2; }
  return <group name={name} position={pos} rotation-y={rotY} visible={visible}>{children}</group>;
}

/** Upholstered bouclé grid with oak fluting at both ends and a champagne trim with LED wash on top. */
function BedPanel({ span, top }: { span: number; top: number }) {
  const flute = Math.min(0.9, span * 0.12), inner = span - 2 * flute;
  const cols = Math.max(2, Math.round(inner / 1.4)), cw = inner / cols;
  const rows = Math.max(3, Math.round((top - 0.4) / 1.5)), rh = (top - 0.4) / rows;
  const tiles: ReactNode[] = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const u = flute + c * cw, v = 0.4 + r * rh;
    tiles.push(<Rb key={`${c}:${r}`} a={[u + 0.03, 0, u + cw - 0.03, 0.16]} y={[v + 0.03, v + rh - 0.03]} m="feature:panel" r={0.06} />);
  }
  const slats: ReactNode[] = [];
  for (const start of [0, span - flute]) {
    const n = Math.max(3, Math.round(flute / 0.16));
    for (let k = 0; k < n; k++) {
      const u = start + (k + 0.5) * (flute / n);
      slats.push(<mesh key={`${start}:${k}`} position={[u, top / 2, 0.06]} material={getMat('tvFlute')} castShadow receiveShadow><cylinderGeometry args={[0.06, 0.06, top, 10]} /></mesh>);
    }
  }
  return <>
    <Bx a={[0, 0, span, 0.05]} y={[0, top]} m="walnutD" />
    <Bx a={[0, 0, span, 0.12]} y={[0, 0.4]} m="walnutD" />
    {tiles}
    {slats}
    <Bx a={[0, 0, span, 0.2]} y={[top, top + 0.08]} m="brass" />
    <Bx a={[0.1, 0.18, span - 0.1, 0.2]} y={[top - 0.04, top]} m="glow" cast={false} />
  </>;
}

/** Stone surround with an arched opening framing the temple niche, with a warm LED line around the arch. */
function TempleArch({ w }: { w: FeatureWall }) {
  const span = w.a2 - w.a1;
  const geo = useMemo(() => {
    const H = 8.3, hw = Math.min(span / 2 - 0.35, w.item.w / 2 + 0.15), mid = span / 2, spring = 5.7;
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(span, 0); s.lineTo(span, H); s.lineTo(0, H); s.lineTo(0, 0);
    const hole = new THREE.Path();
    hole.moveTo(mid - hw, 0.02); hole.lineTo(mid + hw, 0.02); hole.lineTo(mid + hw, spring);
    hole.absarc(mid, spring, hw, 0, Math.PI, false);
    hole.lineTo(mid - hw, 0.02);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 40 });
    // world-feet UVs for the stone texture
    const p = g.attributes.position as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // LED line just inside the arch: up the left jamb, over the arch, down the right jamb
    const r = hw - 0.06, pts: THREE.Vector3[] = [new THREE.Vector3(mid - r, 0.1, 0.1)];
    for (let k = 0; k <= 40; k++) { const t = Math.PI - (k / 40) * Math.PI; pts.push(new THREE.Vector3(mid + Math.cos(t) * r, spring + Math.sin(t) * r, 0.1)); }
    pts.push(new THREE.Vector3(mid + r, 0.1, 0.1));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const led = new THREE.TubeGeometry(curve, 200, 0.025, 6, false);
    return { g, led };
  }, [span, w.item.w]);
  return <>
    <mesh geometry={geo.g} material={getMat('feature:stone')} castShadow receiveShadow />
    <mesh geometry={geo.led} material={getMat('glow')} />
  </>;
}
