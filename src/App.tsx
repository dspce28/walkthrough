import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { compilePlan } from './plan/compile';
import { buildG2House } from './plan/houses/g2House';
import { planSVG } from './plan2d/planSvg';

const Viewer = lazy(() => import('./viewer/Viewer').then((m) => ({ default: m.Viewer })));

/** True while the element is (nearly) on screen. Used to load the 3D viewer lazily and pause it off screen. */
function useOnScreen<T extends Element>(margin = '200px') {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [margin]);
  return [ref, on] as const;
}

export default function App() {
  const compiled = useMemo(() => compilePlan(buildG2House()), []);
  const { plan } = compiled;
  const [stageRef, stageOn] = useOnScreen<HTMLDivElement>();
  const [loaded3d, setLoaded3d] = useState(false);
  useEffect(() => { if (stageOn) setLoaded3d(true); }, [stageOn]);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const bedrooms = plan.rooms.filter((r) => /bedroom/i.test(r.name)).length;

  return (
    <>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <a className="brand" href="#top" aria-label="G+2 Residence, back to top">
          <span className="brand-mark">G+2</span>
          <span className="brand-name">Residence</span>
        </a>
        <nav aria-label="Sections">
          <a href="#walkthrough">3D Walkthrough</a>
          <a href="#plans">Floor Plans</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}hero-hall.webp`} alt="" width={990} height={838} fetchPriority="high" />
          <span className="hero-caption">Main hall · real-time render</span>
        </div>
        <div className="hero-inner">
          <p className="eyebrow">Bespoke Interior Proposal</p>
          <h1>The G+2<br /><em>Residence</em></h1>
          <p className="hero-lede">Three levels of walnut, marble and brass. Walk through every room and see every finish before a single wall is built.</p>
          <div className="hero-cta">
            <a className="btn-gold" href="#walkthrough">Enter the walkthrough</a>
            <a className="btn-line" href="#plans">View floor plans</a>
          </div>
        </div>
        <dl className="stats">
          <div><dt>Levels</dt><dd>{plan.levels.length}</dd></div>
          <div><dt>Plot</dt><dd>12′ × 44′</dd></div>
          <div><dt>Bedrooms</dt><dd>{bedrooms}</dd></div>
          <div><dt>Roof</dt><dd>Open terrace</dd></div>
        </dl>
        <a className="scroll-cue" href="#walkthrough" aria-label="Scroll to the walkthrough"><span /></a>
      </section>

      <section className="section" id="walkthrough">
        <header className="section-head">
          <p className="eyebrow">Experience</p>
          <h2>3D Walkthrough</h2>
          <p className="section-lede">Step inside and walk freely, or let the guided tour lead you through all three floors.</p>
        </header>
        <div className="stage-wrap" ref={stageRef}>
          {loaded3d ? (
            <Suspense fallback={<div className="stage stage-placeholder" />}>
              <Viewer compiled={compiled} active={stageOn} />
            </Suspense>
          ) : <div className="stage stage-placeholder" />}
        </div>
      </section>

      <section className="section" id="plans">
        <header className="section-head">
          <p className="eyebrow">Architecture</p>
          <h2>Floor Plans</h2>
          <p className="section-lede">Drawn to scale at one square per foot, with the road at the top of each sheet.</p>
        </header>
        <div className="plans">
          {plan.levels.map((l, i) => (
            <figure className="plan-card" key={i}>
              <figcaption>
                <span className="plan-index">0{i + 1}</span>
                <span className="plan-name">{l.name}</span>
                <span className="plan-size">{l.size}</span>
              </figcaption>
              <div className="drawing" dangerouslySetInnerHTML={{ __html: planSVG(compiled, i) }} />
            </figure>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span className="brand-mark">G+2</span>
        <p>Residence · Interior proposal · Visualisation is indicative; finishes and furniture are subject to final selection.</p>
      </footer>
    </>
  );
}
