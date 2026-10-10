import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  box,
  cylinder,
  tube,
  textBoard,
  bakeStatic,
  makeBuilding,
  makePalmGeometries,
  makeBoat,
  makeEgret,
  makeBench,
  materials,
  clearCameraFoliage,
} from './models';
import { PLACES } from './projects';
import { ROADS, ROAD_APRONS } from './village';
import { groundHeight } from './terrain';
import { createGround, addField } from './surfaces';
import { createRoadside } from './roadside';
import { createVillageLife } from './village-life';
import { createWildlife } from './wildlife';
import { streetlightPositions } from './road-fixtures';
import { createVenueLife } from './venue-life';

export interface Environment {
  update: (elapsed: number, dt: number, driver?: THREE.Vector3) => void;
  dynamics: { mesh: THREE.Mesh; body: RAPIER.RigidBody }[];
  markers: { mesh: THREE.Mesh; x: number; z: number }[];
  setQuality: (performance: boolean) => void;
  setNight: (amount: number) => void;
  setRain: (amount: number) => void;
  feedCroc: () => void;
  crocPosition: THREE.Vector3;
  life: ReturnType<typeof createVillageLife>;
  wildlife: ReturnType<typeof createWildlife>;
  roadside: ReturnType<typeof createRoadside>;
}
export const ROAD_POINTS = [
  [-51, 30],
  [-53, -4],
  [-31, -36],
  [9, -48],
  [47, -32],
  [55, 8],
  [43, 41],
  [8, 63],
  [-26, 59],
];
export const ROAD = new THREE.CatmullRomCurve3(
  ROAD_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.045, z)),
  true,
  'catmullrom',
  0.5,
);
const random = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function strip(
  curve: THREE.CatmullRomCurve3,
  width: number,
  material: THREE.Material,
  elevation = 0.06,
) {
  const verts: number[] = [],
    indices: number[] = [],
    uv: number[] = [];
  const steps = Math.max(32, Math.ceil(curve.getLength() / 1.4));
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPointAt(i / steps),
      t = curve.getTangentAt(i / steps);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize().multiplyScalar(width / 2);
    for (const side of [1, -1]) {
      const x = p.x + side * n.x,
        z = p.z + side * n.z;
      verts.push(x, groundHeight(x, z) + elevation, z);
      uv.push(side === 1 ? 0 : 1, i / 6);
    }
    if (i < steps) {
      const j = i * 2;
      indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  return mesh;
}
function fixedBox(
  world: RAPIER.World,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  yaw = 0,
) {
  return world.createCollider(
    RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
      .setTranslation(x, y, z)
      .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw))
      .setFriction(0.8),
  );
}

export function createEnvironment(scene: THREE.Scene, world: RAPIER.World): Environment {
  const rng = random(420),
    statics = new THREE.Group();
  statics.name = 'village:static';
  scene.add(statics);
  const dynamics: Environment['dynamics'] = [],
    markers: Environment['markers'] = [];
  createGround(scene, world);
  const curves = ROADS.map(
    (r) =>
      new THREE.CatmullRomCurve3(
        r.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
        !!r.closed,
        'catmullrom',
        0.5,
      ),
  );
  const shoulderMaterial = new THREE.MeshStandardMaterial({ color: '#9a7250', roughness: 1 });
  const asphaltMaterial = new THREE.MeshStandardMaterial({ color: '#48514b', roughness: 1 });
  for (const apron of ROAD_APRONS) {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(
        apron.radius,
        40,
        apron.side > 0 ? -Math.PI / 2 : Math.PI / 2,
        Math.PI,
      ),
      asphaltMaterial,
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(apron.x, groundHeight(apron.x, apron.z) + 0.065, apron.z);
    patch.receiveShadow = true;
    patch.updateMatrix();
    const surface = patch.geometry.clone().applyMatrix4(patch.matrix);
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        new Float32Array(surface.attributes.position.array),
        new Uint32Array(surface.index!.array),
      ).setFriction(0.95),
    );
    surface.dispose();
    statics.add(patch);
  }
  for (const [i, curve] of curves.entries()) {
    const shoulder = strip(curve, ROADS[i].width + 2.6, shoulderMaterial, 0.025);
    const road = strip(curve, ROADS[i].width, asphaltMaterial, 0.06 + i * 0.0008);
    // The wheels raycast the same raised road triangles the visitor sees.
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        new Float32Array(road.geometry.attributes.position.array),
        new Uint32Array(road.geometry.index!.array),
      ).setFriction(0.95),
    );
    statics.add(shoulder, road);
  }
  for (let i = 1; i < curves.length; i++) {
    const dashes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.014, 1.5),
      new THREE.MeshStandardMaterial({ color: '#bfc5a2', roughness: 1 }),
      Math.floor(curves[i].getLength() / 7),
    );
    const d = new THREE.Object3D();
    for (let n = 0; n < dashes.count; n++) {
      const t = n / dashes.count,
        p = curves[i].getPointAt(t),
        v = curves[i].getTangentAt(t);
      d.position.set(p.x, groundHeight(p.x, p.z) + 0.074, p.z);
      d.rotation.y = Math.atan2(v.x, v.z);
      d.updateMatrix();
      dashes.setMatrixAt(n, d.matrix);
    }
    statics.add(dashes);
  }
  // Faded edge lines and short centre dashes, with a deliberately narrow village road.
  const lineMaterial = new THREE.MeshStandardMaterial({ color: '#d2c9a4', roughness: 1 });
  const dashGeometry = new THREE.BoxGeometry(0.1, 0.012, 1.35);
  const dashes = new THREE.InstancedMesh(
    dashGeometry,
    lineMaterial,
    Math.floor(ROAD.getLength() / 5.8),
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < dashes.count; i++) {
    const t = i / dashes.count,
      p = ROAD.getPointAt(t),
      direction = ROAD.getTangentAt(t);
    dummy.position.set(p.x, groundHeight(p.x, p.z) + 0.074, p.z);
    dummy.rotation.set(0, Math.atan2(direction.x, direction.z), 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  }
  statics.add(dashes);
  for (const side of [-1, 1]) {
    const points = ROAD.getSpacedPoints(260).map((p, i) => {
      const tangent = ROAD.getTangentAt(i / 260);
      return p.clone().add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * 3.05));
    });
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const l = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: '#c9c29d', transparent: true, opacity: 0.6 }),
    );
    l.position.y = 0.036;
    statics.add(l);
  }
  // A shallow canal enters the broad backwater. Ground under the water is a safe recovery floor.
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      night: { value: 0 },
      croc: { value: new THREE.Vector2(90, 16) },
      feed: { value: 0 },
    },
    vertexShader:
      'varying vec3 vWorld; void main(){ vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:
      'varying vec3 vWorld; uniform float time; uniform float night; uniform vec2 croc; uniform float feed; void main(){ vec2 p=vWorld.xz; float a=sin(p.x*1.8+p.y*.31+time*.6);float b=sin(p.y*2.4-p.x*.32-time*.5);float glint=smoothstep(1.48,1.98,a+b);float distance=length(p-croc);float ripple=pow(max(0.0,sin(distance*9.0-time*5.0)),10.0)*exp(-distance*.65);vec3 base=mix(vec3(.075,.245,.214),vec3(.15,.39,.32),.5+.5*sin(p.x*.025+p.y*.014));vec3 color=base+glint*vec3(.20,.18,.10)+ripple*vec3(.18,.22,.18)*(1.0+feed);color=mix(color,color*vec3(.27,.40,.67),night*.8);gl_FragColor=vec4(color,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment> }',
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(380, 600), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(266, 0.026, 0);
  scene.add(water);
  const canal = new THREE.Mesh(new THREE.PlaneGeometry(71, 10), waterMaterial);
  canal.rotation.x = -Math.PI / 2;
  canal.position.set(54.5, 0.034, 8);
  scene.add(canal);
  const paddyCanal = new THREE.Mesh(new THREE.PlaneGeometry(7, 165), waterMaterial);
  paddyCanal.rotation.x = -Math.PI / 2;
  paddyCanal.position.set(-197.5, 0.034, 174.5);
  scene.add(paddyCanal);
  const ferryWater = new THREE.Mesh(new THREE.PlaneGeometry(70, 130), waterMaterial);
  ferryWater.rotation.x = -Math.PI / 2;
  ferryWater.position.set(-301, 0.034, -1);
  scene.add(ferryWater);
  box(statics, [13, 0.12, 11], [-197.5, 0.105, 168], materials.plaster);
  fixedBox(world, 13, 0.12, 11, -197.5, 0.105, 168);
  for (const z of [162.6, 173.4]) {
    box(statics, [13, 0.15, 0.18], [-197.5, 1.1, z], materials.plaster);
    for (let x = -204; x <= -191; x += 2)
      box(statics, [0.15, 1.1, 0.15], [x, 0.55, z], materials.plaster);
    fixedBox(world, 13, 1.1, 0.18, -197.5, 0.55, z);
  }
  // Irregular bank details give the water a physical edge.
  for (const x of [18.7, 54.5]) {
    if (x === 54.5) continue;
    box(statics, [0.8, 0.3, 10.5], [x, 0.13, 8], materials.laterite);
  }
  for (const z of [2.65, 13.35]) {
    box(statics, [31, 0.18, 0.85], [34.5, 0.06, z], materials.laterite);
    box(statics, [13, 0.18, 0.85], [66.5, 0.06, z], materials.laterite);
  }
  box(statics, [1.4, 0.3, 550], [75.5, 0.11, 0], materials.laterite);
  // The bridge is level with a shallow raised deck; all railings have matching collision.
  box(statics, [8.6, 0.12, 15], [55, 0.105, 8], materials.plaster);
  fixedBox(world, 8.6, 0.12, 15, 55, 0.105, 8);
  for (const x of [50.8, 59.2]) {
    box(statics, [0.18, 0.12, 15], [x, 1.12, 8], materials.plaster);
    box(statics, [0.12, 0.08, 15], [x, 0.6, 8], materials.plaster);
    for (let z = 1; z <= 15; z += 1.8)
      box(statics, [0.16, 1.08, 0.16], [x, 0.6, z], materials.plaster);
    fixedBox(world, 0.16, 1.15, 15, x, 0.7, 8);
  }
  // The original destinations now sit across connected village districts.
  let dome: THREE.Group | undefined;
  for (const place of PLACES) {
    if (place.id === 'saltwater') {
      for (let n = 0; n < 24; n++)
        box(statics, [0.45, 0.16, 3.7], [65 + n * 0.53, 0.39, 17], materials.wood);
      for (let n = 0; n < 18; n++)
        box(statics, [3.8, 0.16, 0.42], [77, 0.39, 13 + n * 0.48], materials.wood);
      for (const x of [64.8, 68.5, 72.2, 76, 78.9])
        for (const z of [15.2, 18.8]) {
          cylinder(statics, 0.11, 0.13, 1.35, [x, 0.7, z], materials.darkWood);
          cylinder(statics, 0.14, 0.14, 0.13, [x, 1.44, z], materials.wood);
        }
      const hut = makeBuilding('saltwater');
      hut.group.scale.setScalar(0.57);
      hut.group.position.set(66, 0, 24);
      hut.group.rotation.y = Math.PI / 2;
      statics.add(hut.group);
      fixedBox(world, 4.8, 3, 4, 66, 1.5, 24);
      const sign = new THREE.Group();
      textBoard(
        sign,
        'SALTWATER',
        3.7,
        1.0,
        [0, 2.2, 0],
        '#274a3d',
        '#efd39a',
        'THE WETLAND JETTY',
      );
      for (const x of [-1.3, 1.3]) box(sign, [0.13, 2.35, 0.13], [x, 1.17, 0], materials.darkWood);
      sign.position.set(62, 0, 19);
      sign.rotation.y = -Math.PI / 2;
      statics.add(sign);
    } else {
      const { group, width, depth, height } = makeBuilding(
        place.id,
        place.id === 'music' ? '#c89368' : place.id === 'opsflash' ? '#a2b4a0' : undefined,
      );
      const yaw = Math.atan2(
        place.trigger.x - place.position.x,
        place.trigger.z - place.position.z,
      );
      const baseY = groundHeight(place.position.x, place.position.z);
      group.position.set(place.position.x, baseY, place.position.z);
      group.rotation.y = yaw;
      statics.add(group);
      fixedBox(
        world,
        width,
        height,
        depth,
        place.position.x,
        baseY + height / 2,
        place.position.z,
        yaw,
      );
      fixedBox(
        world,
        width + 1.5,
        0.38,
        depth + 2.6,
        place.position.x,
        baseY + 0.19,
        place.position.z,
        yaw,
      );
      if (place.id === 'space') {
        dome = new THREE.Group();
        dome.name = 'landmark:observatory-dome';
        dome.position.set(place.position.x, baseY + 4.75, place.position.z);
        cylinder(dome, 2.55, 2.55, 0.36, [0, 0, 0], materials.cream, 24);
        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(2.5, 28, 15, 0.2, Math.PI * 2 - 0.4, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({
            color: '#e2e5d4',
            roughness: 0.42,
            metalness: 0.26,
            side: THREE.DoubleSide,
          }),
        );
        shell.position.y = 0.12;
        shell.castShadow = true;
        dome.add(shell);
        const telescope = cylinder(dome, 0.2, 0.24, 2.8, [0, 1.3, 0.4], materials.navy, 12);
        telescope.rotation.x = 0.95;
        scene.add(dome);
      }
    }
    const marker = new THREE.Mesh(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            -1.05, -0.89, 0, -0.89, -1.05, 0, 1.05, 0.89, 0, -1.05, -0.89, 0, 1.05, 0.89, 0, 0.89,
            1.05, 0, -1.05, 0.89, 0, -0.89, 1.05, 0, 1.05, -0.89, 0, -1.05, 0.89, 0, 1.05, -0.89, 0,
            0.89, -1.05, 0,
          ],
          3,
        ),
      ),
      new THREE.MeshBasicMaterial({
        color: '#efc477',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.name = 'entry-x:' + place.id;
    marker.position.set(
      place.trigger.x,
      groundHeight(place.trigger.x, place.trigger.z) + 0.19,
      place.trigger.z,
    );
    scene.add(marker);
    markers.push({ mesh: marker, x: place.trigger.x, z: place.trigger.z });
    // Compact X marks expand only when a visitor approaches.
    const post = new THREE.Group();
    post.position.set(
      place.trigger.x + 2.7,
      groundHeight(place.trigger.x + 2.7, place.trigger.z + 1.8),
      place.trigger.z + 1.8,
    );
    cylinder(post, 0.1, 0.12, 1.45, [0, 0.72, 0], materials.darkWood);
    textBoard(
      post,
      String(PLACES.indexOf(place) + 1).padStart(2, '0'),
      0.52,
      0.6,
      [0, 1.1, 0.12],
      '#193f34',
      '#eec67a',
    );
    statics.add(post);
  }
  // Coco palms are instanced, including separate coconuts. Their individual leaflets sway.
  const palm = makePalmGeometries(),
    palmCount = 100,
    wind = { value: 0 };
  const trunks = new THREE.InstancedMesh(palm.trunk, materials.wood, palmCount);
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#467b42',
    roughness: 1,
    side: THREE.DoubleSide,
  });
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = wind;
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.x+=sin(windTime*.65+position.z*.7)*max(0.0,position.y-6.0)*.035;',
    );
  };
  leafMat.customProgramCacheKey = () => 'kerala-palm-wind-v1';
  clearCameraFoliage(leafMat);
  const fronds = new THREE.InstancedMesh(palm.fronds, leafMat, palmCount),
    coconuts = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.17, 7, 6),
      materials.darkWood,
      palmCount * 3,
    );
  trunks.castShadow = fronds.castShadow = true;
  trunks.receiveShadow = fronds.receiveShadow = true;
  const roadSamples = curves.flatMap((c) => c.getSpacedPoints(Math.ceil(c.getLength() / 2)));
  let count = 0,
    attempts = 0;
  while (count < palmCount && attempts++ < 3000) {
    const x = rng() * 176 - 95,
      z = rng() * 182 - 90;
    if (
      x > 74 ||
      (x > 17 && Math.abs(z - 8) < 8) ||
      roadSamples.some((p) => Math.hypot(p.x - x, p.z - z) < 7.3) ||
      PLACES.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < 11) ||
      (x > -19 && x < 9 && z > -12 && z < 32)
    )
      continue;
    const scale = 0.69 + rng() * 0.48;
    dummy.position.set(x, groundHeight(x, z), z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(count, dummy.matrix);
    fronds.setMatrixAt(count, dummy.matrix);
    for (let n = 0; n < 3; n++) {
      const local = new THREE.Matrix4().makeTranslation(
        1.45 + Math.sin(n * 2.1) * 0.22,
        7.77,
        0.25 + Math.cos(n * 2.1) * 0.22,
      );
      coconuts.setMatrixAt(count * 3 + n, dummy.matrix.clone().multiply(local));
    }
    fixedBox(world, 0.44, 4, 0.44, x, groundHeight(x, z) + 2, z);
    count++;
  }
  trunks.count = fronds.count = count;
  coconuts.count = count * 3;
  scene.add(trunks, fronds, coconuts);
  // Three small paddy plots, raised bunds, and a field hut.
  const rice = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.12, 0.47, 3),
    new THREE.MeshStandardMaterial({ color: '#719447', roughness: 1 }),
    900,
  );
  let riceIndex = 0;
  for (let plot = 0; plot < 3; plot++) {
    const z = -5 + plot * 13.2;
    addField(statics, -6, z, 23, 12, ['#8faa4e', '#9ca950', '#6e9651'][plot]);
    for (let n = 0; n < 300; n++) {
      dummy.position.set(-16.5 + (n % 25) * 0.88, 0.22, z - 5.3 + Math.floor(n / 25) * 0.93);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.setScalar(0.8 + rng() * 0.3);
      dummy.updateMatrix();
      rice.setMatrixAt(riceIndex++, dummy.matrix);
    }
  }
  scene.add(rice);
  // Vegetation and boulders fill the verges without obscuring the driving route.
  const bushGeometry = new THREE.IcosahedronGeometry(1, 1),
    bushMat = new THREE.MeshStandardMaterial({ color: '#5d8544', flatShading: true, roughness: 1 });
  const bushes = new THREE.InstancedMesh(bushGeometry, bushMat, 270);
  let bushIndex = 0;
  for (let attempt = 0; attempt < 1500 && bushIndex < 270; attempt++) {
    const x = rng() * 172 - 92,
      z = rng() * 170 - 85;
    if (
      x > 73 ||
      (x > 16 && Math.abs(z - 8) < 7) ||
      roadSamples.some((p) => Math.hypot(p.x - x, p.z - z) < 6.8) ||
      PLACES.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < 10) ||
      (x > -19 && x < 9 && z > -12 && z < 32)
    )
      continue;
    dummy.position.set(x, groundHeight(x, z) + 0.35, z);
    dummy.rotation.set(0, rng() * 6.28, 0);
    dummy.scale.set(0.4 + rng() * 0.9, 0.4 + rng() * 0.5, 0.5 + rng() * 0.8);
    dummy.updateMatrix();
    bushes.setMatrixAt(bushIndex++, dummy.matrix);
  }
  bushes.count = bushIndex;
  bushes.castShadow = true;
  scene.add(bushes);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0),
    rocks = new THREE.InstancedMesh(
      rockGeometry,
      new THREE.MeshStandardMaterial({ color: '#9d9b76', roughness: 1, flatShading: true }),
      65,
    );
  for (let n = 0; n < 65; n++) {
    const z = -75 + n * 2.5;
    dummy.position.set(74.9 + Math.sin(n * 0.9) * 0.8, 0.19, z);
    dummy.rotation.set(rng(), rng() * 6.28, rng());
    dummy.scale.set(0.35 + rng() * 0.4, 0.28 + rng() * 0.25, 0.35 + rng() * 0.6);
    dummy.updateMatrix();
    rocks.setMatrixAt(n, dummy.matrix);
  }
  rocks.castShadow = true;
  scene.add(rocks);
  // A quiet field shelter and some utility lines.
  const shelter = new THREE.Group();
  for (const x of [-1.7, 1.7])
    for (const z of [-1.5, 1.5]) box(shelter, [0.12, 2.0, 0.12], [x, 1, z], materials.wood);
  const shelterRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.1, 4), materials.wicker);
  shelterRoof.rotation.y = Math.PI / 4;
  shelterRoof.position.y = 2.15;
  shelterRoof.castShadow = true;
  shelter.add(shelterRoof);
  makeBench(shelter, 0, 0);
  shelter.position.set(-5, 0, 39);
  statics.add(shelter);
  for (const [x, z] of [
    [-63, 18],
    [-63, -15],
    [-39, -41],
  ]) {
    cylinder(statics, 0.105, 0.14, 5.8, [x, 2.9, z], materials.darkWood);
    box(statics, [1.5, 0.12, 0.12], [x, 5.4, z], materials.wood);
  }
  for (const xOffset of [-0.45, 0.45]) {
    tube(
      statics,
      [
        [-63 + xOffset, 5.4, 18],
        [-63 + xOffset, 4.6, 1.5],
        [-63 + xOffset, 5.4, -15],
      ],
      0.012,
      materials.black,
      4,
    );
    tube(
      statics,
      [
        [-63 + xOffset, 5.4, -15],
        [-51 + xOffset, 4.6, -28],
        [-39 + xOffset, 5.4, -41],
      ],
      0.012,
      materials.black,
      4,
    );
  }
  // Woven houseboat, canoe, lilies, and egrets around the wetland.
  const boat = makeBoat();
  boat.position.set(92, 0, 38);
  boat.rotation.y = -0.2;
  scene.add(boat);
  const canoe = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), materials.darkWood);
  hull.scale.set(0.55, 0.22, 3.8);
  hull.position.y = 0.1;
  canoe.add(hull);
  for (let n = 0; n < 3; n++)
    box(canoe, [1.0, 0.08, 0.24], [0, 0.28, -1.7 + n * 1.7], materials.wood);
  canoe.position.set(83, 0.03, -16);
  canoe.rotation.y = 0.38;
  bakeStatic(canoe);
  scene.add(canoe);
  const lilyMat = new THREE.MeshStandardMaterial({
    color: '#648344',
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const lilies = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.52, 10, 0.24, Math.PI * 2 - 0.48),
    lilyMat,
    65,
  );
  for (let n = 0; n < 65; n++) {
    dummy.position.set(80 + rng() * 16, 0.056, -34 + rng() * 64);
    dummy.rotation.set(-Math.PI / 2, 0, rng() * 6.28);
    dummy.scale.setScalar(0.5 + rng() * 0.6);
    dummy.updateMatrix();
    lilies.setMatrixAt(n, dummy.matrix);
  }
  scene.add(lilies);
  const egrets: THREE.Group[] = [];
  for (let n = 0; n < 5; n++) {
    const egret = makeEgret();
    egret.position.set(71.9 + (n % 2) * 2.0, 0, -7 + n * 8.3);
    egret.rotation.y = rng() * Math.PI * 2;
    scene.add(egret);
    egrets.push(egret);
  }
  const wildlife = createWildlife(scene);
  const crocPosition = wildlife.position(0);
  let feed = 0,
    night = 0;
  // Street lamps use emissive materials; only a few cast light, and none cast extra shadows.
  const lamps: THREE.PointLight[] = [];
  for (const [n, { x, z, yaw }] of streetlightPositions().entries()) {
    const y = groundHeight(x, z),
      pole = new THREE.Group();
    pole.position.set(x, y, z);
    pole.rotation.y = yaw;
    cylinder(pole, 0.075, 0.11, 4, [0, 2, 0], materials.chrome, 8);
    tube(
      pole,
      [
        [0, 3.9, 0],
        [0, 4.12, -0.5],
        [0, 4.12, -1.3],
      ],
      0.06,
      materials.chrome,
    );
    box(pole, [0.48, 0.12, 0.75], [0, 4.06, -1.3], materials.black);
    box(pole, [0.37, 0.025, 0.58], [0, 3.99, -1.3], materials.lamp);
    bakeStatic(pole);
    statics.add(pole);
    fixedBox(world, 0.2, 3.9, 0.2, x, y + 1.95, z);
    if (n % 6 === 0) {
      const light = new THREE.PointLight('#ffc77d', 0, 17, 2);
      light.position.set(x - Math.sin(yaw) * 1.3, y + 3.9, z - Math.cos(yaw) * 1.3);
      scene.add(light);
      lamps.push(light);
    }
  }
  // Loose workshop crates and two balls can be nudged by the vehicle.
  for (let i = 0; i < 9; i++) {
    const x = 1 + (i % 3) * 0.9,
      z = -40 + Math.floor(i / 3) * 0.88,
      mesh = box(scene, [0.72, 0.72, 0.72], [x, 0.43, z], materials.wood);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, 0.43, z)
        .setCanSleep(true)
        .setLinearDamping(0.25),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.36, 0.36, 0.36).setMass(3).setFriction(0.75),
      body,
    );
    dynamics.push({ mesh, body });
  }
  for (let i = 0; i < 2; i++) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.33, 1),
      new THREE.MeshStandardMaterial({
        color: i ? '#d9994e' : '#f0deac',
        flatShading: true,
        roughness: 0.7,
      }),
    );
    mesh.castShadow = true;
    scene.add(mesh);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(-45 + i, 1, 46)
        .setLinearDamping(0.25),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.33).setMass(1.2).setFriction(0.7).setRestitution(0.55),
      body,
    );
    dynamics.push({ mesh, body });
  }
  makeBench(statics, -27, 55, 0.3);
  makeBench(statics, 63, 28, Math.PI / 2);
  // Soft distant terrain conceals the edge of the compact exploration area.
  for (let n = 0; n < 12; n++) {
    const hill = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 2),
      new THREE.MeshStandardMaterial({
        color: n % 2 ? '#759267' : '#6d8864',
        roughness: 1,
        flatShading: true,
      }),
    );
    hill.position.set(-315 + Math.sin(n) * 15, -3, -275 + n * 48);
    hill.scale.set(22, 8 + (n % 3) * 2, 28);
    statics.add(hill);
  }
  const life = createVillageLife(scene, world, statics);
  const venueLife = createVenueLife(scene);
  const roadside = createRoadside(scene, world, statics);
  bakeStatic(statics);
  const towerWindows = new Set<THREE.MeshStandardMaterial>();
  statics.traverse((o) => {
    if (o instanceof THREE.Mesh)
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m.name === 'tower:windows') towerWindows.add(m);
  });
  return {
    dynamics,
    markers,
    crocPosition,
    life,
    wildlife,
    roadside,
    setQuality(performance) {
      life.quality(performance);
      roadside.quality(performance);
      fronds.castShadow = trunks.castShadow = !performance;
      bushes.castShadow = !performance;
      rice.visible = !performance;
      egrets.forEach((e, i) => (e.visible = !performance || i < 2));
    },
    setRain(amount) {
      asphaltMaterial.roughness = 1 - amount * 0.57;
      asphaltMaterial.color.set('#48514b').lerp(new THREE.Color('#354742'), amount * 0.3);
    },
    setNight(amount) {
      night = amount;
      towerWindows.forEach((m) => (m.emissiveIntensity = amount * 0.25));
      waterMaterial.uniforms.night.value = amount;
      lamps.forEach((l) => (l.intensity = amount * 33));
      materials.lamp.emissiveIntensity = 0.55 + amount * 1.4;
    },
    feedCroc() {
      feed = 8;
      wildlife.hunt(0);
    },
    update(elapsed, dt, driver) {
      wind.value = elapsed;
      waterMaterial.uniforms.time.value = elapsed;
      feed = Math.max(0, feed - dt);
      wildlife.update(elapsed);
      life.update(elapsed);
      venueLife.update(elapsed);
      roadside.update(elapsed, dt, driver);
      waterMaterial.uniforms.croc.value.set(crocPosition.x, crocPosition.z);
      waterMaterial.uniforms.feed.value = feed > 0 ? 1 : 0;
      boat.position.y = Math.sin(elapsed * 0.64) * 0.033;
      boat.rotation.z = Math.sin(elapsed * 0.48) * 0.006;
      canoe.position.y = 0.035 + Math.sin(elapsed * 0.76) * 0.025;
      egrets.forEach((e, i) => (e.rotation.z = Math.sin(elapsed * 0.75 + i * 2) * 0.027));
      if (dome) dome.rotation.y = elapsed * 0.045;
      for (const marker of markers) {
        const near = driver ? Math.hypot(driver.x - marker.x, driver.z - marker.z) : Infinity;
        const scale = 1 + Math.max(0, 1 - near / 10) * 0.8;
        marker.mesh.scale.setScalar(
          THREE.MathUtils.lerp(marker.mesh.scale.x, scale, 1 - Math.exp(-dt * 8)),
        );
        (marker.mesh.material as THREE.MeshBasicMaterial).opacity = near < 6.5 ? 1 : 0.7;
      }
      if (night > 0.05) materials.glass.emissive.set('#ddae68').multiplyScalar(night * 0.08);
      else materials.glass.emissive.set(0);
    },
  };
}
