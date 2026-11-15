import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { getMat } from './materials';

/**
 * Baked architecture produced offline by scripts/bake/bake.py (Blender Cycles).
 *
 * Walls, floors, ceilings and stairs carry a second UV set and a lightmap holding the path-traced
 * light (sun, sky, every fixture, bounce light and the furniture's shadows). They are drawn with an
 * unlit material, colour = albedo × baked light, which is exactly what Cycles computed, so real-time
 * lights cannot wash it out. Furniture keeps its real-time PBR lighting.
 */
export interface BakeMeta { levels: { level: number; image: string; scale: number }[] }

const baseUrl = (planId: string) => `${import.meta.env.BASE_URL}baked/${planId}/`;

/** Resolves to the bake metadata if this plan has been baked, otherwise null. */
export function useBakeMeta(planId: string): BakeMeta | null | undefined {
  const [meta, setMeta] = useState<BakeMeta | null | undefined>(undefined);
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    // ?export must capture the plain architecture, so it never loads an existing bake
    if (qs.has('nobake') || qs.has('export')) { setMeta(null); return; }
    let live = true;
    fetch(baseUrl(planId) + 'bake.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((m) => { if (live) setMeta(m && Array.isArray(m.levels) ? m : null); });
    return () => { live = false; };
  }, [planId]);
  return meta;
}

const texLoader = new THREE.TextureLoader();
/** Overall brightness of baked light in the browser (1 = exactly what Cycles computed). */
const BAKE_EXPOSURE = 1.75;

export function BakedArchitecture({ planId, meta, visibleLevels }: { planId: string; meta: BakeMeta; visibleLevels: number }) {
  const { scene } = useGLTF(baseUrl(planId) + 'baked.glb');
  const root = useMemo(() => {
    const lightmaps = new Map<number, { tex: THREE.Texture; scale: number }>();
    for (const l of meta.levels) {
      const tex = texLoader.load(baseUrl(planId) + l.image);
      tex.flipY = false;               // glTF UV convention
      tex.channel = 1;                 // second UV set (TEXCOORD_1)
      tex.colorSpace = THREE.SRGBColorSpace;
      // no mipmaps: lightmap islands are tightly packed and mip levels bleed dark texels across seams
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      lightmaps.set(l.level, { tex, scale: l.scale });
    }
    const o = scene.clone(true);
    const mats = new Map<string, THREE.Material>();
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      let p: THREE.Object3D | null = mesh, level = -1;
      while (p && level < 0) { const m = /L(\d+)/.exec(p.name); if (m) level = +m[1]; p = p.parent; }
      const lm = lightmaps.get(level);
      mesh.userData.level = level;
      const key = (mesh.material as THREE.Material).name.replace(/\.\d+$/, '');
      const cacheKey = `${level}:${key}`;
      // emitters (LED strips) stay self-lit rather than albedo × lightmap
      if (key === 'glow') { mesh.material = getMat('glow'); return; }
      if (!mats.has(cacheKey)) {
        let src: THREE.MeshStandardMaterial | null = null;
        try { src = getMat(key) as THREE.MeshStandardMaterial; } catch { src = null; }
        mats.set(cacheKey, new THREE.MeshBasicMaterial({
          name: key,
          color: src?.color ?? new THREE.Color('#ffffff'),
          map: src?.map ?? null,
          aoMap: src?.aoMap ?? null,
          aoMapIntensity: src?.aoMapIntensity ?? 1,
          lightMap: lm?.tex ?? null,
          // Cycles' diffuse light pass is radiance for a white surface; three divides lightmaps by π
          lightMapIntensity: (lm?.scale ?? 1) * Math.PI * BAKE_EXPOSURE,
        }));
      }
      mesh.material = mats.get(cacheKey)!;
      mesh.castShadow = true; mesh.receiveShadow = false;
    });
    return o;
  }, [scene, meta, planId]);

  useEffect(() => {
    root.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.visible = (n.userData.level as number) <= visibleLevels; });
  }, [root, visibleLevels]);

  return <primitive object={root} />;
}
