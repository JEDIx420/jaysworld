import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AutoVehicle } from './vehicle';
import { makeAuto, box, cylinder, materials, bakeStatic } from './models';
import { makeCar, makeTwoWheeler } from './traffic-models';
import { signalPhase, signalStops } from './signals';
import { signalApproaches } from './road-fixtures';
import { routeBetween, distance2, TAXI_STOPS, waterAt, type Point } from './village';
import { groundHeight } from './terrain';
import { closureTravel, inClosedRegion } from './placement';
import { PLACES } from './projects';
import { safeTravel, shouldYield, type Resident } from './safety';
export type RivalJob = { id: number; target: Point; onboard: boolean };
export function lanePath(from: Point, to: Point) {
  const route = routeBetween(from, to).points;
  return route.map((p, i) => {
    const a = route[Math.max(0, i - 2)],
      b = route[Math.min(route.length - 1, i + 2)],
      len = distance2(a, b) || 1;
    const blend = Math.min(1, i / 3, (route.length - 1 - i) / 3);
    return {
      x: p.x + ((b.z - a.z) / len) * 1.6 * blend,
      z: p.z - ((b.x - a.x) / len) * 1.6 * blend,
    };
  });
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
    (c) => c.shapeType() !== RAPIER.ShapeType.TriMesh,
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
    (collider) => collider.shapeType() !== RAPIER.ShapeType.TriMesh,
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
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0,
      });
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
  const count = small ? 8 : 12;
  const occupied: Point[] = [];
  const actors = Array.from({ length: count }, (_, i) => {
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
    const dynamic = kind === 'rival' || kind === 'auto' || kind === 'car';
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
    const vehicle = dynamic
      ? new AutoVehicle(world, kind === 'car' ? 'car' : 'auto', false)
      : undefined;
    const body =
      vehicle?.body ?? world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    if (!dynamic)
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.24, 0.62, 0.83)
          .setTranslation(0, -0.08, 0)
          .setFriction(0.2)
          .setRestitution(0),
        body,
      );
    const start = TAXI_STOPS[[5, 1, 9, 4, 8, 10, 0, 2, 6, 3, 7, 9][i]];
    let end = TAXI_STOPS[(i * 2 + 2) % TAXI_STOPS.length];
    if (end.id === start.id) end = TAXI_STOPS[(i * 2 + 5) % TAXI_STOPS.length];
    const path = lanePath(start, end),
      spawn = trafficSpawn(path, occupied, (p, n) => {
        const next = path[Math.min(n + 1, path.length - 1)];
        return clearTrafficSpace(
          world,
          p,
          Math.atan2(p.x - next.x, p.z - next.z),
          kind === 'car',
          body,
        );
      }),
      startPoint = spawn.point,
      first = path[spawn.index + 1] ?? end;
    occupied.push(startPoint);
    const yaw = Math.atan2(startPoint.x - first.x, startPoint.z - first.z);
    if (vehicle) vehicle.reset(startPoint.x, startPoint.z, yaw);
    else {
      body.setTranslation(
        { x: startPoint.x, y: groundHeight(startPoint.x, startPoint.z) + 0.75, z: startPoint.z },
        true,
      );
      body.setRotation(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
        true,
      );
    }
    model.group.position.copy(body.translation());
    model.group.quaternion.copy(body.rotation());
    scene.add(model.group);
    return {
      kind,
      model,
      vehicle,
      body,
      path,
      index: spawn.index,
      target: { x: end.x, z: end.z } as Point,
      trip: i,
      stopped: 0,
      reverse: 0,
      recoveries: 0,
      wait: 0,
      jobId: -1,
      jobOnboard: false,
      previous: new THREE.Vector3().copy(body.translation()),
      wheel: 0,
      speed: 0,
    };
  });
  let time = 0;
  return {
    actors,
    clearBay(point: Point) {
      for (const a of actors)
        if (distance2(a.body.translation(), point) < 5) {
          const other = actors.filter((b) => a !== b).map((b) => b.body.translation());
          const sample = a.path.findIndex(
            (p, i) =>
              i > a.index + 3 &&
              distance2(p, point) > 10 &&
              other.every((o) => distance2(p, o) > 6) &&
              !waterAt(p.x, p.z) &&
              !inClosedRegion(p) &&
              clearTrafficSpace(
                world,
                p,
                Math.atan2(p.x - (a.path[i + 1]?.x ?? p.x), p.z - (a.path[i + 1]?.z ?? p.z)),
                a.kind === 'car',
                a.body,
              ),
          );
          if (sample < 0) continue;
          const p = a.path[sample],
            next = a.path[Math.min(sample + 1, a.path.length - 1)],
            yaw = Math.atan2(p.x - next.x, p.z - next.z);
          if (a.vehicle) a.vehicle.reset(p.x, p.z, yaw);
          else {
            const target = { x: p.x, y: groundHeight(p.x, p.z) + 0.75, z: p.z },
              rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            a.body.setTranslation(target, true);
            a.body.setNextKinematicTranslation(target);
            a.body.setRotation(rot, true);
            a.body.setNextKinematicRotation(rot);
          }
          a.index = sample;
          a.speed = 0;
          a.previous.copy(a.body.translation());
        }
    },
    beforeStep(dt: number, residents: readonly Resident[], competition: boolean) {
      time += dt;
      for (const a of actors) {
        const pos = a.body.translation();
        a.previous.copy(pos);
        let rivalJob: RivalJob | undefined;
        if (a.kind === 'rival' && competition) rivalJob = job(pos);
        if (a.kind === 'rival' && !competition) {
          a.jobOnboard = false;
          a.jobId = -1;
        }
        if (rivalJob && (rivalJob.id !== a.jobId || rivalJob.onboard !== a.jobOnboard)) {
          a.target = { ...rivalJob.target };
          a.path = lanePath(pos, a.target);
          a.index = 0;
          a.jobId = rivalJob.id;
          a.jobOnboard = rivalJob.onboard;
          a.stopped = 0;
        }
        if (a.wait > 0) a.wait = Math.max(0, a.wait - dt);
        while (a.index < a.path.length - 2 && distance2(pos, a.path[a.index]) < 4) a.index++;
        // Closest forward sample prevents drift from making a driver orbit a missed waypoint.
        for (let n = a.index; n < Math.min(a.path.length, a.index + 10); n++)
          if (distance2(pos, a.path[n]) < distance2(pos, a.path[a.index])) a.index = n;
        const next = a.path[Math.min(a.path.length - 1, a.index + 2)] ?? a.target;
        const dx = next.x - pos.x,
          dz = next.z - pos.z,
          length = Math.hypot(dx, dz) || 1,
          direction = { x: dx / length, z: dz / length };
        const others: Resident[] = actors
          .filter((b) => a !== b)
          .map((b) => ({ ...b.body.translation(), radius: b.kind === 'car' ? 1.2 : 0.65 }));
        const blockers = [...residents, ...others];
        const nearby = distance2(pos, a.target) < 6;
        const blocked = shouldYield(
          pos,
          { x: direction.x * Math.max(a.speed, 3), z: direction.z * Math.max(a.speed, 3) },
          pos.y,
          blockers,
        );
        const red = signalStops(pos, direction, time);
        const stop = blocked || red || nearby || a.wait > 0;
        const turningBack = a.reverse > 0;
        a.reverse = Math.max(0, a.reverse - dt);
        if (a.vehicle) {
          const angle = Math.atan2(-direction.x, -direction.z),
            yaw = new THREE.Euler().setFromQuaternion(
              new THREE.Quaternion().copy(a.body.rotation()),
              'YXZ',
            ).y;
          const error = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
          const wanted =
            (a.kind === 'car' ? 6.5 : 5.5) * Math.max(0.35, 1 - Math.abs(error) * 0.45);
          a.vehicle.beforeStep(
            {
              throttle: turningBack ? -0.45 : stop ? 0 : a.speed > wanted ? 0 : 0.85,
              steer: THREE.MathUtils.clamp(-error * (turningBack ? -2.6 : 2.6), -1, 1),
              brake: turningBack ? false : stop || a.speed > wanted + 0.8,
              boost: false,
            },
            dt,
          );
        } else {
          const wanted = stop ? 0 : a.kind === 'cycle' ? 3 : 5;
          a.speed += (wanted - a.speed) * Math.min(1, dt * (stop ? 7 : 2));
          const proposed = {
            x: pos.x + direction.x * a.speed * dt,
            z: pos.z + direction.z * a.speed * dt,
          };
          const safe = twoWheelerTravel(world, a.body, proposed, blockers);
          const nx = pos.x + (proposed.x - pos.x) * safe,
            nz = pos.z + (proposed.z - pos.z) * safe;
          if (!waterAt(nx, nz))
            a.body.setNextKinematicTranslation({ x: nx, y: groundHeight(nx, nz) + 0.75, z: nz });
          a.body.setNextKinematicRotation(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              Math.atan2(-direction.x, -direction.z),
            ),
          );
        }
        if (nearby && a.speed < 1.2) {
          if (a.kind === 'rival' && rivalJob && competition) {
            if (arrive(rivalJob.id, pos, a.speed)) {
              a.jobId = -1;
              a.wait = 2;
            }
          } else if (a.kind !== 'rival' || !competition || !rivalJob) {
            a.trip++;
            const target = TAXI_STOPS[(a.trip * 3 + 5) % TAXI_STOPS.length];
            a.target = { x: target.x, z: target.z };
            a.path = lanePath(pos, target);
            a.index = 0;
            a.wait = 2;
          }
        }
        // Count real motion, including collision-blocked kinematic bikes. Lights and loading are intentional stops.
        a.stopped = red || nearby || a.wait > 0 ? 0 : a.speed < 0.3 ? a.stopped + dt : 0;
        if (a.vehicle && a.stopped > 4 && a.stopped < 4 + dt * 2 && !red) a.reverse = 1.8;
        // A prolonged jam is recovered on an unoccupied forward lane sample, away from the visitor.
        if (
          a.vehicle?.isOverturned() ||
          a.stopped > 18 ||
          pos.y < groundHeight(pos.x, pos.z) - 0.8
        ) {
          const candidate = a.path.findIndex(
            (p, i) =>
              i > a.index + 2 &&
              !waterAt(p.x, p.z) &&
              !inClosedRegion(p) &&
              residents.every(
                (r) => distance2(p, r) > (r === residents[residents.length - 1] ? 28 : 5),
              ) &&
              others.every((o) => distance2(p, o) > 7) &&
              clearTrafficSpace(
                world,
                p,
                Math.atan2(p.x - (a.path[i + 1]?.x ?? p.x), p.z - (a.path[i + 1]?.z ?? p.z)),
                a.kind === 'car',
                a.body,
              ),
          );
          if (candidate >= 0 && distance2(pos, residents[residents.length - 1] ?? pos) > 20) {
            const p = a.path[candidate],
              next = a.path[Math.min(candidate + 1, a.path.length - 1)];
            const yaw = Math.atan2(p.x - next.x, p.z - next.z);
            if (a.vehicle) a.vehicle.reset(p.x, p.z, yaw);
            else {
              const target = { x: p.x, y: groundHeight(p.x, p.z) + 0.75, z: p.z };
              const rotation = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                yaw,
              );
              a.body.setTranslation(target, true);
              a.body.setNextKinematicTranslation(target);
              a.body.setRotation(rotation, true);
              a.body.setNextKinematicRotation(rotation);
            }
            a.index = candidate;
            a.speed = 0;
            a.stopped = 0;
            a.reverse = 0;
            a.recoveries++;
            a.previous.copy(a.body.translation());
          }
        }
      }
    },
    afterStep(residents: readonly Resident[]) {
      for (const a of actors) {
        const p = a.body.translation();
        if (a.vehicle) {
          const safe = Math.min(
            safeTravel(a.previous, p, p.y, residents),
            closureTravel(a.previous, p, a.kind === 'car' ? 1.8 : 1.4),
          );
          if (safe < 1) {
            a.body.setTranslation(
              {
                x: a.previous.x + (p.x - a.previous.x) * safe,
                y: p.y,
                z: a.previous.z + (p.z - a.previous.z) * safe,
              },
              true,
            );
            a.body.setLinvel({ x: 0, y: a.body.linvel().y, z: 0 }, true);
          }
          a.speed = a.vehicle.speed;
        } else a.speed = distance2(a.previous, p) / world.timestep;
      }
    },
    update(dt: number, driver?: Point, visibleDistance = Infinity) {
      signalHeads.forEach((h) => {
        const phase = signalPhase(time, h.axis, h.index * 3);
        h.lamps.forEach(
          (m, i) =>
            (m.emissiveIntensity = i === { red: 0, amber: 1, green: 2 }[phase] ? 1.8 : 0.03),
        );
      });
      for (const a of actors) {
        a.model.group.position.copy(a.body.translation());
        if (!a.vehicle) a.model.group.position.y -= 0.75;
        a.model.group.quaternion.copy(a.body.rotation());
        a.model.group.visible =
          !driver || distance2(a.model.group.position, driver) < visibleDistance;
        if (!a.model.group.visible) continue;
        const model = a.model;
        if (a.vehicle && 'spinners' in model) {
          a.model.wheels.forEach((w, i) => {
            const p = a.vehicle!.wheelPoints[i];
            w.position.set(p.x, p.y - (a.vehicle!.controller.wheelSuspensionLength(i) ?? 0.3), p.z);
            w.rotation.y =
              i < (a.kind === 'car' ? 2 : 1) ? (a.vehicle!.controller.wheelSteering(i) ?? 0) : 0;
            model.spinners[i].rotation.x = a.vehicle!.controller.wheelRotation(i) ?? 0;
          });
        } else {
          a.wheel += (a.speed * dt) / 0.33;
          a.model.wheels.forEach((w) => (w.rotation.x = a.wheel));
          if ('animate' in model) model.animate(a.wheel, a.speed);
        }
      }
    },
    get time() {
      return time;
    },
  };
}
