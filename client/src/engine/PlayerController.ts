import * as THREE from 'three';
import { PlayerInputPacket, WEAPON_REGISTRY, WeaponDef } from '../../../shared/packets';
import { sounds } from './Audio';
import { CollidableBox } from './Map';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public inputSeq: number = 0;
  public pos: THREE.Vector3 = new THREE.Vector3(0, 1.6, -34);
  public vel: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = 0;
  public pitch: number = 0;
  public isGrounded: boolean = true;
  public isCrouched: boolean = false;
  public isSprinting: boolean = false;
  public isAiming: boolean = false;
  public isReloading: boolean = false;
  public activeSlot: 'PRIMARY' | 'SECONDARY' | 'LETHAL' | 'TACTICAL' = 'PRIMARY';
  public activeWeaponId: string = 'm4a1';
  public ammo: number = 30;
  public reserveAmmo: number = 90;
  public mouseSensitivity: number = 0.0022;
  public fovNormal: number = 75;
  public fovAds: number = 55;

  // Viewmodel
  public weaponGroup: THREE.Group = new THREE.Group();
  public muzzleFlashLight: THREE.PointLight;
  private recoilOffset: THREE.Vector3 = new THREE.Vector3();
  private recoilRot: THREE.Euler = new THREE.Euler();
  private lastFireTime: number = 0;
  private footstepTimer: number = 0;

  // Key states
  private keys: Record<string, boolean> = {};
  public isMouseDown: boolean = false;
  public isRightMouseDown: boolean = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.position.copy(this.pos);

    // Create 3D Viewmodel Gun attached to camera
    this.setupViewmodel();

    // Muzzle flash light
    this.muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 12);
    this.muzzleFlashLight.position.set(0.2, -0.15, -0.8);
    this.camera.add(this.muzzleFlashLight);

    this.setupInputListeners();
  }

  private setupViewmodel() {
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(0.24, -0.26, -0.45); // Standard hip-fire offset

    // Procedural tactical rifle mesh (Receiver, Barrel, Magazine, Stock, Sights)
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x1f242d });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const tanMat = new THREE.MeshLambertMaterial({ color: 0x854d0e }); // Grip

    // Main receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.35), gunMat);
    this.weaponGroup.add(receiver);

    // Barrel + handguard
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.28), metalMat);
    barrel.position.set(0, 0.02, -0.3);
    this.weaponGroup.add(barrel);

    // Muzzle brake
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), metalMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.02, -0.46);
    this.weaponGroup.add(muzzle);

    // Curved magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), metalMat);
    mag.position.set(0, -0.1, -0.06);
    mag.rotation.x = 0.2;
    this.weaponGroup.add(mag);

    // Tactical grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.055), tanMat);
    grip.position.set(0, -0.09, 0.11);
    grip.rotation.x = -0.35;
    this.weaponGroup.add(grip);

    // Sights / Picatinny rail
    const sights = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.15), metalMat);
    sights.position.set(0, 0.06, 0.0);
    this.weaponGroup.add(sights);

    this.camera.add(this.weaponGroup);
  }

  private setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        this.reload();
      } else if (e.code === 'Digit1') {
        this.switchSlot('PRIMARY');
      } else if (e.code === 'Digit2') {
        this.switchSlot('SECONDARY');
      } else if (e.code === 'Digit3') {
        this.switchSlot('LETHAL');
      } else if (e.code === 'Digit4') {
        this.switchSlot('TACTICAL');
      } else if (e.code === 'KeyC') {
        this.isCrouched = !this.isCrouched;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement) {
        if (e.button === 0) this.isMouseDown = true;
        if (e.button === 2) this.isRightMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        const factor = this.isAiming ? 0.6 : 1.0;
        this.yaw -= e.movementX * this.mouseSensitivity * factor;
        this.pitch -= e.movementY * this.mouseSensitivity * factor;

        // Clamp vertical look angle (-88° to +88°)
        this.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.pitch));
      }
    });
  }

  public setWeapon(weaponId: string) {
    const w = WEAPON_REGISTRY[weaponId];
    if (w) {
      this.activeWeaponId = weaponId;
      this.ammo = w.magSize;
      this.reserveAmmo = w.reserveAmmo;
      this.isReloading = false;
    }
  }

  public switchSlot(slot: 'PRIMARY' | 'SECONDARY' | 'LETHAL' | 'TACTICAL') {
    this.activeSlot = slot;
    if (slot === 'PRIMARY') this.setWeapon('m4a1');
    else if (slot === 'SECONDARY') this.setWeapon('pistol1911');
    else if (slot === 'LETHAL') this.setWeapon('frag');
    else if (slot === 'TACTICAL') this.setWeapon('flashbang');
  }

  public reload() {
    const w = WEAPON_REGISTRY[this.activeWeaponId];
    if (w && !this.isReloading && this.ammo < w.magSize && this.reserveAmmo > 0) {
      this.isReloading = true;
      sounds.playReload();
      setTimeout(() => {
        const needed = w.magSize - this.ammo;
        const add = Math.min(needed, this.reserveAmmo);
        this.ammo += add;
        this.reserveAmmo -= add;
        this.isReloading = false;
      }, w.reloadTime * 1000);
    }
  }

  public update(deltaSec: number, colliders: CollidableBox[]): { didFire: boolean; fireOrigin?: THREE.Vector3; fireDir?: THREE.Vector3 } {
    this.inputSeq++;

    // 1. Aim Down Sights (ADS)
    this.isAiming = this.isRightMouseDown;
    const targetFov = this.isAiming ? this.fovAds : this.fovNormal;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, deltaSec * 14);
    this.camera.updateProjectionMatrix();

    // 2. Sprinting & Movement Speeds
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && !!this.keys['KeyW'] && !this.isAiming && !this.isCrouched;
    const moveSpeed = this.isSprinting ? 6.4 : (this.isCrouched ? 2.4 : (this.isAiming ? 3.0 : 4.6));

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW']) {
      moveX += Math.sin(this.yaw);
      moveZ += Math.cos(this.yaw);
    }
    if (this.keys['KeyS']) {
      moveX -= Math.sin(this.yaw);
      moveZ -= Math.cos(this.yaw);
    }
    if (this.keys['KeyA']) {
      moveX += Math.sin(this.yaw + Math.PI / 2);
      moveZ += Math.cos(this.yaw + Math.PI / 2);
    }
    if (this.keys['KeyD']) {
      moveX += Math.sin(this.yaw - Math.PI / 2);
      moveZ += Math.cos(this.yaw - Math.PI / 2);
    }

    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0) {
      const stepX = (moveX / moveLen) * moveSpeed * deltaSec;
      const stepZ = (moveZ / moveLen) * moveSpeed * deltaSec;

      // Predict movement with collision detection
      this.tryMoveWithCollision(stepX, stepZ, colliders);

      // Footstep audio cadence
      this.footstepTimer += deltaSec * (this.isSprinting ? 1.6 : 1.0);
      if (this.footstepTimer > 0.42) {
        this.footstepTimer = 0;
        sounds.playFootstep();
      }
    }

    // 3. Jump and Gravity
    if (this.keys['Space'] && this.isGrounded) {
      this.vel.y = 5.2; // Jump velocity
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.vel.y -= 14.8 * deltaSec; // Gravity
      this.pos.y += this.vel.y * deltaSec;
      const groundHeight = this.isCrouched ? 1.05 : 1.65;
      if (this.pos.y <= groundHeight) {
        this.pos.y = groundHeight;
        this.vel.y = 0;
        this.isGrounded = true;
      }
    } else {
      const targetHeight = this.isCrouched ? 1.05 : 1.65;
      this.pos.y = THREE.MathUtils.lerp(this.pos.y, targetHeight, deltaSec * 12);
    }

    // Keep within Nuketown bounds
    this.pos.x = Math.max(-18, Math.min(18, this.pos.x));
    this.pos.z = Math.max(-38, Math.min(38, this.pos.z));

    // Update Camera position & rotation
    this.camera.position.copy(this.pos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // 4. Viewmodel Animation (Hip-fire vs ADS offset + Bobbing + Recoil)
    const hipPos = new THREE.Vector3(0.24, -0.26, -0.45);
    const adsPos = new THREE.Vector3(0.0, -0.165, -0.32); // Centered iron sights
    const targetViewmodelPos = this.isAiming ? adsPos : hipPos;

    // Head bobbing effect when walking
    if (moveLen > 0 && this.isGrounded) {
      const bobFreq = this.isSprinting ? 14 : 9;
      const bobAmp = this.isSprinting ? 0.015 : 0.008;
      targetViewmodelPos.y += Math.sin(Date.now() * 0.001 * bobFreq) * bobAmp;
      targetViewmodelPos.x += Math.cos(Date.now() * 0.001 * (bobFreq / 2)) * (bobAmp * 0.8);
    }

    this.weaponGroup.position.lerp(targetViewmodelPos.clone().add(this.recoilOffset), deltaSec * 20);
    this.weaponGroup.rotation.x = THREE.MathUtils.lerp(this.weaponGroup.rotation.x, this.recoilRot.x, deltaSec * 25);
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), deltaSec * 15);
    this.recoilRot.x = THREE.MathUtils.lerp(this.recoilRot.x, 0, deltaSec * 20);

    // Muzzle flash decay
    this.muzzleFlashLight.intensity = Math.max(0, this.muzzleFlashLight.intensity - deltaSec * 60);

    // 5. Fire Weapon Check
    let didFire = false;
    let fireOrigin: THREE.Vector3 | undefined;
    let fireDir: THREE.Vector3 | undefined;

    const w = WEAPON_REGISTRY[this.activeWeaponId] || WEAPON_REGISTRY['m4a1'];
    const now = Date.now();
    const fireIntervalMs = (60 / w.fireRate) * 1000;

    if (this.isMouseDown && !this.isReloading && (now - this.lastFireTime >= fireIntervalMs)) {
      if (this.ammo > 0) {
        this.ammo--;
        this.lastFireTime = now;
        didFire = true;

        sounds.playGunshot(this.activeWeaponId);

        // Recoil kickback
        this.recoilOffset.z = 0.08;
        this.recoilRot.x = w.recoilPitch;
        this.pitch += w.recoilPitch * 0.4; // Screen kick
        this.muzzleFlashLight.intensity = 3.5;

        // Calculate raycast forward vector
        fireOrigin = this.camera.position.clone();
        fireDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

        // Apply spread
        const spreadAngle = this.isAiming ? w.spread * 0.3 : w.spread;
        fireDir.x += (Math.random() - 0.5) * spreadAngle;
        fireDir.y += (Math.random() - 0.5) * spreadAngle;
        fireDir.normalize();
      } else {
        this.reload();
      }
    }

    return { didFire, fireOrigin, fireDir };
  }

  private tryMoveWithCollision(stepX: number, stepZ: number, colliders: CollidableBox[]) {
    const nextX = this.pos.x + stepX;
    const nextZ = this.pos.z + stepZ;
    const playerRadius = 0.35;

    let blockedX = false;
    let blockedZ = false;

    for (const box of colliders) {
      if (this.pos.y > box.max.y || this.pos.y + 1.8 < box.min.y) continue;

      if (
        nextX + playerRadius > box.min.x &&
        nextX - playerRadius < box.max.x &&
        this.pos.z + playerRadius > box.min.z &&
        this.pos.z - playerRadius < box.max.z
      ) {
        blockedX = true;
      }

      if (
        this.pos.x + playerRadius > box.min.x &&
        this.pos.x - playerRadius < box.max.x &&
        nextZ + playerRadius > box.min.z &&
        nextZ - playerRadius < box.max.z
      ) {
        blockedZ = true;
      }
    }

    if (!blockedX) this.pos.x = nextX;
    if (!blockedZ) this.pos.z = nextZ;
  }

  public getInputPacket(): PlayerInputPacket {
    return {
      type: 'INPUT',
      seq: this.inputSeq,
      timestamp: Date.now(),
      forward: !!this.keys['KeyW'],
      back: !!this.keys['KeyS'],
      left: !!this.keys['KeyA'],
      right: !!this.keys['KeyD'],
      jump: !!this.keys['Space'],
      sprint: this.isSprinting,
      crouch: this.isCrouched,
      fire: this.isMouseDown,
      aimDownSights: this.isAiming,
      yaw: this.yaw,
      pitch: this.pitch,
      activeWeaponSlot: this.activeSlot
    };
  }
}
