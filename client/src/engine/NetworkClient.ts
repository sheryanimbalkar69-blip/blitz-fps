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
}

export class NetworkClient {
  private gameWs: WebSocket | null = null;
  private chatWs: WebSocket | null = null;
  private callbacks: NetworkCallbacks;
  public myPlayerId: string = '';
  public myTeam: Team = 'ALPHA';
  public currentPing: number = 24;

  private pingInterval: any = null;
  private pingStartTime: number = 0;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(username: string, roomId: string = 'nuketown_room_alpha') {
    // Live Cloudflare Worker URL or local fallback
    const workerDomain = 'blitz-fps-worker.sheryanimbalkar-e2ee.workers.dev';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Cloudflare edge worker hosts the Durable Object WebSockets
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

    // Ping measurement loop every 2 seconds
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 2000);
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
        } else if (msg.type === 'PONG') {
          const rtt = Date.now() - msg.clientTime;
          this.currentPing = Math.max(8, rtt);
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

  public sendFire(origin: THREE.Vector3, dir: THREE.Vector3, weaponId: string) {
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
