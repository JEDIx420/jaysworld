export const AMPHITHEATRE = { x: -182, z: 53, radius: 20 } as const;
export const CHILDRENS_PARK = { x: -177, z: 103, radius: 12 } as const;
export const BIKE_BAY = { x: -49.2, z: 0.3, yaw: Math.PI / 2 } as const;

/** Keep new buildings, crops and random trunks out of the occupied recreation footprints. */
export function recreationReserved(x: number, z: number) {
  return (
    Math.hypot(x - AMPHITHEATRE.x, z - AMPHITHEATRE.z) < 22 ||
    Math.hypot(x - CHILDRENS_PARK.x, z - CHILDRENS_PARK.z) < 11
  );
}
