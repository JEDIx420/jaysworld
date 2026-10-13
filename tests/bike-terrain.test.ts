import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { BikeVehicle, BIKE_SAFETY_RADIUS, BIKE_WHEELS } from '../src/bike-vehicle';
import { terrainData, groundHeight } from '../src/terrain';
import { ROAD_PATHS } from '../src/village';
import { REST_INPUT } from '../src/input';
import { FIXED_STEP } from '../src/vehicle';
import { safeTravel, shouldYield } from '../src/safety';

await RAPIER.init();
const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const angle = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));
function step(world: RAPIER.World, bike: BikeVehicle, seconds: number, input = REST_INPUT) {
  for (let i = 0; i < Math.round(seconds / FIXED_STEP); i++) {
    bike.beforeStep(input);
    world.step();
  }
}

test('the complete winding observatory road is rideable uphill and downhill in dry and wet conditions', () => {
  const road = ROAD_PATHS.find((r) => r.id === 'observatory-road')!.samples;
  const end = road.reduce(
    (best, p, i) =>
      Math.hypot(p.x - 50, p.z + 212) < Math.hypot(road[best].x - 50, road[best].z + 212)
        ? i
        : best,
    0,
  );
  for (const wet of [0, 1])
    for (const descending of [false, true]) {
      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      world.timestep = FIXED_STEP;
      const terrain = terrainData();
      world.createCollider(
        RAPIER.ColliderDesc.trimesh(terrain.vertices, terrain.indices).setFriction(0.95),
      );
      const route = road.slice(0, end + 1);
      if (descending) route.reverse();
      const bike = new BikeVehicle(world),
        start = route[0],
        goal = route.at(-1)!;
      const yaw = Math.atan2(-(route[1].x - start.x), -(route[1].z - start.z));
      bike.reset(start.x, start.z, yaw);
      bike.wet(wet);
      try {
        step(world, bike, 1.5);
        let progress = 0,
          missingRear = 0,
          frames = 0,
          worstLaneError = 0;
        for (; frames < 65 / FIXED_STEP; frames++) {
          const p = bike.body.translation();
          let closest = progress;
          for (let j = progress; j <= Math.min(progress + 24, route.length - 1); j++)
            if (
              Math.hypot(p.x - route[j].x, p.z - route[j].z) <
              Math.hypot(p.x - route[closest].x, p.z - route[closest].z)
            )
              closest = j;
          progress = closest;
          worstLaneError = Math.max(
            worstLaneError,
            Math.hypot(p.x - route[progress].x, p.z - route[progress].z),
          );
          if (progress >= route.length - 2 && Math.hypot(p.x - goal.x, p.z - goal.z) < 3.5) break;
          let target = Math.min(progress + 1, route.length - 1);
          const lookAhead = 4 + bike.speed * 0.3;
          while (
            target < route.length - 1 &&
            Math.hypot(route[target].x - p.x, route[target].z - p.z) < lookAhead
          )
            target++;
          const dx = route[target].x - p.x,
            dz = route[target].z - p.z;
          const error = angle(Math.atan2(-dx, -dz) - bike.headingYaw);
          const range = 0.57 / (1 + bike.speed * bike.speed * 0.0028);
          step(world, bike, FIXED_STEP, {
            ...REST_INPUT,
            throttle: bike.speed < 7 ? 1 : 0,
            brake: bike.speed > 8,
            steer: clamp(-Math.atan2(2 * 1.365 * Math.sin(error), Math.hypot(dx, dz)) / range),
          });
          if (!bike.controller.wheelIsInContact(1)) missingRear++;
          assert.equal(bike.isOverturned(), false);
          const at = bike.body.translation();
          assert.ok(at.y - groundHeight(at.x, at.z) > 0.25, 'chassis does not dig into the road');
        }
        assert.ok(
          progress >= route.length - 2,
          `route stalled at ${progress}/${route.length - 1}, wet ${wet}, descending ${descending}`,
        );
        assert.ok(worstLaneError < 2.3, `stays within the road: ${worstLaneError}`);
        assert.ok(
          missingRear / frames < 0.02,
          'driven tyre maintains traction throughout the climb',
        );
        assert.ok(
          Math.abs(
            groundHeight(bike.body.translation().x, bike.body.translation().z) -
              groundHeight(goal.x, goal.z),
          ) < 1,
        );
        step(world, bike, 2, { ...REST_INPUT, brake: true });
        assert.ok(bike.speed < 0.12, 'can stop at either end');
      } finally {
        world.free();
      }
    }
});

test('a steep gradient supports stationary starts, braking, relaunch and uphill reverse in every heading', () => {
  for (let direction = 0; direction < 8; direction++) {
    const yaw = (direction * Math.PI) / 4,
      fx = -Math.sin(yaw),
      fz = -Math.cos(yaw),
      grade = 0.35;
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = FIXED_STEP;
    const vertices = new Float32Array(
      [
        [-200, -200],
        [200, -200],
        [-200, 200],
        [200, 200],
      ].flatMap(([x, z]) => [x, grade * (fx * x + fz * z), z]),
    );
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, new Uint32Array([0, 2, 1, 1, 2, 3])).setFriction(0.95),
    );
    const bike = new BikeVehicle(world);
    try {
      bike.reset(0, 0, yaw);
      bike.wet(direction % 2);
      step(world, bike, 2);
      assert.ok(bike.speed < 0.12, 'stationary on the incline');
      assert.equal(
        bike.controller.wheelIsInContact(1),
        true,
        'rear tyre is grounded at an uphill start',
      );
      step(world, bike, 3, { ...REST_INPUT, throttle: 1 });
      let p = bike.body.translation();
      assert.ok(p.x * fx + p.z * fz > 6, `uphill launch in heading ${direction}`);
      assert.ok(bike.signedSpeed > 4, 'no uphill stall');
      step(world, bike, 3, { ...REST_INPUT, brake: true });
      const parked = { ...bike.body.translation() };
      step(world, bike, 3);
      p = bike.body.translation();
      assert.ok(Math.hypot(p.x - parked.x, p.z - parked.z) < 0.03, 'no sliding while stopped');
      step(world, bike, 1, { ...REST_INPUT, throttle: 1 });
      assert.ok(bike.signedSpeed > 1.5, 'can pull away after braking');
      bike.reset(0, 0, yaw + Math.PI);
      step(world, bike, 2);
      step(world, bike, 1.5, { ...REST_INPUT, throttle: -1 });
      p = bike.body.translation();
      assert.ok(p.x * fx + p.z * fz > 0.5, 'walking reverse can move uphill out of a tight spot');
      assert.ok(bike.signedSpeed < -0.3 && bike.speed < 1.9);
      assert.equal(bike.isOverturned(), false);
    } finally {
      world.free();
    }
  }
});

test('tyres regain traction after airtime and a side impact, and reverse escapes a wall contact', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(4000, 0.2, 4000).setTranslation(0, -0.2, 0).setFriction(1),
  );
  const bike = new BikeVehicle(world);
  try {
    bike.reset(0, 0, 0);
    bike.wet(1);
    step(world, bike, 1);
    bike.body.applyImpulse({ x: 0, y: 480, z: 0 }, true);
    let airborne = false;
    for (let i = 0; i < 180; i++) {
      step(world, bike, FIXED_STEP, { ...REST_INPUT, throttle: 1 });
      airborne ||= !bike.controller.wheelIsInContact(0) && !bike.controller.wheelIsInContact(1);
    }
    assert.ok(airborne, 'crest-like contact loss occurred');
    assert.equal(bike.controller.wheelIsInContact(1), true);
    assert.ok(bike.speed > 10, 'lands and keeps accelerating');
    bike.body.applyImpulse({ x: 220, y: 0, z: 0 }, true);
    step(world, bike, 1, { ...REST_INPUT, throttle: 1 });
    assert.ok(
      bike.signedSpeed > 10 && !bike.isOverturned(),
      'side knock does not cause a stuck skid',
    );
    const wallZ = bike.body.translation().z - 7;
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 6, 0.3).setTranslation(0, 6, wallZ));
    step(world, bike, 2, { ...REST_INPUT, throttle: 1 });
    assert.ok(bike.body.translation().z > wallZ, 'wall still blocks the bike');
    const contact = { ...bike.body.translation() };
    step(world, bike, 2, { ...REST_INPUT, throttle: -1 });
    assert.ok(bike.body.translation().z > contact.z + 1, 'can back away without reset or teleport');
    assert.equal(bike.controller.wheelIsInContact(1), true);
  } finally {
    world.free();
  }
});

test('bike pedestrian protection follows its narrow body and turn, while protecting the front wheel', () => {
  const origin = { x: 0, z: 0 },
    velocity = { x: 0, z: -10 };
  const footprint = { radius: BIKE_SAFETY_RADIUS, halfLength: BIKE_WHEELS[1].z, yaw: 0 };
  const verge = [{ x: 1.8, z: -8, y: 0, radius: 0.55 }];
  assert.equal(shouldYield(origin, velocity, 0, verge), true, 'auto keeps its existing clearance');
  assert.equal(
    shouldYield(origin, velocity, 0, verge, footprint),
    false,
    'bike clears the resident on the verge',
  );
  assert.equal(safeTravel(origin, { x: 0, z: -20 }, 0, verge, footprint), 1);
  const ahead = [{ x: 0, z: -8, y: 0, radius: 0.55 }];
  assert.equal(shouldYield(origin, velocity, 0, ahead, footprint), true);
  const fraction = safeTravel(origin, { x: 0, z: -20 }, 0, ahead, footprint);
  assert.ok(
    8 - 20 * fraction > footprint.halfLength + footprint.radius + 0.55,
    'front wheel/nose stays clear',
  );
  assert.equal(
    safeTravel(origin, { x: 0, z: 2 }, 0, [{ x: 0, z: -1.4, y: 0, radius: 0.55 }], footprint),
    1,
    'reverse can leave an existing safety zone',
  );
  const offBend = [{ x: 0, z: -10, y: 0, radius: 0.55 }];
  assert.equal(shouldYield(origin, velocity, 0, offBend, footprint), true);
  assert.equal(
    shouldYield(origin, velocity, 0, offBend, footprint, -0.8),
    false,
    'turn does not brake for the straight-ahead verge',
  );
  assert.equal(
    shouldYield(origin, velocity, 0, [{ x: 3.8, z: -8.95, y: 0, radius: 0.55 }], footprint, -0.8),
    true,
    'person on the predicted turn is still protected',
  );
});
