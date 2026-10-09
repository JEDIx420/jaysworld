import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
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
  w.update(14.1);
  assert.match(w.activity(1), /Catching/);
  assert.ok(w.crocs[1].jaw.rotation.x < -0.2);
  w.update(14.6);
  assert.equal(w.crocs[1].fish.visible, false);
  assert.ok(Math.abs(w.crocs[1].jaw.rotation.x) < 0.05, 'jaw closes after capture');
  assert.equal(w.crocs[1].legs.length, 4);
  assert.ok(w.crocs[1].legs.every((leg) => Math.abs(leg.rotation.y) > 0.001));
  assert.ok(w.crocs[1].tail.every((tail) => Math.abs(tail.rotation.y) > 0.001));
});

test('fish swim along their own path and hunts recover without a discontinuity', () => {
  const w = createWildlife(new Scene());
  w.update(4);
  w.hunt(0);
  let last = w.position(0).clone(),
    fish = w.crocs[0].fish.position.clone();
  for (let t = 4.02; t < 17; t += 0.02) {
    w.update(t);
    const c = w.crocs[0];
    assert.ok(last.distanceTo(c.group.position) < 0.15, 'continuous crocodile trajectory');
    if (t > 4.1 && t < 8.2) {
      const delta = c.fish.position.clone().sub(fish);
      delta.y = 0;
      if (delta.length() > 0.0001) {
        const facing = new Vector3(0, 0, -1).applyAxisAngle(
          new Vector3(0, 1, 0),
          c.fish.rotation.y,
        );
        assert.ok(delta.normalize().dot(facing) > 0.85, 'fish faces its travel');
      }
    }
    last.copy(c.group.position);
    fish.copy(c.fish.position);
  }
});
