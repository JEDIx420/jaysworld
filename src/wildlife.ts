import * as THREE from 'three';
import { makeCrocodile, materials } from './models';
export const CROC_NAMES = [
  'Kari · the big resident',
  'Muthu · the patient hunter',
  'Kunju · the youngster',
] as const;
const smooth = (n: number) => {
  const x = Math.max(0, Math.min(1, n));
  return x * x * (3 - 2 * x);
};
const angleMix = (a: number, b: number, n: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * n;
function makeFish() {
  const group = new THREE.Group(),
    skin = new THREE.MeshStandardMaterial({ color: '#99b6aa', roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
  body.scale.set(0.11, 0.16, 0.4);
  group.add(body);
  const tail = new THREE.Group();
  tail.position.z = 0.32;
  group.add(tail);
  const fin = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.2, 0.31, 0, -0.2, 0.31], 3),
  );
  fin.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({
    color: '#668e82',
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  tail.add(new THREE.Mesh(fin, fm));
  const dorsal = new THREE.Mesh(fin.clone(), fm);
  dorsal.rotation.x = -Math.PI / 2;
  dorsal.scale.setScalar(0.6);
  group.add(dorsal);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 5), materials.black);
    eye.position.set(side * 0.081, 0.045, -0.26);
    group.add(eye);
  }
  return { group, tail };
}
export function createWildlife(scene: THREE.Scene) {
  let clock = 0;
  const crocs = CROC_NAMES.map((name, i) => {
    const model = makeCrocodile();
    model.group.name = name;
    model.group.scale.setScalar([1.55, 1.3, 0.92][i]);
    scene.add(model.group);
    const prey = makeFish();
    scene.add(prey.group);
    const splash = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.38, 32),
      new THREE.MeshBasicMaterial({
        color: '#d6e5c6',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    splash.rotation.x = -Math.PI / 2;
    scene.add(splash);
    const wake = splash.clone();
    wake.material = splash.material.clone();
    scene.add(wake);
    return {
      ...model,
      fish: prey.group,
      fishTail: prey.tail,
      splash,
      wake,
      activity: 'Swimming',
      huntAt: -100,
      offset: i * 17,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      fishStart: new THREE.Vector3(),
      fishEnd: new THREE.Vector3(),
      startYaw: 0,
      endYaw: 0,
      lastPhase: -1,
    };
  });
  function hunt(i: number) {
    const c = crocs[i % 3];
    if (clock - c.huntAt < 9) return false;
    c.huntAt = clock;
    c.start.copy(c.group.position);
    c.startYaw = c.group.rotation.y;
    const f = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.startYaw),
      side = new THREE.Vector3(f.z, 0, -f.x),
      nose = 2.03 * c.group.scale.x;
    c.fishStart.copy(c.start).addScaledVector(f, nose + 2.8);
    c.fishStart.y = 0.06;
    c.fishEnd.copy(c.fishStart).addScaledVector(f, 1.1).addScaledVector(side, 0.7);
    const intercept = c.fishEnd.clone().sub(c.start);
    intercept.y = 0;
    intercept.normalize();
    c.end.copy(c.fishEnd).addScaledVector(intercept, -nose);
    c.end.y = 0.018;
    c.fishEnd.y = 0.018 + 0.07 * c.group.scale.x;
    c.endYaw = Math.atan2(-intercept.x, -intercept.z);
    return true;
  }
  return {
    crocs,
    position: (i: number) => crocs[i % 3].group.position,
    activity: (i: number) => crocs[i % 3].activity,
    hunt: (i = 0) => hunt(i),
    update(t: number) {
      clock = t;
      crocs.forEach((c, i) => {
        const phase = (t + c.offset) % 34;
        const a = t * 0.055 + i * 2.1,
          [cx, cz] = [
            [87, 12],
            [106, 28],
            [103, 53],
          ][i];
        const depth = phase > 10 && phase < 17 ? Math.sin(((phase - 10) / 7) * Math.PI) * 0.85 : 0;
        const idle = new THREE.Vector3(
          cx + Math.sin(a) * (3 + i),
          0.018 - depth + Math.sin(t * 1.3 + i) * 0.018,
          cz + Math.cos(a) * (5 + i),
        );
        const idleYaw = Math.atan2(-Math.cos(a) * (3 + i), Math.sin(a) * (5 + i));
        if (c.huntAt < 0) {
          c.group.position.copy(idle);
          c.group.rotation.y = idleYaw;
        }
        if (c.lastPhase >= 0 && c.lastPhase < 24 && phase >= 24) hunt(i);
        c.lastPhase = phase;
        const attack = t - c.huntAt,
          hunting = attack >= 0 && attack < 9,
          stalk = hunting && attack < 4,
          snap = hunting && attack >= 4 && attack < 5.2;
        if (hunting) {
          const advance =
            attack < 3 ? 0.12 * smooth(attack / 3) : 0.12 + 0.88 * smooth((attack - 3) / 1.35);
          c.group.position.lerpVectors(c.start, c.end, advance);
          c.group.position.y = 0.018 - Math.sin(Math.min(1, attack / 4) * Math.PI) * 0.09;
          c.group.rotation.y = angleMix(c.startYaw, c.endYaw, smooth(attack / 3));
          if (attack >= 5) {
            const recovery = smooth((attack - 5) / 4);
            c.group.position.lerpVectors(c.end, idle, recovery);
            c.group.rotation.y = angleMix(c.endYaw, idleYaw, recovery);
          }
        } else {
          c.group.position.copy(idle);
          c.group.rotation.y = idleYaw;
        }
        c.activity = stalk
          ? 'Stalking a fish'
          : snap
            ? 'Catching a fish'
            : hunting
              ? 'Swallowing · drifting back'
              : depth > 0.05
                ? 'Submerged · watch for the eyes'
                : phase > 17 && phase < 20
                  ? 'Surfacing'
                  : 'Swimming';
        const opening =
          attack >= 3.7 && attack < 4.35 ? Math.sin(((attack - 3.7) / 0.65) * Math.PI) : 0;
        c.jaw.rotation.x = -opening * 0.72;
        c.head.rotation.x = snap ? -0.06 * Math.sin((attack - 4) * 5) : 0;
        c.tail.forEach(
          (tail, n) =>
            (tail.rotation.y =
              Math.sin(t * (snap ? 4.8 : 1.35) - n * 0.75 + i) *
              (0.07 + n * 0.018) *
              (stalk ? 0.65 : 1)),
        );
        c.legs.forEach((leg, n) => {
          leg.rotation.y = Math.sin(t * (snap ? 3.2 : 1.4) + n * Math.PI + i) * 0.22;
          leg.rotation.x = Math.cos(t * 1.8 + n * Math.PI) * 0.09;
        });
        const preyProgress = smooth(attack / 4.35);
        const oldFish = c.fish.position.clone();
        c.fish.position.lerpVectors(c.fishStart, c.fishEnd, preyProgress);
        c.fish.position.y = 0.06 + Math.sin(t * 6) * 0.012;
        c.fish.rotation.y = Math.atan2(
          -(c.fishEnd.x - c.fishStart.x),
          -(c.fishEnd.z - c.fishStart.z),
        );
        c.fish.rotation.z = 0;
        c.fishTail.rotation.y = Math.sin(t * (attack > 3 ? 20 : 9)) * 0.4;
        c.fish.visible = hunting && attack < 4.5;
        if (hunting && attack >= 4.18 && attack < 4.5) {
          c.group.updateMatrixWorld(true);
          c.fish.position.lerp(
            c.head.localToWorld(new THREE.Vector3(0, -0.08, -1.08)),
            smooth((attack - 4.18) / 0.17),
          );
          c.fish.rotation.y = c.group.rotation.y;
        }
        const fishMove = c.fish.position.clone().sub(oldFish);
        if (hunting && attack < 4.35 && fishMove.lengthSq() > 0.00000001)
          c.fish.rotation.y = Math.atan2(-fishMove.x, -fishMove.z);
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          c.group.rotation.y,
        );
        const burst = snap ? smooth((attack - 4) / 0.3) * (1 - smooth((attack - 4.3) / 0.9)) : 0;
        c.splash.position.copy(c.group.position).addScaledVector(forward, 2.03 * c.group.scale.x);
        c.splash.position.y = 0.062;
        c.splash.scale.setScalar(1 + burst * 2.5);
        (c.splash.material as THREE.MeshBasicMaterial).opacity = burst * 0.48;
        c.wake.position.copy(c.group.position).addScaledVector(forward, -1.1);
        c.wake.position.y = 0.061;
        c.wake.scale.set(1.6, 2.4, 1);
        (c.wake.material as THREE.MeshBasicMaterial).opacity =
          depth > 0.2 ? 0 : stalk ? 0.08 : 0.18;
      });
    },
  };
}
