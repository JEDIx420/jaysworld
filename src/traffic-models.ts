import * as THREE from 'three';
import { box, cylinder, materials, bakeStatic, textBoard } from './models';
import { makePerson } from './village-life';
export function makeCar(police = false, color = '#e1ded0') {
  const group = new THREE.Group(),
    wheels: THREE.Group[] = [],
    spinners: THREE.Group[] = [];
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  box(group, [1.85, 0.48, 3.7], [0, 0.15, 0], paint);
  box(group, [1.55, 0.8, 2.1], [0, 0.72, 0.16], police ? materials.cream : paint);
  box(group, [1.4, 0.53, 0.04], [0, 0.85, -0.91], materials.glass);
  box(group, [1.4, 0.5, 0.04], [0, 0.85, 1.23], materials.glass);
  for (const side of [-1, 1]) {
    box(group, [0.04, 0.47, 1.67], [side * 0.8, 0.88, 0.17], materials.glass);
    for (const z of [-0.75, 0.17, 1.05])
      box(group, [0.045, 0.57, 0.06], [side * 0.82, 0.84, z], paint);
    box(group, [0.28, 0.18, 0.04], [side * 0.61, 0.24, -1.87], materials.lamp);
    box(group, [0.26, 0.15, 0.04], [side * 0.62, 0.3, 1.87], materials.red);
  }
  box(group, [1.7, 0.11, 0.08], [0, -0.04, -1.9], materials.chrome);
  box(group, [1.7, 0.11, 0.08], [0, -0.04, 1.9], materials.chrome);
  if (police) {
    box(group, [1.16, 0.1, 0.12], [0, 1.19, 0.1], materials.black);
    box(group, [0.3, 0.15, 0.22], [-0.39, 1.3, 0.1], materials.red);
    const blue = new THREE.MeshStandardMaterial({
      color: '#507dba',
      emissive: '#234276',
      emissiveIntensity: 0.4,
    });
    box(group, [0.3, 0.15, 0.22], [0.39, 1.3, 0.1], blue);
    textBoard(group, 'KERALA POLICE', 1.3, 0.18, [0, 0.32, -1.91], '#e7e7d5', '#394956');
  }
  bakeStatic(group);
  for (const x of [-0.85, 0.85])
    for (const z of [-1.25, 1.25]) {
      const wheel = new THREE.Group(),
        spin = new THREE.Group();
      wheel.add(spin);
      group.add(wheel);
      wheel.position.set(x, -0.5, z);
      const tyre = cylinder(spin, 0.32, 0.32, 0.18, [0, 0, 0], materials.black, 14);
      tyre.rotation.z = Math.PI / 2;
      const rim = cylinder(spin, 0.2, 0.2, 0.19, [0, 0, 0], materials.chrome, 10);
      rim.rotation.z = Math.PI / 2;
      wheels.push(wheel);
      spinners.push(spin);
    }
  // Controller ordering is front-left, front-right, rear-left, rear-right.
  return {
    group,
    wheels: [wheels[0], wheels[2], wheels[1], wheels[3]],
    spinners: [spinners[0], spinners[2], spinners[1], spinners[3]],
  };
}
export function makeTwoWheeler(cycle = false) {
  const group = new THREE.Group(),
    wheels: THREE.Object3D[] = [];
  const frame = new THREE.MeshStandardMaterial({
    color: cycle ? '#c07354' : '#47698a',
    roughness: 0.55,
  });
  for (const z of [-0.72, 0.72]) {
    const wheel = new THREE.Group();
    wheel.position.set(0, 0.35, z);
    group.add(wheel);
    wheels.push(wheel);
    const tyre = cylinder(
      wheel,
      cycle ? 0.33 : 0.3,
      cycle ? 0.33 : 0.3,
      cycle ? 0.055 : 0.14,
      [0, 0, 0],
      materials.black,
      16,
    );
    tyre.rotation.z = Math.PI / 2;
    const rim = cylinder(wheel, 0.24, 0.24, 0.05, [0, 0, 0], materials.chrome, 12);
    rim.rotation.z = Math.PI / 2;
  }
  box(group, [0.075, 0.1, 1.25], [0, 0.6, 0], frame);
  const diagonal = box(group, [0.065, 0.065, 1], [0, 0.66, 0], frame);
  diagonal.rotation.x = 0.47;
  cylinder(group, 0.035, 0.035, 0.65, [0, 0.72, -0.65], materials.chrome, 6);
  box(group, [0.56, 0.055, 0.05], [0, 1.05, -0.65], materials.black);
  box(group, [0.27, 0.08, 0.47], [0, 0.94, 0.36], materials.black);
  if (!cycle) {
    box(group, [0.35, 0.23, 0.6], [0, 0.8, -0.15], frame);
    box(group, [0.33, 0.3, 0.48], [0, 0.43, 0.12], materials.chrome);
    box(group, [0.16, 0.16, 0.1], [0, 0.89, -0.81], materials.lamp);
  }
  bakeStatic(group, wheels);
  const rider = makePerson(cycle ? '#b46e4c' : '#73835d', true);
  rider.group.position.set(0, 0.06, 0.12);
  rider.group.scale.setScalar(0.86);
  group.add(rider.group);
  if (!cycle) {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), materials.black);
    helmet.position.set(0, 1.13, 0.12);
    group.add(helmet);
  }
  return { group, wheels, rider };
}
export function makePolice(traffic = false) {
  const person = makePerson(traffic ? '#e1dfc9' : '#a68d60');
  // Khaki trousers, belt and an original, unbadged peaked cap.
  box(person.group, [0.44, 0.08, 0.29], [0, 0.78, 0], materials.darkWood);
  cylinder(person.group, 0.18, 0.18, 0.07, [0, 1.61, 0], materials.darkWood, 10);
  box(person.group, [0.25, 0.025, 0.19], [0, 1.58, -0.12], materials.darkWood);
  for (const x of [-0.1, 0.1])
    cylinder(
      person.group,
      0.078,
      0.07,
      0.59,
      [x, 0.39, 0],
      new THREE.MeshStandardMaterial({ color: '#a68d60', roughness: 1 }),
      7,
    );
  return person;
}
