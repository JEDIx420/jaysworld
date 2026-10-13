import type { Point } from './village';

export interface Resident extends Point {
  radius: number;
  y: number;
}
const AUTO_RADIUS = 1.45;
export interface VehicleFootprint {
  radius: number;
  halfLength: number;
  yaw: number;
}
/** Swept protection uses the footprint of the current vehicle. */
export function safeTravel(
  from: Point,
  to: Point,
  y: number,
  residents: readonly Resident[],
  footprint: number | VehicleFootprint = AUTO_RADIUS,
) {
  const dx = to.x - from.x,
    dz = to.z - from.z,
    a = dx * dx + dz * dz;
  let fraction = 1;
  if (a < 1e-12) return fraction;
  const radius = typeof footprint === 'number' ? footprint : footprint.radius;
  const halfLength = typeof footprint === 'number' ? 0 : footprint.halfLength;
  const yaw = typeof footprint === 'number' ? 0 : footprint.yaw;
  const fx = -Math.sin(yaw),
    fz = -Math.cos(yaw);
  for (const p of residents) {
    if (Math.abs(y - p.y) > 3.5) continue;
    const clearance = p.radius + radius;
    // Overlapping circles cover the bike's narrow body and both tyre/nose ends.
    // Reducing just a central circle would leave its front wheel unprotected.
    for (let n = halfLength ? -2 : 0; n <= (halfLength ? 2 : 0); n++) {
      const offset = (halfLength * n) / 2;
      const ox = from.x + fx * offset - p.x,
        oz = from.z + fz * offset - p.z;
      const b = ox * dx + oz * dz,
        c = ox * ox + oz * oz - clearance * clearance;
      if (c <= 0) {
        if (b < 0) fraction = 0;
        continue;
      }
      const discriminant = b * b - a * c;
      if (discriminant < 0) continue;
      const t = (-b - Math.sqrt(discriminant)) / a;
      if (t >= 0 && t <= fraction) fraction = Math.max(0, t - 0.02 / Math.sqrt(a));
    }
  }
  return fraction;
}
/** Begin yielding before the swept safety boundary is reached. Reverse remains usable. */
export function shouldYield(
  position: Point,
  velocity: Point,
  y: number,
  residents: readonly Resident[],
  footprint: number | VehicleFootprint = AUTO_RADIUS,
  turnRate = 0,
) {
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed < 0.05) return false;
  const lookAhead = 1 + speed * 0.55 + (speed * speed) / 18;
  // A bike turning around a bend should check that arc. A straight projection
  // through the verge can otherwise brake for a person outside its actual path.
  if (Math.abs(turnRate) > 0.03) {
    let previous = position;
    for (let i = 1; i <= 8; i++) {
      const angle = (turnRate * lookAhead * i) / (speed * 8);
      const along = Math.sin(angle) / turnRate;
      const across = (1 - Math.cos(angle)) / turnRate;
      const next = {
        x: position.x + velocity.x * along + velocity.z * across,
        z: position.z + velocity.z * along - velocity.x * across,
      };
      const turningFootprint =
        typeof footprint === 'number'
          ? footprint
          : {
              ...footprint,
              yaw: footprint.yaw + angle - (turnRate * lookAhead) / (speed * 16),
            };
      if (safeTravel(previous, next, y, residents, turningFootprint) < 1) return true;
      previous = next;
    }
    return false;
  }
  return (
    safeTravel(
      position,
      {
        x: position.x + (velocity.x / speed) * lookAhead,
        z: position.z + (velocity.z / speed) * lookAhead,
      },
      y,
      residents,
      footprint,
    ) < 1
  );
}
