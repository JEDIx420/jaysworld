import * as THREE from 'three';
import { box, cylinder, tube, materials, bakeStatic, textBoard } from './models';
import { makePerson } from './village-life';
export function makeCar(police = false, color = '#e1ded0') {
  const group = new THREE.Group(),
    wheels: THREE.Group[] = [],
    spinners: THREE.Group[] = [];
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  const beacons: THREE.MeshStandardMaterial[] = [];
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
    for (const [i, color] of ['#ff493a', '#397dff'].entries()) {
      const light = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.15,
      });
      beacons.push(light);
      box(group, [0.36, 0.18, 0.25], [i === 0 ? -0.39 : 0.39, 1.3, 0.1], light);
    }
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
    flash(time: number) {
      beacons.forEach(
        (m, i) =>
          (m.emissiveIntensity = time === 0 ? 0.7 : Math.floor(time * 3) % 2 === i ? 4 : 0.06),
      );
    },
  };
}
export function makeTwoWheeler(cycle = false) {
  const group = new THREE.Group(),
    wheels: THREE.Object3D[] = [];
  const frame = new THREE.MeshStandardMaterial({
    color: cycle ? '#c07354' : '#47698a',
    roughness: 0.55,
  });
  const radius = cycle ? 0.35 : 0.33;
  for (const z of [-0.79, 0.79]) {
    const wheel = new THREE.Group();
    wheel.position.set(0, radius, z);
    group.add(wheel);
    wheels.push(wheel);
    const tyre = new THREE.Mesh(
      new THREE.TorusGeometry(radius - 0.045, cycle ? 0.027 : 0.065, 8, 24),
      materials.rubber,
    );
    tyre.rotation.y = Math.PI / 2;
    wheel.add(tyre);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius - 0.085, 0.018, 6, 24),
      materials.chrome,
    );
    rim.rotation.y = Math.PI / 2;
    wheel.add(rim);
    for (let n = 0; n < 8; n++) {
      const spoke = cylinder(
        wheel,
        0.009,
        0.009,
        (radius - 0.09) * 2,
        [0, 0, 0],
        materials.chrome,
        4,
      );
      spoke.rotation.x = (n * Math.PI) / 8;
    }
    cylinder(wheel, 0.055, 0.055, cycle ? 0.12 : 0.22, [0, 0, 0], materials.chrome, 10).rotation.z =
      Math.PI / 2;
    bakeStatic(wheel);
  }
  const pipe = (points: [number, number, number][], material = frame, r = cycle ? 0.027 : 0.045) =>
    tube(group, points, r, material);
  if (cycle) {
    // An actual diamond frame, open spoked wheels, chain stays and a visible crank.
    pipe([
      [0, 0.35, 0.79],
      [0, 0.96, 0.19],
      [0, 0.43, 0.06],
      [0, 0.35, 0.79],
    ]);
    pipe([
      [0, 0.96, 0.19],
      [0, 0.94, -0.6],
      [0, 0.43, 0.06],
      [0, 0.96, 0.19],
    ]);
    cylinder(group, 0.028, 0.028, 0.23, [0, 1.02, 0.19], materials.chrome, 7);
  } else {
    pipe(
      [
        [0, 0.35, 0.79],
        [0, 0.73, 0.43],
        [0, 0.68, -0.48],
        [0, 0.35, -0.79],
      ],
      materials.chrome,
    );
    pipe(
      [
        [0, 0.35, 0.79],
        [0, 0.44, 0.05],
        [0, 0.35, -0.79],
      ],
      frame,
    );
    const tank = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), frame);
    tank.scale.set(0.23, 0.17, 0.4);
    tank.position.set(0, 0.87, -0.2);
    group.add(tank);
    const engine = cylinder(group, 0.18, 0.18, 0.31, [0, 0.53, 0.03], materials.chrome, 12);
    engine.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++)
      box(group, [0.34, 0.025, 0.28], [0, 0.52 + i * 0.043, -0.16], materials.black);
    pipe(
      [
        [0.18, 0.54, -0.13],
        [0.22, 0.24, -0.12],
        [0.24, 0.25, 0.77],
      ],
      materials.chrome,
      0.045,
    );
    cylinder(group, 0.065, 0.065, 0.53, [0.25, 0.27, 0.54], materials.chrome, 10).rotation.x =
      Math.PI / 2;
    for (const z of [-0.79, 0.79]) {
      const mudguard = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.045, 6, 20, Math.PI), frame);
      mudguard.rotation.y = Math.PI / 2;
      mudguard.position.set(0, 0.33, z);
      group.add(mudguard);
    }
    const light = cylinder(group, 0.12, 0.12, 0.13, [0, 0.98, -0.87], materials.chrome, 16);
    light.rotation.x = Math.PI / 2;
    const lens = cylinder(group, 0.105, 0.105, 0.015, [0, 0.98, -0.947], materials.lamp, 16);
    lens.rotation.x = Math.PI / 2;
    box(group, [0.2, 0.09, 0.04], [0, 0.78, 1.04], materials.red);
    for (const x of [-0.31, 0.31]) {
      pipe(
        [
          [x * 0.6, 0.91, -0.52],
          [x, 1.26, -0.65],
        ],
        materials.chrome,
        0.018,
      );
      const mirror = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), materials.chrome);
      mirror.position.set(x, 1.27, -0.65);
      mirror.scale.set(0.085, 0.045, 0.025);
      group.add(mirror);
    }
  }
  for (const x of [-0.085, 0.085])
    pipe(
      [
        [x, radius, -0.79],
        [x, 0.96, -0.58],
      ],
      materials.chrome,
      0.03,
    );
  pipe(
    [
      [-0.33, 1.08, -0.63],
      [-0.22, 1.05, -0.72],
      [0.22, 1.05, -0.72],
      [0.33, 1.08, -0.63],
    ],
    materials.chrome,
    0.025,
  );
  for (const x of [-0.29, 0.29])
    box(group, [0.15, 0.045, 0.05], [x, 1.08, -0.63], materials.rubber);
  box(
    group,
    [cycle ? 0.2 : 0.32, 0.09, cycle ? 0.28 : 0.62],
    [0, cycle ? 1.08 : 0.97, 0.23],
    materials.black,
  );
  const crank = new THREE.Group();
  crank.position.set(0, 0.43, 0.06);
  group.add(crank);
  for (const x of [-0.18, 0.18]) {
    const side = Math.sign(x);
    tube(
      crank,
      [
        [x, 0, 0],
        [x, side * 0.16, 0],
      ],
      0.015,
      materials.chrome,
    );
    box(crank, [0.18, 0.035, 0.1], [x, side * 0.16, 0], materials.black);
  }
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.013, 6, 18), materials.chrome);
  chain.rotation.y = Math.PI / 2;
  chain.position.set(0.08, 0.43, 0.06);
  group.add(chain);
  pipe(
    [
      [0.09, 0.5, 0.06],
      [0.09, 0.4, 0.79],
      [0.09, 0.31, 0.79],
      [0.09, 0.35, 0.06],
    ],
    materials.black,
    0.01,
  );
  for (const x of [-0.22, 0.22]) box(group, [0.18, 0.025, 0.12], [x, 0.46, 0.06], materials.chrome);
  bakeStatic(crank);
  bakeStatic(group, [...wheels, crank]);
  const rider = makePerson(cycle ? '#b46e4c' : '#73835d', true);
  rider.group.position.set(0, cycle ? 0.61 : 0.5, 0.18);
  rider.group.rotation.x = cycle ? -0.23 : -0.12;
  // Bent elbows reach the grips; bent knees sit against the frame, not above it.
  for (const arm of [rider.arm, rider.rightArm]) {
    const side = arm === rider.arm ? -1 : 1;
    const gripZ = cycle ? -0.67 : -0.74;
    arm.clear();
    tube(
      arm,
      [
        [0, 0, 0],
        [side * 0.035, -0.14, -0.24],
        [side * 0.065, -0.29, gripZ],
      ],
      0.052,
      materials.skin,
    );
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), materials.skin);
    hand.position.set(side * 0.065, -0.29, gripZ);
    arm.add(hand);
  }
  for (const [i, leg] of rider.legs.entries()) {
    const side = i === 0 ? -1 : 1;
    const kneeX = side * (cycle ? 0.04 : 0.1);
    const footX = side * 0.09;
    leg.position.x = side * (cycle ? 0.11 : 0.19);
    leg.clear();
    tube(
      leg,
      [
        [0, 0, 0],
        [kneeX, -0.27, -0.33],
        [footX, -0.58, -0.03],
      ],
      0.07,
      materials.navy,
    );
    box(leg, [0.15, 0.08, 0.26], [footX, -0.58, -0.12], materials.black);
    bakeStatic(leg);
  }
  group.add(rider.group);
  if (!cycle) {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 10), frame);
    helmet.position.y = 0.025;
    rider.head.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.199,
        14,
        8,
        Math.PI * 1.17,
        Math.PI * 0.66,
        Math.PI * 0.27,
        Math.PI * 0.32,
      ),
      materials.glass,
    );
    rider.head.add(visor);
  }
  return {
    group,
    wheels,
    rider,
    animate(angle: number, speed: number) {
      if (cycle) {
        crank.rotation.x = angle * 0.36;
        rider.legs.forEach(
          (leg, i) =>
            (leg.rotation.x = speed > 0.15 ? Math.sin(angle * 0.36 + i * Math.PI) * 0.3 : 0),
        );
      }
      rider.head.rotation.y = Math.sin(angle * 0.05) * 0.055;
    },
  };
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
