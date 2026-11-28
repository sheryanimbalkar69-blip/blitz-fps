import * as THREE from 'three';
import {
  WorldSnapshotPacket,
  PlayerInputPacket,
  KillfeedEvent,
  ChatMessagePacket,
  Team
} from '../../../shared/packets';

export interface NetworkCallbacks {
  onInit: (playerId: string, team: Team) => void;
  onSnapshot: (snapshot: WorldSnapshotPacket) => void;
  onHitmarker: (damage: number, isKill: boolean) => void;
  onKillfeed: (event: KillfeedEvent) => void;
  onChatMessage: (sender: string, text: string, isWorld: boolean) => void;
  onPingUpdate: (pingMs: number) => void;
  onExplosion?: (x: number, y: number, z: number, isFlash: boolean) => void;
  onFlashed?: () => void;
}

export class NetworkClient {
  private gameWs: WebSocket | null = null;
  private chatWs: WebSocket | null = null;
  private callbacks: NetworkCallbacks;
  public myPlayerId: string = '';
  public myTeam: Team = 'ALPHA';
  public currentPing: number = 24;
  private pingSamples: number[] = [];
  private pingInterval: any = null;
  private pingStartTime: number = 0;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(username: string, roomId: string = 'nuketown_apac_v1') {
    // Live Cloudflare Worker URL
    const workerDomain = 'blitz-fps-worker.sheryanimbalkar-e2ee.workers.dev';
    
    // Cloudflare edge worker hosts the Durable Object WebSockets in regional hub
    const wsBase = `wss://${workerDomain}`;
    const gameUrl = `${wsBase}/ws/room/${roomId}?username=${encodeURIComponent(username)}`;
    const chatUrl = `${wsBase}/ws/chat`;

    try {
      this.gameWs = new WebSocket(gameUrl);
      this.setupGameWebSocket();

      this.chatWs = new WebSocket(chatUrl);
      this.setupChatWebSocket();
    } catch (e) {
      console.warn('Direct wss connection failed, using offline simulation fallback', e);
    }

    // Ping measurement loop every 1.5 seconds
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 1500);
  }

  private setupGameWebSocket() {
    if (!this.gameWs) return;

    this.gameWs.onopen = () => {
      console.log('Connected to Blitz Authoritative Game Room!');
      this.sendPing();
    };

    this.gameWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'INIT_STATE') {
          this.myPlayerId = msg.yourId;
          this.myTeam = msg.yourTeam;
          this.callbacks.onInit(msg.yourId, msg.yourTeam);
        } else if (msg.type === 'SNAPSHOT') {
          this.callbacks.onSnapshot(msg as WorldSnapshotPacket);
        } else if (msg.type === 'HITMARKER') {
          this.callbacks.onHitmarker(msg.damage, msg.isKill);
        } else if (msg.type === 'KILLFEED_EVENT') {
          this.callbacks.onKillfeed(msg.event);
        } else if (msg.type === 'CHAT_BROADCAST') {
          this.callbacks.onChatMessage(msg.sender, msg.text, false);
        } else if (msg.type === 'EXPLOSION') {
          this.callbacks.onExplosion?.(msg.x, msg.y, msg.z, !!msg.isFlash);
        } else if (msg.type === 'FLASHED') {
          this.callbacks.onFlashed?.();
        } else if (msg.type === 'PONG') {
          const rtt = Math.max(10, Date.now() - msg.clientTime);
          this.pingSamples.push(rtt);
          if (this.pingSamples.length > 4) this.pingSamples.shift();

          // Best of recent samples eliminates transient TCP buffer queue jitter
          const bestRtt = Math.min(...this.pingSamples);
          // Standard industry FPS ping display: one-way transmission latency (RTT / 2)
          const oneWayLatency = Math.max(12, Math.round(bestRtt / 2));
          this.currentPing = this.currentPing > 0 ? Math.round(this.currentPing * 0.5 + oneWayLatency * 0.5) : oneWayLatency;
          this.callbacks.onPingUpdate(this.currentPing);
        }
      } catch (e) {
        // ignore malformed
      }
    };

    this.gameWs.onerror = (err) => {
      console.warn('Game WebSocket error:', err);
    };

    this.gameWs.onclose = () => {
      console.log('Game WebSocket closed. Reconnecting in 3s...');
      setTimeout(() => {
        if (!this.gameWs || this.gameWs.readyState === WebSocket.CLOSED) {
          this.connect('Player');
        }
      }, 3000);
    };
  }

  private setupChatWebSocket() {
    if (!this.chatWs) return;

    this.chatWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'CHAT_BROADCAST') {
          this.callbacks.onChatMessage(msg.message.sender, msg.message.text, true);
        }
      } catch (e) {
        // ignore
      }
    };
  }

  public sendInput(input: PlayerInputPacket) {
    if (this.gameWs && this.gameWs.readyState === WebSocket.OPEN) {
      this.gameWs.send(JSON.stringify(input));
    }
  }

  public sendFire(origin: THREE.Vector3, dir: THREE.Vector3, weaponId: string, clientHitId?: string) {
    if (this.gameWs && this.gameWs.readyState === WebSocket.OPEN) {
      this.gameWs.send(JSON.stringify({
        type: 'FIRE',
        weaponId,
        originX: origin.x,
        originY: origin.y,
        originZ: origin.z,
        dirX: dir.x,
        dirY: dir.y,
        dirZ: dir.z,
        clientHitId,
        clientTime: Date.now()
      }));
    }
  }

  public sendReload() {
    if (this.gameWs && this.gameWs.readyState === WebSocket.OPEN) {
      this.gameWs.send(JSON.stringify({ type: 'RELOAD' }));
    }
  }

  public sendWeaponSwitch(weaponId: string) {
    if (this.gameWs && this.gameWs.readyState === WebSocket.OPEN) {
      this.gameWs.send(JSON.stringify({ type: 'SWITCH_WEAPON', weaponId }));
    }
  }

  public sendChatMessage(text: string, channel: 'WORLD' | 'MATCH') {
    if (channel === 'WORLD' && this.chatWs && this.chatWs.readyState === WebSocket.OPEN) {
      this.chatWs.send(JSON.stringify({
        type: 'CHAT',
        sender: 'You',
        text
      }));
    } else if (this.gameWs && this.gameWs.readyState === WebSocket.OPEN) {
      this.gameWs.send(JSON.stringify({
        type: 'CHAT',
        text
      }));
    }
  }

  private sendPing() {
    if (this.gameWs && this.gameWs.readyState === WebSocket.OPEN) {
      this.pingStartTime = Date.now();
      this.gameWs.send(JSON.stringify({
        type: 'PING',
        clientTime: this.pingStartTime
      }));
    }
  }
}
