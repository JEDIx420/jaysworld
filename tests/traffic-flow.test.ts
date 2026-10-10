import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { createEnvironment } from '../src/environment';
import { createTraffic, clearTrafficSpace, trafficObstacle } from '../src/traffic';
import { TRAFFIC_CIRCUITS, hillCircuit, advanceLane } from '../src/traffic-lanes';
import { groundHeight } from '../src/terrain';
import { FIXED_STEP } from '../src/vehicle';
import { roadClearance, distance2, waterAt } from '../src/village';
import { vergePosition } from '../src/placement';

await RAPIER.init();
// The test builds the actual village colliders. Sign painting needs no browser or GPU.
const context = new Proxy(
  {},
  { get: (_target, name) => (name === 'measureText' ? () => ({ width: 1 }) : () => {}) },
);
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: () => ({ width: 1, height: 1, getContext: () => context }) },
});

function town() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  const scene = new THREE.Scene(),
    environment = createEnvironment(scene, world);
  world.step();
  return { world, scene, environment };
}

test('every circulating car footprint clears actual buildings, fences and forecourts', () => {
  const { world } = town();
  try {
    for (const [route, path] of TRAFFIC_CIRCUITS.entries())
      for (let i = 0; i < path.length - 1; i++) {
        const p = path[i],
          next = path[i + 1],
          yaw = Math.atan2(p.x - next.x, p.z - next.z);
        assert.ok(roadClearance(p.x, p.z) < -0.4, `route ${route} leaves asphalt at ${p.x},${p.z}`);
        assert.equal(waterAt(p.x, p.z), false);
        assert.equal(
          clearTrafficSpace(world, p, yaw, true),
          true,
          `car clips village on route ${route} at ${p.x},${p.z}`,
        );
      }
    const ridge = hillCircuit();
    for (let i = 0; i < ridge.length - 1; i++) {
      const p = ridge[i],
        next = ridge[i + 1];
      assert.ok(roadClearance(p.x, p.z) < 0, 'hill turn remains paved');
      const collider = world.intersectionWithShape(
        { ...p, y: groundHeight(p.x, p.z) + 0.85 },
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.atan2(p.x - next.x, p.z - next.z),
        ),
        new RAPIER.Cuboid(0.3, 0.7, 0.9),
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
        undefined,
        undefined,
        undefined,
        trafficObstacle,
      );
      assert.equal(collider, null);
    }
  } finally {
    world.free();
  }
});
test('real traffic stays on its forward lane without vehicle overlap or reversing through junctions', () => {
  const { world, scene, environment } = town();
  try {
    const traffic = createTraffic(
      scene,
      world,
      false,
      () => undefined,
      () => false,
    );
    world.step();
    const last = traffic.actors.map((a) => a.odometer);
    const minuteProgress = [...last];
    for (let i = 0; i < 60 * 240; i++) {
      const residents = [...environment.life.residents(), ...environment.roadside.residents()];
      traffic.beforeStep(FIXED_STEP, residents, false);
      world.step();
      traffic.afterStep(residents);
      for (const a of traffic.actors) {
        const p = a.body.translation();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(a.previousQ);
        assert.ok(
          (p.x - a.previous.x) * forward.x + (p.z - a.previous.z) * forward.z >= -0.001,
          `${a.kind} turns without reversing`,
        );
        assert.ok(a.speed <= 6.3, `${a.kind} cannot jump between route samples`);
      }
      if ((i + 1) % (60 * 60) === 0)
        for (const [id, a] of traffic.actors.entries()) {
          assert.ok(
            a.odometer - minuteProgress[id] > 5,
            `${a.kind} ${id} is stranded at minute ${(i + 1) / 3600}: ${a.state}`,
          );
          minuteProgress[id] = a.odometer;
        }
      if (i % 30) continue;
      for (const [id, a] of traffic.actors.entries()) {
        const p = a.body.translation(),
          lane = advanceLane(a.path, a, 0, a.loop).point;
        assert.ok(distance2(p, lane) < 0.002, `${a.kind} ${id} leaves its lane`);
        assert.ok(a.odometer >= last[id], 'progress cannot move backwards');
        last[id] = a.odometer;
        assert.equal(
          clearTrafficSpace(world, p, a.yaw, a.kind === 'car', a.body),
          true,
          `${a.kind} ${id} overlaps a building or another vehicle at ${p.x},${p.z}`,
        );
      }
    }
    for (const [i, a] of traffic.actors.entries()) {
      assert.ok(a.odometer > 40, `${a.kind} ${i} travelled only ${a.odometer}m (${a.state})`);
      assert.equal(a.recoveries, 0, 'traffic must not depend on teleport recovery');
    }
  } finally {
    world.free();
  }
});
test('officers reserve separate dry verge positions at every actual road closure', () => {
  const { world, environment } = town();
  try {
    const officers = environment.roadside.officers();
    assert.equal(officers.length, 15);
    officers.forEach((p, i) => {
      assert.ok(roadClearance(p.x, p.z) >= 1.95);
      assert.ok(officers.slice(0, i).every((o) => distance2(o, p) >= 1.55));
    });
    const used: { x: number; z: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const p = vergePosition({ x: -51, z: 29 }, 0.55, used);
      assert.ok(used.every((o) => distance2(o, p) >= 1.55));
      used.push(p);
    }
  } finally {
    world.free();
  }
});

for (const completed of [0, 5])
  test(`the rival serves ${completed ? 'RIFT and the observatory' : 'village'} curb stops without clipping scenery or reversing`, async () => {
    const { FareGame } = await import('../src/fares');
    const { world, scene, environment } = town();
    try {
      const game = new FareGame({ version: 1, wallet: 0, completed, tea: 0, snacks: 0 });
      let events = 0;
      const traffic = createTraffic(
        scene,
        world,
        false,
        (p) => game.rivalJob(p),
        (id, p, speed) => {
          const accepted = game.rivalArrive(id, p, speed);
          if (accepted) events++;
          return accepted;
        },
      );
      world.step();
      const minuteProgress = traffic.actors.map((a) => a.odometer);
      for (let i = 0; i < 60 * 360; i++) {
        const residents = [...environment.life.residents(), ...environment.roadside.residents()];
        const competing = i < 60 * 150 || i > 60 * 170;
        traffic.beforeStep(FIXED_STEP, residents, competing);
        world.step();
        traffic.afterStep(residents);
        game.tick(FIXED_STEP);
        const rival = traffic.actors[0],
          pose = rival.body.translation();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rival.previousQ);
        assert.ok(
          (pose.x - rival.previous.x) * forward.x + (pose.z - rival.previous.z) * forward.z >=
            -0.001,
          `a route change cannot make the rival run backwards: t=${i / 60}, from=${JSON.stringify(rival.previous)}, to=${JSON.stringify(pose)}, index=${rival.index}, yaw=${rival.yaw}, job=${rival.jobId}`,
        );
        assert.ok(rival.speed <= 6.3, 'route changes cannot teleport a rival');
        if ((i + 1) % 3600 === 0)
          for (const [id, a] of traffic.actors.entries()) {
            assert.ok(
              a.odometer - minuteProgress[id] > 5,
              `${a.kind} ${id} is stranded while the rival works at minute ${(i + 1) / 3600}: ${a.state}`,
            );
            minuteProgress[id] = a.odometer;
          }
        if (i % 60) continue;
        const a = traffic.actors[0],
          p = a.body.translation();
        assert.equal(
          clearTrafficSpace(world, p, a.yaw, false, a.body),
          true,
          'a working rival must clear scenery and other vehicles',
        );
      }
      assert.ok(
        events >= (completed ? 2 : 4),
        `rival completed only ${events} pickup/dropoff events: ${traffic.actors[0].state}`,
      );
      assert.equal(traffic.actors[0].recoveries, 0);
      assert.equal(game.snapshot.wallet, 0, 'rival work cannot pay the player');
    } finally {
      world.free();
    }
  });
