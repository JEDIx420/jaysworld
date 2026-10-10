import { ROAD_PATHS, distance2, roadClearance, waterAt, type Point } from './village';
import { inClosedRegion } from './placement';
import { PLACES } from './projects';
import { JUNCTIONS } from './signals';

/** Lamps follow actual road shoulders, never the old decorative town loop. */
export function streetlightPositions() {
  const lamps: (Point & { yaw: number; road: string })[] = [];
  for (const road of ROAD_PATHS) {
    if (['eagle-forecourt', 'observatory-drive'].includes(road.id)) continue;
    let travelled = 0;
    for (let i = 1; i < road.samples.length - 1; i++) {
      const p = road.samples[i],
        last = road.samples[i - 1],
        next = road.samples[i + 1];
      travelled += distance2(p, last);
      if (travelled < 32) continue;
      travelled = 0;
      const yaw = Math.atan2(next.x - last.x, next.z - last.z),
        side = lamps.length % 2 ? 1 : -1,
        offset = road.width / 2 + 1.5;
      const spot = {
        x: p.x + Math.cos(yaw) * side * offset,
        z: p.z - Math.sin(yaw) * side * offset,
        yaw: yaw + (side * Math.PI) / 2,
        road: road.id,
      };
      if (
        waterAt(spot.x, spot.z) ||
        inClosedRegion(spot) ||
        roadClearance(spot.x, spot.z) < 1.1 ||
        roadClearance(spot.x, spot.z) > 2.8
      )
        continue;
      if (PLACES.some((v) => distance2(spot, v.trigger) < 10 || distance2(spot, v.position) < 13))
        continue;
      if (
        JUNCTIONS.some((j) => distance2(spot, j) < 19) ||
        lamps.some((l) => distance2(l, spot) < 24)
      )
        continue;
      lamps.push(spot);
    }
  }
  return lamps;
}

/** Find real junction arms. A T junction gets three poles rather than an invented crossroad. */
export function signalApproaches() {
  return JUNCTIONS.flatMap((junction, index) => {
    const directions: {
      x: number;
      z: number;
      inward: Point;
      width: number;
      axis: 'ns' | 'ew';
      offset: number;
      junction: string;
    }[] = [];
    for (const road of ROAD_PATHS) {
      let nearest = 0;
      road.samples.forEach((p, i) => {
        if (distance2(p, junction) < distance2(road.samples[nearest], junction)) nearest = i;
      });
      if (distance2(road.samples[nearest], junction) > 3.5) continue;
      for (const sign of [-1, 1]) {
        let n = nearest;
        while (
          n + sign >= 0 &&
          n + sign < road.samples.length &&
          distance2(road.samples[n], junction) < 13
        )
          n += sign;
        const point = road.samples[n];
        if (distance2(point, junction) < 9) continue;
        const length = distance2(point, junction),
          inward = { x: (junction.x - point.x) / length, z: (junction.z - point.z) / length };
        if (directions.some((a) => a.inward.x * inward.x + a.inward.z * inward.z > 0.86)) continue;
        const edge = road.width / 2 + 0.85;
        // Left-hand traffic: pole at the driver's left on the approach.
        const x = point.x + inward.z * edge,
          z = point.z - inward.x * edge;
        if (
          waterAt(x, z) ||
          roadClearance(x, z) < 0.35 ||
          PLACES.some((p) => distance2({ x, z }, p.trigger) < 7)
        )
          continue;
        directions.push({
          x,
          z,
          inward,
          width: road.width,
          axis: Math.abs(inward.z) > Math.abs(inward.x) ? 'ns' : 'ew',
          offset: index * 3,
          junction: junction.id,
        });
      }
    }
    return directions;
  });
}

/** Guardrails stop before intersecting driveways and destination approach bays. */
export function ridgeGuardrails() {
  const ridge = ROAD_PATHS.find((r) => r.id === 'observatory-road')!;
  const access = ROAD_PATHS.find((r) => r.id === 'observatory-drive')!;
  const rails: { a: Point; b: Point }[] = [];
  for (let i = 24; i < ridge.samples.length - 6; i += 5) {
    for (const side of [-1, 1]) {
      const edge = (n: number) => {
        const p = ridge.samples[n],
          next = ridge.samples[n + 1];
        const yaw = Math.atan2(next.x - p.x, next.z - p.z);
        return { x: p.x + Math.cos(yaw) * side * 4.45, z: p.z - Math.sin(yaw) * side * 4.45 };
      };
      const a = edge(i),
        b = edge(i + 5);
      // Sample the whole segment, not only its endpoints: long rails can cross a short driveway.
      const blocked = Array.from({ length: 11 }, (_, n) => ({
        x: a.x + ((b.x - a.x) * n) / 10,
        z: a.z + ((b.z - a.z) * n) / 10,
      })).some(
        (p) =>
          access.samples.some((q) => distance2(p, q) < 5.8) ||
          distance2(p, PLACES.find((v) => v.id === 'space')!.trigger) < 10,
      );
      if (!blocked) rails.push({ a, b });
    }
  }
  return rails;
}
