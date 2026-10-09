import type { Point } from './village';

export interface Resident extends Point {
  radius: number;
  y: number;
}
const AUTO_RADIUS = 1.45;
/** Swept protection prevents a fast auto skipping through a person between steps. */
export function safeTravel(from: Point, to: Point, y: number, residents: readonly Resident[]) {
  const dx = to.x - from.x,
    dz = to.z - from.z,
    a = dx * dx + dz * dz;
  let fraction = 1;
  if (a < 1e-12) return fraction;
  for (const p of residents) {
    if (Math.abs(y - p.y) > 3.5) continue;
    const radius = p.radius + AUTO_RADIUS,
      ox = from.x - p.x,
      oz = from.z - p.z;
    const b = ox * dx + oz * dz,
      c = ox * ox + oz * oz - radius * radius;
    if (c <= 0) {
      if (b < 0) fraction = 0;
      continue;
    }
    const discriminant = b * b - a * c;
    if (discriminant < 0) continue;
    const t = (-b - Math.sqrt(discriminant)) / a;
    if (t >= 0 && t <= fraction) fraction = Math.max(0, t - 0.02 / Math.sqrt(a));
  }
  return fraction;
}
/** Begin yielding before the swept safety boundary is reached. Reverse remains usable. */
export function shouldYield(
  position: Point,
  velocity: Point,
  y: number,
  residents: readonly Resident[],
) {
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed < 0.05) return false;
  const lookAhead = 1 + speed * 0.55 + (speed * speed) / 18;
  return (
    safeTravel(
      position,
      {
        x: position.x + (velocity.x / speed) * lookAhead,
        z: position.z + (velocity.z / speed) * lookAhead,
      },
      y,
      residents,
    ) < 1
  );
}
