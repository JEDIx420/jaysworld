/** Shared geography: metres, X east, Z south. UI and gameplay do not import Three.js. */
export interface Point {
  x: number;
  z: number;
}
export const ROAD_START: Point = { x: -56.5, z: 12 };
export interface VillageRoad {
  id: string;
  name: string;
  points: readonly (readonly [number, number])[];
  closed?: boolean;
  width: number;
}
export const WORLD_BOUNDS = { minX: -310, maxX: 150, minZ: -270, maxZ: 270 };
export const ROADS: readonly VillageRoad[] = [
  {
    id: 'eagle-forecourt',
    name: 'Eagle Towers forecourt',
    width: 4.2,
    points: [
      [-53, -4],
      [-48, -4],
    ],
  },
  {
    id: 'observatory-drive',
    name: 'Observatory terrace',
    width: 4.5,
    points: [
      [50, -212],
      [56, -207],
      [57, -202],
    ],
  },
  {
    id: 'old-town',
    name: 'Old village road',
    width: 7,
    closed: true,
    points: [
      [-51, 30],
      [-53, -4],
      [-31, -36],
      [9, -48],
      [47, -32],
      [55, 8],
      [43, 41],
      [8, 63],
      [-26, 59],
    ],
  },
  {
    id: 'market-road',
    name: 'Market road',
    width: 8,
    points: [
      [-51, 30],
      [-90, 30],
      [-145, 30],
      [-205, 24],
      [-245, 10],
      [-259, 10],
    ],
  },
  {
    id: 'market-spine',
    name: 'Bazaar street',
    width: 7,
    points: [
      [-153, -182],
      [-148, -121],
      [-146, -73],
      [-145, -15],
      [-145, 30],
      [-143, 83],
      [-139, 132],
      [-158, 177],
      [-185, 205],
    ],
  },
  {
    id: 'north-link',
    name: 'Studio link',
    width: 7,
    points: [
      [-148, -121],
      [-138, -109],
      [-110, -104],
      [-65, -91],
      [-31, -36],
    ],
  },
  {
    id: 'studio-lane',
    name: 'Studio lane',
    width: 6,
    points: [
      [-145, -15],
      [-95, -13],
      [-53, -4],
    ],
  },
  {
    id: 'observatory-road',
    name: 'Observatory road',
    width: 7,
    points: [
      [9, -48],
      [13, -82],
      [32, -102],
      [54, -120],
      [55, -145],
      [31, -161],
      [17, -182],
      [30, -202],
      [50, -212],
      [58, -235],
      [42, -248],
    ],
  },
  {
    id: 'paddy-lane',
    name: 'Paddy lane',
    width: 6,
    points: [
      [-26, 59],
      [-68, 113],
      [-104, 129],
      [-139, 132],
      [-172, 158],
      [-197.5, 168],
      [-235, 168],
      [-272, 176],
    ],
  },
  {
    id: 'southern-road',
    name: 'Backwater road',
    width: 7,
    points: [
      [43, 41],
      [46, 100],
      [23, 150],
      [-33, 188],
      [-91, 214],
      [-185, 205],
    ],
  },
  {
    id: 'cross-fields',
    name: 'Field crossing',
    width: 5.6,
    points: [
      [-143, 83],
      [-100, 80],
      [-68, 113],
    ],
  },
  {
    id: 'north-exit',
    name: 'North road · procession',
    width: 7,
    points: [
      [-153, -182],
      [-157, -216],
      [-158, -245],
    ],
  },
  {
    id: 'south-exit',
    name: 'South road · procession',
    width: 7,
    points: [
      [-185, 205],
      [-192, 230],
      [-195, 254],
    ],
  },
  {
    id: 'west-exit',
    name: 'Village square · gathering',
    width: 7,
    points: [
      [-272, 176],
      [-289, 177],
      [-302, 180],
    ],
  },
  {
    id: 'work-road',
    name: 'Canal road · repairs',
    width: 6,
    points: [
      [-143, 83],
      [-182, 77],
      [-227, 76],
      [-252, 77],
    ],
  },
  {
    id: 'ridge-exit',
    name: 'Ridge road · repairs',
    width: 6,
    points: [
      [42, -248],
      [23, -255],
      [8, -256],
    ],
  },
];
export const ROAD_CLOSURES = [
  {
    id: 'red',
    x: -158,
    z: -239,
    yaw: 0,
    kind: 'procession',
    color: '#c54d43',
    title: 'NORTH ROAD',
    detail: 'Procession ahead · take it easy',
    people: 24,
  },
  {
    id: 'orange',
    x: -194,
    z: 248,
    yaw: Math.PI,
    kind: 'procession',
    color: '#e1933d',
    title: 'SOUTH ROAD',
    detail: 'Procession ahead · village diversion',
    people: 24,
  },
  {
    id: 'white',
    x: -296,
    z: 179,
    yaw: Math.PI / 2,
    kind: 'gathering',
    color: '#eee8d6',
    title: 'VILLAGE MEETING',
    detail: 'Road closed · people at the square',
    people: 28,
  },
  {
    id: 'canal-work',
    x: -246,
    z: 77,
    yaw: Math.PI / 2,
    kind: 'works',
    color: '#e6aa3d',
    title: 'ROAD WORK',
    detail: 'Repairs in progress · turn around',
    people: 3,
  },
  {
    id: 'ridge-work',
    x: 13,
    z: -256,
    yaw: Math.PI / 2,
    kind: 'works',
    color: '#e6aa3d',
    title: 'RIDGE REPAIRS',
    detail: 'The road ends here · enjoy the view',
    people: 3,
  },
] as const;
export const DISTRICTS = [
  { name: 'Old village', x: -36, z: 19 },
  { name: 'Market quarter', x: -162, z: 26 },
  { name: 'Paddy country', x: -123, z: 155 },
  { name: 'Ferry & records', x: -244, z: 130 },
  { name: 'Observatory ridge', x: 35, z: -192 },
  { name: 'The backwater', x: 97, z: 45 },
];
export const TAXI_STOPS = [
  { id: 'chaya', label: 'Chaya corner', x: -51, z: 29, npcX: -56, npcZ: 27 },
  { id: 'market', label: 'The market', x: -145, z: 30, npcX: -150, npcZ: 34 },
  { id: 'ferry', label: 'Ferry landing', x: -245, z: 10, npcX: -249, npcZ: 15 },
  { id: 'clinic', label: 'Clinic road', x: -148, z: -121, npcX: -154, npcZ: -124 },
  { id: 'studio', label: 'Eagle Towers', x: -48, z: -4, npcX: -45, npcZ: 1 },
  { id: 'workshop', label: 'RIFT workshop', x: -139, z: 132, npcX: -144, npcZ: 135 },
  { id: 'records', label: 'The record shop', x: -235, z: 168, npcX: -231, npcZ: 173 },
  { id: 'jetty', label: 'Wetland jetty', x: 55, z: 8, npcX: 62, npcZ: 17 },
  { id: 'paddy', label: 'Paddy shelter', x: -68, z: 113, npcX: -72, npcZ: 118 },
  { id: 'stars', label: 'Observatory', x: 57, z: -202, npcX: 61, npcZ: -199 },
  { id: 'south', label: 'Southern bend', x: -91, z: 214, npcX: -94, npcZ: 220 },
] as const;
export type TaxiStopId = (typeof TAXI_STOPS)[number]['id'];
export const PASSENGERS = [
  {
    name: 'Leela chechi',
    from: 'chaya',
    to: 'market',
    line: 'The market, please. I have a few things to pick up.',
    color: '#b56d76',
  },
  {
    name: 'Arun',
    from: 'market',
    to: 'studio',
    line: 'I’m meeting Jay at the studio. Take the quiet lane.',
    color: '#597f8e',
  },
  {
    name: 'Meera',
    from: 'studio',
    to: 'records',
    line: 'The record shop. There’s a tune I’ve been looking for.',
    color: '#e2a45e',
  },
  {
    name: 'Ravi',
    from: 'records',
    to: 'ferry',
    line: 'One bag, one ferry, and hopefully enough time.',
    color: '#6b856b',
  },
  {
    name: 'Anu',
    from: 'ferry',
    to: 'clinic',
    line: 'Could you drop me near the clinic?',
    color: '#bf855e',
  },
  {
    name: 'Binu',
    from: 'clinic',
    to: 'workshop',
    line: 'Back to the workshop. The machines won’t fix themselves.',
    color: '#607580',
  },
  {
    name: 'Devika',
    from: 'workshop',
    to: 'stars',
    line: 'The observatory. I heard the sky is clear tonight.',
    color: '#9b7aa4',
  },
  {
    name: 'Suresh',
    from: 'stars',
    to: 'jetty',
    line: 'The jetty, please. I’d like to see the backwater.',
    color: '#729d95',
  },
  {
    name: 'Asha',
    from: 'jetty',
    to: 'paddy',
    line: 'The field shelter. My family will be waiting.',
    color: '#bb8447',
  },
  {
    name: 'Unni',
    from: 'paddy',
    to: 'south',
    line: 'The southern bend. There’s a nice breeze down there.',
    color: '#a1966a',
  },
  {
    name: 'Latha',
    from: 'south',
    to: 'chaya',
    line: 'A cup of chaya sounds perfect. Take me home.',
    color: '#b97985',
  },
] as const satisfies readonly {
  name: string;
  from: TaxiStopId;
  to: TaxiStopId;
  line: string;
  color: string;
}[];
export const stopById = (id: TaxiStopId) => TAXI_STOPS.find((s) => s.id === id)!;
export const distance2 = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
/** One Catmull–Rom path for the road mesh, crop clearance, atlas and directions. */
export function sampleRoad(road: VillageRoad, spacing = 2): Point[] {
  const points: Point[] = [],
    count = road.points.length;
  const at = (i: number): Point => {
    if (road.closed) {
      const p = road.points[(i + count) % count];
      return { x: p[0], z: p[1] };
    }
    if (i < 0) {
      const [a, b] = road.points;
      return { x: 2 * a[0] - b[0], z: 2 * a[1] - b[1] };
    }
    if (i >= count) {
      const a = road.points[count - 1],
        b = road.points[count - 2];
      return { x: 2 * a[0] - b[0], z: 2 * a[1] - b[1] };
    }
    return { x: road.points[i][0], z: road.points[i][1] };
  };
  for (let i = 0; i < count - (road.closed ? 0 : 1); i++) {
    const a = at(i - 1),
      b = at(i),
      c = at(i + 1),
      d = at(i + 2);
    const steps = Math.max(8, Math.ceil(distance2(b, c) / spacing));
    for (let j = 0; j < steps; j++) {
      const t = j / steps,
        t2 = t * t,
        t3 = t2 * t;
      const value = (axis: 'x' | 'z') =>
        0.5 *
        (2 * b[axis] +
          (-a[axis] + c[axis]) * t +
          (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t2 +
          (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t3);
      points.push({ x: value('x'), z: value('z') });
    }
  }
  points.push(at(road.closed ? 0 : count - 1));
  return points;
}
export const ROAD_PATHS = ROADS.map((road) => ({ ...road, samples: sampleRoad(road) }));
export function roadClearance(x: number, z: number) {
  let closest = Infinity;
  for (const road of ROAD_PATHS)
    for (const p of road.samples)
      closest = Math.min(closest, Math.hypot(p.x - x, p.z - z) - road.width / 2);
  return closest;
}
export function waterAt(x: number, z: number) {
  const backwater = x > 76;
  const oldCanal = x > 19 && x < 90 && Math.abs(z - 8) < 5 && Math.abs(x - 55) > 4.8;
  const paddyCanal = x > -201 && x < -194 && z > 92 && z < 257 && Math.abs(z - 168) > 7;
  const ferryWater = x < -266 && z > -66 && z < 64;
  return backwater || oldCanal || paddyCanal || ferryWater;
}
export function inWorld(x: number, z: number) {
  return (
    x > WORLD_BOUNDS.minX && x < WORLD_BOUNDS.maxX && z > WORLD_BOUNDS.minZ && z < WORLD_BOUNDS.maxZ
  );
}
const key = (p: Point) => `${p.x.toFixed(5)},${p.z.toFixed(5)}`;
const nodes = new Map<string, Point>();
const edges = new Map<string, Map<string, number>>();
for (const road of ROAD_PATHS) {
  for (let i = 0; i < road.samples.length; i++) {
    const p = road.samples[i],
      id = key(p);
    nodes.set(id, p);
    if (!edges.has(id)) edges.set(id, new Map());
  }
  for (let i = 0; i < road.samples.length - 1; i++) {
    const a = road.samples[i],
      b = road.samples[i + 1];
    edges.get(key(a))!.set(key(b), distance2(a, b));
    edges.get(key(b))!.set(key(a), distance2(a, b));
  }
}
/** Routes stay on the connected road graph instead of drawing a straight line across water. */
export function routeBetween(start: Point, end: Point): { points: Point[]; distance: number } {
  const closest = (p: Point) =>
    [...nodes.values()].reduce((a, b) => (distance2(p, a) < distance2(p, b) ? a : b));
  const a = closest(start),
    b = closest(end),
    source = key(a),
    target = key(b),
    cost = new Map([[source, 0]]),
    previous = new Map<string, string>(),
    queue: { id: string; cost: number }[] = [];
  const push = (id: string, value: number) => {
    let i = queue.length;
    queue.push({ id, cost: value });
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (queue[p].cost <= value) break;
      queue[i] = queue[p];
      i = p;
    }
    queue[i] = { id, cost: value };
  };
  const pop = () => {
    const first = queue[0],
      last = queue.pop()!;
    if (queue.length) {
      let i = 0;
      while (i * 2 + 1 < queue.length) {
        let child = i * 2 + 1;
        if (child + 1 < queue.length && queue[child + 1].cost < queue[child].cost) child++;
        if (last.cost <= queue[child].cost) break;
        queue[i] = queue[child];
        i = child;
      }
      queue[i] = last;
    }
    return first;
  };
  push(source, 0);
  while (queue.length) {
    const { id: best, cost: value } = pop();
    if (value !== cost.get(best)) continue;
    if (best === target) break;
    for (const [next, length] of edges.get(best)!) {
      const candidate = cost.get(best)! + length;
      if (candidate < (cost.get(next) ?? Infinity)) {
        cost.set(next, candidate);
        previous.set(next, best);
        push(next, candidate);
      }
    }
  }
  if (!cost.has(target)) throw new Error('Village road graph is disconnected.');
  const ids = [target];
  while (ids[0] !== source) ids.unshift(previous.get(ids[0])!);
  const points = [start, ...ids.map((id) => nodes.get(id)!), end].filter(
    (p, i, arr) => i === 0 || distance2(p, arr[i - 1]) > 0.1,
  );
  return {
    points,
    distance: points.slice(1).reduce((sum, p, i) => sum + distance2(p, points[i]), 0),
  };
}
export function districtAt(p: Point) {
  return DISTRICTS.reduce((a, b) => (distance2(p, a) < distance2(p, b) ? a : b)).name;
}
