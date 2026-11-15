import type { ReactNode } from 'react';
import type { Item } from '../../plan/types';
import { getMat, modernRugMaterial } from '../materials';
import { Bx, Cyl, Lathe, Model, Rb, Sph } from '../parts';

/**
 * Modern Luxe versions of item types. Anything not listed here falls back to the default catalogue
 * (viewer/Furniture.tsx). Decor props (pampas, sculpture, books, bowls, throws, cushions) are part of the
 * pieces they sit on, so every plan gets them wherever those pieces are placed.
 */
type R = (it: Item, ch: number) => ReactNode;

/* ---------- decor props ---------- */
export function Pampas({ at, h = 3.2 }: { at: [number, number, number]; h?: number }) {
  const [x, y, z] = at, stems: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, lean = 0.18 + (i % 3) * 0.07, len = h * (0.75 + ((i * 37) % 10) / 40);
    const tx = Math.cos(a) * lean, tz = Math.sin(a) * lean;
    stems.push(
      <group key={i} position={[x, y + 0.9, z]} rotation={[tz * 0.9, 0, -tx * 0.9]}>
        <mesh position={[0, len / 2, 0]} material={getMat('pampasStem')}><cylinderGeometry args={[0.012, 0.015, len, 5]} /></mesh>
        <mesh position={[0, len - 0.45, 0]} scale={[0.13, 0.55, 0.13]} material={getMat('pampas')} castShadow><sphereGeometry args={[1, 10, 8]} /></mesh>
      </group>,
    );
  }
  return <>
    <Lathe c={[x, z]} y={y} m="ceramicMatte" pts={[[0, 0], [0.22, 0], [0.32, 0.25], [0.3, 0.6], [0.16, 0.85], [0.14, 0.95], [0, 0.95]]} />
    {stems}
  </>;
}

export function Sculpture({ at }: { at: [number, number, number] }) {
  const [x, y, z] = at;
  return <>
    <Bx a={[x - 0.22, z - 0.22, x + 0.22, z + 0.22]} y={[y, y + 0.12]} m="darkMetal" />
    <mesh position={[x, y + 0.55, z]} rotation={[0.3, 0.4, 0]} material={getMat('ceramicMatte')} castShadow><torusGeometry args={[0.3, 0.09, 16, 40]} /></mesh>
    <Sph c={[x, z]} y={y + 0.24} r={0.12} m="brass" />
  </>;
}

export function BookStack({ at, rot = 0 }: { at: [number, number, number]; rot?: number }) {
  const [x, y, z] = at, cols = ['bookA', 'bookB', 'bookC'];
  return <group position={[x, y, z]} rotation-y={rot}>
    {cols.map((c, i) => <Bx key={i} a={[-0.42 + i * 0.03, -0.3 + i * 0.02, 0.42 - i * 0.04, 0.3 - i * 0.03]} y={[i * 0.09, i * 0.09 + 0.085]} m={c} />)}
  </group>;
}

function Bowl({ at, r = 0.4 }: { at: [number, number, number]; r?: number }) {
  return <Lathe c={[at[0], at[2]]} y={at[1]} m="darkMetal" pts={[[0, 0], [r * 0.5, 0], [r, r * 0.35], [r * 0.95, r * 0.38], [r * 0.45, 0.04], [0, 0.04]]} />;
}

function Cushion({ a, y, m }: { a: [number, number, number, number]; y: [number, number]; m: string }) {
  return <Rb a={a} y={y} m={m} r={0.14} />;
}

/* ---------- items ---------- */
export const MODERN_LUXE_ITEMS: Partial<Record<Item['type'], R>> = {
  /** Low, deep, upholstered bouclé sofa on a recessed plinth, with cushions and a folded throw. */
  sofa: (it) => {
    const { w, d } = it, arm = 0.55, seatH = 1.45, n = Math.max(1, Math.round((w - 2 * arm) / 2.3)), cw = (w - 2 * arm) / n;
    const outdoor = /outdoor/i.test(it.label ?? '');
    const up = outdoor ? 'outdoorFabric' : 'boucle';
    return <>
      <Bx a={[0.25, 0.25, w - 0.25, d - 0.2]} y={[0, 0.35]} m="darkMetal" />
      <Rb a={[0, 0, w, d]} y={[0.35, 1.05]} m={up} r={0.12} />
      <Rb a={[0, 0, w, 0.75]} y={[1.0, 2.55]} m={up} r={0.16} />
      <Rb a={[0, 0, arm, d]} y={[1.0, 2.05]} m={up} r={0.16} />
      <Rb a={[w - arm, 0, w, d]} y={[1.0, 2.05]} m={up} r={0.16} />
      {Array.from({ length: n }, (_, i) => <Rb key={i} a={[arm + i * cw + 0.03, 0.7, arm + (i + 1) * cw - 0.03, d - 0.05]} y={[1.05, seatH]} m={up} r={0.15} />)}
      <Cushion a={[arm + 0.15, 0.75, arm + 1.45, 1.05]} y={[1.45, 2.65]} m="accentSage" />
      <Cushion a={[arm + 1.25, 0.8, arm + 2.4, 1.1]} y={[1.45, 2.5]} m="accentClay" />
      <Cushion a={[w - arm - 1.45, 0.75, w - arm - 0.15, 1.05]} y={[1.45, 2.65]} m="accentSage" />
      <Rb a={[w - arm - 1.6, 0.6, w - arm - 0.3, d - 0.02]} y={[seatH, seatH + 0.07]} m="knit" r={0.03} />
    </>;
  },
  armchair: (it) => <Model id="modern_arm_chair_01" w={it.w} d={it.d} fit="contain" />,
  diningChair: (it) => <Model id="dining_chair_02" w={it.w} d={it.d} fit="contain" />,
  /** Halo chandelier: two concentric champagne rings with an LED inner face, on three fine rods. */
  chandelier: (it, ch) => {
    const r = Math.min(it.w, it.d) / 2, y = ch - 2.2, cx = it.w / 2, cz = it.d / 2;
    return <group position={[cx, 0, cz]}>
      {[r, r * 0.68].map((rr, i) => (
        <group key={i} position={[0, y - i * 0.35, 0]} rotation-x={Math.PI / 2}>
          <mesh material={getMat('brass')} castShadow><torusGeometry args={[rr, 0.05, 12, 64]} /></mesh>
          <mesh material={getMat('glow')} position={[0, 0, 0.045]}><torusGeometry args={[rr, 0.022, 8, 64]} /></mesh>
        </group>
      ))}
      {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * r, (y + ch) / 2, Math.sin(a) * r]} material={getMat('darkMetal')}><cylinderGeometry args={[0.008, 0.008, ch - y, 4]} /></mesh>; })}
      <Cyl c={[0, 0]} r={0.25} y={[ch - 0.06, ch]} m="brass" />
    </group>;
  },
  rug: (it) => (
    <mesh position={[it.w / 2, 0.03, it.d / 2]} rotation-x={-Math.PI / 2} material={modernRugMaterial(it.w, it.d)} receiveShadow>
      <planeGeometry args={[it.w, it.d]} />
    </mesh>
  ),
  coffeeTable: (it) => it.o?.outdoor ? <>
    <Bx a={[0, 0, it.w, it.d]} y={[1.05, 1.2]} m="teak" />
    <Bx a={[0.15, 0.15, it.w - 0.15, it.d - 0.15]} y={[0, 1.05]} m="darkMetal" />
    <Bowl at={[it.w / 2, 1.2, it.d / 2]} />
  </> : <>
    {/* travertine-look drum table with styling */}
    <Rb a={[0, 0, it.w, it.d]} y={[1.15, 1.35]} m="feature:stone" r={0.05} />
    <Rb a={[0.35, 0.35, it.w - 0.35, it.d - 0.35]} y={[0, 1.15]} m="darkMetal" r={0.05} />
    <BookStack at={[it.w * 0.35, 1.35, it.d * 0.3]} rot={0.2} />
    <Sculpture at={[it.w * 0.62, 1.35, it.d * 0.7]} />
    <Bowl at={[it.w * 0.32, 1.35, it.d * 0.72]} r={0.35} />
  </>,
  diningTable: (it) => <>
    <Rb a={[-0.1, -0.1, it.w + 0.1, it.d + 0.1]} y={[2.35, 2.5]} m="tvBack" r={0.05} />
    <Rb a={[it.w / 2 - 0.4, 0.8, it.w / 2 + 0.4, it.d - 0.8]} y={[0, 2.35]} m="darkMetal" r={0.08} />
    <Rb a={[it.w / 2 - 0.9, 0.5, it.w / 2 + 0.9, it.d - 0.5]} y={[0, 0.15]} m="darkMetal" r={0.05} />
    <Pampas at={[it.w / 2, 2.5, it.d / 2]} h={2.2} />
    <Bowl at={[it.w / 2, 2.5, it.d * 0.25]} r={0.35} />
  </>,
  /** Oak sideboard with fluted doors, glass upper shelves with LED, styled with ceramics. */
  crockery: (it) => {
    const { w, d } = it;
    return <>
      <Bx a={[0, 0, w, d]} y={[0.3, 2.8]} m="walnut" />
      <Bx a={[0.1, 0.1, w - 0.1, d - 0.1]} y={[0, 0.3]} m="darkMetal" />
      {Array.from({ length: Math.floor(w / 0.18) }, (_, i) => <Cyl key={i} c={[0.09 + i * 0.18, d + 0.02]} r={0.055} y={[0.4, 2.7]} m="tvFlute" seg={8} />)}
      <Bx a={[-0.02, -0.02, w + 0.02, d + 0.05]} y={[2.8, 2.9]} m="tvBack" />
      <Bx a={[0.2, 0, w - 0.2, 0.06]} y={[3.6, 7.4]} m="walnutD" />
      {[4.6, 5.8].map((z) => <Bx key={z} a={[0.2, 0.06, w - 0.2, 0.95]} y={[z, z + 0.05]} m="glass" cast={false} />)}
      {/* LED strips under each glass shelf and under the top */}
      {[4.6, 5.8, 7.3].map((z) => <Bx key={`l${z}`} a={[0.3, 0.1, w - 0.3, 0.16]} y={[z - 0.03, z]} m="glow" cast={false} />)}
      <Model id="ceramic_vase_01" w={0.5} d={0.5} fit="native" scale={0.9} at={[w * 0.25, 2.9, d * 0.5]} />
      <Sculpture at={[w * 0.7, 2.9, d * 0.5]} />
      <Model id="ceramic_vase_01" w={0.5} d={0.5} fit="native" scale={0.6} at={[w * 0.4, 4.65, 0.5]} />
      <BookStack at={[w * 0.65, 5.85, 0.5]} />
    </>;
  },
  /** Slim console: stone top on a champagne frame, round mirror, pampas. */
  console: (it) => {
    const { w, d } = it;
    return <>
      <Bx a={[0, 0, w, d]} y={[2.55, 2.7]} m="feature:stone" />
      {[[0.05, 0.05], [w - 0.13, 0.05], [0.05, d - 0.13], [w - 0.13, d - 0.13]].map(([x, z], i) => <Bx key={i} a={[x, z, x + 0.08, z + 0.08]} y={[0, 2.55]} m="brass" />)}
      <mesh position={[w / 2, 4.6, 0.06]} material={getMat('brass')}><torusGeometry args={[Math.min(1.1, w / 2), 0.05, 12, 48]} /></mesh>
      <mesh position={[w / 2, 4.6, 0.04]} material={getMat('mirror')}><circleGeometry args={[Math.min(1.1, w / 2) - 0.03, 48]} /></mesh>
      {w > 2 ? <Pampas at={[w * 0.22, 2.7, d / 2]} h={2.4} /> : <Model id="ceramic_vase_01" w={0.5} d={0.5} fit="native" scale={0.8} at={[w * 0.5, 2.7, d / 2]} />}
      {w > 2 ? <BookStack at={[w * 0.72, 2.7, d / 2]} /> : null}
    </>;
  },
  /** Bed: same frame and panel headboard; neutral cushions and a knit throw instead of patterned pillows. */
  bed: (it) => {
    const { w, d } = it, col = (it.o?.color as string) ?? 'burgundy';
    return <>
      <Rb a={[-0.1, 0, w + 0.1, 0.35]} y={[0.2, 4.5]} m="walnut" r={0.06} />
      {[0, 1, 2].map((i) => <Rb key={i} a={[0.25 + i * (w - 0.5) / 3 + 0.06, 0.33, 0.25 + (i + 1) * (w - 0.5) / 3 - 0.06, 0.5]} y={[1.9, 4.2]} m={col} r={0.08} />)}
      <Rb a={[0, 0.35, w, d]} y={[0.3, 1.25]} m={col} r={0.08} />
      <Rb a={[0.12, 0.4, w - 0.12, d - 0.1]} y={[1.2, 2.0]} m="sheet" r={0.18} />
      <Rb a={[0.05, d * 0.4, w - 0.05, d - 0.03]} y={[1.75, 2.12]} m="sheet" r={0.15} />
      <Rb a={[0.0, d * 0.7, w, d * 0.9]} y={[1.95, 2.2]} m="knit" r={0.1} />
      <Rb a={[0.35, 0.55, w / 2 - 0.15, 1.75]} y={[1.95, 2.5]} m="sheet" r={0.2} />
      <Rb a={[w / 2 + 0.15, 0.55, w - 0.35, 1.75]} y={[1.95, 2.5]} m="sheet" r={0.2} />
      <Cushion a={[0.6, 1.5, w / 2 - 0.15, 1.85]} y={[2.0, 3.1]} m={col} />
      <Cushion a={[w / 2 + 0.15, 1.5, w - 0.6, 1.85]} y={[2.0, 3.1]} m={col} />
      <Cushion a={[w / 2 - 0.55, 1.75, w / 2 + 0.55, 2.0]} y={[2.0, 2.7]} m="accentClay" />
    </>;
  },
};
