import { routeBetween, ROAD_PATHS, distance2, type Point } from './village';

function roundJunctions(points: Point[]) {
  const result: Point[] = [];
  let consumed = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      a = points[i - 1],
      b = points[i + 1];
    const incoming = { x: p.x - a.x, z: p.z - a.z },
      outgoing = { x: b.x - p.x, z: b.z - p.z };
    const dot =
      (incoming.x * outgoing.x + incoming.z * outgoing.z) / (distance2(a, p) * distance2(p, b));
    if (dot > Math.cos(0.45)) continue;
    const half = Math.acos(Math.max(-1, Math.min(1, dot))) / 2;
    const leftTurn = incoming.x * outgoing.z - incoming.z * outgoing.x < 0;
    const wantedInset = leftTurn
      ? Math.max(4.5, (2.6 * Math.sin(half)) / Math.max(0.08, Math.cos(half) ** 2))
      : 4.5;
    let start = i,
      end = i,
      back = 0,
      ahead = 0;
    while (start > consumed && back < wantedInset) {
      back += distance2(points[start], points[start - 1]);
      start--;
    }
    while (end < points.length - 1 && ahead < wantedInset) {
      ahead += distance2(points[end], points[end + 1]);
      end++;
    }
    if (back < 2.6 || ahead < 2.6) continue;
    const inset = Math.min(wantedInset, back, ahead);
    const cut = (index: number, step: number) => {
      let remaining = inset,
        at = index;
      while (distance2(points[at], points[at + step]) < remaining) {
        remaining -= distance2(points[at], points[at + step]);
        at += step;
      }
      const q = points[at],
        r = points[at + step],
        t = remaining / distance2(q, r);
      return { point: { x: q.x + (r.x - q.x) * t, z: q.z + (r.z - q.z) * t }, index: at };
    };
    const from = cut(i, -1),
      to = cut(i, 1);
    if (from.index < consumed) continue;
    result.push(...points.slice(consumed, from.index), from.point);
    for (let n = 1; n <= 16; n++) {
      const t = n / 16,
        u = 1 - t;
      result.push({
        x: from.point.x * u * u + 2 * p.x * u * t + to.point.x * t * t,
        z: from.point.z * u * u + 2 * p.z * u * t + to.point.z * t * t,
      });
    }
    consumed = to.index + 1;
    i = to.index;
  }
  result.push(...points.slice(consumed));
  return result;
}

/** Rounded, continuous left-hand lanes. Private forecourts are never through roads. */
export function offsetLane(points: readonly Point[], closed = false): Point[] {
  let path = points.filter((p, i) => !i || distance2(p, points[i - 1]) > 0.05);
  if (closed && distance2(path[0], path.at(-1)!) < 0.1) path = path.slice(0, -1);
  if (closed) {
    // Put the loop seam on a straight section so a junction cannot fold the inside lane.
    const seam = path.findIndex((_p, i) => {
      for (let n = -12; n <= 12; n++) {
        const k = (i + n + path.length) % path.length,
          p = path[k];
        const a = path[(k + path.length - 1) % path.length],
          b = path[(k + 1) % path.length];
        if (
          ((p.x - a.x) * (b.x - p.x) + (p.z - a.z) * (b.z - p.z)) /
            (distance2(a, p) * distance2(p, b)) <
          0.995
        )
          return false;
      }
      return true;
    });
    if (seam > 0) path = [...path.slice(seam), ...path.slice(0, seam)];
    path.push({ ...path[0] });
  }
  path = roundJunctions(path);
  if (closed) path.pop();
  // Round junction corners inside the paved junction instead of aiming across a building.
  for (let pass = 0; pass < 2; pass++) {
    const rounded: Point[] = [];
    if (!closed) rounded.push(path[0]);
    for (let i = 0; i < path.length - (closed ? 0 : 1); i++) {
      const a = path[i],
        b = path[(i + 1) % path.length];
      rounded.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 });
      rounded.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 });
    }
    if (!closed) rounded.push(path.at(-1)!);
    path = rounded;
  }
  const lane = path.map((p, i) => {
    const a = path[closed ? (i - 1 + path.length) % path.length : Math.max(0, i - 1)],
      b = path[closed ? (i + 1) % path.length : Math.min(path.length - 1, i + 1)],
      length = distance2(a, b) || 1;
    return { x: p.x + ((b.z - a.z) / length) * 1.45, z: p.z - ((b.x - a.x) / length) * 1.45 };
  });
  if (closed) lane.push({ ...lane[0] });
  return lane;
}
export function lanePath(from: Point, to: Point, access = false) {
  return offsetLane(routeBetween(from, to, { roadOnly: true, access }).points);
}
function circuit(stops: readonly Point[]) {
  const center: Point[] = [];
  for (let i = 0; i < stops.length; i++) {
    const leg = routeBetween(stops[i], stops[(i + 1) % stops.length], { roadOnly: true }).points;
    center.push(...(i ? leg.slice(1) : leg));
  }
  return offsetLane(center, true);
}
const at = (x: number, z: number): Point => ({ x, z });
export const TRAFFIC_CIRCUITS = [
  circuit([at(-51, 30), at(-145, 30), at(-145, -15), at(-53, -4)]),
  circuit([at(-51, 30), at(-145, 30), at(-148, -121), at(-31, -36), at(43, 41), at(-26, 59)]),
  circuit([at(-145, 30), at(-143, 83), at(-68, 113), at(-26, 59), at(-51, 30)]),
  circuit([at(-145, 30), at(-139, 132), at(-185, 205), at(43, 41), at(-51, 30)]),
];

/** Two narrow riders climb the ridge and turn in a visible paved semicircle at each end. */
export function hillCircuit() {
  const road = ROAD_PATHS.find((r) => r.id === 'observatory-road')!.samples;
  const up = offsetLane(road),
    down = offsetLane([...road].reverse());
  const turn = (from: Point, center: Point, direction: Point) => {
    const left = { x: (from.x - center.x) / 1.45, z: (from.z - center.z) / 1.45 };
    return Array.from({ length: 16 }, (_, i) => {
      const angle = ((i + 1) / 16) * Math.PI;
      return {
        x: center.x + (left.x * Math.cos(angle) + direction.x * Math.sin(angle)) * 1.45,
        z: center.z + (left.z * Math.cos(angle) + direction.z * Math.sin(angle)) * 1.45,
      };
    });
  };
  const direction = (a: Point, b: Point) => {
    const length = distance2(a, b);
    return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
  };
  return [
    ...up,
    ...turn(up.at(-1)!, road.at(-1)!, direction(road.at(-2)!, road.at(-1)!)),
    ...down.slice(1),
    ...turn(down.at(-1)!, road[0], direction(road[1], road[0])),
    { ...up[0] },
  ];
}
export type LaneCursor = { index: number; offset: number };
/** Forward arclength, never a nearest-waypoint chase or negative distance. */
export function advanceLane(
  path: readonly Point[],
  cursor: LaneCursor,
  travel: number,
  loop = false,
) {
  let index = cursor.index,
    offset = cursor.offset + Math.max(0, travel);
  for (let n = 0; n < path.length * 2; n++) {
    const length = distance2(path[index], path[index + 1]);
    if (offset < length || (!loop && index === path.length - 2)) {
      offset = Math.min(offset, length);
      const t = length ? offset / length : 0;
      return {
        index,
        offset,
        point: {
          x: path[index].x + (path[index + 1].x - path[index].x) * t,
          z: path[index].z + (path[index + 1].z - path[index].z) * t,
        },
      };
    }
    offset -= length;
    index++;
    if (index >= path.length - 1) index = loop ? 0 : path.length - 2;
  }
  throw new Error('Traffic lane contains no usable segments');
}
