import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { FareGame } from '../src/fares';
import { PASSENGERS, TAXI_STOPS, stopById, routeBetween, waterAt, inWorld } from '../src/village';
import { AutoVehicle, FIXED_STEP } from '../src/vehicle';
import { REST_INPUT } from '../src/input';
import { PLACES } from '../src/projects';

test('all eleven fares and seven exhibits belong to the connected larger road network', () => {
  for (const p of PASSENGERS) {
    const route = routeBetween(stopById(p.from), stopById(p.to));
    assert.ok(Number.isFinite(route.distance) && route.distance > 30);
    assert.ok(route.points.length >= 3);
  }
  for (const p of PLACES) {
    assert.ok(inWorld(p.trigger.x, p.trigger.z));
    assert.equal(waterAt(p.trigger.x, p.trigger.z), false);
    assert.ok(routeBetween(TAXI_STOPS[0], p.trigger).distance >= 0);
  }
  assert.ok(
    Math.max(...PLACES.map((p) => p.position.z)) - Math.min(...PLACES.map((p) => p.position.z)) >
      300,
  );
});
test('a passenger needs a slow pickup and a travelled ride; jumping cannot collect a fare', () => {
  const g = new FareGame();
  assert.equal(g.interact(g.pickup, 3), undefined);
  assert.equal(g.interact({ x: 0, z: 0 }, 0), undefined);
  assert.equal(g.interact(g.pickup, 0)?.kind, 'pickup');
  assert.equal(g.interact(g.destination, 0), undefined);
  g.update(g.destination);
  assert.equal(g.snapshot.onboard, false);
  assert.equal(g.snapshot.wallet, 0);
  assert.equal(g.snapshot.completed, 0);
});
test('Rapier driving earns a fare which funds tea and a snack, with exact wallet accounting', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(260, 0.2, 280).setTranslation(-80, -0.2, 0).setFriction(0.95),
  );
  const g = new FareGame(),
    v = new AutoVehicle(world);
  v.reset(
    g.pickup.x,
    g.pickup.z,
    Math.atan2(g.pickup.x - g.destination.x, g.pickup.z - g.destination.z),
  );
  try {
    for (let i = 0; i < 90; i++) {
      v.beforeStep(REST_INPUT);
      world.step();
    }
    assert.equal(g.interact(v.body.translation(), v.speed)?.kind, 'pickup');
    for (let i = 0; i < 3000; i++) {
      const p = v.body.translation();
      const distance = Math.hypot(p.x - g.destination.x, p.z - g.destination.z);
      v.beforeStep({ ...REST_INPUT, throttle: distance > 7 ? 1 : 0, brake: distance <= 7 });
      world.step();
      g.update(v.body.translation());
      if (g.actionAt(v.body.translation(), v.speed) === 'dropoff') break;
    }
    const payment = g.interact(v.body.translation(), v.speed);
    assert.equal(payment?.kind, 'dropoff');
    assert.ok(payment!.amount! >= 30);
    assert.equal(g.snapshot.wallet, payment!.amount);
    const before = g.snapshot.wallet;
    assert.equal(g.buy('tea', false).ok, false);
    assert.equal(g.snapshot.wallet, before);
    assert.equal(g.buy('tea', true).ok, true);
    assert.equal(g.buy('pazhampori', true).ok, true);
    assert.equal(g.snapshot.wallet, before - 25);
    assert.equal(g.snapshot.tea, 1);
    assert.equal(g.snapshot.snacks, 1);
    assert.equal(g.snapshot.completed, 1);
    const restored = new FareGame(g.saved);
    assert.deepEqual(restored.saved, g.saved);
    assert.equal(restored.snapshot.onboard, false);
  } finally {
    world.free();
  }
});
test('unfunded purchases, cancellation and invalid saves cannot mint game money', () => {
  const g = new FareGame({ version: 1, wallet: -100, completed: 0, tea: 0, snacks: 0 });
  assert.equal(g.snapshot.wallet, 0);
  assert.equal(g.buy('tea', true).ok, false);
  assert.equal(g.snapshot.tea, 0);
  g.interact(g.pickup, 0);
  assert.equal(g.cancel(), true);
  assert.equal(g.snapshot.wallet, 0);
  assert.equal(g.snapshot.onboard, false);
});
test('both canal bridges are dry and the water beside them is a recovery zone', () => {
  assert.equal(waterAt(-197.5, 168), false);
  assert.equal(waterAt(-197.5, 149), true);
  assert.equal(waterAt(55, 8), false);
  assert.equal(waterAt(64, 8), true);
  assert.equal(waterAt(-280, 0), true);
});
