import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { buildElevations } from './elevations/elevations';
import { compilePlan } from './plan/compile';
import { buildG2House } from './plan/houses/g2House';
import { planSVG } from './plan2d/planSvg';
import { Notes } from './views/Notes';

const Viewer = lazy(() => import('./viewer/Viewer').then((m) => ({ default: m.Viewer })));

const VIEWS = [
  ['plans', 'Floor plans'],
  ['walkthrough', '3D walkthrough'],
  ['elevations', 'Front elevations'],
  ['notes', 'Notes and questions'],
] as const;
type View = (typeof VIEWS)[number][0];

const fromHash = (): View => {
  const h = location.hash.slice(1);
  return (VIEWS.find(([v]) => v === h)?.[0] ?? 'plans') as View;
};

export default function App() {
  const compiled = useMemo(() => compilePlan(buildG2House()), []);
  const [view, setView] = useState<View>(fromHash);
  const [seen3d, setSeen3d] = useState(view === 'walkthrough');
  useEffect(() => {
    const on = () => setView(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { if (view === 'walkthrough') setSeen3d(true); }, [view]);
  const go = (v: View) => { history.replaceState(null, '', `#${v}`); setView(v); };
  const { plan } = compiled;

  return (
    <>
      <header>
        <div className="wrap">
          <div className="head">
            <div>
              <h1>{plan.name} · Plan and Walkthrough</h1>
            </div>
            <div className="meta"><span>Grid 1 sq = 1′ × 1′</span><span>Clear width 12′</span><span>Ground depth 44′</span><span>Upper floors 38′ + 4′ front extension</span></div>
          </div>
          <nav role="tablist" aria-label="Sheets">
            {VIEWS.map(([v, label]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => go(v)}>{label}</button>)}
          </nav>
        </div>
      </header>
      <main className={view === 'walkthrough' ? 'wide' : 'wrap'}>
        {view === 'plans' && <Plans compiled={compiled} />}
        {seen3d && (
          <div hidden={view !== 'walkthrough'}>
            <Suspense fallback={<p className="lead">Loading 3D viewer…</p>}>
              <Viewer compiled={compiled} active={view === 'walkthrough'} />
            </Suspense>
          </div>
        )}
        {view === 'elevations' && <Elevations />}
        {view === 'notes' && <Notes />}
      </main>
    </>
  );
}

function Plans({ compiled }: { compiled: ReturnType<typeof compilePlan> }) {
  const [floor, setFloor] = useState<'all' | number>('all');
  const [grid, setGrid] = useState(false);
  const { plan } = compiled;
  return (
    <section>
      <p className="lead">Drawn from your three sketches at one grid square per foot, with the road at the top of each plan as in the sketches. Pick a single floor to see furniture names and the furniture list.</p>
      <div className="bar">
        <div className="seg" role="group" aria-label="Floor">
          <button aria-pressed={floor === 'all'} onClick={() => setFloor('all')}>All floors</button>
          {plan.levels.map((l, i) => <button key={i} aria-pressed={floor === i} onClick={() => setFloor(i)}>{l.name.split(' ')[0]}</button>)}
        </div>
        <label className="chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Show 1′ grid and row numbers</label>
      </div>
      {floor === 'all' ? (
        <div className="plans">
          {plan.levels.map((l, i) => (
            <div className="card" key={i}><h3>{l.name}<span>{l.size}</span></h3><div className="drawing" dangerouslySetInnerHTML={{ __html: planSVG(compiled, i, { grid }) }} /></div>
          ))}
        </div>
      ) : (
        <div className="plans single">
          <div className="card"><h3>{plan.levels[floor].name}<span>furniture shown</span></h3><div className="drawing" dangerouslySetInnerHTML={{ __html: planSVG(compiled, floor, { grid, labels: true }) }} /></div>
          <div className="card sched"><h3>Furniture list</h3>
            {plan.schedule?.[floor].map(([room, list]) => <div key={room}><h4>{room}</h4><ul>{list.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
          </div>
        </div>
      )}
      <div className="legend">
        <span><i style={{ background: '#2b3138' }} />Wall</span>
        <span><i style={{ background: '#c8ccd0' }} />Parapet or railing</span>
        <span><i style={{ background: '#bcd9e2' }} />Window</span>
        <span><i style={{ background: '#fff', borderStyle: 'dashed' }} />Line of floor above</span>
        <span>Arc = door swing</span>
        <span>Arrow = stair going up</span>
      </div>
    </section>
  );
}

function Elevations() {
  const opts = useMemo(() => buildElevations(), []);
  return (
    <section>
      <p className="lead">Three directions for the road face, drawn to scale as seen from the road, so the first-floor washroom is on the right and the balcony and main door are on the left. Each one hides the washroom's soil and waste pipes inside the design (blue dashed line). None uses ovals or arches.</p>
      <div className="elevs">
        {opts.map((o) => (
          <div className="card" key={o.name}>
            <h3>{o.name}<span>{o.cost}</span></h3>
            <div className="drawing" dangerouslySetInnerHTML={{ __html: `<svg viewBox="-24 80 328 660" role="img" aria-label="Front elevation ${o.name}">${o.svg}</svg>` }} />
            <p><b>{o.tag}.</b> {o.text}</p>
            <dl><dt>Pipes</dt><dd>{o.pipes}</dd><dt>Materials</dt><dd>{o.mat}</dd></dl>
          </div>
        ))}
      </div>
    </section>
  );
}
