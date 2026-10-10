import * as THREE from 'three';
import { box, cylinder, tube, materials, bakeStatic } from './models';
import { groundHeight } from './terrain';

export function createVenueLife(scene: THREE.Scene) {
  const kitchen = new THREE.Group();
  kitchen.position.set(-43, groundHeight(-43, 37), 37);
  box(kitchen, [1.4, 1, 1.3], [0, 0.5, 0], materials.laterite);
  cylinder(kitchen, 0.36, 0.42, 0.38, [0, 1.15, 0], materials.chrome, 16);
  cylinder(kitchen, 0.42, 0.42, 0.07, [0, 1.36, 0], materials.chrome, 16);
  const ember = new THREE.MeshStandardMaterial({
    color: '#ec9a3d',
    emissive: '#fd8538',
    emissiveIntensity: 1,
  });
  box(kitchen, [0.7, 0.2, 0.03], [0, 0.35, 0.66], ember);
  tube(
    kitchen,
    [
      [0.5, 1, 0],
      [0.5, 3.5, 0],
      [0.8, 3.7, 0],
    ],
    0.11,
    materials.darkWood,
  );
  bakeStatic(kitchen);
  scene.add(kitchen);
  const smoke = new THREE.Group();
  scene.add(smoke);
  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: '#eee9ce',
    transparent: true,
    opacity: 0.21,
    depthWrite: false,
  });
  for (let i = 0; i < 12; i++)
    smoke.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), smokeMaterial));
  const speakers: THREE.Mesh[] = [];
  const studio = new THREE.Group();
  studio.position.set(-236, groundHeight(-236, 155), 155);
  scene.add(studio);
  for (const x of [-5.2, 5.2]) {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0.75, 5);
    studio.add(cabinet);
    box(cabinet, [0.75, 1.4, 0.6], [0, 0, 0], materials.black);
    for (const y of [-0.3, 0.3]) {
      const cone = cylinder(cabinet, 0.23, 0.23, 0.025, [0, y, 0.31], materials.chrome, 16);
      cone.rotation.x = Math.PI / 2;
      speakers.push(cone);
      cylinder(cabinet, 0.09, 0.09, 0.04, [0, y, 0.335], materials.black, 12).rotation.x =
        Math.PI / 2;
    }
    tube(
      studio,
      [
        [x, 0.1, 5],
        [x + 1, 0.04, 5.4],
        [0, 0.04, 4.2],
      ],
      0.018,
      materials.rubber,
    );
  }
  const rings: THREE.Mesh[] = [];
  for (const x of [-5.2, 5.2])
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.3, 24),
        new THREE.MeshBasicMaterial({
          color: '#e6c589',
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.position.set(x, 0.8, 5.36);
      studio.add(ring);
      rings.push(ring);
    }
  return {
    update(t: number) {
      smoke.children.forEach((p, i) => {
        const a = (t * 0.11 + i / 12) % 1;
        p.position.set(
          -42.2 + Math.sin(t * 0.4 + i) * a * 0.6,
          3.8 + a * 3.8,
          37 + Math.cos(t * 0.3 + i) * a * 0.4,
        );
        p.scale.setScalar(0.35 + a * 2.8);
      });
      ember.emissiveIntensity = 0.65 + Math.sin(t * 4) * 0.12;
      speakers.forEach((p, i) => (p.scale.y = 1 + Math.sin(t * 9 + i) * 0.025));
      rings.forEach((p, i) => {
        const a = (t * 0.45 + (i % 3) / 3) % 1;
        p.scale.setScalar(1 + a * 3);
        p.position.z = 5.36 + a * 0.9;
        (p.material as THREE.MeshBasicMaterial).opacity = (1 - a) * 0.18;
      });
    },
  };
}
