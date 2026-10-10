import * as THREE from 'three';
import { groundHeight } from './terrain';
import { roadClearance, waterAt } from './village';
import { makeBird } from './birds';
import { createClouds } from './clouds';
import { TOWER_ROOF } from './models';
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
  const clouds = createClouds(scene);
  const dummy = new THREE.Object3D();
  let count = small ? 300 : 720;
  const verts = new Float32Array(720 * 6);
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
  const birds = Array.from({ length: 8 }, (_, i) => {
    const bird = makeBird(i < 2);
    scene.add(bird.group);
    return bird;
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
    eagles: birds.slice(0, 2),
    setQuality(value: boolean) {
      count = value ? 300 : 720;
      rainGeometry.setDrawRange(0, count * 2);
      clouds.quality(value);
      birds.forEach((b, i) => {
        b.group.visible = i < (value ? 5 : 8);
      });
    },
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
      clouds.update(t, windAmount, rainAmount, clock.night, camera);
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
        const eagle = i < 2;
        const a = t * (eagle ? 0.09 - i * 0.02 : 0.07) + (eagle ? 4.9 - i * 1.05 : i * 2.1),
          cx = eagle ? -36 : i < 5 ? 35 : -150,
          cz = eagle ? -7 : i < 5 ? -185 : 80,
          r = eagle ? 12 + i * 8 : 16 + i * 2;
        b.group.position.set(
          cx + Math.sin(a) * r,
          (eagle ? groundHeight(-36, -7) + TOWER_ROOF + 3 + i * 3 : i < 5 ? 38 : 12) +
            Math.sin(a * 2) * 1.2,
          cz + Math.cos(a) * r,
        );
        b.group.rotation.y = Math.atan2(-Math.cos(a), Math.sin(a));
        b.group.rotation.z = Math.sin(a) * 0.12;
        const flap = eagle
          ? Math.pow(Math.max(0, Math.sin(t * 0.45 + i)), 8) * Math.sin(t * 4) * 0.28
          : Math.sin(t * 4 + i) * 0.3;
        b.wings.forEach((w, side) => (w.rotation.z = (-0.07 + flap) * (side ? -1 : 1)));
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
