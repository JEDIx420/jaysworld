import { ROADS, WORLD_BOUNDS, DISTRICTS, type Point } from './village';
import { PLACES } from './projects';

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
  const span = full
    ? Math.max(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX, WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 40
    : 126;
  const scale = Math.min(w, h) / span;
  const cx = full ? (WORLD_BOUNDS.maxX + WORLD_BOUNDS.minX) / 2 : position.x;
  const cz = full ? 0 : position.z;
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
  ctx.fillRect(x(76), 0, w, h);
  ctx.fillRect(x(19), z(3), 71 * scale, 10 * scale);
  ctx.fillRect(x(-201), z(92), 7 * scale, 165 * scale);
  ctx.fillRect(0, z(-66), x(-266), 130 * scale);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const road of ROADS) {
    ctx.beginPath();
    road.points.forEach(([px, pz], i) => (i ? ctx.lineTo(x(px), z(pz)) : ctx.moveTo(x(px), z(pz))));
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
  ctx.font = `600 ${full ? 16 : 11}px sans-serif`;
  ctx.textAlign = 'center';
  PLACES.forEach((p, i) => {
    ctx.fillStyle = full ? '#244b40' : '#e6c485';
    ctx.beginPath();
    ctx.arc(x(p.trigger.x), z(p.trigger.z), full ? 11 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (full) {
      ctx.fillStyle = '#f3ead0';
      ctx.fillText(String(i + 1), x(p.trigger.x), z(p.trigger.z) + 5);
    }
  });
  if (full) {
    ctx.font = '600 15px sans-serif';
    ctx.fillStyle = '#53644d';
    DISTRICTS.forEach((d) => ctx.fillText(d.name.toUpperCase(), x(d.x), z(d.z) - 25));
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
