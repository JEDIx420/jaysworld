import test from 'node:test';
import assert from 'node:assert/strict';
import { FareGame } from '../src/fares';
import { PASSENGER_STOPS, passengerStop } from '../src/passenger-stops';
import { PASSENGERS, distance2, roadClearance, waterAt, routeBetween } from '../src/village';
import { streetlightPositions, signalApproaches } from '../src/road-fixtures';
import { PLACES } from '../src/projects';
import { inClosedRegion } from '../src/placement';
import { CURATED_STATIONS } from '../src/radio';

test('each visible customer can be picked up from their curb; directions and rival share it', () => {
  for (let id = 0; id < PASSENGERS.length; id++) {
    const game = new FareGame({ version: 1, wallet: 0, completed: id, tea: 0, snacks: 0 });
    const actual = passengerStop(PASSENGERS[id].from);
    assert.deepEqual(game.pickup, actual);
    assert.equal(waterAt(actual.x, actual.z), false);
    assert.ok(roadClearance(actual.x, actual.z) > 1.9);
    const route = routeBetween(PLACES[1].trigger, actual);
    assert.equal(distance2(route.points.at(-1)!, actual), 0);
    // The vehicle stops short of the resident's protected body.
    const curb = { x: actual.x + 2.2, z: actual.z };
    assert.equal(game.interact(curb, 0)?.kind, 'pickup', actual.label);
    assert.equal(game.rivalArrive(id, actual, 0), false);
    assert.equal(game.snapshot.wallet, 0);
  }
  assert.equal(PASSENGER_STOPS.length, 11);
});
test('streetlights stay on dry verges, spaced apart and clear of every entry and junction', () => {
  const lamps = streetlightPositions();
  assert.ok(lamps.length > 25);
  for (const [i, lamp] of lamps.entries()) {
    assert.equal(waterAt(lamp.x, lamp.z), false);
    assert.equal(inClosedRegion(lamp), false);
    assert.ok(roadClearance(lamp.x, lamp.z) >= 1.1);
    assert.ok(roadClearance(lamp.x, lamp.z) <= 2.8);
    assert.ok(
      PLACES.every((p) => distance2(lamp, p.trigger) >= 10 && distance2(lamp, p.position) >= 13),
    );
    assert.ok(lamps.slice(0, i).every((p) => distance2(lamp, p) >= 24));
  }
});
test('traffic-light poles follow real approaches, outside the carriageway and parking bays', () => {
  const poles = signalApproaches();
  assert.ok(poles.length >= 20);
  for (const pole of poles) {
    assert.ok(roadClearance(pole.x, pole.z) >= 0.35);
    assert.equal(waterAt(pole.x, pole.z), false);
    assert.ok(PLACES.every((p) => distance2(pole, p.trigger) >= 7));
    assert.ok(Math.abs(Math.hypot(pole.inward.x, pole.inward.z) - 1) < 1e-6);
  }
});
test('the dial includes classic blues and rock while Ente remains the first station', () => {
  assert.equal(CURATED_STATIONS[0].id, 'ente');
  assert.ok(CURATED_STATIONS.some((s) => /blues/i.test(s.description)));
  assert.ok(CURATED_STATIONS.some((s) => /classic rock/i.test(s.description)));
});
