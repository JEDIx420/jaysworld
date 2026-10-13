import * as THREE from 'three';
import { box, cylinder, tube, bakeStatic } from './models';
import { BIKE_WHEELS } from './bike-vehicle';
import { RR310 } from './bike-powertrain';

type V = [number, number, number];
const mat = (color: string, roughness = 0.4, metalness = 0.2) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const paint = mat('#171c23', 0.22, 0.42),
  silver = mat('#a2a9b1', 0.24, 0.8),
  rubber = mat('#111318', 0.92, 0);
const alloy = mat('#22252c', 0.3, 0.72),
  red = mat('#c42532', 0.3, 0.35),
  gold = mat('#d6a347', 0.24, 0.7);
const seat = mat('#282a31', 0.93, 0),
  suit = mat('#171a20', 0.72, 0),
  visor = mat('#162632', 0.1, 0.8);
const white = new THREE.MeshStandardMaterial({
  color: '#e7f7ff',
  emissive: '#cae8ff',
  emissiveIntensity: 1.8,
});
const tail = new THREE.MeshStandardMaterial({
  color: '#941811',
  emissive: '#ff1205',
  emissiveIntensity: 1,
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
/** Sculpted side skin, with an outward shoulder and a recessed lower air duct. */
function fairing(parent: THREE.Object3D, side: number, material: THREE.Material) {
  const sections = [
    // z, top, bottom, shoulder width, lower width
    [-0.86, 0.29, 0.08, 0.16, 0.12],
    [-0.68, 0.38, 0.08, 0.285, 0.17],
    [-0.48, 0.34, -0.11, 0.315, 0.185],
    [-0.24, 0.24, -0.4, 0.31, 0.215],
    [0.01, 0.12, -0.43, 0.285, 0.19],
    [0.22, 0.04, -0.4, 0.23, 0.16],
    [0.39, -0.2, -0.36, 0.17, 0.13],
  ];
  const vertices: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const rows = 12;
  sections.forEach(([z, top, bottom, width, lower], j) => {
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      // A defined shoulder crease, rather than a flat triangular sheet.
      const bulge = Math.sin(t * Math.PI) * 0.026;
      const x = width * (1 - t) + lower * t + bulge;
      vertices.push(side * x, top * (1 - t) + bottom * t, z);
      uv.push(j / (sections.length - 1), 1 - t);
    }
  });
  for (let j = 0; j < sections.length - 1; j++)
    for (let i = 0; i < rows; i++) {
      const n = j * (rows + 1) + i;
      const face = [n, n + rows + 1, n + 1, n + 1, n + rows + 1, n + rows + 2];
      indices.push(...(side > 0 ? face : [face[2], face[1], face[0], face[5], face[4], face[3]]));
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const skin = new THREE.Mesh(geometry, material);
  skin.castShadow = skin.receiveShadow = true;
  parent.add(skin);
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
  ctx.font = 'italic bold 178px cursive';
  ctx.save();
  ctx.translate(65, 160);
  ctx.rotate(0.13);
  ctx.fillText('Apache', 0, 0);
  ctx.restore();
  ctx.fillStyle = '#ef293d';
  ctx.font = 'italic bold 68px Arial';
  ctx.fillText('RR 310', 590, 240);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#d32135';
  ctx.beginPath();
  ctx.moveTo(510, 88);
  ctx.lineTo(890, 250);
  ctx.stroke();
  ctx.font = 'bold 34px Arial';
  ctx.fillStyle = '#7f8995';
  ctx.fillText('RACE SPEC', 84, 418);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.4),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      roughness: 0.35,
      metalness: 0.3,
      side: THREE.DoubleSide,
    }),
  );
  m.position.set(side * 0.329, 0.065, -0.29);
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
      rod(chassis, a, b, 0.017, b[2] > 0.5 ? red : alloy);
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
      [0.38, 0.24, 0.175, 0.075],
      [0.6, 0.33, 0.16, 0.075],
      [0.84, 0.37, 0.115, 0.065],
      [0.99, 0.35, 0.09, 0.045],
    ],
    paint,
  );
  oval(chassis, [0, 0.4, 0.67], [0.135, 0.045, 0.17], seat);
  for (const side of [-1, 1])
    rod(chassis, [side * 0.13, 0.26, 0.66], [side * 0.03, 0.33, 0.98], 0.009, red);
  // RR 310's split, hooked LED signature, traced from the supplied rear photo.
  // Both branches sweep down from the tail shoulders around the dark centre.
  const tailLamp = new THREE.Group();
  tailLamp.name = 'bike:rr310-tail-light';
  chassis.add(tailLamp);
  const tailHousing = mat('#0c0f15', 0.25, 0.3);
  tailHousing.side = THREE.DoubleSide;
  panel(
    tailLamp,
    [
      [-0.034, 0.396, 1.015],
      [0.034, 0.396, 1.015],
      [0.111, 0.355, 1.015],
      [0.122, 0.3, 1.009],
      [0.065, 0.244, 0.995],
      [-0.065, 0.244, 0.995],
      [-0.122, 0.3, 1.009],
      [-0.111, 0.355, 1.015],
    ],
    tailHousing,
  );
  for (const side of [-1, 1]) {
    const outline: V[] = [
      [side * 0.025, 0.383, 0.995],
      [side * 0.074, 0.354, 1.01],
      [side * 0.1, 0.305, 1.002],
      [side * 0.067, 0.258, 0.989],
      [side * 0.025, 0.282, 0.997],
    ];
    tube(tailLamp, outline, 0.014, tailHousing, 12);
    tube(
      tailLamp,
      outline.map(([x, y, z]) => [x, y, z + 0.023]),
      0.0065,
      tail,
      12,
    );
    rod(chassis, [side * 0.03, 0.1, 1.03], [side * 0.16, 0.1, 1.055], 0.007, rubber);
    oval(chassis, [side * 0.17, 0.1, 1.055], [0.04, 0.014, 0.019], mat('#b48635'));
  }
  // Angular twin-projector shark nose, enclosing side fairings and lower belly pan.
  const bodyMat = paint.clone();
  bodyMat.side = THREE.DoubleSide;
  loft(
    chassis,
    [
      [-1, 0.13, 0.015, 0.035],
      [-0.87, 0.19, 0.19, 0.13],
      [-0.65, 0.22, 0.28, 0.17],
      [-0.42, 0.2, 0.3, 0.13],
      [-0.25, 0.07, 0.29, 0.16],
    ],
    paint,
  );
  for (const s of [-1, 1]) {
    fairing(chassis, s, bodyMat);
    // Deep cooling duct and its sculpted lip remain separate from the painted skin.
    panel(
      chassis,
      [
        [s * 0.332, 0.045, -0.26],
        [s * 0.305, -0.17, -0.21],
        [s * 0.255, -0.24, 0.2],
        [s * 0.289, -0.015, 0.09],
      ],
      rubber,
    );
    tube(
      chassis,
      [
        [s * 0.334, 0.055, -0.27],
        [s * 0.307, -0.18, -0.22],
        [s * 0.255, -0.245, 0.2],
      ],
      0.012,
      alloy,
      10,
    );
    for (let n = 0; n < 6; n++)
      rod(
        chassis,
        [s * 0.28, -0.19 + n * 0.025, 0.05],
        [s * 0.265, -0.2 + n * 0.022, 0.17],
        0.004,
        alloy,
      );
    // Raised red shoulder stripe follows the RR 310 fairing rather than hovering off it.
    tube(
      chassis,
      [
        [s * 0.28, 0.37, -0.68],
        [s * 0.319, 0.335, -0.46],
        [s * 0.32, 0.225, -0.22],
      ],
      0.005,
      red,
      8,
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
  const screenVertices: number[] = [],
    screenIndices: number[] = [];
  const screenRows = 16,
    screenCols = 20;
  for (let row = 0; row <= screenRows; row++) {
    const t = row / screenRows,
      width = 0.22 * (1 - t) + 0.145 * t;
    for (let col = 0; col <= screenCols; col++) {
      const u = (col / screenCols) * 2 - 1;
      screenVertices.push(
        u * width,
        0.3 + t * 0.31 - Math.abs(u) ** 3 * 0.022,
        -0.78 + t * 0.29 + u * u * 0.043,
      );
    }
  }
  for (let row = 0; row < screenRows; row++)
    for (let col = 0; col < screenCols; col++) {
      const n = row * (screenCols + 1) + col;
      screenIndices.push(
        n,
        n + screenCols + 1,
        n + 1,
        n + 1,
        n + screenCols + 1,
        n + screenCols + 2,
      );
    }
  const screenGeometry = new THREE.BufferGeometry();
  screenGeometry.setAttribute('position', new THREE.Float32BufferAttribute(screenVertices, 3));
  screenGeometry.setIndex(screenIndices);
  screenGeometry.computeVertexNormals();
  const windshield = new THREE.Mesh(
    screenGeometry,
    new THREE.MeshPhysicalMaterial({
      color: '#a3b9c5',
      transparent: true,
      opacity: 0.38,
      roughness: 0.09,
      metalness: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  windshield.name = 'bike:rr310-windscreen';
  group.add(windshield);
  for (const side of [-1, 1]) {
    tube(
      chassis,
      [
        [side * 0.22, 0.3, -0.737],
        [side * 0.18, 0.46, -0.59],
        [side * 0.145, 0.588, -0.447],
      ],
      0.003,
      alloy,
      8,
    );
    for (const t of [0.18, 0.42])
      oval(
        chassis,
        [side * (0.22 - t * 0.075), 0.3 + t * 0.31, -0.78 + t * 0.29 + 0.048],
        [0.007, 0.007, 0.003],
        silver,
      );
  }
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
  exhaust.name = 'bike:rr310-exhaust';
  exhaust.position.set(0.3, -0.15, 0.59);
  exhaust.rotation.x = -0.48;
  chassis.add(exhaust);
  loft(
    exhaust,
    [
      [-0.26, 0, 0.04, 0.06],
      [-0.18, 0, 0.08, 0.11],
      [0.16, 0, 0.08, 0.105],
      [0.27, 0, 0.06, 0.08],
    ],
    silver,
  );
  loft(
    exhaust,
    [
      [0.18, 0, 0.083, 0.106],
      [0.28, 0, 0.064, 0.084],
    ],
    rubber,
  );
  const outlet = cylinder(exhaust, 0.032, 0.032, 0.014, [0, 0, 0.288], alloy, 32);
  outlet.rotation.x = Math.PI / 2;
  for (const z of [-0.13, 0.08]) oval(exhaust, [0.079, 0.05, z], [0.004, 0.011, 0.012], alloy);
  rod(chassis, [0.31, -0.1, 0.6], [0.2, 0.12, 0.54], 0.014, silver);
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
  // Wide moulded rear hugger curves over the tyre, as in the rear reference.
  const huggerVertices: number[] = [],
    huggerIndices: number[] = [];
  for (let row = 0; row <= 20; row++) {
    const angle = -0.9 + (row / 20) * 1.85;
    for (let col = 0; col <= 8; col++) {
      const u = (col / 8) * 2 - 1;
      huggerVertices.push(
        u * 0.095,
        -0.4 + Math.cos(angle) * 0.344 + (1 - u * u) * 0.013,
        0.6825 + Math.sin(angle) * 0.344,
      );
    }
  }
  for (let row = 0; row < 20; row++)
    for (let col = 0; col < 8; col++) {
      const n = row * 9 + col;
      huggerIndices.push(n, n + 1, n + 9, n + 1, n + 10, n + 9);
    }
  const huggerGeometry = new THREE.BufferGeometry();
  huggerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(huggerVertices, 3));
  huggerGeometry.setIndex(huggerIndices);
  huggerGeometry.computeVertexNormals();
  const huggerMaterial = rubber.clone();
  huggerMaterial.side = THREE.DoubleSide;
  const hugger = new THREE.Mesh(huggerGeometry, huggerMaterial);
  hugger.castShadow = true;
  chassis.add(hugger);
  rod(chassis, [0, 0.27, 0.85], [0, 0.03, 1.07], 0.018, alloy);
  box(chassis, [0.22, 0.1, 0.01], [0, 0.02, 1.085], silver);
  const kickstand = rod(chassis, [-0.18, -0.25, 0.2], [-0.31, -0.62, 0.31], 0.014, alloy);
  // Broad-shouldered leather rider with a separate, articulated right leg.
  const rider = new THREE.Group();
  rider.name = 'bike:rider';
  group.add(rider);
  const torso = new THREE.Group();
  torso.position.set(0, 0.56, 0.16);
  torso.rotation.x = -0.48;
  rider.add(torso);
  oval(torso, [0, 0, 0], [0.225, 0.29, 0.15], suit);
  oval(torso, [0, 0.15, 0], [0.26, 0.18, 0.17], suit);
  for (const side of [-1, 1]) {
    oval(torso, [side * 0.235, 0.19, 0], [0.105, 0.11, 0.12], suit);
    oval(torso, [side * 0.235, 0.215, -0.03], [0.09, 0.07, 0.095], alloy);
    tube(
      torso,
      [
        [side * 0.14, -0.18, -0.137],
        [side * 0.18, 0.12, -0.163],
        [side * 0.24, 0.22, -0.09],
      ],
      0.0025,
      mat('#404650'),
      6,
    );
  }
  rod(torso, [0, -0.2, -0.147], [0, 0.26, -0.16], 0.0025, silver);
  oval(rider, [0, 0.3, 0.33], [0.19, 0.12, 0.145], suit);
  const head = new THREE.Group();
  head.position.set(0, 0.98, -0.12);
  head.rotation.x = 0.12;
  rider.add(head);
  oval(head, [0, 0, 0], [0.162, 0.182, 0.193], paint);
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
  glass.scale.set(0.166, 0.185, 0.198);
  head.add(glass);
  oval(head, [0, -0.09, -0.14], [0.123, 0.067, 0.085], paint);
  box(head, [0.067, 0.015, 0.008], [0, -0.09, -0.224], rubber);
  for (const side of [-1, 1]) {
    oval(head, [side * 0.157, -0.015, -0.012], [0.008, 0.023, 0.025], alloy);
    rod(rider, [side * 0.25, 0.76, 0.055], [side * 0.33, 0.48, -0.09], 0.077, suit);
    oval(rider, [side * 0.33, 0.48, -0.09], [0.07, 0.075, 0.073], alloy);
    rod(rider, [side * 0.33, 0.48, -0.09], [side * 0.31, 0.3, -0.33], 0.06, suit);
    oval(rider, [side * 0.31, 0.3, -0.33], [0.064, 0.049, 0.075], rubber);
  }
  const legs = [-1, 1].map((side) => {
    const root = new THREE.Group();
    root.name = side > 0 ? 'bike:right-leg' : 'bike:left-leg';
    rider.add(root);
    const thigh = cylinder(root, 0.089, 0.083, 1, [0, 0, 0], suit, 16);
    const shin = cylinder(root, 0.073, 0.061, 1, [0, 0, 0], suit, 16);
    const knee = oval(root, [0, 0, 0], [0.072, 0.1, 0.081], alloy);
    const boot = new THREE.Group();
    boot.name = side > 0 ? 'bike:right-boot' : 'bike:left-boot';
    root.add(boot);
    oval(boot, [0, 0.05, 0.035], [0.062, 0.1, 0.079], rubber);
    box(boot, [0.125, 0.047, 0.25], [0, -0.024, -0.045], rubber);
    box(boot, [0.13, 0.012, 0.255], [0, -0.05, -0.044], alloy);
    bakeStatic(boot);
    return { side, thigh, shin, knee, boot };
  });
  const align = (bone: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    bone.position.copy(a).add(b).multiplyScalar(0.5);
    bone.scale.y = a.distanceTo(b);
    bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  };
  let rightFootDown = 1,
    stopped = true,
    previousTime = 0;
  const pose = (speed: number, time: number, groundY: number, grounded: boolean) => {
    const dt = Math.max(0, Math.min(0.1, time - previousTime));
    previousTime = time;
    if (speed > 0.85 || !grounded) stopped = false;
    else if (speed < 0.25) stopped = true;
    const desired = stopped ? 1 : 0;
    rightFootDown += (desired - rightFootDown) * (1 - Math.exp(-dt * 16));
    if (Math.abs(rightFootDown - desired) < 0.001) rightFootDown = desired;
    for (const leg of legs) {
      const down = leg.side > 0 ? rightFootDown : 0;
      const hip = new THREE.Vector3(leg.side * 0.14, 0.3, 0.33);
      const knee = new THREE.Vector3(
        leg.side * (0.3 + down * 0.005),
        0.035 - down * 0.11,
        0.025 + down * 0.29,
      );
      const foot = new THREE.Vector3(
        leg.side * (0.23 + down * 0.15),
        -0.21 * (1 - down) + (groundY + 0.056) * down,
        0.29 + down * 0.065,
      );
      align(leg.thigh, hip, knee);
      align(leg.shin, knee, foot.clone().add(new THREE.Vector3(0, 0.08, 0.025)));
      leg.knee.position.copy(knee);
      leg.boot.position.copy(foot);
      leg.boot.rotation.x = (1 - down) * -0.22;
    }
  };
  pose(0, 0, -0.61, true);
  bakeStatic(head);
  bakeStatic(torso);
  bakeStatic(rider, [head, torso, ...legs.map((leg) => leg.thigh.parent!)]);
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
    rightBoot: legs[1].boot,
    get rightFootDown() {
      return rightFootDown;
    },
    update(
      speed: number,
      lean: number,
      brake: boolean,
      time: number,
      night: number,
      groundY = -0.61,
      grounded = true,
    ) {
      pose(speed, time, groundY, grounded);
      rider.rotation.z = stopped ? 0 : lean * 0.08;
      rider.position.y = 0;
      head.rotation.y = stopped ? 0 : -lean * 0.18;
      tail.emissiveIntensity = brake ? 2.8 : 1;
      headlight.intensity = 8 + night * 34;
    },
  };
}
