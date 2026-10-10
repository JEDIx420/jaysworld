import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  box,
  cylinder,
  textBoard,
  bakeStatic,
  makeBuilding,
  makeBench,
  makePalmGeometries,
  materials,
  clearCameraFoliage,
} from './models';
import { ROAD_PATHS, TAXI_STOPS, PASSENGERS, waterAt } from './village';
import { PLACES } from './projects';
import { groundHeight } from './terrain';
import { addField } from './surfaces';
import type { Resident } from './safety';
import { vergePosition } from './placement';
import { passengerStop } from './passenger-stops';

export function makePerson(color = '#b97673', seated = false) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: '#a77952', roughness: 1 });
  cylinder(group, 0.18, 0.22, 0.53, [0, seated ? 0.74 : 0.99, 0], shirt, 8);
  const head = new THREE.Group();
  head.position.set(0, seated ? 1.17 : 1.42, 0);
  group.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin));
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    materials.black,
  );
  hair.position.y = 0.025;
  head.add(hair);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), skin);
  nose.position.set(0, -0.02, -0.165);
  head.add(nose);
  const legs: THREE.Group[] = [];
  for (const x of [-0.1, 0.1]) {
    const leg = new THREE.Group();
    leg.position.set(x, seated ? 0.55 : 0.73, 0);
    group.add(leg);
    legs.push(leg);
    cylinder(
      leg,
      0.075,
      0.07,
      0.31,
      [0, -0.15, seated ? -0.13 : 0],
      materials.cream,
      7,
    ).rotation.x = seated ? Math.PI / 2 : 0;
    cylinder(
      leg,
      0.07,
      0.06,
      seated ? 0.27 : 0.34,
      [0, seated ? -0.19 : -0.47, seated ? -0.28 : 0],
      materials.cream,
      7,
    );
    box(
      leg,
      [0.14, 0.08, 0.25],
      [0, seated ? -0.34 : -0.65, seated ? -0.33 : -0.065],
      materials.black,
    );
    bakeStatic(leg);
  }
  const arm = new THREE.Group();
  arm.position.set(-0.22, seated ? 0.93 : 1.2, 0);
  group.add(arm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.23, seated ? 0.93 : 1.2, 0);
  group.add(rightArm);
  for (const limb of [arm, rightArm]) {
    cylinder(limb, 0.065, 0.06, 0.25, [0, -0.12, 0], skin, 7);
    cylinder(limb, 0.06, 0.05, 0.23, [0, -0.34, -0.025], skin, 7);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), skin);
    hand.position.set(0, -0.47, -0.025);
    limb.add(hand);
    bakeStatic(limb);
  }
  bakeStatic(head);
  bakeStatic(group, [arm, rightArm, head, ...legs]);
  return { group, arm, rightArm, head, legs };
}

export function animatePerson(
  person: ReturnType<typeof makePerson>,
  time: number,
  phase = 0,
  motion = 'chat',
) {
  const t = time + phase,
    clap = motion === 'clap',
    chant = motion === 'chant',
    police = motion === 'police';
  person.head.rotation.y = Math.sin(t * 0.7) * 0.28;
  person.head.rotation.x = Math.sin(t * 1.3) * 0.055;
  person.arm.rotation.z = clap
    ? -0.85 + Math.sin(t * 3.8) * 0.17
    : chant
      ? -1.8 + Math.sin(t * 2.2) * 0.28
      : police
        ? -1.15 + Math.sin(t) * 0.18
        : -0.2 + Math.sin(t * 1.6) * 0.17;
  person.rightArm.rotation.z = clap
    ? 0.85 - Math.sin(t * 3.8) * 0.17
    : chant
      ? 0.4 + Math.sin(t * 1.8) * 0.25
      : 0.16 + Math.sin(t * 1.4 + 0.8) * 0.15;
  person.arm.rotation.x = clap ? -1.1 : police ? -0.5 : Math.sin(t) * 0.15;
  person.rightArm.rotation.x = clap ? -1.1 : Math.sin(t + 0.7) * 0.13;
  person.legs.forEach((leg, i) => (leg.rotation.x = Math.sin(t * 0.9 + i * Math.PI) * 0.055));
}

export function createVillageLife(scene: THREE.Scene, world: RAPIER.World, statics: THREE.Group) {
  const samples = ROAD_PATHS.flatMap((c) => c.samples);
  const clear = (x: number, z: number, r = 10) =>
    !waterAt(x, z) &&
    !samples.some((p) => Math.hypot(p.x - x, p.z - z) < r) &&
    !PLACES.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < 16);
  const fixed = (x: number, z: number, w: number, d: number, yaw = 0) =>
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, 1.65, d / 2)
        .setTranslation(x, groundHeight(x, z) + 1.65, z)
        .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)),
    );
  // Everyday houses frame the roads; each keeps the existing tiled-roof style.
  const houses = [
    [-169, 24],
    [-128, 48],
    [-161, -31],
    [-129, -55],
    [-168, -78],
    [-124, -91],
    [-172, -151],
    [-112, -160],
    [-260, 31],
    [-243, -10],
    [-220, 40],
    [-225, 95],
    [-242, 125],
    [-262, 152],
    [-116, 159],
    [-126, 186],
    [-90, 193],
    [-55, 161],
    [-11, 163],
    [38, 116],
    [18, -118],
    [-7, -168],
    [66, -161],
  ];
  houses.forEach(([x, z], i) => {
    if (!clear(x, z, 9)) return;
    const house = makeBuilding('house', ['#c4b48c', '#a9b6a1', '#d1b695', '#bfc6ac'][i % 4]);
    house.group.position.set(x, groundHeight(x, z), z);
    house.group.rotation.y = i % 2 ? Math.PI : 0;
    statics.add(house.group);
    fixed(x, z, house.width, house.depth);
  });
  // Market stalls with fruit baskets, fabric awnings, and open counters.
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    g.position.set(-161 - i * 12, 0, 8);
    box(g, [7, 0.22, 5], [0, 2.8, 0], i % 2 ? materials.teal : materials.terracotta);
    for (const x of [-3, 3])
      for (const z of [-2, 2]) cylinder(g, 0.065, 0.065, 2.8, [x, 1.4, z], materials.wood, 6);
    box(g, [6.5, 0.85, 1.1], [0, 0.42, 1.5], materials.darkWood);
    textBoard(
      g,
      ['FRUIT & SPICE', 'TODAY’S CATCH', 'BOOK CORNER', 'FLOWER SHOP', 'CHAYA STOP'][i],
      5.6,
      0.65,
      [0, 2.3, 2.6],
      '#e1cf9d',
      '#29483d',
    );
    for (let n = 0; n < 12; n++) {
      const f = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.16, 0),
        i % 2 ? materials.yellow : materials.terracotta,
      );
      f.position.set(-2.4 + (n % 6) * 0.85, 0.96, 1.5 + Math.floor(n / 6) * 0.3);
      g.add(f);
    }
    bakeStatic(g);
    statics.add(g);
    fixed(g.position.x, g.position.z, 6.5, 2);
  }
  const ferry = new THREE.Group();
  ferry.position.set(-256, 0, 4);
  box(ferry, [9, 0.18, 12], [0, 0.11, 0], materials.wood);
  for (const x of [-4, 4]) cylinder(ferry, 0.14, 0.15, 3.7, [x, 1.85, -3], materials.darkWood, 8);
  textBoard(ferry, 'KADAVU · FERRY', 7, 1, [0, 3, -3], '#274f43', '#f1d59b');
  makeBench(ferry, 0, -1);
  bakeStatic(ferry);
  statics.add(ferry);
  const bus = new THREE.Group();
  bus.position.set(-99, 0, 222);
  box(bus, [7, 3.1, 0.15], [0, 1.55, 1.7], materials.plaster);
  box(bus, [8, 0.18, 4.3], [0, 3.1, 0], materials.terracotta);
  textBoard(bus, 'KSRTC · BUS STOP', 6, 0.55, [0, 2.65, 1.82], '#efdbb0', '#25453b');
  makeBench(bus, 0, 0);
  bakeStatic(bus);
  statics.add(bus);
  // Long paddy plots and bunds beyond the town centre.
  const rice = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.16, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: '#91a954', roughness: 1 }),
    2100,
  );
  const dummy = new THREE.Object3D();
  let n = 0;
  for (const [x, z, w, d] of [
    [-224, 217, 50, 55],
    [-174, 219, 30, 55],
    [-39, 113, 32, 54],
    [-99, 47, 42, 35],
    [-89, -156, 43, 42],
  ]) {
    addField(statics, x, z, w, d, '#84984d');
    for (let row = 0; row < d; row += 2)
      for (let col = 0; col < w; col += 2) {
        if (n >= rice.count) break;
        const px = x - w / 2 + col,
          pz = z - d / 2 + row;
        if (!clear(px, pz, 6)) continue;
        dummy.position.set(px, groundHeight(px, pz) + 0.25, pz);
        dummy.rotation.y = n * 0.8;
        dummy.scale.setScalar(0.85 + (n % 3) * 0.09);
        dummy.updateMatrix();
        rice.setMatrixAt(n++, dummy.matrix);
      }
  }
  rice.count = n;
  scene.add(rice);
  // Six independently culled palm groves keep the larger village inexpensive to render.
  const palm = makePalmGeometries();
  const groves: THREE.InstancedMesh[] = [];
  let seed = 9854;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const [cx, cz] of [
    [-246, -76],
    [-228, 122],
    [-175, 188],
    [-140, -166],
    [-66, -194],
    [13, 154],
  ]) {
    const trunks = new THREE.InstancedMesh(palm.trunk, materials.wood, 32);
    const palmMaterial = new THREE.MeshStandardMaterial({
      color: '#467b42',
      roughness: 1,
      side: THREE.DoubleSide,
    });
    clearCameraFoliage(palmMaterial);
    const fronds = new THREE.InstancedMesh(palm.fronds, palmMaterial, 32);
    let count = 0;
    for (let a = 0; a < 300 && count < 32; a++) {
      const x = cx + (rng() - 0.5) * 105,
        z = cz + (rng() - 0.5) * 105;
      if (x < -300 || z < -257 || z > 258 || !clear(x, z)) continue;
      dummy.position.set(x, groundHeight(x, z), z);
      dummy.rotation.set(0, rng() * 6.28, 0);
      dummy.scale.setScalar(0.73 + rng() * 0.5);
      dummy.updateMatrix();
      trunks.setMatrixAt(count, dummy.matrix);
      fronds.setMatrixAt(count, dummy.matrix);
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.24, 2, 0.24).setTranslation(x, groundHeight(x, z) + 2, z),
      );
      count++;
    }
    trunks.count = fronds.count = count;
    trunks.castShadow = fronds.castShadow = true;
    scene.add(trunks, fronds);
    groves.push(trunks, fronds);
  }
  const npcs = TAXI_STOPS.map((stop, i) => {
    const p = makePerson(PASSENGERS[i % PASSENGERS.length].color);
    const safe = passengerStop(stop.id);
    p.group.position.set(safe.x, groundHeight(safe.x, safe.z), safe.z);
    p.group.rotation.y = Math.atan2(stop.x - safe.x, stop.z - safe.z);
    scene.add(p.group);
    return p;
  });
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.82, 32),
    new THREE.MeshBasicMaterial({ color: '#f3d285', side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  scene.add(halo);
  let offers = [0],
    unavailable: number[] = [];
  const halos = [
    halo,
    ...[1, 2, 3].map(() => {
      const h = halo.clone();
      scene.add(h);
      return h;
    }),
  ];
  let active = 0,
    onboard = false,
    duty = false;
  const table = new THREE.Group();
  table.position.set(-44, 0, 28);
  cylinder(table, 1, 1, 0.12, [0, 0.87, 0], materials.wood, 16);
  cylinder(table, 0.09, 0.14, 0.85, [0, 0.43, 0], materials.darkWood, 8);
  bakeStatic(table);
  statics.add(table);
  const cup = new THREE.Group();
  cylinder(cup, 0.115, 0.08, 0.23, [0, 1.05, 0], materials.cream, 12);
  cylinder(cup, 0.105, 0.105, 0.01, [0, 1.17, 0], materials.terracotta, 12);
  cup.position.set(-44, 0, 28);
  cup.visible = false;
  scene.add(cup);
  const snack = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 8), materials.yellow);
  snack.rotation.z = Math.PI / 2;
  snack.position.set(-43.6, 0.99, 28);
  snack.visible = false;
  scene.add(snack);
  const steam = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(18), 3),
    ),
    new THREE.PointsMaterial({
      size: 0.08,
      color: '#e6e1c7',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  scene.add(steam);
  steam.visible = false;
  return {
    residents(): Resident[] {
      return npcs
        .filter((p) => p.group.visible)
        .map((p) => ({
          x: p.group.position.x,
          z: p.group.position.z,
          y: p.group.position.y,
          radius: 0.55,
        }));
    },
    setOffers(indices: number[], hidden: number[]) {
      offers = indices;
      unavailable = hidden;
    },
    setDuty(enabled: boolean) {
      duty = enabled;
    },
    setPassenger(index: number, isOnboard: boolean) {
      active = index;
      onboard = isOnboard;
      const id = PASSENGERS[active].from;
      npcs.forEach(
        (p, i) =>
          (p.group.visible =
            !unavailable.some((n) => PASSENGERS[n].from === TAXI_STOPS[i].id) &&
            !(onboard && TAXI_STOPS[i].id === id)),
      );
    },
    serve(item: string) {
      if (item === 'tea') {
        cup.visible = steam.visible = true;
      } else snack.visible = true;
    },
    quality(low: boolean) {
      rice.visible = !low;
      groves.forEach((g) => (g.castShadow = !low));
    },
    update(t: number) {
      const offerStops = offers.map((n) =>
        TAXI_STOPS.findIndex((s) => s.id === PASSENGERS[n].from),
      );
      npcs.forEach((p, i) => {
        p.group.visible = !unavailable.some((n) => PASSENGERS[n].from === TAXI_STOPS[i].id);
        animatePerson(p, t, i);
        p.arm.rotation.z =
          duty && offerStops.includes(i)
            ? -0.8 + Math.sin(t * 3 + i) * 0.35
            : 0.06 * Math.sin(t + i);
      });
      halos.forEach((h, n) => {
        const index = offerStops[n];
        h.visible = duty && index !== undefined;
        if (index !== undefined) {
          h.position.copy(npcs[index].group.position);
          h.position.y += 0.04;
          h.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
        }
      });
      if (steam.visible) {
        const a = steam.geometry.attributes.position;
        for (let i = 0; i < 6; i++) {
          const y = (t * 0.25 + i * 0.12) % 1;
          a.setXYZ(
            i,
            -44 + Math.sin(t + i) * y * 0.12,
            1.2 + y * 0.8,
            28 + Math.cos(t + i) * y * 0.12,
          );
        }
        a.needsUpdate = true;
      }
    },
  };
}
