// Shared Types & Network Packet Definitions for Project Blitz FPS

export type Team = 'ALPHA' | 'BRAVO';

export interface WeaponDef {
  id: string;
  name: string;
  slot: 'PRIMARY' | 'SECONDARY' | 'LETHAL' | 'TACTICAL';
  damage: number;
  fireRate: number; // shots per minute
  magSize: number;
  reserveAmmo: number;
  reloadTime: number; // seconds
  range: number; // meters
  spread: number; // base spread angle in radians
  recoilPitch: number;
  isAutomatic: boolean;
  isPellet?: boolean; // Shotgun
  pelletCount?: number;
  blastRadius?: number; // Explosive
}

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
  // Primary Weapons
  'ak47': {
    id: 'ak47',
    name: 'AK-47',
    slot: 'PRIMARY',
    damage: 35,
    fireRate: 600,
    magSize: 30,
    reserveAmmo: 90,
    reloadTime: 2.2,
    range: 75,
    spread: 0.012,
    recoilPitch: 0.03,
    isAutomatic: true
  },
  'm4a1': {
    id: 'm4a1',
    name: 'M4A1',
    slot: 'PRIMARY',
    damage: 30,
    fireRate: 750,
    magSize: 30,
    reserveAmmo: 90,
    reloadTime: 2.0,
    range: 70,
    spread: 0.009,
    recoilPitch: 0.022,
    isAutomatic: true
  },
  'mp5': {
    id: 'mp5',
    name: 'MP5',
    slot: 'PRIMARY',
    damage: 25,
    fireRate: 800,
    magSize: 30,
    reserveAmmo: 90,
    reloadTime: 1.8,
    range: 40,
    spread: 0.015,
    recoilPitch: 0.018,
    isAutomatic: true
  },
  'pp19': {
    id: 'pp19',
    name: 'PP19 Bizon',
    slot: 'PRIMARY',
    damage: 22,
    fireRate: 850,
    magSize: 64,
    reserveAmmo: 128,
    reloadTime: 2.4,
    range: 45,
    spread: 0.016,
    recoilPitch: 0.015,
    isAutomatic: true
  },
  'kar98k': {
    id: 'kar98k',
    name: 'Kar98k',
    slot: 'PRIMARY',
    damage: 150, // 1-shot torso/head
    fireRate: 48,
    magSize: 5,
    reserveAmmo: 30,
    reloadTime: 3.0,
    range: 120,
    spread: 0.001,
    recoilPitch: 0.07,
    isAutomatic: false
  },
  'model680': {
    id: 'model680',
    name: 'Model 680',
    slot: 'PRIMARY',
    damage: 16, // per pellet
    fireRate: 65,
    magSize: 8,
    reserveAmmo: 32,
    reloadTime: 2.8,
    range: 20,
    spread: 0.06,
    recoilPitch: 0.06,
    isAutomatic: false,
    isPellet: true,
    pelletCount: 8
  },

  // Secondary Weapons
  'pistol1911': {
    id: 'pistol1911',
    name: '1911 Pistol',
    slot: 'SECONDARY',
    damage: 45,
    fireRate: 350,
    magSize: 15,
    reserveAmmo: 45,
    reloadTime: 1.5,
    range: 35,
    spread: 0.015,
    recoilPitch: 0.025,
    isAutomatic: false
  },
  'deagle': {
    id: 'deagle',
    name: 'Desert Eagle',
    slot: 'SECONDARY',
    damage: 65,
    fireRate: 240,
    magSize: 7,
    reserveAmmo: 28,
    reloadTime: 1.8,
    range: 50,
    spread: 0.012,
    recoilPitch: 0.05,
    isAutomatic: false
  },
  'knife': {
    id: 'knife',
    name: 'Combat Knife',
    slot: 'SECONDARY',
    damage: 150,
    fireRate: 90,
    magSize: 1,
    reserveAmmo: 999,
    reloadTime: 0.5,
    range: 2.2,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false
  },

  // Lethal
  'frag': {
    id: 'frag',
    name: 'Frag Grenade',
    slot: 'LETHAL',
    damage: 150,
    fireRate: 30,
    magSize: 1,
    reserveAmmo: 1,
    reloadTime: 1.0,
    range: 30,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false,
    blastRadius: 5
  },
  'thermite': {
    id: 'thermite',
    name: 'Thermite',
    slot: 'LETHAL',
    damage: 40,
    fireRate: 30,
    magSize: 1,
    reserveAmmo: 1,
    reloadTime: 1.0,
    range: 35,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false,
    blastRadius: 4
  },
  'semtex': {
    id: 'semtex',
    name: 'Semtex',
    slot: 'LETHAL',
    damage: 180,
    fireRate: 30,
    magSize: 1,
    reserveAmmo: 1,
    reloadTime: 1.0,
    range: 30,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false,
    blastRadius: 5
  },

  // Tactical
  'flashbang': {
    id: 'flashbang',
    name: 'Flashbang',
    slot: 'TACTICAL',
    damage: 5,
    fireRate: 30,
    magSize: 1,
    reserveAmmo: 1,
    reloadTime: 1.0,
    range: 30,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false,
    blastRadius: 8
  },
  'smoke': {
    id: 'smoke',
    name: 'Smoke Grenade',
    slot: 'TACTICAL',
    damage: 0,
    fireRate: 30,
    magSize: 1,
    reserveAmmo: 1,
    reloadTime: 1.0,
    range: 30,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false,
    blastRadius: 6
  },
  'stun': {
    id: 'stun',
    name: 'Stun Grenade',
    slot: 'TACTICAL',
    damage: 10,
    fireRate: 30,
    magSize: 1,
    reserveAmmo: 1,
    reloadTime: 1.0,
    range: 30,
    spread: 0.0,
    recoilPitch: 0.0,
    isAutomatic: false,
    blastRadius: 7
  }
};

export interface PlayerInputPacket {
  type: 'INPUT';
  seq: number;
  timestamp: number;
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  fire: boolean;
  aimDownSights: boolean;
  yaw: number;
  pitch: number;
  activeWeaponSlot: 'PRIMARY' | 'SECONDARY' | 'LETHAL' | 'TACTICAL';
}

export interface PlayerNetState {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  activeWeapon: string;
  ammo: number;
  reserveAmmo: number;
  isReloading: boolean;
  isFiring: boolean;
  kills: number;
  deaths: number;
  score: number;
  hardpointSecs: number;
}

export interface HardpointZoneDef {
  index: number;
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

// 5 Nuketown Hardpoint zones in exact canonical order
export const NUKETOWN_HARDPOINT_ZONES: HardpointZoneDef[] = [
  {
    index: 0,
    name: 'HP 1: Cul-de-sac Center (Bus & Truck)',
    minX: -4.5,
    maxX: 4.5,
    minY: 0,
    maxY: 4.0,
    minZ: -5.0,
    maxZ: 5.0,
    centerX: 0,
    centerY: 0.1,
    centerZ: 0
  },
  {
    index: 1,
    name: 'HP 2: House Alpha Living Room (Green House)',
    minX: -6.0,
    maxX: 4.0,
    minY: 0,
    maxY: 4.0,
    minZ: -28.0,
    maxZ: -20.0,
    centerX: -1.0,
    centerY: 0.1,
    centerZ: -24.0
  },
  {
    index: 2,
    name: 'HP 3: House Bravo Backyard Patio',
    minX: -5.0,
    maxX: 5.0,
    minY: 0,
    maxY: 4.0,
    minZ: 32.0,
    maxZ: 40.0,
    centerX: 0,
    centerY: 0.1,
    centerZ: 36.0
  },
  {
    index: 3,
    name: 'HP 4: House Alpha Backyard Patio',
    minX: -5.0,
    maxX: 5.0,
    minY: 0,
    maxY: 4.0,
    minZ: -40.0,
    maxZ: -32.0,
    centerX: 0,
    centerY: 0.1,
    centerZ: -36.0
  },
  {
    index: 4,
    name: 'HP 5: House Bravo Living Room (Yellow House)',
    minX: -4.0,
    maxX: 6.0,
    minY: 0,
    maxY: 4.0,
    minZ: 20.0,
    maxZ: 28.0,
    centerX: 1.0,
    centerY: 0.1,
    centerZ: 24.0
  }
];

export interface HardpointState {
  zoneIndex: number;
  zoneName: string;
  remainingTime: number; // 60s countdown
  status: 'UNCONTESTED' | 'CONTESTED' | 'EMPTY';
  controllingTeam: Team | null;
}

export interface MatchState {
  status: 'WAITING' | 'COUNTDOWN' | 'ACTIVE' | 'ENDED';
  alphaScore: number; // first to 250
  bravoScore: number;
  remainingMatchTime: number; // 600s
  winner: Team | 'TIE' | null;
}

// Server -> Client snapshot broadcasted at 20Hz
export interface WorldSnapshotPacket {
  type: 'SNAPSHOT';
  serverTick: number;
  timestamp: number;
  match: MatchState;
  hardpoint: HardpointState;
  players: PlayerNetState[];
}

export interface KillfeedEvent {
  killerId: string;
  killerName: string;
  killerTeam: Team;
  victimId: string;
  victimName: string;
  victimTeam: Team;
  weapon: string;
  isHeadshot: boolean;
}

export interface ChatMessagePacket {
  id: string;
  sender: string;
  senderTeam?: Team;
  text: string;
  timestamp: number;
  channel: 'WORLD' | 'MATCH' | 'TEAM';
}
