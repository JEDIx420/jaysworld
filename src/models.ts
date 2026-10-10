import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WHEEL_POINTS } from './vehicle';

const mat = (color: string, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
export const materials = {
  plaster: mat('#ede2c5'),
  white: mat('#f5eddb'),
  laterite: mat('#a95434'),
  terracotta: mat('#a84426'),
  tileDark: mat('#79361f'),
  wood: mat('#86613c'),
  darkWood: mat('#3c3325'),
  foliage: mat('#427747'),
  yellow: mat('#eeb941', 0.55),
  black: mat('#233632', 0.7),
  rubber: mat('#1c2424', 0.95),
  chrome: mat('#b2c2bb', 0.32, 0.6),
  cream: mat('#e7d9b8'),
  teal: mat('#356d68'),
  navy: mat('#294456'),
  glass: new THREE.MeshStandardMaterial({
    color: '#39676b',
    roughness: 0.22,
    metalness: 0.2,
    transparent: true,
    opacity: 0.65,
  }),
  lamp: new THREE.MeshStandardMaterial({
    color: '#ffda91',
    emissive: '#ffb75c',
    emissiveIntensity: 0.65,
    roughness: 0.5,
  }),
  red: mat('#b65c36'),
  wicker: mat('#b99958'),
  skin: mat('#a77150'),
  cloth: mat('#577e9c'),
};

/** Close driving cameras can pass under palms; nearby leaf fragments yield the view. */
export function clearCameraFoliage(material: THREE.MeshStandardMaterial) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif (length(vViewPosition) < 4.5) discard;',
    );
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => key() + '-clear-close-foliage';
}

export function box(
  parent: THREE.Object3D,
  dimensions: [number, number, number],
  at: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function cylinder(
  parent: THREE.Object3D,
  rTop: number,
  rBottom: number,
  height: number,
  at: [number, number, number],
  material: THREE.Material,
  segments = 12,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, height, segments),
    material,
  );
  mesh.position.set(...at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(
  parent: THREE.Object3D,
  size: [number, number, number],
  at: [number, number, number],
  material: THREE.Material,
  segments = 12,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, 8), material);
  mesh.scale.set(...size);
  mesh.position.set(...at);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function tube(
  parent: THREE.Object3D,
  points: number[][],
  radius: number,
  material: THREE.Material,
  radial = 6,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(4, points.length * 3), radius, radial, false),
    material,
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Merge each static material batch. Dynamic parts remain separate and keep their pivots.
export function bakeStatic(root: THREE.Group, exclude: THREE.Object3D[] = []) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, { geometry: THREE.BufferGeometry; mesh: THREE.Mesh }[]>();
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent)
      if (exclude.includes(parent)) return;
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    if (!geometry.getAttribute('uv'))
      geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.getAttribute('position').count * 2),
          2,
        ),
      );
    // Models here use positions/normals/UVs only. Ensure consistent attributes for merging.
    const list = batches.get(object.material) ?? [];
    list.push({ geometry, mesh: object });
    batches.set(object.material, list);
  });
  for (const [material, list] of batches) {
    if (list.length < 2) {
      list.forEach((v) => v.geometry.dispose());
      continue;
    }
    const merged = mergeGeometries(
      list.map((v) => v.geometry),
      false,
    );
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      list.forEach((v) => v.mesh.removeFromParent());
    }
    list.forEach((v) => v.geometry.dispose());
  }
}

export function textBoard(
  parent: THREE.Object3D,
  text: string,
  width: number,
  height: number,
  at: [number, number, number],
  color = '#183e36',
  fontColor = '#f8e6bb',
  subtext = '',
) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.round((768 * height) / width);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fontColor;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.globalAlpha = 1;
  ctx.fillStyle = fontColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.round(canvas.height * (subtext ? 0.27 : 0.38)) + 'px sans-serif';
  ctx.fillText(text, canvas.width / 2, canvas.height * (subtext ? 0.39 : 0.52), canvas.width - 45);
  if (subtext) {
    ctx.font = '400 ' + Math.round(canvas.height * 0.15) + 'px "Noto Sans Malayalam", sans-serif';
    ctx.fillText(subtext, canvas.width / 2, canvas.height * 0.72, canvas.width - 45);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }),
  );
  board.position.set(...at);
  parent.add(board);
  return board;
}

export function makeAuto() {
  const group = new THREE.Group();
  group.name = 'vehicle:auto';
  const body = new THREE.Group();
  group.add(body);
  box(body, [1.39, 0.17, 2.36], [0, -0.07, 0.02], materials.black);
  box(body, [1.43, 0.48, 1.4], [0, 0.29, 0.47], materials.yellow);
  box(body, [1.34, 0.1, 1.53], [0, 0.055, 0.43], materials.black);
  // A tapered curved nose, characteristic of a three-wheel auto.
  const nose = new THREE.Shape();
  nose.moveTo(-0.6, 0.03);
  nose.lineTo(0.6, 0.03);
  nose.quadraticCurveTo(0.67, 0.38, 0.46, 0.59);
  nose.lineTo(-0.46, 0.59);
  nose.quadraticCurveTo(-0.67, 0.38, -0.6, 0.03);
  const noseMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(nose, {
      depth: 0.5,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.055,
      bevelThickness: 0.045,
      curveSegments: 8,
    }),
    materials.yellow,
  );
  noseMesh.position.set(0, 0.0, -1.33);
  noseMesh.castShadow = true;
  body.add(noseMesh);
  box(body, [1.47, 0.1, 1.98], [0, 1.29, 0.12], materials.black);
  box(body, [1.49, 0.06, 1.93], [0, 1.35, 0.13], materials.black);
  box(body, [1.41, 0.64, 0.08], [0, 0.91, 1.07], materials.black);
  box(body, [1.12, 0.46, 0.06], [0, 0.94, 1.12], materials.glass);
  for (const x of [-0.69, 0.69]) {
    const pillar = box(body, [0.045, 0.94, 0.045], [x, 0.86, -0.73], materials.chrome);
    pillar.rotation.x = -0.09;
    box(body, [0.045, 0.74, 0.045], [x, 0.97, 0.83], materials.black);
    tube(
      body,
      [
        [x, 0.16, -0.74],
        [x, 0.35, -0.67],
        [x, 0.52, -0.62],
      ],
      0.025,
      materials.chrome,
    );
    box(body, [0.038, 0.36, 1.3], [x, 0.5, 0.33], materials.black);
    const mirror = cylinder(body, 0.12, 0.12, 0.055, [x * 1.21, 1.03, -0.83], materials.black);
    mirror.rotation.x = Math.PI / 2;
    mirror.scale.x = 0.68;
    tube(
      body,
      [
        [x, 0.87, -0.77],
        [x * 1.12, 0.98, -0.8],
        [x * 1.21, 1.03, -0.83],
      ],
      0.02,
      materials.chrome,
    );
    box(body, [0.2, 0.05, 0.85], [x * 1.13, -0.07, 0.41], materials.chrome);
    const mudguard = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.045, 5, 16, Math.PI),
      materials.yellow,
    );
    mudguard.rotation.y = Math.PI / 2;
    mudguard.position.set(x, -0.29, 0.85);
    body.add(mudguard);
    box(body, [0.08, 0.19, 0.11], [x * 0.76, 0.24, 1.17], materials.red);
  }
  const windshield = box(body, [1.2, 0.65, 0.015], [0, 0.95, -0.8], materials.glass);
  windshield.rotation.x = -0.13;
  box(body, [1.25, 0.038, 0.045], [0, 1.26, -0.76], materials.chrome);
  box(body, [1.15, 0.035, 0.055], [0, 0.65, -0.83], materials.black);
  const wiper = box(body, [0.015, 0.31, 0.015], [0.14, 0.87, -0.86], materials.black);
  wiper.rotation.z = -0.55;
  box(body, [1.12, 0.045, 0.055], [0, 0.65, -0.76], materials.darkWood);
  box(body, [1.24, 0.14, 0.51], [0, 0.38, 0.65], materials.darkWood);
  box(body, [1.2, 0.43, 0.09], [0, 0.6, 0.88], materials.darkWood);
  box(body, [0.45, 0.11, 0.45], [0, 0.33, -0.38], materials.darkWood);
  box(body, [0.45, 0.36, 0.085], [0, 0.56, -0.18], materials.darkWood);
  cylinder(body, 0.047, 0.047, 0.55, [0, 0.41, -0.78], materials.black).rotation.x = -0.54;
  const handle = box(body, [0.52, 0.025, 0.04], [0, 0.6, -0.85], materials.chrome);
  for (const x of [-0.28, 0.28]) box(body, [0.11, 0.045, 0.065], [x, 0.6, -0.85], materials.rubber);
  handle.rotation.x = -0.18;
  const frontLight = cylinder(body, 0.105, 0.105, 0.055, [0, 0.39, -1.39], materials.lamp, 16);
  frontLight.rotation.x = Math.PI / 2;
  for (const x of [-0.43, 0.43]) {
    const light = cylinder(body, 0.045, 0.045, 0.04, [x, 0.28, -1.4], materials.lamp, 10);
    light.rotation.x = Math.PI / 2;
  }
  box(body, [1.13, 0.055, 0.055], [0, -0.025, -1.45], materials.chrome);
  textBoard(body, 'KL 01 J 0420', 0.48, 0.115, [0, 0.12, -1.415], '#e0bb50', '#202824').rotation.y =
    Math.PI;
  textBoard(body, 'JAY', 0.43, 0.15, [0, 0.77, 1.121], '#203b31', '#efb841');
  // Driver, seated within the cabin.
  sphere(body, [0.13, 0.145, 0.13], [0, 0.94, -0.39], materials.skin);
  sphere(body, [0.14, 0.075, 0.135], [0, 1.03, -0.37], materials.darkWood);
  box(body, [0.32, 0.31, 0.19], [0, 0.68, -0.39], materials.cloth);
  for (const x of [-0.13, 0.13]) {
    tube(
      body,
      [
        [x, 0.81, -0.42],
        [x * 1.4, 0.7, -0.59],
        [x * 1.75, 0.61, -0.83],
      ],
      0.043,
      materials.skin,
    );
    tube(
      body,
      [
        [x, 0.49, -0.36],
        [x, 0.3, -0.69],
        [x, 0.17, -0.73],
      ],
      0.065,
      materials.navy,
    );
  }
  bakeStatic(body);
  const spinners: THREE.Group[] = [];
  const wheels = WHEEL_POINTS.map((point, index) => {
    const pivot = new THREE.Group();
    pivot.name = 'wheel-steer:' + index;
    const spin = new THREE.Group();
    spin.name = 'wheel-spin:' + index;
    spinners.push(spin);
    pivot.add(spin);
    const tire = cylinder(spin, 0.32, 0.32, 0.19, [0, 0, 0], materials.rubber, 20);
    tire.rotation.z = Math.PI / 2;
    const rim = cylinder(spin, 0.19, 0.19, 0.202, [0, 0, 0], materials.chrome, 12);
    rim.rotation.z = Math.PI / 2;
    const hub = cylinder(spin, 0.06, 0.06, 0.218, [0, 0, 0], materials.black, 10);
    hub.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = box(
        spin,
        [0.215, 0.025, 0.18],
        [0, Math.cos(angle) * 0.09, Math.sin(angle) * 0.09],
        materials.black,
      );
      spoke.rotation.x = angle;
    }
    bakeStatic(spin);
    pivot.position.set(point.x, point.y - 0.3, point.z);
    group.add(pivot);
    return pivot;
  });
  return { group, wheels, spinners };
}

function roofGeometry(width: number, depth: number, rise: number) {
  const w = width / 2,
    d = depth / 2,
    a = [-w, 0, -d],
    b = [w, 0, -d],
    c = [w, 0, d],
    e = [-w, 0, d],
    r1 = [0, rise, -d * 0.58],
    r2 = [0, rise, d * 0.58];
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [a, r1, b, b, r2, c, b, r1, r2, c, r2, e, e, r1, a, e, r2, r1].flat(),
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}
function tiledRoof(parent: THREE.Group, width: number, depth: number, rise: number, y: number) {
  const mesh = new THREE.Mesh(roofGeometry(width, depth, rise), materials.terracotta);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  const h = (x: number, z: number) =>
    rise *
    (1 -
      Math.max(
        Math.abs(x) / (width / 2),
        Math.max(0, (Math.abs(z) - depth * 0.29) / (depth * 0.21)),
      ));
  const seams: number[] = [];
  for (let x = -width / 2 + 0.2; x < width / 2; x += 0.38)
    for (let i = 0; i < 16; i++) {
      const z1 = -depth / 2 + (i * depth) / 16,
        z2 = z1 + depth / 16;
      seams.push(x, y + h(x, z1) + 0.02, z1, x, y + h(x, z2) + 0.02, z2);
    }
  for (let z = -depth / 2 + 0.2; z < depth / 2; z += 0.4)
    for (let i = 0; i < 16; i++) {
      const x1 = -width / 2 + (i * width) / 16,
        x2 = x1 + width / 16;
      seams.push(x1, y + h(x1, z) + 0.025, z, x2, y + h(x2, z) + 0.025, z);
    }
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(seams, 3));
  parent.add(
    new THREE.LineSegments(
      lines,
      new THREE.LineBasicMaterial({ color: '#592d20', transparent: true, opacity: 0.32 }),
    ),
  );
  cylinder(
    parent,
    0.105,
    0.105,
    depth * 0.58,
    [0, y + rise + 0.025, 0],
    materials.tileDark,
  ).rotation.x = Math.PI / 2;
  box(parent, [width, 0.16, 0.14], [0, y - 0.03, depth / 2], materials.darkWood);
  box(parent, [width, 0.16, 0.14], [0, y - 0.03, -depth / 2], materials.darkWood);
}
function windowFrame(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  width = 1.55,
  height = 1.3,
) {
  box(parent, [width + 0.18, height + 0.18, 0.1], [x, y, z], materials.wood);
  box(parent, [width, height, 0.11], [x, y, z + 0.03], materials.glass);
  box(parent, [0.055, height, 0.12], [x, y, z + 0.06], materials.cream);
  box(parent, [width, 0.055, 0.12], [x, y, z + 0.06], materials.cream);
  for (const side of [-1, 1])
    box(
      parent,
      [0.35, height + 0.1, 0.09],
      [x + side * (width / 2 + 0.28), y, z],
      materials.darkWood,
    );
}
export function makePot(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const pot = new THREE.Group();
  pot.position.set(x, 0, z);
  pot.scale.setScalar(scale);
  cylinder(pot, 0.28, 0.21, 0.52, [0, 0.26, 0], materials.laterite);
  cylinder(pot, 0.3, 0.3, 0.05, [0, 0.52, 0], materials.terracotta);
  for (let i = 0; i < 5; i++) {
    const leaf = sphere(
      pot,
      [0.14, 0.4, 0.07],
      [Math.sin(i * 2.4) * 0.16, 0.8, Math.cos(i * 2.4) * 0.16],
      materials.foliage,
      8,
    );
    leaf.rotation.z = Math.sin(i * 2.4) * 0.4;
  }
  parent.add(pot);
  return pot;
}
export function makeBench(parent: THREE.Object3D, x: number, z: number, yaw = 0) {
  const bench = new THREE.Group();
  box(bench, [2.4, 0.13, 0.6], [0, 0.65, 0], materials.wood);
  for (const px of [-0.92, 0.92]) {
    box(bench, [0.12, 0.65, 0.46], [px, 0.32, 0], materials.darkWood);
    box(bench, [0.1, 1.1, 0.1], [px, 0.58, -0.24], materials.darkWood);
  }
  for (let i = 0; i < 3; i++)
    box(bench, [2.4, 0.14, 0.065], [0, 0.86 + i * 0.17, -0.24], materials.wood);
  bench.position.set(x, 0, z);
  bench.rotation.y = yaw;
  parent.add(bench);
  return bench;
}

export const TOWER_ROOF = 27.8;
export function makeEagleTowers() {
  const group = new THREE.Group();
  group.name = 'landmark:eagle-towers';
  const steel = mat('#304b50', 0.3, 0.65);
  const glazing = mat('#5b9297', 0.24, 0.38);
  const darkGlass = mat('#365b67', 0.28, 0.28);
  glazing.name = 'tower:windows';
  glazing.emissive.set('#c4a86b');
  glazing.emissiveIntensity = 0;
  const width = 12.2,
    depth = 9.4;
  box(group, [14.5, 0.36, 12], [0, 0.18, 0.6], materials.laterite);
  box(group, [width, 25.9, depth], [0, 13.25, 0], darkGlass);
  for (let floor = 0; floor < 7; floor++) {
    const y = 1.95 + floor * 3.65;
    for (const z of [-depth / 2 - 0.02, depth / 2 + 0.02]) {
      for (let x = -5.05; x <= 5.1; x += 2.05)
        box(
          group,
          [1.92, 3.24, 0.055],
          [x, y, z],
          (floor + Math.round(x)) % 3 ? glazing : darkGlass,
        );
      box(group, [width + 0.22, 0.17, 0.17], [0, y + 1.68, z], steel);
    }
    for (const x of [-width / 2 - 0.03, width / 2 + 0.03]) {
      for (let z = -3.6; z <= 3.7; z += 1.8) box(group, [0.055, 3.24, 1.67], [x, y, z], glazing);
      box(group, [0.17, 0.17, depth], [x, y + 1.68, 0], steel);
    }
  }
  for (const x of [-6.17, 6.17])
    for (const z of [-4.77, 4.77]) box(group, [0.24, 26.8, 0.24], [x, 13.4, z], materials.chrome);
  box(group, [6, 0.2, 3], [0, 3.55, 5.7], steel);
  box(group, [2.4, 2.75, 0.12], [0, 1.75, 4.81], materials.glass);
  box(group, [0.08, 2.85, 0.15], [0, 1.8, 4.92], materials.chrome);
  textBoard(
    group,
    'EAGLE TOWERS',
    9.3,
    1.18,
    [0, 5.6, 4.79],
    '#203f47',
    '#e7daba',
    'EAGLE EYE · RESEARCH & DEPLOYMENT',
  );
  textBoard(group, 'EAGLE EYE', 8.2, 1.25, [0, 24.8, 4.82], '#203f47', '#f2e4bf');
  box(group, [12.8, 0.28, 10], [0, TOWER_ROOF - 0.14, 0], materials.cream);
  for (const z of [-4.85, 4.85]) {
    box(group, [12.6, 0.14, 0.12], [0, TOWER_ROOF + 1.08, z], steel);
    for (let x = -6; x <= 6; x += 1.5)
      box(group, [0.07, 1.05, 0.07], [x, TOWER_ROOF + 0.53, z], steel);
  }
  for (const x of [-6.2, 6.2]) box(group, [0.12, 1, 9.6], [x, TOWER_ROOF + 0.5, 0], glazing);
  box(group, [2.5, 2.2, 2.6], [-3.8, TOWER_ROOF + 1.1, -2.9], materials.plaster);
  textBoard(group, 'ROOF', 1.2, 0.4, [-3.8, TOWER_ROOF + 1.6, -1.56], '#304b50', '#f2e4bf');
  for (const x of [-4.8, 4.8])
    for (const z of [-2.5, 2.5]) makePot(group, x, z, 1.0).position.y += TOWER_ROOF;
  makeBench(group, 2.8, -3, Math.PI);
  const bench = group.children[group.children.length - 1];
  bench.position.y = TOWER_ROOF;
  bakeStatic(group);
  return { group, width, depth, height: TOWER_ROOF };
}

export function makeBuilding(kind: string, color?: string) {
  if (kind === 'eagle-eye') return makeEagleTowers();
  const group = new THREE.Group();
  group.name = 'building:' + kind;
  const width = kind === 'eagle-eye' ? 11 : kind === 'opsflash' ? 9.6 : kind === 'rift' ? 10 : 8.5;
  const depth = kind === 'rift' ? 8.5 : 7;
  const wall = color ? mat(color) : materials.plaster;
  box(group, [width + 1.5, 0.32, depth + 2.6], [0, 0.16, 0.4], materials.laterite);
  box(group, [width + 0.9, 0.1, depth + 2.1], [0, 0.37, 0.4], materials.cream);
  if (kind === 'about') {
    box(group, [width, 2.8, 0.2], [0, 1.82, -depth / 2], wall);
    for (const x of [-width / 2, width / 2]) box(group, [0.2, 2.8, depth], [x, 1.82, 0], wall);
    box(group, [width, 2.8, 0.2], [0, 1.82, 0], materials.darkWood);
  } else box(group, [width, 2.8, depth], [0, 1.82, 0], wall);
  if (kind === 'rift' || kind === 'opsflash') {
    box(
      group,
      [width + 1.2, 0.24, depth + 1.4],
      [0, 3.4, 0],
      kind === 'opsflash' ? materials.navy : materials.plaster,
    );
    for (const x of [-width / 2 - 0.1, width / 2 + 0.1])
      box(group, [0.12, 0.6, depth + 0.8], [x, 3.75, 0], materials.chrome);
  } else tiledRoof(group, width + 2.3, depth + 2.5, 1.85, 3.28);
  const porchZ = depth / 2 + 0.8;
  box(group, [width + 0.5, 0.13, 1.9], [0, 0.46, porchZ], materials.wood);
  for (const x of [-width * 0.43, 0, width * 0.43]) {
    box(group, [0.16, 2.5, 0.16], [x, 1.74, depth / 2 + 1.37], materials.darkWood);
    box(group, [0.32, 0.1, 0.32], [x, 0.54, depth / 2 + 1.37], materials.wood);
    box(group, [0.32, 0.1, 0.32], [x, 2.91, depth / 2 + 1.37], materials.wood);
  }
  for (let step = 0; step < 3; step++)
    box(
      group,
      [2.2, 0.13 * (3 - step), 0.45],
      [0, 0.065 * (3 - step), depth / 2 + 1.7 + step * 0.43],
      materials.plaster,
    );
  if (kind !== 'about') {
    box(group, [1.18, 2.15, 0.1], [0, 1.5, depth / 2 + 0.06], materials.darkWood);
    box(group, [0.05, 0.09, 0.07], [0.35, 1.53, depth / 2 + 0.14], materials.chrome);
    for (const x of [-width * 0.29, width * 0.29]) windowFrame(group, x, 1.99, depth / 2 + 0.1);
  }
  makePot(group, -width * 0.4, depth / 2 + 1.05, 0.8);
  makePot(group, width * 0.4, depth / 2 + 1.05, 1);
  if (kind === 'about') {
    box(group, [5.0, 0.93, 0.75], [0, 1.03, depth / 2 + 0.7], materials.teal);
    box(group, [5.2, 0.12, 0.89], [0, 1.56, depth / 2 + 0.7], materials.wood);
    for (let i = 0; i < 6; i++)
      cylinder(
        group,
        0.075,
        0.06,
        0.18,
        [-1.2 + i * 0.42, 1.7, depth / 2 + 0.72],
        materials.chrome,
        8,
      );
    sphere(group, [0.22, 0.25, 0.22], [-1.8, 1.84, depth / 2 + 0.66], materials.chrome);
    cylinder(
      group,
      0.055,
      0.055,
      0.24,
      [-1.51, 1.94, depth / 2 + 0.66],
      materials.chrome,
    ).rotation.z = -0.75;
    box(group, [2.2, 0.52, 0.65], [0, 2.2, 1.5], materials.wood);
    for (let i = 0; i < 4; i++)
      box(group, [0.33, 0.42, 0.25], [-0.72 + i * 0.48, 2.45, 1.5], materials.red);
    textBoard(
      group,
      'CHAYA',
      3.5,
      0.68,
      [0, 2.77, depth / 2 + 1.4],
      '#224e42',
      '#e7c98e',
      'ചായ · TEA & CONVERSATION',
    );
    makeBench(group, -2.8, depth / 2 + 2.8);
    makeBench(group, 2.8, depth / 2 + 2.8);
    const bicycle = new THREE.Group();
    for (const x of [-0.75, 0.75]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.037, 5, 20), materials.rubber);
      wheel.position.set(x, 0.46, 0);
      bicycle.add(wheel);
    }
    tube(
      bicycle,
      [
        [-0.75, 0.46, 0],
        [0, 1.1, 0],
        [0.75, 0.46, 0],
        [-0.2, 0.46, 0],
        [-0.42, 1.08, 0],
        [-0.75, 0.46, 0],
      ],
      0.035,
      materials.teal,
    );
    box(bicycle, [0.35, 0.06, 0.19], [-0.42, 1.11, 0], materials.darkWood);
    bicycle.position.set(-width / 2 - 1.3, 0, 1.7);
    bicycle.rotation.y = 0.4;
    group.add(bicycle);
  } else if (kind === 'eagle-eye') {
    textBoard(
      group,
      'EAGLE EYE',
      4.0,
      0.72,
      [0, 2.86, depth / 2 + 1.41],
      '#163d39',
      '#f3ddb1',
      'RESEARCH & DEPLOYMENT LABS',
    );
    for (const x of [-3.2, 3.2]) {
      box(group, [1.4, 0.7, 0.07], [x, 1.18, depth / 2 + 0.26], materials.teal);
      box(group, [1.4, 0.06, 0.1], [x, 1.53, depth / 2 + 0.28], materials.wood);
    }
    makeBench(group, 3.4, depth / 2 + 3.2);
    for (const x of [-4.0, -2.7]) makePot(group, x, depth / 2 + 3.2, 0.65);
  } else if (kind === 'opsflash') {
    textBoard(
      group,
      'OPSFLASH',
      3.4,
      0.65,
      [0, 2.84, depth / 2 + 1.4],
      '#274252',
      '#eed39c',
      'HIGH COMMAND · GTM OPERATIONS',
    );
    const dish = new THREE.Group();
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      materials.cream,
    );
    bowl.rotation.x = 0.65;
    dish.add(bowl);
    cylinder(dish, 0.06, 0.06, 1.5, [0, -0.5, 0], materials.chrome);
    dish.position.set(-2.6, 4.8, 0);
    group.add(dish);
    for (let i = 0; i < 3; i++)
      box(group, [0.14, 0.14, 0.04], [-1.8 + i * 0.3, 2.84, depth / 2 + 1.44], materials.lamp);
  } else if (kind === 'rift') {
    textBoard(
      group,
      'RIFT',
      3.4,
      0.75,
      [0, 2.85, depth / 2 + 1.42],
      '#254956',
      '#cbe8df',
      'COMPUTER CENTRE · RECONCILIATION',
    );
    for (const x of [-2.8, 2.8]) {
      box(group, [2.2, 0.13, 1.0], [x, 1.2, depth / 2 + 0.4], materials.wood);
      for (const px of [x - 0.8, x + 0.8])
        box(group, [0.11, 0.72, 0.11], [px, 0.81, depth / 2 + 0.4], materials.black);
      box(group, [0.85, 0.6, 0.08], [x, 1.7, depth / 2 + 0.4], materials.black);
      box(group, [0.73, 0.47, 0.02], [x, 1.7, depth / 2 + 0.45], materials.glass);
      box(group, [0.7, 0.04, 0.28], [x, 1.29, depth / 2 + 0.7], materials.chrome);
    }
  } else if (kind === 'music') {
    textBoard(
      group,
      'MUSIC & BEATS',
      4.0,
      0.7,
      [0, 2.84, depth / 2 + 1.41],
      '#66382d',
      '#f0cf8e',
      'MAKE A LITTLE NOISE',
    );
    for (const x of [-2.6, 2.6]) {
      box(group, [0.61, 1.1, 0.44], [x, 1.05, depth / 2 + 1.0], materials.black);
      for (const y of [0.82, 1.22]) {
        const speaker = cylinder(
          group,
          0.19,
          0.19,
          0.04,
          [x, y, depth / 2 + 1.24],
          materials.chrome,
        );
        speaker.rotation.x = Math.PI / 2;
      }
    }
    for (let i = 0; i < 8; i++) {
      const bar = box(
        group,
        [0.15, 0.24 + (i % 4) * 0.19, 0.055],
        [-0.8 + i * 0.24, 1.35, depth / 2 + 0.17],
        materials.teal,
      );
      bar.position.y += 0.12;
    }
    makeBench(group, 0, depth / 2 + 3.7);
  } else if (kind === 'space') {
    // Local tiled annex with a compact dome above it.
    textBoard(
      group,
      'THE QUIET BETWEEN STARS',
      5.0,
      0.63,
      [0, 2.83, depth / 2 + 1.42],
      '#263f58',
      '#e8dcad',
      'LOOK A LITTLE FURTHER',
    );
  } else if (kind === 'saltwater')
    textBoard(
      group,
      'SALTWATER',
      4.0,
      0.75,
      [0, 2.84, depth / 2 + 1.41],
      '#284840',
      '#e9d09a',
      'THE ESTUARY',
    );
  bakeStatic(group);
  return { group, width, depth, height: 3.3 };
}

export function makePalmGeometries() {
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.18, 2, 0),
    new THREE.Vector3(0.5, 4, 0.1),
    new THREE.Vector3(1.0, 6.5, 0.18),
    new THREE.Vector3(1.45, 8.0, 0.25),
  ]);
  const trunk = new THREE.TubeGeometry(trunkCurve, 12, 0.23, 8, false);
  const fronds: THREE.BufferGeometry[] = [];
  const vertices: number[] = [];
  for (let leaf = 0; leaf < 11; leaf++) {
    const angle = (leaf * Math.PI * 2) / 11,
      length = 4.4 + Math.sin(leaf * 2.1) * 0.55;
    const point = (t: number, width: number) =>
      new THREE.Vector3(
        1.45 + Math.cos(angle) * t * length - Math.sin(angle) * width,
        8 + Math.sin(t * Math.PI) * 1.1 - t * t * 2.15,
        0.25 + Math.sin(angle) * t * length + Math.cos(angle) * width,
      );
    for (let segment = 0; segment < 13; segment++) {
      const t = (segment + 0.15) / 13,
        n = (segment + 0.83) / 13,
        half = Math.sin(t * Math.PI) * 0.46;
      // Individual leaflets make the coconut silhouette recognizable.
      const a = point(t, 0),
        b = point(n, -half),
        c = point(n + 0.025, 0),
        d = point(n, half);
      vertices.push(
        ...a.toArray(),
        ...b.toArray(),
        ...c.toArray(),
        ...a.toArray(),
        ...c.toArray(),
        ...d.toArray(),
      );
    }
  }
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  leaves.computeVertexNormals();
  fronds.push(leaves);
  const merged = mergeGeometries(fronds)!;
  leaves.dispose();
  return { trunk, fronds: merged };
}

export function makeBoat() {
  const group = new THREE.Group();
  group.name = 'prop:kettuvallam';
  const vertices: number[] = [];
  const sections = [
    [-7.2, 0.05, 0.75],
    [-6, 1.4, 0.8],
    [-4.8, 1.9, 0.86],
    [0, 2.1, 0.9],
    [4.8, 1.9, 0.86],
    [6.0, 1.4, 0.8],
    [7.2, 0.05, 0.75],
  ];
  for (let n = 0; n < sections.length - 1; n++) {
    const [z1, w1, h1] = sections[n],
      [z2, w2, h2] = sections[n + 1];
    for (const side of [-1, 1]) {
      const a = [side * w1, h1, z1],
        b = [side * w2, h2, z2],
        c = [side * w2 * 0.52, 0.08, z2],
        d = [side * w1 * 0.52, 0.08, z1];
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    vertices.push(
      -w1 * 0.52,
      0.08,
      z1,
      w2 * 0.52,
      0.08,
      z2,
      -w2 * 0.52,
      0.08,
      z2,
      -w1 * 0.52,
      0.08,
      z1,
      w1 * 0.52,
      0.08,
      z1,
      w2 * 0.52,
      0.08,
      z2,
    );
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  hull.computeVertexNormals();
  const hullMesh = new THREE.Mesh(
    hull,
    new THREE.MeshStandardMaterial({ color: '#493b26', roughness: 0.95, side: THREE.DoubleSide }),
  );
  hullMesh.castShadow = true;
  group.add(hullMesh);
  box(group, [3.7, 0.12, 11.5], [0, 0.87, 0], materials.wood);
  const roofVertices: number[] = [];
  const roofPoint = (a: number, z: number) => [Math.cos(a) * 1.83, 1.35 + Math.sin(a) * 1.45, z];
  for (let i = 0; i < 22; i++) {
    const a = (i * Math.PI) / 22,
      b = ((i + 1) * Math.PI) / 22;
    roofVertices.push(
      ...roofPoint(a, -4.5),
      ...roofPoint(a, 4.5),
      ...roofPoint(b, 4.5),
      ...roofPoint(a, -4.5),
      ...roofPoint(b, 4.5),
      ...roofPoint(b, -4.5),
    );
  }
  const canopy = new THREE.BufferGeometry();
  canopy.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3));
  canopy.computeVertexNormals();
  const roof = new THREE.Mesh(
    canopy,
    new THREE.MeshStandardMaterial({ color: '#c9ac6a', roughness: 1, side: THREE.DoubleSide }),
  );
  roof.castShadow = true;
  group.add(roof);
  for (let z = -4.5; z <= 4.6; z += 0.75) {
    const p: number[][] = [];
    for (let i = 0; i <= 10; i++) p.push(roofPoint((i * Math.PI) / 10, z));
    tube(group, p, 0.024, materials.wood);
  }
  for (const x of [-1.64, 1.64]) {
    box(group, [0.07, 0.07, 11], [x, 1.3, 0], materials.wicker);
    for (let z = -4.6; z <= 4.6; z += 1.15)
      box(group, [0.045, 0.55, 0.045], [x, 1.08, z], materials.wicker);
    for (const z of [-4.5, -2.4, 0, 2.4, 4.5])
      box(group, [0.08, 1.45, 0.08], [x, 1.59, z], materials.wood);
  }
  box(group, [2.9, 0.72, 0.1], [0, 1.32, -4.46], materials.wicker);
  textBoard(group, 'KERALA', 1.3, 0.31, [0, 1.45, -4.53], '#ab8f56', '#3e3c27').rotation.y =
    Math.PI;
  cylinder(group, 0.5, 0.5, 0.06, [0, 1.3, 5.05], materials.darkWood).rotation.x = 0.2;
  for (const x of [-1.5, 1.5]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 6, 16), materials.rubber);
    ring.position.set(x, 0.7, 3.4);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }
  bakeStatic(group);
  return group;
}

export function makeCrocodile() {
  const group = new THREE.Group();
  group.name = 'wildlife:crocodile';
  const skin = mat('#536548'),
    belly = mat('#8c9270'),
    scutes = mat('#394c34');
  sphere(group, [0.46, 0.23, 0.94], [0, 0.12, 0], skin, 16);
  sphere(group, [0.39, 0.13, 0.88], [0, 0.01, 0], belly);
  const head = new THREE.Group();
  head.position.set(0, 0.15, -0.95);
  group.add(head);
  sphere(head, [0.32, 0.15, 0.43], [0, 0.0, -0.27], skin);
  box(head, [0.46, 0.11, 0.61], [0, -0.08, -0.72], skin);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.13, -0.35);
  head.add(jaw);
  box(jaw, [0.4, 0.065, 0.57], [0, -0.03, -0.39], belly);
  for (const x of [-0.22, 0.22]) {
    sphere(head, [0.1, 0.09, 0.13], [x, 0.13, -0.3], skin, 8);
    sphere(head, [0.046, 0.04, 0.043], [x, 0.19, -0.33], materials.yellow, 8);
    sphere(head, [0.015, 0.036, 0.019], [x, 0.198, -0.353], materials.black, 8);
    sphere(head, [0.028, 0.018, 0.025], [x * 0.65, -0.013, -0.97], scutes, 8);
  }
  for (let row = 0; row < 3; row++)
    for (let n = 0; n < 8; n++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.027, 0.07, 4), belly);
      tooth.position.set(row === 0 ? -0.2 : row === 1 ? 0.2 : 0, -0.12, -0.43 - n * 0.073);
      if (row === 2) continue;
      head.add(tooth);
    }
  for (let i = 0; i < 9; i++)
    for (const x of [-0.2, 0, 0.2]) {
      const scale = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.11, 4), scutes);
      scale.scale.z = 1.5;
      scale.position.set(x, 0.32, -0.74 + i * 0.17);
      group.add(scale);
    }
  const tail: THREE.Group[] = [];
  let parent: THREE.Object3D = group;
  for (let i = 0; i < 6; i++) {
    const segment = new THREE.Group();
    segment.position.set(0, i === 0 ? 0.12 : 0, i === 0 ? 0.79 : 0.36);
    parent.add(segment);
    parent = segment;
    tail.push(segment);
    const width = 0.29 * (1 - i * 0.14);
    sphere(segment, [width, 0.11 * (1 - i * 0.11), 0.29], [0, 0, 0.18], skin, 10);
    const scale = new THREE.Mesh(
      new THREE.ConeGeometry(0.073 * (1 - i * 0.11), 0.13 * (1 - i * 0.1), 4),
      scutes,
    );
    scale.position.set(0, 0.11, 0.2);
    segment.add(scale);
  }
  const legs: THREE.Group[] = [];
  for (const front of [true, false])
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.35, 0.02, front ? -0.48 : 0.51);
      group.add(leg);
      legs.push(leg);
      tube(
        leg,
        [
          [0, 0, 0],
          [side * 0.28, -0.06, 0.13],
          [side * 0.39, -0.13, 0.35],
        ],
        0.095,
        skin,
      );
      sphere(leg, [0.13, 0.04, 0.18], [side * 0.41, -0.13, 0.4], skin, 8);
      for (let n = 0; n < 4; n++) {
        const z = 0.49 + Math.sin(n * 0.8) * 0.055,
          x = side * 0.41 + (n - 1.5) * 0.055;
        sphere(leg, [0.023, 0.018, 0.13], [x, -0.13, z], skin, 8);
        sphere(leg, [0.017, 0.014, 0.025], [x, -0.13, z + 0.125], materials.cream, 8);
      }
    }
  bakeStatic(head, [jaw]);
  bakeStatic(group, [...tail, ...legs, head]);
  return { group, tail, legs, head, jaw };
}

export function makeEgret() {
  const group = new THREE.Group();
  sphere(group, [0.14, 0.18, 0.35], [0, 0.64, 0], materials.white);
  tube(
    group,
    [
      [0, 0.7, -0.1],
      [0, 0.96, -0.15],
      [0, 1.12, -0.3],
      [0, 1.2, -0.42],
    ],
    0.045,
    materials.white,
  );
  sphere(group, [0.09, 0.1, 0.13], [0, 1.2, -0.42], materials.white);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.28, 6), materials.yellow);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 1.19, -0.65);
  group.add(beak);
  for (const x of [-0.07, 0.07]) {
    cylinder(group, 0.012, 0.012, 0.6, [x, 0.31, 0.02], materials.darkWood, 5);
    tube(
      group,
      [
        [x, 0.03, 0.02],
        [x, 0.03, -0.1],
      ],
      0.013,
      materials.darkWood,
    );
  }
  bakeStatic(group);
  return group;
}
