import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  box,
  cylinder,
  tube,
  textBoard,
  bakeStatic,
  materials,
  clearCameraFoliage,
} from './models';
import { makePerson, animatePerson } from './village-life';
import { makeCar, makePolice } from './traffic-models';
import { ridgeGuardrails } from './road-fixtures';
import { PLACES } from './projects';
import { ROAD_CLOSURES, ROAD_PATHS, roadClearance, waterAt } from './village';
import { groundHeight } from './terrain';
import type { Resident } from './safety';
import { vergePosition, CLOSURE_WIDTH, CLOSURE_DEPTH } from './placement';

function animal(kind: 'cow' | 'goat', color: string) {
  const group = new THREE.Group(),
    head = new THREE.Group(),
    legs: THREE.Group[] = [];
  const coat = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const cow = kind === 'cow',
    length = cow ? 1.65 : 0.85,
    height = cow ? 0.95 : 0.57;
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), coat);
  body.scale.set(cow ? 0.45 : 0.23, cow ? 0.5 : 0.25, length / 2);
  body.position.y = height;
  body.castShadow = true;
  group.add(body);
  if (cow) {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), materials.darkWood);
    patch.position.set(0.25, height + 0.05, 0.12);
    patch.scale.set(0.24, 0.4, 0.45);
    group.add(patch);
  }
  for (const side of [-1, 1])
    for (const front of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * (cow ? 0.26 : 0.14), height - 0.1, front * length * 0.33);
      cylinder(
        leg,
        cow ? 0.09 : 0.045,
        cow ? 0.065 : 0.035,
        height - 0.25,
        [0, -(height - 0.25) / 2, 0],
        coat,
        6,
      );
      box(
        leg,
        [cow ? 0.17 : 0.09, 0.09, cow ? 0.23 : 0.12],
        [0, -height + 0.3, -0.025],
        materials.darkWood,
      );
      group.add(leg);
      bakeStatic(leg);
      legs.push(leg);
    }
  head.position.set(0, height + 0.12, -length * 0.42);
  group.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), coat);
  face.scale.set(cow ? 0.24 : 0.13, cow ? 0.27 : 0.18, cow ? 0.43 : 0.24);
  face.position.z = -0.16;
  head.add(face);
  box(
    head,
    [cow ? 0.38 : 0.18, cow ? 0.16 : 0.09, cow ? 0.18 : 0.12],
    [0, -0.08, cow ? -0.52 : -0.34],
    materials.darkWood,
  );
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), coat);
    ear.scale.set(cow ? 0.2 : 0.13, 0.06, 0.08);
    ear.position.set(side * (cow ? 0.3 : 0.17), 0.07, -0.13);
    head.add(ear);
    tube(
      head,
      [
        [side * 0.13, 0.17, -0.13],
        [side * 0.2, cow ? 0.38 : 0.4, -0.09],
        [side * 0.22, cow ? 0.4 : 0.47, 0.02],
      ],
      0.026,
      materials.cream,
    );
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), materials.black);
    eye.position.set(side * (cow ? 0.23 : 0.125), 0.06, -0.26);
    head.add(eye);
  }
  tube(
    group,
    [
      [0, height, length / 2],
      [0, height - 0.1, length / 2 + 0.2],
      [0, height - 0.5, length / 2 + 0.25],
    ],
    0.035,
    coat,
  );
  bakeStatic(head);
  bakeStatic(group, [head, ...legs]);
  return { group, head, legs };
}

function excavator() {
  const g = new THREE.Group(),
    arm = new THREE.Group(),
    bucket = new THREE.Group();
  for (const x of [-1.1, 1.1]) {
    box(g, [0.55, 0.75, 3.8], [x, 0.42, 0], materials.rubber);
    for (let z = -1.5; z < 1.6; z += 0.5) {
      const wheel = cylinder(g, 0.32, 0.32, 0.58, [x, 0.43, z], materials.darkWood, 10);
      wheel.rotation.z = Math.PI / 2;
    }
  }
  box(g, [2.4, 0.7, 2.8], [0, 1.1, 0], materials.yellow);
  box(g, [1.2, 1.4, 1.6], [-0.6, 2.1, -0.25], materials.black);
  box(g, [1.25, 0.15, 1.7], [-0.6, 2.87, -0.25], materials.yellow);
  box(g, [1.1, 0.96, 0.03], [-0.6, 2.23, -1.065], materials.glass);
  box(g, [0.035, 0.96, 1.3], [-1.215, 2.23, -0.25], materials.glass);
  cylinder(g, 0.065, 0.065, 0.8, [0.73, 2.3, 0.9], materials.black, 8);
  arm.position.set(0.53, 1.8, -0.8);
  g.add(arm);
  const boom = box(arm, [0.4, 3.8, 0.42], [0, 1.3, -0.95], materials.yellow);
  boom.rotation.x = -0.57;
  tube(
    arm,
    [
      [0.24, 0, 0],
      [0.24, 1.9, -1.5],
    ],
    0.055,
    materials.chrome,
  );
  const stick = box(arm, [0.34, 2.4, 0.34], [0, 1.7, -2.6], materials.yellow);
  stick.rotation.x = 0.4;
  bucket.position.set(0, 0.6, -3.15);
  arm.add(bucket);
  box(bucket, [1.25, 0.75, 0.65], [0, 0, 0], materials.darkWood);
  for (const x of [-0.48, -0.24, 0, 0.24, 0.48])
    box(bucket, [0.1, 0.12, 0.43], [x, -0.34, -0.3], materials.chrome);
  bakeStatic(bucket);
  bakeStatic(arm, [bucket]);
  bakeStatic(g, [arm]);
  return { group: g, arm, bucket };
}

export function createRoadside(scene: THREE.Scene, world: RAPIER.World, statics: THREE.Group) {
  const people: {
    person: ReturnType<typeof makePerson>;
    base: THREE.Vector3;
    phase: number;
    yaw: number;
    motion: string;
  }[] = [];
  const flags: THREE.Mesh[] = [],
    machines: ReturnType<typeof excavator>[] = [];
  const residents: Resident[] = [];
  let lowQuality = false;
  const patrols: ReturnType<typeof makeCar>[] = [];
  const shoppers: {
    person: ReturnType<typeof makePerson>;
    from: number;
    to: number;
    z: number;
    phase: number;
  }[] = [];
  const personAt = (
    x: number,
    z: number,
    color: string,
    phase: number,
    yaw = 0,
    closed = false,
  ) => {
    if (!closed) {
      const safe = vergePosition({ x, z }, 0.55, residents);
      x = safe.x;
      z = safe.z;
    }
    const person = makePerson(color);
    person.group.position.set(x, groundHeight(x, z), z);
    person.group.rotation.y = yaw;
    scene.add(person.group);
    people.push({
      person,
      base: person.group.position.clone(),
      phase,
      yaw,
      motion: closed ? (phase % 3 < 1 ? 'clap' : 'chant') : 'chat',
    });
    residents.push({ x, z, y: groundHeight(x, z), radius: 0.55 });
    return person;
  };
  // Fictional colour-themed processions: plain flags, no real party names or symbols.
  for (const closure of ROAD_CLOSURES) {
    const g = new THREE.Group();
    g.position.set(closure.x, groundHeight(closure.x, closure.z), closure.z);
    g.rotation.y = closure.yaw;
    const local = (x: number, z: number) =>
      new THREE.Vector3(x, 0, z)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), closure.yaw)
        .add(g.position);
    const patrol = makeCar(true);
    patrols.push(patrol);
    const parked = local(8, -4);
    patrol.group.position.set(parked.x, groundHeight(parked.x, parked.z) + 0.8, parked.z);
    patrol.group.rotation.y = closure.yaw + 0.3;
    scene.add(patrol.group);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1, 1, 2)
        .setTranslation(parked.x, groundHeight(parked.x, parked.z) + 1, parked.z)
        .setRotation(patrol.group.quaternion),
    );
    for (let n = 0; n < 3; n++) {
      const p = local(-7 + n * 2.1, 1.8),
        safe = vergePosition(p, 0.55, residents),
        cop = makePolice(n === 0);
      cop.group.position.set(safe.x, groundHeight(safe.x, safe.z), safe.z);
      cop.group.rotation.y = closure.yaw;
      scene.add(cop.group);
      cop.group.name = 'resident:police';
      people.push({
        person: cop,
        base: cop.group.position.clone(),
        phase: n,
        yaw: closure.yaw,
        motion: 'police',
      });
      residents.push({ x: safe.x, z: safe.z, y: cop.group.position.y, radius: 0.55 });
    }
    // Continuous visible perimeter, matching placement.ts's swept closed volume.
    const wall = (ax: number, az: number, bx: number, bz: number) => {
      const length = Math.hypot(bx - ax, bz - az),
        steps = Math.ceil(length / 3);
      for (let n = 0; n < steps; n++) {
        const t = (n + 0.5) / steps,
          p = local(ax + (bx - ax) * t, az + (bz - az) * t);
        const y = groundHeight(p.x, p.z),
          yaw = closure.yaw + Math.atan2(bx - ax, bz - az);
        const stone = box(
          statics,
          [0.6, 1.25, length / steps + 0.08],
          [p.x, y + 0.6, p.z],
          materials.laterite,
        );
        stone.rotation.y = yaw;
        const rail = box(
          statics,
          [0.13, 0.9, length / steps + 0.08],
          [p.x, y + 1.62, p.z],
          materials.darkWood,
        );
        rail.rotation.y = yaw;
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.32, 1.15, length / steps / 2 + 0.08)
            .setTranslation(p.x, y + 1.15, p.z)
            .setRotation(stone.quaternion),
        );
      }
    };
    const half = CLOSURE_WIDTH / 2;
    wall(-half, 0, -5, 0);
    wall(5, 0, half, 0);
    wall(-half, 0, -half, -CLOSURE_DEPTH);
    wall(half, 0, half, -CLOSURE_DEPTH);
    wall(-half, -CLOSURE_DEPTH, half, -CLOSURE_DEPTH);
    box(g, [10, 0.7, 0.28], [0, 0.8, 0], materials.cream);
    for (let x = -4.5; x <= 4.5; x += 0.75) {
      const stripe = box(
        g,
        [0.35, 0.65, 0.03],
        [x, 0.8, 0.17],
        closure.kind === 'works' ? materials.yellow : materials.terracotta,
      );
      stripe.rotation.z = -0.45;
    }
    for (const x of [-4.2, 4.2]) {
      box(g, [0.14, 1.3, 0.14], [x, 0.65, 0], materials.darkWood);
      box(g, [0.5, 0.12, 1.1], [x, 0.08, 0], materials.darkWood);
    }
    textBoard(g, closure.title, 4.5, 1.1, [0, 2.15, -0.1], '#e3cd92', '#324b3e', closure.detail);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(5, 1.3, 0.4)
        .setTranslation(g.position.x, g.position.y + 1.3, g.position.z)
        .setRotation(g.quaternion)
        .setRestitution(0),
    );
    for (let i = 0; i < closure.people; i++) {
      const p = local(((i % 6) - 2.5) * 1.15, -2.5 - Math.floor(i / 6) * 1.3);
      const person = personAt(p.x, p.z, closure.color, i * 1.7, closure.yaw, true);
      if (closure.kind !== 'works' && i % 4 === 0) {
        cylinder(person.group, 0.025, 0.025, 2.5, [0.28, 1.7, 0], materials.wood, 6);
        const flag = box(
          person.group,
          [0.75, 0.45, 0.016],
          [0.65, 2.65, 0],
          new THREE.MeshStandardMaterial({
            color: closure.color,
            side: THREE.DoubleSide,
            roughness: 1,
          }),
        );
        flags.push(flag);
      }
    }
    if (closure.kind === 'works') {
      const digger = excavator(),
        p = local(0, -6);
      digger.group.position.set(p.x, groundHeight(p.x, p.z), p.z);
      digger.group.rotation.y = closure.yaw - 0.5;
      scene.add(digger.group);
      machines.push(digger);
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(1.5, 1.5, 2.2)
          .setTranslation(p.x, groundHeight(p.x, p.z) + 1.5, p.z)
          .setRotation(digger.group.quaternion),
      );
      for (let i = 0; i < 6; i++) {
        const p = local((i % 2 ? 1 : -1) * 3, 2 + Math.floor(i / 2) * 3);
        cylinder(
          statics,
          0.03,
          0.28,
          0.6,
          [p.x, groundHeight(p.x, p.z) + 0.3, p.z],
          materials.terracotta,
          8,
        );
        cylinder(
          statics,
          0.1,
          0.16,
          0.15,
          [p.x, groundHeight(p.x, p.z) + 0.35, p.z],
          materials.cream,
          8,
        );
      }
      const rubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), materials.laterite);
      rubble.position.set(p.x + 3.5, groundHeight(p.x + 3.5, p.z) + 0.2, p.z);
      rubble.scale.set(2.2, 0.8, 3);
      statics.add(rubble);
    }
    statics.add(g);
  }
  // Small social groups outside shops and beside the ferry, away from the carriageway.
  for (const [x, z] of [
    [-43, 24],
    [-40, 23],
    [-162, 13],
    [-180, 14],
    [-221, 13],
    [-251, 21],
    [-118, 142],
    [-106, 225],
    [62, -192],
  ])
    personAt(x, z, ['#ddd8bf', '#729292', '#a77164'][people.length % 3], people.length, 0.5);

  // Every open market stall has a vendor and a customer. Shoppers stay on the broad verge.
  for (let i = 0; i < 5; i++) {
    const x = -161 - i * 12;
    personAt(x - 0.7, 8.4, ['#b76e51', '#799682', '#d0b878'][i % 3], i + 11, Math.PI);
    personAt(x + 1.2, 12.6, ['#809ead', '#dfbb93', '#b7889c'][i % 3], i + 17, 0);
  }
  for (let i = 0; i < 4; i++) {
    const person = makePerson(['#c38b61', '#759ba0', '#b17d92', '#c2b480'][i]);
    const shopper = {
      person,
      from: -164 - i * 10,
      to: -181 - i * 9,
      z: 16 + (i % 2) * 3,
      phase: i * 5,
    };
    person.group.position.set(shopper.from, groundHeight(shopper.from, shopper.z), shopper.z);
    box(person.group, [0.22, 0.31, 0.18], [0.29, 0.55, 0.01], materials.cream);
    shoppers.push(shopper);
    scene.add(person.group);
  }

  const animals = [
    { kind: 'cow' as const, x: -78, z: 16, radius: 2.2, color: '#ddcfac' },
    { kind: 'cow' as const, x: -80, z: 10, radius: 1.8, color: '#a88259' },
    { kind: 'goat' as const, x: -69, z: -23, radius: 2.3, color: '#e1d8be' },
    { kind: 'goat' as const, x: -73, z: -21, radius: 1.8, color: '#5f5041' },
    { kind: 'cow' as const, x: -105, z: 111, radius: 2, color: '#c7b18a' },
    { kind: 'goat' as const, x: -113, z: 109, radius: 2, color: '#eee4c9' },
    { kind: 'cow' as const, x: -227, z: 191, radius: 2, color: '#a67b58' },
    { kind: 'goat' as const, x: -242, z: 186, radius: 2, color: '#d9c3a1' },
    { kind: 'goat' as const, x: 3, z: -170, radius: 1.7, color: '#e6d7ba' },
  ].map((home, i) => {
    const model = animal(home.kind, home.color);
    scene.add(model.group);
    return { ...home, model, index: i };
  });

  // Banana gardens, laterite courtyards, wells and laundry break up the green verges.
  for (const [x, z] of [
    [-80, 6],
    [-72, -29],
    [-129, 52],
    [-171, -74],
    [-120, 159],
    [-245, 129],
    [-214, 184],
    [-54, 154],
  ]) {
    const garden = new THREE.Group();
    garden.position.set(x, groundHeight(x, z), z);
    cylinder(garden, 0.13, 0.2, 2.8, [0, 1.4, 0], materials.foliage, 8);
    for (let n = 0; n < 7; n++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), materials.foliage);
      leaf.scale.set(0.34, 0.08, 1.45);
      leaf.position.set(Math.sin(n * 0.9) * 0.8, 2.7, Math.cos(n * 0.9) * 0.8);
      leaf.rotation.y = n * 0.9;
      leaf.rotation.x = 0.25;
      garden.add(leaf);
    }
    for (let n = 0; n < 4; n++)
      cylinder(garden, 0.045, 0.045, 0.3, [0.16 + n * 0.055, 2.25, 0.17], materials.yellow, 6);
    bakeStatic(garden);
    statics.add(garden);
  }
  for (const [x, z] of [
    [-87, 6],
    [-119, 55],
    [-228, 133],
  ]) {
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    cylinder(g, 0.95, 1, 0.8, [0, 0.4, 0], materials.laterite, 14);
    cylinder(g, 0.8, 0.8, 0.02, [0, 0.82, 0], materials.black, 14);
    for (const side of [-1, 1]) box(g, [0.1, 2.4, 0.1], [side, 1.2, 0], materials.darkWood);
    box(g, [2.2, 0.13, 0.13], [0, 2.4, 0], materials.wood);
    tube(
      g,
      [
        [0, 2.4, 0],
        [0, 0.95, 0],
      ],
      0.018,
      materials.wicker,
    );
    bakeStatic(g);
    statics.add(g);
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.45, 1).setTranslation(x, g.position.y + 0.45, z),
    );
  }
  const laundry = new THREE.Group();
  laundry.position.set(-118, 0, 160);
  for (const x of [-3, 3]) cylinder(laundry, 0.06, 0.06, 2.3, [x, 1.15, 0], materials.wood, 6);
  tube(
    laundry,
    [
      [-3, 2.2, 0],
      [0, 2.05, 0],
      [3, 2.2, 0],
    ],
    0.018,
    materials.darkWood,
  );
  for (let n = 0; n < 5; n++)
    box(
      laundry,
      [0.8, 0.9, 0.03],
      [-2.3 + n * 1.1, 1.64, 0],
      [materials.cream, materials.teal, materials.terracotta][n % 3],
    );
  bakeStatic(laundry);
  statics.add(laundry);

  for (const segment of ridgeGuardrails()) {
    const a = new THREE.Vector3(segment.a.x, groundHeight(segment.a.x, segment.a.z), segment.a.z),
      b = new THREE.Vector3(segment.b.x, groundHeight(segment.b.x, segment.b.z), segment.b.z),
      center = a.clone().add(b).multiplyScalar(0.5),
      length = a.distanceTo(b);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      b.clone().sub(a).normalize(),
    );
    cylinder(statics, 0.08, 0.08, 0.9, [a.x, a.y + 0.45, a.z], materials.cream, 8);
    const rail = box(
      statics,
      [0.16, 0.13, length],
      [center.x, center.y + 0.75, center.z],
      materials.darkWood,
    );
    rail.quaternion.copy(orientation);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.13, 0.5, length / 2)
        .setTranslation(center.x, center.y + 0.5, center.z)
        .setRotation(orientation),
    );
  }
  for (const [x, z, title, sub] of [
    [6, -87, 'MALAMUKAL', 'Slow climb · 24 m ridge'],
    [61, -143, 'HAIRPIN BEND', 'Keep left · enjoy the climb'],
  ] as const) {
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    box(g, [0.12, 2.6, 0.12], [0, 1.3, 0], materials.darkWood);
    textBoard(g, title, 3.4, 1.1, [0, 2.4, 0], '#e1ce9b', '#354f3e', sub);
    statics.add(g);
  }
  // Terrace planting on the western mountain flank, not flat rectangles over asphalt.
  const shrubs = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.65, 0),
    materials.foliage,
    360,
  );
  const dummy = new THREE.Object3D();
  let count = 0;
  for (let z = -116; z > -260; z -= 7)
    for (let x = -58; x < 8; x += 5) {
      if (roadClearance(x, z) < 3 || waterAt(x, z)) continue;
      dummy.position.set(x, groundHeight(x, z) + 0.35, z);
      dummy.scale.set(1.3, 0.65, 0.85);
      dummy.updateMatrix();
      shrubs.setMatrixAt(count++, dummy.matrix);
    }
  shrubs.count = count;
  shrubs.castShadow = true;
  scene.add(shrubs);
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: '#50704a',
    roughness: 1,
    flatShading: true,
  });
  clearCameraFoliage(crownMaterial);
  const ridgeTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.15, 0.28, 3.8, 7),
    materials.wood,
    140,
  );
  const ridgeCrowns = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    crownMaterial,
    140,
  );
  count = 0;
  for (let z = -101; z > -285; z -= 18)
    for (let x = -80; x < 69; x += 15) {
      const px = x + Math.sin(x + z) * 3,
        pz = z + Math.cos(x - z) * 3;
      if (
        roadClearance(px, pz) < 4.5 ||
        Math.hypot(px - 34, pz + 200) < 17 ||
        PLACES.some(
          (p) =>
            Math.hypot(px - p.trigger.x, pz - p.trigger.z) < 12 ||
            Math.hypot(px - p.position.x, pz - p.position.z) < 13,
        ) ||
        ROAD_CLOSURES.some((c) => Math.hypot(px - c.x, pz - c.z) < 11) ||
        count >= 100
      )
        continue;
      const y = groundHeight(px, pz);
      dummy.position.set(px, y + 1.9, pz);
      dummy.rotation.set(0, count, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      ridgeTrunks.setMatrixAt(count, dummy.matrix);
      dummy.position.y = y + 4.4;
      dummy.scale.set(2.7 + (count % 3) * 0.35, 2.0, 2.9);
      dummy.updateMatrix();
      ridgeCrowns.setMatrixAt(count++, dummy.matrix);
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.25, 1.8, 0.25).setTranslation(px, y + 1.8, pz),
      );
    }
  // Groves frame the road ends so gatherings sit in a village, not an empty plane.
  for (const closure of ROAD_CLOSURES)
    for (const side of [-20, -12, 12, 20])
      for (const along of [-12, 5]) {
        const px = closure.x + Math.cos(closure.yaw) * side + Math.sin(closure.yaw) * along,
          pz = closure.z - Math.sin(closure.yaw) * side + Math.cos(closure.yaw) * along;
        if (waterAt(px, pz) || roadClearance(px, pz) < 4.5 || count >= 140) continue;
        const y = groundHeight(px, pz);
        dummy.position.set(px, y + 1.9, pz);
        dummy.rotation.set(0, count, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        ridgeTrunks.setMatrixAt(count, dummy.matrix);
        dummy.position.y = y + 4.4;
        dummy.scale.set(2.9 + (count % 3) * 0.35, 2.1, 3.1);
        dummy.updateMatrix();
        ridgeCrowns.setMatrixAt(count++, dummy.matrix);
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.25, 1.8, 0.25).setTranslation(px, y + 1.8, pz),
        );
      }
  ridgeTrunks.count = ridgeCrowns.count = count;
  ridgeCrowns.castShadow = true;
  scene.add(ridgeTrunks, ridgeCrowns);
  // Tall grasses and small wildflowers around the ordinary lanes, instanced once.
  const grass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.12, 0.45, 3),
    materials.foliage,
    1200,
  );
  count = 0;
  for (let z = -230; z < 250; z += 9)
    for (let x = -295; x < 72; x += 9) {
      if (count >= 1200) continue;
      const px = x + Math.sin(z + x) * 2,
        pz = z + Math.cos(x - z) * 2;
      const clearance = roadClearance(px, pz);
      if (waterAt(px, pz) || clearance < 2.1 || clearance > 22) continue;
      dummy.position.set(px, groundHeight(px, pz) + 0.22, pz);
      dummy.scale.set(1.3, 0.75 + (count % 4) * 0.1, 1.3);
      dummy.rotation.y = count;
      dummy.updateMatrix();
      grass.setMatrixAt(count++, dummy.matrix);
      if (count === 1200) break;
    }
  grass.count = count;
  scene.add(grass);

  return {
    residents() {
      return [
        ...residents,
        ...shoppers.map((s) => ({
          x: s.person.group.position.x,
          z: s.person.group.position.z,
          y: s.person.group.position.y,
          radius: 0.55,
        })),
        ...animals.map((a) => ({
          x: a.model.group.position.x,
          z: a.model.group.position.z,
          y: a.model.group.position.y,
          radius: a.kind === 'cow' ? 1.25 : 0.75,
        })),
      ];
    },
    officers() {
      return people
        .filter((p) => p.person.group.name === 'resident:police')
        .map((p) => ({
          x: p.base.x,
          z: p.base.z,
          y: p.base.y,
        }));
    },
    quality(low: boolean) {
      lowQuality = low;
      grass.visible = !low;
      shrubs.castShadow = !low;
      ridgeCrowns.castShadow = !low;
    },
    update(t: number, _dt: number, driver?: THREE.Vector3) {
      people.forEach(({ person, base, phase, yaw, motion }) => {
        person.group.visible =
          !lowQuality || !driver || Math.hypot(driver.x - base.x, driver.z - base.z) < 115;
        if (!person.group.visible) return;
        animatePerson(person, t, phase, motion);
        person.group.position.y =
          base.y + Math.max(0, Math.sin(t * 1.8 + phase)) * (motion === 'chant' ? 0.05 : 0.018);
        person.group.rotation.y = yaw + Math.sin(t * 0.55 + phase) * 0.12;
      });
      shoppers.forEach(({ person, from, to, z, phase }) => {
        person.group.visible =
          !lowQuality || !driver || Math.hypot(driver.x - (from + to) / 2, driver.z - z) < 115;
        const cycle = ((t + phase) % 40) / 40;
        const progress =
          cycle < 0.45
            ? cycle / 0.45
            : cycle < 0.5
              ? 1
              : cycle < 0.95
                ? 1 - (cycle - 0.5) / 0.45
                : 0;
        const x = from + (to - from) * progress,
          walking = cycle < 0.45 || (cycle > 0.5 && cycle < 0.95);
        if (!driver || Math.hypot(driver.x - x, driver.z - z) > 3) {
          person.group.position.set(x, groundHeight(x, z), z);
          person.group.rotation.y = cycle < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        }
        animatePerson(person, t, phase);
        person.legs.forEach((leg, i) => {
          leg.rotation.x = walking ? Math.sin(t * 5 + i * Math.PI + phase) * 0.28 : 0;
        });
      });
      patrols.forEach((patrol, i) => patrol.flash(t + i * 0.3));
      flags.forEach((flag, i) => {
        flag.rotation.y = Math.sin(t * 2 + i) * 0.18;
      });
      machines.forEach((machine, i) => {
        machine.arm.rotation.x = Math.sin(t * 0.25 + i) * 0.09;
        machine.bucket.rotation.x = -0.2 + Math.sin(t * 0.3 + i) * 0.18;
      });
      animals.forEach((a) => {
        const angle = t * 0.065 + a.index * 1.2,
          x = a.x + Math.cos(angle) * a.radius,
          z = a.z + Math.sin(angle) * a.radius;
        if (
          roadClearance(x, z) > (a.kind === 'cow' ? 2.5 : 2) &&
          (!driver || Math.hypot(driver.x - x, driver.z - z) > 3.1)
        )
          a.model.group.position.set(x, groundHeight(x, z), z);
        a.model.group.rotation.y = -angle;
        a.model.head.rotation.x = 0.15 + Math.max(0, Math.sin(t * 0.4 + a.index)) * 0.55;
        a.model.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(t * 1.8 + i * 2) * 0.08;
        });
      });
    },
  };
}
