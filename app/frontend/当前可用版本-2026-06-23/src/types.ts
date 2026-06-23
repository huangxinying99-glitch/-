export interface Entity {
  id: string;
  type: 'player' | 'platform' | 'enemy' | 'item' | 'goal' | 'hazard' | 'mud' | 'pipe' | 'vine' | 'decoration' | 'pillar' | 'slope' | 'pea-shooter' | 'cannon' | 'pit-spinner';
  x: number;
  y: number;
  width: number;
  height: number;
  hidden?: boolean;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpsRemaining: number;
  facing: 'left' | 'right';
  // Player specific
  squashX?: number;
  squashY?: number;
  lastHitTime?: number;
  // Enemy specific
  enemyType?: 'snail' | 'monster1' | 'rabbit' | 'frog' | 'mole' | 'piranha' | 'eagle';
  baseWidth?: number;
  baseHeight?: number;
  renderScale?: number;
  isCeiling?: boolean;
  isDead?: boolean;
  isSquashed?: boolean;
  deathTime?: number;
  phase?: number;
  scrunch?: number;
  lastAttackTime?: number;
  lastBounceTime?: number;
  isAttacking?: boolean;
  originalY?: number;
  mouthOpen?: boolean;
  anchorX?: number;
  segments?: number;
  projectileSpawned?: boolean;
  rabbitMode?: 'idle' | 'inflate' | 'bounce' | 'hold' | 'leak';
  rabbitModeStart?: number;
  rabbitModeSeed?: number;
  rabbitModeBaseX?: number;
  rabbitModeBaseY?: number;
  rabbitModeDriftX?: number;
  rabbitModeDriftY?: number;
  rabbitModeSpinDir?: number;
  moleBaseY?: number;
  // Eagle specific
  diveState?: 'cruising' | 'diving' | 'stuck' | 'returning';
  diveTarget?: { x: number; y: number };
  struggleCount?: number;
  lastStruggleTime?: number;
  returnDir?: number;
  returnBoost?: number;
  // Item specific
  itemType?: 'coin' | 'flower' | 'star' | 'mushroom' | 'carrot' | 'arrow';
  flowerVariant?: 'single' | 'bunch'; // for decorative flowers converted to items
  collectingInfo?: { startTime: number; type: string };
  coinPopInfo?: { startTime: number };
  coinCollected?: boolean;
  // Player specific - shoot animation
  shootTime?: number;
  // Pipe specific
  isTriggered?: boolean;
  hasFlower?: boolean;
  // Thorn specific
  thornHitTime?: number;
  // Sub-world
  subWorld?: boolean;
  // Pillar specific (Level 6) - pillar extends down from floating platform
  pillarSpeed?: number;
  pillarMaxY?: number;
  pillarMinY?: number;
  // Slope specific (Level 7)
  slopeDirection?: 'left' | 'right'; // direction slope goes down
  slopeHeight?: number; // height difference
  lastShootTime?: number;
  shootInterval?: number;
  isCharging?: boolean;
  chargeStartTime?: number;
  squishTime?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isDead: boolean;
  subWorld: boolean;
  color?: string;
  projectileType?: 'seed' | 'photo-ball' | 'pea' | 'pea3' | 'eagle-bullet';
  rotation?: number;
  trail?: Array<{ x: number; y: number; age: number }>;
}

export interface GameState {
  player: Entity;
  entities: Entity[];
  projectiles: Projectile[];
  score: number;
  coins: number;
  currentLevel: number;
  inSubWorld: boolean;
  gameOver: boolean;
  gameWon: boolean;
  gameStarted: boolean;
  cameraX: number;
  lives: number;
  lastDamageTime: number;
  isClimbing: boolean;
  stars: number;
}
