import * as THREE from 'three';

/** Soft shaded cumulus silhouettes, generated once with the existing canvas/Three stack. */
export function createClouds(scene: THREE.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  for (let i = 0; i < 18; i++) {
    const x = 60 + ((i * 79) % 380),
      y = 138 - Math.sin(i * 1.7) * 40,
      radius = 38 + (i % 5) * 7;
    const gradient = context.createRadialGradient(x - 8, y - 16, radius * 0.16, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,251,0.96)');
    gradient.addColorStop(0.48, 'rgba(242,246,248,0.9)');
    gradient.addColorStop(0.78, 'rgba(192,210,221,0.44)');
    gradient.addColorStop(1, 'rgba(192,210,221,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radius * 1.15, radius, 0, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
    color: '#fffdf5',
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, 18);
  mesh.name = 'sky:soft-cumulus';
  mesh.frustumCulled = false;
  scene.add(mesh);
  const dummy = new THREE.Object3D(),
    storm = new THREE.Color('#b7c6d0'),
    night = new THREE.Color('#527088');
  return {
    quality(small: boolean) {
      mesh.count = small ? 12 : 18;
    },
    update(t: number, wind: number, rain: number, darkness: number, camera: THREE.Camera) {
      material.color
        .set('#fffdf5')
        .lerp(storm, rain * 0.7)
        .lerp(night, darkness * 0.75);
      for (let i = 0; i < mesh.count; i++) {
        dummy.position.set(
          -290 + (i % 6) * 85 + ((t * wind * 1.2) % 50),
          84 + Math.floor(i / 6) * 17 + Math.sin(i * 3) * 9,
          -230 + Math.floor(i / 6) * 200,
        );
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(58 + (i % 4) * 9, 24 + (i % 3) * 3, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
