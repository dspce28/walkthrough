import { useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CompiledPlan } from '../plan/compile';
import { planSVG } from '../plan2d/planSvg';
import { Scene, type HudInfo, type Quality, type TimeOfDay } from './Scene';
import { createNav, TourPlayer } from './walk';

const KEYMAP: Record<string, string> = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', ArrowLeft: 'l', ArrowRight: 'r', KeyA: 'sl', KeyD: 'sr', KeyQ: 'l', KeyE: 'r' };

export function Viewer({ compiled, active }: { compiled: CompiledPlan; active: boolean }) {
  const { plan } = compiled;
  const nav = useMemo(() => createNav(), []);
  const [mode, setMode] = useState<'doll' | 'walk'>('doll');
  const [visibleLevels, setVisibleLevels] = useState(0);
  const [quality, setQuality] = useState<Quality>(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q === 'fast' || q === 'high') return q;
    return matchMedia('(max-width: 700px)').matches ? 'fast' : 'high';
  });
  const [time, setTime] = useState<TimeOfDay>('day');
  const [touring, setTouring] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hud, setHud] = useState<HudInfo>({ level: 0, room: '', tourProgress: null, px: 0, py: 0, heading: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const miniLevel = useRef(-1);

  const applyMode = useCallback((m: 'doll' | 'walk') => {
    nav.mode = m; setMode(m);
    if (m === 'doll') { nav.tour = null; setTouring(false); }
  }, [nav]);

  const stopRecording = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  }, []);

  const startTour = useCallback((record: boolean) => {
    applyMode('walk');
    const t = plan.tour[0];
    nav.px = t[0]; nav.py = t[1]; nav.pz = nav.cz = 0; nav.heading = 0; nav.pitch = 0.04;
    nav.tour = new TourPlayer(plan.tour);
    nav.onTourEnd = () => { setTouring(false); stopRecording(); };
    setTouring(true);
    if (record && canvasRef.current) {
      const stream = canvasRef.current.captureStream(30);
      const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const rec = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${plan.id}-walkthrough.${(rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      };
      rec.start(1000);
      recorder.current = rec;
      setRecording(true);
    }
  }, [applyMode, nav, plan, stopRecording]);

  const stopTour = useCallback(() => { nav.tour = null; setTouring(false); stopRecording(); }, [nav, stopRecording]);

  const jump = (i: number) => {
    const v = plan.viewpoints[i]; if (!v) return;
    stopTour(); applyMode('walk');
    nav.px = v.x; nav.py = v.y; nav.pz = nav.cz = v.level * plan.floorHeight; nav.heading = v.heading; nav.pitch = v.pitch ?? 0;
  };

  // keyboard
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

  const hudText = mode === 'doll'
    ? `Dollhouse · ${visibleLevels >= plan.levels.length ? 'Whole house' : plan.levels.slice(0, visibleLevels + 1).map((l) => l.name.split(' ')[0]).join(' + ')}`
    : `${plan.levels[hud.level]?.name ?? ''}${hud.room ? ` · ${hud.room}` : ''}${hud.tourProgress != null ? ` · guided tour ${Math.round(hud.tourProgress * 100)}%` : ''}`;

  return (
    <section className="viewer">
      <div className="bar">
        <div className="seg" role="group" aria-label="View mode">
          <button aria-pressed={mode === 'doll'} onClick={() => applyMode('doll')}>Dollhouse</button>
          <button aria-pressed={mode === 'walk'} onClick={() => { applyMode('walk'); if (nav.py < -10 && !nav.tour) jump(1); }}>Walk inside</button>
        </div>
        {mode === 'doll' && (
          <div className="seg" role="group" aria-label="Floors shown">
            {plan.levels.map((l, i) => <button key={i} aria-pressed={visibleLevels === i} onClick={() => setVisibleLevels(i)}>{i === 0 ? l.name.split(' ')[0] : `+ ${l.name.split(' ')[0]}`}</button>)}
            <button aria-pressed={visibleLevels >= plan.levels.length} onClick={() => setVisibleLevels(plan.levels.length)}>Whole house</button>
          </div>
        )}
        <select aria-label="Go to a room" value="" onChange={(e) => jump(+e.target.value)}>
          <option value="" disabled>Go to a room…</option>
          {plan.viewpoints.map((v, i) => <option key={i} value={i}>{v.name}</option>)}
        </select>
        <button className="btn primary" onClick={() => (touring ? stopTour() : startTour(false))}>{touring ? 'Stop tour' : 'Play guided tour'}</button>
        <button className="btn" disabled={touring && !recording} onClick={() => (recording ? stopTour() : startTour(true))}>{recording ? '■ Stop and save video' : '● Record walkthrough video'}</button>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Lighting">
          <button aria-pressed={time === 'day'} onClick={() => setTime('day')}>Day</button>
          <button aria-pressed={time === 'evening'} onClick={() => setTime('evening')}>Evening</button>
        </div>
        <div className="seg" role="group" aria-label="Render quality">
          <button aria-pressed={quality === 'high'} onClick={() => setQuality('high')}>High</button>
          <button aria-pressed={quality === 'fast'} onClick={() => setQuality('fast')}>Fast</button>
        </div>
      </div>
      <div className="stage">
        <Canvas
          key={quality}
          shadows={quality === 'high' ? 'soft' : false}
          dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
          frameloop={active ? 'always' : 'never'}
          camera={{ position: [24, 34, -6], fov: 45, near: 0.2, far: 900 }}
          gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false, toneMapping: THREE.NoToneMapping }}
          onCreated={({ gl }) => { canvasRef.current = gl.domElement; }}
        >
          <Suspense fallback={null}>
            <Scene compiled={compiled} nav={nav} settings={{ visibleLevels: mode === 'walk' ? plan.levels.length : visibleLevels, quality, time, mode }} onHud={setHud} />
          </Suspense>
        </Canvas>
        <div className="hud">{recording ? <span className="rec">REC</span> : null}{hudText}</div>
        <Loader />
        {mode === 'walk' && <div className="mini" ref={miniRef} aria-hidden="true" />}
        {mode === 'walk' && (
          <div className="pad">
            <button className="f" aria-label="Move forward" {...pad('f')}>▲</button>
            <button className="l" aria-label="Turn left" {...pad('l')}>◄</button>
            <button className="b" aria-label="Move back" {...pad('b')}>▼</button>
            <button className="r" aria-label="Turn right" {...pad('r')}>►</button>
          </div>
        )}
      </div>
      <p className="help">{mode === 'doll'
        ? 'Drag to orbit, right-drag to pan, scroll or pinch to zoom. Use the floor buttons to lift the floors off one by one.'
        : 'Move with W A S D or the arrow keys, or the on-screen pad. Drag to look around. Walk up the stairs to change floor, or pick a room from the list.'}
      </p>
    </section>
  );
}

function Loader() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return <div className="loader"><div className="bar-track"><div className="bar-fill" style={{ width: `${progress}%` }} /></div><span>Loading furniture and materials… {Math.round(progress)}%</span></div>;
}
