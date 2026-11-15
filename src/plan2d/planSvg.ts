import type { CompiledPlan } from '../plan/compile';
import { itemFootprint } from '../plan/compile';
import type { Item } from '../plan/types';

const FCOL: Record<string, string> = { marble: '#f3efe6', wood: '#ecdcc0', tile: '#dfeaec', tile2: '#e9e6dd', stone: '#e1dfd6', deck: '#e9dcc6' };
const ITEM_FILL: Partial<Record<Item['type'], string>> = {
  sofa: '#c9d1c1', armchair: '#c9d1c1', loungeChair: '#d8c4a6', visitorChair: '#d8c4a6', officeChair: '#c7a2a5', diningChair: '#b9c6b0', barStool: '#c7a2a5', bench: '#c9d1c1',
  bed: '#f3eee4', rug: '#e3c9c9', wc: '#ffffff', vanity: '#e8e1d6', shower: '#dfeaec', counter: '#ece6d8', fridge: '#d9dcde', washingMachine: '#ffffff', waterTank: '#c5ccd0',
  plant: '#b9d1ad', planter: '#d6b8a6', pergola: 'none', swing: '#d8c4a6',
};
const SKIP = new Set<Item['type']>(['chandelier', 'pendant', 'clock', 'art', 'microwave', 'wallTv']);
const ROUND = new Set<Item['type']>(['roundTable', 'barStool', 'plant', 'sideTable']);
const f2 = (v: number) => Math.round(v * 100) / 100;

export function planSVG(c: CompiledPlan, L: number, o: { grid?: boolean; labels?: boolean; mini?: boolean } = {}): string {
  const { plan } = c, s: string[] = [];
  const vb = o.mini ? '-1.4 -5.4 14.8 50.8' : '-2.6 -6.6 17.2 53.6';
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${plan.levels[L].name} plan">`);
  const R = (x1: number, y1: number, x2: number, y2: number, fill: string, st?: string, sw = 0.04, ex = '') =>
    `<rect x="${f2(x1)}" y="${f2(y1)}" width="${f2(x2 - x1)}" height="${f2(y2 - y1)}" fill="${fill}"${st ? ` stroke="${st}" stroke-width="${sw}"` : ''}${ex}/>`;

  for (const sl of plan.slabs) if (sl.level === L) s.push(R(Math.max(sl.rect[0], -1), sl.rect[1], Math.min(sl.rect[2], 13), sl.rect[3], '#ffffff'));
  for (const f of plan.floors) if (f.level === L) s.push(R(f.rect[0], f.rect[1], f.rect[2], f.rect[3], FCOL[f.finish]));
  // stair from the floor below seen through the stairwell
  if (L > 0) for (const b of c.boxes) if (b.level === L - 1 && b.cat === 'stair' && b.mat === 'tread' && b.x1 >= 9) s.push(R(b.x1, b.y1, b.x2, b.y2, '#f1f1ee', '#9aa0a6', 0.03));

  if (!o.mini) {
    const items = plan.items.filter((it) => it.level === L && !SKIP.has(it.type)).sort((a, b) => (a.type === 'rug' ? -1 : 0) - (b.type === 'rug' ? -1 : 0));
    for (const it of items) {
      const [x1, y1, x2, y2] = itemFootprint(it), fill = ITEM_FILL[it.type] ?? '#d9c7b0';
      if (it.type === 'pergola') { continue; }
      if (ROUND.has(it.type)) s.push(`<circle cx="${f2((x1 + x2) / 2)}" cy="${f2((y1 + y2) / 2)}" r="${f2(Math.min(x2 - x1, y2 - y1) / 2 * 0.9)}" fill="${fill}" stroke="#3c4248" stroke-width="0.035"/>`);
      else s.push(R(x1, y1, x2, y2, fill, '#3c4248', it.type === 'rug' ? 0.02 : 0.035, ` rx="${it.type === 'rug' ? 0 : 0.12}"`));
      if (it.type === 'bed') {
        // pillows towards the headboard
        const hx = it.rot === 3 ? x1 : it.rot === 1 ? x2 : null;
        if (hx !== null) { const dir = it.rot === 3 ? 1 : -1; s.push(R(Math.min(hx + dir * 0.4, hx + dir * 1.6), y1 + 0.4, Math.max(hx + dir * 0.4, hx + dir * 1.6), y2 - 0.4, '#ffffff', '#3c4248', 0.025)); }
      }
    }
  }
  for (const b of c.boxes) if (b.level === L && b.cat === 'stair' && b.mat === 'tread') s.push(R(b.x1, b.y1, b.x2, b.y2, '#fbfaf6', '#6b7178', 0.035));
  for (const b of c.boxes) if (b.level === L && (b.cat === 'wall' || b.cat === 'sill') && b.mat === 'wall' && b.z1 - L * plan.floorHeight > 6) s.push(R(b.x1, b.y1, b.x2, b.y2, '#2b3138'));
  for (const b of c.boxes) if (b.level === L && b.cat === 'wall' && b.mat === 'wall' && b.z1 - L * plan.floorHeight <= 6) s.push(R(b.x1, b.y1, b.x2, b.y2, '#c8ccd0', '#2b3138', 0.04));
  for (const r of plan.railings) if (r.level === L) s.push(r.axis === 'h' ? R(r.a1, r.t - 0.15, r.a2, r.t + 0.15, '#c8ccd0', '#2b3138', 0.04) : R(r.t - 0.15, r.a1, r.t + 0.15, r.a2, '#c8ccd0', '#2b3138', 0.04));
  for (const w of c.windows) {
    if (w.level !== L) continue;
    const a = w.axis === 'h', tm = (w.t1 + w.t2) / 2;
    s.push(a ? R(w.oa, w.t1, w.ob, w.t2, '#bcd9e2', '#2b3138', 0.05) : R(w.t1, w.oa, w.t2, w.ob, '#bcd9e2', '#2b3138', 0.05));
    s.push(a ? `<line x1="${w.oa}" y1="${tm}" x2="${w.ob}" y2="${tm}" stroke="#2b3138" stroke-width="0.05"/>` : `<line x1="${tm}" y1="${w.oa}" x2="${tm}" y2="${w.ob}" stroke="#2b3138" stroke-width="0.05"/>`);
  }
  for (const d of c.doors) {
    if (d.level !== L) continue;
    const a = d.axis === 'h';
    if (d.slider) {
      s.push(a ? R(d.oa, d.t1, d.ob, d.t2, '#ffffff') : R(d.t1, d.oa, d.t2, d.ob, '#ffffff'));
      const tm = (d.t1 + d.t2) / 2, w = d.ob - d.oa;
      s.push(a ? `<line x1="${d.oa + w / 2}" y1="${tm}" x2="${d.ob + w / 2}" y2="${tm}" stroke="#3b8fa8" stroke-width="0.12"/>` : `<line x1="${tm}" y1="${d.oa + w / 2}" x2="${tm}" y2="${d.ob + w / 2}" stroke="#3b8fa8" stroke-width="0.12"/>`);
      continue;
    }
    const leaf = (hA: number, len: number, dir: number) => {
      const te = d.swing > 0 ? d.t2 : d.t1, pts: number[][] = [];
      for (let i = 0; i <= 8; i++) { const th = i / 8 * Math.PI / 2, da = Math.sin(th) * dir * len, dt = Math.cos(th) * d.swing * len; pts.push(a ? [hA + da, te + dt] : [te + dt, hA + da]); }
      const H = a ? [hA, te] : [te, hA];
      return `<path d="M${f2(H[0])} ${f2(H[1])} L${pts.map((q) => `${f2(q[0])} ${f2(q[1])}`).join(' L')}" fill="none" stroke="#2b3138" stroke-width="0.05"/><line x1="${f2(H[0])}" y1="${f2(H[1])}" x2="${f2(pts[0][0])}" y2="${f2(pts[0][1])}" stroke="#2b3138" stroke-width="0.09"/>`;
    };
    s.push(a ? R(d.oa, d.t1, d.ob, d.t2, '#ffffff', '#2b3138', 0.03) : R(d.t1, d.oa, d.t2, d.ob, '#ffffff', '#2b3138', 0.03));
    if (!o.mini) {
      if (d.double) { s.push(leaf(d.oa, d.width / 2, 1)); s.push(leaf(d.ob, d.width / 2, -1)); }
      else if (d.hinge === 'a1') s.push(leaf(d.oa, d.width, 1)); else s.push(leaf(d.ob, d.width, -1));
    }
  }
  for (const d of plan.dashed) if (d.level === L) s.push(R(d.rect[0], d.rect[1], d.rect[2], d.rect[3], 'none', '#2b3138', 0.05, ' stroke-dasharray="0.3 0.2"'));
  for (const ar of plan.stairArrows) {
    if (ar.level !== L) continue;
    const p = ar.pts, e = p[p.length - 1], q = p[p.length - 2];
    let dx = e[0] - q[0], dy = e[1] - q[1]; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
    s.push(`<path d="M${p.map((v) => `${v[0]} ${v[1]}`).join(' L')}" fill="none" stroke="#175f73" stroke-width="0.09"/><path d="M${e[0]} ${e[1]} L${f2(e[0] - dx * 0.6 - dy * 0.3)} ${f2(e[1] - dy * 0.6 + dx * 0.3)} L${f2(e[0] - dx * 0.6 + dy * 0.3)} ${f2(e[1] - dy * 0.6 - dx * 0.3)} Z" fill="#175f73"/>`);
    if (!o.mini) s.push(`<text x="${p[0][0] + 2.4}" y="${p[0][1] - 0.5}" font-size="0.48" font-family="IBM Plex Mono,monospace" fill="#175f73" text-anchor="middle">UP</text>`);
  }
  if (o.mini) {
    s.push('<circle id="mm-dot" cx="6" cy="0" r="0.8" fill="#d13b2e" stroke="#fff" stroke-width="0.2"/><line id="mm-dir" x1="6" y1="0" x2="6" y2="2" stroke="#d13b2e" stroke-width="0.35"/></svg>');
    return s.join('');
  }
  const T = 'font-family="Barlow Condensed,Arial Narrow,sans-serif" text-anchor="middle" paint-order="stroke" stroke="#ffffff" stroke-linejoin="round"';
  const [ex1, ey1, ex2, ey2] = plan.extents[L];
  if (o.grid) {
    for (let x = ex1; x <= ex2; x++) s.push(`<line x1="${x}" y1="${ey1}" x2="${x}" y2="${ey2}" stroke="#175f73" stroke-opacity="0.28" stroke-width="0.025"/>`);
    for (let y = ey1; y <= ey2; y++) s.push(`<line x1="${ex1}" y1="${y}" x2="${ex2}" y2="${y}" stroke="#175f73" stroke-opacity="0.28" stroke-width="0.025"/>`);
    for (let r = 1; r <= ey2; r++) s.push(`<text x="-1.7" y="${r - 0.33}" font-size="0.42" font-family="IBM Plex Mono,monospace" fill="#586470" text-anchor="middle">${r}</text>`);
    for (let col = 1; col <= ex2; col++) s.push(`<text x="${col - 0.5}" y="${ey1 - 0.3}" font-size="0.42" font-family="IBM Plex Mono,monospace" fill="#586470" text-anchor="middle">${col}</text>`);
  }
  if (o.labels) for (const it of plan.items) {
    if (it.level !== L || !it.label) continue;
    const [x1, y1, x2, y2] = itemFootprint(it);
    s.push(`<text x="${f2((x1 + x2) / 2)}" y="${f2((y1 + y2) / 2 + 0.13)}" font-size="0.4" font-weight="500" stroke-width="0.14" fill="#3a2a1c" ${T}>${it.label}</text>`);
  }
  for (const r of plan.rooms) {
    if (r.level !== L) continue;
    const [x1, y1, x2, y2] = r.rect, small = x2 - x1 < 5 || y2 - y1 < 5, fs = small ? 0.52 : 0.95;
    const [lx, ly] = r.label ?? [(x1 + x2) / 2, (y1 + y2) / 2];
    s.push(`<text x="${lx}" y="${ly}" font-size="${fs}" font-weight="700" stroke-width="${small ? 0.16 : 0.22}" fill="#1b2530" ${T}>${r.name.toUpperCase()}</text>`);
    s.push(`<text x="${lx}" y="${ly + (small ? 0.55 : 0.8)}" font-size="${small ? 0.38 : 0.5}" stroke-width="0.14" fill="#586470" font-family="IBM Plex Mono,monospace" text-anchor="middle" paint-order="stroke" stroke="#ffffff">${r.dim}</text>`);
  }
  s.push('<text x="6" y="-5.75" font-size="0.6" font-weight="600" fill="#586470" font-family="Barlow Condensed,Arial Narrow,sans-serif" text-anchor="middle" letter-spacing="0.2">ROAD SIDE (FRONT)</text>');
  const bot = L === 0 ? ey2 + 1 : ey2;
  s.push(`<line x1="${ex1}" y1="${bot + 0.7}" x2="${ex2}" y2="${bot + 0.7}" stroke="#586470" stroke-width="0.04"/><line x1="${ex1}" y1="${bot + 0.45}" x2="${ex1}" y2="${bot + 0.95}" stroke="#586470" stroke-width="0.04"/><line x1="${ex2}" y1="${bot + 0.45}" x2="${ex2}" y2="${bot + 0.95}" stroke="#586470" stroke-width="0.04"/>`);
  s.push(`<text x="${(ex1 + ex2) / 2}" y="${bot + 1.45}" font-size="0.5" fill="#586470" font-family="IBM Plex Mono,monospace" text-anchor="middle">${ex2 - ex1}′ clear width</text>`);
  s.push(`<line x1="13.7" y1="${ey1}" x2="13.7" y2="${ey2}" stroke="#586470" stroke-width="0.04"/><line x1="13.45" y1="${ey1}" x2="13.95" y2="${ey1}" stroke="#586470" stroke-width="0.04"/><line x1="13.45" y1="${ey2}" x2="13.95" y2="${ey2}" stroke="#586470" stroke-width="0.04"/>`);
  s.push(`<text transform="translate(14.35 ${(ey1 + ey2) / 2}) rotate(90)" font-size="0.5" fill="#586470" font-family="IBM Plex Mono,monospace" text-anchor="middle">${ey2 - ey1}′${L === 0 ? ' incl. wash yard' : ' incl. front extension'}</text>`);
  s.push('</svg>');
  return s.join('');
}
