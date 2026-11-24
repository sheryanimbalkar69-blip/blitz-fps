import * as THREE from 'three';
import './ui/hud.css';
import { NuketownMap } from './engine/Map';
import { PlayerController } from './engine/PlayerController';
import { RemotePlayerManager } from './engine/RemotePlayer';
import { GameHUD } from './ui/HUD';
import { NetworkClient } from './engine/NetworkClient';
import { sounds } from './engine/Audio';
import { WorldSnapshotPacket, MatchState, HardpointState } from '../../shared/packets';

class BlitzGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private map: NuketownMap;
  private player: PlayerController;
  private remotePlayers: RemotePlayerManager;
  private hud: GameHUD;
  private net: NetworkClient;

  private lastTime: number = performance.now();
  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();
  private currentFps: number = 60;
  private isJoined: boolean = false;

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

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'game-canvas';
    document.body.appendChild(this.renderer.domElement);

    // 4. Lighting setup (Sunlight over 1950s Nuketown)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    sunLight.position.set(40, 60, -30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    const shadowDist = 45;
    sunLight.shadow.camera.left = -shadowDist;
    sunLight.shadow.camera.right = shadowDist;
    sunLight.shadow.camera.top = shadowDist;
    sunLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(sunLight);

    // 5. Initialize Subsystems
    this.map = new NuketownMap(this.scene);
    this.player = new PlayerController(this.camera);
    this.remotePlayers = new RemotePlayerManager(this.scene);
    this.hud = new GameHUD();

    // 6. Network Client Callbacks
    this.net = new NetworkClient({
      onInit: (playerId, team) => {
        console.log(`Assigned Player ID: ${playerId}, Team: ${team}`);
        if (team === 'BRAVO') {
          this.player.pos.set(0, 1.6, 34);
          this.player.yaw = Math.PI;
        } else {
          this.player.pos.set(0, 1.6, -34);
          this.player.yaw = 0;
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
          if (me.isDead && this.localHp <= 0) {
            // Player death state
          }
        }

        // Sync other players and bots
        this.remotePlayers.syncPlayers(snapshot.players, this.net.myPlayerId);

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
      this.player.setWeapon(weaponId);
      this.net.sendWeaponSwitch(weaponId);
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

      // Connect to Cloudflare Durable Object Room
      this.net.connect(username, 'nuketown_room_alpha');
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
      // 1. Update Local Player Controller & Check Firing
      const { didFire, fireOrigin, fireDir } = this.player.update(deltaSec, this.map.colliders);

      // 2. Send 60Hz Input to Cloudflare Edge Game Server
      const inputPacket = this.player.getInputPacket();
      this.net.sendInput(inputPacket);

      // 3. Send Raycast Fire Packet if Shot
      if (didFire && fireOrigin && fireDir) {
        this.net.sendFire(fireOrigin, fireDir, this.player.activeWeaponId);
      }

      // 4. Update Remote Players (Smooth Lerp)
      this.remotePlayers.update(deltaSec);

      // 5. Update HUD elements
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
        this.serverPlayers
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
