import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { terrainData, groundHeight } from '../src/terrain';
import {
  ROAD_PATHS,
  roadClearance,
  routeBetween,
  TAXI_STOPS,
  ROAD_CLOSURES,
  waterAt,
} from '../src/village';
import { addField } from '../src/surfaces';
import { shouldYield, safeTravel } from '../src/safety';
import { AutoVehicle, FIXED_STEP } from '../src/vehicle';
import { REST_INPUT } from '../src/input';
import { atlasHit, atlasPosition, navigationCue } from '../src/map';
import { PLACES } from '../src/projects';

await RAPIER.init();
test('the visible mountain triangles match Rapier ray heights across slopes and the summit', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }),
    data = terrainData();
  try {
    world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices));
    world.step();
    for (let z = -89; z >= -254; z -= 11)
      for (const x of [-83, -37, 7, 36, 58, 69]) {
        const hit = world.castRay(
          new RAPIER.Ray({ x, y: 60, z }, { x: 0, y: -1, z: 0 }),
          100,
          true,
        );
        assert.ok(hit);
        assert.ok(
          Math.abs(60 - hit.timeOfImpact - groundHeight(x, z)) < 0.003,
          `height mismatch at ${x},${z}`,
        );
      }
    assert.ok(groundHeight(50, -212) > 22);
    assert.equal(groundHeight(-51, 29), 0);
    const ridge = ROAD_PATHS.find((r) => r.id === 'observatory-road')!;
    let turning = 0;
    for (let i = 2; i < ridge.samples.length; i++) {
      const a = ridge.samples[i - 2],
        b = ridge.samples[i - 1],
        c = ridge.samples[i];
      const heading = (p: typeof a, q: typeof a) => Math.atan2(q.x - p.x, q.z - p.z);
      const delta = heading(b, c) - heading(a, b);
      turning += Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
      const grade =
        Math.abs(groundHeight(b.x, b.z) - groundHeight(c.x, c.z)) /
        Math.hypot(b.x - c.x, b.z - c.z);
      assert.ok(grade < 0.4, `undriveable road grade ${grade}`);
    }
    assert.ok(turning > Math.PI * 2, 'a genuinely winding climb');
  } finally {
    world.free();
  }
});
test('a real three-wheel auto climbs the terrain without sinking or overturning', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }),
    data = terrainData();
  world.timestep = FIXED_STEP;
  try {
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(data.vertices, data.indices).setFriction(0.95),
    );
    const auto = new AutoVehicle(world);
    auto.reset(45, -92);
    for (let i = 0; i < 90; i++) {
      auto.beforeStep(REST_INPUT);
      world.step();
    }
    const start = auto.body.translation();
    for (let i = 0; i < 1200; i++) {
      auto.beforeStep({ ...REST_INPUT, throttle: 1 });
      world.step();
      if (auto.body.translation().z < -196) break;
    }
    const end = auto.body.translation();
    assert.ok(end.z < -190, `climb reached ${end.z}`);
    assert.ok(end.y - start.y > 16, `height gained ${end.y - start.y}`);
    assert.ok(Math.abs(end.y - groundHeight(end.x, end.z)) < 1.2);
    assert.equal(auto.isOverturned(), false);
  } finally {
    world.free();
  }
});
test('the formerly overlapping paddy plot leaves the road and both verges clear', () => {
  const field = new THREE.Group();
  addField(field, -99, 47, 42, 35, '#84984d');
  const bed = field.getObjectByName('crop:road-cut-bed') as THREE.Mesh;
  assert.ok(bed.geometry.attributes.position.count > 0);
  const positions = bed.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++)
    assert.ok(
      roadClearance(positions.getX(i), positions.getZ(i)) > 1.5,
      'crop surface crosses asphalt or verge',
    );
});
test('directions follow the shared curved road geometry, with dry bridge crossings', () => {
  for (const start of TAXI_STOPS)
    for (const end of PLACES) {
      const route = routeBetween(start, end.trigger);
      for (const p of route.points.slice(1, -1))
        assert.equal(waterAt(p.x, p.z), false, `route enters water at ${p.x},${p.z}`);
    }
  for (const place of PLACES) {
    const p = atlasPosition(place.trigger);
    assert.equal(atlasHit(p.x, p.y)?.id, place.id);
    assert.equal(
      atlasHit(p.x, p.y, 840, 840, 80)?.id,
      place.id,
      'closest marker wins overlapping touch targets',
    );
    const center = { x: -51, z: 29 },
      zoomed = atlasPosition(place.trigger, 840, 840, 2.25, center);
    assert.equal(
      atlasHit(zoomed.x, zoomed.y, 840, 840, 40, 2.25, center)?.id,
      place.id,
      'zoom and pan use the same projection',
    );
  }
  assert.equal(atlasHit(0, 0), undefined);
  assert.match(
    navigationCue({ x: 0, z: 0 }, 0, [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 15, z: 0 },
    ]).instruction,
    /right/,
  );
  assert.equal(ROAD_CLOSURES.filter((c) => c.kind === 'works').length, 2);
});
test('a charging auto yields before a resident, cannot tunnel through them, and can reverse away', () => {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.createCollider(RAPIER.ColliderDesc.cuboid(80, 0.2, 80).setTranslation(0, -0.2, 0));
  const residents = [{ x: 0, z: -15, y: 0, radius: 0.55 }],
    auto = new AutoVehicle(world);
  auto.reset(0, 0);
  let closest = Infinity;
  try {
    for (let i = 0; i < 450; i++) {
      const previous = { ...auto.body.translation() },
        velocity = auto.body.linvel();
      const yielding = shouldYield(previous, velocity, previous.y, residents);
      auto.beforeStep({ ...REST_INPUT, throttle: yielding ? 0 : 1, brake: yielding });
      world.step();
      const current = auto.body.translation(),
        fraction = safeTravel(previous, current, current.y, residents);
      if (fraction < 1) {
        auto.body.setTranslation(
          {
            x: previous.x + (current.x - previous.x) * fraction,
            y: current.y,
            z: previous.z + (current.z - previous.z) * fraction,
          },
          true,
        );
        auto.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      closest = Math.min(
        closest,
        Math.hypot(auto.body.translation().x, auto.body.translation().z + 15),
      );
    }
    assert.ok(closest >= 2, `resident clearance ${closest}`);
    const stopped = auto.body.translation().z;
    for (let i = 0; i < 180; i++) {
      auto.beforeStep({ ...REST_INPUT, throttle: -1 });
      world.step();
    }
    assert.ok(auto.body.translation().z > stopped + 2, 'reverse escapes the safety zone');
    assert.ok(
      safeTravel({ x: 0, z: 10 }, { x: 0, z: -40 }, 0, residents) < 1,
      'long swept step is caught',
    );
    assert.equal(
      safeTravel({ x: 10, z: 10 }, { x: 10, z: -40 }, 0, residents),
      1,
      'unrelated traffic stays free',
    );
  } finally {
    world.free();
  }
});
