import * as THREE from 'three';
import { groundHeight } from './terrain';
import { roadClearance, waterAt } from './village';
export type WeatherKind = 'clear' | 'haze' | 'wind' | 'rain';
export function nightAt(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  return h < 5 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h < 17 ? 0 : h < 19 ? (h - 17) / 2 : 1;
}
export class TownClock {
  elapsed = 0;
  private hourOverride?: number;
  private weatherOverride?: WeatherKind;
  update(dt: number) {
    this.elapsed += Math.max(0, Math.min(dt, 0.5));
  }
  setHour(hour?: number) {
    this.hourOverride = hour;
  }
  setWeather(kind?: WeatherKind) {
    this.weatherOverride = kind;
  }
  get hour() {
    return this.hourOverride ?? (16.5 + this.elapsed / 60) % 24;
  }
  get night() {
    return nightAt(this.hour);
  }
  get season() {
    return Math.floor(this.elapsed / 600) % 2 ? 'Monsoon' : 'Dry season';
  }
  get weather(): WeatherKind {
    if (this.weatherOverride) return this.weatherOverride;
    const t = this.elapsed % 300;
    return t < 60 ? 'clear' : t < 110 ? 'haze' : t < 170 ? 'wind' : t < 250 ? 'rain' : 'clear';
  }
}
export function createWeather(scene: THREE.Scene, small: boolean) {
  const clock = new TownClock();
  let rainAmount = 0,
    hazeAmount = 0,
    windAmount = 0.2;
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: '#e7e9d5',
    roughness: 1,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), cloudMaterial, 96);
  clouds.frustumCulled = false;
  scene.add(clouds);
  const dummy = new THREE.Object3D();
  const count = small ? 300 : 720,
    verts = new Float32Array(count * 6);
  const rainGeometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(verts, 3),
  );
  const rainMaterial = new THREE.LineBasicMaterial({
    color: '#d8e9d9',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  scene.add(rain);
  const dustMaterial = new THREE.PointsMaterial({
    color: '#c6ab77',
    size: 0.13,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const dustPositions = new Float32Array(96 * 3);
  const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(dustPositions, 3),
    ),
    dustMaterial,
  );
  dust.frustumCulled = false;
  scene.add(dust);
  const birds = Array.from({ length: small ? 7 : 14 }, (_, i) => {
    const group = new THREE.Group(),
      material = new THREE.MeshStandardMaterial({
        color: i % 3 ? '#e4dcc3' : '#354b3f',
        roughness: 1,
      });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 5), material);
    body.scale.set(0.7, 0.65, 2.2);
    group.add(body);
    const wings = [-1, 1].map((side) => {
      const pivot = new THREE.Group(),
        g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [0, 0, -0.15, side * 0.7, 0, 0.08, side * 0.42, 0, 0.35, 0, 0, 0.17],
          3,
        ),
      );
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      const mat = material.clone();
      mat.side = THREE.DoubleSide;
      const wing = new THREE.Mesh(g, mat);
      pivot.add(wing);
      group.add(pivot);
      return pivot;
    });
    scene.add(group);
    return { group, wings };
  });
  // Low flowers and shrub clusters use one draw call and keep all roads clear.
  const flowers = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({ color: '#caa17b', roughness: 1 }),
    240,
  );
  let n = 0;
  for (let i = 0; i < 900 && n < 240; i++) {
    const x = -280 + ((i * 57.37) % 380),
      z = -230 + ((i * 81.83) % 470);
    if (waterAt(x, z) || roadClearance(x, z) < 2.3) continue;
    dummy.position.set(x, groundHeight(x, z) + 0.21, z);
    dummy.scale.set(0.7, 1.7, 0.7);
    dummy.rotation.y = i;
    dummy.updateMatrix();
    flowers.setMatrixAt(n++, dummy.matrix);
  }
  flowers.count = n;
  scene.add(flowers);
  return {
    clock,
    get rain() {
      return rainAmount;
    },
    get wind() {
      return windAmount;
    },
    update(dt: number, camera: THREE.Camera) {
      clock.update(dt);
      const t = clock.elapsed,
        k = clock.weather;
      const blend = 1 - Math.exp(-dt * 0.3);
      rainAmount += ((k === 'rain' ? 1 : 0) - rainAmount) * blend;
      hazeAmount += ((k === 'haze' ? 0.65 : k === 'rain' ? 0.3 : 0) - hazeAmount) * blend;
      windAmount += ((k === 'wind' ? 1 : k === 'rain' ? 0.7 : 0.2) - windAmount) * blend;
      clouds.visible = true;
      cloudMaterial.color
        .set('#e8e7cf')
        .lerp(new THREE.Color('#738991'), rainAmount * 0.7 + clock.night * 0.6);
      for (let i = 0; i < 96; i++) {
        const cluster = Math.floor(i / 8),
          part = i % 8;
        dummy.position.set(
          -280 + (cluster % 4) * 130 + Math.sin(part * 2) * 13 + ((t * windAmount * 0.7) % 90),
          80 + Math.floor(cluster / 4) * 18 + Math.sin(part) * 4,
          -200 + Math.floor(cluster / 4) * 190 + Math.cos(part * 2) * 12,
        );
        dummy.scale.set(9 + (part % 3) * 3, 3.8 + (part % 2), 8 + (part % 4));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        clouds.setMatrixAt(i, dummy.matrix);
      }
      clouds.instanceMatrix.needsUpdate = true;
      rain.visible = rainAmount > 0.02;
      rainMaterial.opacity = rainAmount * 0.35;
      if (rain.visible)
        for (let i = 0; i < count; i++) {
          const x = camera.position.x + ((i * 17.17 + t * windAmount * 4) % 42) - 21,
            z = camera.position.z + ((i * 23.91) % 42) - 21;
          const floor = groundHeight(x, z),
            y = floor + 1 + ((((i * 5.77 - t * 16) % 24) + 24) % 24);
          verts.set([x, y, z, x - 0.45 * windAmount, y + 0.85, z + 0.13], i * 6);
        }
      rainGeometry.attributes.position.needsUpdate = rain.visible;
      dust.visible = k === 'wind' || hazeAmount > 0.15;
      dustMaterial.opacity = (windAmount * 0.11 + hazeAmount * 0.13) * (1 - rainAmount);
      if (dust.visible)
        for (let i = 0; i < 96; i++) {
          const x = camera.position.x + ((i * 11.19 + t * 3) % 45) - 22,
            z = camera.position.z + ((i * 9.39) % 45) - 22;
          dustPositions.set([x, groundHeight(x, z) + 0.5 + ((i * 1.41) % 3), z], i * 3);
        }
      dust.geometry.attributes.position.needsUpdate = dust.visible;
      birds.forEach((b, i) => {
        const a = t * (0.06 + i * 0.001) + i * 0.7,
          cx = i < 5 ? -36 : i < 9 ? 35 : -150,
          cz = i < 5 ? -7 : i < 9 ? -185 : 80,
          r = 11 + i * 1.5;
        b.group.position.set(
          cx + Math.sin(a) * r,
          (i < 5 ? 31 : i < 9 ? 31 : 12) + Math.sin(a * 2) * 2,
          cz + Math.cos(a) * r,
        );
        b.group.rotation.y = Math.atan2(-Math.cos(a), Math.sin(a));
        b.group.rotation.z = Math.sin(a) * 0.12;
        b.wings.forEach((w, side) => (w.rotation.z = Math.sin(t * 5 + i) * 0.45 * (side ? -1 : 1)));
      });
      return {
        night: clock.night,
        rain: rainAmount,
        haze: hazeAmount,
        wind: windAmount,
        hour: clock.hour,
        weather: k,
        season: clock.season,
      };
    },
  };
}
