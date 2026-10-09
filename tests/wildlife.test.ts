import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createWildlife } from '../src/wildlife';

test('wetland residents stay apart throughout their swim and dive cycles', () => {
  const w = createWildlife(new Scene());
  let surfaced = false,
    submerged = false;
  for (let t = 0; t < 180; t += 0.2) {
    w.update(t);
    for (let a = 0; a < 3; a++) {
      surfaced ||= w.position(a).y > 0;
      submerged ||= w.position(a).y < -0.5;
      for (let b = a + 1; b < 3; b++)
        assert.ok(
          w.position(a).distanceTo(w.position(b)) > 9,
          'crocodile bodies must not intersect',
        );
    }
  }
  assert.equal(surfaced, true);
  assert.equal(submerged, true);
});
test('a requested hunt opens the jaw, moves all four limbs and tail, and catches the fish', () => {
  const w = createWildlife(new Scene());
  w.update(10);
  w.hunt(1);
  w.update(12);
  assert.match(w.activity(1), /Stalking/);
  assert.equal(w.crocs[1].fish.visible, true);
  w.update(14.5);
  assert.match(w.activity(1), /Catching/);
  assert.ok(w.crocs[1].jaw.rotation.x < -0.2);
  assert.equal(w.crocs[1].fish.visible, false);
  assert.equal(w.crocs[1].legs.length, 4);
  assert.ok(w.crocs[1].legs.every((leg) => Math.abs(leg.rotation.y) > 0.001));
  assert.ok(w.crocs[1].tail.every((tail) => Math.abs(tail.rotation.y) > 0.001));
});
