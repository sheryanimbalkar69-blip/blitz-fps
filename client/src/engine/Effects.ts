import * as THREE from 'three';

interface Tracer {
  line: THREE.Line;
  life: number;
  maxLife: number;
}

interface Spark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ExplosionRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  private tracers: Tracer[] = [];
  private sparks: Spark[] = [];
  private explosions: ExplosionRing[] = [];

  private sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  private explosionGeo = new THREE.SphereGeometry(1, 14, 12);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: number = 0xfef08a) {
    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09, maxLife: 0.09 });
  }

  public spawnImpactSparks(pos: THREE.Vector3, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6
      );
      this.sparks.push({ mesh, vel, life: 0.25, maxLife: 0.25 });
    }
  }

  public spawnExplosion(pos: THREE.Vector3, isFlash: boolean = false) {
    const mat = new THREE.MeshBasicMaterial({
      color: isFlash ? 0xffffff : 0xf97316,
      transparent: true,
      opacity: 0.85
    });
    const mesh = new THREE.Mesh(this.explosionGeo, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.3);
    this.scene.add(mesh);
    this.explosions.push({ mesh, life: 0.35, maxLife: 0.35 });
    this.spawnImpactSparks(pos, isFlash ? 8 : 14);
  }

  public update(deltaSec: number) {
    // Update tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= deltaSec;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (t.line.material as THREE.LineBasicMaterial).opacity = (t.life / t.maxLife) * 0.85;
      }
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= deltaSec;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      } else {
        s.vel.y -= 14 * deltaSec;
        s.mesh.position.addScaledVector(s.vel, deltaSec);
        const scale = Math.max(0.1, s.life / s.maxLife);
        s.mesh.scale.setScalar(scale);
      }
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= deltaSec;
      if (ex.life <= 0) {
        this.scene.remove(ex.mesh);
        (ex.mesh.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
      } else {
        const progress = 1 - ex.life / ex.maxLife;
        ex.mesh.scale.setScalar(0.4 + progress * 4.5);
        (ex.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
      }
    }
  }
}
