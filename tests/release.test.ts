import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FareGame } from '../src/fares';
import { PASSENGERS, TAXI_STOPS, ROAD_CLOSURES, stopById, roadClearance } from '../src/village';
import { closureTravel, vergePosition, CLOSURE_WIDTH, CLOSURE_DEPTH } from '../src/placement';
import { JUNCTIONS, signalPhase, signalStops } from '../src/signals';
import { TownClock, nightAt } from '../src/weather';
import { lanePath, trafficSpawn } from '../src/traffic';
import { distance2 } from '../src/village';
import { PLACES } from '../src/projects';
import { groundHeight } from '../src/terrain';
import { passengerStop } from '../src/passenger-stops';
import { streetlightPositions, signalApproaches } from '../src/road-fixtures';

test('four offers remain available; a rival cannot steal a boarded passenger or mint money', () => {
  const game = new FareGame();
  assert.equal(game.offers.length, 4);
  const id = game.offers[0],
    stop = passengerStop(PASSENGERS[id].from);
  assert.equal(game.interact(stop, 0)?.kind, 'pickup');
  assert.equal(game.rivalArrive(id, stop, 0), false);
  assert.equal(game.snapshot.onboard, true);
  assert.equal(game.snapshot.wallet, 0);
  const job = game.rivalJob(stop)!;
  assert.notEqual(job.id, id);
  assert.equal(game.rivalArrive(job.id, job.target, 0), true);
  assert.equal(game.offers.length, 4);
  assert.equal(game.offers.includes(job.id), false);
  assert.equal(
    game.rivalArrive(job.id, job.target, 0),
    false,
    'a repeated pickup cannot also become a dropoff',
  );
  assert.equal(game.snapshot.wallet, 0);
});
test('a rival claim refreshes the player choice; cooled-down passengers become available again', () => {
  const game = new FareGame();
  const id = game.snapshot.passengerIndex,
    stop = game.pickup;
  assert.equal(game.rivalArrive(id, stop, 0), true);
  assert.notEqual(game.snapshot.passengerIndex, id);
  assert.equal(game.offers.length, 4);
  const job = game.rivalJob(stop)!;
  assert.equal(job.onboard, true);
  assert.equal(game.rivalArrive(id, job.target, 0), true);
  assert.equal(game.unavailable.includes(id), true);
  game.tick(40);
  assert.equal(game.unavailable.includes(id), false);
  assert.equal(game.select(game.offers[2]), true);
});
test('closures block front, diagonals, side and back sweeps in all orientations', () => {
  for (const c of ROAD_CLOSURES) {
    const local = (x: number, z: number) => ({
      x: c.x + Math.cos(c.yaw) * x + Math.sin(c.yaw) * z,
      z: c.z - Math.sin(c.yaw) * x + Math.cos(c.yaw) * z,
    });
    for (const [a, b] of [
      [local(0, 12), local(0, -20)],
      [local(CLOSURE_WIDTH / 2 + 10, -10), local(0, -10)],
      [local(0, -CLOSURE_DEPTH - 10), local(0, -20)],
      [local(-50, 9), local(20, -30)],
    ])
      assert.ok(closureTravel(a, b) < 1, c.title);
    assert.equal(closureTravel(local(0, 1.35), local(0, 8)), 1, 'reverse remains possible');
  }
});
test('taxi and tea-shop residents fit on dry verges outside the road envelope', () => {
  for (const stop of TAXI_STOPS) {
    const p = vergePosition({ x: stop.npcX, z: stop.npcZ });
    assert.ok(roadClearance(p.x, p.z) >= 1.95);
  }
  for (const point of [
    { x: -43, z: 24 },
    { x: -40, z: 23 },
  ]) {
    const p = vergePosition(point);
    assert.ok(roadClearance(p.x, p.z) >= 1.95);
  }
});
test('shared signals never show conflicting greens and give amber/all-red clearance', () => {
  for (let t = 0; t < 90; t += 0.1)
    assert.ok(!(signalPhase(t, 'ns') === 'green' && signalPhase(t, 'ew') === 'green'));
  assert.equal(signalPhase(12, 'ns'), 'amber');
  assert.equal(signalPhase(14, 'ns'), 'red');
  assert.equal(signalPhase(14, 'ew'), 'red');
  const j = JUNCTIONS[0];
  assert.equal(signalStops({ x: j.x + 1.6, z: j.z + 10 }, { x: 0, z: -1 }, 16), true);
  assert.equal(
    signalStops({ x: j.x + 1.6, z: j.z + 2 }, { x: 0, z: -1 }, 16),
    false,
    'vehicles already in the box clear it',
  );
});
test('day/night, dry/monsoon and weather use one clock and can return to automatic progression', () => {
  const c = new TownClock();
  assert.equal(c.hour, 16.5);
  assert.equal(nightAt(21), 1);
  assert.equal(nightAt(12), 0);
  c.setHour(18);
  assert.equal(c.night, 0.5);
  c.setHour();
  c.setWeather('rain');
  assert.equal(c.weather, 'rain');
  c.setWeather();
  for (let i = 0; i < 1250; i++) c.update(0.5);
  assert.equal(c.season, 'Monsoon');
  assert.ok(c.hour > 2 && c.hour < 3);
});
test('observatory has a level side terrace and driveway outside the building footprint', () => {
  const p = PLACES.find((p) => p.id === 'space')!;
  assert.ok(Math.hypot(p.trigger.x - p.position.x, p.trigger.z - p.position.z) > 11);
  assert.ok(roadClearance(p.position.x, p.position.z) > 4);
  assert.ok(Math.abs(groundHeight(p.position.x, p.position.z) - 23) < 0.01);
  assert.ok(groundHeight(p.trigger.x, p.trigger.z) > 20);
});

test('traffic spawns off every venue bay and away from the other traffic', () => {
  const occupied: { x: number; z: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const start = TAXI_STOPS[[5, 1, 9, 4, 8, 10, 0][i]],
      end = TAXI_STOPS[(i * 2 + 2) % TAXI_STOPS.length];
    const spawn = trafficSpawn(lanePath(start, end), occupied).point;
    assert.ok(PLACES.every((p) => distance2(spawn, p.trigger) > 10));
    assert.ok(occupied.every((p) => distance2(spawn, p) > 6));
    occupied.push(spawn);
  }
});
