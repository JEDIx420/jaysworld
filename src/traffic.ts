import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AutoVehicle } from './vehicle';
import { makeAuto, box, cylinder, materials, bakeStatic } from './models';
import { makeCar, makeTwoWheeler } from './traffic-models';
import { JUNCTIONS, signalPhase, signalStops } from './signals';
import { routeBetween, distance2, TAXI_STOPS, waterAt, type Point } from './village';
import { groundHeight } from './terrain';
import { closureTravel, nearestRoad, inClosedRegion } from './placement';
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
export function trafficSpawn(path: readonly Point[], occupied: readonly Point[] = []) {
  for (let i = 4; i < path.length - 1; i++) {
    const p = path[i];
    if (
      !waterAt(p.x, p.z) &&
      !inClosedRegion(p) &&
      PLACES.every((v) => distance2(v.trigger, p) > 10) &&
      occupied.every((o) => distance2(o, p) > 6)
    )
      return { point: p, index: i };
  }
  throw new Error('No clear traffic spawn on this route');
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
  JUNCTIONS.forEach((j, index) => {
    for (const axis of ['ns', 'ew'] as const)
      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        const x = j.x + (axis === 'ns' ? side * 5.4 : side * 9),
          z = j.z + (axis === 'ns' ? side * 9 : side * 5.4);
        g.position.set(x, groundHeight(x, z), z);
        g.rotation.y =
          axis === 'ns' ? (side < 0 ? 0 : Math.PI) : side < 0 ? Math.PI / 2 : -Math.PI / 2;
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
        signalHeads.push({ axis, index, lamps });
        bakeStatic(g);
        scene.add(g);
      }
  });
  const count = small ? 4 : 7;
  const occupied: Point[] = [];
  const actors = Array.from({ length: count }, (_, i) => {
    const kind = i === 0 ? 'rival' : i % 3 === 1 ? 'car' : i % 3 === 2 ? 'bike' : 'cycle';
    const dynamic = kind === 'rival' || kind === 'car';
    const model =
      kind === 'rival'
        ? makeAuto()
        : kind === 'car'
          ? makeCar(false, ['#e1ded0', '#ae7459'][i % 2])
          : makeTwoWheeler(kind === 'cycle');
    const vehicle = dynamic ? new AutoVehicle(world, kind === 'car' ? 'car' : 'auto') : undefined;
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
    const start = TAXI_STOPS[[5, 1, 9, 4, 8, 10, 0][i]],
      end = TAXI_STOPS[(i * 2 + 2) % TAXI_STOPS.length];
    const path = lanePath(start, end),
      spawn = trafficSpawn(path, occupied),
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
              !inClosedRegion(p),
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
        const pos = a.body.translation(),
          old = a.previous.copy(pos);
        let rivalJob: RivalJob | undefined;
        if (a.kind === 'rival' && competition) rivalJob = job(pos);
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
        if (a.vehicle) {
          const angle = Math.atan2(-direction.x, -direction.z),
            yaw = new THREE.Euler().setFromQuaternion(
              new THREE.Quaternion().copy(a.body.rotation()),
              'YXZ',
            ).y;
          const error = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
          const wanted = a.kind === 'car' ? 6.5 : 5.5;
          a.vehicle.beforeStep(
            {
              throttle: stop ? 0 : a.speed > wanted ? 0 : 0.85,
              steer: THREE.MathUtils.clamp(-error * 2.6, -1, 1),
              brake: stop,
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
          const move = {
            x: proposed.x - pos.x,
            y: groundHeight(proposed.x, proposed.z) - groundHeight(pos.x, pos.z),
            z: proposed.z - pos.z,
          };
          const hit = world.castShape(
            pos,
            a.body.rotation(),
            move,
            new RAPIER.Cuboid(0.26, 0.6, 0.82),
            0.02,
            1,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
            undefined,
            undefined,
            a.body,
          );
          const safe = Math.min(
            safeTravel(pos, proposed, pos.y, blockers),
            closureTravel(pos, proposed, 0.6),
            hit ? Math.max(0, hit.time_of_impact - 0.03) : 1,
          );
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
          } else if (a.kind !== 'rival' || (!competition && !a.jobOnboard)) {
            a.trip++;
            const target = TAXI_STOPS[(a.trip * 3 + 5) % TAXI_STOPS.length];
            a.target = { x: target.x, z: target.z };
            a.path = lanePath(pos, target);
            a.index = 0;
            a.wait = 2;
          }
        }
        a.stopped = stop ? 0 : a.speed < 0.3 ? a.stopped + dt : 0;
        // A blocked lane stays stopped. A tipped or physically stranded AI returns to its own lane, never near the player.
        if (
          a.vehicle &&
          (a.vehicle.isOverturned() || a.stopped > 25 || pos.y < groundHeight(pos.x, pos.z) - 0.8)
        ) {
          const road = nearestRoad(pos),
            yaw = Math.atan2(-direction.x, -direction.z);
          if (distance2(road, residents[residents.length - 1] ?? road) > 15) {
            a.vehicle.reset(road.x, road.z, yaw);
            a.path = lanePath(road, a.target);
            a.index = 0;
          }
          a.stopped = 0;
        }
        old.copy(pos);
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
        }
      }
    },
    update(dt: number) {
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
        }
      }
    },
    get time() {
      return time;
    },
  };
}
