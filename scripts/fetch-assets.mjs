#!/usr/bin/env node
/**
 * Downloads the CC0 assets the 3D viewer uses from Poly Haven (https://polyhaven.com, licence CC0)
 * and writes compact web versions into public/assets:
 *   models/<id>.glb     glTF 1k -> GLB, textures resized to <=1024 and re-encoded as WebP
 *   textures/<id>/*.jpg PBR texture sets (diffuse, normal, roughness) at 1k
 *   hdri/<id>.hdr       environment light at 1k
 *
 * Usage: node scripts/fetch-assets.mjs            (skips files that already exist)
 *        node scripts/fetch-assets.mjs --force
 */
import { mkdir, writeFile, access, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public', 'assets');
const FORCE = process.argv.includes('--force');

export const MODELS = [
  'Sofa_01', 'sofa_03', 'ArmChair_01', 'GreenChair_01', 'Chandelier_01', 'ClassicConsole_01',
  'GothicCommode_01', 'Ottoman_01', 'vintage_cabinet_01', 'modern_wooden_cabinet', 'modern_coffee_table_01',
  'round_wooden_table_01', 'side_table_tall_01', 'outdoor_table_chair_set_01', 'modern_arm_chair_01',
  'mid_century_lounge_chair', 'bar_chair_round_01', 'potted_plant_02', 'potted_plant_04',
  'fancy_picture_frame_01', 'hanging_picture_frame_02', 'brass_diya_lantern', 'brass_vase_01', 'ceramic_vase_01',
  'throw_pillows_01', 'wall_clock', 'desk_lamp_arm_01', 'planter_box_01',
  'wicker_basket_01', 'modern_ceiling_lamp_01', 'vintage_microwave', 'painted_wooden_sofa', 'dining_chair_02',
];

/** Models that are too dense for real-time use get decimated: [fraction of triangles kept, max error]. */
const SIMPLIFY = {
  potted_plant_02: [0.12, 0.02], potted_plant_04: [0.3, 0.01], vintage_cabinet_01: [0.3, 0.002], Chandelier_01: [0.4, 0.002],
  desk_lamp_arm_01: [0.4, 0.002], wicker_basket_01: [0.15, 0.01], brass_vase_01: [0.4, 0.002], modern_wooden_cabinet: [0.4, 0.002],
  bar_chair_round_01: [0.25, 0.01], brass_diya_lantern: [0.4, 0.002], ceramic_vase_01: [0.4, 0.002],
};

/** Hero pieces also get a 2K-texture version for desktop (High quality). Phones keep the 1K files. */
export const HIRES = [
  'Sofa_01', 'sofa_03', 'ArmChair_01', 'GreenChair_01', 'Chandelier_01', 'ClassicConsole_01', 'vintage_cabinet_01',
  'modern_coffee_table_01', 'GothicCommode_01', 'Ottoman_01', 'modern_wooden_cabinet', 'throw_pillows_01', 'potted_plant_02',
  'round_wooden_table_01', 'modern_arm_chair_01', 'mid_century_lounge_chair', 'side_table_tall_01', 'bar_chair_round_01',
  'painted_wooden_sofa', 'outdoor_table_chair_set_01',
];

export const TEXTURES = [
  'marble_01', 'herringbone_parquet', 'oak_wood_planks', 'floor_tiles_06', 'large_grey_tiles', 'patio_tiles',
  'wood_floor_deck', 'plastered_wall', 'dark_wood', 'granite_tile', 'grey_tiles',
  // Modern Luxe joinery and upholstery
  'white_oak_veneer', 'grey_oak_veneer_01', 'wool_boucle', 'velour_velvet',
];

export const HDRIS = ['kloofendal_43d_clear_puresky', 'brown_photostudio_02'];
/** City skyline seen through windows; 2K so the skyline stays sharp as a background. */
export const HDRIS_2K = ['homecoming_center_rooftop'];

const api = (p) => fetch(`https://api.polyhaven.com/${p}`).then((r) => {
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
});
async function exists(p) { try { await access(p); return true; } catch { return false; } }
async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

async function model(id, hires = false) {
  const dest = path.join(OUT, hires ? 'models-2k' : 'models', `${id}.glb`);
  if (!FORCE && await exists(dest)) return 'skip';
  const files = await api(`files/${id}`);
  const g = hires ? (files.gltf?.['2k']?.gltf ?? files.gltf?.['1k']?.gltf) : (files.gltf?.['1k']?.gltf ?? files.gltf?.['2k']?.gltf);
  if (!g) throw new Error(`${id}: no glTF download`);
  const tmp = path.join(os.tmpdir(), `ph-${id}${hires ? '-2k' : ''}`);
  await rm(tmp, { recursive: true, force: true });
  const main = path.join(tmp, path.basename(new URL(g.url).pathname));
  await download(g.url, main);
  for (const [rel, f] of Object.entries(g.include ?? {})) await download(f.url, path.join(tmp, rel));
  await mkdir(path.dirname(dest), { recursive: true });
  const cli = path.join(ROOT, 'node_modules', '.bin', 'gltf-transform');
  execFileSync(cli, ['optimize', main, dest, '--compress', 'false', '--texture-compress', 'webp',
    '--texture-size', hires ? '2048' : '1024',
    ...(SIMPLIFY[id] ? ['--simplify', 'true', '--simplify-ratio', String(SIMPLIFY[id][0]), '--simplify-error', String(SIMPLIFY[id][1])] : ['--simplify', 'false']), '--instance', 'false', '--flatten', 'false'], { stdio: 'pipe' });
  await rm(tmp, { recursive: true, force: true });
  return 'ok';
}

const TEX_MAPS = { Diffuse: 'diff', nor_gl: 'nor', Rough: 'rough' };
async function texture(id) {
  const files = await api(`files/${id}`);
  let n = 0;
  for (const [key, short] of Object.entries(TEX_MAPS)) {
    const f = files[key]?.['1k']?.jpg;
    if (!f) continue;
    const dest = path.join(OUT, 'textures', id, `${short}.jpg`);
    if (!FORCE && await exists(dest)) continue;
    await download(f.url, dest); n++;
  }
  return n ? 'ok' : 'skip';
}

async function hdri(id, res = '1k') {
  const dest = path.join(OUT, 'hdri', `${id}.hdr`);
  if (!FORCE && await exists(dest)) return 'skip';
  const files = await api(`files/${id}`);
  await download(files.hdri[res].hdr.url, dest);
  return 'ok';
}

const jobs = [
  ...MODELS.map((id) => ['model', id, model]),
  ...HIRES.map((id) => ['model2k', id, (i) => model(i, true)]),
  ...TEXTURES.map((id) => ['texture', id, texture]),
  ...HDRIS.map((id) => ['hdri', id, hdri]),
  ...HDRIS_2K.map((id) => ['hdri', id, (i) => hdri(i, '2k')]),
];
let failed = 0;
const queue = [...jobs];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const [kind, id, fn] = queue.shift();
    try { console.log(`${kind.padEnd(8)} ${id.padEnd(30)} ${await fn(id)}`); }
    catch (e) { failed++; console.error(`${kind.padEnd(8)} ${id.padEnd(30)} FAILED ${e.message}`); }
  }
}));
if (failed) { console.error(`${failed} asset(s) failed`); process.exit(1); }
