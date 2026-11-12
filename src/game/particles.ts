// ============================================================
// Voxelcraft — block break / place particles. Original code.
// ============================================================

import * as THREE from 'three';

interface Burst {
  points: THREE.Points;
  vel: Float32Array;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private bursts: Burst[] = [];
  private group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  /** multiplier: all=1, decreased=0.4, minimal=0.15 */
  setScale(s: number): void {
    this.scale = s;
  }
  private scale = 1;

  spawnBlockBreak(x: number, y: number, z: number, color: [number, number, number], count: number): void {
    const n = Math.max(1, Math.round(count * this.scale));
    if (n <= 0 || count === 0) return;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x + 0.15 + Math.random() * 0.7;
      pos[i * 3 + 1] = y + 0.15 + Math.random() * 0.7;
      pos[i * 3 + 2] = z + 0.15 + Math.random() * 0.7;
      vel[i * 3] = (Math.random() - 0.5) * 3.2;
      vel[i * 3 + 1] = 1.5 + Math.random() * 3;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
      const v = 0.75 + Math.random() * 0.5;
      cols[i * 3] = (color[0] / 255) * v;
      cols[i * 3 + 1] = (color[1] / 255) * v;
      cols[i * 3 + 2] = (color[2] / 255) * v;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.group.add(pts);
    this.bursts.push({ points: pts, vel, life: 0, maxLife: 0.7 + Math.random() * 0.25 });
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        this.group.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const arr = (b.points.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let j = 0; j < arr.length; j += 3) {
        b.vel[j + 1] -= 13 * dt;
        arr[j] += b.vel[j] * dt;
        arr[j + 1] += b.vel[j + 1] * dt;
        arr[j + 2] += b.vel[j + 2] * dt;
        // crude floor collision
        if (b.vel[j + 1] < 0 && Math.random() < 0.5) { b.vel[j + 1] *= -0.3; }
      }
      (b.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      const fade = 1 - b.life / b.maxLife;
      (b.points.material as THREE.PointsMaterial).opacity = fade;
      (b.points.material as THREE.PointsMaterial).transparent = true;
    }
  }

  dispose(): void {
    for (const b of this.bursts) {
      this.group.remove(b.points);
      b.points.geometry.dispose();
      (b.points.material as THREE.Material).dispose();
    }
    this.bursts = [];
  }
}
