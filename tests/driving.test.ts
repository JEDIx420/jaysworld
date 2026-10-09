import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { AutoVehicle, FIXED_STEP } from '../src/vehicle';
import { joystickInput, REST_INPUT, type DriveInput } from '../src/input';
import { nearestPlace, PLACES, isWater } from '../src/projects';

await RAPIER.init();
function setup() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(150, 0.2, 150).setTranslation(0, -0.2, 0).setFriction(0.95),
  );
  const vehicle = new AutoVehicle(world);
  vehicle.reset(0, 0);
  const step = (seconds: number, input: DriveInput = { ...REST_INPUT }) => {
    for (let i = 0; i < Math.round(seconds / FIXED_STEP); i++) {
      vehicle.beforeStep(input);
      world.step();
    }
  };
  step(1.5);
  return { world, vehicle, step };
}

test('three wheels support the auto without falling, hovering, or an invalid pose', () => {
  const { world, vehicle, step } = setup();
  try {
    step(3);
    const p = vehicle.body.translation();
    assert.ok(p.y > 0.4 && p.y < 1.15, `chassis height ${p.y}`);
    assert.equal(vehicle.controller.numWheels(), 3);
    assert.equal(vehicle.isOverturned(), false);
    assert.ok(vehicle.speed < 0.1);
    for (let i = 0; i < 3; i++) assert.equal(vehicle.controller.wheelIsInContact(i), true);
  } finally {
    world.free();
  }
});
test('forward input accelerates in the direction of the auto’s nose', () => {
  const { world, vehicle, step } = setup();
  try {
    step(3, { ...REST_INPUT, throttle: 1 });
    const p = vehicle.body.translation();
    assert.ok(p.z < -5, `forward position z=${p.z}`);
    assert.ok(vehicle.speed > 3 && vehicle.speed < 16, `speed ${vehicle.speed}`);
    assert.equal(vehicle.isOverturned(), false);
  } finally {
    world.free();
  }
});
test('braking stops the auto after acceleration', () => {
  const { world, vehicle, step } = setup();
  try {
    step(3, { ...REST_INPUT, throttle: 1 });
    const before = vehicle.speed;
    step(1.5, { ...REST_INPUT, brake: true });
    assert.ok(before > 3);
    assert.ok(vehicle.speed < 0.3, `braked speed ${vehicle.speed}`);
  } finally {
    world.free();
  }
});
test('right steering changes the trajectory without overturning the three-wheeler', () => {
  const { world, vehicle, step } = setup();
  try {
    step(1.0, { ...REST_INPUT, throttle: 1 });
    step(2.2, { ...REST_INPUT, throttle: 1, steer: 0.6 });
    const p = vehicle.body.translation();
    assert.ok(p.x > 1, `right turn x=${p.x}`);
    assert.equal(vehicle.isOverturned(), false);
    assert.ok(p.y < 1.5);
  } finally {
    world.free();
  }
});
test('a static wall blocks the vehicle instead of allowing tunneling', () => {
  const { world, vehicle, step } = setup();
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, 6, 0.35).setTranslation(0, 6, -8));
    step(5, { ...REST_INPUT, throttle: 1 });
    assert.ok(vehicle.body.translation().z > -8, `wall crossing z=${vehicle.body.translation().z}`);
  } finally {
    world.free();
  }
});
test('reset clears a moving vehicle and can place it at a project stop', () => {
  const { world, vehicle, step } = setup();
  try {
    step(2, { ...REST_INPUT, throttle: 1 });
    const stop = PLACES.find((p) => p.id === 'music')!;
    vehicle.reset(stop.trigger.x, stop.trigger.z);
    assert.ok(vehicle.speed < 0.001);
    assert.equal(
      nearestPlace(vehicle.body.translation().x, vehicle.body.translation().z)?.id,
      'music',
    );
  } finally {
    world.free();
  }
});
test('touch stick maps an upward-right drag to forward motion and right steering', () => {
  assert.deepEqual(joystickInput(20, -30, 40), {
    throttle: 0.75,
    steer: 0.5,
    brake: false,
    boost: false,
  });
  assert.deepEqual(joystickInput(1, -1, 40), REST_INPUT);
  assert.deepEqual(joystickInput(20, -30, 0), REST_INPUT);
  assert.deepEqual(joystickInput(NaN, 0, 40), REST_INPUT);
});
test('water recovery leaves the designated bridge crossing driveable', () => {
  assert.equal(isWater(55, 8), false);
  assert.equal(isWater(64, 8), true);
  assert.equal(isWater(94, 40), true);
  assert.equal(isWater(-51, 29), false);
});
