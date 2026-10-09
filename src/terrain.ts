import { waterAt } from './village';

export const TERRAIN = { minX: -340, minZ: -300, width: 520, depth: 600, step: 4 };
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
/** The ridge rises gradually from the village to a 24 metre summit. */
function altitude(x: number, z: number) {
  if (waterAt(x, z)) return 0;
  const ascent = smooth((-z - 72) / 158);
  const west = smooth((x + 94) / 86),
    east = 1 - smooth((x - 64) / 12);
  const forestPeak = 25 * Math.exp(-(((x + 51) / 32) ** 2 + ((z + 238) / 51) ** 2));
  const northPeak = 13 * Math.exp(-(((x - 8) / 45) ** 2 + ((z + 285) / 26) ** 2));
  const ridge = (24 + forestPeak + northPeak) * ascent * west * east;
  const landing = 1 - smooth((Math.hypot(x - 40, z + 206) - 19) / 16);
  return ridge + (23 - ridge) * landing;
}
const cols = TERRAIN.width / TERRAIN.step + 1,
  rows = TERRAIN.depth / TERRAIN.step + 1;
const heights = new Float32Array(cols * rows);
for (let row = 0; row < rows; row++)
  for (let col = 0; col < cols; col++)
    heights[row * cols + col] = altitude(
      TERRAIN.minX + col * TERRAIN.step,
      TERRAIN.minZ + row * TERRAIN.step,
    );

/** Interpolate the exact triangles used by both the visible mesh and Rapier. */
export function groundHeight(x: number, z: number) {
  const gx = Math.max(0, Math.min(cols - 1.001, (x - TERRAIN.minX) / TERRAIN.step));
  const gz = Math.max(0, Math.min(rows - 1.001, (z - TERRAIN.minZ) / TERRAIN.step));
  const col = Math.floor(gx),
    row = Math.floor(gz),
    fx = gx - col,
    fz = gz - row;
  const a = heights[row * cols + col],
    b = heights[row * cols + col + 1];
  const c = heights[(row + 1) * cols + col],
    d = heights[(row + 1) * cols + col + 1];
  return fx + fz <= 1
    ? a + fx * (b - a) + fz * (c - a)
    : d + (1 - fx) * (c - d) + (1 - fz) * (b - d);
}
export function terrainData() {
  const vertices = new Float32Array(cols * rows * 3),
    indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const n = row * cols + col;
      vertices.set(
        [TERRAIN.minX + col * TERRAIN.step, heights[n], TERRAIN.minZ + row * TERRAIN.step],
        n * 3,
      );
      if (col < cols - 1 && row < rows - 1) {
        const offset = (row * (cols - 1) + col) * 6;
        indices.set([n, n + cols, n + 1, n + 1, n + cols, n + cols + 1], offset);
      }
    }
  return { vertices, indices };
}
