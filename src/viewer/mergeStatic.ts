import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Bakes every mesh under `root` into one mesh per material (transforms applied), so a floor full of
 * furniture costs tens of draw calls instead of hundreds. Only position/normal/uv are kept.
 */
export function mergeStatic(root: THREE.Object3D): THREE.Group {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const m4 = new THREE.Matrix4();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const src = mesh.geometry;
    if (!src.attributes.position) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.attributes.position.clone());
    g.setAttribute('normal', src.attributes.normal ? src.attributes.normal.clone() : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 3), 3));
    g.setAttribute('uv', src.attributes.uv ? src.attributes.uv.clone() : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (src.index) g.setIndex(src.index.clone());
    else g.setIndex(Array.from({ length: src.attributes.position.count }, (_, i) => i));
    if (!src.attributes.normal) g.computeVertexNormals();
    // geometry groups (multi-material) are not expected here; drop them
    g.applyMatrix4(m4.multiplyMatrices(inv, mesh.matrixWorld));
    if (m4.determinant() < 0) {
      // mirrored instance: flip winding so faces stay front-facing
      const idx = g.index!;
      for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); }
    }
    const mat = mesh.material as THREE.Material;
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat)!.push(g);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    const transparent = (mat as THREE.MeshStandardMaterial).transparent;
    mesh.castShadow = !transparent;
    mesh.receiveShadow = true;
    if (transparent) mesh.renderOrder = 5;
    out.add(mesh);
  }
  return out;
}
