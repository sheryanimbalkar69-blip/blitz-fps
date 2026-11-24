// Server-side Bot AI System for Project Blitz
import { Team, PlayerNetState, HardpointZoneDef, WEAPON_REGISTRY } from '../../shared/packets';

export interface BotState extends PlayerNetState {
  targetPlayerId: string | null;
  targetPos: { x: number; y: number; z: number } | null;
  shootCooldown: number;
  burstRemaining: number;
  nextWaypointIndex: number;
  aimJitterX: number;
  aimJitterY: number;
  reactionTimer: number;
}

// Key tactical waypoints on Nuketown
export const NUKETOWN_WAYPOINTS = [
  // Team Alpha Spawn & Backyard
  { id: 'alpha_spawn', x: 0, y: 1.0, z: -35 },
  { id: 'alpha_patio', x: 0, y: 1.0, z: -32 },
  { id: 'alpha_back_left', x: -10, y: 1.0, z: -32 },
  { id: 'alpha_back_right', x: 10, y: 1.0, z: -32 },
  
  // House Alpha (Green)
  { id: 'alpha_interior', x: -1.0, y: 1.0, z: -24 },
  { id: 'alpha_garage', x: 6.0, y: 1.0, z: -22 },
  { id: 'alpha_front_door', x: 0, y: 1.0, z: -16 },
  
  // Center Cul-de-Sac
  { id: 'center_bus_left', x: -5, y: 1.0, z: 0 },
  { id: 'center_hp', x: 0, y: 1.0, z: 0 },
  { id: 'center_truck_right', x: 5, y: 1.0, z: 0 },
  
  // House Bravo (Yellow)
  { id: 'bravo_front_door', x: 0, y: 1.0, z: 16 },
  { id: 'bravo_interior', x: 1.0, y: 1.0, z: 24 },
  { id: 'bravo_garage', x: -6.0, y: 1.0, z: 22 },
  
  // Team Bravo Spawn & Backyard
  { id: 'bravo_patio', x: 0, y: 1.0, z: 32 },
  { id: 'bravo_spawn', x: 0, y: 1.0, z: 35 },
  { id: 'bravo_back_left', x: -10, y: 1.0, z: 32 },
  { id: 'bravo_back_right', x: 10, y: 1.0, z: 32 },
  
  // Side Flanks (West / East)
  { id: 'west_alley_mid', x: -16, y: 1.0, z: 0 },
  { id: 'east_street_mid', x: 16, y: 1.0, z: 0 }
];

export class BotController {
  public static createBot(id: string, name: string, team: Team, weaponId: string = 'm4a1'): BotState {
    const isAlpha = team === 'ALPHA';
    const spawnZ = isAlpha ? -34 - Math.random() * 2 : 34 + Math.random() * 2;
    const spawnX = (Math.random() - 0.5) * 8;
    const weapon = WEAPON_REGISTRY[weaponId] || WEAPON_REGISTRY['m4a1'];

    return {
      id,
      name,
      team,
      isBot: true,
      x: spawnX,
      y: 1.0,
      z: spawnZ,
      yaw: isAlpha ? 0 : Math.PI,
      pitch: 0,
      hp: 100,
      maxHp: 100,
      isDead: false,
      activeWeapon: weaponId,
      ammo: weapon.magSize,
      reserveAmmo: weapon.reserveAmmo,
      isReloading: false,
      isFiring: false,
      kills: 0,
      deaths: 0,
      score: 0,
      hardpointSecs: 0,
      targetPlayerId: null,
      targetPos: null,
      shootCooldown: 0,
      burstRemaining: 0,
      nextWaypointIndex: 0,
      aimJitterX: 0,
      aimJitterY: 0,
      reactionTimer: 0.3
    };
  }

  public static updateBot(
    bot: BotState,
    allPlayers: PlayerNetState[],
    activeZone: HardpointZoneDef,
    deltaSec: number
  ): { shotFired: boolean; hitTargetId: string | null; damage: number } {
    let shotFired = false;
    let hitTargetId: string | null = null;
    let damage = 0;

    if (bot.isDead) return { shotFired, hitTargetId, damage };

    // 1. Scan for nearest visible enemy
    let nearestEnemy: PlayerNetState | null = null;
    let nearestDistSq = 35 * 35; // 35 meter engagement radius

    for (const p of allPlayers) {
      if (p.id === bot.id || p.team === bot.team || p.isDead) continue;
      const dx = p.x - bot.x;
      const dz = p.z - bot.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestEnemy = p;
      }
    }

    // 2. Decide movement destination: Hardpoint zone vs enemy
    let targetX = activeZone.centerX;
    let targetZ = activeZone.centerZ;

    if (nearestEnemy) {
      bot.targetPlayerId = nearestEnemy.id;
      // Face enemy with slight aim jitter
      const dx = nearestEnemy.x - bot.x;
      const dz = nearestEnemy.z - bot.z;
      const desiredYaw = Math.atan2(dx, dz);
      bot.yaw = desiredYaw + (Math.sin(Date.now() * 0.005) * 0.08);

      // Bot shooting logic
      bot.shootCooldown -= deltaSec;
      if (bot.shootCooldown <= 0) {
        const weapon = WEAPON_REGISTRY[bot.activeWeapon] || WEAPON_REGISTRY['m4a1'];
        if (bot.ammo > 0 && !bot.isReloading) {
          bot.ammo--;
          bot.isFiring = true;
          shotFired = true;
          bot.shootCooldown = 60 / weapon.fireRate;
          
          // Accuracy calculation (around 50% hit probability at mid range)
          const hitChance = Math.max(0.2, 0.65 - Math.sqrt(nearestDistSq) * 0.015);
          if (Math.random() < hitChance) {
            hitTargetId = nearestEnemy.id;
            damage = weapon.damage;
          }
        } else if (bot.ammo <= 0 && !bot.isReloading && bot.reserveAmmo > 0) {
          bot.isReloading = true;
          setTimeout(() => {
            bot.ammo = weapon.magSize;
            bot.reserveAmmo = Math.max(0, bot.reserveAmmo - weapon.magSize);
            bot.isReloading = false;
          }, weapon.reloadTime * 1000);
        }
      }
    } else {
      bot.targetPlayerId = null;
      bot.isFiring = false;
      const dx = targetX - bot.x;
      const dz = targetZ - bot.z;
      bot.yaw = Math.atan2(dx, dz);
    }

    // 3. Move toward target destination (Hardpoint zone or holding position)
    const distToZone = Math.hypot(targetX - bot.x, targetZ - bot.z);
    if (distToZone > 1.5) {
      const moveSpeed = 4.8; // m/s (sprinting tactical movement)
      const moveX = Math.sin(bot.yaw) * moveSpeed * deltaSec;
      const moveZ = Math.cos(bot.yaw) * moveSpeed * deltaSec;
      
      // Keep inside map bounds
      bot.x = Math.max(-18, Math.min(18, bot.x + moveX));
      bot.z = Math.max(-38, Math.min(38, bot.z + moveZ));
    }

    return { shotFired, hitTargetId, damage };
  }
}
