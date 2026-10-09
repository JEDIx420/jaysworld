import * as THREE from 'three';
import { makeCrocodile, materials } from './models';

export const CROC_NAMES = [
  'Kari · the big resident',
  'Muthu · the patient hunter',
  'Kunju · the youngster',
] as const;
export function createWildlife(scene: THREE.Scene) {
  const crocs = CROC_NAMES.map((name, i) => {
    const model = makeCrocodile();
    model.group.name = name;
    model.group.scale.setScalar([1.55, 1.3, 0.92][i]);
    scene.add(model.group);
    const fish = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 5), materials.cream);
    fish.scale.set(0.5, 0.7, 2.5);
    scene.add(fish);
    const splash = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 24),
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
    return { ...model, fish, splash, activity: 'Swimming', huntAt: -100, offset: i * 17 };
  });
  let clock = 0;
  return {
    crocs,
    position: (i: number) => crocs[i % crocs.length].group.position,
    activity: (i: number) => crocs[i % crocs.length].activity,
    hunt(i = 0) {
      crocs[i % crocs.length].huntAt = clock;
    },
    update(t: number) {
      clock = t;
      crocs.forEach((c, i) => {
        const phase = (t + c.offset) % 34;
        // Deterministic swim / submerge / surface / stalk / snap cycle.
        const huntTime = t - c.huntAt;
        const hunting = huntTime >= 0 && huntTime < 7;
        const attack = hunting ? huntTime : phase - 24;
        const stalking = attack >= 0 && attack < 4;
        const snapping = attack >= 4 && attack < 5.2;
        const submerged = !hunting && phase > 10 && phase < 17;
        const depth = submerged ? Math.sin(((phase - 10) / 7) * Math.PI) * 0.85 : 0;
        const nose = [2.6, 2.2, 1.55][i];
        const a = t * 0.055 + i * 2.1;
        const [cx, cz] = [
          [87, 12],
          [106, 28],
          [103, 53],
        ][i];
        c.group.position.set(
          cx + Math.sin(a) * (3 + i),
          0.018 - depth + Math.sin(t * 1.3 + i) * 0.018,
          cz + Math.cos(a) * (5 + i),
        );
        c.group.rotation.y = Math.atan2(-Math.cos(a) * (3 + i), Math.sin(a) * (5 + i));
        c.activity = submerged
          ? 'Submerged · watch for the eyes'
          : snapping
            ? 'Catching a fish'
            : stalking
              ? 'Stalking a fish'
              : phase < 20 && phase > 17
                ? 'Surfacing'
                : 'Swimming';
        c.jaw.rotation.x = snapping
          ? -Math.sin(((attack - 4) / 1.2) * Math.PI) * 0.65
          : stalking
            ? -0.1
            : 0;
        c.head.rotation.x = snapping ? -0.12 * Math.sin((attack - 4) * 5) : 0;
        c.tail.forEach(
          (tail, n) =>
            (tail.rotation.y =
              Math.sin(t * (snapping ? 3.7 : 1.3) - n * 0.65 + i) * (0.09 + n * 0.018)),
        );
        c.legs.forEach((leg, n) => {
          leg.rotation.y = Math.sin(t * 1.8 + n * Math.PI + i) * 0.25;
          leg.rotation.x = Math.cos(t * 1.8 + n * Math.PI) * 0.1;
        });
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          c.group.rotation.y,
        );
        c.fish.position
          .copy(c.group.position)
          .addScaledVector(forward, stalking ? nose + 2 - attack * 0.5 : nose);
        c.fish.position.y = 0.09 + Math.sin(t * 10) * 0.05;
        c.fish.rotation.y = t * 2;
        c.fish.visible = stalking || (snapping && attack < 4.35);
        const burst = snapping ? Math.sin(((attack - 4) / 1.2) * Math.PI) : 0;
        c.splash.position.copy(c.group.position).addScaledVector(forward, nose);
        c.splash.position.y = 0.062;
        c.splash.scale.setScalar(1 + burst * 4);
        (c.splash.material as THREE.MeshBasicMaterial).opacity = burst * 0.65;
      });
    },
  };
}
