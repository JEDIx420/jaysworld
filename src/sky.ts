import * as THREE from 'three';
export const CONSTELLATIONS = [
  {
    id: 'orion',
    name: 'Orion',
    yaw: -0.7,
    elevation: 0.56,
    detail: 'Three bright belt stars make this illustrated hunter easy to find.',
    points: [
      [-0.1, 0.17],
      [0.1, 0.17],
      [0.08, -0.12],
      [-0.08, -0.12],
      [-0.07, 0],
      [0, 0.01],
      [0.07, 0.02],
    ],
    edges: [
      [0, 4],
      [1, 6],
      [4, 5],
      [5, 6],
      [4, 3],
      [6, 2],
    ],
  },
  {
    id: 'dipper',
    name: 'The Big Dipper',
    yaw: 0.9,
    elevation: 0.92,
    detail: 'A bowl and a curved handle. This familiar pattern is part of Ursa Major.',
    points: [
      [-0.2, 0.06],
      [-0.13, 0.09],
      [-0.06, 0.06],
      [0.01, 0.02],
      [0.12, 0.04],
      [0.12, -0.06],
      [0.01, -0.06],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    id: 'crux',
    name: 'The Southern Cross',
    yaw: 2.4,
    elevation: 0.45,
    detail:
      'A small cross in the southern sky. Here it is an illustrated guide, rather than a live sky prediction.',
    points: [
      [0, 0.1],
      [0, -0.1],
      [-0.07, 0],
      [0.07, 0.015],
    ],
    edges: [
      [0, 1],
      [2, 3],
    ],
  },
] as const;
export function createSky(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'sky:illustrated-constellations';
  scene.add(group);
  let seed = 734;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions: number[] = [];
  const direction = (yaw: number, el: number, r = 180) =>
    new THREE.Vector3(
      Math.sin(yaw) * Math.cos(el) * r,
      Math.sin(el) * r,
      Math.cos(yaw) * Math.cos(el) * r,
    );
  for (let i = 0; i < 1600; i++) {
    const p = direction(rng() * Math.PI * 2, 0.05 + rng() * 1.5);
    positions.push(p.x, p.y, p.z);
  }
  const material = new THREE.PointsMaterial({
    size: 0.48,
    color: '#efeacb',
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  group.add(
    new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3),
      ),
      material,
    ),
  );
  const patterns = new THREE.Group();
  group.add(patterns);
  for (const c of CONSTELLATIONS) {
    const stars = c.points.map(([x, y]) => direction(c.yaw + x, c.elevation + y));
    const vertices = c.edges.flatMap(([a, b]) => [...stars[a].toArray(), ...stars[b].toArray()]);
    patterns.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute(
          'position',
          new THREE.Float32BufferAttribute(vertices, 3),
        ),
        new THREE.LineBasicMaterial({
          color: '#9cadbf',
          transparent: true,
          opacity: 0.4,
          fog: false,
        }),
      ),
    );
    patterns.add(
      new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(stars),
        new THREE.PointsMaterial({ color: '#ffe7ab', size: 1.2, fog: false, depthWrite: false }),
      ),
    );
  }
  return {
    update(camera: THREE.Camera, night: number, observing: boolean) {
      group.position.copy(camera.position);
      material.opacity = night;
      patterns.visible = observing;
    },
    direction,
  };
}
