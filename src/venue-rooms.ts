import * as THREE from 'three';
import { box, cylinder, tube, bakeStatic } from './models';
import { makePerson, animatePerson } from './village-life';
import type { PlaceId } from './projects';
import { VENUE_PAGES } from './venue-content';

type Room = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  screen: THREE.Mesh;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  animate: (time: number) => void;
};
const paint = (color: string, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.35 : 0.8, metalness });

/** Interiors use the existing renderer. No second canvas, physics world or asset download. */
export function createVenueRooms() {
  const rooms = new Map<PlaceId, Room>();
  let active: PlaceId | undefined,
    page = 0,
    progress = 0;
  function build(id: PlaceId): Room {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(id === 'space' ? '#101e2e' : '#313c35');
    const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100);
    const wood = paint('#6c492f'),
      dark = paint('#263836'),
      cream = paint('#e7dcc2'),
      steel = paint('#899d99', 0.65),
      green = paint('#467451'),
      amber = paint('#dbad64');
    const office = id === 'eagle-eye' || id === 'opsflash',
      studio = id === 'music',
      tea = id === 'about',
      wetland = id === 'saltwater';
    const floor = paint(
      id === 'space' ? '#263b48' : office ? '#56675e' : studio ? '#584538' : '#906846',
    );
    box(scene, [18, 0.16, 20], [0, -0.1, 0], floor);
    box(
      scene,
      [18, 7, 0.2],
      [0, 3.4, -6.6],
      office
        ? paint('#becbc5')
        : studio
          ? paint('#343c3d')
          : id === 'space'
            ? paint('#293e4a')
            : paint('#bcb08b'),
    );
    box(scene, [0.2, 7, 14], [-8.5, 3.4, 0], tea || wetland ? wood : cream);
    scene.add(new THREE.HemisphereLight(id === 'space' ? '#98b8d1' : '#fff0d8', '#334b46', 2.1));
    const key = new THREE.DirectionalLight(
      id === 'space' ? '#aecbe7' : office ? '#edf6ee' : '#ffdca1',
      3,
    );
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -12,
      right: 12,
      top: 12,
      bottom: -12,
      near: 0.5,
      far: 40,
    });
    key.shadow.normalBias = 0.045;
    scene.add(key);
    const warm = new THREE.PointLight('#ffc071', id === 'space' ? 6 : 22, 16, 2);
    warm.position.set(-3, 4.8, 0);
    scene.add(warm);
    // An open window looks out over Kerala: paddy, palms, cloud bands and ridge silhouettes.
    const outside = new THREE.Group();
    outside.position.set(8.8, 0, -1.5);
    scene.add(outside);
    box(outside, [0.1, 9, 24], [2, 3.7, -2], paint('#a6c6ba'));
    box(outside, [5, 0.2, 24], [0, 0.02, -2], green);
    for (let i = 0; i < 5; i++) {
      const tree = new THREE.Group();
      tree.position.set(1.1, 0.1, -7 + i * 3.4);
      outside.add(tree);
      cylinder(tree, 0.12, 0.24, 4, [0, 2, 0], wood, 7);
      for (let n = 0; n < 6; n++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), green);
        leaf.scale.set(1.7, 0.12, 0.4);
        leaf.position.set(Math.cos(n) * 0.8, 4, Math.sin(n) * 0.8);
        leaf.rotation.y = -n;
        tree.add(leaf);
      }
    }
    for (const z of [-5, -1, 3]) {
      box(scene, [0.14, 6, 0.14], [8.1, 3, z], office ? steel : wood);
      box(scene, [0.14, 0.14, 4], [8.1, 1.1, z + 1], office ? steel : wood);
      box(scene, [0.14, 0.14, 4], [8.1, 5.5, z + 1], office ? steel : wood);
    }
    if (office) {
      // Glass and steel briefing room; OpsFlash gets a more domestic timber office.
      for (const x of [-7, -4, 0, 4, 7])
        box(scene, [0.06, 6, 0.1], [x, 3, -6.4], id === 'eagle-eye' ? steel : wood);
      const glass = new THREE.MeshStandardMaterial({
        color: '#a2c5bf',
        transparent: true,
        opacity: 0.13,
        roughness: 0.2,
      });
      box(scene, [0.04, 4.4, 10], [8.05, 3.2, -0.5], glass);
      const table = box(
        scene,
        [6.8, 0.22, 3.2],
        [-0.8, 1.2, 1.4],
        id === 'eagle-eye' ? dark : wood,
      );
      for (const x of [-3.8, 2.2])
        for (const z of [0.2, 2.5]) box(scene, [0.15, 1.2, 0.15], [x, 0.6, z], steel);
      for (const [x, z] of [
        [-4.6, 0.3],
        [-4.6, 2.1],
        [3.2, 0.3],
        [3.2, 2.1],
        [-1, 3.8],
      ]) {
        box(scene, [0.9, 0.13, 0.9], [x, 0.6, z], dark);
        box(scene, [0.9, 1, 0.16], [x, 1.05, z + 0.4], dark);
        cylinder(scene, 0.05, 0.05, 0.65, [x, 0.32, z], steel, 7);
      }
      for (let i = 0; i < 3; i++) {
        box(scene, [0.9, 0.035, 0.6], [-2.2 + i * 1.5, 1.34, 1.7], cream);
        cylinder(scene, 0.13, 0.13, 0.22, [-2.7 + i * 1.5, 1.44, 0.7], cream, 12);
      }
      box(scene, [1, 0.14, 0.65], [-0.8, 1.4, 1], steel);
      box(scene, [0.65, 0.02, 0.38], [-0.8, 1.48, 1], dark);
      table.name = 'conference-table';
      if (id === 'opsflash')
        for (const x of [-6, 5.6])
          for (let n = 0; n < 3; n++)
            box(scene, [1.1, 0.25, 0.8], [x, 0.5 + n * 0.45, -5.4], steel);
    } else if (studio) {
      for (let i = 0; i < 10; i++)
        for (let n = 0; n < 5; n++)
          box(
            scene,
            [0.95, 0.55, 0.24],
            [-7.1 + i * 1.5, 1.2 + n * 0.9, -6.3],
            (i + n) % 2 ? dark : paint('#66534a'),
          );
      for (const x of [-4.9, 4.9]) {
        box(scene, [1.7, 3, 1.1], [x, 2, -4.8], dark);
        for (const y of [1.3, 2.5]) {
          const speaker = cylinder(scene, 0.55, 0.55, 0.12, [x, y, -4.17], paint('#191f21'), 24);
          speaker.rotation.x = Math.PI / 2;
        }
      }
      box(scene, [7, 0.28, 3.5], [0, 1.1, 1.3], wood);
      box(scene, [5.8, 0.18, 2.3], [0, 1.35, 1], steel);
      for (let i = 0; i < 18; i++)
        for (let r = 0; r < 3; r++)
          cylinder(
            scene,
            0.055,
            0.055,
            0.06,
            [-2.5 + i * 0.29, 1.49, 0.3 + r * 0.4],
            r % 2 ? amber : dark,
            8,
          );
      for (const x of [-5.8, 5.8]) {
        cylinder(scene, 0.045, 0.045, 2.2, [x, 1.1, -0.6], steel, 8);
        box(scene, [0.12, 0.35, 0.14], [x, 2.3, -0.6], dark);
      }
      for (let i = 0; i < 5; i++) {
        const disc = cylinder(scene, 0.5, 0.5, 0.04, [-6.3 + i * 3.1, 5.9, -6.3], dark, 24);
        disc.rotation.x = Math.PI / 2;
      }
    } else if (tea) {
      box(scene, [11, 0.24, 1.8], [-1, 1, -4.4], wood);
      box(scene, [5, 0.14, 2.8], [0, 0.93, 1.2], wood);
      for (const x of [-2, 2])
        for (const z of [0.1, 2.3]) box(scene, [0.12, 0.95, 0.12], [x, 0.45, z], wood);
      const stove = box(scene, [1.6, 0.9, 1.4], [-4, 0.45, -4.3], dark);
      cylinder(stove, 0.45, 0.45, 0.06, [0, 0.49, 0], steel, 20);
      cylinder(scene, 0.4, 0.5, 0.55, [-4, 1.2, -4.3], steel, 20);
      cylinder(scene, 0.5, 0.5, 0.1, [-4, 1.51, -4.3], steel, 20);
      const handle = box(scene, [0.15, 0.28, 0.15], [-4, 1.65, -4.3], dark);
      handle.name = 'kettle-handle';
      for (let i = 0; i < 8; i++)
        cylinder(scene, 0.12, 0.09, 0.28, [-1.6 + i * 0.45, 1.27, -3.9], cream, 12);
      for (let i = 0; i < 6; i++)
        box(scene, [0.27, 0.15, 0.52], [2.8 + i * 0.22, 1.2, -4], amber).rotation.y = i * 0.5;
      for (let i = 0; i < 6; i++) box(scene, [0.8, 0.12, 1], [-6.9, 1.2 + i * 0.55, -5.5], wood);
      box(scene, [1.2, 4.2, 0.15], [5.5, 2.2, -6.4], paint('#254e43'));
    } else if (id === 'space') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#263747', side: THREE.BackSide }),
      );
      scene.add(dome);
      for (let n = 0; n < 12; n++) {
        const a = (n * Math.PI) / 6;
        if (Math.sin(a) > 0.15) continue;
        tube(
          scene,
          [
            [Math.cos(a) * 9, 0, Math.sin(a) * 9],
            [Math.cos(a) * 6, 6.5, Math.sin(a) * 6],
            [0, 10, 0],
          ],
          0.04,
          steel,
        );
      }
      const scope = new THREE.Group();
      scope.position.set(-1.8, 1.8, 1);
      scope.rotation.x = -0.65;
      scene.add(scope);
      const barrel = cylinder(scope, 0.35, 0.4, 3, [0, 0, 0], cream, 20);
      barrel.rotation.x = Math.PI / 2;
      cylinder(scene, 0.14, 0.32, 1.8, [-1.8, 0.9, 1], steel, 12);
      for (const x of [-0.6, 0.6])
        tube(
          scene,
          [
            [-1.8, 1.2, 1],
            [-1.8 + x, 0, 1.8],
          ],
          0.07,
          steel,
        );
      const nightLamp = new THREE.PointLight('#ef854e', 12, 15);
      nightLamp.position.set(-5, 3, 0);
      scene.add(nightLamp);
    } else if (wetland) {
      scene.background = new THREE.Color('#a7c3b3');
      for (let i = 0; i < 22; i++) box(scene, [17, 0.08, 0.48], [0, 0.02, -5 + i * 0.55], wood);
      for (const x of [-7.7, 7.7])
        for (const z of [-5, -1, 3]) {
          cylinder(scene, 0.1, 0.12, 1.2, [x, 0.6, z], wood, 8);
          tube(
            scene,
            [
              [x, 1.15, z],
              [x, 1.1, z + 4],
            ],
            0.04,
            wood,
          );
        }
      box(scene, [3.5, 0.15, 2.5], [0, 1, 1.3], wood);
      box(scene, [80, 0.05, 80], [0, -0.2, -35], paint('#548879'));
      for (let i = 0; i < 12; i++)
        box(scene, [1 + (i % 3), 0.025, 0.03], [-6 + i * 1.5, -0.12, -8 - i * 0.7], cream);
    } else {
      box(scene, [6, 0.2, 2.8], [0, 1, 1.3], wood);
      for (const x of [-5.7, 5.7]) {
        box(scene, [2, 3.5, 1.2], [x, 1.9, -4.8], steel);
        for (let n = 0; n < 4; n++) box(scene, [1.5, 0.1, 1], [x, 0.6 + n * 0.85, -4.4], wood);
      }
      for (let i = 0; i < 8; i++) box(scene, [0.35, 0.25, 0.6], [-4 + i * 0.7, 1.25, -4.2], amber);
    }
    // A separate physical display for every room, including a printed sheet at the tea table.
    const board = box(
      scene,
      [7.3, 4.22, 0.18],
      [-0.4, 3.4, -6.22],
      office ? dark : tea ? wood : id === 'space' ? steel : dark,
    );
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 3.94),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    screen.position.set(-0.4, 3.4, -6.11);
    scene.add(screen);
    if (tea) {
      board.position.set(0, 1.14, 1);
      board.rotation.x = -1.04;
      screen.position.set(0, 1.25, 1.04);
      screen.rotation.x = -1.04;
      board.scale.set(0.72, 0.72, 1);
      screen.scale.set(0.72, 0.72, 1);
    }
    if (wetland) {
      board.position.set(-0.4, 2.4, -1.7);
      screen.position.set(-0.4, 2.4, -1.58);
      board.scale.set(0.8, 0.8, 1);
      screen.scale.set(0.8, 0.8, 1);
    }
    // Potted palms, pendant lamps, a ceiling fan and kettle steam make the rooms lived-in.
    for (const x of [-6.7, 6.7]) {
      cylinder(scene, 0.42, 0.28, 0.75, [x, 0.38, -3.5], wood, 12);
      for (let n = 0; n < 7; n++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), green);
        leaf.scale.set(0.14, 0.8, 0.3);
        leaf.position.set(x + Math.sin(n) * 0.35, 1.25, -3.5 + Math.cos(n) * 0.3);
        leaf.rotation.z = Math.sin(n) * 0.5;
        scene.add(leaf);
      }
    }
    const fan = new THREE.Group();
    fan.visible = id !== 'space' && !wetland;
    fan.position.set(0, 5.9, 0);
    scene.add(fan);
    cylinder(fan, 0.16, 0.16, 0.2, [0, 0, 0], dark, 12);
    for (let n = 0; n < 3; n++) {
      const blade = box(
        fan,
        [1.6, 0.05, 0.23],
        [Math.cos(n * 2.094) * 0.65, 0, Math.sin(n * 2.094) * 0.65],
        steel,
      );
      blade.rotation.y = -n * 2.094;
    }
    const steam = new THREE.Group();
    scene.add(steam);
    if (tea)
      for (let n = 0; n < 8; n++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 7, 5),
          new THREE.MeshBasicMaterial({
            color: '#fff6dc',
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
          }),
        );
        steam.add(puff);
      }
    const host = makePerson(tea ? '#d9c5a0' : office ? '#547779' : '#a36c54');
    host.group.position.set(tea ? -4.8 : studio ? -5.4 : 5.5, 0, tea ? -4.5 : -3.4);
    host.group.rotation.y = -0.3;
    scene.add(host.group);
    const staticRoom = new THREE.Group();
    for (const object of [...scene.children]) {
      if (
        (object instanceof THREE.Mesh || object instanceof THREE.Group) &&
        ![fan, steam, screen, host.group].includes(object)
      )
        staticRoom.add(object);
    }
    scene.add(staticRoom);
    bakeStatic(staticRoom);
    return {
      scene,
      camera,
      screen,
      canvas,
      texture,
      animate(t) {
        fan.rotation.y = t * 1.6;
        animatePerson(host, t, 1, tea ? 'chat' : 'police');
        steam.children.forEach((p, n) => {
          const a = (t * 0.55 + n * 0.14) % 1;
          p.position.set(-4 + Math.sin(t + n) * 0.13, 1.6 + a * 1.5, -4.3 + Math.cos(t + n) * 0.1);
          p.scale.setScalar(0.6 + a * 1.4);
        });
      },
    };
  }
  function draw() {
    if (!active) return;
    const room = rooms.get(active)!,
      card = VENUE_PAGES[active][page],
      c = room.canvas.getContext('2d')!;
    const newspaper = active === 'about',
      ink = newspaper ? '#2e473c' : '#f3ead7',
      accent = newspaper ? '#9c6437' : active === 'opsflash' ? '#8cdcc1' : '#e7bd76';
    c.fillStyle = newspaper ? '#eee2bb' : active === 'space' ? '#182c44' : '#163b36';
    c.fillRect(0, 0, 1600, 900);
    c.fillStyle = accent;
    c.font = '500 31px monospace';
    c.fillText(card.label, 85, 85);
    c.strokeStyle = accent;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(85, 115);
    c.lineTo(1515, 115);
    c.stroke();
    c.fillStyle = ink;
    c.font = `${newspaper ? 'bold 76px Georgia' : '600 76px sans-serif'}`;
    const words = card.title.split(' ');
    let line = '',
      y = 220;
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (c.measureText(next).width > 1410) {
        c.fillText(line, 85, y);
        y += 90;
        line = word;
      } else line = next;
    }
    c.fillText(line, 85, y);
    c.font = '36px sans-serif';
    c.fillStyle = ink;
    c.fillText(card.copy, 85, y + 85);
    const nodes = card.nodes,
      gap = 22,
      width = (1430 - gap * (nodes.length - 1)) / nodes.length;
    nodes.forEach((node, i) => {
      const x = 85 + i * (width + gap);
      c.fillStyle = newspaper ? '#d9c996' : i < progress ? '#376f5d' : '#28504a';
      c.fillRect(x, 490, width, 205);
      c.fillStyle = accent;
      c.font = '27px monospace';
      c.fillText(String(i + 1).padStart(2, '0'), x + 24, 535);
      c.fillStyle = ink;
      c.font = '500 46px sans-serif';
      let text = '',
        dy = 590;
      for (const w of node.split(' ')) {
        if (c.measureText(text + ' ' + w).width > width - 48 && text) {
          c.fillText(text, x + 24, dy);
          text = w;
          dy += 51;
        } else text += (text ? ' ' : '') + w;
      }
      c.fillText(text, x + 24, dy);
    });
    c.fillStyle = accent;
    c.font = '28px monospace';
    c.fillText(
      active === 'rift' && progress
        ? 'Δ 0.01 · 3 DIFFERENCES'
        : `${String(page + 1).padStart(2, '0')} / ${String(VENUE_PAGES[active].length).padStart(2, '0')}`,
      85,
      820,
    );
    c.fillText(
      newspaper
        ? 'JAY’S WORLD · KERALA'
        : active === 'opsflash'
          ? 'ILLUSTRATIVE WORKFLOW'
          : 'JAY’S WORLD',
      1080,
      820,
    );
    room.texture.needsUpdate = true;
  }
  return {
    enter(id: PlaceId) {
      active = id;
      page = progress = 0;
      if (!rooms.has(id)) rooms.set(id, build(id));
      draw();
    },
    page(index: number, step = 0) {
      page = index;
      progress = step;
      draw();
    },
    get active() {
      return active;
    },
    render(renderer: THREE.WebGLRenderer, time: number) {
      if (!active) return;
      const room = rooms.get(active)!;
      const portrait = innerWidth / innerHeight < 0.85;
      room.camera.aspect = innerWidth / innerHeight;
      room.camera.position.set(
        portrait ? -0.3 : 1.1,
        active === 'about' ? 5.7 : 3.1,
        portrait ? 13 : 8.5,
      );
      room.camera.lookAt(
        active === 'about' ? new THREE.Vector3(0, 1.1, 1) : new THREE.Vector3(-0.4, 2.75, -4),
      );
      room.camera.updateProjectionMatrix();
      room.scene.updateMatrixWorld();
      room.camera.updateMatrixWorld();
      room.animate(time);
      renderer.render(room.scene, room.camera);
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      for (const room of rooms.values())
        room.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            geometries.add(o.geometry);
            (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
          }
        });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => {
        if ('map' in m) (m.map as THREE.Texture | null)?.dispose();
        m.dispose();
      });
      rooms.clear();
    },
  };
}
