import { memo, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeStatic } from './mergeStatic';
import type { HousePlan, Item } from '../plan/types';
import { itemTransform } from '../plan/compile';
import { artMaterial, rugMaterial } from './materials';
import { Bx, Cyl, Lathe, Model, Rb, Sph } from './parts';

/**
 * Furniture catalogue. Each item type renders inside its own local box (0..w, 0..d, front = +Z).
 * Types backed by a CC0 Poly Haven model use <Model>; joinery, sanitaryware and appliances are
 * built procedurally with PBR materials because no free model matches them.
 */
type R = (it: Item, ch: number) => ReactNode;

const legs = (w: number, d: number, h: number, m = 'walnutD', s = 0.18, inset = 0.08) => (
  <>{[[inset, inset], [w - inset - s, inset], [inset, d - inset - s], [w - inset - s, d - inset - s]].map(([x, z], i) => <Bx key={i} a={[x, z, x + s, z + s]} y={[0, h]} m={m} />)}</>
);

const books = (x0: number, x1: number, z0: number, z1: number, y0: number, seed: number) => {
  const cols = ['burgundy', 'navy', 'sage', 'linen', 'walnutD', 'cab'];
  const out: ReactNode[] = [];
  let x = x0, i = 0;
  while (x < x1 - 0.12) {
    const t = 0.09 + ((i * 7 + seed) % 4) * 0.025, h = 0.65 + ((i * 5 + seed * 3) % 5) * 0.07;
    if ((i + seed) % 9 !== 4) out.push(<Bx key={i} a={[x, z0, x + t, z1 - ((i + seed) % 3) * 0.04]} y={[y0, y0 + h]} m={cols[(i + seed) % cols.length]} />);
    x += t + 0.01; i++;
  }
  return out;
};

const shakerDoors = (x0: number, x1: number, n: number, z: number, y0: number, y1: number, m = 'walnut', panel = 'walnutD', handle = 'brass') => {
  const dw = (x1 - x0) / n;
  return Array.from({ length: n }, (_, i) => {
    const a = x0 + i * dw;
    return (
      <group key={i}>
        <Bx a={[a + 0.03, z, a + dw - 0.03, z + 0.05]} y={[y0, y1]} m={m} />
        <Bx a={[a + 0.22, z + 0.05, a + dw - 0.22, z + 0.07]} y={[y0 + 0.22, y1 - 0.22]} m={panel} />
        <Bx a={i % 2 ? [a + 0.12, z + 0.07, a + 0.18, z + 0.14] : [a + dw - 0.18, z + 0.07, a + dw - 0.12, z + 0.14]} y={[(y0 + y1) / 2 - 0.4, (y0 + y1) / 2 + 0.4]} m={handle} />
      </group>
    );
  });
};

const RENDER: Record<Item['type'], R> = {
  sofa: (it) => <>
    <Model id={(it.o?.model as string) ?? 'Sofa_01'} w={it.w} d={it.d} maxStretch={1.4} />
    {it.o?.pillows ? <Model id="throw_pillows_01" w={it.w} d={it.d} fit="native" scale={0.95} at={[it.w * 0.28, 1.45, it.d * 0.38]} /> : null}
  </>,
  armchair: (it) => <Model id="ArmChair_01" w={it.w} d={it.d} />,
  loungeChair: (it) => <Model id="modern_arm_chair_01" w={it.w} d={it.d} fit="contain" />,
  visitorChair: (it) => <Model id="modern_arm_chair_01" w={it.w} d={it.d} fit="contain" />,
  officeChair: (it) => <Model id="mid_century_lounge_chair" w={it.w} d={it.d} fit="contain" />,
  diningChair: (it) => <Model id="GreenChair_01" w={it.w} d={it.d} fit="contain" />,
  barStool: (it) => <Model id="bar_chair_round_01" w={it.w} d={it.d} h={3} fit="height" />,
  bench: (it) => <Model id="Ottoman_01" w={it.w} d={it.d} h={1.6} maxStretch={2.2} />,
  coffeeTable: (it) => it.o?.outdoor ? <>
    <Bx a={[0, 0, it.w, it.d]} y={[1.05, 1.2]} m="teak" />
    {legs(it.w, it.d, 1.05, 'teak', 0.2)}
    <Model id="ceramic_vase_01" w={0.6} d={0.6} fit="native" scale={1} at={[it.w / 2, 1.2, it.d / 2]} />
  </> : <>
    <Model id="modern_coffee_table_01" w={it.w} d={it.d} maxStretch={1.5} />
    <Model id="ceramic_vase_01" w={0.6} d={0.6} fit="native" scale={0.9} at={[it.w * 0.5, 1.28, it.d * 0.35]} />
  </>,
  diningTable: (it) => <>
    <Rb a={[0, 0, it.w, it.d]} y={[2.35, 2.5]} m="walnut" r={0.04} />
    <Bx a={[0.2, 0.2, it.w - 0.2, it.d - 0.2]} y={[2.15, 2.35]} m="walnutD" />
    {[[0.25, 0.25], [it.w - 0.45, 0.25], [0.25, it.d - 0.45], [it.w - 0.45, it.d - 0.45]].map(([x, z], i) => <Cyl key={i} c={[x + 0.1, z + 0.1]} r={0.07} r2={0.12} y={[0, 2.15]} m="walnutD" />)}
    <Bx a={[it.w / 2 - 0.5, 0.3, it.w / 2 + 0.5, it.d - 0.3]} y={[2.5, 2.51]} m="linen" cast={false} />
    <Model id="brass_vase_01" w={0.6} d={0.6} fit="native" scale={0.6} at={[it.w / 2, 2.51, it.d / 2]} />
  </>,
  sideTable: (it) => <>
    <Model id="side_table_tall_01" w={it.w} d={it.d} h={2.2} fit="contain" />
    <Model id="potted_plant_04" w={0.6} d={0.6} fit="native" scale={1.4} at={[it.w / 2, 2.2, it.d / 2]} />
  </>,
  roundTable: (it) => <Model id="round_wooden_table_01" w={it.w} d={it.d} fit="contain" />,
  outdoorSet: (it) => <Model id="outdoor_table_chair_set_01" w={it.w} d={it.d} maxStretch={1.5} />,
  console: (it) => <>
    <Model id="ClassicConsole_01" w={it.w} d={it.d} h={2.6} maxStretch={1.6} />
    <Bx a={[0.1, 0, it.w - 0.1, 0.06]} y={[3.2, 5.8]} m="brass" />
    <Bx a={[0.2, 0.06, it.w - 0.2, 0.08]} y={[3.3, 5.7]} m="mirror" />
    <Model id="ceramic_vase_01" w={0.6} d={0.6} fit="native" scale={0.8} at={[it.w * 0.3, 2.6, it.d * 0.5]} />
  </>,
  tvUnit: (it) => {
    const w = it.w, side = it.o?.compact ? 0.9 : 1.1;
    return <>
      {/* fluted walnut back panel */}
      <Bx a={[0, 0, w, 0.1]} y={[0, 7.6]} m="tvBack" />
      {Array.from({ length: Math.floor((w - 2 * side) / 0.22) }, (_, i) => <Cyl key={i} c={[side + 0.11 + i * 0.22, 0.12]} r={0.06} y={[1.9, 7.4]} m="tvFlute" seg={10} />)}
      <Model id="modern_wooden_cabinet" w={w - 2 * side} d={1.35} h={1.7} at={[w / 2, 0, 0.75]} maxStretch={1.8} />
      {/* TV */}
      <Rb a={[w / 2 - 2.15, 0.16, w / 2 + 2.15, 0.3]} y={[3.1, 5.55]} m="black" r={0.03} />
      <Bx a={[w / 2 - 2.08, 0.3, w / 2 + 2.08, 0.31]} y={[3.17, 5.48]} m="screen" cast={false} />
      {/* side shelves */}
      {[0, w - side].map((o, k) => <group key={k}>
        <Bx a={[o, 0.1, o + side, 1.1]} y={[0, 0.25]} m="walnutD" />
        <Bx a={[o, 0.1, o + 0.06, 1.1]} y={[0, 7.4]} m="walnut" />
        <Bx a={[o + side - 0.06, 0.1, o + side, 1.1]} y={[0, 7.4]} m="walnut" />
        {[1.6, 3.0, 4.4, 5.8].map((z) => <Bx key={z} a={[o, 0.1, o + side, 1.05]} y={[z, z + 0.07]} m="walnut" />)}
        <group>{books(o + 0.1, o + side - 0.1, 0.2, 0.95, 4.47, k + 2)}</group>
        <Model id="brass_vase_01" w={0.5} d={0.5} fit="native" scale={0.55} at={[o + side / 2, 1.67, 0.6]} />
        <Bx a={[o + 0.06, 0.1, o + side - 0.06, 0.14]} y={[1.67, 7.3]} m="glow" cast={false} />
      </group>)}
    </>;
  },
  temple: () => <>
    <Bx a={[0, 0, 3, 1.5]} y={[0, 2.5]} m="walnut" />
    {[0, 1, 2].map((i) => <Bx key={i} a={[0.15 + i * 0.95, 1.5, 0.95 + i * 0.95, 1.53]} y={[0.3, 2.2]} m="walnutD" />)}
    <Bx a={[-0.05, -0.02, 3.05, 1.55]} y={[2.5, 2.65]} m="marbleTop" />
    <Bx a={[0.05, 0, 2.95, 0.08]} y={[2.65, 6.4]} m="gold" />
    <Cyl c={[0.3, 1.2]} r={0.12} y={[2.65, 5.6]} m="marbleTop" /><Cyl c={[2.7, 1.2]} r={0.12} y={[2.65, 5.6]} m="marbleTop" />
    <Bx a={[0, 0, 3, 1.45]} y={[5.6, 5.9]} m="marbleTop" />
    <Bx a={[0.4, 0.1, 2.6, 1.2]} y={[5.9, 6.3]} m="marbleTop" />
    <Bx a={[0.9, 0.2, 2.1, 1.0]} y={[6.3, 6.8]} m="marbleTop" />
    <Cyl c={[1.5, 0.6]} r={0.05} r2={0.12} y={[6.8, 7.3]} m="gold" />
    <Bx a={[1.15, 0.2, 1.85, 0.7]} y={[2.65, 3.0]} m="brass" />
    <Lathe c={[1.5, 0.45]} y={3.0} m="gold" pts={[[0, 0], [0.2, 0], [0.16, 0.3], [0.22, 0.6], [0.12, 0.9], [0, 1.0]]} />
    <Model id="brass_diya_lantern" w={0.4} d={0.4} fit="native" scale={1.2} at={[0.6, 2.65, 1.0]} />
    <Model id="brass_diya_lantern" w={0.4} d={0.4} fit="native" scale={1.2} at={[2.4, 2.65, 1.0]} />
    <Sph c={[1.5, 1.2]} y={2.78} r={0.08} m="glow" />
  </>,
  crockery: (it) => <Model id="vintage_cabinet_01" w={it.w} d={it.d} />,
  wardrobe: (it) => {
    const h = 8, n = Math.round(it.w / 1.6);
    return <>
      <Bx a={[0, 0, it.w, 1.95]} y={[0.2, h]} m="walnut" />
      <Bx a={[0.05, 0, it.w - 0.05, 1.9]} y={[0, 0.2]} m="walnutD" />
      <Bx a={[-0.05, -0.02, it.w + 0.05, 2.08]} y={[h, h + 0.25]} m="walnutD" />
      {shakerDoors(0, it.w, n, 1.95, 0.25, h - 0.05)}
    </>;
  },
  dresser: (it) => <>
    <Model id="GothicCommode_01" w={it.w} d={it.d} h={2.7} maxStretch={1.8} />
    <Rb a={[0.25, 0, it.w - 0.25, 0.1]} y={[3.0, 6.4]} m="brass" r={0.04} />
    <Bx a={[0.4, 0.1, it.w - 0.4, 0.12]} y={[3.15, 6.25]} m="mirror" />
    <Cyl c={[it.w / 2, it.d + 0.9]} r={0.6} y={[0, 1.4]} m="burgundy" />
  </>,
  desk: (it) => {
    const { w, d } = it, exec = !!it.o?.exec;
    return <>
      <Rb a={[0, 0, w, d]} y={[2.35, 2.5]} m="walnut" r={0.03} />
      <Bx a={[0, 0, 1.4, d - 0.1]} y={[0.15, 2.35]} m="walnut" />
      {shakerDoors(0.02, 1.38, 1, d - 0.1, 0.3, 1.25, 'walnutD', 'walnut')}
      {shakerDoors(0.02, 1.38, 1, d - 0.1, 1.35, 2.25, 'walnutD', 'walnut')}
      <Bx a={[w - 0.18, 0, w, d - 0.1]} y={[0, 2.35]} m="walnut" />
      <Bx a={exec ? [1.4, d - 0.2, w - 0.18, d - 0.1] : [1.4, 0, w - 0.18, 0.1]} y={[0.9, 2.35]} m="walnutD" />
      <Bx a={[w / 2 - 0.7, 0.45, w / 2 + 0.7, 1.35]} y={[2.5, 2.53]} m="black" />
      <Bx a={[w / 2 - 0.65, 0.42, w / 2 + 0.65, 0.48]} y={[2.53, 3.4]} m="black" />
      <Bx a={[w / 2 - 0.6, 0.48, w / 2 + 0.6, 0.485]} y={[2.58, 3.35]} m="screen" cast={false} />
      {it.o?.lamp ? <Model id="desk_lamp_arm_01" w={0.8} d={0.8} fit="native" scale={1} at={[w - 0.6, 2.5, 0.45]} /> : null}
      <group>{books(0.2, 1.0, 0.15, 0.85, 2.5, 3)}</group>
    </>;
  },
  bookshelf: (it) => {
    const w = it.w, h = 7.2, out: ReactNode[] = [];
    out.push(<Bx key="b" a={[0, 0, w, 0.08]} y={[0, h]} m="walnutD" />, <Bx key="l" a={[0, 0, 0.1, 1.1]} y={[0, h]} m="walnut" />,
      <Bx key="r" a={[w - 0.1, 0, w, 1.1]} y={[0, h]} m="walnut" />, <Bx key="t" a={[0, 0, w, 1.1]} y={[h, h + 0.12]} m="walnut" />);
    let k = 0;
    for (let z = 0.2; z < h; z += 1.4, k++) {
      out.push(<Bx key={`s${k}`} a={[0, 0, w, 1.1]} y={[z, z + 0.08]} m="walnut" />);
      if (z + 1.3 < h) out.push(<group key={`k${k}`}>{books(0.15, w - 0.15, 0.12, 0.95, z + 0.08, k)}</group>);
    }
    return <>{out}</>;
  },
  nightstand: (it) => <>
    <Rb a={[0, 0, it.w, it.d]} y={[0.25, 1.95]} m="walnut" r={0.03} />
    {legs(it.w, it.d, 0.25)}
    <Bx a={[0.1, it.d, it.w - 0.1, it.d + 0.03]} y={[1.1, 1.75]} m="walnutD" />
    <Bx a={[it.w / 2 - 0.18, it.d + 0.03, it.w / 2 + 0.18, it.d + 0.08]} y={[1.38, 1.46]} m="brass" />
    <Lathe c={[it.w / 2, 0.6]} y={1.95} m="brass" pts={[[0, 0], [0.25, 0], [0.25, 0.04], [0.06, 0.1], [0.05, 0.7], [0, 0.75]]} />
    <Lathe c={[it.w / 2, 0.6]} y={2.6} m="shade" pts={[[0.42, 0], [0.28, 0.7]]} />
    <Sph c={[it.w / 2, 0.6]} y={2.85} r={0.11} m="glow" />
  </>,
  storage: (it) => <>
    <Bx a={[0, 0, it.w, it.d]} y={[0.2, 2.6]} m="walnut" />
    <Bx a={[-0.02, -0.02, it.w + 0.02, it.d + 0.03]} y={[2.6, 2.7]} m="marbleTop" />
    {shakerDoors(0, it.w, 3, it.d, 0.25, 2.55)}
    <Model id="ceramic_vase_01" w={0.5} d={0.5} fit="native" at={[it.w * 0.75, 2.7, it.d * 0.5]} />
  </>,
  bed: (it) => {
    const { w, d } = it, col = (it.o?.color as string) ?? 'burgundy';
    return <>
      {/* upholstered headboard with tufted panels */}
      <Rb a={[-0.1, 0, w + 0.1, 0.35]} y={[0.2, 4.5]} m="walnut" r={0.06} />
      {[0, 1, 2].map((i) => <Rb key={i} a={[0.25 + i * (w - 0.5) / 3 + 0.06, 0.33, 0.25 + (i + 1) * (w - 0.5) / 3 - 0.06, 0.5]} y={[1.9, 4.2]} m={col} r={0.08} />)}
      <Rb a={[0, 0.35, w, d]} y={[0.3, 1.25]} m="walnut" r={0.05} />
      {legs(w, d, 0.3)}
      <Rb a={[0.12, 0.4, w - 0.12, d - 0.1]} y={[1.2, 2.0]} m="sheet" r={0.18} />
      <Rb a={[0.05, d * 0.42, w - 0.05, d - 0.03]} y={[1.75, 2.12]} m="linen" r={0.15} />
      <Rb a={[0.02, d * 0.66, w - 0.02, d * 0.88]} y={[1.95, 2.18]} m={col} r={0.1} />
      <Rb a={[0.35, 0.55, w / 2 - 0.15, 1.75]} y={[1.95, 2.45]} m="sheet" r={0.2} />
      <Rb a={[w / 2 + 0.15, 0.55, w - 0.35, 1.75]} y={[1.95, 2.45]} m="sheet" r={0.2} />
      <Model id="throw_pillows_01" w={w} d={d} fit="native" scale={0.9} at={[w / 2, 2.05, 1.95]} />
    </>;
  },
  rug: (it) => (
    <mesh position={[it.w / 2, 0.03, it.d / 2]} rotation-x={-Math.PI / 2} material={rugMaterial((it.o?.color as 'blue') ?? 'burgundy', it.w, it.d)} receiveShadow>
      <planeGeometry args={[it.w, it.d]} />
    </mesh>
  ),
  plant: (it) => <Model id="potted_plant_02" w={it.w} d={it.d} h={it.w * 2.4} fit="height" />,
  planter: (it) => {
    const long = it.w >= it.d, len = long ? it.w : it.d, n = Math.max(1, Math.round(len / 2.2));
    return <>
      <Bx a={[0, 0, it.w, it.d]} y={[0, 1.5]} m="concrete" />
      <Bx a={[0.08, 0.08, it.w - 0.08, it.d - 0.08]} y={[1.5, 1.52]} m="soil" cast={false} />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const h = 2.3 + (i % 2) * 0.5, base = 1.45 - 0.66 * h; // sink the nursery pot below the soil line
        return <Model key={i} id="potted_plant_04" w={1} d={1} fit="height" h={h} at={long ? [it.w * t, base, it.d / 2] : [it.w / 2, base, it.d * t]} />;
      })}
    </>;
  },
  chandelier: (it, ch) => <>
    <Model id="Chandelier_01" w={it.w} d={it.d} fit="contain" hang at={[it.w / 2, ch, it.d / 2]} />
  </>,
  pendant: (it, ch) => <Model id="modern_ceiling_lamp_01" w={it.w} d={it.d} fit="native" scale={0.7} hang at={[it.w / 2, ch, it.d / 2]} />,
  art: (it) => {
    const z0 = (it.o?.z0 as number) ?? 4.4, z1 = (it.o?.z1 as number) ?? 6.2;
    return <>
      <Bx a={[0, 0, it.w, 0.08]} y={[z0, z1]} m="brass" />
      <mesh position={[it.w / 2, (z0 + z1) / 2, 0.085]} material={artMaterial((it.o?.art as string) ?? 'art1')}>
        <planeGeometry args={[it.w - 0.24, z1 - z0 - 0.24]} />
      </mesh>
    </>;
  },
  clock: (it) => <Model id="wall_clock" w={it.w} d={0.1} fit="native" scale={1.2} at={[it.w / 2, (it.o?.z as number) ?? 6, 0]} />,
  wallTv: (it) => <>
    <Rb a={[0, 0, it.w, 0.12]} y={[3.6, 5.5]} m="black" r={0.02} />
    <Bx a={[0.06, 0.12, it.w - 0.06, 0.125]} y={[3.66, 5.44]} m="screen" cast={false} />
  </>,
  counter: (it) => {
    const { w, d } = it, o = it.o ?? {}, h = it.h ?? 2.75;
    const n = Math.max(1, Math.round(w / 1.5)), dw = w / n;
    const sink = o.sink as number | undefined, hob = o.hob as number | undefined;
    return <>
      <Bx a={[0, 0, w, d - 0.1]} y={[0.3, h - 0.15]} m="cab" />
      <Bx a={[0.05, 0, w - 0.05, d - 0.25]} y={[0, 0.3]} m="walnutD" />
      <Bx a={[-0.02, 0, w + 0.02, d + 0.04]} y={[h - 0.15, h]} m="granite" />
      {Array.from({ length: n }, (_, i) => <group key={i}>
        <Bx a={[i * dw + 0.04, d - 0.1, (i + 1) * dw - 0.04, d - 0.05]} y={[0.4, h - 0.25]} m="cab" />
        <Bx a={[i * dw + 0.16, d - 0.05, (i + 1) * dw - 0.16, d - 0.03]} y={[0.55, h - 0.4]} m="cabEdge" />
        <Bx a={[(i + 0.5) * dw - 0.25, d - 0.03, (i + 0.5) * dw + 0.25, d + 0.02]} y={[h - 0.55, h - 0.5]} m="brass" />
      </group>)}
      {sink != null ? <>
        <Bx a={[sink, 0.35, sink + 1.7, d - 0.4]} y={[h, h + 0.01]} m="steel" />
        <Bx a={[sink + 0.12, 0.47, sink + 1.58, d - 0.52]} y={[h + 0.01, h + 0.015]} m="black" cast={false} />
        <Cyl c={[sink + 0.85, 0.22]} r={0.05} y={[h, h + 1.0]} m="chrome" />
        <Bx a={[sink + 0.8, 0.17, sink + 0.9, 0.75]} y={[h + 0.9, h + 1.0]} m="chrome" />
      </> : null}
      {hob != null ? <>
        <Bx a={[hob, 0.4, hob + 2.2, d - 0.4]} y={[h, h + 0.05]} m="black" />
        {!o.induction ? [0.6, 1.6].map((x) => <Cyl key={x} c={[hob + x, d / 2]} r={0.3} y={[h + 0.05, h + 0.1]} m="steel" />) : null}
        {o.chimney ? <>
          <Bx a={[hob - 0.1, 0, hob + 2.3, 1.6]} y={[5.4, 5.9]} m="steel" />
          <Bx a={[hob + 0.6, 0, hob + 1.6, 0.9]} y={[5.9, o.chimney as number]} m="steel" />
        </> : null}
      </> : null}
      {/* tiled backsplash and wall cabinets */}
      {(o.up as [number, number][] | undefined)?.map(([u0, u1], k) => {
        const m = Math.max(1, Math.round((u1 - u0) / 1.5)), uw = (u1 - u0) / m;
        return <group key={k}>
          <Bx a={[u0, 0, u1, 0.03]} y={[h, 5.0]} m="tileWall" cast={false} />
          <Bx a={[u0, 0, u1, 1.1]} y={[5.0, 7.4]} m="cab" />
          {Array.from({ length: m }, (_, j) => <group key={j}>
            <Bx a={[u0 + j * uw + 0.04, 1.1, u0 + (j + 1) * uw - 0.04, 1.14]} y={[5.08, 7.32]} m="cab" />
            <Bx a={[u0 + j * uw + 0.16, 1.14, u0 + (j + 1) * uw - 0.16, 1.16]} y={[5.22, 7.18]} m="cabEdge" />
            <Bx a={[u0 + (j + 0.5) * uw - 0.04, 1.16, u0 + (j + 0.5) * uw + 0.04, 1.21]} y={[5.2, 5.6]} m="brass" />
          </group>)}
          <Bx a={[u0 + 0.1, 1.05, u1 - 0.1, 1.08]} y={[4.96, 5.0]} m="glow" cast={false} />
        </group>;
      })}
      {o.purifier ? <>
        <Rb a={[0.1, 0, 1.1, 0.45]} y={[4.3, 5.7]} m="white" r={0.08} />
        <Bx a={[0.3, 0.45, 0.9, 0.47]} y={[4.6, 5.2]} m="navy" />
      </> : null}
      {hob != null && o.chimney ? <Model id="ceramic_vase_01" w={0.5} d={0.5} fit="native" scale={0.7} at={[w - 0.7, h, 0.5]} /> : null}
    </>;
  },
  fridge: (it) => {
    const { w, d } = it, h = it.h ?? 6;
    return <>
      <Rb a={[0, 0, w, d]} y={[0.1, h]} m="steel" r={0.06} />
      <Bx a={[0.02, d, w - 0.02, d + 0.02]} y={[h * 0.62, h * 0.63]} m="black" />
      <Bx a={[w - 0.3, d, w - 0.22, d + 0.12]} y={[h * 0.2, h * 0.55]} m="chrome" />
      {h > 4 ? <Bx a={[w - 0.3, d, w - 0.22, d + 0.12]} y={[h * 0.68, h * 0.92]} m="chrome" /> : null}
      {it.o?.upper ? <Bx a={[0, 0.8, w, d]} y={[5.0, 7.4]} m="cab" /> : null}
    </>;
  },
  microwave: (it) => <Model id="vintage_microwave" w={it.w} d={it.d} h={1.0} at={[it.w / 2, (it.o?.z as number) ?? 0, it.d / 2]} />,
  vanity: (it) => {
    const { w } = it, wallHung = !!it.o?.wall;
    const bx = w / 2, bz = wallHung ? 0.6 : 0.85;
    return <>
      {wallHung ? null : <>
        <Bx a={[0, 0, w, 1.5]} y={[0.6, 2.6]} m="walnut" />
        {shakerDoors(0, w, 2, 1.5, 0.7, 2.5)}
      </>}
      <Bx a={[0, 0, w, wallHung ? 1.1 : 1.6]} y={[2.6, 2.72]} m={wallHung ? 'ceramic' : 'marbleTop'} />
      <Lathe c={[bx, bz]} y={2.45} m="ceramic" pts={[[0, 0], [0.28, 0.02], [0.4, 0.12], [0.45, 0.3], [0.43, 0.32], [0.37, 0.15], [0.25, 0.08], [0, 0.07]]} />
      <Cyl c={[bx, 0.2]} r={0.04} y={[2.72, 3.25]} m="chrome" />
      <Bx a={[bx - 0.035, 0.18, bx + 0.035, 0.55]} y={[3.18, 3.25]} m="chrome" />
      <Rb a={[0.1, 0, w - 0.1, 0.06]} y={[3.6, 6.3]} m="brass" r={0.03} />
      <Bx a={[0.18, 0.06, w - 0.18, 0.07]} y={[3.68, 6.22]} m="mirror" />
      <Bx a={[0.1, 0, w - 0.1, 0.02]} y={[0, 3.55]} m="tileWall" cast={false} />
    </>;
  },
  wc: () => <>
    <Rb a={[0.25, 0, 1.45, 0.55]} y={[1.3, 2.7]} m="ceramic" r={0.08} />
    <Bx a={[0.65, 0.2, 1.05, 0.35]} y={[2.7, 2.74]} m="chrome" />
    <Lathe c={[0.85, 1.35]} y={0} m="ceramic" scale={[1, 1, 1.25]} pts={[[0.38, 0], [0.42, 0.4], [0.5, 1.1], [0.58, 1.3], [0.55, 1.33], [0, 1.33]]} />
    <Rb a={[0.35, 0.45, 1.35, 1.3]} y={[0.4, 1.3]} m="ceramic" r={0.15} />
    <Lathe c={[0.85, 1.35]} y={1.33} m="ceramic" scale={[1, 1, 1.25]} pts={[[0.6, 0], [0.6, 0.06], [0, 0.07]]} />
  </>,
  shower: (it) => {
    const { w, d } = it;
    return <>
      <Bx a={[0, 0, w, d]} y={[0.02, 0.1]} m="tread" cast={false} />
      <Bx a={[0, 0, w, 0.03]} y={[0, 7]} m="tileWall" cast={false} />
      <Bx a={[w - 0.04, 0, w, d - 1.9]} y={[0.1, 6.8]} m="glass" cast={false} />
      <Bx a={[w - 0.07, 0, w + 0.02, 0.05]} y={[0.1, 6.8]} m="chrome" />
      <Bx a={[w - 0.07, d - 1.95, w + 0.02, d - 1.9]} y={[0.1, 6.8]} m="chrome" />
      <Cyl c={[w / 2, 0.05]} r={0.04} y={[3, 7]} m="chrome" />
      <Bx a={[w / 2 - 0.04, 0, w / 2 + 0.04, 0.85]} y={[6.92, 7]} m="chrome" />
      <Cyl c={[w / 2, 0.85]} r={0.38} y={[6.75, 6.85]} m="chrome" />
      <Rb a={[w / 2 - 0.25, 0.04, w / 2 + 0.25, 0.12]} y={[3.6, 3.9]} m="chrome" r={0.03} />
    </>;
  },
  washingMachine: (it) => <>
    <Rb a={[0, 0, it.w, it.d]} y={[0, 3]} m="white" r={0.08} />
    <mesh position={[it.w / 2, 1.4, it.d + 0.01]}>
      <torusGeometry args={[0.55, 0.07, 12, 40]} />
      <meshStandardMaterial color="#c8ccd0" metalness={0.9} roughness={0.2} />
    </mesh>
    <mesh position={[it.w / 2, 1.4, it.d]} rotation-x={Math.PI / 2}>
      <cylinderGeometry args={[0.5, 0.5, 0.04, 32]} />
      <meshPhysicalMaterial color="#1b2a33" roughness={0.05} transparent opacity={0.7} />
    </mesh>
    <Bx a={[0.2, it.d - 0.02, 1.8, it.d + 0.02]} y={[2.55, 2.85]} m="black" />
  </>,
  waterTank: (it) => <>
    <Cyl c={[it.w / 2, it.d / 2]} r={Math.min(it.w, it.d) / 2 - 0.02} y={[0, 4.3]} m="black" seg={32} />
    {[1, 2, 3].map((i) => <Cyl key={i} c={[it.w / 2, it.d / 2]} r={Math.min(it.w, it.d) / 2 + 0.01} y={[i * 1.05, i * 1.05 + 0.08]} m="black" seg={32} />)}
    <Cyl c={[it.w / 2, it.d / 2]} r={0.4} y={[4.3, 4.55]} m="black" />
  </>,
  dryingRack: (it) => <>
    <Bx a={[0, 0, it.w, 0.06]} y={[4.4, 4.48]} m="chrome" />
    <Bx a={[0, it.d - 0.06, it.w, it.d]} y={[4.4, 4.48]} m="chrome" />
    {[0, it.w - 0.06].map((x) => <Bx key={x} a={[x, 0, x + 0.06, it.d]} y={[0, 4.48]} m="chrome" />)}
    {[0, 1, 2, 3].map((i) => <Rb key={i} a={[0.6 + i * 1.3, 0.48, 1.5 + i * 1.3, 0.56]} y={[2.6, 4.4]} m={['linen', 'navy', 'sage', 'sheet'][i]} r={0.02} />)}
  </>,
  pergola: (it) => {
    const { w, d } = it;
    return <>
      {[[0.1, 0.5], [w - 0.5, 0.5], [0.1, d - 0.6], [w - 0.5, d - 0.6]].map(([x, z], i) => <Bx key={i} a={[x, z, x + 0.4, z + 0.4]} y={[0, 8.6]} m="teak" />)}
      <Bx a={[0, 0.4, w, 0.8]} y={[8.6, 9.1]} m="teak" />
      <Bx a={[0, d - 0.7, w, d - 0.3]} y={[8.6, 9.1]} m="teak" />
      {Array.from({ length: 10 }, (_, i) => <Bx key={i} a={[0.4 + i * 1.25, 0, 0.65 + i * 1.25, d]} y={[9.1, 9.4]} m="teak" />)}
    </>;
  },
  swing: () => <>
    <Bx a={[0, 0.9, 0.3, 1.5]} y={[0, 7]} m="walnut" />
    <Bx a={[5.1, 0.9, 5.4, 1.5]} y={[0, 7]} m="walnut" />
    <Bx a={[0, 1.0, 5.4, 1.4]} y={[7, 7.35]} m="walnut" />
    <Bx a={[0.7, 0.4, 4.7, 2.0]} y={[1.4, 1.6]} m="teak" />
    <Bx a={[0.7, 0.4, 4.7, 0.6]} y={[1.6, 3.0]} m="teak" />
    <Rb a={[0.9, 0.6, 4.5, 1.95]} y={[1.6, 1.85]} m="burgundy" r={0.08} />
    <Model id="throw_pillows_01" w={4} d={1} fit="native" scale={0.85} at={[2.7, 1.75, 0.95]} />
    {[[0.8, 0.5], [4.6, 0.5], [0.8, 1.9], [4.6, 1.9]].map(([x, z], i) => <Cyl key={i} c={[x, z]} r={0.025} y={[1.6, 7]} m="brass" seg={8} />)}
  </>,
  basket: (it) => <Model id="wicker_basket_01" w={it.w} d={it.d} fit="contain" />,
};

const PlacedItem = memo(function PlacedItem({ it, fh, ch }: { it: Item; fh: number; ch: number }) {
  const t = itemTransform(it);
  return (
    <group position={[t.x, it.level * fh, t.y]} rotation-y={t.yaw}>
      {RENDER[it.type](it, ch)}
    </group>
  );
});

/** One floor of furniture. Rendered once as React components, then baked into per-material meshes. */
function LevelFurniture({ level, items, fh, ch, visible }: { level: number; items: Item[]; fh: number; ch: number; visible: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [merged, setMerged] = useState<THREE.Group | null>(null);
  useLayoutEffect(() => {
    // runs after every model under this floor has loaded (the parent Suspense boundary resolved)
    if (!ref.current || new URLSearchParams(location.search).has('nomerge')) return;
    const g = mergeStatic(ref.current, `furn|L${level}`);
    setMerged(g);
    return () => { g.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); };
  }, [items, level]);
  return (
    <group visible={visible}>
      <group ref={ref} visible={!merged}>
        {items.map((it, i) => <PlacedItem key={i} it={it} fh={fh} ch={ch} />)}
      </group>
      {merged ? <primitive object={merged} /> : null}
    </group>
  );
}

/** All furniture. Must sit inside a Suspense boundary: it suspends until every model has loaded. */
export function Furniture({ plan, visibleLevels }: { plan: HousePlan; visibleLevels: number }) {
  return (
    <group>
      {plan.levels.map((_, L) => (
        <LevelFurniture key={L} level={L} items={plan.items.filter((it) => it.level === L)} fh={plan.floorHeight} ch={plan.ceilingHeight} visible={L <= visibleLevels} />
      ))}
    </group>
  );
}
