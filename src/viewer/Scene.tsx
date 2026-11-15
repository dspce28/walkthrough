import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CompiledPlan } from '../plan/compile';
import type { HousePlan } from '../plan/types';
import { Architecture } from './Architecture';
import { BakedArchitecture, useBakeMeta } from './Baked';
import { FalseCeilings } from './FalseCeilings';
import { Furniture } from './Furniture';
import { getMat } from './materials';
import { MODEL_URL } from './parts';
import { EYE, makeWalker, type NavState } from './walk';

export type Quality = 'high' | 'fast';
/** Default dollhouse framing: three-quarter view from the road side, whole house in frame. */
export const DOLL_CAMERA: [number, number, number] = [30, 38, -34];
export type TimeOfDay = 'day' | 'evening';
export interface SceneSettings { visibleLevels: number; quality: Quality; time: TimeOfDay; mode: 'doll' | 'walk' }

/** City skyline behind windows and terraces (generic CC0; no free Ahmedabad panorama exists). */
const CITY_HDRI = 'homecoming_center_rooftop';
const HDRI = (id: string) => `${import.meta.env.BASE_URL}assets/hdri/${id}.hdr`;

const PRELOAD = ['Sofa_01', 'sofa_03', 'ArmChair_01', 'GreenChair_01', 'Chandelier_01', 'ClassicConsole_01', 'potted_plant_02', 'potted_plant_04', 'modern_coffee_table_01', 'vintage_cabinet_01', 'modern_wooden_cabinet'];

export function Scene({ compiled, nav, settings, onHud }: { compiled: CompiledPlan; nav: NavState; settings: SceneSettings; onHud: (h: HudInfo) => void }) {
  const { plan } = compiled;
  const evening = settings.time === 'evening';
  const hi = settings.quality === 'high';
  const bake = useBakeMeta(plan.id);
  useEffect(() => { PRELOAD.forEach((id) => useGLTF.preload(MODEL_URL(id))); }, []);
  return (
    <>
      <Environment files={HDRI(CITY_HDRI)} background backgroundIntensity={evening ? 0.12 : 1} environmentIntensity={evening ? 0.1 : 0.55} />
      <fog attach="fog" args={['#c9cdc8', 140, 520]} />
      <Sun evening={evening} hi={hi} />
      <hemisphereLight args={['#e3ecf3', '#d6c7ad', evening ? 0.08 : 0.45]} />
      <InteriorLights compiled={compiled} nav={nav} visibleLevels={settings.visibleLevels} evening={evening} />
      <Site compiled={compiled} neighbours={settings.mode === 'walk'} />
{/* baked (Cycles) walls/floors/ceilings when available; glass and curtains always stay real-time */}
      {bake && <Suspense fallback={null}><BakedArchitecture planId={plan.id} meta={bake} visibleLevels={settings.visibleLevels} /></Suspense>}
            <Architecture compiled={compiled} glazingOnly={!!bake} visibleLevels={settings.visibleLevels}
        cutAt={settings.mode === 'doll' && settings.visibleLevels < plan.levels.length ? settings.visibleLevels * plan.floorHeight + 7 : null} />
      <FalseCeilings plan={plan} visibleLevels={settings.visibleLevels} />
      <Suspense fallback={null}>
        <Furniture plan={plan} visibleLevels={settings.visibleLevels} />
      </Suspense>
      {new URLSearchParams(location.search).has('debug') ? <DebugStats /> : null}
      {new URLSearchParams(location.search).has('export') ? <ExportForBake plan={plan} /> : null}
      <CameraRig compiled={compiled} nav={nav} visibleLevels={settings.visibleLevels} onHud={onHud} />
      {hi ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={1.6} distanceFalloff={0.6} intensity={2.2} halfRes quality="medium" />
          <Bloom mipmapBlur luminanceThreshold={1.1} intensity={evening ? 0.9 : 0.35} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.AGX} />
          <Vignette offset={0.25} darkness={0.45} />
          <SMAA />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      )}
    </>
  );
}

function Sun({ evening, hi }: { evening: boolean; hi: boolean }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(6, 10, 18); return o; }, []);
  useEffect(() => { if (ref.current) ref.current.target = target; }, [target]);
  return (
    <>
      <primitive object={target} />
      <directionalLight ref={ref} position={evening ? [-60, 18, -30] : [-34, 70, -46]} intensity={evening ? 0.6 : 3.2} color={evening ? '#ffb27a' : '#fff1dc'}
        castShadow shadow-mapSize={hi ? [4096, 4096] : [1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-38} shadow-camera-right={38} shadow-camera-top={38} shadow-camera-bottom={-38} shadow-camera-near={1} shadow-camera-far={220} />
    </>
  );
}

/** Ground, road, kerb, and simple neighbouring blocks so the house sits in a street. */
function Site({ compiled, neighbours }: { compiled: CompiledPlan; neighbours: boolean }) {
  const yRoad = compiled.plan.street.yRoad;
  const lawn = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a8a291', roughness: 1 }), []);
  const asphalt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4e5256', roughness: 0.95 }), []);
  const neighbour = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8d0c0', roughness: 0.9 }), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[6, -0.32, 20]} material={lawn} receiveShadow><planeGeometry args={[3000, 3000]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[6, -0.3, yRoad]} material={asphalt} receiveShadow><planeGeometry args={[500, 22]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[6, -0.15, yRoad + s * 11.5]} material={getMat('coping')} receiveShadow><boxGeometry args={[500, 0.35, 1]} /></mesh>)}
      {neighbours && [-14, 26].map((x) => (
        <mesh key={x} position={[x, 14, 19]} material={neighbour} castShadow receiveShadow><boxGeometry args={[13.6, 28.6, 48]} /></mesh>
      ))}
      {/* street trees */}
      {[-30, -10, 22, 42].map((x) => (
        <group key={x} position={[x, 0, yRoad + 13]}>
          <mesh position={[0, 4, 0]} castShadow material={getMat('walnutD')}><cylinderGeometry args={[0.35, 0.45, 8, 10]} /></mesh>
          <mesh position={[0, 11, 0]} castShadow material={getMat('leaf')}><icosahedronGeometry args={[5, 1]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export interface Anchor { level: number; x: number; y: number; z: number; strength: number; color: string }
const POOL = 8;

/** Light fixtures (and a ceiling light for every room without one). Shared with the offline bake. */
export function lightAnchors(plan: HousePlan): Anchor[] {
  const a: Anchor[] = [], FH = plan.floorHeight, CH = plan.ceilingHeight;
  const lit = new Set<string>();
  for (const it of plan.items) {
    const cx = it.rot % 2 ? it.x + it.d / 2 : it.x + it.w / 2, cy = it.rot % 2 ? it.y + it.w / 2 : it.y + it.d / 2;
    if (it.type === 'chandelier') a.push({ level: it.level, x: cx, y: cy, z: it.level * FH + CH - 1.6, strength: 1.4, color: '#ffd9a8' });
    if (it.type === 'pendant') a.push({ level: it.level, x: cx, y: cy, z: it.level * FH + CH - 2.6, strength: 0.8, color: '#ffe2b8' });
    if (it.type === 'chandelier' || it.type === 'pendant') {
      const r = plan.rooms.find((r) => r.level === it.level && cx >= r.rect[0] && cx <= r.rect[2] && cy >= r.rect[1] && cy <= r.rect[3]);
      if (r) lit.add(`${r.level}:${r.name}:${r.rect.join()}`);
    }
  }
  for (const r of plan.rooms) {
    const [x1, y1, x2, y2] = r.rect;
    if (lit.has(`${r.level}:${r.name}:${r.rect.join()}`)) continue;
    const area = (x2 - x1) * (y2 - y1);
    const outdoor = /terrace|porch|yard|balcony/i.test(r.name);
    a.push({ level: r.level, x: (x1 + x2) / 2, y: (y1 + y2) / 2, z: r.level * FH + CH - (outdoor ? 1.2 : 0.4), strength: Math.min(1.2, 0.4 + area / 80), color: '#fff0dc' });
  }
  return a;
}


/**
 * Interior lighting. Real-time renderers cannot afford a light per fixture, so a fixed pool of point lights
 * is moved to the fixtures nearest the camera on the visible floors. Fixed count = no shader recompiles.
 */
function InteriorLights({ compiled, nav, visibleLevels, evening }: { compiled: CompiledPlan; nav: NavState; visibleLevels: number; evening: boolean }) {
  const { plan } = compiled;
  const anchors = useMemo(() => lightAnchors(plan), [plan]);
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const last = useRef(0);
  const { camera } = useThree();
  useFrame((state) => {
    if (state.clock.elapsedTime - last.current < 0.25) return;
    last.current = state.clock.elapsedTime;
    const camLevel = nav.mode === 'walk' ? Math.round(nav.pz / plan.floorHeight - 0.2) : visibleLevels;
    const p = camera.position, focus = nav.mode === 'walk' ? new THREE.Vector3(p.x, p.y, p.z) : new THREE.Vector3(6, visibleLevels * plan.floorHeight + 4, 19);
    const cand = anchors.filter((a) => a.level <= Math.min(visibleLevels, plan.levels.length - 1) && (nav.mode === 'doll' || a.level === camLevel))
      .map((a) => ({ a, d: (a.x - focus.x) ** 2 + (a.z - focus.y) ** 2 * 4 + (a.y - focus.z) ** 2 }))
      .sort((u, v) => u.d - v.d).slice(0, POOL);
    for (let i = 0; i < POOL; i++) {
      const L = refs.current[i]; if (!L) continue;
      const c = cand[i];
      if (!c) { L.intensity = 0; continue; }
      L.position.set(c.a.x, c.a.z, c.a.y);
      L.color.set(c.a.color);
      L.intensity = c.a.strength * (evening ? 26 : 9);
    }
  });
  return <>{Array.from({ length: POOL }, (_, i) => <pointLight key={i} ref={(l) => { refs.current[i] = l; }} distance={22} decay={1.6} intensity={0} />)}</>;
}

export interface HudInfo { level: number; room: string; tourProgress: number | null; px: number; py: number; heading: number }

/** ?export: once every floor's furniture is merged, export the house GLB and light list for the offline bake. */
function ExportForBake({ plan }: { plan: HousePlan }) {
  const { scene } = useThree();
  useEffect(() => {
    let done = false;
    const t = setInterval(async () => {
      const levels = new Set<string>();
      scene.traverse((o) => { const m = /^furn\|L(\d+)\|/.exec(o.name); if (m) levels.add(m[1]); });
      if (done || levels.size < plan.levels.length) return;
      done = true; clearInterval(t);
      const { exportHouse } = await import('./exportScene');
      const buf = await exportHouse(scene);
      const w = window as unknown as Record<string, unknown>;
      w.__exportLights = { anchors: lightAnchors(plan), sun: [-34, 70, -46], floorHeight: plan.floorHeight, ceilingHeight: plan.ceilingHeight, levels: plan.levels.length };
      w.__exportGlb = buf;
    }, 1000);
    return () => clearInterval(t);
  }, [scene, plan]);
  return null;
}

/** ?debug exposes renderer stats on window.__stats for profiling. */
function DebugStats() {
  const { gl, scene } = useThree();
  useEffect(() => { gl.info.autoReset = false; }, [gl]);
  useFrame(() => {
    const w = window as unknown as { __stats?: unknown; __scene?: unknown };
    w.__scene = scene;
    let meshes = 0; scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) meshes++; });
    w.__stats = { calls: gl.info.render.calls, triangles: gl.info.render.triangles, meshes, textures: gl.info.memory.textures, geometries: gl.info.memory.geometries, programs: gl.info.programs?.length };
    gl.info.reset();
  }, -100);
  return null;
}

function CameraRig({ compiled, nav, visibleLevels, onHud }: { compiled: CompiledPlan; nav: NavState; visibleLevels: number; onHud: (h: HudInfo) => void }) {
  const { camera, gl } = useThree();
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);
  const orbit = useRef<OrbitControlsImpl>(null);
  const walker = useMemo(() => makeWalker(compiled), [compiled]);
  const plan = compiled.plan;
  const hudT = useRef(0);
  const lastMode = useRef(nav.mode);

  // drag-to-look in walk mode
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number } | null = null;
    const pd = (e: PointerEvent) => { if (nav.mode === 'walk') { down = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); } };
    const pm = (e: PointerEvent) => {
      if (!down || nav.mode !== 'walk') return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y; down = { x: e.clientX, y: e.clientY };
      nav.heading -= dx * 0.005; nav.pitch = THREE.MathUtils.clamp(nav.pitch + dy * 0.004, -1.1, 1.1);
      if (nav.tour) { nav.tour = null; nav.onTourEnd?.(); }
    };
    const pu = () => { down = null; };
    const wheel = (e: WheelEvent) => { if (nav.mode !== 'walk') return; e.preventDefault(); const s = -Math.sign(e.deltaY) * 0.8; walker.tryMove(nav, Math.sin(nav.heading) * s, Math.cos(nav.heading) * s); };
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel); };
  }, [gl, nav, walker]);

  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const cam = camera as THREE.PerspectiveCamera;
    if (nav.mode === 'doll') {
      if (lastMode.current !== 'doll' || nav.resetDoll) {
        nav.resetDoll = false;
        cam.fov = 45; cam.updateProjectionMatrix();
        // pull back on portrait screens so the whole house still fits
        const ty = Math.max(2, Math.min(visibleLevels, 2) * plan.floorHeight + 2), k = cam.aspect < 1 ? 1 / Math.max(0.45, cam.aspect) : 1;
        camera.position.set(6 + (DOLL_CAMERA[0] - 6) * k, ty + (DOLL_CAMERA[1] - ty) * k, 19 + (DOLL_CAMERA[2] - 19) * k);
        orbit.current?.target.set(6, ty, 19);
      }
      const ty = Math.max(2, Math.min(visibleLevels, 2) * plan.floorHeight + 2);
      if (orbit.current) { orbit.current.target.lerp(new THREE.Vector3(6, ty, 19), Math.min(1, dt * 4)); orbit.current.update(); }
    } else {
      if (lastMode.current !== 'walk') { cam.fov = 68; cam.updateProjectionMatrix(); }
      if (nav.tour) {
        nav.tour.step(nav, dt, walker);
        if (nav.tour.done) { nav.tour = null; nav.onTourEnd?.(); }
      } else {
        const k = nav.keys, tu = 1.9 * dt, mv = 5.5 * dt, fx = Math.sin(nav.heading), fy = Math.cos(nav.heading);
        if (k.l) nav.heading += tu; if (k.r) nav.heading -= tu;
        if (k.f) walker.tryMove(nav, fx * mv, fy * mv); if (k.b) walker.tryMove(nav, -fx * mv, -fy * mv);
        if (k.sl) walker.tryMove(nav, fy * mv * 0.8, -fx * mv * 0.8); if (k.sr) walker.tryMove(nav, -fy * mv * 0.8, fx * mv * 0.8);
      }
      nav.cz += (nav.pz - nav.cz) * Math.min(1, dt * 9);
      const ey = nav.cz + EYE, cp = Math.cos(nav.pitch);
      camera.position.set(nav.px, ey, nav.py);
      camera.lookAt(nav.px + Math.sin(nav.heading) * cp, ey - Math.sin(nav.pitch), nav.py + Math.cos(nav.heading) * cp);
    }
    lastMode.current = nav.mode;
    if (state.clock.elapsedTime - hudT.current > 0.2) {
      hudT.current = state.clock.elapsedTime;
      const L = Math.max(0, Math.min(plan.levels.length - 1, Math.round(nav.pz / plan.floorHeight - 0.2)));
      let room = '';
      for (const r of plan.rooms) if (r.level === L && nav.px >= r.rect[0] && nav.px <= r.rect[2] && nav.py >= r.rect[1] && nav.py <= r.rect[3]) room = r.name;
      if (!room && L === 0 && nav.py < plan.extents[0][1] - 5) room = 'Street';
      onHud({ level: L, room, tourProgress: nav.tour ? nav.tour.progress : null, px: nav.px, py: nav.py, heading: nav.heading });
    }
  });

  return nav.mode === 'doll'
    ? <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={0.08} minDistance={14} maxDistance={140} maxPolarAngle={1.48} target={[6, 2, 19]} />
    : null;
}
