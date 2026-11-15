import * as THREE from 'three';

/**
 * Builds one merged BufferGeometry from many axis-aligned boxes, with UVs in world feet
 * so tiling textures line up across neighbouring boxes. Coordinates are three.js space
 * (X = plan x, Y = height, Z = plan y).
 */
export interface AABB { x1: number; x2: number; y1: number; y2: number; z1: number; z2: number }

export function mergedBoxes(boxes: AABB[], opts: { skipBottom?: boolean } = {}): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const quad = (p: number[][], n: number[], uvs: number[][]) => {
    const base = pos.length / 3;
    for (let i = 0; i < 4; i++) { pos.push(...p[i]); nor.push(...n); uv.push(...uvs[i]); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (const b of boxes) {
    const { x1, x2, y1, y2, z1, z2 } = b;
    if (x2 - x1 < 1e-4 || y2 - y1 < 1e-4 || z2 - z1 < 1e-4) continue;
    // +Y top
    quad([[x1, y2, z2], [x2, y2, z2], [x2, y2, z1], [x1, y2, z1]], [0, 1, 0], [[x1, -z2], [x2, -z2], [x2, -z1], [x1, -z1]]);
    if (!opts.skipBottom) quad([[x1, y1, z1], [x2, y1, z1], [x2, y1, z2], [x1, y1, z2]], [0, -1, 0], [[x1, z1], [x2, z1], [x2, z2], [x1, z2]]);
    // +Z
    quad([[x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]], [0, 0, 1], [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);
    // -Z
    quad([[x2, y1, z1], [x1, y1, z1], [x1, y2, z1], [x2, y2, z1]], [0, 0, -1], [[-x2, y1], [-x1, y1], [-x1, y2], [-x2, y2]]);
    // +X
    quad([[x2, y1, z2], [x2, y1, z1], [x2, y2, z1], [x2, y2, z2]], [1, 0, 0], [[-z2, y1], [-z1, y1], [-z1, y2], [-z2, y2]]);
    // -X
    quad([[x1, y1, z1], [x1, y1, z2], [x1, y2, z2], [x1, y2, z1]], [-1, 0, 0], [[z1, y1], [z2, y1], [z2, y2], [z1, y2]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** Horizontal quads (floors) with world UVs, facing up. */
export function mergedFloors(rects: { x1: number; x2: number; z1: number; z2: number; y: number }[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const r of rects) {
    const base = pos.length / 3;
    const p = [[r.x1, r.y, r.z2], [r.x2, r.y, r.z2], [r.x2, r.y, r.z1], [r.x1, r.y, r.z1]];
    const u = [[r.x1, -r.z2], [r.x2, -r.z2], [r.x2, -r.z1], [r.x1, -r.z1]];
    for (let i = 0; i < 4; i++) { pos.push(...p[i]); nor.push(0, 1, 0); uv.push(...u[i]); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Pleated curtain panel: a vertical sine-wave sheet spanning `len` along local X, height h. */
export function curtainGeometry(len: number, h: number, depth: number): THREE.BufferGeometry {
  const seg = Math.max(8, Math.round(len * 10));
  const g = new THREE.PlaneGeometry(len, h, seg, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin((x / len) * Math.PI * 2 * (len / 0.45)) * depth * 0.5);
  }
  g.computeVertexNormals();
  return g;
}
