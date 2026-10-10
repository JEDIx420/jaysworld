import * as THREE from 'three';
import { bakeStatic } from './models';

/** Procedural soaring birds: broad fingered wings, a fan tail and a hooked beak. */
export function makeBird(eagle = false) {
  const group = new THREE.Group();
  group.name = eagle ? 'wildlife:eagle' : 'wildlife:egret';
  const plumage = new THREE.MeshStandardMaterial({
    color: eagle ? '#6c4f36' : '#eee7d1',
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const feather = new THREE.MeshStandardMaterial({
    color: eagle ? '#30291f' : '#d0c9b7',
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const gold = new THREE.MeshStandardMaterial({ color: '#b39851', roughness: 0.8 });
  const ellipsoid = (position: number[], scale: number[], material = plumage) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), material);
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    group.add(mesh);
    return mesh;
  };
  ellipsoid([0, 0, 0], [0.12, 0.14, eagle ? 0.37 : 0.28]);
  ellipsoid([0, 0.06, -0.3], [0.09, 0.095, eagle ? 0.15 : 0.22]);
  ellipsoid([0, 0.1, eagle ? -0.44 : -0.54], [0.09, 0.08, 0.11]);
  ellipsoid([0, 0.07, eagle ? -0.55 : -0.7], [0.044, 0.039, eagle ? 0.08 : 0.15], gold);
  if (eagle) ellipsoid([0, 0.025, -0.59], [0.022, 0.045, 0.026], gold);
  const eyes = new THREE.MeshStandardMaterial({ color: '#171812', roughness: 0.6 });
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.077, 0.12, eagle ? -0.47 : -0.56], [0.014, 0.014, 0.012], eyes);
    ellipsoid([side * 0.055, -0.12, 0.18], [0.025, 0.025, 0.13], gold);
  }
  const tail = new THREE.BufferGeometry();
  tail.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-0.065, 0, 0.22, 0.065, 0, 0.22, 0.18, -0.035, 0.65, -0.18, -0.035, 0.65],
      3,
    ),
  );
  tail.setIndex([0, 1, 2, 0, 2, 3]);
  tail.computeVertexNormals();
  group.add(new THREE.Mesh(tail, feather));
  for (let i = -2; i <= 2; i++) ellipsoid([i * 0.052, -0.025, 0.51], [0.034, 0.012, 0.15], plumage);
  bakeStatic(group);
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.x = side * 0.075;
    const outline = eagle
      ? [
          [0, -0.23],
          [0.4, -0.27],
          [0.86, -0.21],
          [1.22, -0.16],
          [1.17, -0.01],
          [1.25, 0.045],
          [1.15, 0.12],
          [1.2, 0.2],
          [1.04, 0.23],
          [1.07, 0.34],
          [0.88, 0.32],
          [0.88, 0.42],
          [0.65, 0.35],
          [0.35, 0.32],
          [0, 0.23],
        ]
      : [
          [0, -0.17],
          [0.4, -0.25],
          [0.96, -0.32],
          [1.06, -0.05],
          [0.92, 0.21],
          [0.6, 0.31],
          [0, 0.16],
        ];
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(side * x, z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);
    pivot.add(new THREE.Mesh(geometry, plumage));
    for (let i = 0; i < 6; i++) {
      const vane = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), feather);
      vane.position.set(side * (0.46 + i * 0.105), -0.003, 0.16 + i * 0.006);
      vane.scale.set(0.037, 0.008, 0.18);
      vane.rotation.y = side * (0.15 + i * 0.06);
      pivot.add(vane);
    }
    bakeStatic(pivot);
    group.add(pivot);
    return pivot;
  });
  return { group, wings };
}
