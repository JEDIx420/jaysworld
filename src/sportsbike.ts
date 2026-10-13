import * as THREE from 'three';
import { box, cylinder, tube, bakeStatic } from './models';
import { BIKE_WHEELS } from './bike-vehicle';
import { RR310 } from './bike-powertrain';

type V = [number, number, number];
const mat = (color: string, roughness = 0.4, metalness = 0.2) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const paint = mat('#141820', 0.21, 0.48),
  silver = mat('#a2a9b1', 0.24, 0.8),
  rubber = mat('#111318', 0.92, 0);
const alloy = mat('#22252c', 0.3, 0.72),
  red = mat('#c42532', 0.3, 0.35),
  gold = mat('#d6a347', 0.24, 0.7);
const seat = mat('#282a31', 0.93, 0),
  suit = mat('#1b1e25', 0.8, 0),
  visor = mat('#162632', 0.1, 0.8);
const white = new THREE.MeshStandardMaterial({
  color: '#e7f7ff',
  emissive: '#cae8ff',
  emissiveIntensity: 1.8,
});
const tail = new THREE.MeshStandardMaterial({
  color: '#bf132c',
  emissive: '#ff163c',
  emissiveIntensity: 1.8,
});

function rod(parent: THREE.Object3D, a: V, b: V, r: number, material: THREE.Material) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b);
  const mesh = cylinder(
    parent,
    r,
    r,
    start.distanceTo(end),
    start.clone().add(end).multiplyScalar(0.5).toArray() as V,
    material,
    12,
  );
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return mesh;
}
function oval(parent: THREE.Object3D, at: V, scale: V, material: THREE.Material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material);
  m.position.set(...at);
  m.scale.set(...scale);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function panel(parent: THREE.Object3D, points: V[], material: THREE.Material) {
  const vertices = points.flat(),
    indices: number[] = [];
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
// Continuous cross-sections make the tank and fairing a sculpted surface, not a stack of boxes.
function loft(parent: THREE.Object3D, sections: number[][], material: THREE.Material) {
  const vertices: number[] = [],
    indices: number[] = [],
    uv: number[] = [],
    count = 32;
  sections.forEach(([z, y, w, h], j) => {
    for (let i = 0; i <= count; i++) {
      const a = (i / count) * Math.PI * 2;
      vertices.push(Math.sin(a) * w, y + Math.cos(a) * h, z);
      uv.push(i / count, j / (sections.length - 1));
    }
  });
  for (let j = 0; j < sections.length - 1; j++)
    for (let i = 0; i < count; i++) {
      const n = j * (count + 1) + i;
      indices.push(n, n + count + 1, n + 1, n + 1, n + count + 1, n + count + 2);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function torus(
  parent: THREE.Object3D,
  radius: number,
  thickness: number,
  at: V,
  material: THREE.Material,
  segments = 64,
) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 12, segments), material);
  m.rotation.y = Math.PI / 2;
  m.position.set(...at);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function decal(side: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#bac0c7';
  ctx.font = 'italic bold 146px Arial';
  ctx.fillText('Apache', 48, 214);
  ctx.fillStyle = '#ef293d';
  ctx.font = 'italic bold 68px Arial';
  ctx.fillText('RR 310', 534, 319);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#d32135';
  ctx.beginPath();
  ctx.moveTo(510, 88);
  ctx.lineTo(890, 250);
  ctx.stroke();
  ctx.font = 'bold 34px Arial';
  ctx.fillStyle = '#7f8995';
  ctx.fillText('RACING DNA', 84, 376);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.91, 0.46),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      roughness: 0.35,
      metalness: 0.3,
      side: THREE.DoubleSide,
    }),
  );
  m.position.set(side * 0.335, -0.035, -0.07);
  m.rotation.y = (side * Math.PI) / 2;
  m.name = 'bike:apache-fairing-decal';
  return m;
}
export function makeSportsbike() {
  const group = new THREE.Group();
  group.name = 'vehicle:apache-rr310';
  const chassis = new THREE.Group();
  group.add(chassis);
  const wheels: THREE.Group[] = [],
    spinners: THREE.Group[] = [];
  BIKE_WHEELS.forEach((p, i) => {
    const wheel = new THREE.Group(),
      spin = new THREE.Group();
    wheel.position.set(p.x, -0.4, p.z);
    wheel.add(spin);
    group.add(wheel);
    wheels.push(wheel);
    spinners.push(spin);
    const r = i ? RR310.rearRadius : 0.293,
      width = i ? 0.15 : 0.11;
    torus(spin, r - width * 0.33, width * 0.38, [0, 0, 0], rubber);
    for (const side of [-1, 1]) {
      torus(spin, 0.214, 0.014, [side * width * 0.38, 0, 0], alloy);
      torus(spin, r - 0.055, 0.0018, [side * width * 0.47, 0, 0], rubber);
      // Thin red rim tape and split alloy spokes.
      torus(spin, 0.219, 0.0025, [side * width * 0.43, 0, 0], red);
      for (let n = 0; n < 5; n++)
        for (const split of [-0.04, 0.04]) {
          const a = (n / 5) * Math.PI * 2,
            b = a + split + 0.19;
          rod(
            spin,
            [side * width * 0.34, Math.cos(a) * 0.04, Math.sin(a) * 0.04],
            [side * width * 0.34, Math.cos(b) * 0.207, Math.sin(b) * 0.207],
            0.012,
            alloy,
          );
        }
    }
    const hub = cylinder(spin, 0.035, 0.035, width * 1.2, [0, 0, 0], silver, 16);
    hub.rotation.z = Math.PI / 2;
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(0.073, i ? 0.12 : 0.15, 64),
      new THREE.MeshStandardMaterial({
        color: '#aab2b8',
        metalness: 0.85,
        roughness: 0.38,
        side: THREE.DoubleSide,
      }),
    );
    disc.position.x = -width * 0.55;
    disc.rotation.y = Math.PI / 2;
    spin.add(disc);
    for (let n = 0; n < 32; n++) {
      const a = (n / 32) * Math.PI * 2,
        rr = i ? 0.102 : 0.128;
      const hole = cylinder(
        spin,
        0.0035,
        0.0035,
        0.002,
        [-width * 0.57, Math.sin(a) * rr, Math.cos(a) * rr],
        alloy,
        6,
      );
      hole.rotation.z = Math.PI / 2;
    }
    box(wheel, [0.038, 0.083, 0.08], [-width * 0.7, 0.02, -0.09], alloy);
    // Geometry tread remains legible in close inspection.
    for (let n = 0; n < 42; n++)
      for (const side of [-1, 1]) {
        const a = (n / 42) * Math.PI * 2;
        rod(
          spin,
          [side * width * 0.15, Math.cos(a) * r, Math.sin(a) * r],
          [
            side * width * 0.4,
            Math.cos(a + 0.025) * (r - 0.014),
            Math.sin(a + 0.025) * (r - 0.014),
          ],
          0.0025,
          alloy,
        );
      }
    bakeStatic(spin);
    bakeStatic(wheel, [spin]);
  });
  // Reverse-inclined engine, finned radiator, red trellis and aluminium swingarm.
  oval(chassis, [0, -0.17, 0.1], [0.18, 0.19, 0.23], alloy);
  for (const side of [-1, 1]) {
    const cover = cylinder(chassis, 0.1, 0.1, 0.025, [side * 0.187, -0.17, 0.15], alloy, 32);
    cover.rotation.z = Math.PI / 2;
    for (let n = 0; n < 8; n++) {
      const a = (n / 8) * Math.PI * 2;
      oval(
        chassis,
        [side * 0.205, -0.17 + Math.sin(a) * 0.076, 0.15 + Math.cos(a) * 0.076],
        [0.005, 0.008, 0.008],
        silver,
      );
    }
    for (const [a, b] of [
      [
        [side * 0.15, 0.13, -0.36],
        [side * 0.18, -0.16, 0.25],
      ],
      [
        [side * 0.18, -0.16, 0.25],
        [side * 0.13, 0.26, 0.57],
      ],
      [
        [side * 0.13, 0.26, 0.57],
        [side * 0.15, 0.13, -0.36],
      ],
    ] as [V, V][])
      rod(chassis, a, b, 0.017, red);
    rod(chassis, [side * 0.13, -0.17, 0.2], [side * 0.09, -0.4, 0.69], 0.034, alloy);
    rod(chassis, [side * 0.1, -0.4, 0.69], [side * 0.19, -0.31, 0.18], 0.022, silver);
    rod(chassis, [side * 0.17, -0.18, 0.25], [side * 0.24, -0.22, 0.29], 0.018, silver);
  }
  box(chassis, [0.32, 0.21, 0.045], [0, -0.13, -0.35], alloy).rotation.x = -0.2;
  for (let n = 0; n < 15; n++)
    box(chassis, [0.31, 0.003, 0.045], [0, -0.225 + n * 0.014, -0.381], silver);
  const shock = new THREE.Group();
  shock.position.set(0, -0.03, 0.3);
  shock.rotation.x = -0.5;
  chassis.add(shock);
  cylinder(shock, 0.015, 0.015, 0.29, [0, 0, 0], silver, 12);
  tube(
    shock,
    Array.from({ length: 90 }, (_, n) => [
      Math.sin((n / 90) * Math.PI * 18) * 0.034,
      -0.14 + (n / 90) * 0.28,
      Math.cos((n / 90) * Math.PI * 18) * 0.034,
    ]),
    0.006,
    red,
    6,
  );
  // Sculpted tank, black stepped seats and high pointed tail.
  loft(
    chassis,
    [
      [-0.5, 0.19, 0.01, 0.01],
      [-0.34, 0.21, 0.22, 0.16],
      [-0.12, 0.2, 0.25, 0.19],
      [0.11, 0.18, 0.2, 0.15],
      [0.28, 0.1, 0.1, 0.07],
    ],
    paint,
  );
  cylinder(chassis, 0.045, 0.045, 0.005, [0, 0.395, -0.12], silver, 32);
  oval(chassis, [0, 0.15, 0.37], [0.16, 0.065, 0.23], seat);
  loft(
    chassis,
    [
      [0.38, 0.24, 0.17, 0.085],
      [0.6, 0.33, 0.16, 0.09],
      [0.88, 0.39, 0.07, 0.055],
      [1, 0.4, 0.003, 0.004],
    ],
    paint,
  );
  oval(chassis, [0, 0.4, 0.67], [0.135, 0.045, 0.17], seat);
  for (const side of [-1, 1])
    rod(chassis, [side * 0.13, 0.26, 0.66], [side * 0.03, 0.33, 0.98], 0.009, red);
  box(chassis, [0.12, 0.026, 0.035], [0, 0.37, 0.97], tail);
  // Angular twin-projector shark nose, enclosing side fairings and lower belly pan.
  const bodyMat = paint.clone();
  bodyMat.side = THREE.DoubleSide;
  loft(
    chassis,
    [
      [-1, 0.13, 0.015, 0.035],
      [-0.87, 0.19, 0.19, 0.12],
      [-0.65, 0.23, 0.29, 0.16],
      [-0.42, 0.17, 0.32, 0.19],
      [-0.25, 0.07, 0.29, 0.16],
    ],
    paint,
  );
  for (const s of [-1, 1]) {
    panel(
      chassis,
      [
        [s * 0.27, 0.22, -0.55],
        [s * 0.34, 0.08, -0.33],
        [s * 0.32, -0.32, -0.25],
        [s * 0.25, -0.41, 0.15],
        [s * 0.16, -0.35, 0.4],
        [s * 0.22, -0.04, 0.34],
        [s * 0.32, 0.03, 0.07],
      ],
      bodyMat,
    );
    panel(
      chassis,
      [
        [s * 0.34, 0.08, -0.33],
        [s * 0.31, -0.28, -0.23],
        [s * 0.33, -0.13, 0.11],
        [s * 0.32, 0.03, 0.07],
      ],
      alloy,
    );
    for (let n = 0; n < 5; n++)
      rod(
        chassis,
        [s * 0.335, -0.17 + n * 0.025, 0.13],
        [s * 0.28, -0.2 + n * 0.025, 0.27],
        0.006,
        rubber,
      );
    const lamp = oval(chassis, [s * 0.123, 0.14, -0.88], [0.075, 0.045, 0.026], alloy);
    lamp.rotation.z = s * 0.28;
    oval(chassis, [s * 0.127, 0.14, -0.902], [0.033, 0.031, 0.011], white);
    tube(
      chassis,
      [
        [s * 0.045, 0.17, -0.935],
        [s * 0.12, 0.19, -0.908],
        [s * 0.2, 0.22, -0.83],
      ],
      0.004,
      white,
      8,
    );
    rod(chassis, [s * 0.17, 0.3, -0.67], [s * 0.33, 0.43, -0.7], 0.012, alloy);
    oval(chassis, [s * 0.36, 0.46, -0.69], [0.075, 0.035, 0.05], paint);
    const mirror = oval(chassis, [s * 0.36, 0.46, -0.664], [0.062, 0.025, 0.007], silver);
    mirror.rotation.y = s * -0.2;
    oval(chassis, [s * 0.335, 0.095, -0.31], [0.015, 0.025, 0.04], white);
    const sticker = decal(s);
    group.add(sticker);
    // Upside-down gold fork tubes stay attached to the steerable front assembly.
    rod(wheels[0], [s * 0.09, 0, 0], [s * 0.09, 0.33, 0.1], 0.019, silver);
    rod(wheels[0], [s * 0.09, 0.25, 0.075], [s * 0.09, 0.71, 0.2], 0.025, gold);
  }
  panel(
    chassis,
    [
      [-0.22, -0.4, -0.2],
      [0.22, -0.4, -0.2],
      [0.12, -0.4, 0.43],
      [-0.12, -0.4, 0.43],
    ],
    bodyMat,
  );
  const windshield = new THREE.Mesh(
    new THREE.SphereGeometry(
      1,
      32,
      20,
      Math.PI * 0.14,
      Math.PI * 0.72,
      Math.PI * 0.16,
      Math.PI * 0.38,
    ),
    new THREE.MeshPhysicalMaterial({
      color: '#6e7e8d',
      transparent: true,
      opacity: 0.48,
      roughness: 0.08,
      metalness: 0.15,
      side: THREE.DoubleSide,
    }),
  );
  windshield.scale.set(0.255, 0.45, 0.29);
  windshield.position.set(0, 0.29, -0.62);
  windshield.rotation.x = 0.15;
  group.add(windshield);
  for (const s of [-1, 1])
    tube(
      chassis,
      [
        [s * 0.15, 0.33, -0.77],
        [s * 0.17, 0.5, -0.64],
        [s * 0.1, 0.67, -0.51],
      ],
      0.006,
      silver,
    );
  box(chassis, [0.15, 0.014, 0.22], [0, 0.33, -0.38], alloy).rotation.x = -0.5;
  box(chassis, [0.12, 0.008, 0.15], [0, 0.35, -0.4], visor).rotation.x = -0.5;
  for (const s of [-1, 1]) {
    rod(chassis, [s * 0.08, 0.3, -0.4], [s * 0.32, 0.29, -0.34], 0.013, silver);
    rod(chassis, [s * 0.25, 0.29, -0.35], [s * 0.36, 0.285, -0.32], 0.024, rubber);
    rod(chassis, [s * 0.25, 0.285, -0.39], [s * 0.39, 0.27, -0.38], 0.007, silver);
  }
  const frontFender = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.038, 10, 40, Math.PI * 0.8),
    paint,
  );
  frontFender.rotation.y = Math.PI / 2;
  frontFender.rotation.z = -Math.PI * 0.1;
  frontFender.scale.z = 1.6;
  wheels[0].add(frontFender);
  // Header, silver side exhaust with black tip, rear hugger, chain and sprocket.
  tube(
    chassis,
    [
      [0.12, -0.2, -0.14],
      [0.15, -0.4, -0.02],
      [0.19, -0.39, 0.2],
      [0.3, -0.25, 0.48],
    ],
    0.025,
    silver,
    10,
  );
  const exhaust = new THREE.Group();
  exhaust.position.set(0.31, -0.15, 0.62);
  exhaust.rotation.x = -0.44;
  chassis.add(exhaust);
  cylinder(exhaust, 0.066, 0.085, 0.48, [0, 0, 0], silver, 32).rotation.x = Math.PI / 2;
  cylinder(exhaust, 0.061, 0.067, 0.07, [0, 0, 0.27], alloy, 24).rotation.x = Math.PI / 2;
  cylinder(exhaust, 0.045, 0.045, 0.009, [0, 0, 0.31], rubber, 24).rotation.x = Math.PI / 2;
  const sprocket = cylinder(chassis, 0.085, 0.085, 0.015, [-0.1, -0.4, 0.69], silver, 32);
  sprocket.rotation.z = Math.PI / 2;
  for (const y of [-0.315, -0.48])
    tube(
      chassis,
      [
        [-0.1, y, 0.69],
        [-0.17, -0.3 + (y + 0.4), 0.19],
      ],
      0.007,
      alloy,
      6,
    );
  box(chassis, [0.1, 0.045, 0.49], [0, -0.04, 0.72], alloy).rotation.x = -0.25;
  rod(chassis, [0, 0.27, 0.85], [0, 0.03, 1.07], 0.018, alloy);
  box(chassis, [0.22, 0.1, 0.01], [0, 0.02, 1.085], silver);
  const kickstand = rod(chassis, [-0.18, -0.25, 0.2], [-0.31, -0.62, 0.31], 0.014, alloy);
  // Black armoured rider: crouched spine, full-face helmet, gloved grips and foot pegs.
  const rider = new THREE.Group();
  rider.name = 'bike:rider';
  group.add(rider);
  oval(rider, [0, 0.59, 0.12], [0.22, 0.35, 0.135], suit).rotation.x = -0.67;
  oval(rider, [0, 0.37, 0.3], [0.18, 0.16, 0.17], suit);
  const head = new THREE.Group();
  head.position.set(0, 0.95, -0.17);
  head.rotation.x = 0.18;
  rider.add(head);
  oval(head, [0, 0, 0], [0.155, 0.18, 0.19], paint);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(
      1,
      32,
      18,
      Math.PI * 1.15,
      Math.PI * 0.7,
      Math.PI * 0.34,
      Math.PI * 0.29,
    ),
    visor,
  );
  glass.scale.set(0.159, 0.183, 0.195);
  head.add(glass);
  oval(head, [0, -0.085, -0.14], [0.115, 0.065, 0.08], paint);
  for (const s of [-1, 1]) {
    rod(rider, [s * 0.17, 0.67, 0.03], [s * 0.27, 0.42, -0.11], 0.065, suit);
    rod(rider, [s * 0.27, 0.42, -0.11], [s * 0.31, 0.3, -0.33], 0.055, suit);
    oval(rider, [s * 0.31, 0.3, -0.33], [0.06, 0.045, 0.07], rubber);
    rod(rider, [s * 0.13, 0.39, 0.3], [s * 0.29, 0.05, 0.02], 0.083, suit);
    oval(rider, [s * 0.3, 0.04, 0.02], [0.067, 0.087, 0.075], alloy);
    rod(rider, [s * 0.29, 0.05, 0.02], [s * 0.23, -0.19, 0.3], 0.063, suit);
    oval(rider, [s * 0.23, -0.19, 0.23], [0.075, 0.06, 0.15], rubber);
  }
  bakeStatic(head);
  bakeStatic(rider, [head]);
  bakeStatic(chassis, [kickstand]);
  const headlight = new THREE.SpotLight('#d6ecff', 0, 32, 0.37, 0.85, 1.6);
  headlight.position.set(0, 0.15, -0.89);
  headlight.target.position.set(0, -0.5, -12);
  group.add(headlight, headlight.target);
  return {
    group,
    wheels,
    spinners,
    rider,
    kickstand,
    headlight,
    update(speed: number, lean: number, brake: boolean, time: number, night: number) {
      rider.rotation.z = lean * 0.12;
      rider.position.y = Math.sin(time * 25) * Math.min(0.003, speed * 0.0002);
      head.rotation.y = -lean * 0.22;
      tail.emissiveIntensity = brake ? 4 : 1.3;
      headlight.intensity = 8 + night * 34;
    },
  };
}
