import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL + 'assets/';
const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();

function tex(id: string, map: 'diff' | 'nor' | 'rough', repeatFt: number): THREE.Texture {
  const key = `${id}/${map}/${repeatFt}`;
  let t = texCache.get(key);
  if (!t) {
    t = loader.load(`${BASE}textures/${id}/${map}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (map === 'diff') t.colorSpace = THREE.SRGBColorSpace;
    // geometry UVs are in feet; scale so one texture tile covers repeatFt feet
    t.repeat.set(1 / repeatFt, 1 / repeatFt);
    texCache.set(key, t);
  }
  return t;
}

/** PBR set from a Poly Haven texture. Geometry UVs must be in world feet. */
function pbr(id: string, tileFt: number, o: Omit<THREE.MeshStandardMaterialParameters, 'normalScale'> & { noRough?: boolean; normalScale?: number } = {}) {
  const { noRough, normalScale, ...rest } = o;
  const m = new THREE.MeshStandardMaterial({
    map: tex(id, 'diff', tileFt), normalMap: tex(id, 'nor', tileFt), roughnessMap: noRough ? null : tex(id, 'rough', tileFt), ...rest,
  });
  m.normalScale.setScalar(normalScale ?? 1);
  return m;
}

const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

/** Lazily created, shared materials. Keys are used by architecture boxes and procedural furniture. */
const makers: Record<string, () => THREE.Material> = {
  // architecture
  wall: () => pbr('plastered_wall', 6, { color: '#f6efe0', roughness: 0.92, normalScale: 0.35 }),
  ceiling: () => std('#f7f4ec', 0.95, 0, { emissive: '#3a3630' }),
  slab: () => std('#f2eee4', 0.95, 0, { emissive: '#3a3630' }),
  slabGround: () => pbr('patio_tiles', 6, { color: '#d9d3c4' }),
  coping: () => std('#efe9dc', 0.6),
  ceilingBand: () => std('#f7f5f0', 0.85, 0, { emissive: '#3a3630' }),
  stairCore: () => std('#ece6d8', 0.9),
  tread: () => pbr('granite_tile', 3, { color: '#8a8580', roughness: 0.35, noRough: true }),
  frame: () => pbr('dark_wood', 3, { color: '#9a8270' }),
  door: () => pbr('dark_wood', 3, { color: '#a48a74' }),
  doorPanel: () => pbr('dark_wood', 3, { color: '#b39a82' }),
  railing: () => std('#f3efe6', 0.5),
  curtain: () => std('#c4a77a', 0.95, 0, { side: THREE.DoubleSide }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: '#cfe4ea', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }),
  // floors
  'floor:marble': () => pbr('marble_01', 4, { roughness: 0.12, noRough: true, envMapIntensity: 1.2 }),
  'floor:wood': () => pbr('herringbone_parquet', 4, { color: '#e0c6a6', envMapIntensity: 0.8 }),
  'floor:tile': () => pbr('floor_tiles_06', 3, { color: '#f2f2ee', envMapIntensity: 1 }),
  'floor:tile2': () => pbr('large_grey_tiles', 5, { color: '#ece6da', envMapIntensity: 1 }),
  'floor:stone': () => pbr('patio_tiles', 5, { color: '#e3dccd' }),
  'floor:deck': () => pbr('wood_floor_deck', 5, { color: '#d9b892' }),
  // furniture
  walnut: () => pbr('dark_wood', 3, { color: '#a08670' }),
  walnutD: () => pbr('dark_wood', 3, { color: '#6f5c4c' }),
  teak: () => pbr('oak_wood_planks', 4, { color: '#c9a27c' }),
  cab: () => std('#ebe2cf', 0.45),
  cabEdge: () => std('#e1d6bf', 0.5),
  granite: () => std('#1d1c1c', 0.18, 0, { envMapIntensity: 1.4 }),
  marbleTop: () => pbr('marble_01', 3, { roughness: 0.1, noRough: true }),
  brass: () => std('#c9a24a', 0.3, 1),
  gold: () => std('#d9b04f', 0.22, 1),
  chrome: () => std('#e4e8eb', 0.08, 1),
  steel: () => std('#c2c6c9', 0.32, 0.9),
  black: () => std('#141416', 0.25),
  screen: () => std('#07080a', 0.08, 0, { envMapIntensity: 2 }),
  ceramic: () => new THREE.MeshPhysicalMaterial({ color: '#f8f7f3', roughness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
  mirror: () => std('#e6eef0', 0.02, 1),
  linen: () => std('#efe6d4', 0.95),
  sheet: () => std('#f6f3ec', 0.95),
  sage: () => std('#7c8e70', 0.92),
  burgundy: () => std('#7c2f37', 0.9),
  navy: () => std('#2f4159', 0.9),
  terracotta: () => std('#b86a45', 0.85),
  concrete: () => std('#8d8a84', 0.85),
  soil: () => std('#3b2a1e', 1),
  white: () => std('#f4f2ec', 0.45),
  plastic: () => std('#f1f1ef', 0.35),
  tank: () => std('#3d5966', 0.5),
  tileWall: () => pbr('grey_tiles', 2, { color: '#eef1f1', roughness: 0.2, noRough: true }),
  glow: () => std('#fff3d6', 0.4, 0, { emissive: '#ffd79a', emissiveIntensity: 6, toneMapped: false }),
  shade: () => std('#f3e7c8', 0.9, 0, { emissive: '#ffcf86', emissiveIntensity: 0.9, side: THREE.DoubleSide }),
  leaf: () => std('#4f7a44', 0.7),
  rope: () => std('#c8b48a', 1),
};

const cache = new Map<string, THREE.Material>();
export function getMat(key: string): THREE.Material {
  let m = cache.get(key);
  if (!m) {
    const make = makers[key];
    if (!make) throw new Error(`unknown material ${key}`);
    m = make();
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

/** Canvas texture for a bordered Persian-style rug. */
export function rugMaterial(kind: 'burgundy' | 'blue', w: number, d: number): THREE.MeshStandardMaterial {
  const key = `rug:${kind}:${w}x${d}`;
  const hit = cache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (hit) return hit;
  const px = 64, cw = Math.round(w * px), ch = Math.round(d * px);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d')!;
  const [base, field, accent, light] = kind === 'blue' ? ['#2c4664', '#d8ccb0', '#8f3b3b', '#efe5cf'] : ['#7a2730', '#e2cfa6', '#24425e', '#f2e6cc'];
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = base; g.fillRect(0, 0, cw, ch);
  const inset = (t: number, col: string) => { g.fillStyle = col; g.fillRect(t, t, cw - 2 * t, ch - 2 * t); };
  inset(18, light); inset(24, base); inset(60, accent); inset(66, field);
  // border motifs
  g.fillStyle = light;
  for (let x = 34; x < cw - 34; x += 22) { g.beginPath(); g.arc(x, 42, 6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, ch - 42, 6, 0, Math.PI * 2); g.fill(); }
  for (let y = 34; y < ch - 34; y += 22) { g.beginPath(); g.arc(42, y, 6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cw - 42, y, 6, 0, Math.PI * 2); g.fill(); }
  // central medallion and field pattern
  g.save(); g.translate(cw / 2, ch / 2);
  for (let i = 0; i < 4; i++) { g.fillStyle = [base, light, accent, base][i]; const s = Math.min(cw, ch) * (0.32 - i * 0.07); g.beginPath(); g.moveTo(0, -s * 1.3); g.lineTo(s, 0); g.lineTo(0, s * 1.3); g.lineTo(-s, 0); g.closePath(); g.fill(); }
  g.restore();
  g.strokeStyle = 'rgba(80,40,30,0.25)'; g.lineWidth = 2;
  for (let x = 90; x < cw - 90; x += 40) for (let y = 90; y < ch - 90; y += 40) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.stroke(); }
  // wool noise
  const img = g.getImageData(0, 0, cw, ch);
  for (let i = 0; i < img.data.length; i += 4) { const n = (rnd() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1 });
  cache.set(key, m);
  return m;
}

/** Simple painted-canvas artwork texture. */
export function artMaterial(kind: string): THREE.MeshStandardMaterial {
  const key = `art:${kind}`;
  const hit = cache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  const pal: Record<string, string[]> = {
    art1: ['#49685d', '#a9b89a', '#e9dfc6', '#2b3b34', '#c9a24a'],
    art2: ['#8a4b3a', '#d9a273', '#efe1c8', '#4a2a22', '#3e5a6b'],
    art3: ['#2f4159', '#8aa3b8', '#e8e0cd', '#1b2533', '#c9a24a'],
  };
  const p = pal[kind] ?? pal.art1;
  let seed = kind.length * 97; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = p[2]; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = p[i % 5]; g.globalAlpha = 0.55 + rnd() * 0.4;
    g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 30 + rnd() * 90, 20 + rnd() * 60, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1; g.fillStyle = p[3]; g.fillRect(0, 196, 256, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  cache.set(key, m);
  return m;
}
