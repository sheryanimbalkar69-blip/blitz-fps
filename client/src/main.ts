import * as THREE from 'three';
import './ui/hud.css';
import { NuketownMap } from './engine/Map';
import { PlayerController } from './engine/PlayerController';
import { RemotePlayerManager } from './engine/RemotePlayer';
import { GameHUD } from './ui/HUD';
import { NetworkClient } from './engine/NetworkClient';
import { EffectsManager } from './engine/Effects';
import { sounds } from './engine/Audio';
import { WorldSnapshotPacket, MatchState, HardpointState } from '../../shared/packets';

class BlitzGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private map: NuketownMap;
  private player: PlayerController;
  private remotePlayers: RemotePlayerManager;
  private effects: EffectsManager;
  private hud: GameHUD;
  private net: NetworkClient;

  private lastTime: number = performance.now();
  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();
  private currentFps: number = 60;
  private isJoined: boolean = false;
  private lastNetworkTick: number = 0;
  private killStreak: number = 0;
  private wasDead: boolean = false;
  private deathTimestamp: number = 0;

  // Authoritative State Buffers
  private latestMatchState: MatchState = {
    status: 'ACTIVE',
    alphaScore: 0,
    bravoScore: 0,
    remainingMatchTime: 600,
    winner: null
  };

  private latestHardpointState: HardpointState = {
    zoneIndex: 0,
    zoneName: 'HP 1: Cul-de-sac Center',
    remainingTime: 60,
    status: 'EMPTY',
    controllingTeam: null
  };

  private serverPlayers: any[] = [];
  private localHp: number = 100;

  constructor() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Light blue sky
    this.scene.fog = new THREE.FogExp2(0xb0c4de, 0.008);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    this.scene.add(this.camera); // Essential for camera-attached viewmodel gun rendering

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.id = 'game-canvas';
    document.body.appendChild(this.renderer.domElement);

    // 4. Lighting setup (Sunlight & Atmospheric Bounce over 1950s Nuketown)
    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x3f6212, 0.75);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    sunLight.position.set(45, 65, -35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.bias = -0.0002;
    const shadowDist = 50;
    sunLight.shadow.camera.left = -shadowDist;
    sunLight.shadow.camera.right = shadowDist;
    sunLight.shadow.camera.top = shadowDist;
    sunLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(sunLight);

    // 5. Initialize Subsystems
    this.map = new NuketownMap(this.scene);
    this.player = new PlayerController(this.camera);
    this.remotePlayers = new RemotePlayerManager(this.scene);
    this.effects = new EffectsManager(this.scene);
    this.hud = new GameHUD();

    this.player.onWeaponChange = (weaponId) => {
      this.net.sendWeaponSwitch(weaponId);
    };

    // 6. Network Client Callbacks
    this.net = new NetworkClient({
      onInit: (playerId, team) => {
        console.log(`Assigned Player ID: ${playerId}, Team: ${team}`);
        if (team === 'BRAVO') {
          this.player.pos.set(0, 1.65, 34);
          this.player.yaw = 0; // Look toward center (-Z)
        } else {
          this.player.pos.set(0, 1.65, -34);
          this.player.yaw = Math.PI; // Look toward center (+Z)
        }
      },
      onSnapshot: (snapshot: WorldSnapshotPacket) => {
        this.latestMatchState = snapshot.match;
        this.latestHardpointState = snapshot.hardpoint;
        this.serverPlayers = snapshot.players;

        // Check local player state in server snapshot
        const me = snapshot.players.find(p => p.id === this.net.myPlayerId);
        if (me) {
          this.localHp = me.hp;
          this.player.isDead = !!me.isDead;
          if (me.isDead && !this.wasDead) {
            this.wasDead = true;
            this.deathTimestamp = Date.now();
            this.killStreak = 0;
          } else if (!me.isDead && this.wasDead) {
            // Respawned on server: sync position & weapon ammo
            this.wasDead = false;
            this.player.pos.set(me.x, 1.65, me.z);
            this.player.yaw = me.team === 'BRAVO' ? 0 : Math.PI;
            this.player.setWeapon(this.player.activeWeaponId, false);
          }

          if (me.isDead) {
            const elapsed = (Date.now() - this.deathTimestamp) / 1000;
            this.hud.setDeadState(true, 3.5 - elapsed);
          } else {
            this.hud.setDeadState(false);
          }
        }

        // Sync other players and bots
        this.remotePlayers.syncPlayers(snapshot.players, this.net.myPlayerId);

        // Update Scoreboard & Match End state
        this.hud.updateScoreboard(snapshot.players, snapshot.match, this.net.myPlayerId);
        this.hud.setMatchEnd(snapshot.match, this.net.myTeam);

        // Update Hardpoint Visuals on Map
        this.map.updateActiveHardpoint(
          snapshot.hardpoint.zoneIndex,
          snapshot.hardpoint.status,
          snapshot.hardpoint.controllingTeam
        );
      },
      onHitmarker: (damage, isKill) => {
        sounds.playHitmarker(isKill);
        this.hud.showHitmarker(isKill);
        if (isKill) {
          // Scavenger perk: +30 reserve ammo on every kill
          this.player.reserveAmmo += 30;
          this.killStreak++;
          if (this.killStreak === 2) this.hud.showKillstreakBanner('DOUBLE KILL!');
          else if (this.killStreak === 3) this.hud.showKillstreakBanner('TRIPLE KILL!');
          else if (this.killStreak >= 4) this.hud.showKillstreakBanner(`${this.killStreak}x KILLING SPREE!`);
        }
      },
      onExplosion: (x, y, z, isFlash) => {
        this.effects.spawnExplosion(new THREE.Vector3(x, y, z), isFlash);
      },
      onFlashed: () => {
        this.hud.triggerFlashbang();
      },
      onKillfeed: (event) => {
        this.hud.addKillfeedItem(event);
      },
      onChatMessage: (sender, text, isWorld) => {
        this.hud.addChatMessage(sender, text, isWorld);
      },
      onPingUpdate: (pingMs) => {
        // ping handled in render loop
      }
    });

    this.setupHUDCallbacks();
    this.showWelcomeModal();
    this.setupResizeListener();

    // Start Main Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private setupHUDCallbacks() {
    this.hud.onSendChat = (text, channel) => {
      this.net.sendChatMessage(text, channel);
    };

    this.hud.onSelectWeapon = (weaponId) => {
      this.player.setWeapon(weaponId, true);
    };

    this.hud.onSettingsChange = (settings) => {
      if (settings.fov) {
        this.player.fovNormal = settings.fov;
      }
      if (settings.sens) {
        this.player.mouseSensitivity = settings.sens;
      }
      if (settings.vol !== undefined) {
        sounds.setVolume(settings.vol);
      }
    };
  }

  private showWelcomeModal() {
    const welcome = document.createElement('div');
    welcome.id = 'welcome-overlay';
    welcome.innerHTML = `
      <div class="welcome-box">
        <h1 class="welcome-title">PROJECT BLITZ</h1>
        <div class="welcome-sub">CODM HARDPOINT // NUKETOWN 5v5</div>
        <input type="text" id="username-input" class="username-input" placeholder="Enter Call Sign..." value="Ghost_${Math.floor(Math.random() * 899 + 100)}" maxlength="16" />
        <button id="btn-deploy" class="btn-start">DEPLOY TO BATTLE</button>
        <div class="controls-hint">
          <b>CONTROLS:</b> WASD to Move • SHIFT to Sprint • SPACE to Jump • C to Crouch<br>
          LEFT CLICK to Fire • RIGHT CLICK to Aim Down Sights • R to Reload • 1-4 for Weapons • ESC for Settings
        </div>
      </div>
    `;
    document.body.appendChild(welcome);

    document.getElementById('btn-deploy')?.addEventListener('click', () => {
      const input = document.getElementById('username-input') as HTMLInputElement;
      const username = input.value.trim() || 'Soldier';
      welcome.remove();
      this.isJoined = true;

      // Lock mouse cursor
      document.body.requestPointerLock();

      // Connect to Cloudflare Low-Latency Regional Edge Room
      this.net.connect(username, 'nuketown_apac_v1');
    });

    // Re-lock pointer on canvas click
    this.renderer.domElement.addEventListener('click', () => {
      if (this.isJoined && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });
  }

  private setupResizeListener() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private loop(currentTime: number) {
    requestAnimationFrame((t) => this.loop(t));

    const deltaSec = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Calculate FPS
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 500) {
      this.currentFps = (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    if (this.isJoined) {
      // 1. Update Local Player Controller & Check Firing (Runs at full refresh rate for 0ms input lag)
      const { didFire, fireOrigin, fireDir } = this.player.update(
        deltaSec,
        this.map.colliders,
        this.map.ramps
      );

      // 2. Throttle network input packets to 25Hz - prevents TCP bufferbloat & drops ping
      if (currentTime - this.lastNetworkTick >= 40) {
        this.lastNetworkTick = currentTime;
        const inputPacket = this.player.getInputPacket();
        this.net.sendInput(inputPacket);
      }

      // 3. Send Raycast Fire Packet if Shot with Client-Assisted Hit Registration
      if (didFire && fireOrigin && fireDir) {
        let hitTargetId: string | undefined;
        const myTeam = this.net.myTeam;
        let closestDist = 999;

        for (const p of this.serverPlayers) {
          if (p.id === this.net.myPlayerId || p.team === myTeam || p.isDead) continue;
          const dx = p.x - fireOrigin.x;
          const dz = p.z - fireOrigin.z;
          const dist = Math.hypot(dx, dz);
          if (dist < closestDist) {
            const normX = dx / dist;
            const normZ = dz / dist;
            const dot = fireDir.x * normX + fireDir.z * normZ;
            if (dot >= 0.94) {
              closestDist = dist;
              hitTargetId = p.id;
            }
          }
        }

        // Immediate 0ms Client-Side Predictive Feedback & Bullet Tracer
        if (hitTargetId) {
          sounds.playHitmarker(false);
          this.hud.showHitmarker(false);
        }

        if (this.player.activeWeaponId !== 'frag' && this.player.activeWeaponId !== 'flashbang' && this.player.activeWeaponId !== 'knife') {
          const tracerDist = hitTargetId ? closestDist : 55;
          const tracerStart = fireOrigin.clone().addScaledVector(fireDir, 0.8);
          tracerStart.y -= 0.12;
          const tracerEnd = fireOrigin.clone().addScaledVector(fireDir, tracerDist);
          this.effects.spawnTracer(tracerStart, tracerEnd, this.player.activeWeaponId === 'kar98k' ? 0x38bdf8 : 0xfef08a);
          this.effects.spawnImpactSparks(tracerEnd, hitTargetId ? 6 : 3);
        }

        this.net.sendFire(fireOrigin, fireDir, this.player.activeWeaponId, hitTargetId);
      }

      // 4. Update Remote Players & Visual Effects
      this.remotePlayers.update(deltaSec);
      this.effects.update(deltaSec);

      // 5. Update HUD elements & Reload Bar
      this.hud.setReloadProgress(this.player.isReloading, this.player.getReloadProgress());
      this.hud.updateHUD(
        this.localHp,
        this.player.ammo,
        this.player.reserveAmmo,
        this.player.activeWeaponId,
        this.latestMatchState,
        this.latestHardpointState,
        this.currentFps,
        this.net.currentPing,
        this.player.pos.x,
        this.player.pos.z,
        this.player.yaw,
        this.serverPlayers,
        this.player.isAiming
      );
    }

    // 6. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Boot the game
window.addEventListener('DOMContentLoaded', () => {
  new BlitzGame();
});
