import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AutoVehicle, FIXED_STEP, WHEEL_POINTS } from './vehicle';
import { Input } from './input';
import { makeAuto } from './models';
import { createEnvironment, ROAD } from './environment';
import { nearestPlace, isWater, type Place } from './projects';

export interface JourneyOptions {
  canvas: HTMLCanvasElement;
  performance: boolean;
  isPaused: () => boolean;
  onProgress: (progress: number, text: string) => void;
  onTelemetry: (speed: number, x: number, z: number, yaw: number) => void;
  onNear: (place: Place | undefined) => void;
  onDrive: () => void;
  onRecover: (message: string) => void;
  onError: (message: string) => void;
  onAudio: (speed: number, paused: boolean) => void;
  onQuality: (performance: boolean) => void;
  interact: () => void;
  places: () => void;
  honk: () => void;
}
export interface Journey {
  reset: (place?: Place) => void;
  pause: () => void;
  quality: (performance: boolean) => void;
  night: (enabled: boolean) => void;
  camera: () => void;
  feedCroc: () => void;
  tourObservatory: () => void;
  dispose: () => void;
}

export async function createJourney(options: JourneyOptions): Promise<Journey> {
  const canvas = options.canvas;
  options.onProgress(0.3, 'Getting the wheels ready…');
  await RAPIER.init();
  options.onProgress(0.55, 'Opening the village…');
  // Load the local Malayalam subset before drawing the tea-shop sign to canvas.
  await document.fonts.load('400 16px "Noto Sans Malayalam"', 'ചായ').catch(() => []);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !options.performance,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(),
    dayColor = new THREE.Color('#c4d1aa'),
    nightColor = new THREE.Color('#12283c');
  scene.background = dayColor.clone();
  scene.fog = new THREE.Fog(dayColor, 95, 245);
  const hemi = new THREE.HemisphereLight('#fff0c5', '#526d3b', 2.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe0a0', 3.2);
  sun.position.set(-42, 62, 33);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -87;
  sun.shadow.camera.right = 87;
  sun.shadow.camera.top = 87;
  sun.shadow.camera.bottom = -87;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  sun.shadow.normalBias = 0.075;
  sun.shadow.bias = -0.00015;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 460);
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  const environment = createEnvironment(scene, world),
    vehicle = new AutoVehicle(world),
    auto = makeAuto();
  scene.add(auto.group);
  // Stars are a lightweight part of the evening scene, not a separate game.
  const stars: number[] = [];
  let seed = 734;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 380; i++) {
    const angle = rng() * Math.PI * 2,
      elevation = 0.25 + rng() * 1.2,
      radius = 180 + rng() * 45;
    stars.push(
      Math.cos(angle) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      Math.sin(angle) * Math.cos(elevation) * radius,
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#f5e7c8',
    size: 0.7,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  scene.add(new THREE.Points(starGeometry, starMat));
  const previous = new THREE.Vector3().copy(vehicle.body.translation()),
    current = previous.clone(),
    previousQ = new THREE.Quaternion().copy(vehicle.body.rotation()),
    currentQ = previousQ.clone();
  const target = previous.clone(),
    desiredCamera = new THREE.Vector3(),
    roadPoints = ROAD.getSpacedPoints(120);
  const map = document.getElementById('minimap') as HTMLCanvasElement,
    ctx = map.getContext('2d')!;
  let orbitYaw = -0.9,
    elevation = 0.74,
    distance = 40,
    frame = 0,
    lastFrame = performance.now(),
    accumulator = 0,
    elapsed = 0,
    uiTimer = 0,
    recoveryTimer = 0,
    disposed = false,
    contextLost = false,
    started = false;
  const gl = renderer.getContext(),
    debug = gl.getExtension('WEBGL_debug_renderer_info');
  const software = debug
    ? /swiftshader|llvmpipe|lavapipe|software/i.test(
        String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
      )
    : false;
  let performanceMode = options.performance || software,
    nightTarget = 0,
    nightAmount = 0,
    lookTimer = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resetCamera = () => {
    orbitYaw = -0.9;
    elevation = 0.74;
    distance = 40;
    lookTimer = 0;
  };
  const reset = (place?: Place) => {
    vehicle.reset(place?.trigger.x, place?.trigger.z);
    input.clear();
    current.copy(vehicle.body.translation());
    previous.copy(current);
    currentQ.copy(vehicle.body.rotation());
    previousQ.copy(currentQ);
    target.copy(current);
    accumulator = 0;
    recoveryTimer = 0;
    lookTimer = 0;
  };
  const input = new Input(canvas, {
    interact: options.interact,
    places: options.places,
    honk: options.honk,
    reset: () => {
      reset();
      options.onRecover('Back at the tea shop.');
    },
    orbit: (x, y) => {
      orbitYaw -= x * 0.005;
      elevation = THREE.MathUtils.clamp(elevation + y * 0.0035, 0.37, 1.15);
      lookTimer = 0;
    },
    zoom: (delta) => {
      distance = THREE.MathUtils.clamp(distance + delta * 0.02, 22, 63);
    },
  });
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  };
  const quality = (value: boolean) => {
    performanceMode = value;
    renderer.setPixelRatio(Math.min(devicePixelRatio, value ? 1 : 1.5));
    renderer.shadowMap.enabled = !value;
    environment.setQuality(value);
    options.onQuality(value);
    resize();
  };
  quality(performanceMode);
  window.addEventListener('resize', resize);
  const loseContext = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    input.clear();
    options.onError('The scene paused. You can browse Places, or reload to resume the drive.');
  };
  canvas.addEventListener('webglcontextlost', loseContext);
  const drawMap = (x: number, z: number, yaw: number) => {
    const size = map.width,
      s = size / 210,
      px = (v: number) => size / 2 + (v + 6) * s,
      pz = (v: number) => size / 2 + (v - 4) * s;
    ctx.fillStyle = '#173a32';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#28524a';
    ctx.fillRect(px(76), 0, size, size);
    ctx.fillRect(px(19), pz(3), 71 * s, 10 * s);
    ctx.strokeStyle = '#8da17a';
    ctx.lineWidth = 3.7;
    ctx.beginPath();
    roadPoints.forEach((p, i) => {
      if (i) ctx.lineTo(px(p.x), pz(p.z));
      else ctx.moveTo(px(p.x), pz(p.z));
    });
    ctx.closePath();
    ctx.stroke();
    for (const place of PLACES_FOR_MAP) {
      ctx.fillStyle = place.id === 'saltwater' ? '#b2c5aa' : '#e4bd76';
      ctx.beginPath();
      ctx.arc(px(place.x), pz(place.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(px(x), pz(z));
    ctx.rotate(-yaw);
    ctx.fillStyle = '#fff5db';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#a8bba5';
    ctx.font = '10px sans-serif';
    ctx.fillText('N', 11, 17);
    ctx.strokeStyle = '#a8bba5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 34);
    ctx.lineTo(14, 23);
    ctx.stroke();
  };
  const PLACES_FOR_MAP = environment.markers.map((m, i) => ({
    id: i === 5 ? 'saltwater' : 'place',
    x: m.x,
    z: m.z,
  }));
  drawMap(current.x, current.z, 0);
  options.onProgress(0.92, 'Just a moment. The road is yours.');
  function render(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const visualDt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.5);
    const dt = Math.min(visualDt, 0.1);
    lastFrame = now;
    elapsed += visualDt;
    const paused = options.isPaused() || document.hidden || contextLost;
    input.paused = paused;
    if (!paused) {
      accumulator += dt;
      while (accumulator >= FIXED_STEP) {
        previous.copy(current);
        previousQ.copy(currentQ);
        const command = input.read();
        vehicle.beforeStep(command);
        world.step();
        current.copy(vehicle.body.translation());
        currentQ.copy(vehicle.body.rotation());
        if (!started && Math.abs(command.throttle) > 0.05) {
          started = true;
          options.onDrive();
        }
        const invalid =
          current.y < -3 ||
          Math.abs(current.x) > 133 ||
          Math.abs(current.z) > 133 ||
          isWater(current.x, current.z);
        recoveryTimer = vehicle.isOverturned() ? recoveryTimer + FIXED_STEP : 0;
        if (invalid || recoveryTimer > 2.3) {
          reset();
          options.onRecover(invalid ? 'Back on dry land.' : 'The auto is back on its wheels.');
        }
        accumulator = Math.max(0, accumulator - FIXED_STEP);
      }
    } else {
      accumulator = 0;
      current.copy(vehicle.body.translation());
      previous.copy(current);
      currentQ.copy(vehicle.body.rotation());
      previousQ.copy(currentQ);
    }
    auto.group.position.lerpVectors(previous, current, paused ? 1 : accumulator / FIXED_STEP);
    auto.group.quaternion.slerpQuaternions(
      previousQ,
      currentQ,
      paused ? 1 : accumulator / FIXED_STEP,
    );
    for (let i = 0; i < 3; i++) {
      const p = WHEEL_POINTS[i],
        length = vehicle.controller.wheelSuspensionLength(i) ?? 0.3;
      auto.wheels[i].position.set(p.x, p.y - length, p.z);
      auto.wheels[i].rotation.y = i === 0 ? (vehicle.controller.wheelSteering(0) ?? 0) : 0;
      auto.spinners[i].rotation.x = vehicle.controller.wheelRotation(i) ?? 0;
    }
    for (const item of environment.dynamics) {
      item.mesh.position.copy(item.body.translation());
      item.mesh.quaternion.copy(item.body.rotation());
    }
    environment.update(reducedMotion ? 0 : elapsed, dt);
    nightAmount += (nightTarget - nightAmount) * (1 - Math.exp(-visualDt * 1.1));
    (scene.background as THREE.Color).copy(dayColor).lerp(nightColor, nightAmount);
    (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
    hemi.intensity = 2.2 - nightAmount * 1.9;
    sun.intensity = 3.2 - nightAmount * 2.98;
    sun.color.set('#ffe0a0').lerp(new THREE.Color('#82a2de'), nightAmount);
    starMat.opacity = nightAmount;
    environment.setNight(nightAmount);
    lookTimer = Math.max(0, lookTimer - dt);
    const focus =
      lookTimer > 0
        ? new THREE.Vector3(environment.crocPosition.x, 0.3, environment.crocPosition.z)
        : auto.group.position;
    target.lerp(focus, 1 - Math.exp(-5 * dt));
    desiredCamera.set(
      target.x + Math.sin(orbitYaw) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance,
      target.z + Math.cos(orbitYaw) * Math.cos(elevation) * distance,
    );
    if (camera.position.lengthSq() === 0) camera.position.copy(desiredCamera);
    else camera.position.lerp(desiredCamera, 1 - Math.exp(-4 * dt));
    camera.lookAt(target.x, target.y + 0.5, target.z);
    const near = nearestPlace(current.x, current.z);
    options.onNear(near && vehicle.speed < 4 ? near : undefined);
    uiTimer += dt;
    if (uiTimer > 0.1) {
      uiTimer = 0;
      const yaw = new THREE.Euler().setFromQuaternion(currentQ, 'YXZ').y;
      options.onTelemetry(vehicle.speed, current.x, current.z, yaw);
      drawMap(current.x, current.z, yaw);
      options.onAudio(vehicle.speed, paused);
    }
    if (!contextLost) {
      renderer.render(scene, camera);
      canvas.dataset.rendered = 'true';
    }
    // Read-only diagnostics make meaningful end-to-end driving assertions possible.
    canvas.dataset.x = current.x.toFixed(3);
    canvas.dataset.z = current.z.toFixed(3);
    canvas.dataset.speed = vehicle.speed.toFixed(3);
    canvas.dataset.night = nightAmount.toFixed(3);
  }
  frame = requestAnimationFrame(render);
  canvas.dataset.ready = 'true';
  return {
    reset,
    pause() {
      input.clear();
      input.paused = options.isPaused();
      accumulator = 0;
      lastFrame = performance.now();
    },
    quality,
    night(enabled) {
      nightTarget = enabled ? 1 : 0;
    },
    camera: resetCamera,
    feedCroc() {
      environment.feedCroc();
      lookTimer = 7;
      options.onRecover('A visitor at the jetty.');
    },
    tourObservatory() {
      nightTarget = 1;
      resetCamera();
      elevation = 0.46;
      distance = 28;
      options.onRecover('Look up. The village has a different rhythm at night.');
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      input.dispose();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', loseContext);
      world.free();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
