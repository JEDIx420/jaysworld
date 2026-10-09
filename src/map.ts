import { ROAD_PATHS, ROAD_CLOSURES, WORLD_BOUNDS, DISTRICTS, type Point } from './village';
import { PLACES } from './projects';
import { groundHeight } from './terrain';

export type MapOffer = Point & { id: number; name: string };
let mapOffers: MapOffer[] = [];
export function setMapOffers(offers: MapOffer[]) {
  mapOffers = offers;
}
export function atlasOfferHit(
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: number,
  center: Point,
) {
  let result: MapOffer | undefined,
    distance = 26;
  for (const offer of mapOffers) {
    const p = atlasPosition(offer, width, height, zoom, center),
      d = Math.hypot(x - p.x, y - (p.y - 33));
    if (d < distance) {
      result = offer;
      distance = d;
    }
  }
  return result;
}
export function drawVillageMap(
  canvas: HTMLCanvasElement,
  position: Point,
  yaw: number,
  route: readonly Point[] = [],
  full = false,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  const zoom = full ? Number(canvas.dataset.zoom ?? 1) : 1;
  const span = full
    ? (Math.max(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX, WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) +
        40) /
      zoom
    : 126;
  const scale = Math.min(w, h) / span;
  const cx = full
    ? Number(canvas.dataset.centerX ?? (WORLD_BOUNDS.maxX + WORLD_BOUNDS.minX) / 2)
    : position.x;
  const cz = full ? Number(canvas.dataset.centerZ ?? 0) : position.z;
  const x = (v: number) => w / 2 + (v - cx) * scale,
    z = (v: number) => h / 2 + (v - cz) * scale;
  ctx.fillStyle = full ? '#d9d3b5' : '#1e4238';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = full ? '#c8c3a6' : '#2a4f42';
  ctx.lineWidth = 1;
  for (let v = -300; v <= 300; v += 25) {
    ctx.beginPath();
    ctx.moveTo(x(v), 0);
    ctx.lineTo(x(v), h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, z(v));
    ctx.lineTo(w, z(v));
    ctx.stroke();
  }
  ctx.fillStyle = full ? '#77988c' : '#2e6257';
  ctx.fillRect(x(76), 0, w - x(76), h);
  ctx.fillRect(x(19), z(3), 71 * scale, 10 * scale);
  ctx.fillRect(x(-201), z(92), 7 * scale, 165 * scale);
  ctx.fillRect(0, z(-66), x(-266), 130 * scale);
  // Real elevation contours make the winding ridge legible before driving it.
  ctx.strokeStyle = full ? '#7b8b6470' : '#68875f60';
  ctx.lineWidth = 1;
  for (const level of [5, 10, 15, 20]) {
    ctx.beginPath();
    for (const line of contours[level]) {
      ctx.moveTo(x(line[0].x), z(line[0].z));
      ctx.lineTo(x(line[1].x), z(line[1].z));
    }
    ctx.stroke();
  }
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const road of ROAD_PATHS) {
    ctx.beginPath();
    road.samples.forEach((p, i) => (i ? ctx.lineTo(x(p.x), z(p.z)) : ctx.moveTo(x(p.x), z(p.z))));
    if (road.closed) ctx.closePath();
    ctx.strokeStyle = full ? '#ede6ca' : '#8d9b7c';
    ctx.lineWidth = Math.max(2, road.width * scale);
    ctx.stroke();
  }
  if (route.length) {
    ctx.beginPath();
    route.forEach((p, i) => (i ? ctx.lineTo(x(p.x), z(p.z)) : ctx.moveTo(x(p.x), z(p.z))));
    ctx.strokeStyle = full ? '#ba703e' : '#f4cf82';
    ctx.lineWidth = full ? 4 : 3;
    ctx.setLineDash(full ? [8, 5] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    const end = route[route.length - 1];
    ctx.beginPath();
    ctx.arc(x(end.x), z(end.z), full ? 10 : 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const closure of ROAD_CLOSURES) {
    ctx.save();
    ctx.translate(x(closure.x), z(closure.z));
    ctx.rotate(-closure.yaw);
    ctx.fillStyle = closure.color;
    ctx.fillRect(-7 * scale, -2 * scale, 14 * scale, 4 * scale);
    ctx.restore();
  }
  ctx.textAlign = 'center';
  if (full && (canvas.clientWidth >= 420 || zoom > 1.4)) {
    ctx.font = '600 15px sans-serif';
    ctx.fillStyle = '#53644d';
    DISTRICTS.forEach((d) => {
      const p = labelPositions[d.name] ?? d;
      ctx.fillText(d.name.toUpperCase(), x(p.x), z(p.z));
    });
  }
  ctx.font = `600 ${full ? 20 : 11}px sans-serif`;
  ctx.textAlign = 'center';
  PLACES.forEach((p, i) => {
    if (full && canvas.dataset.selected === p.id) {
      ctx.beginPath();
      ctx.arc(x(p.trigger.x), z(p.trigger.z), 21, 0, Math.PI * 2);
      ctx.fillStyle = '#bd814b';
      ctx.fill();
    }
    ctx.fillStyle = full ? '#244b40' : '#e6c485';
    ctx.beginPath();
    ctx.arc(x(p.trigger.x), z(p.trigger.z), full ? 15 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (full) {
      ctx.fillStyle = '#f3ead0';
      ctx.fillText(String(i + 1), x(p.trigger.x), z(p.trigger.z) + 7);
    }
  });
  for (const offer of mapOffers) {
    const px = x(offer.x),
      pz = z(offer.z) - (full ? 33 : 0);
    if (full) {
      ctx.strokeStyle = '#997541';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, pz + 12);
      ctx.lineTo(px, z(offer.z));
      ctx.stroke();
    }
    ctx.fillStyle = '#c49749';
    ctx.beginPath();
    ctx.roundRect(
      px - (full ? 12 : 5),
      pz - (full ? 12 : 5),
      full ? 24 : 10,
      full ? 24 : 10,
      full ? 5 : 2,
    );
    ctx.fill();
    if (full) {
      ctx.fillStyle = '#fff0ca';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(offer.name[0], px, pz + 4);
    }
  }
  ctx.save();
  ctx.translate(x(position.x), z(position.z));
  ctx.rotate(-yaw);
  ctx.fillStyle = full ? '#c37b37' : '#fff7de';
  ctx.strokeStyle = full ? '#744124' : '#214538';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.fillStyle = full ? '#405843' : '#c1cdb1';
  ctx.font = `600 ${full ? 16 : 11}px sans-serif`;
  ctx.fillText('N ↑', full ? 22 : 12, full ? 30 : 20);
  if (full) {
    ctx.fillText('50 m', w - 100, h - 20);
    ctx.fillRect(w - 100, h - 38, 50 * scale, 3);
  }
}

/** Intrinsic atlas coordinates; pointer conversion also handles object-fit letterboxing. */
export function atlasPosition(
  p: Point,
  width = 840,
  height = 840,
  zoom = 1,
  center: Point = { x: -80, z: 0 },
) {
  const span =
    Math.max(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX, WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 40;
  const scale = (Math.min(width, height) / span) * zoom;
  return {
    x: width / 2 + (p.x - center.x) * scale,
    y: height / 2 + (p.z - center.z) * scale,
  };
}
export function atlasHit(
  x: number,
  y: number,
  width = 840,
  height = 840,
  radius = 32,
  zoom = 1,
  center: Point = { x: -80, z: 0 },
) {
  let nearest: (typeof PLACES)[number] | undefined,
    distance = radius;
  for (const place of PLACES) {
    const p = atlasPosition(place.trigger, width, height, zoom, center),
      d = Math.hypot(x - p.x, y - p.y);
    if (d <= distance) {
      distance = d;
      nearest = place;
    }
  }
  return nearest;
}
export function navigationCue(position: Point, yaw: number, route: readonly Point[]) {
  if (route.length < 2) return { instruction: 'Choose somewhere to explore', turn: 0, distance: 0 };
  let ahead = route[route.length - 1],
    length = 0,
    remaining = 0;
  for (let i = 1; i < route.length; i++) {
    const d = Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z);
    remaining += d;
    if (length < 13) {
      ahead = route[i];
      length += d;
    }
  }
  const wanted = Math.atan2(position.x - ahead.x, position.z - ahead.z);
  const delta = Math.atan2(Math.sin(wanted - yaw), Math.cos(wanted - yaw));
  return {
    instruction:
      remaining < 8
        ? 'Arrived · slow down, press Enter'
        : Math.abs(delta) > 2.25
          ? 'Turn around when safe'
          : delta > 0.5
            ? 'Bear left'
            : delta < -0.5
              ? 'Bear right'
              : 'Follow the lane',
    turn: -delta,
    distance: remaining,
  };
}
const contours: Record<number, Point[][]> = {};
for (const level of [5, 10, 15, 20]) {
  const lines: Point[][] = [];
  for (let x = -100; x < 76; x += 8)
    for (let z = -272; z < -72; z += 8) {
      const corners = [
          { x, z },
          { x: x + 8, z },
          { x: x + 8, z: z + 8 },
          { x, z: z + 8 },
        ],
        crossings: Point[] = [];
      for (let i = 0; i < 4; i++) {
        const a = corners[i],
          b = corners[(i + 1) % 4],
          ha = groundHeight(a.x, a.z),
          hb = groundHeight(b.x, b.z);
        if (ha < level === hb < level) continue;
        const t = (level - ha) / (hb - ha);
        crossings.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
      if (crossings.length >= 2) lines.push(crossings.slice(0, 2));
    }
  contours[level] = lines;
}

const labelPositions: Record<string, Point> = {
  'Old village': { x: -8, z: 73 },
  'Market quarter': { x: -158, z: 2 },
  'Paddy country': { x: -102, z: 161 },
  'Ferry & records': { x: -234, z: 103 },
  'Observatory ridge': { x: 4, z: -191 },
  'The backwater': { x: 112, z: 45 },
};
