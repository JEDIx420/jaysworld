import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { BikeVehicle } from '../src/bike-vehicle';
import { RR310, BikePowertrain, bikeRpm } from '../src/bike-powertrain';
import { FIXED_STEP } from '../src/vehicle';
import { REST_INPUT, type DriveInput } from '../src/input';
import { ACCOMPLISHMENTS, JourneyProgress, guidedObjective } from '../src/journey-progress';
import { AMPHITHEATRE, CHILDRENS_PARK, BIKE_BAY } from '../src/recreation-layout';
import { PLACES } from '../src/projects';
import { roadClearance, waterAt, distance2, routeBetween } from '../src/village';
import { terrainData, groundHeight } from '../src/terrain';
import { Quaternion, Vector3 } from 'three';
import { Box3 } from 'three';
import { makeSportsbike } from '../src/sportsbike';

await RAPIER.init();
function setup() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(4000, 0.2, 4000).setTranslation(0, -0.2, 0).setFriction(1),
  );
  const bike = new BikeVehicle(world);
  bike.reset(0, 0, 0);
  const step = (seconds: number, input: DriveInput = { ...REST_INPUT }) => {
    for (let i = 0; i < Math.round(seconds / FIXED_STEP); i++) {
      bike.beforeStep(input);
      world.step();
    }
  };
  step(1);
  return { world, bike, step };
}
test('RR 310 ratios couple road speed to RPM and shifts cannot hunt', () => {
  assert.deepEqual(RR310.gears, [3, 2.063, 1.588, 1.286, 1.095, 0.955]);
  assert.ok(bikeRpm(160 / 3.6, 6) > 9900 && bikeRpm(160 / 3.6, 6) < 10200);
  const p = new BikePowertrain();
  p.update(1 / 60, 25, { ...REST_INPUT, throttle: 1 });
  assert.equal(p.gear, 2);
  p.update(1 / 60, 25, { ...REST_INPUT, throttle: 1 });
  assert.equal(p.gear, 2);
  for (let i = 0; i < 60; i++) p.update(1 / 60, 0, REST_INPUT);
  assert.equal(p.gear, 1);
});
test('two tyres support the bike and the rider mass without hovering', () => {
  const { world, bike, step } = setup();
  try {
    step(2);
    assert.equal(bike.controller.numWheels(), 2);
    assert.ok(bike.body.translation().y > 0.5 && bike.body.translation().y < 0.85);
    assert.ok(bike.speed < 0.1);
    assert.equal(bike.isOverturned(), false);
    assert.equal(bike.controller.wheelIsInContact(0), true);
    assert.equal(bike.controller.wheelIsInContact(1), true);
    assert.ok(Math.abs(bike.body.mass() - 249) < 0.1);
  } finally {
    world.free();
  }
});
test('reference acceleration and six gears reach the 160 km/h ceiling with or without boost', () => {
  for (const boost of [false, true]) {
    const { world, bike, step } = setup();
    try {
      let sixty = 0,
        hundred = 0;
      for (let i = 0; i < 2400; i++) {
        step(FIXED_STEP, { ...REST_INPUT, throttle: 1, boost });
        if (!sixty && bike.speed * 3.6 >= 60) sixty = (i + 1) * FIXED_STEP;
        if (!hundred && bike.speed * 3.6 >= 100) hundred = (i + 1) * FIXED_STEP;
      }
      assert.ok(sixty > 2.4 && sixty < 3.5, `0–60 ${sixty.toFixed(2)} s`);
      assert.ok(hundred > 6.2 && hundred < 8.2, `0–100 ${hundred.toFixed(2)} s`);
      assert.ok(
        bike.speed * 3.6 > 151 && bike.speed <= RR310.topSpeed + 0.2,
        `top speed ${(bike.speed * 3.6).toFixed(1)}`,
      );
      assert.equal(bike.powertrain.gear, 6);
      assert.equal(bike.isOverturned(), false);
    } finally {
      world.free();
    }
  }
});
test('brakes, reverse walking, turns, collision and reset remain controllable', () => {
  const { world, bike, step } = setup();
  try {
    step(3, { ...REST_INPUT, throttle: 1 });
    const before = bike.speed;
    step(2, { ...REST_INPUT, brake: true });
    assert.ok(bike.speed < 0.4, `braked ${bike.speed}`);
    assert.ok(before > 10);
    step(1, { ...REST_INPUT, throttle: -1 });
    assert.ok(bike.signedSpeed < -0.1 && bike.speed < 1.9);
    bike.reset(0, 0, 0);
    step(1);
    step(1.5, { ...REST_INPUT, throttle: 1 });
    step(2, { ...REST_INPUT, throttle: 1, steer: 0.7 });
    assert.ok(bike.body.translation().x > 0.7);
    assert.ok(Math.abs(bike.lean) > 0.1);
    assert.equal(bike.isOverturned(), false);
    bike.reset(0, 0, 0);
    step(1);
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 6, 0.3).setTranslation(0, 6, -15));
    step(5, { ...REST_INPUT, throttle: 1, boost: true });
    assert.ok(bike.body.translation().z > -15);
    bike.reset();
    assert.ok(bike.speed < 0.001);
    assert.equal(bike.powertrain.gear, 1);
  } finally {
    world.free();
  }
});
test('balance survives every compass heading, impacts and alternating left/right steering', () => {
  const { world, bike, step } = setup();
  try {
    for (let direction = 0; direction < 8; direction++) {
      const yaw = (direction * Math.PI) / 4;
      bike.reset(0, 0, yaw);
      step(1);
      // Side impacts must not unlock local roll after rotating the bike.
      const lateral = new Vector3(1, 0, 0).applyQuaternion(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
      );
      bike.body.applyImpulseAtPoint(lateral.multiplyScalar(130), { x: 0, y: 1.4, z: 0 }, true);
      for (const steer of [0.7, -0.7]) {
        step(0.8, { ...REST_INPUT, throttle: 1 });
        const from = new Vector3(0, 0, -1).applyQuaternion(
          new Quaternion().copy(bike.body.rotation()),
        );
        step(0.7, { ...REST_INPUT, throttle: 1, steer });
        const to = new Vector3(0, 0, -1).applyQuaternion(
          new Quaternion().copy(bike.body.rotation()),
        );
        assert.ok(
          from.clone().cross(to).y * -steer > 0.03,
          `turn direction at heading ${direction}`,
        );
        assert.ok(bike.lean * steer < 0, 'rider leans into the corner');
        const up = new Vector3(0, 1, 0).applyQuaternion(
          new Quaternion().copy(bike.body.rotation()),
        );
        assert.ok(up.y > 0.999, `balanced at heading ${direction}`);
      }
      step(3, { ...REST_INPUT, brake: true });
      assert.ok(bike.speed < 0.08, `stopped at heading ${direction}`);
      const atRest = { ...bike.body.translation() };
      step(3);
      assert.ok(
        Math.hypot(bike.body.translation().x - atRest.x, bike.body.translation().z - atRest.z) <
          0.01,
        'no stationary creep',
      );
    }
  } finally {
    world.free();
  }
});
test('hill road terrain supports the bike through cornering, braking and resting', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  const terrain = terrainData();
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(terrain.vertices, terrain.indices).setFriction(1),
  );
  const bike = new BikeVehicle(world);
  try {
    for (const [x, z, yaw] of [
      [-56, 20, Math.PI / 2],
      [0, -140, 0],
      [40, -200, Math.PI],
    ] as const) {
      bike.reset(x, z, yaw);
      for (let i = 0; i < 600; i++) {
        const input =
          i < 120
            ? REST_INPUT
            : i < 230
              ? { ...REST_INPUT, throttle: 1, steer: i < 175 ? 0.65 : -0.65 }
              : { ...REST_INPUT, brake: true };
        bike.beforeStep(input);
        world.step();
        const position = bike.body.translation();
        assert.ok(
          position.y > groundHeight(position.x, position.z) + 0.25,
          'chassis stays above terrain',
        );
        assert.equal(bike.isOverturned(), false);
      }
      assert.ok(bike.speed < 0.15, 'stable stop on the hill');
      assert.ok(
        bike.controller.wheelIsInContact(0) || bike.controller.wheelIsInContact(1),
        'tyre contact on terrain',
      );
    }
  } finally {
    world.free();
  }
});
test('the moving rider retracts his right boot, then plants it without stationary animation', () => {
  // Only the decal canvas needs a DOM; pose and sole geometry are real Three objects.
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const context = new Proxy(
    {},
    {
      get: (_, key) =>
        ['fillStyle', 'font', 'lineWidth', 'strokeStyle'].includes(String(key)) ? '' : () => {},
    },
  );
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ width: 1024, height: 512, getContext: () => context }) },
  });
  try {
    const bike = makeSportsbike();
    for (let i = 0; i <= 60; i++) bike.update(6, 0.25, false, i / 60, 0);
    assert.ok(bike.rightFootDown < 0.01);
    const movingSole = new Box3().setFromObject(bike.rightBoot).min.y;
    for (let i = 61; i <= 240; i++) bike.update(0, 0, false, i / 60, 0, -0.61, true);
    assert.equal(bike.rightFootDown, 1);
    const plantedSole = new Box3().setFromObject(bike.rightBoot).min.y;
    assert.ok(Math.abs(plantedSole + 0.61) < 0.002, `sole is on the ground: ${plantedSole}`);
    assert.ok(movingSole - plantedSole > 0.25);
    const pose = bike.rider.toJSON();
    bike.update(0, 0, false, 9, 0, -0.61, true);
    assert.deepEqual(bike.rider.toJSON(), pose, 'no rider movement at a stop');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
test('keys require every mission and every visit, persist once, and reject a forged saved flag', () => {
  const p = new JourneyProgress();
  assert.equal(p.claimBikeKeys(), false);
  PLACES.forEach((v) => p.visit(v.id));
  assert.equal(p.claimBikeKeys(), false);
  for (const a of ACCOMPLISHMENTS) p.earn(a.id);
  assert.equal(guidedObjective(p).kind, 'keys');
  assert.equal(p.claimBikeKeys(), true);
  assert.equal(p.claimBikeKeys(), false);
  const reloaded = new JourneyProgress(p.saved);
  assert.equal(reloaded.bikeKeys, true);
  assert.equal(guidedObjective(reloaded).kind, 'bike');
  assert.equal(new JourneyProgress({ version: 1, bikeKeys: true }).bikeKeys, false);
});
test('guided tour explicitly leads to activities and finishes at the telescope', () => {
  const p = new JourneyProgress();
  assert.equal(guidedObjective(p).place, 'eagle-eye');
  p.visit('eagle-eye');
  p.earn('company');
  assert.equal(guidedObjective(p).kind, 'roof');
  p.earn('roof');
  for (const id of ['opsflash', 'rift', 'music'] as const) p.visit(id);
  assert.equal(guidedObjective(p).kind, 'beat');
  p.earn('beat');
  p.visit('saltwater');
  assert.equal(guidedObjective(p).kind, 'wetland');
  p.earn('wetland');
  p.visit('about');
  assert.equal(guidedObjective(p).kind, 'fare');
  p.earn('fare');
  p.earn('first-road');
  p.visit('space');
  assert.equal(guidedObjective(p).kind, 'stars');
  p.earn('stars');
  assert.equal(p.complete, true);
});
test('recreation stays on dry land opposite the market; the bike is accessible by road', () => {
  assert.ok(AMPHITHEATRE.z > 30 && CHILDRENS_PARK.z > AMPHITHEATRE.z);
  for (const p of [AMPHITHEATRE, CHILDRENS_PARK, BIKE_BAY]) assert.equal(waterAt(p.x, p.z), false);
  assert.ok(roadClearance(AMPHITHEATRE.x, AMPHITHEATRE.z) > 20);
  assert.ok(roadClearance(CHILDRENS_PARK.x, CHILDRENS_PARK.z) > 12);
  assert.ok(distance2(BIKE_BAY, PLACES[1].trigger) < 6);
  assert.ok(routeBetween(PLACES[6].trigger, BIKE_BAY).distance > 200);
});
