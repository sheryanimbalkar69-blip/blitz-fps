import * as THREE from 'three';
import { PlayerNetState, Team } from '../../../shared/packets';

interface AnimatedPlayer {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  muzzleFlash: THREE.PointLight;
  nametag: THREE.Sprite;
  lastPos: THREE.Vector3;
  animTimer: number;
}

export class RemotePlayerManager {
  private scene: THREE.Scene;
  private players: Map<string, AnimatedPlayer> = new Map();
  private targetPositions: Map<string, THREE.Vector3> = new Map();
  private targetRotations: Map<string, number> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public syncPlayers(serverPlayers: PlayerNetState[], myPlayerId: string) {
    const activeIds = new Set<string>();

    for (const p of serverPlayers) {
      if (p.id === myPlayerId) continue;
      activeIds.add(p.id);

      if (!this.players.has(p.id)) {
        this.createDetailedSoldier(p);
      }

      this.updatePlayerState(p);
    }

    // Cleanup disconnected players
    for (const [id, player] of this.players.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(player.group);
        this.players.delete(id);
        this.targetPositions.delete(id);
        this.targetRotations.delete(id);
      }
    }
  }

  // Authentic 3D Tactical Military Soldier Model
  private createDetailedSoldier(p: PlayerNetState) {
    const root = new THREE.Group();
    const isAlpha = p.team === 'ALPHA';
    const teamColorHex = isAlpha ? 0x2563eb : 0xd97706; // Blue for Alpha, Amber for Bravo

    // Materials
    const camoPantsMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.85 }); // Charcoal BDU
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.1 }); // Plate carrier
    const teamPatchMat = new THREE.MeshStandardMaterial({ color: teamColorHex, roughness: 0.4, metalness: 0.3 });
    const skinBalaclavaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }); // Dark balaclava
    const goggleGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 }); // Tinted goggles
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 }); // Kevlar
    const kneepadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.3, metalness: 0.85 });

    // 1. Torso / Plate Carrier (Chest Rig)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.3), vestMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    root.add(torso);

    // Front Triple Mag Pouches
    for (let i = -1; i <= 1; i++) {
      const magPouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.07), teamPatchMat);
      magPouch.position.set(i * 0.11, 1.0, 0.17);
      root.add(magPouch);
    }

    // Team Velcro Shoulder & Chest Patches
    const chestPatch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.01), teamPatchMat);
    chestPatch.position.set(0, 1.25, 0.16);
    root.add(chestPatch);

    // Radio Walkie-Talkie on Left Shoulder with Whip Antenna
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.05), helmetMat);
    radio.position.set(-0.2, 1.28, 0.1);
    root.add(radio);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.18, 6), helmetMat);
    antenna.position.set(-0.2, 1.42, 0.1);
    root.add(antenna);

    // Tactical Duty Belt & Holster
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.32), bootMat);
    belt.position.y = 0.72;
    root.add(belt);

    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), bootMat);
    holster.position.set(0.26, 0.68, 0);
    root.add(holster);

    // 2. Head with Balaclava & FAST Ballistic Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.25, 0.24), skinBalaclavaMat);
    head.position.y = 1.5;
    root.add(head);

    // Ballistic Helmet with ARC rails
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetMat);
    helmet.position.set(0, 1.54, 0);
    root.add(helmet);

    // Front NVG Mount Shroud Bracket
    const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), kneepadMat);
    nvgMount.position.set(0, 1.58, 0.155);
    root.add(nvgMount);

    // Tactical Comms Headset (Earcups over helmet)
    const earcupL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 10), teamPatchMat);
    earcupL.rotation.z = Math.PI / 2;
    earcupL.position.set(-0.14, 1.52, 0);
    root.add(earcupL);

    const earcupR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 10), teamPatchMat);
    earcupR.rotation.z = Math.PI / 2;
    earcupR.position.set(0.14, 1.52, 0);
    root.add(earcupR);

    // Ballistic Sunglasses / Goggles Lens
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.055, 0.04), goggleGlassMat);
    goggles.position.set(0, 1.52, 0.125);
    root.add(goggles);

    // 3. Legs with Cargo Pockets & Knee Pads
    // Left Leg
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), camoPantsMat);
    leftLeg.position.set(-0.14, 0.36, 0);
    root.add(leftLeg);

    const kneePadL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.06), kneepadMat);
    kneePadL.position.set(-0.14, 0.38, 0.11);
    root.add(kneePadL);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.26), bootMat);
    bootL.position.set(-0.14, 0.07, 0.03);
    root.add(bootL);

    // Right Leg
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), camoPantsMat);
    rightLeg.position.set(0.14, 0.36, 0);
    root.add(rightLeg);

    const kneePadR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.06), kneepadMat);
    kneePadR.position.set(0.14, 0.38, 0.11);
    root.add(kneePadR);

    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.26), bootMat);
    bootR.position.set(0.14, 0.07, 0.03);
    root.add(bootR);

    // 4. Arms with Combat Shirt & Gloves
    // Right Arm (Firing hand holding rifle)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.28, 1.25, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), camoPantsMat);
    armR.position.set(0, -0.15, 0);
    armR.rotation.x = -0.6;
    rightArmGroup.add(armR);

    // Armband patch
    const patchR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.16), teamPatchMat);
    patchR.position.set(0, -0.06, 0);
    patchR.rotation.x = -0.6;
    rightArmGroup.add(patchR);
    root.add(rightArmGroup);

    // Left Arm (Support hand on foregrip)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.28, 1.25, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), camoPantsMat);
    armL.position.set(0, -0.15, 0);
    armL.rotation.set(-0.8, -0.3, 0.4);
    leftArmGroup.add(armL);
    root.add(leftArmGroup);

    // 5. Tactical Rifle Held in Hands
    const rifle = new THREE.Group();
    rifle.position.set(0.14, 1.05, -0.22);
    rifle.rotation.y = 0.05;

    const rifleRec = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.4), gunMat);
    rifle.add(rifleRec);

    const rifleBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), gunMat);
    rifleBarrel.rotation.x = Math.PI / 2;
    rifleBarrel.position.set(0, 0.01, -0.3);
    rifle.add(rifleBarrel);

    const rifleMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.07), teamPatchMat);
    rifleMag.position.set(0, -0.08, -0.06);
    rifleMag.rotation.x = 0.2;
    rifle.add(rifleMag);

    const rifleOptic = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.08), gunMat);
    rifleOptic.position.set(0, 0.055, -0.04);
    rifle.add(rifleOptic);

    root.add(rifle);

    // Muzzle flash point light
    const flash = new THREE.PointLight(0xffbb33, 0, 8);
    flash.position.set(0.14, 1.06, -0.6);
    root.add(flash);

    // Nametag Sprite
    const nametag = this.createNametagSprite(p.name, p.team, p.hp, p.maxHp);
    nametag.position.set(0, 2.05, 0);
    root.add(nametag);

    const feetY = this.getFeetY(p);
    root.position.set(p.x, feetY, p.z);
    this.scene.add(root);

    this.players.set(p.id, {
      group: root,
      leftLeg,
      rightLeg,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      muzzleFlash: flash,
      nametag,
      lastPos: new THREE.Vector3(p.x, feetY, p.z),
      animTimer: Math.random() * 10
    });

    this.targetPositions.set(p.id, new THREE.Vector3(p.x, feetY, p.z));
    this.targetRotations.set(p.id, p.yaw);
  }

  // Accurately compute ground-level feet elevation (prevents floating in air)
  private getFeetY(p: PlayerNetState): number {
    if (p.isBot) {
      // Bots: if y is near 1.0 (legacy waypoint offset), snap to 0.0 ground
      if (Math.abs(p.y - 1.0) < 0.25) return 0.0;
      return Math.max(0, p.y || 0.0);
    } else {
      // Human players report eye level (~1.65m on ground, ~5.55m on 2nd floor)
      // Subtract eye height so feet are planted on the floor
      return Math.max(0, (p.y || 1.65) - 1.65);
    }
  }

  private createNametagSprite(name: string, team: Team, hp: number, maxHp: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Name text
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = team === 'ALPHA' ? '#38bdf8' : '#fb923c';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(name, 128, 26);

    // Health bar container
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(48, 36, 160, 10);

    // Health bar fill
    const fillWidth = Math.max(0, (hp / maxHp) * 156);
    ctx.fillStyle = hp > 40 ? '#22c55e' : '#ef4444';
    ctx.fillRect(50, 38, fillWidth, 6);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.45, 1);
    return sprite;
  }

  private updatePlayerState(p: PlayerNetState) {
    const feetY = this.getFeetY(p);
    this.targetPositions.set(p.id, new THREE.Vector3(p.x, feetY, p.z));
    this.targetRotations.set(p.id, p.yaw);

    const soldier = this.players.get(p.id);
    if (soldier) {
      soldier.group.visible = !p.isDead;
      if (p.isFiring) {
        soldier.muzzleFlash.intensity = 2.5;
      }
    }
  }

  // Running walk-cycle animation & smooth interpolation
  public update(deltaSec: number) {
    for (const [id, soldier] of this.players.entries()) {
      const targetPos = this.targetPositions.get(id);
      const targetYaw = this.targetRotations.get(id);

      if (targetPos) {
        const moveDist = soldier.group.position.distanceTo(targetPos);
        soldier.group.position.lerp(targetPos, deltaSec * 16);

        // Animate legs when moving!
        if (moveDist > 0.03) {
          soldier.animTimer += deltaSec * 11;
          const legAngle = Math.sin(soldier.animTimer) * 0.45;
          soldier.leftLeg.rotation.x = legAngle;
          soldier.rightLeg.rotation.x = -legAngle;
        } else {
          soldier.leftLeg.rotation.x = THREE.MathUtils.lerp(soldier.leftLeg.rotation.x, 0, deltaSec * 10);
          soldier.rightLeg.rotation.x = THREE.MathUtils.lerp(soldier.rightLeg.rotation.x, 0, deltaSec * 10);
        }
      }

      if (targetYaw !== undefined) {
        soldier.group.rotation.y = THREE.MathUtils.lerp(soldier.group.rotation.y, targetYaw, deltaSec * 16);
      }

      // Decay muzzle flash
      if (soldier.muzzleFlash.intensity > 0) {
        soldier.muzzleFlash.intensity = Math.max(0, soldier.muzzleFlash.intensity - deltaSec * 25);
      }
    }
  }
}
