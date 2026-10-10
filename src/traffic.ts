import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { makeAuto, box, cylinder, materials, bakeStatic } from './models';
import { makeCar, makeTwoWheeler } from './traffic-models';
import { signalPhase, signalStops } from './signals';
import { signalApproaches } from './road-fixtures';
import { distance2, waterAt, type Point } from './village';
import { lanePath, TRAFFIC_CIRCUITS, hillCircuit, advanceLane } from './traffic-lanes';
import { JUNCTIONS } from './signals';
export { lanePath } from './traffic-lanes';
import { groundHeight } from './terrain';
import { closureTravel, inClosedRegion } from './placement';
import { PLACES } from './projects';
import { safeTravel, shouldYield, type Resident } from './safety';
export type RivalJob = { id: number; target: Point; onboard: boolean };
/** Road triangles and shallow bridge decks are ground, not a traffic barrier. */
export function trafficObstacle(c: RAPIER.Collider) {
  if (c.shapeType() === RAPIER.ShapeType.TriMesh) return false;
  return !(c.shape instanceof RAPIER.Cuboid && c.shape.halfExtents.y < 0.16);
}
export function trafficSpawn(
  path: readonly Point[],
  occupied: readonly Point[] = [],
  clear: (point: Point, index: number) => boolean = () => true,
) {
  for (let i = 4; i < path.length - 1; i++) {
    const p = path[i];
    if (
      !waterAt(p.x, p.z) &&
      !inClosedRegion(p) &&
      PLACES.every((v) => distance2(v.trigger, p) > 10) &&
      occupied.every((o) => distance2(o, p) > 6) &&
      clear(p, i)
    )
      return { point: p, index: i };
  }
  throw new Error('No clear traffic spawn on this route');
}

export function clearTrafficSpace(
  world: RAPIER.World,
  point: Point,
  yaw: number,
  car = false,
  body?: RAPIER.RigidBody,
) {
  return !world.intersectionWithShape(
    { x: point.x, y: groundHeight(point.x, point.z) + 0.85, z: point.z },
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    new RAPIER.Cuboid(car ? 1 : 0.75, 0.7, car ? 1.95 : 1.3),
    RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
    undefined,
    undefined,
    body,
    trafficObstacle,
  );
}

/** Terrain-following traffic sweeps barriers, while the road mesh supplies height only. */
export function twoWheelerTravel(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  to: Point,
  blockers: readonly Resident[],
) {
  const pos = body.translation();
  const move = {
    x: to.x - pos.x,
    y: groundHeight(to.x, to.z) - groundHeight(pos.x, pos.z),
    z: to.z - pos.z,
  };
  const hit = world.castShape(
    pos,
    body.rotation(),
    move,
    new RAPIER.Cuboid(0.26, 0.6, 0.82),
    0.02,
    1,
    true,
    RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
    undefined,
    undefined,
    body,
    trafficObstacle,
  );
  return Math.min(
    safeTravel(pos, to, pos.y, blockers),
    closureTravel(pos, to, 0.6),
    hit ? Math.max(0, hit.time_of_impact - 0.03) : 1,
  );
}
export function createTraffic(
  scene: THREE.Scene,
  world: RAPIER.World,
  small: boolean,
  job: (point: Point) => RivalJob | undefined,
  arrive: (id: number, point: Point, speed: number) => boolean,
) {
  const signalHeads: { axis: 'ns' | 'ew'; index: number; lamps: THREE.MeshStandardMaterial[] }[] =
    [];
  signalApproaches().forEach(({ x, z, inward, axis, offset }) => {
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    g.rotation.y = Math.atan2(-inward.x, -inward.z);
    cylinder(g, 0.07, 0.09, 3.5, [0, 1.75, 0], materials.darkWood, 8);
    box(g, [0.49, 1.22, 0.3], [0, 3.1, 0], materials.black);
    const lamps = ['#b4473b', '#d8a547', '#79a364'].map((color, i) => {
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0 });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat);
      lamp.scale.z = 0.35;
      lamp.position.set(0, 3.5 - i * 0.37, 0.17);
      g.add(lamp);
      return mat;
    });
    signalHeads.push({ axis, index: offset / 3, lamps });
    bakeStatic(g);
    scene.add(g);
  });
  const occupied: Point[] = [],
    ridge = hillCircuit();
  const actors = Array.from({ length: small ? 8 : 12 }, (_, i) => {
    const kind = [
      'rival',
      'car',
      'bike',
      'cycle',
      'car',
      'bike',
      'car',
      'car',
      'auto',
      'cycle',
      'car',
      'bike',
    ][i];
    const model =
      kind === 'rival' || kind === 'auto'
        ? makeAuto()
        : kind === 'car'
          ? makeCar(
              false,
              ['#e1ded0', '#758a9a', '#934d3e', '#3e484d'][i % 4],
              ['classic', 'hatch', 'suv', 'luxury'][
                Math.floor(i / 2) % 4
              ] as import('./traffic-models').CarStyle,
            )
          : makeTwoWheeler(kind === 'cycle');
    // NPCs follow a constrained lane; free suspension steering cannot throw them off the road.
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    const shape = new RAPIER.Cuboid(
      kind === 'car' ? 0.96 : kind === 'bike' || kind === 'cycle' ? 0.3 : 0.75,
      0.7,
      kind === 'car' ? 1.9 : kind === 'bike' || kind === 'cycle' ? 0.9 : 1.3,
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z)
        .setFriction(0.25)
        .setRestitution(0),
      body,
    );
    const path = i === 2 || i === 11 ? ridge : TRAFFIC_CIRCUITS[i % TRAFFIC_CIRCUITS.length];
    const desired = Math.floor(((i * 0.137 + 0.08) % 1) * (path.length - 1));
    let index = -1;
    for (let n = 0; n < path.length - 1; n++) {
      const k = (desired + n) % (path.length - 1),
        p = path[k],
        next = path[k + 1];
      if (
        occupied.every((o) => distance2(p, o) > 8) &&
        PLACES.every((v) => distance2(v.trigger, p) > 10) &&
        clearTrafficSpace(world, p, Math.atan2(p.x - next.x, p.z - next.z), kind === 'car', body)
      ) {
        index = k;
        break;
      }
    }
    if (index < 0) throw new Error('No safe traffic lane spawn');
    const p = path[index],
      next = path[index + 1];
    occupied.push(p);
    const yaw = Math.atan2(p.x - next.x, p.z - next.z);
    body.setTranslation({ ...p, y: groundHeight(p.x, p.z) + 0.85 }, true);
    body.setRotation(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      true,
    );
    model.group.position.copy(body.translation());
    model.group.quaternion.copy(body.rotation());
    scene.add(model.group);
    return {
      kind,
      model,
      body,
      shape,
      path,
      home: path,
      loop: true,
      index,
      offset: 0,
      target: p as Point,
      stopped: 0,
      recoveries: 0,
      wait: 0,
      jobId: -1,
      jobOnboard: false,
      previous: new THREE.Vector3().copy(body.translation()),
      previousQ: new THREE.Quaternion().copy(body.rotation()),
      wheel: 0,
      speed: 0,
      odometer: 0,
      yaw,
      turn: 0,
      state: 'driving',
    };
  });
  let time = 0;
  const owners = new Map<string, number>();
  const junctionQueues = new Map<string, Map<number, number>>();
  const rotation = (point: Point, yaw: number) => {
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) },
      span = 1.3;
    const grade =
      (groundHeight(point.x + forward.x * span, point.z + forward.z * span) -
        groundHeight(point.x - forward.x * span, point.z - forward.z * span)) /
      (span * 2);
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(grade), yaw, 0, 'YXZ'));
  };
  const travel = (
    a: (typeof actors)[number],
    from: Point,
    to: Point,
    residents: readonly Resident[],
    yaw = a.yaw,
  ) => {
    const pos = { ...from, y: groundHeight(from.x, from.z) + 0.85 };
    const hit = world.castShape(
      pos,
      rotation(from, yaw),
      {
        x: to.x - from.x,
        y: groundHeight(to.x, to.z) - groundHeight(from.x, from.z),
        z: to.z - from.z,
      },
      a.shape,
      0.08,
      1,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
      undefined,
      undefined,
      a.body,
      trafficObstacle,
    );
    return Math.min(
      safeTravel(from, to, pos.y, residents),
      closureTravel(from, to, a.shape.halfExtents.x),
      hit ? Math.max(0, hit.time_of_impact - 0.03) : 1,
    );
  };
  const reroute = (a: (typeof actors)[number], target: Point) => {
    const pos = a.body.translation();
    let prefix: Point[] = [{ x: pos.x, z: pos.z }];
    let direction = { x: -Math.sin(a.yaw), z: -Math.cos(a.yaw) };
    // Carry the current forward lane into a route change instead of snapping to the
    // nearest graph sample. Finish junction turns before planning a different approach.
    {
      for (let distance = 0.5; distance <= 34; distance += 0.5) {
        const next = advanceLane(a.path, a, distance, a.loop).point;
        if (distance2(next, prefix.at(-1)!) < 0.05) break;
        prefix.push(next);
        if (distance >= 12 && JUNCTIONS.every((j) => distance2(next, j) > 18)) break;
      }
      if (prefix.length > 1) {
        const end = prefix.at(-1)!,
          previous = prefix.at(-2)!;
        const length = distance2(previous, end);
        direction = { x: (end.x - previous.x) / length, z: (end.z - previous.z) / length };
      }
    }
    const anchor = prefix.at(-1)!,
      path = lanePath(anchor, target, true);
    if (path.length < 2) return false;
    const endPoint = path.at(-1)!,
      curbDistance = distance2(endPoint, target);
    if (curbDistance > 6.5) {
      // Stay in the carriageway, but pull toward the curb enough for a real seven-metre pickup.
      const move = Math.min(1.2, curbDistance - 6.5);
      for (let n = Math.max(0, path.length - 8); n < path.length; n++) {
        const blend = Math.max(0, (n - path.length + 8) / 7);
        path[n] = {
          x: path[n].x + ((target.x - endPoint.x) / curbDistance) * move * blend,
          z: path[n].z + ((target.z - endPoint.z) / curbDistance) * move * blend,
        };
      }
    }
    const tangent = { x: path[1].x - path[0].x, z: path[1].z - path[0].z };
    if (tangent.x * direction.x + tangent.z * direction.z < 0) {
      // A deliberate paved U-turn, with forward-only movement, before taking the other lane.
      const left = { x: direction.z, z: -direction.x },
        radius = 1.45;
      const turn = Array.from({ length: 25 }, (_, i) => {
        const angle = (i / 24) * Math.PI;
        return {
          x:
            anchor.x -
            left.x * radius +
            (left.x * Math.cos(angle) + direction.x * Math.sin(angle)) * radius,
          z:
            anchor.z -
            left.z * radius +
            (left.z * Math.cos(angle) + direction.z * Math.sin(angle)) * radius,
        };
      });
      prefix.push(...turn.slice(1));
    }
    const end = prefix.at(-1)!;
    while (path.length > 2 && distance2(end, path[1]) < distance2(end, path[0])) path.shift();
    const reversed = tangent.x * direction.x + tangent.z * direction.z < 0;
    const departure = reversed ? { x: -direction.x, z: -direction.z } : direction;
    while (
      path.length > 2 &&
      distance2(end, path[0]) < 6 &&
      (path[0].x - end.x) * departure.x + (path[0].z - end.z) * departure.z < 0.1
    )
      path.shift();
    // Lane offsets close to the graph's start can fold around a short first segment.
    // Join to a stable forward tangent beyond those samples with a smooth cubic curve.
    while (path.length > 2 && distance2(end, path[0]) < 3.2) path.shift();
    const start = path[0],
      next = path[1],
      span = distance2(end, start);
    const nextLength = distance2(start, next) || 1;
    const tangentOut = { x: (next.x - start.x) / nextLength, z: (next.z - start.z) / nextLength };
    const control = Math.min(2, span / 3);
    const join = Array.from({ length: 16 }, (_unused, i) => {
      const t = (i + 1) / 16,
        u = 1 - t;
      return {
        x:
          u * u * u * end.x +
          3 * u * u * t * (end.x + departure.x * control) +
          3 * u * t * t * (start.x - tangentOut.x * control) +
          t * t * t * start.x,
        z:
          u * u * u * end.z +
          3 * u * u * t * (end.z + departure.z * control) +
          3 * u * t * t * (start.z - tangentOut.z * control) +
          t * t * t * start.z,
      };
    });
    a.path = [...prefix, ...join, ...path].filter(
      (p, i, all) => !i || distance2(p, all[i - 1]) > 0.03,
    );
    a.index = a.offset = 0;
    a.loop = false;
    a.target = { ...target };
    return true;
  };
  return {
    actors,
    clearBay(point: Point) {
      for (const a of actors) {
        if (distance2(a.body.translation(), point) >= 5) continue;
        const index = a.path.findIndex(
          (p, n) =>
            n > a.index + 3 &&
            n < a.path.length - 1 &&
            distance2(p, point) > 12 &&
            actors.every((b) => a === b || distance2(p, b.body.translation()) > 8) &&
            clearTrafficSpace(
              world,
              p,
              Math.atan2(p.x - a.path[n + 1].x, p.z - a.path[n + 1].z),
              a.kind === 'car',
              a.body,
            ),
        );
        if (index < 0) continue;
        const p = a.path[index],
          next = a.path[index + 1];
        a.index = index;
        a.offset = a.speed = 0;
        a.yaw = Math.atan2(p.x - next.x, p.z - next.z);
        const target = { ...p, y: groundHeight(p.x, p.z) + 0.85 },
          q = rotation(p, a.yaw);
        a.body.setTranslation(target, true);
        a.body.setNextKinematicTranslation(target);
        a.body.setRotation(q, true);
        a.body.setNextKinematicRotation(q);
        a.previous.copy(target);
        a.previousQ.copy(q);
      }
    },
    beforeStep(dt: number, residents: readonly Resident[], competition: boolean) {
      time += dt;
      // One driver reserves a junction until it has cleared the box. Waiting traffic stays behind it.
      JUNCTIONS.forEach((j, n) => {
        const owner = owners.get(j.id);
        if (owner !== undefined) {
          const a = actors[owner],
            p = a.body.translation();
          const approaching = (j.x - p.x) * -Math.sin(a.yaw) + (j.z - p.z) * -Math.cos(a.yaw) > 0;
          if (
            distance2(p, j) > 17 ||
            (!approaching && distance2(p, j) > 8) ||
            (distance2(p, j) > 8 &&
              signalStops(p, { x: -Math.sin(a.yaw), z: -Math.cos(a.yaw) }, time))
          )
            owners.delete(j.id);
        }
        const queue = junctionQueues.get(j.id) ?? new Map<number, number>();
        junctionQueues.set(j.id, queue);
        const approaching = actors
          .map((a, index) => ({ a, index, distance: distance2(a.body.translation(), j) }))
          .filter(
            ({ a, distance }) =>
              distance < 16 &&
              ((j.x - a.body.translation().x) * -Math.sin(a.yaw) +
                (j.z - a.body.translation().z) * -Math.cos(a.yaw) >
                0 ||
                distance < 6) &&
              a.wait <= 0,
          );
        for (const id of queue.keys())
          if (!approaching.some((a) => a.index === id)) queue.delete(id);
        for (const a of approaching) if (!queue.has(a.index)) queue.set(a.index, time);
        if (!owners.has(j.id)) {
          const candidates = approaching.filter(
            ({ a }) =>
              !signalStops(
                a.body.translation(),
                { x: -Math.sin(a.yaw), z: -Math.cos(a.yaw) },
                time,
              ) &&
              !actors.some((b) => {
                if (a === b) return false;
                const p = a.body.translation(),
                  other = b.body.translation();
                const dx = other.x - p.x,
                  dz = other.z - p.z;
                const forward = dx * -Math.sin(a.yaw) + dz * -Math.cos(a.yaw);
                const side = Math.abs(dx * -Math.cos(a.yaw) - dz * -Math.sin(a.yaw));
                return forward > 0.5 && forward < 7 && side < 2 && Math.cos(a.yaw - b.yaw) > 0.5;
              }),
          );
          candidates.sort(
            (a, b) =>
              queue.get(a.index)! - queue.get(b.index)! ||
              a.distance - b.distance ||
              a.index - b.index,
          );
          if (candidates[0]) owners.set(j.id, candidates[0].index);
        }
      });
      for (const [id, a] of actors.entries()) {
        const pos = a.body.translation();
        a.previous.copy(pos);
        a.previousQ.copy(a.body.rotation());
        a.wait = Math.max(0, a.wait - dt);
        let rivalJob: RivalJob | undefined;
        if (a.kind === 'rival' && competition) rivalJob = job(pos);
        if (rivalJob && (rivalJob.id !== a.jobId || rivalJob.onboard !== a.jobOnboard)) {
          if (reroute(a, rivalJob.target)) {
            a.jobId = rivalJob.id;
            a.jobOnboard = rivalJob.onboard;
          }
        }
        if (a.kind === 'rival' && !competition && a.jobId >= 0) {
          a.jobId = -1;
          a.jobOnboard = false;
          // Rejoin a forward point on the usual circuit, then resume the loop.
          const nearest = a.home.reduce(
            (best, p, i) => (distance2(p, pos) < distance2(a.home[best], pos) ? i : best),
            0,
          );
          reroute(a, a.home[(nearest + 25) % (a.home.length - 1)]);
        }
        const here = advanceLane(a.path, a, 0, a.loop),
          ahead = advanceLane(a.path, a, 1.5, a.loop);
        const length = distance2(here.point, ahead.point) || 1;
        const direction = {
          x: (ahead.point.x - here.point.x) / length,
          z: (ahead.point.z - here.point.z) / length,
        };
        const yaw = Math.atan2(-direction.x, -direction.z);
        const bend = Math.abs(Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw)));
        const red = signalStops(pos, direction, time);
        const reserved = JUNCTIONS.some((j) => {
          const forward = (j.x - pos.x) * direction.x + (j.z - pos.z) * direction.z;
          return (
            distance2(pos, j) < 13 && forward > 6 && owners.has(j.id) && owners.get(j.id) !== id
          );
        });
        const arrived =
          !a.loop &&
          (distance2(pos, a.path.at(-1)!) < 1.2 || (rivalJob && distance2(pos, a.target) < 6.6));
        let wanted = a.kind === 'car' ? 6.2 : a.kind === 'cycle' ? 3 : 5;
        wanted = Math.min(wanted, 1.5 / Math.max(0.24, bend / 0.65));
        let clearance = 0;
        const horizon = Math.max(2, (a.speed * a.speed) / 6 + 1.5);
        for (let n = 1; n <= 4; n++) {
          const distance = (horizon * n) / 4,
            next = advanceLane(a.path, a, distance, a.loop).point;
          if (travel(a, pos, next, residents, yaw) < 1) break;
          clearance = distance;
        }
        wanted = Math.min(wanted, Math.sqrt(Math.max(0, clearance - 0.4) * 6));
        const blocked = shouldYield(
          pos,
          { x: direction.x * a.speed, z: direction.z * a.speed },
          pos.y,
          residents,
        );
        if (red || reserved || blocked || arrived || a.wait > 0) wanted = 0;
        a.state =
          a.wait > 0 || arrived
            ? 'loading'
            : red
              ? 'signal'
              : reserved
                ? 'junction'
                : blocked || clearance < 0.5
                  ? 'yielding'
                  : 'driving';
        a.speed = Math.max(0, a.speed + THREE.MathUtils.clamp(wanted - a.speed, -4 * dt, 1.3 * dt));
        const proposed = advanceLane(a.path, a, a.speed * dt, a.loop);
        const fraction = travel(a, pos, proposed.point, residents, yaw);
        const final = advanceLane(a.path, a, a.speed * dt * fraction, a.loop);
        if (fraction < 1) a.speed = 0;
        a.index = final.index;
        a.offset = final.offset;
        if (distance2(pos, final.point) > 0.00001) {
          a.yaw = Math.atan2(pos.x - final.point.x, pos.z - final.point.z);
          a.turn +=
            (THREE.MathUtils.clamp(
              Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw)) * 2,
              -0.4,
              0.4,
            ) -
              a.turn) *
            Math.min(1, dt * 8);
        }
        a.body.setNextKinematicTranslation({
          ...final.point,
          y: groundHeight(final.point.x, final.point.z) + 0.85,
        });
        a.body.setNextKinematicRotation(rotation(final.point, a.yaw));
        a.stopped = a.state === 'driving' && a.speed < 0.2 ? a.stopped + dt : 0;
        if (arrived && a.speed < 0.4 && a.wait <= 0) {
          if (rivalJob && competition) {
            if (arrive(rivalJob.id, pos, a.speed)) {
              a.jobId = -1;
              a.wait = 2;
            }
          } else {
            const closest = a.home.reduce(
              (best, p, i) => (distance2(p, pos) < distance2(a.home[best], pos) ? i : best),
              0,
            );
            a.path = a.home;
            a.index = Math.min(closest, a.path.length - 2);
            a.offset = 0;
            a.loop = true;
          }
        }
      }
    },
    afterStep(_residents: readonly Resident[]) {
      for (const a of actors) {
        const moved = distance2(a.previous, a.body.translation());
        a.speed = moved / world.timestep;
        a.odometer += moved;
      }
    },
    update(dt: number, driver?: Point, visibleDistance = Infinity, alpha = 1) {
      signalHeads.forEach((h) =>
        h.lamps.forEach((m, i) => {
          m.emissiveIntensity =
            i === { red: 0, amber: 1, green: 2 }[signalPhase(time, h.axis, h.index * 3)]
              ? 1.8
              : 0.03;
        }),
      );
      for (const a of actors) {
        a.model.group.position.lerpVectors(
          a.previous,
          new THREE.Vector3().copy(a.body.translation()),
          alpha,
        );
        if (a.kind === 'bike' || a.kind === 'cycle') a.model.group.position.y -= 0.85;
        a.model.group.quaternion.slerpQuaternions(
          a.previousQ,
          new THREE.Quaternion().copy(a.body.rotation()),
          alpha,
        );
        a.model.group.visible =
          !driver || distance2(a.model.group.position, driver) < visibleDistance;
        if (!a.model.group.visible) continue;
        a.wheel += (a.speed * dt) / 0.32;
        const model = a.model;
        if ('spinners' in model) {
          model.wheels.forEach((w, i) => {
            w.rotation.y = i < (a.kind === 'car' ? 2 : 1) ? a.turn : 0;
            model.spinners[i].rotation.x = a.wheel;
          });
        } else {
          a.model.wheels.forEach((w) => (w.rotation.x = a.wheel));
          if ('animate' in a.model) a.model.animate(a.wheel, a.speed);
        }
      }
    },
    get time() {
      return time;
    },
  };
}
