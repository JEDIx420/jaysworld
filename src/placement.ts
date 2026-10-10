import { ROAD_CLOSURES, ROAD_PATHS, roadClearance, waterAt, type Point } from './village';

/** All positions include the object's radius, not just its centre. */
export function vergePosition(point: Point, radius = 0.55, occupied: readonly Point[] = []): Point {
  const clear = (p: Point) =>
    !waterAt(p.x, p.z) &&
    roadClearance(p.x, p.z) >= radius + 1.4 &&
    occupied.every((o) => Math.hypot(p.x - o.x, p.z - o.z) >= radius * 2 + 0.45);
  if (clear(point)) return { ...point };
  for (let distance = 2; distance <= 26; distance += 2)
    for (let n = 0; n < 16; n++) {
      const angle = (n / 16) * Math.PI * 2;
      const candidate = {
        x: point.x + Math.cos(angle) * distance,
        z: point.z + Math.sin(angle) * distance,
      };
      if (clear(candidate)) return candidate;
    }
  throw new Error('No safe verge near ' + JSON.stringify(point));
}

export const CLOSURE_WIDTH = 76;
export const CLOSURE_DEPTH = 72;
export function closureLocal(point: Point, closure: (typeof ROAD_CLOSURES)[number]): Point {
  const x = point.x - closure.x,
    z = point.z - closure.z;
  return {
    x: Math.cos(closure.yaw) * x - Math.sin(closure.yaw) * z,
    z: Math.sin(closure.yaw) * x + Math.cos(closure.yaw) * z,
  };
}
export function inClosedRegion(point: Point): boolean {
  return ROAD_CLOSURES.some((c) => {
    const p = closureLocal(point, c);
    return Math.abs(p.x) < CLOSURE_WIDTH / 2 && p.z < 0 && p.z > -CLOSURE_DEPTH;
  });
}
/** Swept entry into the same fenced volumes used by the scenery/physics. */
export function closureTravel(from: Point, to: Point, radius = 1.35): number {
  let fraction = 1;
  for (const closure of ROAD_CLOSURES) {
    const a = closureLocal(from, closure),
      b = closureLocal(to, closure);
    let near = 0,
      far = 1;
    for (const [start, finish, min, max] of [
      [a.x, b.x, -CLOSURE_WIDTH / 2 - radius, CLOSURE_WIDTH / 2 + radius],
      [a.z, b.z, -CLOSURE_DEPTH - radius, radius],
    ]) {
      const delta = finish - start;
      if (Math.abs(delta) < 1e-9) {
        if (start < min || start > max) {
          near = 2;
          break;
        }
      } else {
        const p = (min - start) / delta,
          q = (max - start) / delta;
        near = Math.max(near, Math.min(p, q));
        far = Math.min(far, Math.max(p, q));
      }
    }
    // A body at the boundary must be able to reverse away.
    if (near <= far && near >= 0 && near <= 1 && far >= 0) {
      if (
        near === 0 &&
        ((b.z > a.z && a.z >= 0) ||
          (b.z < a.z && a.z <= -CLOSURE_DEPTH) ||
          (b.x > a.x && a.x >= CLOSURE_WIDTH / 2) ||
          (b.x < a.x && a.x <= -CLOSURE_WIDTH / 2))
      )
        continue;
      fraction = Math.min(fraction, Math.max(0, near - 0.002));
    }
  }
  return fraction;
}

export function nearestRoad(point: Point) {
  let best = Infinity,
    result = ROAD_PATHS[0].samples[0];
  for (const road of ROAD_PATHS)
    for (const p of road.samples) {
      const distance = Math.hypot(point.x - p.x, point.z - p.z);
      if (distance < best && !inClosedRegion(p) && !waterAt(p.x, p.z)) {
        best = distance;
        result = p;
      }
    }
  return { ...result };
}
