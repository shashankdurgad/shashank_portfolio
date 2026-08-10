import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

export type FaceSample = {
  /** Recentred and scaled surface positions, length n*3. */
  positions: Float32Array;
  /** Surface normal per point — drives the explosion outward from the face. */
  normals: Float32Array;
};

/**
 * Sample a mesh's surface into an evenly distributed point cloud.
 *
 * MeshSurfaceSampler weights by triangle area, so density stays even no matter
 * how uneven the model's topology is — sampling vertices directly would clump
 * wherever the artist happened to add detail.
 */
export function sampleMesh(
  mesh: THREE.Mesh,
  count: number,
  targetHeight = 2.4,
  /**
   * Discard samples below this fraction of the model's height. The supplied
   * bust sits on a flat plinth that soaks up ~11% of the cloud for a slab —
   * points are far better spent on the head.
   */
  cropBelow = 0,
): FaceSample {
  const sampler = new MeshSurfaceSampler(mesh).build();

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  // Model-space height range, needed before sampling to apply the crop.
  mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox!;
  const cropY = bb.min.y + (bb.max.y - bb.min.y) * cropBelow;

  for (let i = 0; i < count; i++) {
    // Rejection-sample so cropped points are redistributed onto the head
    // rather than simply lost. Bounded so a bad crop can't spin forever.
    let tries = 0;
    do {
      sampler.sample(p, nrm);
      tries++;
    } while (cropBelow > 0 && p.y < cropY && tries < 32);

    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    normals[i * 3] = nrm.x;
    normals[i * 3 + 1] = nrm.y;
    normals[i * 3 + 2] = nrm.z;
  }

  // Recentre on the sampled cloud's own bounds and scale to a known height.
  // Models arrive at arbitrary scale and origin; the morph needs both stages
  // in the same unit box or the transition jumps.
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const height = Math.max(1e-6, maxY - minY);
  const scale = targetHeight / height;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (positions[i * 3] - cx) * scale;
    positions[i * 3 + 1] = (positions[i * 3 + 1] - cy) * scale;
    positions[i * 3 + 2] = (positions[i * 3 + 2] - cz) * scale;
  }

  return { positions, normals };
}

/** Find the first renderable mesh in a loaded scene graph. */
export function firstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
  });
  return found;
}
