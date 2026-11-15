import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Export the built house (architecture + merged furniture, no site or lights) as GLB for the offline
 * light bake (scripts/bake). Triggered by `?export`; the result is left on window for automation.
 */
export async function exportHouse(scene: THREE.Scene): Promise<ArrayBuffer> {
  scene.updateMatrixWorld(true);
  const out = new THREE.Scene();
  const TAG = /^(arch|furn)\|/;
  let n = 0;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // a mesh is exported if it, or a group above it, carries an arch|/furn| name
    let tagged: THREE.Object3D | null = m;
    while (tagged && !TAG.test(tagged.name)) tagged = tagged.parent;
    if (!tagged) return;
    const c = new THREE.Mesh(m.geometry, m.material);
    c.name = tagged === m ? m.name : `${tagged.name}|${n++}`;
    m.matrixWorld.decompose(c.position, c.quaternion, c.scale);
    out.add(c);
  });
  return (await new GLTFExporter().parseAsync(out, { binary: true, onlyVisible: false })) as ArrayBuffer;
}
