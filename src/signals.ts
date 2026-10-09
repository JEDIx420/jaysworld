import { distance2, type Point } from './village';
export type SignalPhase = 'green' | 'amber' | 'red';
// Shared by the illuminated lamps and every AI stop-line decision.
export const JUNCTIONS = [
  { id: 'chaya', x: -51, z: 30 },
  { id: 'bazaar', x: -145, z: 30 },
  { id: 'north', x: -145, z: -15 },
  { id: 'workshop', x: -148, z: -121 },
  { id: 'ridge', x: 9, z: -48 },
  { id: 'paddy', x: -139, z: 132 },
  { id: 'south', x: -185, z: 205 },
] as const;
export function signalPhase(time: number, axis: 'ns' | 'ew', offset = 0): SignalPhase {
  const t = (((time + offset) % 30) + 30) % 30;
  const start = axis === 'ns' ? 0 : 15;
  if (t >= start && t < start + 11) return 'green';
  if (t >= start + 11 && t < start + 13) return 'amber';
  return 'red';
}
export function signalStops(point: Point, direction: Point, time: number) {
  const axis = Math.abs(direction.z) > Math.abs(direction.x) ? 'ns' : 'ew';
  return JUNCTIONS.some((j, i) => {
    const dx = j.x - point.x,
      dz = j.z - point.z,
      ahead = dx * direction.x + dz * direction.z;
    const side = Math.abs(dx * direction.z - dz * direction.x);
    // Once inside, clear the box even when the phase changes.
    return (
      distance2(point, j) < 16 &&
      ahead > 5 &&
      side < 5 &&
      signalPhase(time, axis, i * 3) !== 'green'
    );
  });
}
