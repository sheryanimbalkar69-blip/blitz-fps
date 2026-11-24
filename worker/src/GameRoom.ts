// Authoritative Game Server Durable Object for Project Blitz
import {
  Team,
  PlayerNetState,
  PlayerInputPacket,
  WorldSnapshotPacket,
  NUKETOWN_HARDPOINT_ZONES,
  HardpointState,
  MatchState,
  KillfeedEvent,
  WEAPON_REGISTRY
} from '../../shared/packets';
import { BotController, BotState } from './BotAI';

interface SessionData {
  playerId: string;
  username: string;
  team: Team;
  lastInputSeq: number;
  lastInputTime: number;
}

export class GameRoom {
  private state: DurableObjectState;
  private env: any;
  private sessions: Map<WebSocket, SessionData> = new Map();
  private players: Map<string, PlayerNetState> = new Map();
  private bots: Map<string, BotState> = new Map();
  private playerInputs: Map<string, PlayerInputPacket> = new Map();

  // Match State
  private matchState: MatchState = {
    status: 'ACTIVE',
    alphaScore: 0,
    bravoScore: 0,
    remainingMatchTime: 600, // 10 minutes
    winner: null
  };

  // Hardpoint State
  private currentZoneIndex: number = 0;
  private zoneTimer: number = 60.0;
  private hardpointState: HardpointState = {
    zoneIndex: 0,
    zoneName: NUKETOWN_HARDPOINT_ZONES[0].name,
    remainingTime: 60,
    status: 'EMPTY',
    controllingTeam: null
  };

  private serverTick: number = 0;
  private tickInterval: any = null;
  private lastScoreTime: number = Date.now();
  private lastTickTime: number = Date.now();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.initializeBots();
    this.startTickLoop();
  }

  private initializeBots() {
    // Standard 5v5 room. Initially 5 bots on Alpha, 5 on Bravo until human players join.
    const botNamesAlpha = ['Ghost', 'Soap', 'Price', 'Roach', 'Gaz'];
    const botNamesBravo = ['Makarov', 'Yuri', 'Nikolai', 'Krueger', 'Mace'];
    const weapons = ['m4a1', 'ak47', 'mp5', 'pp19', 'model680'];

    botNamesAlpha.forEach((name, i) => {
      const id = `bot_alpha_${i}`;
      this.bots.set(id, BotController.createBot(id, `[BOT] ${name}`, 'ALPHA', weapons[i % weapons.length]));
    });

    botNamesBravo.forEach((name, i) => {
      const id = `bot_bravo_${i}`;
      this.bots.set(id, BotController.createBot(id, `[BOT] ${name}`, 'BRAVO', weapons[i % weapons.length]));
    });
  }

  private startTickLoop() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 50); // 20Hz server tick
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [clientWs, serverWs] = Object.values(pair);

      await this.handleWebSocket(serverWs, url);

      return new Response(null, {
        status: 101,
        webSocket: clientWs
      });
    }

    return new Response('Blitz GameRoom Active', { status: 200 });
  }

  private async handleWebSocket(ws: WebSocket, url: URL) {
    ws.accept();

    const username = url.searchParams.get('username') || `Player_${Math.floor(Math.random() * 9000 + 1000)}`;
    const playerId = `usr_${crypto.randomUUID().slice(0, 8)}`;

    // Balance teams based on current human player count
    let alphaCount = 0;
    let bravoCount = 0;
    for (const p of this.players.values()) {
      if (p.team === 'ALPHA') alphaCount++;
      else bravoCount++;
    }
    const team: Team = alphaCount <= bravoCount ? 'ALPHA' : 'BRAVO';

    // Replace a bot on the assigned team to keep exact 5v5 balance
    const botKeys = Array.from(this.bots.keys()).filter(k => this.bots.get(k)?.team === team);
    if (botKeys.length > 0) {
      this.bots.delete(botKeys[0]);
    }

    // Spawn player in their team's backyard
    const isAlpha = team === 'ALPHA';
    const spawnZ = isAlpha ? -34 - Math.random() * 2 : 34 + Math.random() * 2;
    const spawnX = (Math.random() - 0.5) * 8;
    const defaultWeapon = WEAPON_REGISTRY['m4a1'];

    const newPlayer: PlayerNetState = {
      id: playerId,
      name: username,
      team,
      isBot: false,
      x: spawnX,
      y: 1.0,
      z: spawnZ,
      yaw: isAlpha ? 0 : Math.PI,
      pitch: 0,
      hp: 100,
      maxHp: 100,
      isDead: false,
      activeWeapon: 'm4a1',
      ammo: defaultWeapon.magSize,
      reserveAmmo: defaultWeapon.reserveAmmo,
      isReloading: false,
      isFiring: false,
      kills: 0,
      deaths: 0,
      score: 0,
      hardpointSecs: 0
    };

    this.players.set(playerId, newPlayer);
    this.sessions.set(ws, {
      playerId,
      username,
      team,
      lastInputSeq: 0,
      lastInputTime: Date.now()
    });

    // Send initial join ack
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      yourId: playerId,
      yourTeam: team,
      mapName: 'Nuketown',
      zones: NUKETOWN_HARDPOINT_ZONES
    }));

    ws.addEventListener('message', (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        this.handleClientMessage(ws, playerId, data);
      } catch (e) {
        // malformed packet ignored
      }
    });

    ws.addEventListener('close', () => {
      this.handlePlayerDisconnect(ws, playerId, team);
    });
  }

  private handlePlayerDisconnect(ws: WebSocket, playerId: string, team: Team) {
    this.sessions.delete(ws);
    this.players.delete(playerId);
    this.playerInputs.delete(playerId);

    // Re-add a bot to preserve 5v5
    const botId = `bot_${team.toLowerCase()}_${Date.now() % 1000}`;
    this.bots.set(botId, BotController.createBot(botId, `[BOT] Replacement`, team));
  }

  private handleClientMessage(ws: WebSocket, playerId: string, data: any) {
    const player = this.players.get(playerId);
    if (!player) return;

    if (data.type === 'INPUT') {
      const input = data as PlayerInputPacket;
      this.playerInputs.set(playerId, input);

      const session = this.sessions.get(ws);
      if (session) {
        session.lastInputSeq = input.seq;
      }
    } else if (data.type === 'FIRE') {
      this.handlePlayerShot(player, data);
    } else if (data.type === 'RELOAD') {
      const weapon = WEAPON_REGISTRY[player.activeWeapon];
      if (weapon && !player.isReloading && player.ammo < weapon.magSize && player.reserveAmmo > 0) {
        player.isReloading = true;
        setTimeout(() => {
          const needed = weapon.magSize - player.ammo;
          const reloadAmount = Math.min(needed, player.reserveAmmo);
          player.ammo += reloadAmount;
          player.reserveAmmo -= reloadAmount;
          player.isReloading = false;
        }, weapon.reloadTime * 1000);
      }
    } else if (data.type === 'SWITCH_WEAPON') {
      if (WEAPON_REGISTRY[data.weaponId]) {
        player.activeWeapon = data.weaponId;
        const w = WEAPON_REGISTRY[data.weaponId];
        player.ammo = w.magSize;
        player.reserveAmmo = w.reserveAmmo;
        player.isReloading = false;
      }
    } else if (data.type === 'CHAT') {
      this.broadcast({
        type: 'CHAT_BROADCAST',
        sender: player.name,
        senderTeam: player.team,
        text: String(data.text || '').slice(0, 150),
        timestamp: Date.now()
      });
    } else if (data.type === 'PING') {
      ws.send(JSON.stringify({
        type: 'PONG',
        clientTime: data.clientTime,
        serverTime: Date.now()
      }));
    }
  }

  private handlePlayerShot(shooter: PlayerNetState, data: any) {
    if (shooter.isDead || shooter.isReloading || shooter.ammo <= 0) return;
    const weapon = WEAPON_REGISTRY[shooter.activeWeapon] || WEAPON_REGISTRY['m4a1'];
    shooter.ammo--;

    const origin = { x: data.originX || shooter.x, y: (data.originY || shooter.y) + 1.5, z: data.originZ || shooter.z };
    const dir = { x: data.dirX, y: data.dirY, z: data.dirZ };

    const targets: PlayerNetState[] = [
      ...Array.from(this.players.values()),
      ...Array.from(this.bots.values())
    ].filter(p => p.id !== shooter.id && p.team !== shooter.team && !p.isDead);

    // 1. Client-Assisted Lag Compensation: If client raycast landed on an entity
    if (data.clientHitId) {
      const hitTarget = targets.find(t => t.id === data.clientHitId);
      if (hitTarget) {
        const dist = Math.hypot(hitTarget.x - origin.x, hitTarget.z - origin.z);
        // Generous lag compensation rewind tolerance (up to 3.5m rewind window)
        if (dist <= weapon.range + 5.0) {
          this.applyDamage(hitTarget, weapon.damage, shooter);
          return;
        }
      }
    }

    // 2. Authoritative Server Raycast fallback
    for (const target of targets) {
      const dx = target.x - origin.x;
      const dz = target.z - origin.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= weapon.range) {
        const normX = dx / dist;
        const normZ = dz / dist;
        const dot = dir.x * normX + dir.z * normZ;

        // Lag-friendly angle tolerance
        const angleThreshold = Math.max(0.92, 1.0 - (1.2 / Math.max(dist, 1)));
        if (dot >= angleThreshold) {
          this.applyDamage(target, weapon.damage, shooter);
          break;
        }
      }
    }
  }

  private applyDamage(victim: PlayerNetState, damage: number, attacker: PlayerNetState) {
    victim.hp = Math.max(0, victim.hp - damage);

    // Notify shooter of hitmarker
    for (const [ws, sess] of this.sessions.entries()) {
      if (sess.playerId === attacker.id) {
        ws.send(JSON.stringify({
          type: 'HITMARKER',
          damage,
          isKill: victim.hp <= 0
        }));
        break;
      }
    }

    if (victim.hp <= 0 && !victim.isDead) {
      this.handlePlayerDeath(victim, attacker);
    }
  }

  private handlePlayerDeath(victim: PlayerNetState, killer: PlayerNetState) {
    victim.isDead = true;
    victim.deaths++;
    killer.kills++;
    killer.score += 100;

    const killEvent: KillfeedEvent = {
      killerId: killer.id,
      killerName: killer.name,
      killerTeam: killer.team,
      victimId: victim.id,
      victimName: victim.name,
      victimTeam: victim.team,
      weapon: killer.activeWeapon,
      isHeadshot: Math.random() < 0.25
    };

    this.broadcast({
      type: 'KILLFEED_EVENT',
      event: killEvent
    });

    // Respawn after 3.5 seconds
    setTimeout(() => {
      victim.isDead = false;
      victim.hp = victim.maxHp;
      const isAlpha = victim.team === 'ALPHA';
      victim.z = isAlpha ? -34 - Math.random() * 2 : 34 + Math.random() * 2;
      victim.x = (Math.random() - 0.5) * 8;
      const w = WEAPON_REGISTRY[victim.activeWeapon];
      if (w) {
        victim.ammo = w.magSize;
        victim.reserveAmmo = w.reserveAmmo;
      }
    }, 3500);
  }

  private tick() {
    this.serverTick++;
    const now = Date.now();
    const deltaSec = Math.min((now - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = now;

    // 1. Process Human Player Movement
    for (const [playerId, player] of this.players.entries()) {
      if (player.isDead) continue;
      const input = this.playerInputs.get(playerId);
      if (input) {
        player.yaw = input.yaw;
        player.pitch = input.pitch;

        const speed = input.sprint ? 6.2 : (input.crouch ? 2.5 : 4.5);
        let moveX = 0;
        let moveZ = 0;

        if (input.forward) {
          moveX += Math.sin(input.yaw);
          moveZ += Math.cos(input.yaw);
        }
        if (input.back) {
          moveX -= Math.sin(input.yaw);
          moveZ -= Math.cos(input.yaw);
        }
        if (input.left) {
          moveX += Math.sin(input.yaw + Math.PI / 2);
          moveZ += Math.cos(input.yaw + Math.PI / 2);
        }
        if (input.right) {
          moveX += Math.sin(input.yaw - Math.PI / 2);
          moveZ += Math.cos(input.yaw - Math.PI / 2);
        }

        const len = Math.hypot(moveX, moveZ);
        if (len > 0) {
          player.x += (moveX / len) * speed * deltaSec;
          player.z += (moveZ / len) * speed * deltaSec;
        }

        // Clamp to Nuketown playable field bounds
        player.x = Math.max(-18, Math.min(18, player.x));
        player.z = Math.max(-38, Math.min(38, player.z));
      }
    }

    // 2. Process Bots
    const activeZone = NUKETOWN_HARDPOINT_ZONES[this.currentZoneIndex];
    const allEntities = [...Array.from(this.players.values()), ...Array.from(this.bots.values())];

    for (const bot of this.bots.values()) {
      const { shotFired, hitTargetId, damage } = BotController.updateBot(bot, allEntities, activeZone, deltaSec);
      if (shotFired && hitTargetId) {
        const victim = this.players.get(hitTargetId) || this.bots.get(hitTargetId);
        if (victim) {
          this.applyDamage(victim, damage, bot);
        }
      }
    }

    // 3. Hardpoint Mechanics & Scoring
    this.updateHardpoint(allEntities, now, deltaSec);

    // 4. Broadcast 20Hz Compact Snapshot to Clients (Rounds numbers to eliminate JSON bloat & bufferbloat)
    const compactPlayers = allEntities.map(p => ({
      id: p.id,
      name: p.name,
      team: p.team,
      isBot: p.isBot,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      z: Math.round(p.z * 100) / 100,
      yaw: Math.round(p.yaw * 100) / 100,
      pitch: Math.round(p.pitch * 100) / 100,
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      isDead: p.isDead,
      activeWeapon: p.activeWeapon,
      ammo: p.ammo,
      reserveAmmo: p.reserveAmmo,
      isReloading: p.isReloading,
      isFiring: p.isFiring,
      kills: p.kills,
      deaths: p.deaths,
      score: p.score,
      hardpointSecs: p.hardpointSecs
    }));

    const snapshot: WorldSnapshotPacket = {
      type: 'SNAPSHOT',
      serverTick: this.serverTick,
      timestamp: now,
      match: this.matchState,
      hardpoint: this.hardpointState,
      players: compactPlayers
    };

    this.broadcast(snapshot);
  }

  private updateHardpoint(allEntities: PlayerNetState[], now: number, deltaSec: number) {
    if (this.matchState.status !== 'ACTIVE') return;

    // Countdown zone duration (60 seconds per zone)
    this.zoneTimer -= deltaSec;
    if (this.zoneTimer <= 0) {
      this.currentZoneIndex = (this.currentZoneIndex + 1) % NUKETOWN_HARDPOINT_ZONES.length;
      this.zoneTimer = 60.0;
    }

    const currentZone = NUKETOWN_HARDPOINT_ZONES[this.currentZoneIndex];
    let alphaInZone = 0;
    let bravoInZone = 0;

    for (const entity of allEntities) {
      if (entity.isDead) continue;
      if (
        entity.x >= currentZone.minX && entity.x <= currentZone.maxX &&
        entity.z >= currentZone.minZ && entity.z <= currentZone.maxZ
      ) {
        if (entity.team === 'ALPHA') alphaInZone++;
        else bravoInZone++;
      }
    }

    // Hardpoint state determination
    if (alphaInZone > 0 && bravoInZone > 0) {
      this.hardpointState.status = 'CONTESTED';
      this.hardpointState.controllingTeam = null;
    } else if (alphaInZone > 0 && bravoInZone === 0) {
      this.hardpointState.status = 'UNCONTESTED';
      this.hardpointState.controllingTeam = 'ALPHA';
    } else if (bravoInZone > 0 && alphaInZone === 0) {
      this.hardpointState.status = 'UNCONTESTED';
      this.hardpointState.controllingTeam = 'BRAVO';
    } else {
      this.hardpointState.status = 'EMPTY';
      this.hardpointState.controllingTeam = null;
    }

    this.hardpointState.zoneIndex = this.currentZoneIndex;
    this.hardpointState.zoneName = currentZone.name;
    this.hardpointState.remainingTime = Math.ceil(this.zoneTimer);

    // Score accumulation: 1 point per second for uncontested holding team
    if (now - this.lastScoreTime >= 1000) {
      this.lastScoreTime = now;
      if (this.hardpointState.controllingTeam === 'ALPHA') {
        this.matchState.alphaScore++;
        // Give players currently in zone capture time
        for (const p of allEntities) {
          if (p.team === 'ALPHA' && !p.isDead &&
              p.x >= currentZone.minX && p.x <= currentZone.maxX &&
              p.z >= currentZone.minZ && p.z <= currentZone.maxZ) {
            p.hardpointSecs++;
            p.score += 10;
          }
        }
      } else if (this.hardpointState.controllingTeam === 'BRAVO') {
        this.matchState.bravoScore++;
        for (const p of allEntities) {
          if (p.team === 'BRAVO' && !p.isDead &&
              p.x >= currentZone.minX && p.x <= currentZone.maxX &&
              p.z >= currentZone.minZ && p.z <= currentZone.maxZ) {
            p.hardpointSecs++;
            p.score += 10;
          }
        }
      }

      // Check win condition (250 points)
      if (this.matchState.alphaScore >= 250) {
        this.endMatch('ALPHA');
      } else if (this.matchState.bravoScore >= 250) {
        this.endMatch('BRAVO');
      }
    }
  }

  private async endMatch(winner: Team) {
    this.matchState.status = 'ENDED';
    this.matchState.winner = winner;

    this.broadcast({
      type: 'MATCH_OVER',
      winner,
      alphaScore: this.matchState.alphaScore,
      bravoScore: this.matchState.bravoScore
    });

    // Save match to D1 database
    try {
      if (this.env.DB) {
        await this.env.DB.prepare(
          `INSERT INTO matches (id, room_id, winner_team, alpha_score, bravo_score, duration_seconds)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          'nuketown_room_1',
          winner,
          this.matchState.alphaScore,
          this.matchState.bravoScore,
          600 - Math.floor(this.matchState.remainingMatchTime)
        ).run();
      }
    } catch (e) {
      console.error('Failed to save match to D1:', e);
    }
  }

  private broadcast(packet: any) {
    const payload = JSON.stringify(packet);
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(payload);
      } catch (e) {
        // ws closed
      }
    }
  }
}
