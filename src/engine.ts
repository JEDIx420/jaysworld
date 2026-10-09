import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AutoVehicle, FIXED_STEP, WHEEL_POINTS } from './vehicle';
import { Input } from './input';
import { makeAuto } from './models';
import { createEnvironment } from './environment';
import { makePerson } from './village-life';
import { inWorld, waterAt, type Point } from './village';
import { drawVillageMap } from './map';
import { createSky, CONSTELLATIONS } from './sky';
import { CROC_NAMES } from './wildlife';
import { groundHeight } from './terrain';
import { shouldYield, safeTravel } from './safety';
import { PLACES, nearestPlace, type Place } from './projects';

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
  onAudio: (speed: number, paused: boolean, throttle: number, brake: boolean) => void;
  onView: (mode: ViewMode, title: string, detail: string) => void;
  onQuality: (performance: boolean) => void;
  interact: () => void;
  places: () => void;
  honk: () => void;
}
export type ViewMode = 'drive' | 'storefront' | 'croc' | 'stars';
export interface Journey {
  reset: (place?: Place) => void;
  pause: () => void;
  quality: (performance: boolean) => void;
  night: (enabled: boolean) => void;
  camera: (style?: 'close' | 'wide') => void;
  feedCroc: () => void;
  tourObservatory: () => void;
  visit: (place: Place) => void;
  leaveView: () => void;
  zoom: (delta: number) => void;
  selectCroc: (index: number) => void;
  hunt: () => void;
  constellation: (id: string) => void;
  setPassenger: (index: number, onboard: boolean) => void;
  setDuty: (enabled: boolean) => void;
  serve: (item: string) => void;
  route: (points: readonly Point[]) => void;
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
  scene.add(sun, sun.target);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 480);
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  const environment = createEnvironment(scene, world),
    vehicle = new AutoVehicle(world),
    auto = makeAuto();
  scene.add(auto.group);
  const sky = createSky(scene);
  const trail = new THREE.InstancedMesh(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, -0.6, -0.3, 0, 0.3, 0.3, 0, 0.3], 3),
    ),
    new THREE.MeshBasicMaterial({
      color: '#f2cf83',
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
    100,
  );
  trail.name = 'navigation:road-arrows';
  trail.count = 0;
  trail.frustumCulled = false;
  scene.add(trail);
  const routeDummy = new THREE.Object3D();
  const passenger = makePerson('#b97673', true);
  passenger.group.position.set(0.28, -0.3, 0.66);
  passenger.group.rotation.y = Math.PI;
  passenger.group.visible = false;
  auto.group.add(passenger.group);
  const previous = new THREE.Vector3().copy(vehicle.body.translation()),
    current = previous.clone(),
    previousQ = new THREE.Quaternion().copy(vehicle.body.rotation()),
    currentQ = previousQ.clone();
  const target = previous.clone(),
    desiredCamera = new THREE.Vector3();
  const map = document.getElementById('minimap') as HTMLCanvasElement;
  const atlas = document.getElementById('village-atlas') as HTMLCanvasElement;
  let cameraStyle: 'close' | 'wide' = 'close';
  let orbitYaw = -0.35,
    elevation = 0.36,
    distance = 13,
    frame = 0,
    lastRendered = 0,
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
    nightAmount = 0;
  let mode: ViewMode = 'drive',
    viewPlace: Place | undefined,
    crocIndex = 0,
    routePoints: readonly Point[] = [],
    manualCameraAt = 0,
    lastActivity = '';
  let throttle = 0,
    braking = false;
  const view = (next: ViewMode, title = '', detail = '') => {
    mode = next;
    input.clear();
    vehicle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    vehicle.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    options.onView(next, title, detail);
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resetCamera = (style = cameraStyle) => {
    cameraStyle = style;
    orbitYaw = new THREE.Euler().setFromQuaternion(currentQ, 'YXZ').y - 0.35;
    elevation = style === 'close' ? 0.36 : 0.61;
    distance = style === 'close' ? 13 : 25;
  };
  const reset = (place?: Place) => {
    if (mode !== 'drive') view('drive');
    vehicle.reset(place?.trigger.x, place?.trigger.z);
    input.clear();
    current.copy(vehicle.body.translation());
    previous.copy(current);
    currentQ.copy(vehicle.body.rotation());
    previousQ.copy(currentQ);
    target.copy(current);
    accumulator = 0;
    recoveryTimer = 0;
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
      elevation = THREE.MathUtils.clamp(
        elevation + y * 0.0035,
        mode === 'stars' ? 0.12 : 0.16,
        mode === 'stars' ? 1.5 : 1.15,
      );
      manualCameraAt = elapsed;
    },
    zoom: (delta) => zoom(delta),
  });
  const zoom = (delta: number) => {
    if (mode === 'stars') {
      camera.fov = THREE.MathUtils.clamp(camera.fov + delta * 0.025, 9, 60);
      camera.updateProjectionMatrix();
    } else
      distance = THREE.MathUtils.clamp(
        distance + delta * 0.02,
        mode === 'croc' ? 5 : mode === 'storefront' ? 7 : 8,
        mode === 'croc' ? 28 : 55,
      );
  };
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
  options.onProgress(0.92, 'Just a moment. The road is yours.');
  function render(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const visualDt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.5);
    const dt = Math.min(visualDt, 0.1);
    lastFrame = now;
    elapsed += visualDt;
    const inputPaused = options.isPaused() || document.hidden || contextLost;
    const paused = inputPaused || mode !== 'drive';
    input.paused = inputPaused;
    let yielding = false;
    const residents = [...environment.life.residents(), ...environment.roadside.residents()];
    if (!paused) {
      accumulator += dt;
      while (accumulator >= FIXED_STEP) {
        previous.copy(current);
        previousQ.copy(currentQ);
        const command = input.read();
        const velocity = vehicle.body.linvel();
        if (shouldYield(current, { x: velocity.x, z: velocity.z }, current.y, residents)) {
          command.brake = true;
          command.throttle = 0;
          yielding = true;
        }
        throttle = command.throttle;
        braking = command.brake;
        vehicle.beforeStep(command);
        world.step();
        current.copy(vehicle.body.translation());
        currentQ.copy(vehicle.body.rotation());
        const safe = safeTravel(previous, current, current.y, residents);
        if (safe < 1) {
          current.x = previous.x + (current.x - previous.x) * safe;
          current.z = previous.z + (current.z - previous.z) * safe;
          vehicle.body.setTranslation(current, true);
          vehicle.body.setLinvel({ x: 0, y: vehicle.body.linvel().y, z: 0 }, true);
          yielding = true;
        }
        if (!started && Math.abs(command.throttle) > 0.05) {
          started = true;
          options.onDrive();
        }
        const invalid =
          current.y < -3 || !inWorld(current.x, current.z) || waterAt(current.x, current.z);
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
    environment.update(reducedMotion && mode !== 'croc' ? 0 : elapsed, dt, current);
    nightAmount += (nightTarget - nightAmount) * (1 - Math.exp(-visualDt * 1.1));
    (scene.background as THREE.Color).copy(dayColor).lerp(nightColor, nightAmount);
    (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
    hemi.intensity = 2.2 - nightAmount * 1.9;
    sun.intensity = 3.2 - nightAmount * 2.98;
    sun.color.set('#ffe0a0').lerp(new THREE.Color('#82a2de'), nightAmount);

    environment.setNight(nightAmount);
    const vehicleYaw = new THREE.Euler().setFromQuaternion(currentQ, 'YXZ').y;
    if (mode === 'drive' && vehicle.speed > 1.3 && elapsed - manualCameraAt > 4) {
      const wanted = vehicleYaw - 0.28;
      orbitYaw +=
        Math.atan2(Math.sin(wanted - orbitYaw), Math.cos(wanted - orbitYaw)) *
        (1 - Math.exp(-dt * 1.6));
    }
    const focus =
      mode === 'croc'
        ? environment.wildlife.position(crocIndex)
        : mode === 'storefront' && viewPlace
          ? new THREE.Vector3(
              viewPlace.position.x,
              groundHeight(viewPlace.position.x, viewPlace.position.z) + 1.8,
              viewPlace.position.z,
            )
          : auto.group.position;
    target.lerp(focus, 1 - Math.exp(-dt * 5));
    if (mode === 'stars') {
      const p = PLACES.find((p) => p.id === 'space')!.position;
      desiredCamera.set(p.x, groundHeight(p.x, p.z) + 8, p.z);
      camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 6));
      const direction = sky.direction(orbitYaw, elevation, 1);
      camera.lookAt(camera.position.clone().add(direction));
    } else {
      camera.fov += (46 - camera.fov) * (1 - Math.exp(-dt * 5));
      camera.updateProjectionMatrix();
      desiredCamera.set(
        target.x + Math.sin(orbitYaw) * Math.cos(elevation) * distance,
        target.y + Math.sin(elevation) * distance,
        target.z + Math.cos(orbitYaw) * Math.cos(elevation) * distance,
      );
      desiredCamera.y = Math.max(
        desiredCamera.y,
        groundHeight(desiredCamera.x, desiredCamera.z) + 1.3,
      );
      if (camera.position.lengthSq() === 0) camera.position.copy(desiredCamera);
      else camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 4));
      camera.position.y = Math.max(
        camera.position.y,
        groundHeight(camera.position.x, camera.position.z) + 1.0,
      );
      camera.lookAt(target.x, target.y + 0.65, target.z);
    }
    sky.update(camera, nightAmount, mode === 'stars');
    sun.position.set(current.x - 42, current.y + 62, current.z + 33);
    sun.target.position.set(current.x, current.y, current.z);
    sun.target.updateMatrixWorld();
    if (mode === 'croc') {
      const activity = environment.wildlife.activity(crocIndex);
      if (activity !== lastActivity) {
        lastActivity = activity;
        options.onView(mode, CROC_NAMES[crocIndex], activity + ' · drag to look, scroll to zoom');
      }
    }
    const near = nearestPlace(current.x, current.z);
    options.onNear(mode === 'drive' && near && vehicle.speed < 4 ? near : undefined);
    uiTimer += dt;
    if (uiTimer > 0.1) {
      uiTimer = 0;
      const yaw = new THREE.Euler().setFromQuaternion(currentQ, 'YXZ').y;
      options.onTelemetry(vehicle.speed, current.x, current.z, yaw);
      drawVillageMap(map, current, yaw, routePoints);
      if ((atlas.closest('dialog') as HTMLDialogElement).open)
        drawVillageMap(atlas, current, yaw, routePoints, true);
      options.onAudio(vehicle.speed, paused, throttle, braking);
    }
    const reading = !!document.querySelector('dialog[open]');
    if (!contextLost && !document.hidden && (!reading || now - lastRendered > 350)) {
      lastRendered = now;
      renderer.render(scene, camera);
      canvas.dataset.rendered = 'true';
    }
    // Read-only diagnostics make meaningful end-to-end driving assertions possible.
    canvas.dataset.safety = yielding ? 'yielding' : 'clear';
    canvas.dataset.y = current.y.toFixed(3);
    canvas.dataset.elevation = groundHeight(current.x, current.z).toFixed(2);
    canvas.dataset.route = String(routePoints.length);
    canvas.dataset.x = current.x.toFixed(3);
    canvas.dataset.z = current.z.toFixed(3);
    canvas.dataset.speed = vehicle.speed.toFixed(3);
    canvas.dataset.yaw = vehicleYaw.toFixed(4);
    canvas.dataset.night = nightAmount.toFixed(3);
    canvas.dataset.view = mode;
    canvas.dataset.zoom = (mode === 'stars' ? camera.fov : distance).toFixed(2);
    canvas.dataset.croc = String(crocIndex);
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
    camera(style) {
      resetCamera(style);
    },
    visit(place) {
      viewPlace = place;
      view(
        'storefront',
        place.location,
        place.id === 'about'
          ? 'Park up. Earn a fare, buy a chaya, read a paper.'
          : 'A little place for a big idea. Read the paper or try the exhibit.',
      );
      orbitYaw = Math.atan2(place.trigger.x - place.position.x, place.trigger.z - place.position.z);
      elevation = 0.35;
      distance = 15;
    },
    leaveView() {
      view('drive');
      resetCamera();
    },
    zoom,
    selectCroc(index) {
      crocIndex = Math.max(0, Math.min(2, index));
      lastActivity = '';
    },
    hunt() {
      environment.wildlife.hunt(crocIndex);
    },
    feedCroc() {
      crocIndex = 0;
      view('croc', CROC_NAMES[0], 'Swimming · drag to look, scroll to zoom');
      orbitYaw = -1.1;
      elevation = 0.33;
      distance = 14;
    },
    tourObservatory() {
      nightTarget = 1;
      view(
        'stars',
        'A little closer to the stars',
        'Illustrated constellations · drag to explore, scroll to magnify',
      );
      orbitYaw = CONSTELLATIONS[0].yaw;
      elevation = CONSTELLATIONS[0].elevation;
      camera.fov = 52;
      camera.updateProjectionMatrix();
    },
    constellation(id) {
      const c = CONSTELLATIONS.find((c) => c.id === id);
      if (!c) return;
      orbitYaw = c.yaw;
      elevation = c.elevation;
      camera.fov = 34;
      camera.updateProjectionMatrix();
      options.onView('stars', c.name, c.detail);
    },
    setPassenger(index, onboard) {
      environment.life.setPassenger(index, onboard);
      passenger.group.visible = onboard;
    },
    setDuty(enabled) {
      environment.life.setDuty(enabled);
    },
    serve(item) {
      environment.life.serve(item);
    },
    route(points) {
      routePoints = points;
      let count = 0,
        travelled = 0;
      for (let i = 1; i < points.length && count < 100; i++) {
        const a = points[i - 1],
          b = points[i];
        travelled += Math.hypot(b.x - a.x, b.z - a.z);
        if (travelled < 9) continue;
        travelled = 0;
        routeDummy.position.set(b.x, groundHeight(b.x, b.z) + 0.14, b.z);
        routeDummy.rotation.set(0, Math.atan2(a.x - b.x, a.z - b.z), 0);
        routeDummy.scale.setScalar(1);
        routeDummy.updateMatrix();
        trail.setMatrixAt(count++, routeDummy.matrix);
      }
      trail.count = count;
      trail.instanceMatrix.needsUpdate = true;
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
