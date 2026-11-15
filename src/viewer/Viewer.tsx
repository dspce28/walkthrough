import { useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CompiledPlan } from '../plan/compile';
import { planSVG } from '../plan2d/planSvg';
import { DOLL_CAMERA, Scene, type HudInfo, type Quality } from './Scene';
import { applyStyle, modernLuxeKit } from '../style/select';
import { setHiresModels } from './parts';

applyStyle(modernLuxeKit);
import { createNav, TourPlayer } from './walk';

const KEYMAP: Record<string, string> = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', ArrowLeft: 'l', ArrowRight: 'r', KeyA: 'sl', KeyD: 'sr', KeyQ: 'l', KeyE: 'r' };

/** Quality is picked automatically (phones get the light preset); `?q=fast|high` overrides it. */
function autoQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'fast' || q === 'high') return q;
  return matchMedia('(max-width: 700px)').matches ? 'fast' : 'high';
}

export function Viewer({ compiled, active }: { compiled: CompiledPlan; active: boolean }) {
  const { plan } = compiled;
  const nav = useMemo(() => createNav(), []);
  const [mode, setMode] = useState<'doll' | 'walk'>('doll');
  const [quality] = useState<Quality>(() => { const q = autoQuality(); setHiresModels(q === 'high'); return q; });
  const [touring, setTouring] = useState(false);
  const [hud, setHud] = useState<HudInfo>({ level: 0, room: '', tourProgress: null, px: 0, py: 0, heading: 0 });
  const miniRef = useRef<HTMLDivElement>(null);
  const miniLevel = useRef(-1);

  const applyMode = useCallback((m: 'doll' | 'walk') => {
    nav.mode = m; setMode(m);
    if (m === 'doll') { nav.tour = null; setTouring(false); }
  }, [nav]);

  const stopTour = useCallback(() => { nav.tour = null; setTouring(false); }, [nav]);

  const startTour = useCallback(() => {
    applyMode('walk');
    const t = plan.tour[0];
    nav.px = t[0]; nav.py = t[1]; nav.pz = nav.cz = 0; nav.heading = 0; nav.pitch = 0.04;
    nav.tour = new TourPlayer(plan.tour);
    nav.onTourEnd = () => setTouring(false);
    setTouring(true);
  }, [applyMode, nav, plan]);

  const walkInside = () => {
    stopTour(); applyMode('walk');
    // start just inside the main door, looking into the hall
    const v = plan.viewpoints.find((p) => p.level === 0 && p.y > 0) ?? plan.viewpoints[0];
    nav.px = v.x; nav.py = v.y; nav.pz = nav.cz = v.level * plan.floorHeight; nav.heading = v.heading; nav.pitch = v.pitch ?? 0;
  };

  const wholeHouse = () => { stopTour(); applyMode('doll'); nav.resetDoll = true; };

  // keyboard (walk mode only, and only while the viewer is on screen)
  useEffect(() => {
    if (!active) return;
    const kd = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code]; if (!k || nav.mode !== 'walk') return;
      const tag = (e.target as HTMLElement).tagName; if (tag === 'SELECT' || tag === 'INPUT') return;
      nav.keys[k] = true; if (nav.tour) stopTour(); e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => { const k = KEYMAP[e.code]; if (k) nav.keys[k] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [active, nav, stopTour]);

  // minimap
  useEffect(() => {
    if (mode !== 'walk' || !miniRef.current) return;
    if (hud.level !== miniLevel.current) { miniLevel.current = hud.level; miniRef.current.innerHTML = planSVG(compiled, hud.level, { mini: true }); }
    const dot = miniRef.current.querySelector('#mm-dot'), dir = miniRef.current.querySelector('#mm-dir');
    if (dot && dir) {
      const mx = THREE.MathUtils.clamp(hud.px, -1, 13), my = THREE.MathUtils.clamp(hud.py, -5, 45);
      dot.setAttribute('cx', String(mx)); dot.setAttribute('cy', String(my));
      dir.setAttribute('x1', String(mx)); dir.setAttribute('y1', String(my));
      dir.setAttribute('x2', String(mx + Math.sin(hud.heading) * 2.4)); dir.setAttribute('y2', String(my + Math.cos(hud.heading) * 2.4));
    }
  }, [hud, mode, compiled]);
  useEffect(() => { if (mode !== 'walk') miniLevel.current = -1; }, [mode]);

  const pad = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { nav.keys[k] = true; if (nav.tour) stopTour(); e.preventDefault(); },
    onPointerUp: () => { nav.keys[k] = false; }, onPointerLeave: () => { nav.keys[k] = false; }, onPointerCancel: () => { nav.keys[k] = false; },
  });

  const level = plan.levels[hud.level]?.name ?? '';
  const where = mode === 'doll' ? 'The whole house' : hud.room || level;

  return (
    <div className="stage">
      <Canvas
        shadows={quality === 'high' ? 'soft' : false}
        dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: DOLL_CAMERA, fov: 45, near: 0.2, far: 900 }}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      >
        <Suspense fallback={null}>
          <Scene compiled={compiled} nav={nav} settings={{ visibleLevels: plan.levels.length, quality, time: 'day', mode }} onHud={setHud} />
        </Suspense>
      </Canvas>

      <div className="hud" aria-live="polite">
        <span className="hud-eyebrow">{mode === 'doll' ? 'Dollhouse' : touring ? 'Guided tour' : level}</span>
        <span className="hud-title">{where}</span>
        {touring && hud.tourProgress != null && <span className="hud-progress"><i style={{ width: `${hud.tourProgress * 100}%` }} /></span>}
      </div>

      <Loader />

      {mode === 'walk' && <div className="mini" ref={miniRef} aria-hidden="true" />}
      {mode === 'walk' && !touring && (
        <div className="pad">
          <button className="f" aria-label="Move forward" {...pad('f')}>▲</button>
          <button className="l" aria-label="Turn left" {...pad('l')}>◀</button>
          <button className="b" aria-label="Move back" {...pad('b')}>▼</button>
          <button className="r" aria-label="Turn right" {...pad('r')}>▶</button>
        </div>
      )}

      <div className="controls" role="toolbar" aria-label="3D view controls">
        <div className="toggle" role="group" aria-label="View mode">
          <button aria-pressed={mode === 'doll'} onClick={wholeHouse}>Dollhouse</button>
          <button aria-pressed={mode === 'walk' && !touring} onClick={walkInside}>Walk inside</button>
        </div>
        <button className="ghost" onClick={wholeHouse}>Whole house</button>
        <button className="gold" onClick={() => (touring ? stopTour() : startTour())}>
          {touring ? <><span className="ic">❚❚</span>Stop tour</> : <><span className="ic">▶</span>Play guided tour</>}
        </button>
      </div>

      <p className="hint">{mode === 'doll'
        ? 'Drag to orbit · Scroll to zoom · Right-drag to pan'
        : touring ? 'Drag or press a key to take control' : 'W A S D or arrows to move · Drag to look · Climb the stairs to change floor'}</p>
    </div>
  );
}

function Loader() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="loader">
      <span className="loader-mark">G+2</span>
      <span className="loader-text">Preparing the residence</span>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${progress}%` }} /></div>
      <span className="loader-pct">{Math.round(progress)}%</span>
    </div>
  );
}
