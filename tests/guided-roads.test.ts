import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { AutoVehicle, FIXED_STEP, SPAWN } from '../src/vehicle';
import { AutoPowertrain, ROAD_SPEED, BOOST_SPEED } from '../src/powertrain';
import { REST_INPUT } from '../src/input';
import { JourneyProgress } from '../src/journey-progress';
import { nearestPlace, PLACES } from '../src/projects';
import { ridgeGuardrails } from '../src/road-fixtures';
import { ROAD_PATHS, distance2, waterAt } from '../src/village';
import { terrainData, groundHeight } from '../src/terrain';
import { twoWheelerTravel, clearTrafficSpace, lanePath } from '../src/traffic';
import { makeBird } from '../src/birds';
import { makeCar } from '../src/traffic-models';

await RAPIER.init();
test('a new visit spawns on dry asphalt outside every entry trigger', () => {
  assert.equal(nearestPlace(SPAWN.x, SPAWN.z), undefined);
  assert.equal(waterAt(SPAWN.x, SPAWN.z), false);
  assert.ok(ROAD_PATHS.some((r) => r.samples.some((p) => distance2(SPAWN, p) < 2)));
});
test('five gears each require three powered seconds, with a rev drop and no boundary hunting', () => {
  const drive = { ...REST_INPUT, throttle: 1 },
    engine = new AutoPowertrain();
  for (let i = 0; i < 179; i++) engine.update(FIXED_STEP, 13.9 / 3.6, drive);
  assert.equal(engine.gear, 1);
  const before = engine.rpm;
  for (let i = 0; i < 10; i++) engine.update(FIXED_STEP, 15.1 / 3.6, drive);
  assert.equal(engine.gear, 2);
  assert.ok(engine.rpm < before * 0.6);
  engine.update(FIXED_STEP, 14 / 3.6, drive);
  assert.equal(engine.gear, 2);
  for (let gear = 2; gear < 5; gear++) {
    // A large jump in road speed cannot skip a gear or its minimum time.
    while (engine.gearSeconds < 3 - FIXED_STEP * 1.1) engine.update(FIXED_STEP, BOOST_SPEED, drive);
    assert.equal(engine.gear, gear);
    engine.update(FIXED_STEP * 2, BOOST_SPEED, drive);
    assert.equal(engine.gear, gear + 1);
  }
  assert.equal(engine.gear, 5);
});
test('player wheelies last two seconds with a gentle landing, including early release and braking', () => {
  const player = new AutoPowertrain(),
    npc = new AutoPowertrain(false),
    drive = { ...REST_INPUT, throttle: 1, boost: true };
  for (let i = 0; i < 60; i++) {
    player.update(FIXED_STEP, 10, drive);
    npc.update(FIXED_STEP, 10, drive);
  }
  assert.ok(player.wheelie > 0.2);
  assert.equal(npc.wheelie, 0);
  assert.equal(npc.boosted, false);
  let previous = player.wheelie;
  for (let i = 0; i < 60; i++) {
    player.update(FIXED_STEP, 10, drive);
    assert.ok(Math.abs(player.wheelie - previous) < 0.009, 'no hard snap during landing');
    previous = player.wheelie;
  }
  assert.ok(player.wheelie < 0.00001);
  player.update(FIXED_STEP, 10, { ...drive, boost: false });
  for (let i = 0; i < 45; i++) player.update(FIXED_STEP, 10, drive);
  const lifted = player.wheelie;
  player.update(FIXED_STEP, 10, { ...drive, brake: true });
  assert.equal(player.boosted, false);
  assert.ok(player.wheelie > lifted * 0.98, 'brake release starts a controlled descent');
  for (let i = 0; i < 40; i++) player.update(FIXED_STEP, 10, { ...drive, brake: true });
  assert.equal(player.wheelie, 0);
});
test('real player physics reaches 70/120 km/h, settles after boost, and NPC boost is ignored', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(2000, 0.2, 2000).setTranslation(0, -0.2, 0).setFriction(0.95),
  );
  try {
    const player = new AutoVehicle(world),
      npc = new AutoVehicle(world, 'auto', false);
    player.reset(0, 0);
    npc.reset(20, 0);
    const step = (seconds: number, boost: boolean) => {
      for (let i = 0; i < seconds / FIXED_STEP; i++) {
        const command = { ...REST_INPUT, throttle: 1, boost };
        player.beforeStep(command);
        npc.beforeStep(command);
        world.step();
      }
    };
    step(16, false);
    assert.ok(Math.abs(player.speed * 3.6 - 70) < 1, `road speed ${player.speed * 3.6}`);
    step(16, true);
    assert.ok(Math.abs(player.speed * 3.6 - 120) < 1, `boost speed ${player.speed * 3.6}`);
    assert.equal(player.isOverturned(), false);
    assert.equal(npc.powertrain.boosted, false);
    assert.ok(npc.speed < 12.1);
    step(5, false);
    assert.ok(player.speed * 3.6 < 71);
  } finally {
    world.free();
  }
});
test('accomplishments survive reload, award once, and visiting all places completes discovery', () => {
  const journey = new JourneyProgress();
  journey.trail = 'taxi';
  assert.equal(journey.earn('fare')?.id, 'fare');
  assert.equal(journey.earn('fare'), undefined);
  PLACES.forEach((p) => journey.visit(p.id));
  assert.equal(journey.earned.has('explorer'), true);
  const restored = new JourneyProgress(JSON.parse(JSON.stringify(journey.saved)));
  assert.deepEqual(restored.saved, journey.saved);
  assert.equal(restored.visit('space'), undefined);
  assert.equal(
    new JourneyProgress({ version: 1, visits: ['invented'], earned: ['invented'] }).earned.size,
    0,
  );
});
test('the whole observatory driveway stays clear of guardrails, including a vehicle-sized margin', () => {
  const driveway = ROAD_PATHS.find((r) => r.id === 'observatory-drive')!;
  const rails = ridgeGuardrails();
  assert.ok(rails.length > 20);
  for (const { a, b } of rails)
    for (let n = 0; n <= 20; n++) {
      const p = { x: a.x + ((b.x - a.x) * n) / 20, z: a.z + ((b.z - a.z) * n) / 20 };
      assert.ok(driveway.samples.every((q) => distance2(p, q) > 5.5));
    }
});
test('a hill motorbike moves over the sloping terrain but its sweep still blocks a fence', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  const data = terrainData();
  world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices));
  const bike = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.24, 0.62, 0.83).setTranslation(0, -0.08, 0),
    bike,
  );
  const start = { x: 45, z: -100 };
  bike.setTranslation({ ...start, y: groundHeight(start.x, start.z) + 0.75 }, true);
  try {
    world.step();
    for (let i = 0; i < 1200; i++) {
      const p = bike.translation(),
        to = { x: p.x, z: p.z - 4 * FIXED_STEP };
      const safe = twoWheelerTravel(world, bike, to, []);
      assert.equal(safe, 1, 'the terrain itself must not stop a grounded rider');
      bike.setNextKinematicTranslation({ ...to, y: groundHeight(to.x, to.z) + 0.75 });
      world.step();
    }
    const p = bike.translation();
    assert.ok(p.z < -179);
    assert.ok(p.y > 20);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.2).setTranslation(p.x, p.y, p.z - 3));
    world.step();
    assert.ok(
      twoWheelerTravel(world, bike, { x: p.x, z: p.z - 6 }, []) < 0.5,
      'fences still stop bikes',
    );
  } finally {
    world.free();
  }
});
test('traffic car silhouettes differ and the eagle has feathered hinged wings', () => {
  const bounds = ['classic', 'hatch', 'suv', 'luxury'].map((style) => {
    const car = makeCar(false, '#aaa', style as import('../src/traffic-models').CarStyle);
    assert.equal(car.wheels.length, 4);
    return new THREE.Box3().setFromObject(car.group).getSize(new THREE.Vector3());
  });
  assert.ok(bounds[2].y > bounds[1].y + 0.2);
  const eagle = makeBird(true);
  assert.equal(eagle.wings.length, 2);
  assert.ok(new THREE.Box3().setFromObject(eagle.group).getSize(new THREE.Vector3()).x > 2);
});
test('the clinic-to-hill traffic lane clears the OpsFlash porch and its collision envelope', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const office = PLACES.find((p) => p.id === 'opsflash')!;
  const yaw = Math.atan2(
    office.trigger.x - office.position.x,
    office.trigger.z - office.position.z,
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(5.55, 0.19, 4.8)
      .setTranslation(office.position.x, 0.19, office.position.z)
      .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)),
  );
  const path = lanePath(office.trigger, PLACES.find((p) => p.id === 'space')!.trigger);
  try {
    world.step();
    for (let i = 1; i < 25; i++) {
      const p = path[i],
        next = path[i + 1];
      assert.equal(
        clearTrafficSpace(world, p, Math.atan2(p.x - next.x, p.z - next.z), true),
        true,
        `porch obstructs lane at ${p.x}, ${p.z}`,
      );
    }
    assert.equal(
      clearTrafficSpace(world, office.position, yaw, true),
      false,
      'occupied recovery bays must be rejected',
    );
  } finally {
    world.free();
  }
});
test('full steering and emergency braking remain stable at boosted top speed', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.2, 2000).setTranslation(0, -0.2, 0));
  try {
    const auto = new AutoVehicle(world);
    auto.reset(0, 0);
    for (let i = 0; i < 1200; i++) {
      auto.beforeStep({ ...REST_INPUT, throttle: 1, boost: true });
      world.step();
    }
    for (let i = 0; i < 180; i++) {
      auto.beforeStep({ ...REST_INPUT, throttle: 1, boost: true, steer: 1 });
      world.step();
      assert.equal(auto.isOverturned(), false);
      assert.ok(auto.body.translation().y < 1.2);
    }
    for (let i = 0; i < 180; i++) {
      auto.beforeStep({ ...REST_INPUT, brake: true });
      world.step();
    }
    assert.ok(auto.speed < 0.4);
    assert.equal(auto.isOverturned(), false);
  } finally {
    world.free();
  }
});
