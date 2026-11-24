import * as THREE from 'three';
import { PlayerNetState, Team } from '../../../shared/packets';

export class RemotePlayerManager {
  private scene: THREE.Scene;
  private playerMeshes: Map<string, THREE.Group> = new Map();
  private targetPositions: Map<string, THREE.Vector3> = new Map();
  private targetRotations: Map<string, number> = new Map();
  private nametagSprites: Map<string, THREE.Sprite> = new Map();
  private muzzleFlashes: Map<string, THREE.PointLight> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public syncPlayers(players: PlayerNetState[], myPlayerId: string) {
    const activeIds = new Set<string>();

    for (const p of players) {
      if (p.id === myPlayerId) continue; // Don't render self as remote
      activeIds.add(p.id);

      if (!this.playerMeshes.has(p.id)) {
        this.createPlayerMesh(p);
      }

      this.updatePlayerState(p);
    }

    // Clean up players who disconnected
    for (const [id, mesh] of this.playerMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.playerMeshes.delete(id);
        this.targetPositions.delete(id);
        this.targetRotations.delete(id);
        this.nametagSprites.delete(id);
        this.muzzleFlashes.delete(id);
      }
    }
  }

  private createPlayerMesh(p: PlayerNetState) {
    const group = new THREE.Group();
    const isAlpha = p.team === 'ALPHA';
    const teamColor = isAlpha ? 0x2563eb : 0xd97706; // Blue for Alpha, Amber for Bravo

    const vestMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const teamMat = new THREE.MeshLambertMaterial({ color: teamColor });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a373 });
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    // Torso (Tactical Vest)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), vestMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    // Team Armbands / Shoulder Straps
    const armbands = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.22, 0.34), teamMat);
    armbands.position.y = 1.25;
    group.add(armbands);

    // Head + Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), skinMat);
    head.position.y = 1.58;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.32), helmetMat);
    helmet.position.y = 1.68;
    group.add(helmet);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.24);
    const legLeft = new THREE.Mesh(legGeo, vestMat);
    legLeft.position.set(-0.15, 0.38, 0);
    group.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, vestMat);
    legRight.position.set(0.15, 0.38, 0);
    group.add(legRight);

    // Rifle held in hands
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.7), gunMat);
    rifle.position.set(0.22, 1.05, -0.32);
    group.add(rifle);

    // Muzzle flash point light
    const flash = new THREE.PointLight(0xffbb33, 0, 8);
    flash.position.set(0.22, 1.05, -0.7);
    group.add(flash);
    this.muzzleFlashes.set(p.id, flash);

    // Nametag Sprite with health bar
    const sprite = this.createNametagSprite(p.name, p.team, p.hp, p.maxHp);
    sprite.position.set(0, 2.1, 0);
    group.add(sprite);
    this.nametagSprites.set(p.id, sprite);

    group.position.set(p.x, p.y, p.z);
    this.scene.add(group);
    this.playerMeshes.set(p.id, group);
    this.targetPositions.set(p.id, new THREE.Vector3(p.x, p.y, p.z));
    this.targetRotations.set(p.id, p.yaw);
  }

  private createNametagSprite(name: string, team: Team, hp: number, maxHp: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Name text
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = team === 'ALPHA' ? '#60a5fa' : '#fb923c';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(name, 128, 28);

    // Health bar background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(48, 38, 160, 10);

    // Health bar fill
    const fillWidth = Math.max(0, (hp / maxHp) * 156);
    ctx.fillStyle = hp > 40 ? '#22c55e' : '#ef4444';
    ctx.fillRect(50, 40, fillWidth, 6);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.45, 1);
    return sprite;
  }

  private updatePlayerState(p: PlayerNetState) {
    this.targetPositions.set(p.id, new THREE.Vector3(p.x, p.y, p.z));
    this.targetRotations.set(p.id, p.yaw);

    const mesh = this.playerMeshes.get(p.id);
    if (mesh) {
      mesh.visible = !p.isDead;
      if (p.isFiring) {
        const flash = this.muzzleFlashes.get(p.id);
        if (flash) flash.intensity = 2.5;
      }
    }
  }

  public update(deltaSec: number) {
    // Interpolate positions & rotations toward latest server snapshot
    for (const [id, mesh] of this.playerMeshes.entries()) {
      const targetPos = this.targetPositions.get(id);
      const targetYaw = this.targetRotations.get(id);

      if (targetPos) {
        mesh.position.lerp(targetPos, deltaSec * 16);
      }
      if (targetYaw !== undefined) {
        mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetYaw, deltaSec * 16);
      }

      // Decay muzzle flash
      const flash = this.muzzleFlashes.get(id);
      if (flash && flash.intensity > 0) {
        flash.intensity = Math.max(0, flash.intensity - deltaSec * 25);
      }
    }
  }
}
