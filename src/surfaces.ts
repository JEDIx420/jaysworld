import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { groundHeight, terrainData } from './terrain';
import { roadClearance, waterAt } from './village';
import { box, materials } from './models';

export function createGround(scene: THREE.Scene, world: RAPIER.World) {
  const { vertices, indices } = terrainData();
  world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.95));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const colors = new Float32Array(vertices.length),
    uv = new Float32Array((vertices.length / 3) * 2);
  const grass = new THREE.Color('#637e48'),
    dry = new THREE.Color('#869461'),
    forest = new THREE.Color('#4d7049');
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i],
      y = vertices[i + 1],
      z = vertices[i + 2];
    const variation =
      (Math.sin(x * 0.075 + Math.sin(z * 0.09)) + Math.cos(z * 0.056 - x * 0.02)) * 0.18 + 0.4;
    const color = grass
      .clone()
      .lerp(dry, variation)
      .lerp(forest, Math.min(0.6, y / 40));
    colors.set([color.r, color.g, color.b], i);
    uv.set([x / 14, z / 14], (i / 3) * 2);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 128;
  const ctx = textureCanvas.getContext('2d')!;
  ctx.fillStyle = '#c5cbb8';
  ctx.fillRect(0, 0, 128, 128);
  let seed = 42;
  for (let i = 0; i < 1800; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 128;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 128;
    ctx.fillStyle = i % 2 ? '#89977824' : '#fff8dd28';
    ctx.fillRect(x, y, 1, 1 + (i % 3));
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      map: texture,
      roughness: 1,
    }),
  );
  mesh.name = 'terrain:shared-collision-surface';
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/** Crop beds are cut into cells so neither their surface nor bunds cross a road. */
export function addField(
  parent: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  color: string,
) {
  const vertices: number[] = [],
    step = 3;
  for (let px = x - w / 2; px < x + w / 2; px += step)
    for (let pz = z - d / 2; pz < z + d / 2; pz += step) {
      const right = Math.min(px + step, x + w / 2),
        bottom = Math.min(pz + step, z + d / 2);
      const cx = (px + right) / 2,
        cz = (pz + bottom) / 2;
      if (waterAt(cx, cz) || roadClearance(cx, cz) < 1.7 + step * Math.SQRT1_2) continue;
      for (const [vx, vz] of [
        [px, pz],
        [px, bottom],
        [right, pz],
        [right, pz],
        [px, bottom],
        [right, bottom],
      ])
        vertices.push(vx, groundHeight(vx, vz) + 0.018, vz);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  mesh.receiveShadow = true;
  mesh.name = 'crop:road-cut-bed';
  parent.add(mesh);
  for (const side of [-1, 1]) {
    for (let px = x - w / 2; px < x + w / 2; px += step) {
      const pz = z + (side * d) / 2,
        width = Math.min(step, x + w / 2 - px);
      if (!waterAt(px + width / 2, pz) && roadClearance(px + width / 2, pz) > 3.8)
        box(
          parent,
          [width, 0.12, 0.35],
          [px + width / 2, groundHeight(px + width / 2, pz) + 0.04, pz],
          materials.laterite,
        ).castShadow = false;
    }
  }
}
