import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { box, cylinder, tube, textBoard, bakeStatic, materials, makeBench } from './models';
import { makePerson, animatePerson } from './village-life';
import { groundHeight } from './terrain';
import { AMPHITHEATRE, CHILDRENS_PARK } from './recreation-layout';

const material = (color: string, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const black = material('#11151c', 0.55),
  steel = material('#7f8c94', 0.32, 0.75);
const stone = material('#c3ac8a'),
  red = material('#a8452c'),
  wood = material('#645044');
const cream = material('#f0e5cc'),
  skin = material('#b58465'),
  green = material('#319751');
const amber = material('#eda447'),
  cyan = material('#4bbec9'),
  pink = material('#bd587e');

function rod(parent: THREE.Object3D, a: number[], b: number[], r: number, mat: THREE.Material) {
  const p = new THREE.Vector3(...(a as [number, number, number]));
  const q = new THREE.Vector3(...(b as [number, number, number]));
  const m = cylinder(
    parent,
    r,
    r,
    p.distanceTo(q),
    p.clone().add(q).multiplyScalar(0.5).toArray() as [number, number, number],
    mat,
    8,
  );
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
  return m;
}
function ellipsoid(parent: THREE.Object3D, at: number[], scale: number[], mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
  m.position.set(...(at as [number, number, number]));
  m.scale.set(...(scale as [number, number, number]));
  m.castShadow = true;
  parent.add(m);
  return m;
}
function brickTexture() {
  const size = 128,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const row = Math.floor(y / 16),
        mortar = y % 16 < 2 || (x + (row % 2) * 16) % 32 < 2;
      const noise = ((x * 13 + y * 17) % 15) - 7,
        i = (y * size + x) * 4;
      data[i] = mortar ? 125 : 177 + noise;
      data[i + 1] = mortar ? 106 : 84 + noise;
      data[i + 2] = mortar ? 82 : 56 + noise;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  t.needsUpdate = true;
  return t;
}
function guitar(telecaster: boolean, bass = false) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.05, 0.35);
  shape.bezierCurveTo(-0.2, 0.4, -0.16, 0.15, -0.27, 0.1);
  shape.bezierCurveTo(-0.5, -0.15, -0.31, -0.5, 0, -0.48);
  shape.bezierCurveTo(0.42, -0.48, 0.5, -0.12, 0.27, 0.05);
  shape.bezierCurveTo(0.13, 0.2, 0.2, 0.31, 0.14, 0.35);
  shape.closePath();
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
      steps: 1,
    }),
    telecaster ? black : bass ? red : cyan,
  );
  group.add(body);
  if (telecaster) {
    const pickguard = new THREE.Mesh(new THREE.ShapeGeometry(shape), cream);
    pickguard.scale.set(0.72, 0.82, 1);
    pickguard.position.set(-0.015, -0.01, 0.115);
    group.add(pickguard);
  }
  box(group, [0.09, bass ? 1.08 : 0.83, 0.065], [0.045, bass ? 0.77 : 0.66, 0.03], materials.wood);
  box(group, [0.12, 0.21, 0.06], [0.045, bass ? 1.37 : 1.14, 0.04], materials.cream);
  for (const y of [-0.11, 0.16]) box(group, [0.14, 0.045, 0.025], [0.035, y, 0.13], black);
  box(group, [0.17, 0.06, 0.025], [0.04, -0.28, 0.13], steel);
  for (let i = 0; i < (bass ? 4 : 6); i++)
    rod(
      group,
      [i * 0.01 + 0.015, -0.3, 0.148],
      [i * 0.01 + 0.015, bass ? 1.3 : 1.1, 0.08],
      0.0015,
      steel,
    );
  for (let i = 0; i < 15; i++)
    box(group, [0.09, 0.004, 0.004], [0.045, 0.34 + i * 0.045, 0.066], steel);
  bakeStatic(group);
  return group;
}
function performer(role: string, x: number, z: number) {
  const group = new THREE.Group();
  group.name = 'concert:member:' + role;
  group.position.set(x, 0.95, z);
  const looks: Record<
    string,
    {
      shirt: string;
      trousers: string;
      complexion: string;
      hair: string;
      height: number;
      width: number;
    }
  > = {
    lead: {
      shirt: '#11151c',
      trousers: '#11151c',
      complexion: '#b58465',
      hair: '#171a20',
      height: 1,
      width: 1,
    },
    guitar: {
      shirt: '#315b75',
      trousers: '#303747',
      complexion: '#d1a17c',
      hair: '#4b3027',
      height: 1.08,
      width: 0.92,
    },
    bass: {
      shirt: '#763b40',
      trousers: '#181c28',
      complexion: '#8d5c42',
      hair: '#191519',
      height: 1.03,
      width: 1.2,
    },
    keys: {
      shirt: '#dfc795',
      trousers: '#334954',
      complexion: '#bc8062',
      hair: '#81766d',
      height: 0.95,
      width: 0.95,
    },
    drums: {
      shirt: '#d4d8d6',
      trousers: '#273847',
      complexion: '#ac7550',
      hair: '#392e26',
      height: 0.92,
      width: 1.08,
    },
  };
  const look = looks[role],
    shirt = material(look.shirt),
    trousers = material(look.trousers);
  const complexion = material(look.complexion),
    hair = material(look.hair);
  group.scale.set(look.width, look.height, 1);
  group.userData.look = { ...look, role };
  const seated = role === 'drums';
  ellipsoid(group, [0, seated ? 0.8 : 1.02, 0], [0.25, 0.35, 0.17], shirt);
  if (role === 'guitar') {
    for (const side of [-1, 1])
      box(group, [0.09, 0.31, 0.035], [side * 0.13, 1.05, -0.17], material('#627d90'));
    box(group, [0.015, 0.49, 0.02], [0, 1.05, -0.18], cream);
  }
  if (role === 'keys') {
    box(group, [0.025, 0.5, 0.02], [0, 1.06, -0.175], black);
    for (const side of [-1, 1]) box(group, [0.09, 0.08, 0.015], [side * 0.14, 1.15, -0.175], wood);
  }
  const head = new THREE.Group();
  head.position.set(0, seated ? 1.31 : 1.54, 0);
  group.add(head);
  ellipsoid(head, [0, 0, 0], [0.18, 0.22, 0.17], complexion);
  ellipsoid(head, [0, 0.12, 0.025], [0.185, 0.12, 0.17], hair);
  if (role === 'guitar') {
    // Long brown hair and a tall, slim denim silhouette.
    ellipsoid(head, [0, -0.015, 0.1], [0.19, 0.24, 0.1], hair);
    for (const side of [-1, 1])
      ellipsoid(head, [side * 0.16, -0.1, 0.045], [0.058, 0.21, 0.075], hair);
  } else if (role === 'bass') {
    ellipsoid(head, [0, -0.12, -0.1], [0.15, 0.105, 0.095], hair);
    for (const side of [-1, 1])
      box(head, [0.125, 0.045, 0.025], [side * 0.08, 0.035, -0.158], black);
    rod(head, [-0.025, 0.035, -0.175], [0.025, 0.035, -0.175], 0.006, steel);
  } else if (role === 'keys') {
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 6, 16), steel);
      lens.position.set(side * 0.075, 0.025, -0.16);
      head.add(lens);
    }
    rod(head, [-0.025, 0.025, -0.171], [0.025, 0.025, -0.171], 0.006, steel);
  } else if (role === 'drums') {
    cylinder(head, 0.187, 0.187, 0.055, [0, 0.115, 0], red, 24);
    ellipsoid(head, [0.12, 0.015, 0.1], [0.11, 0.11, 0.1], hair);
  }
  for (const side of [-1, 1]) {
    if (seated) {
      rod(group, [side * 0.13, 0.65, 0], [side * 0.25, 0.38, -0.25], 0.085, trousers);
      rod(group, [side * 0.25, 0.38, -0.25], [side * 0.25, 0.12, -0.3], 0.075, trousers);
    } else {
      const spread = role === 'bass' ? 0.23 : role === 'guitar' ? 0.19 : 0.14;
      rod(group, [side * 0.12, 0.83, 0], [side * spread, 0.12, -0.03], 0.085, trousers);
    }
    box(
      group,
      [0.19, 0.12, 0.33],
      [
        side * (seated ? 0.25 : role === 'bass' ? 0.23 : role === 'guitar' ? 0.19 : 0.14),
        0.08,
        seated ? -0.3 : -0.08,
      ],
      role === 'lead' ? material('#f5f5ef') : role === 'guitar' ? wood : black,
    );
  }
  if (role === 'lead') {
    // A real hat proportion: modest brim, shaped crown, dark band and centre dent.
    cylinder(head, 0.285, 0.285, 0.022, [0, 0.195, 0], green, 32).scale.z = 0.9;
    const crown = cylinder(head, 0.17, 0.205, 0.2, [0, 0.285, 0], green, 24);
    crown.rotation.z = -0.055;
    crown.scale.z = 0.87;
    cylinder(head, 0.208, 0.208, 0.035, [0, 0.21, 0], black, 24).scale.z = 0.87;
    ellipsoid(head, [0, 0.382, 0], [0.11, 0.008, 0.024], material('#20703e'));
  }
  const right = new THREE.Group(),
    left = new THREE.Group();
  const shoulderY = seated ? 0.97 : 1.2;
  right.position.set(-0.24, shoulderY, 0);
  left.position.set(0.24, shoulderY, 0);
  group.add(right, left);
  for (const arm of [right, left]) {
    const bare = role === 'bass' || role === 'drums';
    rod(arm, [0, 0, 0], [0, -0.22, -0.12], 0.065, bare ? complexion : shirt);
    rod(arm, [0, -0.22, -0.12], [0.09, -0.42, -0.24], 0.057, bare ? complexion : shirt);
    ellipsoid(arm, [0.09, -0.43, -0.24], [0.065, 0.07, 0.05], complexion);
    if (seated) rod(arm, [0.09, -0.43, -0.24], [0.09, -0.48, -0.67], 0.007, cream);
    bakeStatic(arm);
  }
  let instrument: THREE.Group | undefined;
  if (['lead', 'guitar', 'bass'].includes(role)) {
    instrument = guitar(role === 'lead', role === 'bass');
    instrument.rotation.set(0, Math.PI, role === 'bass' ? -0.42 : -0.6);
    instrument.position.set(0, 0.88, -0.28);
    instrument.scale.setScalar(0.7);
    group.add(instrument);
    rod(group, [-0.2, 1.22, -0.15], [0.17, 0.6, -0.27], 0.022, black);
    left.rotation.z = -0.7;
    right.rotation.x = -0.18;
  } else if (role === 'keys') {
    right.rotation.x = left.rotation.x = -0.8;
  }
  bakeStatic(head);
  bakeStatic(group, [right, left, head, ...(instrument ? [instrument] : [])]);
  return { group, head, right, left, role, look };
}

export function createRecreation(scene: THREE.Scene, world: RAPIER.World) {
  const root = new THREE.Group();
  root.name = 'landmark:baker-amphitheatre';
  root.position.set(AMPHITHEATRE.x, groundHeight(AMPHITHEATRE.x, AMPHITHEATRE.z), AMPHITHEATRE.z);
  scene.add(root);
  const statics = new THREE.Group();
  root.add(statics);
  const brick = new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 0.92 });
  const collide = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    yaw = 0,
    park = false,
  ) => {
    const origin = park ? CHILDRENS_PARK : AMPHITHEATRE;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(origin.x + x, groundHeight(origin.x, origin.z) + y, origin.z + z)
        .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw))
        .setFriction(0.9),
    );
  };
  cylinder(statics, 20.5, 20.5, 0.13, [0, 0.1, 0], stone, 96);
  // A horseshoe of rising brick terraces, with three open radial aisles.
  for (let row = 0; row < 6; row++) {
    const r = 7.3 + row * 1.95,
      h = 0.35 + row * 0.39;
    for (let n = 0; n < 40; n++) {
      if ([9, 10, 19, 20, 29, 30].includes(n)) continue;
      const a = -1.3 + (n / 39) * 2.6,
        x = Math.sin(a) * r,
        z = -Math.cos(a) * r;
      box(statics, [r * 0.071, h, 1.7], [x, h / 2 + 0.14, z], brick).rotation.y = -a;
      box(statics, [r * 0.074, 0.09, 1.75], [x, h + 0.18, z], stone).rotation.y = -a;
      collide(x, h / 2, z, r * 0.071, h, 1.7, -a);
    }
  }
  // Perforated, curved jali screens: genuine openings rather than a solid painted wall.
  for (const s of [-1, 1])
    for (let col = 0; col < 17; col++)
      for (let row = 0; row < 9; row++) {
        if ((col + row) % 2) continue;
        const a = s * (0.92 + (col / 17) * 1.06),
          r = 20;
        box(
          statics,
          [1.16, 0.24, 0.36],
          [Math.sin(a) * r, 0.34 + row * 0.28, -Math.cos(a) * r],
          brick,
        ).rotation.y = -a;
      }
  for (const s of [-1, 1]) {
    box(statics, [0.55, 2.9, 0.55], [s * 5.3, 1.45, -19.4], brick);
    cylinder(statics, 0.55, 0.55, 0.11, [s * 5.3, 2.96, -19.4], stone, 12);
    for (let j = 0; j < 8; j++) {
      const step = j / 8;
      box(
        statics,
        [1.7, 0.14 + step * 2.45, 1.65],
        [s * (6 + step * 10), (0.14 + step * 2.45) / 2, -14 + step * 4],
        brick,
      );
    }
  }
  // Terracotta canopy, laterite stage and a real production truss.
  box(statics, [14, 0.85, 7], [0, 0.56, 7], brick);
  collide(0, 0.56, 7, 14, 1.12, 7);
  box(statics, [14.4, 0.09, 7.3], [0, 1.01, 7], wood);
  box(statics, [15.8, 0.2, 8.8], [0, 6, 7.2], red).rotation.x = -0.06;
  for (const x of [-7.2, 7.2]) {
    cylinder(statics, 0.22, 0.27, 6, [x, 3, 10], brick, 12);
    collide(x, 3, 10, 0.5, 6, 0.5);
  }
  for (const x of [-6.6, 6.6])
    for (const z of [4.1, 10]) rod(statics, [x, 1, z], [x, 5.6, z], 0.05, steel);
  for (const z of [4.1, 10]) {
    rod(statics, [-6.6, 5.4, z], [6.6, 5.4, z], 0.05, steel);
    rod(statics, [-6.6, 5.8, z], [6.6, 5.8, z], 0.05, steel);
    for (let n = 0; n < 12; n++)
      rod(statics, [-6.6 + n * 1.1, 5.4, z], [-5.5 + n * 1.1, 5.8, z], 0.025, steel);
  }
  for (const x of [-6.1, 6.1]) {
    for (let n = 0; n < 4; n++)
      box(statics, [0.7, 0.48, 0.65], [x, 4.6 - n * 0.5, 4.4], black).rotation.x = 0.1;
    box(statics, [1.5, 1.1, 1.3], [x, 1.56, 4.4], black);
  }
  for (const x of [-2, 0, 2]) box(statics, [0.7, 0.35, 0.6], [x, 1.2, 3.9], black).rotation.x = 0.3;
  for (const x of [-4.4, 4.4]) {
    box(statics, [1.3, 1.3, 0.65], [x, 1.65, 9.4], black);
    box(statics, [1.2, 0.65, 0.45], [x, 2.6, 9.4], black);
  }
  textBoard(
    statics,
    'THE BRICKYARD',
    8.7,
    1.1,
    [0, 4.2, 10.7],
    '#141921',
    '#f3dcc0',
    'CLASSIC ROCK · FIVE PIECES / ONE BIG SOUND',
  ).rotation.y = Math.PI;
  const sign = new THREE.Group();
  sign.rotation.y = Math.PI;
  textBoard(
    sign,
    'BRICKYARD · CLASSIC ROCK',
    8,
    0.8,
    [0, 2.2, 0],
    '#8e3e2c',
    '#f0dfc2',
    'OPEN AIR AMPHITHEATRE',
  );
  for (const x of [-3.6, 3.6]) cylinder(sign, 0.09, 0.09, 2.4, [x, 1.2, 0], wood);
  sign.position.set(0, 0, -20);
  statics.add(sign);
  // Lead Telecaster, second guitar, bass, keyboard and drummer: exactly five performers.
  const band = [
    performer('lead', 0, 4.7),
    performer('guitar', -3.1, 5.5),
    performer('bass', 3.1, 5.5),
    performer('keys', -3.7, 8),
    performer('drums', 1.4, 9),
  ];
  band.forEach((p) => root.add(p.group));
  const mic = new THREE.Group();
  mic.position.set(0, 1, 3.9);
  rod(mic, [0, 0, 0], [0, 1.43, 0], 0.024, steel);
  rod(mic, [0, 1.4, 0], [0, 1.4, 0.32], 0.025, steel);
  for (let i = 0; i < 3; i++)
    rod(mic, [0, 0.1, 0], [Math.sin(i * 2.1) * 0.32, 0.02, Math.cos(i * 2.1) * 0.32], 0.02, black);
  ellipsoid(mic, [0, 1.43, 0.32], [0.045, 0.045, 0.1], black);
  statics.add(mic);
  // Keyboard includes individual black and white keys, sustain pedal and X stand.
  box(statics, [1.7, 0.13, 0.45], [-3.7, 1.93, 7.55], black);
  for (let n = 0; n < 24; n++) {
    box(statics, [0.062, 0.025, 0.26], [-4.48 + n * 0.065, 2.015, 7.42], cream);
    if (![2, 6].includes(n % 7))
      box(statics, [0.038, 0.03, 0.15], [-4.45 + n * 0.065, 2.04, 7.49], black);
  }
  rod(statics, [-4.3, 1, 7.55], [-3.1, 1.86, 7.55], 0.035, steel);
  rod(statics, [-3.1, 1, 7.55], [-4.3, 1.86, 7.55], 0.035, steel);
  const cymbals: THREE.Mesh[] = [];
  for (const [x, y, z, r] of [
    [1.4, 1.52, 8.1, 0.54],
    [0.9, 1.9, 8.4, 0.25],
    [1.9, 1.9, 8.4, 0.26],
    [0.4, 1.58, 9, 0.28],
    [2.4, 1.55, 9, 0.32],
  ]) {
    const drum = cylinder(statics, r, r, r === 0.54 ? 0.52 : 0.34, [x, y, z], red, 24);
    if (r === 0.54) drum.rotation.x = Math.PI / 2;
    const face = cylinder(
      statics,
      r * 0.98,
      r * 0.98,
      0.015,
      [x, y + (r === 0.54 ? 0 : 0.18), z - (r === 0.54 ? 0.27 : 0)],
      cream,
      24,
    );
    if (r === 0.54) face.rotation.x = Math.PI / 2;
  }
  for (const x of [-0.1, 2.9]) {
    rod(statics, [x, 1, 8.5], [x, 2.4, 8.5], 0.025, steel);
    const c = cylinder(root, 0.4, 0.12, 0.035, [x, 2.4, 8.5], amber, 24);
    cymbals.push(c);
  }
  for (const arm of [band[4].right, band[4].left])
    rod(arm, [0.09, -0.43, -0.24], [0.09, -0.25, -0.7], 0.01, wood);
  const audience = Array.from({ length: 24 }, (_, i) => {
    const p = makePerson(['#4d7590', '#be6e59', '#67774f', '#a675a4'][i % 4]);
    const row = 1 + (i % 4),
      a = -1.15 + Math.floor(i / 4) * 0.45,
      r = 7.3 + row * 1.95;
    p.group.position.set(Math.sin(a) * r, 0.5 + row * 0.39, -Math.cos(a) * r);
    p.group.rotation.y = Math.atan2(-p.group.position.x, -10 - p.group.position.z) + Math.PI;
    root.add(p.group);
    return p;
  });
  // Continuous moving-head sweeps and LED colour washes. No seizure-like flashing.
  const lights: {
    pivot: THREE.Group;
    light: THREE.SpotLight;
    beam: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
  }[] = [];
  const colors = ['#64cbff', '#c27aff', '#ffae54', '#5df0c2'];
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(-4.8 + i * 3.2, 5.35, 4.1);
    root.add(pivot);
    cylinder(pivot, 0.17, 0.2, 0.28, [0, 0, 0], black, 12);
    const bm = new THREE.MeshBasicMaterial({
      color: colors[i],
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.1, 13, 20, 1, true), bm);
    beam.position.y = -6.6;
    pivot.add(beam);
    const light = new THREE.SpotLight(colors[i], 45, 26, 0.27, 0.9, 1.2);
    light.position.copy(pivot.position);
    light.target.position.set(-4 + i * 2.8, 0.4, -6);
    root.add(light, light.target);
    lights.push({ pivot, light, beam, material: bm });
  }
  const ledMat = new THREE.MeshStandardMaterial({
    color: '#768ccb',
    emissive: '#739cff',
    emissiveIntensity: 2,
  });
  for (let n = 0; n < 16; n++)
    box(statics, [0.38, 0.055, 0.04], [-6 + n * 0.8, 1.07, 3.45], ledMat);
  // A tree-framed play garden beyond the amphitheatre and canal road.
  const park = new THREE.Group();
  park.name = 'landmark:childrens-park';
  park.position.set(
    CHILDRENS_PARK.x,
    groundHeight(CHILDRENS_PARK.x, CHILDRENS_PARK.z),
    CHILDRENS_PARK.z,
  );
  scene.add(park);
  cylinder(park, 12, 12, 0.08, [0, 0.08, 0], material('#b8aa8c'), 64);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.28 && Math.cos(a) < 0) continue;
    const x = Math.sin(a) * 11.8,
      z = Math.cos(a) * 11.8;
    box(park, [0.11, 0.88, 0.14], [x, 0.5, z], cream).rotation.y = a;
    for (const y of [0.3, 0.72]) box(park, [2, 0.09, 0.12], [x, y, z], cream).rotation.y = a;
    collide(x, 0.5, z, 2, 1, 0.2, a, true);
  }
  for (const [x, z] of [
    [-9, -7],
    [9, -7],
    [-9, 8],
    [9, 8],
  ]) {
    cylinder(park, 0.2, 0.34, 5.5, [x, 2.75, z], wood, 12);
    for (const [dx, dy, dz] of [
      [0, 5.8, 0],
      [-1.2, 5.2, 0.2],
      [1.2, 5.4, -0.3],
    ])
      ellipsoid(park, [x + dx, dy, z + dz], [2.3, 1.6, 2.1], material('#4d7953'));
    collide(x, 1.8, z, 0.5, 3.6, 0.5, 0, true);
  }
  // Two independently swinging seats with children attached to the seat pivots.
  for (const x of [-5.8, 0.2])
    for (const z of [-2.4, 0.4]) rod(park, [x, 0.1, z], [x, 3.5, -1], 0.075, cyan);
  rod(park, [-5.8, 3.5, -1], [0.2, 3.5, -1], 0.08, cyan);
  const swings = [-4.2, -1.4].map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, 3.4, -1);
    park.add(g);
    for (const s of [-0.36, 0.36]) rod(g, [s, 0, 0], [s, -2.7, 0], 0.014, steel);
    box(g, [0.95, 0.09, 0.42], [0, -2.72, 0], amber);
    const child = makePerson(i ? '#d87366' : '#59a6b0', true);
    child.group.scale.setScalar(0.58);
    child.group.position.y = -2.73;
    g.add(child.group);
    return g;
  });
  collide(-2.8, 1.7, -1, 6.3, 3.4, 3.6, 0, true);
  // Play tower, open slide, ladder and safety rails.
  box(park, [2.2, 0.18, 2.2], [4.3, 1.75, -2.6], wood);
  for (const x of [3.3, 5.3])
    for (const z of [-3.6, -1.6]) cylinder(park, 0.07, 0.08, 2.5, [x, 1.25, z], cyan, 8);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 4), red);
  roof.position.set(4.3, 3.3, -2.6);
  roof.rotation.y = Math.PI / 4;
  park.add(roof);
  box(park, [1, 0.08, 4.3], [4.3, 0.98, 0.6], amber).rotation.x = 0.43;
  for (const x of [3.75, 4.85])
    box(park, [0.08, 0.28, 4.4], [x, 1.12, 0.6], amber).rotation.x = 0.43;
  for (let n = 0; n < 6; n++)
    rod(
      park,
      [3.9, 0.3 + n * 0.29, -4.5 + n * 0.12],
      [4.7, 0.3 + n * 0.29, -4.5 + n * 0.12],
      0.035,
      steel,
    );
  collide(4.3, 1.3, -0.6, 3, 2.6, 8, 0, true);
  const seesaw = new THREE.Group();
  seesaw.position.set(-2.4, 0.65, 5.9);
  park.add(seesaw);
  box(seesaw, [4.8, 0.14, 0.4], [0, 0, 0], pink);
  for (const x of [-2.05, 2.05]) {
    box(seesaw, [0.7, 0.13, 0.65], [x, 0.12, 0], cream);
    rod(seesaw, [x, 0.1, 0], [x, 0.65, 0], 0.025, steel);
    rod(seesaw, [x, 0.65, -0.24], [x, 0.65, 0.24], 0.025, steel);
  }
  cylinder(park, 0.18, 0.42, 0.7, [-2.4, 0.35, 5.9], cyan, 8);
  collide(-2.4, 0.7, 5.9, 5.5, 1.4, 1.7, 0, true);
  const merry = new THREE.Group();
  merry.position.set(5.5, 0.3, 6);
  park.add(merry);
  cylinder(merry, 1.7, 1.7, 0.17, [0, 0, 0], cyan, 32);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    rod(
      merry,
      [Math.sin(a) * 1.35, 0, Math.cos(a) * 1.35],
      [Math.sin(a) * 1.35, 0.8, Math.cos(a) * 1.35],
      0.035,
      amber,
    );
  }
  collide(5.5, 0.5, 6, 3.6, 1, 3.6, 0, true);
  makeBench(park, -7.5, 4, Math.PI / 2);
  makeBench(park, 7.5, -7, -Math.PI / 2);
  const parkSign = new THREE.Group();
  parkSign.rotation.y = Math.PI;
  textBoard(
    parkSign,
    'LITTLE EXPLORERS',
    5,
    0.75,
    [0, 1.8, 0],
    '#356954',
    '#f3e6c9',
    'CHILDREN’S PLAY GARDEN',
  );
  parkSign.position.z = -12;
  park.add(parkSign);
  // Walking link from the concert lawn to the grove; the road stays unobstructed.
  const path = new THREE.Group();
  scene.add(path);
  for (let z = 69; z < 91; z += 1.5)
    if (z < 72 || z > 82)
      box(path, [2.3, 0.035, 1.3], [-177, groundHeight(-177, z) + 0.08, z], stone);
  bakeStatic(path);
  bakeStatic(statics);
  bakeStatic(park, [...swings, seesaw, merry]);
  bakeStatic(seesaw);
  bakeStatic(merry);
  let performance = false,
    night = 0;
  return {
    band,
    root,
    park,
    quality(value: boolean) {
      performance = value;
    },
    night(value: number) {
      night = value;
    },
    update(time: number, driver?: THREE.Vector3) {
      const near = !driver || driver.distanceTo(root.position) < 95;
      if (!near) return;
      band.forEach((p, i) => {
        p.head.rotation.y = Math.sin(time * 0.7 + i) * 0.15;
        if (p.role === 'drums') {
          p.right.rotation.x = -0.2 + Math.sin(time * 10) * 0.32;
          p.left.rotation.x = -0.2 + Math.sin(time * 10 + Math.PI) * 0.32;
        } else if (p.role === 'keys') {
          p.right.rotation.x = -0.8 + Math.sin(time * 5) * 0.06;
          p.left.rotation.x = -0.8 + Math.sin(time * 5 + 1.2) * 0.06;
        } else {
          p.group.rotation.z = Math.sin(time * (p.role === 'bass' ? 1.1 : 1.9) + i) * 0.025;
          p.right.rotation.x = -0.15 + Math.sin(time * (p.role === 'bass' ? 4 : 7) + i) * 0.16;
          p.left.rotation.x = Math.sin(time * 2 + i + 1.6) * 0.1;
        }
      });
      audience.forEach((p, i) => {
        p.group.visible = !performance || i < 12;
        animatePerson(p, time, i * 0.6, i % 3 ? 'clap' : 'chant');
      });
      cymbals.forEach((c, i) => (c.rotation.z = Math.sin(time * 12 + i) * 0.025));
      swings.forEach((g, i) => (g.rotation.x = Math.sin(time * 1.7 + i * 1.8) * 0.32));
      seesaw.rotation.z = Math.sin(time * 1.3) * 0.12;
      merry.rotation.y = time * 0.18;
      lights.forEach((l, i) => {
        l.pivot.rotation.set(
          0.35 + Math.sin(time * 0.45 + i) * 0.32,
          0,
          Math.sin(time * 0.38 + i * 1.7) * 0.4,
        );
        const direction = new THREE.Vector3(0, -1, 0).applyQuaternion(l.pivot.quaternion);
        l.light.target.position.copy(l.pivot.position).addScaledVector(direction, 12);
        l.light.intensity = performance && i > 1 ? 0 : 24 + night * 90;
        l.beam.visible = !performance || i < 2;
        l.material.opacity = 0.035 + night * 0.06;
      });
      ledMat.emissiveIntensity = 1.5 + Math.sin(time * 2) * 0.3 + night;
    },
  };
}
