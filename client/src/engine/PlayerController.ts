import { WeaponModelFactory } from "./WeaponModels";
import * as THREE from 'three';
import { PlayerInputPacket, WEAPON_REGISTRY, WeaponDef } from '../../../shared/packets';
import { sounds } from './Audio';
import { CollidableBox, WalkableRamp } from './Map';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public inputSeq: number = 0;
  public pos: THREE.Vector3 = new THREE.Vector3(0, 1.6, -34);
  public vel: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = Math.PI;
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

  // Primary weapon cycle list
  public primaryWeapons: string[] = ['m4a1', 'kar98k', 'ak47', 'mp5', 'pp19', 'model680'];
  private currentPrimaryIdx: number = 0;

  // Key & Scope states
  private keys: Record<string, boolean> = {};
  public isMouseDown: boolean = false;
  public isRightMouseDown: boolean = false;
  public scopeToggled: boolean = false;
  private rightMouseDownTime: number = 0;

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
    if (this.weaponGroup) {
      this.camera.remove(this.weaponGroup);
    }
    this.weaponGroup = WeaponModelFactory.buildWeaponModel(this.activeWeaponId);
    this.weaponGroup.position.set(0.22, -0.24, -0.5);
    this.camera.add(this.weaponGroup);
  }

  private setupInputListeners() {
    // Prevent browser context menu globally so Right Click is 100% dedicated to weapon scoping
    window.addEventListener('contextmenu', (e) => e.preventDefault());

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
      } else if (e.code === 'KeyQ' || e.code === 'KeyV' || e.code === 'KeyZ') {
        // Keyboard Scope / ADS toggle
        this.scopeToggled = !this.scopeToggled;
        this.isAiming = this.scopeToggled;
      } else if (e.code === 'KeyB') {
        // Cycle Primary weapon: M4A1 -> Kar98k Sniper -> AK-47 -> MP5 -> PP19 -> Model 680
        this.cyclePrimaryWeapon();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (document.pointerLockElement) this.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.rightMouseDownTime = Date.now();
        this.isRightMouseDown = true;
        this.isAiming = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        e.preventDefault();
        this.isRightMouseDown = false;
        const pressDuration = Date.now() - this.rightMouseDownTime;
        // If quick tap (< 280ms), toggle scope state
        if (pressDuration < 280) {
          this.scopeToggled = !this.scopeToggled;
          this.isAiming = this.scopeToggled;
        } else {
          // If held down and released, exit scope
          this.isAiming = false;
          this.scopeToggled = false;
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        const factor = this.isAiming ? (this.activeWeaponId === 'kar98k' ? 0.35 : 0.55) : 1.0;
        this.yaw -= e.movementX * this.mouseSensitivity * factor;
        this.pitch -= e.movementY * this.mouseSensitivity * factor;

        // Clamp vertical look angle (-88° to +88°)
        this.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.pitch));
      }
    });
  }

  public cyclePrimaryWeapon() {
    this.currentPrimaryIdx = (this.currentPrimaryIdx + 1) % this.primaryWeapons.length;
    this.activeSlot = 'PRIMARY';
    this.setWeapon(this.primaryWeapons[this.currentPrimaryIdx]);
  }

  public setWeapon(weaponId: string) {
    const w = WEAPON_REGISTRY[weaponId];
    if (w) {
      this.activeWeaponId = weaponId;
      this.ammo = w.magSize;
      this.reserveAmmo = w.reserveAmmo;
      this.isReloading = false;
      this.setupViewmodel(); // Rebuild high-detail 3D weapon model
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
    if (w && !this.isReloading) {
      if (this.ammo < w.magSize && this.reserveAmmo > 0) {
        this.isReloading = true;
        sounds.playReload();
        setTimeout(() => {
          const needed = w.magSize - this.ammo;
          const add = Math.min(needed, this.reserveAmmo);
          this.ammo += add;
          this.reserveAmmo -= add;
          this.isReloading = false;
        }, w.reloadTime * 1000);
      } else if (this.ammo === w.magSize) {
        // Weapon already full, play subtle inspection click
        sounds.playReload();
      }
    }
  }

  public getTargetFov(): number {
    if (!this.isAiming) return this.fovNormal;
    if (this.activeWeaponId === 'kar98k') return 22; // High-magnification sniper optic zoom
    if (this.activeWeaponId === 'm4a1' || this.activeWeaponId === 'ak47') return 46; // Holographic optic zoom
    if (this.activeWeaponId === 'mp5' || this.activeWeaponId === 'pp19') return 50; // SMG reflex zoom
    return 56;
  }

  public update(
    deltaSec: number,
    colliders: CollidableBox[],
    ramps: WalkableRamp[] = []
  ): { didFire: boolean; fireOrigin?: THREE.Vector3; fireDir?: THREE.Vector3 } {
    this.inputSeq++;

    // 1. Aim Down Sights (ADS)
    this.isAiming = this.isRightMouseDown || this.scopeToggled;
    if (this.isSprinting) {
      this.isAiming = false;
      this.scopeToggled = false;
    }

    const targetFov = this.getTargetFov();
    const zoomSpeed = this.activeWeaponId === 'kar98k' ? 22 : 16;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, deltaSec * zoomSpeed);
    this.camera.updateProjectionMatrix();

    // 2. Sprinting & Movement Speeds
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && !!this.keys['KeyW'] && !this.isAiming && !this.isCrouched;
    const moveSpeed = this.isSprinting ? 6.4 : (this.isCrouched ? 2.4 : (this.isAiming ? 3.0 : 4.6));

    // Update Camera rotation first so world direction is always accurate
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVec = new THREE.Vector3();
    if (this.keys['KeyW']) moveVec.add(forward);
    if (this.keys['KeyS']) moveVec.sub(forward);
    if (this.keys['KeyD']) moveVec.add(right);
    if (this.keys['KeyA']) moveVec.sub(right);

    const moveLen = moveVec.length();
    if (moveLen > 0) {
      moveVec.normalize();
      const stepX = moveVec.x * moveSpeed * deltaSec;
      const stepZ = moveVec.z * moveSpeed * deltaSec;

      // Predict movement with collision detection
      this.tryMoveWithCollision(stepX, stepZ, colliders);

      // Footstep audio cadence
      this.footstepTimer += deltaSec * (this.isSprinting ? 1.6 : 1.0);
      if (this.footstepTimer > 0.42) {
        this.footstepTimer = 0;
        sounds.playFootstep();
      }
    }

    // 3. Jump, Ramps and Gravity
    if (this.keys['Space'] && this.isGrounded) {
      this.vel.y = 5.2; // Jump velocity
      this.isGrounded = false;
    }

    // Check if player is standing on any walkable ramp / stairs
    let rampGroundY: number | null = null;
    for (const r of ramps) {
      const minZ = Math.min(r.startZ, r.endZ);
      const maxZ = Math.max(r.startZ, r.endZ);
      if (this.pos.x >= r.minX && this.pos.x <= r.maxX && this.pos.z >= minZ && this.pos.z <= maxZ) {
        const factor = (this.pos.z - r.startZ) / (r.endZ - r.startZ);
        rampGroundY = r.startY + factor * (r.endY - r.startY);
        break;
      }
    }

    // Check second floor platform (y = 3.9) inside houses
    const isInsideUpperAlpha = (this.pos.x >= -6.8 && this.pos.x <= 6.8 && this.pos.z >= -31 && this.pos.z <= -17 && this.pos.y >= 4.5);
    const isInsideUpperBravo = (this.pos.x >= -6.8 && this.pos.x <= 6.8 && this.pos.z >= 17 && this.pos.z <= 31 && this.pos.y >= 4.5);
    const baseGroundHeight = (isInsideUpperAlpha || isInsideUpperBravo) ? 5.55 : (this.isCrouched ? 1.05 : 1.65);

    const effectiveGround = rampGroundY !== null ? (rampGroundY + (this.isCrouched ? 1.05 : 1.65)) : baseGroundHeight;

    if (!this.isGrounded) {
      this.vel.y -= 14.8 * deltaSec; // Gravity
      this.pos.y += this.vel.y * deltaSec;
      if (this.pos.y <= effectiveGround) {
        this.pos.y = effectiveGround;
        this.vel.y = 0;
        this.isGrounded = true;
      }
    } else {
      this.pos.y = THREE.MathUtils.lerp(this.pos.y, effectiveGround, deltaSec * 16);
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
    const adsPos = new THREE.Vector3(0.0, -0.072, -0.42); // Centers optic red reticle with crosshair
    const targetViewmodelPos = this.isAiming ? adsPos : hipPos;

    // Sniper Kar98k hides weapon model when scoped for fullscreen scope view
    if (this.activeWeaponId === 'kar98k' && this.isAiming) {
      this.weaponGroup.visible = false;
    } else {
      this.weaponGroup.visible = true;
    }

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
    const playerRadius = 0.32;
    const playerFeetY = this.pos.y - 1.6;
    const playerHeadY = this.pos.y + 0.2;

    let blockedX = false;
    let blockedZ = false;

    for (const box of colliders) {
      // Check vertical overlap
      if (playerFeetY > box.max.y || playerHeadY < box.min.y) continue;

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
