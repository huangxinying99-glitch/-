import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ENEMY_SPEED,
  FRICTION,
  GRAVITY,
  JUMP_STRENGTH,
  LEVELS,
  MOVE_SPEED,
  TILE_SIZE,
  SUB_WORLD_LEVELS,
} from './constants';
import { Entity, GameState, Projectile } from './types';
import { useGameLoop } from './hooks/useGameLoop';

function assetUrl(path: string) {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`;
}

// 鈹€鈹€鈹€ Helper Functions 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function createPlayer(level: string[]): Entity {
  let px = 50, py = 50;
  level.forEach((row, y) => {
    const x = row.indexOf('P');
    if (x !== -1) {
      px = x * TILE_SIZE;
      py = y * TILE_SIZE;
    }
  });
  return {
    id: 'player', type: 'player',
    x: px, y: py, width: 32, height: 32,
    vx: 0, vy: 0, onGround: false, jumpsRemaining: 2,
    facing: 'right', squashX: 1, squashY: 1,
  };
}

function createEntities(level: string[], isSubWorld = false, levelIndex = 0): Entity[] {
  const entities: Entity[] = [];
  let playerTileX = -1;

  level.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      const prefix = isSubWorld ? 'sub-' : '';
      const base = { vx: 0, vy: 0, onGround: false, jumpsRemaining: 0, facing: 'right' as const, subWorld: isSubWorld };
      if (char === 'P') {
        playerTileX = x * TILE_SIZE;
      }
      if (char === '#') {
        entities.push({ ...base, id: `${prefix}platform-${x}-${y}`, type: 'platform', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, onGround: true });
      } else if (char === 'S' || char === '*') {
        entities.push({ ...base, id: `${prefix}item-${x}-${y}`, type: 'item', itemType: char === 'S' ? 'flower' : 'star', flowerVariant: 'single', x: x * TILE_SIZE + 8, y: char === 'S' ? y * TILE_SIZE - 18 : y * TILE_SIZE + 8, width: 24, height: 24 });
      } else if (char === 'H') {
        entities.push({ ...base, id: `${prefix}carrot-${x}-${y}`, type: 'item', itemType: 'carrot', x: x * TILE_SIZE + 2, y: y * TILE_SIZE + 10, width: 36, height: 20 });
      } else if (char === 'N' || char === 'n') {
        entities.push({ ...base, id: `${prefix}snail-${x}-${y}`, type: 'enemy', enemyType: 'snail', isCeiling: char === 'n', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 43, height: 43, vx: -ENEMY_SPEED * 0.1, facing: 'left', originalY: y * TILE_SIZE, snailPhase: Math.random() * Math.PI * 2 });
      } else if (char === 'Y') {
        entities.push({ ...base, id: `${prefix}monster1-${x}-${y}`, type: 'enemy', enemyType: 'monster1', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 40, height: 40, vx: -ENEMY_SPEED * 0.8, facing: 'left', lastAttackTime: 0, isAttacking: false, projectileSpawned: false });
      } else if (char === 'R') {
        entities.push({ ...base, id: `${prefix}rabbit-${x}-${y}`, type: 'enemy', enemyType: 'rabbit', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 32, height: 32, vx: (Math.random() > 0.5 ? 1 : -1) * ENEMY_SPEED, facing: 'left' });
      } else if (char === 'K') {
        entities.push({ ...base, id: `${prefix}frog-${x}-${y}`, type: 'enemy', enemyType: 'frog', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 32, height: 32, vx: (Math.random() > 0.5 ? 1 : -1) * ENEMY_SPEED * 0.8, facing: 'left' });
      } else if (char === 'F') {
        // Piranha enemy + water hazard at same position (so water renders flush)
        entities.push({ ...base, id: `${prefix}piranha-${x}-${y}`, type: 'enemy', enemyType: 'piranha', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 32, height: 32, onGround: true, phase: Math.random() * Math.PI * 2, originalY: y * TILE_SIZE });
        entities.push({ ...base, id: `${prefix}hazard-f-${x}-${y}`, type: 'hazard', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'A') {
        // Level 10 uses bats instead of eagles
        if (levelIndex === 9) {
          entities.push({ ...base, id: `${prefix}bat-${x}-${y}`, type: 'enemy', enemyType: 'bat', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 56, height: 44, originalY: y * TILE_SIZE, lastShootTime: 0, batPhase: Math.random() * Math.PI * 2 });
        } else {
          entities.push({ ...base, id: `${prefix}eagle-${x}-${y}`, type: 'enemy', enemyType: 'eagle', x: x * TILE_SIZE, y: y * TILE_SIZE, width: 64, height: 48, originalY: y * TILE_SIZE, diveState: 'cruising', struggleCount: 0 });
        }
      } else if (char === 'Q') {
      } else if (char === 'W') {
        entities.push({ ...base, id: `${prefix}hazard-${x}-${y}`, type: 'hazard', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'L') {
        entities.push({ ...base, id: `${prefix}mud-${x}-${y}`, type: 'mud', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'T') {
        // Thorn/spike - instant death on contact
        entities.push({ ...base, id: `${prefix}thorn-${x}-${y}`, type: 'thorn', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'X') {
        // Individual left-facing slope tile (ascending left-to-right, high on right)
        entities.push({ ...base, id: `${prefix}slope-${x}-${y}`, type: 'slope', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, slopeDirection: 'left', onGround: true, tileCount: 1 });
      } else if (char === 'U') {
        entities.push({ ...base, id: `${prefix}pipe-up-${x}-${y}`, type: 'pipe', x: x * TILE_SIZE, y: y * TILE_SIZE - TILE_SIZE, width: TILE_SIZE * 2, height: TILE_SIZE * 2, onGround: true, isCeiling: false, ghost: isSubWorld });
      } else if (char === 'D') {
        entities.push({ ...base, id: `${prefix}pipe-down-${x}-${y}`, type: 'pipe', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE * 2, height: TILE_SIZE * 2, onGround: true, isCeiling: true, ghost: isSubWorld });
      } else if (char === 'I') {
        // Pillar: thick column that descends from floating platform to ground
        // Find ground level (row 13 = last row with '#')
        const groundY = 13 * TILE_SIZE;
        const pillarStartY = y * TILE_SIZE;
        entities.push({ ...base, id: `${prefix}pillar-${x}-${y}`, type: 'pillar', x: x * TILE_SIZE, y: pillarStartY, width: TILE_SIZE, height: groundY - pillarStartY, pillarSpeed: 1.5, pillarMinY: pillarStartY, pillarMaxY: groundY - TILE_SIZE * 2, phase: Math.random() * Math.PI * 2 });
      } else if (char === 'Z') {
        // Individual right-facing slope tile (descending left-to-right, high on left)
        entities.push({ ...base, id: `${prefix}slope-${x}-${y}`, type: 'slope', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, slopeDirection: 'right', onGround: true, tileCount: 1 });
      } else if (char === 'M') {
      } else if (char === 'V') {
        // Vine hangs DOWN from the bottom of the floating platform below it
        // Find the platform directly below (row y+1)
        const belowChar = level[y + 1] ? level[y + 1][x] : '';
        // If there's a platform below, vine starts at its bottom edge
        // Otherwise vine starts at this tile's bottom
        const platformRow = belowChar === '#' ? y + 1 : y;
        const vineStartY = (platformRow + 1) * TILE_SIZE; // bottom edge of platform
        // Vine extends 4 tiles downward from platform bottom
        const vineHeight = TILE_SIZE * 4;
        entities.push({ ...base, id: `${prefix}vine-${x}-${y}`, type: 'vine', x: x * TILE_SIZE + TILE_SIZE / 4, y: vineStartY, width: TILE_SIZE / 2, height: vineHeight });
      } else if (char === 'C') {
        // Popcorn bucket - sits on top of platform below, shoots popcorn in all directions every 3s
        entities.push({ ...base, id: `${prefix}cannon-${x}-${y}`, type: 'cannon', x: x * TILE_SIZE - TILE_SIZE * 0.25, y: y * TILE_SIZE - TILE_SIZE * 0.5, width: TILE_SIZE * 1.5, height: TILE_SIZE * 1.5, lastShootTime: 0, shootInterval: 3000, facing: 'left', squishTime: 0 });
      } else if (char === 'B') {
        // Popcorn bucket (same as C, kept for backward compat)
        entities.push({ ...base, id: `${prefix}cannon-${x}-${y}`, type: 'cannon', x: x * TILE_SIZE - TILE_SIZE * 0.25, y: y * TILE_SIZE - TILE_SIZE * 0.5, width: TILE_SIZE * 1.5, height: TILE_SIZE * 1.5, lastShootTime: 0, shootInterval: 3000, facing: 'right', squishTime: 0 });
      } else if (char === 'O') {
        // Intake cave - sucks player in and teleports to paired exhaust cave
        entities.push({ ...base, id: `${prefix}cave-intake-${x}-${y}`, type: 'cave-intake', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, phase: Math.random() * Math.PI * 2 });
      } else if (char === 'E') {
        // Exhaust cave - player gets teleported here from paired intake cave
        entities.push({ ...base, id: `${prefix}cave-exhaust-${x}-${y}`, type: 'cave-exhaust', x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, phase: Math.random() * Math.PI * 2 });
      } else if (char === 'J') {
        // Windmill hazard - compact windmill (width 2 tiles, height 1.5 tiles), stands on platform below
        entities.push({ ...base, id: `${prefix}windmill-${x}-${y}`, type: 'windmill', x: x * TILE_SIZE - TILE_SIZE * 0.5, y: y * TILE_SIZE - TILE_SIZE * 0.2, width: TILE_SIZE * 2, height: TILE_SIZE * 1.5, rotation: 0, cycleStart: Math.random() * 7000, isSpinning: false, bounceCount: 0, speedMultiplier: 0 });
      } else if (char === 'G') {
        entities.push({ ...base, id: `${prefix}goal-${x}-${y}`, type: 'goal', x: x * TILE_SIZE, y: y * TILE_SIZE - TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE * 2 });
      }
    });
  });

  if (isSubWorld && levelIndex === 0) {
    const subWorldFloorY = 398;
    entities.push({
      vx: 0, vy: 0, onGround: true, jumpsRemaining: 0, facing: 'right' as const, subWorld: true,
      id: 'sub-hidden-floor', type: 'platform',
      x: 0, y: subWorldFloorY, width: level[0].length * TILE_SIZE, height: 52,
      hidden: true,
    });
  }

  // Generate decorative flowers on platform surfaces as interactive items
  if (!isSubWorld && levelIndex !== 6) {
    const platforms = entities.filter(e => e.type === 'platform');
    const hazards = entities.filter(e => e.type === 'hazard');
    const muds = entities.filter(e => e.type === 'mud');
    const piranhas = entities.filter(e => e.type === 'enemy' && e.enemyType === 'piranha');
    const flowerDrop = TILE_SIZE / 2;
    platforms.forEach(plat => {
      const hasAbove = platforms.some(p => p.x === plat.x && Math.abs(p.y - (plat.y - TILE_SIZE)) < 5);
      if (hasAbove) return;
      // Skip platforms adjacent to water/hazard tiles (within 2 tiles)
      const nearWater = hazards.some(h => Math.abs(h.x - plat.x) <= TILE_SIZE * 2 && Math.abs(h.y - plat.y) <= TILE_SIZE * 2);
      const nearPiranha = piranhas.some(p => Math.abs(p.x - plat.x) <= TILE_SIZE * 2 && Math.abs(p.y - plat.y) <= TILE_SIZE * 2);
      // Skip platforms adjacent to mud (within 2 tiles)
      const nearMud = muds.some(m => Math.abs(m.x - plat.x) <= TILE_SIZE * 2 && Math.abs(m.y - plat.y) <= TILE_SIZE * 2);
      if (nearWater || nearPiranha || nearMud) return;
      const seed = (plat.x * 7 + plat.y * 13) % 100;
      // Check no existing item already at this position
      const hasItem = entities.some(e => e.type === 'item' && Math.abs(e.x - plat.x) < TILE_SIZE && Math.abs(e.y - plat.y) < TILE_SIZE);
      if (hasItem) return;
      if (seed < 20) {
        const sz = 24;
        entities.push({
          vx: 0, vy: 0, onGround: false, jumpsRemaining: 0, facing: 'right' as const, subWorld: false,
          id: `deco-flower-${plat.x}-${plat.y}`, type: 'item', itemType: 'flower', flowerVariant: 'single',
          x: plat.x + TILE_SIZE / 2 - sz / 2, y: plat.y - sz + 6 + flowerDrop, width: sz, height: sz,
        });
      } else if (seed >= 20 && seed < 38) {
        const sz = 36;
        entities.push({
          vx: 0, vy: 0, onGround: false, jumpsRemaining: 0, facing: 'right' as const, subWorld: false,
          id: `deco-flowers-${plat.x}-${plat.y}`, type: 'item', itemType: 'flower', flowerVariant: 'bunch',
          x: plat.x + TILE_SIZE / 2 - sz / 2, y: plat.y - sz + 6 + flowerDrop, width: sz, height: sz,
        });
      }
    });
  }

  return entities;
}

// 鈹€鈹€鈹€ Drawing Helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number = 0) {
  ctx.fillStyle = '#FFEB3B';
  ctx.strokeStyle = '#FBC02D';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Rounded cute star: inner radius is 0.72 of outer for obtuse (blunt) points
  const innerRadius = radius * 0.72;
  for (let i = 0; i < 5; i++) {
    const oa = (i * Math.PI * 2 / 5) - Math.PI / 2 + rotation;
    const ia = ((i + 0.5) * Math.PI * 2 / 5) - Math.PI / 2 + rotation;
    if (i === 0) {
      ctx.moveTo(x + Math.cos(oa) * radius, y + Math.sin(oa) * radius);
    } else {
      ctx.lineTo(x + Math.cos(oa) * radius, y + Math.sin(oa) * radius);
    }
    ctx.lineTo(x + Math.cos(ia) * innerRadius, y + Math.sin(ia) * innerRadius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFlowerShape(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y - 5);
  ctx.stroke();
  ctx.fillStyle = '#F06292';
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 8, y - 5 + Math.sin(a) * 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFEB3B';
  ctx.beginPath();
  ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
}

// 鈹€鈹€鈹€ Level-specific sky/background configurations 鈹€鈹€鈹€
// Level indices: 0-9 map to time-of-day themes
// L1(0)=dawn, L2(1)=early morning, L3(2)=noon, L4(3)=afternoon, L5(4)=evening, L6(5)=night, L7(6)=deep night, L8(7)=late night, L9(8)=dawn, L10(9)=early morning
interface LevelSkyConfig {
  skyStops: [number, string][];
  sunMoon?: { type: 'sun' | 'moon'; x: number; y: number; size: number };
  stars?: boolean;
  shootingStar?: boolean;
  coloredClouds?: boolean; // evening glow
  brightness: number; // 0-1, affects foreground
}

const LEVEL_SKY_CONFIGS: LevelSkyConfig[] = [
  // Level 1: Dawn - blue sky at top, light yellow at bottom third
  { skyStops: [[0,'#4FC3F7'],[0.3,'#81D4FA'],[0.5,'#B3E5FC'],[0.67,'#FFF9C4'],[1,'#FFF8E1']], brightness: 0.7 },
  // Level 2: Early morning - sun appearing on left
  { skyStops: [[0,'#87CEEB'],[0.3,'#B3E5FC'],[0.6,'#FFE0B2'],[0.8,'#FFCC80'],[1,'#C8E6C9']], sunMoon: { type: 'sun', x: 0.08, y: 0.55, size: 50 }, brightness: 0.7 },
  // Level 3: Noon - bright blue sky, sun overhead
  { skyStops: [[0,'#4FC3F7'],[0.3,'#81D4FA'],[0.6,'#B3E5FC'],[0.85,'#E1F5FE'],[1,'#C8E6C9']], sunMoon: { type: 'sun', x: 0.5, y: 0.08, size: 55 }, brightness: 1.0 },
  // Level 4: Afternoon - sun on right side
  { skyStops: [[0,'#64B5F6'],[0.3,'#90CAF9'],[0.6,'#FFE082'],[0.8,'#FFCC80'],[1,'#A5D6A7']], sunMoon: { type: 'sun', x: 0.85, y: 0.3, size: 48 }, brightness: 0.9 },
  // Level 5: Evening - sunset, sun at bottom-right
  { skyStops: [[0,'#1A237E'],[0.2,'#4A148C'],[0.4,'#E65100'],[0.6,'#FF6F00'],[0.8,'#FFD54F'],[1,'#4E342E']], sunMoon: { type: 'sun', x: 0.85, y: 0.8, size: 60 }, brightness: 0.6 },
  // Level 6: Night - moon just rising
  { skyStops: [[0,'#0D1B2A'],[0.3,'#1B2838'],[0.6,'#1A237E'],[0.85,'#283593'],[1,'#1B5E20']], sunMoon: { type: 'moon', x: 0.2, y: 0.5, size: 40 }, stars: true, brightness: 0.3 },
  // Level 7: Blank level
  { skyStops: [[0,'#10212E'],[0.5,'#1A2D3B'],[1,'#2B3E4C']], brightness: 0.45 },
  // Level 8: Late night/pre-dawn - moon on right, shooting star
  { skyStops: [[0,'#0D1B2A'],[0.3,'#1B2838'],[0.5,'#263238'],[0.75,'#37474F'],[1,'#1B3A2A']], sunMoon: { type: 'moon', x: 0.82, y: 0.2, size: 38 }, stars: true, shootingStar: true, brightness: 0.25 },
  // Level 9: Same as Level 1 (blue top, light yellow bottom)
  { skyStops: [[0,'#4FC3F7'],[0.3,'#81D4FA'],[0.5,'#B3E5FC'],[0.67,'#FFF9C4'],[1,'#FFF8E1']], brightness: 0.7 },
  // Level 10: Same as Level 2 (early morning) - no sun/clouds
  { skyStops: [[0,'#87CEEB'],[0.3,'#B3E5FC'],[0.6,'#FFE0B2'],[0.8,'#FFCC80'],[1,'#C8E6C9']], brightness: 0.7 },
];

// Draw parallax background layers with level-specific sky
function drawParallaxBackground(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cloudImgRef: React.RefObject<HTMLImageElement | null>,
  mountainImgRef: React.RefObject<HTMLImageElement | null>,
  treeImgRef: React.RefObject<HTMLImageElement | null>,
  tree2ImgRef?: React.RefObject<HTMLImageElement | null>,
  currentLevel?: number,
  sunImgRef?: React.RefObject<HTMLImageElement | null>,
  dawnBgImgRef?: React.RefObject<HTMLImageElement | null>,
  moonImgRef?: React.RefObject<HTMLImageElement | null>,
  level5BgImgRef?: React.RefObject<HTMLImageElement | null>,
  sun1ImgRef?: React.RefObject<HTMLImageElement | null>,
  sun2ImgRef?: React.RefObject<HTMLImageElement | null>,
  level9BgImgRef?: React.RefObject<HTMLImageElement | null>,
  level10BgImgRef?: React.RefObject<HTMLImageElement | null>,
  bCloudImgRef?: React.RefObject<HTMLImageElement | null>,
  bCloud2ImgRef?: React.RefObject<HTMLImageElement | null>,
) {
  const level = currentLevel ?? 0;
  const config = LEVEL_SKY_CONFIGS[level % LEVEL_SKY_CONFIGS.length];
  const now = Date.now();

  {
    // Sky gradient based on level
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    for (const [stop, color] of config.skyStops) {
      skyGrad.addColorStop(stop, color);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  if (level === 6) {
    return;
  }

  // Level 1 (index 0): Draw stretched background image over sky
  if (level === 0) {
    const bgImg = dawnBgImgRef?.current;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  // Level 5 (index 4): Draw stretched background image over sky
  if (level === 4) {
    const bgImg = level5BgImgRef?.current;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  // Level 9 (index 8): Draw background image at original size over the sky
  if (level === 8) {
    const bgImg = level9BgImgRef?.current;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      const bgW = CANVAS_WIDTH * 0.75;
      const bgH = CANVAS_HEIGHT * 0.75;
      const bgY = CANVAS_HEIGHT - bgH;
      const scroll = cameraX * 0.22;
      const baseX = -((scroll % bgW) + bgW) % bgW;
      for (let i = -1; i <= 2; i++) {
        ctx.drawImage(bgImg, baseX + i * bgW, bgY, bgW, bgH);
      }
    }
  }

  // Level 10 (index 9): Draw stretched background image + dark b-clouds
  if (level === 9) {
    const bgImg = level10BgImgRef?.current;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    // Dark b-clouds drifting across the sky (fully opaque, many clouds)
    const cloud1 = bCloudImgRef?.current;
    const cloud2 = bCloud2ImgRef?.current;
    ctx.save();
    ctx.globalAlpha = 1.0;
    const time = now * 0.001;
    if (cloud1 && cloud1.complete && cloud1.naturalWidth > 0) {
      const cw = 280;
      const ch = 120;
      // 4 cloud1 instances moving right at different speeds and heights
      for (let i = 0; i < 4; i++) {
        const speed = 0.012 + i * 0.004;
        const offset = i * CANVAS_WIDTH * 0.3;
        const cx = ((time * speed * CANVAS_WIDTH + offset) % (CANVAS_WIDTH + cw)) - cw;
        const cy = 15 + i * 45;
        const scale = 0.75 + (i % 2) * 0.25;
        ctx.drawImage(cloud1, cx, cy, cw * scale, ch * scale);
      }
    }
    if (cloud2 && cloud2.complete && cloud2.naturalWidth > 0) {
      const cw = 240;
      const ch = 100;
      // 4 cloud2 instances moving left at different speeds and heights
      for (let i = 0; i < 4; i++) {
        const speed = 0.01 + i * 0.003;
        const offset = i * CANVAS_WIDTH * 0.35;
        const cx = CANVAS_WIDTH - ((time * speed * CANVAS_WIDTH + offset) % (CANVAS_WIDTH + cw));
        const cy = 30 + i * 40;
        const scale = 0.7 + (i % 2) * 0.3;
        ctx.drawImage(cloud2, cx, cy, cw * scale, ch * scale);
      }
    }
    ctx.restore();
  }



  // Stars (for night levels)
  if (config.stars) {
    ctx.save();
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 + 30) % CANVAS_WIDTH;
      const sy = (i * 53 + 10) % (CANVAS_HEIGHT * 0.6);
      const sr = 1 + (i % 3) * 0.5;
      const twinkle = 0.4 + Math.sin(now * 0.003 + i * 1.7) * 0.3;
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Shooting star (Level 8)
  if (config.shootingStar) {
    const cycle = (now % 8000) / 8000; // every 8 seconds
    if (cycle < 0.15) {
      const progress = cycle / 0.15;
      const startX = CANVAS_WIDTH * 0.7;
      const startY = CANVAS_HEIGHT * 0.1;
      const endX = CANVAS_WIDTH * 0.2;
      const endY = CANVAS_HEIGHT * 0.4;
      const mx = startX + (endX - startX) * progress;
      const my = startY + (endY - startY) * progress;
      ctx.save();
      ctx.globalAlpha = 1 - progress * 0.8;
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 30 * (1 - progress), my - 15 * (1 - progress));
      ctx.stroke();
      // Glow
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Dynamic Aurora Effect for Level 8 (index 7) - Flowing gradient bands with wavy edges
  if (level === 7) {
    ctx.save();
    const auroraTime = now * 0.001;
    // Slow left-to-right scroll offset
    const scrollOffset = (now * 0.015) % (CANVAS_WIDTH * 2);

    // Aurora band configurations: each band is a long ribbon across the sky
    const bands = [
      { baseY: 0.08, height: 0.18, hue1: 185, hue2: 200, sat: 75, light: 65, alpha: 0.35, waveAmp: 12, waveFreq: 0.008, waveSpeed: 0.4, scrollMult: 1.0, phaseOff: 0 },
      { baseY: 0.14, height: 0.22, hue1: 280, hue2: 320, sat: 60, light: 70, alpha: 0.30, waveAmp: 15, waveFreq: 0.006, waveSpeed: 0.3, scrollMult: 0.8, phaseOff: 1.5 },
      { baseY: 0.05, height: 0.15, hue1: 140, hue2: 165, sat: 65, light: 68, alpha: 0.28, waveAmp: 10, waveFreq: 0.01, waveSpeed: 0.5, scrollMult: 1.2, phaseOff: 3.0 },
      { baseY: 0.20, height: 0.16, hue1: 190, hue2: 260, sat: 70, light: 62, alpha: 0.25, waveAmp: 14, waveFreq: 0.007, waveSpeed: 0.35, scrollMult: 0.9, phaseOff: 4.5 },
      { baseY: 0.02, height: 0.12, hue1: 170, hue2: 195, sat: 80, light: 72, alpha: 0.22, waveAmp: 8, waveFreq: 0.012, waveSpeed: 0.6, scrollMult: 1.1, phaseOff: 2.2 },
    ];

    for (let b = 0; b < bands.length; b++) {
      const band = bands[b];
      // Smooth color transition over time
      const colorPhase = auroraTime * 0.08 + band.phaseOff;
      const currentHue = band.hue1 + (band.hue2 - band.hue1) * (0.5 + 0.5 * Math.sin(colorPhase));
      const bandScroll = scrollOffset * band.scrollMult;

      // Draw the band as a continuous filled path with wavy bottom edge
      // Use a single path to avoid visible vertical slice boundaries
      const topY = band.baseY * CANVAS_HEIGHT;
      const bandBaseBottom = (band.baseY + band.height) * CANVAS_HEIGHT;

      // Build wavy bottom edge path points
      const step = 2; // smooth curve resolution
      const points: {x: number; y: number}[] = [];
      for (let x = 0; x <= CANVAS_WIDTH; x += step) {
        const waveX = x + bandScroll;
        const waveY = Math.sin(waveX * band.waveFreq + auroraTime * band.waveSpeed) * band.waveAmp
                    + Math.sin(waveX * band.waveFreq * 1.7 + auroraTime * band.waveSpeed * 0.7 + band.phaseOff) * (band.waveAmp * 0.5);
        points.push({ x, y: bandBaseBottom + waveY });
      }

      // Create clipping path for the wavy band shape
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, topY);
      ctx.lineTo(CANVAS_WIDTH, topY);
      // Right edge down to wavy bottom
      ctx.lineTo(CANVAS_WIDTH, points[points.length - 1].y);
      // Wavy bottom edge (right to left)
      for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.clip();

      // Fill with vertical gradient (no slices = no vertical lines)
      const avgBottom = bandBaseBottom + band.waveAmp * 0.5;
      const grad = ctx.createLinearGradient(0, topY, 0, avgBottom);
      const alphaVar = 0.85 + 0.15 * Math.sin(bandScroll * 0.003 + auroraTime * 0.2 + b * 1.3);
      const finalAlpha = band.alpha * alphaVar;
      grad.addColorStop(0, `hsla(${currentHue}, ${band.sat}%, ${band.light}%, 0)`);
      grad.addColorStop(0.2, `hsla(${currentHue}, ${band.sat}%, ${band.light}%, ${finalAlpha * 0.3})`);
      grad.addColorStop(0.45, `hsla(${currentHue}, ${band.sat}%, ${band.light}%, ${finalAlpha})`);
      grad.addColorStop(0.7, `hsla(${currentHue}, ${band.sat}%, ${band.light + 5}%, ${finalAlpha * 0.7})`);
      grad.addColorStop(1, `hsla(${currentHue}, ${band.sat}%, ${band.light}%, 0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, topY, CANVAS_WIDTH, avgBottom - topY + band.waveAmp * 2);
      ctx.restore();
    }

    // Soft inner glow highlights that drift slowly (no hard edges)
    const glowCount = 6;
    for (let g = 0; g < glowCount; g++) {
      const seed = g * 73.7 + 11;
      const gx = ((seed * 127 + scrollOffset * (0.5 + g * 0.1)) % (CANVAS_WIDTH + 200)) - 100;
      const gy = CANVAS_HEIGHT * (0.08 + 0.25 * ((Math.sin(auroraTime * 0.15 + seed) + 1) * 0.5));
      const gradSize = 60 + Math.sin(auroraTime * 0.2 + seed * 0.5) * 25;
      const glowHue = 170 + Math.sin(auroraTime * 0.1 + g * 1.8) * 60; // cycles through cyan/purple/green
      const glowAlpha = 0.12 + 0.06 * Math.sin(auroraTime * 0.3 + seed);

      const radGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gradSize);
      radGrad.addColorStop(0, `hsla(${glowHue}, 75%, 70%, ${glowAlpha})`);
      radGrad.addColorStop(0.5, `hsla(${glowHue}, 70%, 65%, ${glowAlpha * 0.5})`);
      radGrad.addColorStop(1, `hsla(${glowHue}, 65%, 60%, 0)`);

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gradSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Sun or Moon
  if (config.sunMoon) {
    const { type, x, y, size } = config.sunMoon;
    const sx = x * CANVAS_WIDTH;
    const sy = y * CANVAS_HEIGHT;
    ctx.save();
    if (type === 'sun') {
      // Two-layer sun: sun1 (rays, rotates) + sun2 (face, static center)
      const s1 = sun1ImgRef?.current;
      const s2 = sun2ImgRef?.current;
      const hasSun1 = s1 && s1.complete && s1.naturalWidth > 0;
      const hasSun2 = s2 && s2.complete && s2.naturalWidth > 0;

      if (hasSun1 || hasSun2) {
        // Soft glow behind sun
        const pulseScale = 1 + 0.08 * Math.sin(now * 0.002);
        const glowRadius = size * 2.8 * pulseScale;
        const sunGlow = ctx.createRadialGradient(sx, sy, size * 0.5, sx, sy, glowRadius);
        sunGlow.addColorStop(0, 'rgba(255,245,157,0.55)');
        sunGlow.addColorStop(0.35, 'rgba(255,224,130,0.3)');
        sunGlow.addColorStop(0.65, 'rgba(255,200,50,0.1)');
        sunGlow.addColorStop(1, 'rgba(255,235,59,0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Layer 1: sun1 (rays) - rotates slowly
        if (hasSun1) {
          const rotation = now * 0.0004; // slow continuous rotation
          const raySize = size * 3.2 * pulseScale;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(rotation);
          ctx.drawImage(s1, -raySize / 2, -raySize / 2, raySize, raySize);
          ctx.restore();
        }

        // Layer 2: sun2 (face/center) - static, no rotation
        if (hasSun2) {
          const faceSize = size * 2.4;
          ctx.drawImage(s2, sx - faceSize / 2, sy - faceSize / 2, faceSize, faceSize);
        }
      } else {
        // Fallback: use single sun image or canvas sun
        const sImg = sunImgRef?.current;
        if (sImg && sImg.complete && sImg.naturalWidth > 0) {
          const sunGlow = ctx.createRadialGradient(sx, sy, size * 0.5, sx, sy, size * 2.5);
          sunGlow.addColorStop(0, 'rgba(255,245,157,0.5)');
          sunGlow.addColorStop(0.4, 'rgba(255,224,130,0.25)');
          sunGlow.addColorStop(1, 'rgba(255,235,59,0)');
          ctx.fillStyle = sunGlow;
          ctx.beginPath();
          ctx.arc(sx, sy, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
          const imgSize = size * 2.8;
          ctx.drawImage(sImg, sx - imgSize / 2, sy - imgSize / 2, imgSize, imgSize);
        } else {
          // Canvas fallback sun
          const sunGlow = ctx.createRadialGradient(sx, sy, size * 0.4, sx, sy, size * 2.2);
          sunGlow.addColorStop(0, 'rgba(255,245,157,0.6)');
          sunGlow.addColorStop(0.4, 'rgba(255,224,130,0.3)');
          sunGlow.addColorStop(1, 'rgba(255,235,59,0)');
          ctx.fillStyle = sunGlow;
          ctx.beginPath();
          ctx.arc(sx, sy, size * 2.2, 0, Math.PI * 2);
          ctx.fill();
          const sunBodyGrad = ctx.createRadialGradient(sx, sy, size * 0.1, sx, sy, size);
          sunBodyGrad.addColorStop(0, '#FFF59D');
          sunBodyGrad.addColorStop(1, '#FFC107');
          ctx.fillStyle = sunBodyGrad;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Draw moon using image if available
      const mImg = moonImgRef?.current;
      if (mImg && mImg.complete && mImg.naturalWidth > 0) {
        // Draw soft glow behind moon image
        const moonGlow = ctx.createRadialGradient(sx, sy, size * 0.3, sx, sy, size * 2.0);
        moonGlow.addColorStop(0, 'rgba(200,220,255,0.35)');
        moonGlow.addColorStop(0.5, 'rgba(180,200,255,0.15)');
        moonGlow.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 2.0, 0, Math.PI * 2);
        ctx.fill();
        // Draw the moon image centered at (sx, sy), scaled to size * 2.8
        const imgSize = size * 2.8;
        ctx.drawImage(mImg, sx - imgSize / 2, sy - imgSize / 2, imgSize, imgSize);
      } else {
        // Fallback: simple canvas moon
        const moonGlow = ctx.createRadialGradient(sx, sy, size * 0.3, sx, sy, size * 1.8);
        moonGlow.addColorStop(0, 'rgba(200,220,255,0.3)');
        moonGlow.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E8EAF6';
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = config.skyStops[0][1];
        ctx.beginPath();
        ctx.arc(sx + size * 0.3, sy - size * 0.1, size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Colored clouds for evening (Level 5)
  if (config.coloredClouds) {
    ctx.save();
    const cloudColors = ['#FF6F00', '#E65100', '#FF8F00', '#FFD54F'];
    for (let i = 0; i < 5; i++) {
      const cx = (i * 200 + 50 - cameraX * 0.03) % (CANVAS_WIDTH + 200);
      const cy = CANVAS_HEIGHT * 0.2 + (i % 3) * 40;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = cloudColors[i % cloudColors.length];
      ctx.beginPath();
      ctx.ellipse(cx, cy, 80 + i * 10, 25 + i * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Layer 3: Clouds (slowest, speed factor 0.05) - skip for Level 10
  if (level !== 9) {
    const cImg = cloudImgRef.current;
    if (cImg && cImg.complete && cImg.naturalWidth > 0) {
      const cloudW = 160;
      const cloudH = 80;
      const cloudSpacing = 400;
      const totalCloudWidth = cloudSpacing * 6;
      // Adjust cloud opacity based on time of day
      const cloudAlpha = level >= 5 && level <= 7 ? 0.3 : 0.85;
      for (let i = 0; i < 6; i++) {
        let cx = ((i * cloudSpacing + 50) - cameraX * (level === 8 ? 0.08 : 0.05)) % totalCloudWidth;
        if (cx < -cloudW) cx += totalCloudWidth;
        const cy = level === 8 ? 0 + (i % 3) * 24 + Math.sin(now * 0.0005 + i * 2) * 4 : 20 + (i % 3) * 40 + Math.sin(now * 0.0005 + i * 2) * 5;
        ctx.globalAlpha = cloudAlpha;
        ctx.drawImage(cImg, cx, cy, cloudW, cloudH);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Layer 2: Mountains (medium speed, factor 0.15)
  const mImg = mountainImgRef.current;
  if (level !== 8 && mImg && mImg.complete && mImg.naturalWidth > 0) {
    const mtnW = 800;
    const mtnH = 400;
    const mtnSpacing = 900;
    const totalMtnWidth = mtnSpacing * 4;
    const mtnBaseY = CANVAS_HEIGHT - mtnH + 80;
    ctx.save();
    // Darken mountains at night using alpha instead of expensive filter
    if (config.brightness < 0.5) ctx.globalAlpha = 0.3 + config.brightness * 1.4;
    for (let i = 0; i < 4; i++) {
      let mx = ((i * mtnSpacing) - cameraX * 0.15) % totalMtnWidth;
      if (mx < -mtnW) mx += totalMtnWidth;
      if (mx > CANVAS_WIDTH + 50 || mx + mtnW < -50) continue;
      ctx.drawImage(mImg, mx, mtnBaseY, mtnW, mtnH);
    }
    ctx.restore();
  }

  // Layer 1: Trees (fastest, speed factor 0.35)
  if (level !== 8) {
  const tImg = treeImgRef.current;
  if (tImg && tImg.complete && tImg.naturalWidth > 0) {
    const aspectRatio = tImg.naturalWidth / tImg.naturalHeight;
    const baseH = 150;
    const baseW = baseH * aspectRatio;

    const treeDefs = [
      { offset: 0, scale: 1.0, depth: 0 },
      { offset: 65, scale: 0.9, depth: 0 },
      { offset: 125, scale: 1.05, depth: 0 },
      { offset: 300, scale: 0.6, depth: 1 },
      { offset: 470, scale: 1.1, depth: 0 },
      { offset: 540, scale: 0.95, depth: 0 },
      { offset: 770, scale: 0.55, depth: 1 },
      { offset: 830, scale: 0.5, depth: 1 },
      { offset: 1000, scale: 1.0, depth: 0 },
      { offset: 1070, scale: 1.15, depth: 0 },
      { offset: 1145, scale: 0.9, depth: 0 },
      { offset: 1360, scale: 0.5, depth: 1 },
      { offset: 1520, scale: 1.05, depth: 0 },
      { offset: 1590, scale: 0.9, depth: 0 },
      { offset: 1790, scale: 0.55, depth: 1 },
      { offset: 1850, scale: 0.6, depth: 1 },
    ];
    const totalTreeWidth = 2000;
    const t2Img = tree2ImgRef?.current;

    ctx.save();
    // Use alpha instead of expensive brightness filter for trees
    if (config.brightness < 0.5) ctx.globalAlpha = 0.4 + config.brightness * 1.2;
    for (const tree of treeDefs) {
      const parallaxSpeed = tree.depth === 1 ? 0.2 : 0.35;
      let tx = (tree.offset - cameraX * parallaxSpeed) % totalTreeWidth;
      if (tx < -baseW * tree.scale) tx += totalTreeWidth;
      if (tx > CANVAS_WIDTH + 50) continue;

      const tw = baseW * tree.scale;
      const th = baseH * tree.scale;

      ctx.save();
      if (tree.depth === 1) {
        if (t2Img && t2Img.complete && t2Img.naturalWidth > 0) {
          ctx.globalAlpha = 0.75;
          const t2Aspect = t2Img.naturalWidth / t2Img.naturalHeight;
          const t2H = th * 1.2;
          const t2W = t2H * t2Aspect;
          ctx.drawImage(t2Img, tx - t2W / 2, CANVAS_HEIGHT - t2H, t2W, t2H);
          ctx.restore();
          continue;
        }
        ctx.globalAlpha = 0.45;
      }
      ctx.drawImage(tImg, tx - tw / 2, CANVAS_HEIGHT - th, tw, th);
      ctx.restore();
    }
    ctx.restore();
  }
  }
}

// Draw foreground flowers, grass, and level-specific creatures (blurred, fixed position)
function drawForegroundFlowers(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  currentLevel?: number,
  bigFlowerImgRef?: React.RefObject<HTMLImageElement | null>,
  ladybugImgRef?: React.RefObject<HTMLImageElement | null>,
  ladybugBodyImgRef?: React.RefObject<HTMLImageElement | null>,
  ladybugFlyImgRef?: React.RefObject<HTMLImageElement | null>,
  ladybugWingImgRef?: React.RefObject<HTMLImageElement | null>,
  birdDecoImgRef?: React.RefObject<HTMLImageElement | null>,
  level2StartTimeRef?: React.RefObject<number>,
  lawnImgRef?: React.RefObject<HTMLImageElement | null>,
  lawnFlowerImgRef?: React.RefObject<HTMLImageElement | null>,
  bigFlowerBlueImgRef?: React.RefObject<HTMLImageElement | null>,
  bigFlowerYellowImgRef?: React.RefObject<HTMLImageElement | null>,
  bigFlowerRedImgRef?: React.RefObject<HTMLImageElement | null>,
) {
  const now = Date.now();
  const level = currentLevel ?? 0;
  const config = LEVEL_SKY_CONFIGS[level % LEVEL_SKY_CONFIGS.length];
  const brightness = config.brightness;
  // Level 7 is blank, so skip foreground decorations entirely.
  if (level === 6) return;

  const flowersOpen = level !== 6;

  // Parallax speeds: flowers move faster than grass to create depth
  const grassParallaxSpeed = 0.02; // grass moves slowly (further away feel)
  const flowerParallaxSpeed = 0.18; // flowers move much faster (3x previous, very close to camera)

  ctx.save();
  // Full opacity - no transparency for foreground elements
  ctx.globalAlpha = 1.0;

  // 鈹€鈹€鈹€ Continuous grass using lawn.png (slow parallax, infinite looping) 鈹€鈹€鈹€
  const grassOffset = cameraX * grassParallaxSpeed;
  const lawnImage = lawnImgRef?.current;

  if (lawnImage && lawnImage.complete && lawnImage.naturalWidth > 0) {
    // lawn.png tiles horizontally across the bottom of the screen
    const lawnH = 35; // original smaller height for grass strip
    const lawnW = lawnImage.naturalWidth * (lawnH / lawnImage.naturalHeight); // maintain aspect ratio
    const lawnY = CANVAS_HEIGHT - lawnH + 5; // position at very bottom

    // Calculate starting x position with parallax offset and infinite loop
    const offsetX = ((grassOffset % lawnW) + lawnW) % lawnW;
    const startX = -offsetX;

    for (let x = startX; x < CANVAS_WIDTH + lawnW; x += lawnW) {
      ctx.drawImage(lawnImage, x, lawnY, lawnW, lawnH);
    }
  } else {
    // Fallback: simple green strip if lawn.png not loaded
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
  }

  // 鈹€鈹€鈹€ Flowers using lawn-1.png (faster parallax, gentle swaying, infinite looping) 鈹€鈹€鈹€
  const flowerOffset = cameraX * flowerParallaxSpeed;
  const lawnFlowerImage = lawnFlowerImgRef?.current;

  // Keep flowerPositions for creature reference (ladybug target positions)
  const loopWidth = CANVAS_WIDTH * 1.2;
  const flowerPositions = [
    { x: CANVAS_WIDTH * 0.08, baseY: CANVAS_HEIGHT + 5, size: 160 },
    { x: CANVAS_WIDTH * 0.30, baseY: CANVAS_HEIGHT + 0, size: 140 },
    { x: CANVAS_WIDTH * 0.55, baseY: CANVAS_HEIGHT - 5, size: 130 },
    { x: CANVAS_WIDTH * 0.75, baseY: CANVAS_HEIGHT + 3, size: 150 },
    { x: CANVAS_WIDTH * 1.0, baseY: CANVAS_HEIGHT + 2, size: 130 },
  ].map(f => {
    let x = ((f.x - flowerOffset) % loopWidth + loopWidth) % loopWidth;
    if (x > CANVAS_WIDTH + 100) x -= loopWidth;
    return { x, baseY: f.baseY, size: f.size };
  });

  if (lawnFlowerImage && lawnFlowerImage.complete && lawnFlowerImage.naturalWidth > 0 && flowersOpen) {
    // lawn-1.png at half natural size, scattered sparsely across foreground
    const flowerH = lawnFlowerImage.naturalHeight * 0.5; // half size ~29px
    const flowerW = lawnFlowerImage.naturalWidth * 0.5; // half size ~30px

    // Sparse scattered positions using seeded pseudo-random pattern
    const scatterPositions = [
      { xRatio: 0.05, yOff: 2 }, { xRatio: 0.15, yOff: -1 },
      { xRatio: 0.28, yOff: 3 }, { xRatio: 0.42, yOff: 0 },
      { xRatio: 0.53, yOff: -2 }, { xRatio: 0.67, yOff: 1 },
      { xRatio: 0.78, yOff: 3 }, { xRatio: 0.88, yOff: -1 },
      { xRatio: 0.96, yOff: 2 },
    ];

    const loopW = CANVAS_WIDTH * 1.2;
    for (const sp of scatterPositions) {
      let x = sp.xRatio * CANVAS_WIDTH;
      // Apply parallax offset with looping
      x = ((x - flowerOffset * 0.15) % loopW + loopW) % loopW;
      if (x > CANVAS_WIDTH + flowerW) continue;

      const flowerY = CANVAS_HEIGHT - flowerH + sp.yOff;

      // Gentle sway
      const swayAngle = Math.sin(now * 0.0015 + x * 0.005) * 0.012;
      const swayX = Math.sin(now * 0.001 + x * 0.003) * 1;

      ctx.save();
      ctx.translate(x + flowerW / 2 + swayX, flowerY + flowerH);
      ctx.rotate(swayAngle);
      ctx.drawImage(lawnFlowerImage, -flowerW / 2, -flowerH, flowerW, flowerH);
      ctx.restore();
    }
  }

  // 鈹€鈹€鈹€ Foreground flowers (red, yellow, and blue with parallax and swaying) 鈹€鈹€鈹€
  if (flowersOpen) {
    const bigFlowerRedImgEl = bigFlowerRedImgRef?.current;
    const bigFlowerYellowImgEl = bigFlowerYellowImgRef?.current;
    const bigFlowerBlueImgEl = bigFlowerBlueImgRef?.current;

    // Cycle through red, yellow, and blue flowers
    const flowerImgs = [bigFlowerRedImgEl, bigFlowerYellowImgEl, bigFlowerBlueImgEl, bigFlowerRedImgEl, bigFlowerYellowImgEl];

    for (let i = 0; i < flowerPositions.length; i++) {
      const fp = flowerPositions[i];
      const img = flowerImgs[i % flowerImgs.length];
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const size = fp.size;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const drawW = size * 0.6;
      const drawH = drawW / aspectRatio;

      // Gentle swaying animation
      const swayAngle = Math.sin(now * 0.0018 + fp.x * 0.01) * 0.02;
      const swayX = Math.sin(now * 0.0012 + fp.x * 0.007) * 1.5;

      ctx.save();
      ctx.translate(fp.x + swayX, fp.baseY);
      ctx.rotate(swayAngle);
      ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
      ctx.restore();
    }
  }

  // 鈹€鈹€鈹€ Level-specific foreground creatures 鈹€鈹€鈹€
  // Level 1: Ladybug crawls along stem and flies to flower[3]
  // Cycle (30s): idle top -> crawl down -> idle mid -> crawl up -> idle -> fly to flower4 -> rest -> fly back -> idle
  if (level === 0) {
    const restImg = ladybugImgRef?.current;
    const bodyImg = ladybugBodyImgRef?.current;
    const flyImg = ladybugFlyImgRef?.current;
    const wingImg = ladybugWingImgRef?.current;
    const srcFlower = flowerPositions[0];
    const dstFlower = flowerPositions[3];

    if (srcFlower && dstFlower && (restImg?.complete || bodyImg?.complete)) {
      const cycleLen = 30000;
      const t = now % cycleLen;

      const srcSwayAngle = Math.sin(now * 0.0018 + srcFlower.x * 0.01) * 0.02;
      const srcSwayX = Math.sin(now * 0.0012 + srcFlower.x * 0.007) * 1.5;
      const dstSwayAngle = Math.sin(now * 0.0018 + dstFlower.x * 0.01) * 0.02;
      const dstSwayX = Math.sin(now * 0.0012 + dstFlower.x * 0.007) * 1.5;

      // Calculate actual flower top based on how flowers are drawn
      // drawW = size * 0.6, drawH = drawW / aspectRatio
      // Flower is drawn from (baseY - drawH) to baseY, so top = baseY - drawH
      const srcImg = bigFlowerRedImgRef?.current;
      const srcAspect = (srcImg && srcImg.naturalWidth > 0) ? srcImg.naturalWidth / srcImg.naturalHeight : 1;
      const srcDrawW = srcFlower.size * 0.6;
      const srcDrawH = srcDrawW / srcAspect;
      const dstImg = bigFlowerRedImgRef?.current;
      const dstAspect = (dstImg && dstImg.naturalWidth > 0) ? dstImg.naturalWidth / dstImg.naturalHeight : 1;
      const dstDrawW = dstFlower.size * 0.6;
      const dstDrawH = dstDrawW / dstAspect;

      const srcTopX = srcFlower.x + srcSwayX;
      const srcTopY = srcFlower.baseY - srcDrawH + 5; // land on flower top (slight offset into petals)
      // Crawl only within the flower area: from top to mid
      const srcMidY = srcFlower.baseY - srcDrawH * 0.5;
      const dstTopX = dstFlower.x + dstSwayX;
      const dstTopY = dstFlower.baseY - dstDrawH + 5; // land on flower top

      let ladybugX = srcTopX;
      let ladybugY = srcTopY;
      let isFlying = false;
      let isFlyingBack = false; // true when flying from dst back to src
      let onSrcFlower = true;

      if (t < 4000) {
        ladybugX = srcTopX;
        ladybugY = srcTopY;
      } else if (t < 7000) {
        const crawlT = (t - 4000) / 3000;
        const eased = crawlT * crawlT * (3 - 2 * crawlT);
        ladybugX = srcTopX;
        ladybugY = srcTopY + (srcMidY - srcTopY) * eased;
      } else if (t < 9000) {
        ladybugX = srcTopX;
        ladybugY = srcMidY;
      } else if (t < 12000) {
        const crawlT = (t - 9000) / 3000;
        const eased = crawlT * crawlT * (3 - 2 * crawlT);
        ladybugX = srcTopX;
        ladybugY = srcMidY + (srcTopY - srcMidY) * eased;
      } else if (t < 14000) {
        ladybugX = srcTopX;
        ladybugY = srcTopY;
      } else if (t < 18000) {
        isFlying = true;
        onSrcFlower = false;
        const flyT = (t - 14000) / 4000;
        const eased = flyT * flyT * (3 - 2 * flyT);
        ladybugX = srcTopX + (dstTopX - srcTopX) * eased;
        ladybugY = srcTopY + (dstTopY - srcTopY) * eased + (-80) * Math.sin(flyT * Math.PI);
      } else if (t < 21000) {
        onSrcFlower = false;
        ladybugX = dstTopX;
        ladybugY = dstTopY;
      } else if (t < 25000) {
        isFlying = true;
        isFlyingBack = true;
        onSrcFlower = false;
        const flyT = (t - 21000) / 4000;
        const eased = flyT * flyT * (3 - 2 * flyT);
        ladybugX = dstTopX + (srcTopX - dstTopX) * eased;
        ladybugY = dstTopY + (srcTopY - dstTopY) * eased + (-80) * Math.sin(flyT * Math.PI);
      } else {
        ladybugX = srcTopX;
        ladybugY = srcTopY;
      }

      ctx.save();

      if (isFlying) {
        ctx.translate(ladybugX, ladybugY);
        const breathe = 1 + Math.sin(now * 0.003) * 0.03;
        // Flip horizontally when flying back (right to left)
        ctx.scale(isFlyingBack ? -breathe : breathe, breathe);
        const wingFlapAngle = Math.sin(now * 0.025) * 0.3;

        // Flying layers (bottom to top): body -> wing -> fly
        if (bodyImg?.complete) {
          const bw = bodyImg.width;
          const bh = bodyImg.height;
          ctx.drawImage(bodyImg, -bw / 2, -bh / 2, bw, bh);
        }
        if (wingImg?.complete) {
          ctx.save();
          const ww = wingImg.width;
          const wh = wingImg.height;
          ctx.rotate(wingFlapAngle);
          ctx.drawImage(wingImg, -ww / 2, -wh / 2, ww, wh);
          ctx.restore();
        }
        if (flyImg?.complete) {
          const fw = flyImg.width;
          const fh = flyImg.height;
          ctx.drawImage(flyImg, -fw / 2, -fh / 2, fw, fh);
        }
      } else {
        if (onSrcFlower) {
          ctx.translate(srcFlower.x + srcSwayX, srcFlower.baseY);
          ctx.rotate(srcSwayAngle);
          ctx.translate(0, ladybugY - srcFlower.baseY);
        } else {
          ctx.translate(dstFlower.x + dstSwayX, dstFlower.baseY);
          ctx.rotate(dstSwayAngle);
          ctx.translate(0, ladybugY - dstFlower.baseY);
        }
        const breathe = 1 + Math.sin(now * 0.002) * 0.02;
        ctx.scale(breathe, breathe);
        if (restImg?.complete) {
          const rw = restImg.width;
          const rh = restImg.height;
          ctx.drawImage(restImg, -rw / 2, -rh / 2, rw, rh);
        }
      }

      ctx.restore();
    }
  }

  // Level 9: Ladybug flies between flowers with intervals
  // Full cycle: 10s fly to lower-1/3 + crawl on flower, 20s wait, 10s fly back, 20s wait = 60s total
  if (level === 8) {
    const totalCycle = 60000; // 60 seconds full cycle
    const cycleTime = now % totalCycle;
    const fromX = flowerPositions[0].x;
    const fromY = flowerPositions[0].baseY - flowerPositions[0].size * 0.7;
    const toX = flowerPositions[2].x;
    const toY = flowerPositions[2].baseY - flowerPositions[2].size * 0.7;
    const midY = CANVAS_HEIGHT * 0.55; // reduced flight height - stays closer to flowers

    let lx: number, ly: number;
    let isFlying = false;
    let isCrawling = false;
    let crawlOnRight = false;
    let facingRight = true;

    if (cycleTime < 4000) {
      // Phase 1: Fly from left flower down to lower-1/3 (4s)
      isFlying = true;
      facingRight = true;
      const t = cycleTime / 4000;
      lx = fromX + (CANVAS_WIDTH * 0.5 - fromX) * t;
      ly = fromY + (midY - fromY) * t + Math.sin(t * Math.PI) * -20;
    } else if (cycleTime < 8000) {
      // Phase 2: Fly from mid to right flower (4s)
      isFlying = true;
      facingRight = true;
      const t = (cycleTime - 4000) / 4000;
      lx = CANVAS_WIDTH * 0.5 + (toX - CANVAS_WIDTH * 0.5) * t;
      ly = midY + (toY - midY) * t + Math.sin(t * Math.PI) * -15;
    } else if (cycleTime < 10000) {
      // Phase 3: Crawl on right flower (2s)
      isCrawling = true;
      crawlOnRight = true;
      const t = (cycleTime - 8000) / 2000;
      lx = toX + Math.sin(t * Math.PI * 2) * 8;
      ly = toY + Math.cos(t * Math.PI * 2) * 6;
    } else if (cycleTime < 30000) {
      // Phase 4: Rest on right flower (20s wait)
      isCrawling = true;
      crawlOnRight = true;
      const t = (cycleTime - 10000) / 20000;
      lx = toX + Math.sin(t * Math.PI * 0.5) * 3;
      ly = toY + Math.sin(t * 0.3) * 2;
    } else if (cycleTime < 34000) {
      // Phase 5: Fly from right flower down to lower-1/3 (4s)
      isFlying = true;
      facingRight = false;
      const t = (cycleTime - 30000) / 4000;
      lx = toX + (CANVAS_WIDTH * 0.5 - toX) * t;
      ly = toY + (midY - toY) * t + Math.sin(t * Math.PI) * -20;
    } else if (cycleTime < 38000) {
      // Phase 6: Fly from mid to left flower (4s)
      isFlying = true;
      facingRight = false;
      const t = (cycleTime - 34000) / 4000;
      lx = CANVAS_WIDTH * 0.5 + (fromX - CANVAS_WIDTH * 0.5) * t;
      ly = midY + (fromY - midY) * t + Math.sin(t * Math.PI) * -15;
    } else if (cycleTime < 40000) {
      // Phase 7: Crawl on left flower (2s)
      isCrawling = true;
      crawlOnRight = false;
      const t = (cycleTime - 38000) / 2000;
      lx = fromX + Math.sin(t * Math.PI * 2) * 8;
      ly = fromY + Math.cos(t * Math.PI * 2) * 6;
    } else {
      // Phase 8: Rest on left flower (20s wait)
      isCrawling = true;
      crawlOnRight = false;
      const t = (cycleTime - 40000) / 20000;
      lx = fromX + Math.sin(t * Math.PI * 0.5) * 3;
      ly = fromY + Math.sin(t * 0.3) * 2;
    }

    // Image-based ladybug rendering
    const ladybugSize = 40; // display size
    ctx.save();
    ctx.translate(lx, ly);
    if (!facingRight) ctx.scale(-1, 1);

    if (isFlying) {
      // Flying: draw body image + animated wing on top
      const bodyImg = ladybugBodyImgRef?.current;
      const wingImg = ladybugWingImgRef?.current;
      const flyImg = ladybugFlyImgRef?.current;

      if (bodyImg && bodyImg.complete && wingImg && wingImg.complete) {
        // Wing flap animation: oscillate rotation for flapping effect
        const wingFlap = Math.sin(now * 0.025) * 0.4; // smooth flap
        const wingY = Math.sin(now * 0.025) * 3; // vertical bob

        // Draw wing behind body (left wing)
        ctx.save();
        ctx.translate(-2, -8 + wingY);
        ctx.rotate(-0.2 + wingFlap);
        ctx.drawImage(wingImg, -wingImg.width * 0.7, -wingImg.height * 0.5, wingImg.width * 1.4, wingImg.height * 1.0);
        ctx.restore();

        // Draw wing behind body (right wing)
        ctx.save();
        ctx.translate(2, -8 + wingY);
        ctx.rotate(0.2 - wingFlap);
        ctx.drawImage(wingImg, -wingImg.width * 0.7, -wingImg.height * 0.5, wingImg.width * 1.4, wingImg.height * 1.0);
        ctx.restore();

        // Draw body on top
        const bw = bodyImg.width * 1.2;
        const bh = bodyImg.height * 1.2;
        ctx.drawImage(bodyImg, -bw / 2, -bh / 2, bw, bh);
      } else if (flyImg && flyImg.complete) {
        // Fallback: use fly image directly
        ctx.drawImage(flyImg, -ladybugSize / 2, -ladybugSize / 2, ladybugSize, ladybugSize);
      }
    } else {
      // Resting/crawling: use the full ladybug.png (瓒寸潃)
      const restImg = ladybugImgRef?.current;
      if (restImg && restImg.complete) {
        const rw = restImg.width * 1.1;
        const rh = restImg.height * 1.1;
        // Gentle breathing animation when resting
        const breathe = 1 + Math.sin(now * 0.003) * 0.03;
        ctx.scale(breathe, breathe);
        ctx.drawImage(restImg, -rw / 2, -rh / 2, rw, rh);
      }
    }

    ctx.restore();
  }

  // Level 2: Bird flying from bottom-left ground to upper-right, appears immediately on level entry, 3x speed, 30s interval
  if (level === 1) {
    const birdImg = birdDecoImgRef?.current;
    if (birdImg && birdImg.complete) {
      // Flight takes ~2.7 seconds (tripled speed), then 30s pause
      const flightDuration = 2667;
      const cycleDuration = flightDuration + 30000;
      // Use time relative to level entry so bird appears immediately
      const elapsedSinceEntry = now - (level2StartTimeRef?.current || 0);
      const cycleTime = elapsedSinceEntry >= 0 ? elapsedSinceEntry % cycleDuration : 0;

      if (cycleTime < flightDuration) {
        // Bird is in flight: from bottom-left to upper-right
        const t = cycleTime / flightDuration; // 0 to 1
        const startX = -40;
        const startY = CANVAS_HEIGHT - 60; // near ground level
        const endX = CANVAS_WIDTH + 40;
        const endY = CANVAS_HEIGHT * 0.1; // upper area
        const bx = startX + (endX - startX) * t;
        const by = startY + (endY - startY) * t + Math.sin(t * Math.PI * 3) * 15;
        const tilt = -0.35 + Math.sin(t * Math.PI * 3) * 0.08;
        const birdSize = 55;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(tilt);
        ctx.drawImage(birdImg, -birdSize / 2, -birdSize / 2, birdSize, birdSize);
        ctx.restore();
      }
    }
  }

  // Level 3: Grasshopper jumping in grass every 10 seconds
  if (level === 2) {
    const jumpCycle = now % 10000;
    const grasshopperBaseX = CANVAS_WIDTH * 0.4;
    const grasshopperBaseY = CANVAS_HEIGHT - 30;
    let ghX = grasshopperBaseX;
    let ghY = grasshopperBaseY;
    if (jumpCycle < 800) {
      const t = jumpCycle / 800;
      const jumpDir = Math.sin(now * 0.0001) > 0 ? 1 : -1;
      ghX += jumpDir * 60 * t;
      ghY -= Math.sin(t * Math.PI) * 50;
    }
    ctx.save();
    ctx.translate(ghX, ghY);
    ctx.fillStyle = '#8BC34A';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#689F38';
    ctx.beginPath();
    ctx.arc(10, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#558B2F';
    ctx.lineWidth = 1.5;
    const legAngle = jumpCycle < 800 ? -0.5 : 0.3;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-8, 12 + legAngle * 8);
    ctx.lineTo(-2, 8 + legAngle * 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(6, 12 + legAngle * 8);
    ctx.lineTo(10, 8 + legAngle * 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -5);
    ctx.lineTo(18, -12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13, -4);
    ctx.lineTo(20, -10);
    ctx.stroke();
    ctx.restore();
  }

  // Level 4: Bee collecting nectar from flowers
  if (level === 3) {
    const beeCycle = (now % 5000) / 5000;
    const targetFlower = flowerPositions[beeCycle < 0.5 ? 0 : 1];
    const beeBaseX = targetFlower.x + Math.sin(now * 0.003) * 20;
    const beeBaseY = targetFlower.baseY - targetFlower.size * 0.6 + Math.cos(now * 0.004) * 10;
    ctx.save();
    ctx.translate(beeBaseX, beeBaseY);
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(-3, -5, 2, 10);
    ctx.fillRect(1, -5, 2, 10);
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(8, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    const wingBeat = Math.sin(now * 0.03) * 0.4;
    ctx.fillStyle = 'rgba(200,220,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-2, -6, 7, 4, wingBeat, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-2, 6, 7, 4, -wingBeat, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Level 6: Fireflies flying in figure-8
  if (level === 5) {
    for (let i = 0; i < 6; i++) {
      const phase = (now * 0.001 + i * 1.2);
      const ffx = CANVAS_WIDTH * (0.2 + i * 0.12) + Math.sin(phase) * 40;
      const ffy = CANVAS_HEIGHT * 0.5 + Math.sin(phase * 2) * 30 + i * 15;
      const glow = 0.4 + Math.sin(now * 0.005 + i * 2) * 0.3;
      ctx.save();
      ctx.globalAlpha = glow;
      const ffGlow = ctx.createRadialGradient(ffx, ffy, 1, ffx, ffy, 12);
      ffGlow.addColorStop(0, '#FFEB3B');
      ffGlow.addColorStop(0.5, 'rgba(255,235,59,0.4)');
      ffGlow.addColorStop(1, 'rgba(255,235,59,0)');
      ctx.fillStyle = ffGlow;
      ctx.beginPath();
      ctx.arc(ffx, ffy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(ffx, ffy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

// Decorative flowers are now generated as interactive item entities in createEntities()

// 鈹€鈹€鈹€ Main Game Component 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const littleTomatoImg = useRef<HTMLImageElement | null>(null);
  const monster1Img = useRef<HTMLImageElement | null>(null);
  const flowerImg = useRef<HTMLImageElement | null>(null);
  const flowersImg = useRef<HTMLImageElement | null>(null);
  const pipeImg = useRef<HTMLImageElement | null>(null);
  const rabbitImg = useRef<HTMLImageElement | null>(null);
  const seedImg = useRef<HTMLImageElement | null>(null);
  const frogImg = useRef<HTMLImageElement | null>(null);
  const snailImg = useRef<HTMLImageElement | null>(null);
  const mountainImg = useRef<HTMLImageElement | null>(null);
  const treeImg = useRef<HTMLImageElement | null>(null);
  const cloudImg = useRef<HTMLImageElement | null>(null);
  const piraImg = useRef<HTMLImageElement | null>(null);
  const piraCloseImg = useRef<HTMLImageElement | null>(null);
  const tree2Img = useRef<HTMLImageElement | null>(null);
  const grassImg = useRef<HTMLImageElement | null>(null);
  const landImg = useRef<HTMLImageElement | null>(null);
  const pondImg = useRef<HTMLImageElement | null>(null);
  const waterImg = useRef<HTMLImageElement | null>(null);
  const slopeImg = useRef<HTMLImageElement | null>(null);
  const slopeLeftImg = useRef<HTMLImageElement | null>(null);
  const slopeRightImg = useRef<HTMLImageElement | null>(null);
  const grass3Img = useRef<HTMLImageElement | null>(null);
  const sunImg = useRef<HTMLImageElement | null>(null);
  const sun1Img = useRef<HTMLImageElement | null>(null);
  const sun2Img = useRef<HTMLImageElement | null>(null);
  const moonImg = useRef<HTMLImageElement | null>(null);
  const bigFlowerImg = useRef<HTMLImageElement | null>(null);
  const pea1Img = useRef<HTMLImageElement | null>(null);
  const pea2Img = useRef<HTMLImageElement | null>(null);
  const pea3Img = useRef<HTMLImageElement | null>(null);
  const popcornImg = useRef<HTMLImageElement | null>(null);
  const coinImg = useRef<HTMLImageElement | null>(null);
  const coinAltImg = useRef<HTMLImageElement | null>(null);
  const mushroomImg = useRef<HTMLImageElement | null>(null);
  const carrotImg = useRef<HTMLImageElement | null>(null);
  const arrowImg = useRef<HTMLImageElement | null>(null);
  const thornsImg = useRef<HTMLImageElement | null>(null);
  const dawnBgImg = useRef<HTMLImageElement | null>(null);
  const level5BgImg = useRef<HTMLImageElement | null>(null);
  const caveImg = useRef<HTMLImageElement | null>(null);
  const batImg = useRef<HTMLImageElement | null>(null);
  const eggImg = useRef<HTMLImageElement | null>(null);
  const pinwheel1Img = useRef<HTMLImageElement | null>(null);
  const pinwheel2Img = useRef<HTMLImageElement | null>(null);
  const level9BgImg = useRef<HTMLImageElement | null>(null);
  const level10BgImg = useRef<HTMLImageElement | null>(null);
  const bCloudImg = useRef<HTMLImageElement | null>(null);
  const bCloud2Img = useRef<HTMLImageElement | null>(null);
  const ladybugImg = useRef<HTMLImageElement | null>(null);
  const ladybugBodyImg = useRef<HTMLImageElement | null>(null);
  const ladybugFlyImg = useRef<HTMLImageElement | null>(null);
  const ladybugWingImg = useRef<HTMLImageElement | null>(null);
  const birdDecoImg = useRef<HTMLImageElement | null>(null);
  const owlImg = useRef<HTMLImageElement | null>(null);
  const owlWingLImg = useRef<HTMLImageElement | null>(null);
  const owlWingRImg = useRef<HTMLImageElement | null>(null);
  const lawnImg = useRef<HTMLImageElement | null>(null);
  const lawnFlowerImg = useRef<HTMLImageElement | null>(null);
  const bigFlowerBlueImg = useRef<HTMLImageElement | null>(null);
  const bigFlowerYellowImg = useRef<HTMLImageElement | null>(null);
  const bigFlowerRedImg = useRef<HTMLImageElement | null>(null);
  const subTomatoImg = useRef<HTMLImageElement | null>(null);
  const bBackgroundImg = useRef<HTMLImageElement | null>(null);
  const bBackgroundFrontImg = useRef<HTMLImageElement | null>(null);
  const starImg = useRef<HTMLImageElement | null>(null);
  // Level 10 lightning flash effect
  const lightningFlashRef = useRef<{ active: boolean; startTime: number; intensity: number }>({ active: false, startTime: 0, intensity: 0 });
  const lastThunderTimeRef = useRef<number>(0);

  // Firework bounce spark particles
  const fireworkSparksRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number;
    r: number; g: number; b: number; gravity: number;
  }>>([]);

  // Camera shake state for firework explosions
  const cameraShakeRef = useRef<{ intensity: number; duration: number; startTime: number; offsetX: number; offsetY: number }>({ intensity: 0, duration: 0, startTime: 0, offsetX: 0, offsetY: 0 });

  // Character particle effects system
  interface CharParticle {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number;
    r: number; g: number; b: number;
    type: 'dust' | 'star' | 'spark' | 'sparkle' | 'ring' | 'trail';
    gravity: number; rotation?: number; rotSpeed?: number; scale?: number;
  }
  const charParticlesRef = useRef<CharParticle[]>([]);
  const prevOnGroundRef = useRef(false);
  const runTrailTimerRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const bgmPlayingRef = useRef(false);
  const sfxEnabledRef = useRef(true);
  // Wind sound for pinwheel (Level 9)
  const windNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const windGainNodeRef = useRef<GainNode | null>(null);
  const windFilterNodeRef = useRef<BiquadFilterNode | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      bgmGainRef.current = audioCtxRef.current.createGain();
      bgmGainRef.current.gain.value = 0.3;
      bgmGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Start wind noise loop for pinwheel (Level 9)
  const startWindSound = () => {
    if (windNoiseNodeRef.current) return; // already running
    try {
      const ctx = getAudioCtx();
      // Create noise buffer (white noise)
      const bufferSize = ctx.sampleRate * 2; // 2 seconds loop
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      // Source node (looping noise)
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      // Bandpass filter to shape wind sound (low-mid frequencies)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.8;
      // Gain node to control volume based on speed
      const gain = ctx.createGain();
      gain.gain.value = 0; // start silent
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      windNoiseNodeRef.current = source;
      windGainNodeRef.current = gain;
      windFilterNodeRef.current = filter;
    } catch (_) { /* ignore audio errors */ }
  };

  // Stop wind noise
  const stopWindSound = () => {
    if (windNoiseNodeRef.current) {
      try { windNoiseNodeRef.current.stop(); } catch (_) { /* ignore */ }
      windNoiseNodeRef.current = null;
    }
    windGainNodeRef.current = null;
    windFilterNodeRef.current = null;
  };

  // Update wind sound volume based on windmill speed (0-1)
  const updateWindSoundVolume = (speedMultiplier: number) => {
    if (!windGainNodeRef.current || !windFilterNodeRef.current) return;
    if (isMutedRef.current || !sfxEnabledRef.current) {
      windGainNodeRef.current.gain.value = 0;
      return;
    }
    // Volume scales with speed: 0 when stopped, max 0.25 at full speed
    const targetVol = speedMultiplier * 0.25;
    windGainNodeRef.current.gain.value = targetVol;
    // Shift filter frequency higher when faster (more whooshing)
    windFilterNodeRef.current.frequency.value = 300 + speedMultiplier * 600;
  };

  const playSfx = (type: 'jump' | 'coin' | 'star' | 'damage' | 'win' | 'die' | 'hit' | 'thunder' | 'egg_crack') => {
    if (!sfxEnabledRef.current) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.15;
      const t = ctx.currentTime;

      switch (type) {
        case 'jump':
          osc.type = 'square';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(600, t + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
          osc.start(t); osc.stop(t + 0.15);
          break;
        case 'coin':
          osc.type = 'square';
          osc.frequency.setValueAtTime(988, t);
          osc.frequency.setValueAtTime(1319, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
          osc.start(t); osc.stop(t + 0.15);
          break;
        case 'star':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523, t);
          osc.frequency.linearRampToValueAtTime(1047, t + 0.2);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
          osc.start(t); osc.stop(t + 0.3);
          break;
        case 'damage':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.linearRampToValueAtTime(80, t + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
          osc.start(t); osc.stop(t + 0.25);
          break;
        case 'hit':
          // Impact hit sound - sharp attack with low rumble
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(250, t);
          osc.frequency.linearRampToValueAtTime(60, t + 0.15);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
          osc.start(t); osc.stop(t + 0.2);
          // Secondary thud
          {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(80, t);
            osc2.frequency.linearRampToValueAtTime(40, t + 0.15);
            gain2.gain.setValueAtTime(0.3, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc2.start(t); osc2.stop(t + 0.2);
          }
          break;
        case 'thunder':
          // Thunder rumble - low frequency noise burst
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(60, t);
          osc.frequency.linearRampToValueAtTime(30, t + 0.8);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.setValueAtTime(0.25, t + 0.1);
          gain.gain.linearRampToValueAtTime(0.15, t + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
          osc.start(t); osc.stop(t + 1.0);
          // Crackle layer
          {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(150, t);
            osc2.frequency.linearRampToValueAtTime(40, t + 0.4);
            gain2.gain.setValueAtTime(0.15, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc2.start(t); osc2.stop(t + 0.5);
          }
          break;
        case 'egg_crack':
          // Egg crack - short crisp snap
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, t);
          osc.frequency.linearRampToValueAtTime(400, t + 0.05);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
          osc.start(t); osc.stop(t + 0.1);
          break;
        case 'win':
          osc.type = 'square';
          osc.frequency.setValueAtTime(523, t);
          osc.frequency.setValueAtTime(659, t + 0.1);
          osc.frequency.setValueAtTime(784, t + 0.2);
          osc.frequency.setValueAtTime(1047, t + 0.3);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
          osc.start(t); osc.stop(t + 0.5);
          break;
        case 'die':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, t);
          osc.frequency.linearRampToValueAtTime(50, t + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
          osc.start(t); osc.stop(t + 0.6);
          break;
      }
    } catch (e) { /* audio not supported */ }
  };

  const startBgm = () => {
    if (bgmPlayingRef.current) return;
    try {
      const ctx = getAudioCtx();
      if (!bgmGainRef.current) return;
      bgmPlayingRef.current = true;

      // Cheerful, bouncy melody - light and joyful like a sunny adventure
      // Key of C major, pentatonic-friendly for pleasant feel
      const melody = [
        // Phrase 1: ascending cheerful motif
        659, 784, 880, 784, 659, 784, 1047, 880,
        // Phrase 2: playful bounce
        784, 659, 784, 880, 1047, 880, 784, 659,
        // Phrase 3: gentle descent with skip
        880, 784, 659, 523, 659, 784, 659, 523,
        // Phrase 4: resolution with hop
        587, 659, 784, 880, 784, 659, 587, 523
      ];
      const noteLen = 0.15; // Faster tempo for bouncy feel
      const loopLen = melody.length * noteLen;

      const playLoop = () => {
        if (!bgmPlayingRef.current || !audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;

        // Main melody - soft sine wave for gentle, pleasant tone
        melody.forEach((freq, i) => {
          const osc = audioCtxRef.current!.createOscillator();
          const noteGain = audioCtxRef.current!.createGain();
          osc.connect(noteGain);
          noteGain.connect(bgmGainRef.current!);
          osc.type = 'sine';
          osc.frequency.value = freq;
          // Soft attack, gentle release for smooth feel
          noteGain.gain.setValueAtTime(0, now + i * noteLen);
          noteGain.gain.linearRampToValueAtTime(0.25, now + i * noteLen + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.85) * noteLen);
          osc.start(now + i * noteLen);
          osc.stop(now + (i + 0.9) * noteLen);
        });

        // Harmony layer - triangle wave, octave below, softer
        const harmony = [
          523, 659, 784, 659, 523, 659, 880, 784,
          659, 523, 659, 784, 880, 784, 659, 523,
          784, 659, 523, 440, 523, 659, 523, 440,
          494, 523, 659, 784, 659, 523, 494, 440
        ];
        harmony.forEach((freq, i) => {
          const osc = audioCtxRef.current!.createOscillator();
          const noteGain = audioCtxRef.current!.createGain();
          osc.connect(noteGain);
          noteGain.connect(bgmGainRef.current!);
          osc.type = 'triangle';
          osc.frequency.value = freq * 0.5; // One octave lower
          noteGain.gain.setValueAtTime(0, now + i * noteLen);
          noteGain.gain.linearRampToValueAtTime(0.12, now + i * noteLen + 0.03);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.7) * noteLen);
          osc.start(now + i * noteLen);
          osc.stop(now + (i + 0.75) * noteLen);
        });

        // Bouncy bass - staccato feel, root notes
        const bassNotes = [131, 165, 175, 196, 165, 175, 131, 165,
                           175, 131, 165, 196, 175, 165, 131, 110];
        const bNoteLen = loopLen / bassNotes.length;
        bassNotes.forEach((freq, i) => {
          const osc = audioCtxRef.current!.createOscillator();
          const noteGain = audioCtxRef.current!.createGain();
          osc.connect(noteGain);
          noteGain.connect(bgmGainRef.current!);
          osc.type = 'triangle';
          osc.frequency.value = freq;
          // Staccato bounce
          noteGain.gain.setValueAtTime(0.3, now + i * bNoteLen);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.4) * bNoteLen);
          osc.start(now + i * bNoteLen);
          osc.stop(now + (i + 0.45) * bNoteLen);
        });

        // Light percussion - hi-hat style clicks for rhythm
        const percCount = Math.floor(loopLen / 0.15);
        for (let i = 0; i < percCount; i++) {
          if (i % 2 === 0) { // Every other beat
            const osc = audioCtxRef.current!.createOscillator();
            const noteGain = audioCtxRef.current!.createGain();
            const filter = audioCtxRef.current!.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 8000;
            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(bgmGainRef.current!);
            osc.type = 'square';
            osc.frequency.value = 1200 + Math.random() * 400;
            const t = now + i * 0.15;
            noteGain.gain.setValueAtTime(0.06, t);
            noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            osc.start(t);
            osc.stop(t + 0.04);
          }
        }

        setTimeout(playLoop, loopLen * 1000);
      };
      playLoop();
    } catch (e) { /* audio not supported */ }
  };

  const stopBgm = () => {
    bgmPlayingRef.current = false;
  };

  // Pipe enter animation state
  const pipeAnimRef = useRef<{
    active: boolean;
    phase: 'bounce' | 'sink';
    startTime: number;
    pipeX: number;
    pipeY: number;
    targetInSubWorld: boolean;
    nextEntities: Entity[];
    spawnX: number;
    spawnY: number;
    destPipeX: number;
    destPipeY: number;
  } | null>(null);

  useEffect(() => {
    const img1 = new Image();
    img1.src = assetUrl('little tomato.png');
    littleTomatoImg.current = img1;
    const img2 = new Image();
    img2.src = assetUrl('monster1.png');
    monster1Img.current = img2;
    const img3 = new Image();
    img3.src = assetUrl('flower.png');
    flowerImg.current = img3;
    const img4 = new Image();
    img4.src = assetUrl('flowers.png');
    flowersImg.current = img4;
    const img5 = new Image();
    img5.src = assetUrl('pipe.png');
    pipeImg.current = img5;
    const img6 = new Image();
    img6.src = assetUrl('rabbit.png');
    rabbitImg.current = img6;
    const img7 = new Image();
    img7.src = assetUrl('seed.png');
    seedImg.current = img7;
    const img7b = new Image();
    img7b.src = assetUrl('real-mushroom.png');
    mushroomImg.current = img7b;
    const img7c = new Image();
    img7c.src = assetUrl('carrot.png');
    carrotImg.current = img7c;
    const img7d = new Image();
    img7d.src = assetUrl('pipe.png');
    arrowImg.current = img7d;
    const img8 = new Image();
    img8.src = assetUrl('frog.png');
    frogImg.current = img8;
    const img9 = new Image();
    img9.src = assetUrl('snail.png');
    snailImg.current = img9;
    const img10 = new Image();
    img10.src = assetUrl('mountain.png');
    mountainImg.current = img10;
    const img11 = new Image();
    img11.src = assetUrl('tree.png');
    treeImg.current = img11;
    const img12 = new Image();
    img12.src = assetUrl('homepage-cloud.png');
    cloudImg.current = img12;
    const img13 = new Image();
    img13.src = assetUrl('pira.png');
    piraImg.current = img13;
    const img14 = new Image();
    img14.src = assetUrl('pira-close.png');
    piraCloseImg.current = img14;
    const img15 = new Image();
    img15.src = assetUrl('tree2.png');
    tree2Img.current = img15;
    const img16 = new Image();
    img16.src = assetUrl('grass.png');
    grassImg.current = img16;
    const img17 = new Image();
    img17.src = assetUrl('land.png');
    landImg.current = img17;
    const img18 = new Image();
    img18.src = assetUrl('pond.png');
    pondImg.current = img18;
    const img19 = new Image();
    img19.src = assetUrl('water.png');
    waterImg.current = img19;
    const img20 = new Image();
    img20.src = assetUrl('assets/slope-big.png');
    slopeImg.current = img20;
    const imgSlopeLeft = new Image();
    imgSlopeLeft.src = assetUrl('assets/slope_left.png');
    slopeLeftImg.current = imgSlopeLeft;
    const imgSlopeRight = new Image();
    imgSlopeRight.src = assetUrl('assets/slope_right.png');
    slopeRightImg.current = imgSlopeRight;
    const imgGrass3 = new Image();
    imgGrass3.src = assetUrl('assets/grass3.png');
    grass3Img.current = imgGrass3;
    const img21 = new Image();
    img21.src = assetUrl('sun.png');
    sunImg.current = img21;
    const imgSun1 = new Image();
    imgSun1.src = assetUrl('sun1.png');
    sun1Img.current = imgSun1;
    const imgSun2 = new Image();
    imgSun2.src = assetUrl('sun2.png');
    sun2Img.current = imgSun2;
    const imgMoon = new Image();
    imgMoon.src = assetUrl('moon.png');
    moonImg.current = imgMoon;
    const img22 = new Image();
    img22.src = assetUrl('big-flower.png');
    bigFlowerImg.current = img22;
    const img25 = new Image();
    img25.src = assetUrl('assets/pea1.png');
    pea1Img.current = img25;
    const img26 = new Image();
    img26.src = assetUrl('assets/pea2.png');
    pea2Img.current = img26;
    const img27 = new Image();
    img27.src = assetUrl('assets/pea3.png');
    pea3Img.current = img27;
    const imgPopcorn = new Image();
    imgPopcorn.src = assetUrl('popcorn.png');
    popcornImg.current = imgPopcorn;
    const imgCoin = new Image();
    imgCoin.src = assetUrl('coin.png');
    coinImg.current = imgCoin;
    const imgCoinAlt = new Image();
    imgCoinAlt.src = assetUrl('coin-1.png');
    coinAltImg.current = imgCoinAlt;
    const img28 = new Image();
    img28.src = assetUrl('assets/level1-bg.jpg');
    dawnBgImg.current = img28;

    const img29 = new Image();
    img29.src = assetUrl('assets/05.jpg');
    level5BgImg.current = img29;

    const img30 = new Image();
    img30.src = assetUrl('assets/cave.png');
    caveImg.current = img30;

    const img31 = new Image();
    img31.src = assetUrl('assets/bat.png');
    batImg.current = img31;
    const img33 = new Image();
    img33.src = assetUrl('assets/egg.png');
    eggImg.current = img33;
    const img34 = new Image();
    img34.src = assetUrl('assets/pinwheel-1.png');
    pinwheel1Img.current = img34;
    const img35 = new Image();
    img35.src = assetUrl('assets/pinwheel-2.png');
    pinwheel2Img.current = img35;
    const img36a = new Image();
    img36a.src = assetUrl('assets/9-background.png');
    level9BgImg.current = img36a;
    const img36 = new Image();
    img36.src = assetUrl('assets/10.jpg');
    level10BgImg.current = img36;
    const img37 = new Image();
    img37.src = assetUrl('assets/b-cloud.png');
    bCloudImg.current = img37;
    const img38 = new Image();
    img38.src = assetUrl('assets/b-cloud2.png');
    bCloud2Img.current = img38;
    const imgLadybug = new Image();
    imgLadybug.src = assetUrl('assets/ladybug.png');
    ladybugImg.current = imgLadybug;
    const imgLadybugBody = new Image();
    imgLadybugBody.src = assetUrl('assets/ladybug-body.png');
    ladybugBodyImg.current = imgLadybugBody;
    const imgLadybugFly = new Image();
    imgLadybugFly.src = assetUrl('assets/ladybug-fly.png');
    ladybugFlyImg.current = imgLadybugFly;
    const imgLadybugWing = new Image();
    imgLadybugWing.src = assetUrl('assets/ladybug-wing.png');
    ladybugWingImg.current = imgLadybugWing;
    const imgBirdDeco = new Image();
    imgBirdDeco.src = assetUrl('assets/bird.png');
    birdDecoImg.current = imgBirdDeco;
    const imgOwl = new Image();
    imgOwl.src = assetUrl('assets/owl.png');
    owlImg.current = imgOwl;
    const imgOwlWingL = new Image();
    imgOwlWingL.src = assetUrl('assets/owl-wing-l.png');
    owlWingLImg.current = imgOwlWingL;
    const imgOwlWingR = new Image();
    imgOwlWingR.src = assetUrl('assets/owl-wing-r.png');
    owlWingRImg.current = imgOwlWingR;
    const imgLawn = new Image();
    imgLawn.src = assetUrl('assets/lawn.png');
    lawnImg.current = imgLawn;
    const imgLawnFlower = new Image();
    imgLawnFlower.src = assetUrl('assets/lawn-1.png');
    lawnFlowerImg.current = imgLawnFlower;
    const imgBigFlowerBlue = new Image();
    imgBigFlowerBlue.src = assetUrl('assets/big-flower-blue.png');
    bigFlowerBlueImg.current = imgBigFlowerBlue;
    const imgBigFlowerYellow = new Image();
    imgBigFlowerYellow.src = assetUrl('assets/big-flower-yellow.png');
    bigFlowerYellowImg.current = imgBigFlowerYellow;
    const imgBigFlowerRed = new Image();
    imgBigFlowerRed.src = assetUrl('assets/big-flower-red.png');
    bigFlowerRedImg.current = imgBigFlowerRed;
    const imgThorns = new Image();
    imgThorns.src = assetUrl('thorns.png');
    thornsImg.current = imgThorns;
    const imgSubTomato = new Image();
    imgSubTomato.src = assetUrl('assets/sub-tomato.png');
    subTomatoImg.current = imgSubTomato;
    const imgBBg = new Image();
    imgBBg.src = assetUrl('assets/b-background.png');
    bBackgroundImg.current = imgBBg;
    const imgBBgFront = new Image();
    imgBBgFront.src = assetUrl('assets/b-background-1.png');
    bBackgroundFrontImg.current = imgBBgFront;
    const imgStar = new Image();
    imgStar.src = assetUrl('assets/star.png');
    starImg.current = imgStar;
  }, []);

  const [gameState, setGameState] = useState<GameState>({
    player: createPlayer(LEVELS[0]),
    entities: createEntities(LEVELS[0], false, 0),
    projectiles: [],
    score: 0, coins: 0, currentLevel: 0,
    inSubWorld: false, gameOver: false, gameWon: false, gameStarted: false,
    cameraX: 0, lives: 3, lastDamageTime: 0, isClimbing: false,
    stars: 0,
  });

  // Start BGM when game starts
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
      startBgm();
    } else {
      stopBgm();
    }
    return () => { stopBgm(); stopWindSound(); };
  }, [gameState.gameStarted, gameState.gameOver, gameState.gameWon]);

  // Sound toggle state
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  // Settings panel state
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const toggleSound = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;
    if (newMuted) {
      // Mute: set BGM gain to 0 and disable SFX
      if (bgmGainRef.current) bgmGainRef.current.gain.value = 0;
      sfxEnabledRef.current = false;
      // Mute wind sound
      if (windGainNodeRef.current) windGainNodeRef.current.gain.value = 0;
    } else {
      // Unmute: restore BGM gain and enable SFX
      if (bgmGainRef.current) bgmGainRef.current.gain.value = 0.3;
      sfxEnabledRef.current = true;
      // Wind sound will be restored by updateWindSoundVolume in game loop
    }
  };

  // Star exchange UI state
  const [showStarExchange, setShowStarExchange] = useState(false);
  const [starPulseStart, setStarPulseStart] = useState<number | null>(null);
  // Level selection UI state
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const el = gameContainerRef.current as any;
    if (!el) return;
    const doc = document as any;
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
    if (!isFs) {
      const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (requestFs) {
        requestFs.call(el).then(() => setIsFullscreen(true)).catch(() => {});
      }
    } else {
      const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
      if (exitFs) {
        exitFs.call(doc).then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Level transition animation state
  const [levelTransition, setLevelTransition] = useState<{
    active: boolean;
    fromLevel: number;
    toLevel: number;
    startTime: number;
  } | null>(null);
  const transitionCanvasRef = useRef<HTMLCanvasElement>(null);

  // Level transition animation effect
  useEffect(() => {
    if (!levelTransition?.active) return;
    const canvas = transitionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DURATION = 2000; // 2 seconds transition
    const fromConfig = LEVEL_SKY_CONFIGS[levelTransition.fromLevel];
    const toConfig = LEVEL_SKY_CONFIGS[levelTransition.toLevel];

    // Helper to interpolate hex colors
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const rgbToHex = (r: number, g: number, b: number) =>
      '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    const lerpColor = (c1: string, c2: string, t: number) => {
      const [r1, g1, b1] = hexToRgb(c1);
      const [r2, g2, b2] = hexToRgb(c2);
      return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
    };

    let animFrame: number;
    const animate = () => {
      const elapsed = Date.now() - levelTransition.startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      // Ease in-out cubic
      const t = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Interpolate sky gradient
      const maxStops = Math.max(fromConfig.skyStops.length, toConfig.skyStops.length);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      for (let i = 0; i < maxStops; i++) {
        const fromStop = fromConfig.skyStops[Math.min(i, fromConfig.skyStops.length - 1)];
        const toStop = toConfig.skyStops[Math.min(i, toConfig.skyStops.length - 1)];
        const pos = fromStop[0] + (toStop[0] - fromStop[0]) * t;
        const color = lerpColor(fromStop[1], toStop[1], t);
        grad.addColorStop(pos, color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Interpolate stars visibility
      const fromStars = fromConfig.stars ? 1 : 0;
      const toStars = toConfig.stars ? 1 : 0;
      const starsAlpha = fromStars + (toStars - fromStars) * t;
      if (starsAlpha > 0) {
        ctx.globalAlpha = starsAlpha;
        // Draw twinkling stars
        const starPositions = [
          [0.1, 0.1], [0.2, 0.15], [0.35, 0.08], [0.5, 0.18], [0.65, 0.05],
          [0.75, 0.12], [0.85, 0.2], [0.15, 0.25], [0.45, 0.28], [0.7, 0.22],
          [0.9, 0.08], [0.3, 0.3], [0.55, 0.1], [0.8, 0.28], [0.05, 0.2],
        ];
        const twinkle = Math.sin(elapsed * 0.003) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 240, ${twinkle})`;
        starPositions.forEach(([sx, sy]) => {
          const size = 1.5 + Math.sin(sx * 10 + elapsed * 0.002) * 0.8;
          ctx.beginPath();
          ctx.arc(sx * w, sy * h, size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Interpolate sun/moon using actual image assets
      const fromSM = fromConfig.sunMoon;
      const toSM = toConfig.sunMoon;
      if (fromSM || toSM) {
        const fromX = fromSM ? fromSM.x : (toSM!.x);
        const fromY = fromSM ? fromSM.y : 1.2; // off-screen if no sun/moon
        const fromSize = fromSM ? fromSM.size : 0;
        const toX = toSM ? toSM.x : (fromSM!.x);
        const toY = toSM ? toSM.y : 1.2;
        const toSize = toSM ? toSM.size : 0;

        const cx = (fromX + (toX - fromX) * t) * w;
        const cy = (fromY + (toY - fromY) * t) * h;
        const size = fromSize + (toSize - fromSize) * t;

        // Determine if transitioning between sun and moon
        const fromType = fromSM?.type || 'sun';
        const toType = toSM?.type || 'sun';

        const drawSunImage = (x: number, y: number, s: number, alpha: number) => {
          ctx.globalAlpha = alpha;
          const s1 = sun1Img.current;
          const s2 = sun2Img.current;
          if (s1 && s1.complete && s2 && s2.complete) {
            // Glow behind sun
            const glowRadius = s * 2.5;
            const sunGlow = ctx.createRadialGradient(x, y, s * 0.5, x, y, glowRadius);
            sunGlow.addColorStop(0, `rgba(255,245,157,${0.55 * alpha})`);
            sunGlow.addColorStop(0.35, `rgba(255,224,130,${0.3 * alpha})`);
            sunGlow.addColorStop(0.65, `rgba(255,200,50,${0.1 * alpha})`);
            sunGlow.addColorStop(1, 'rgba(255,235,59,0)');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            // Layer 1: sun1 (rays) - rotates
            const rot = (elapsed * 0.0005) % (Math.PI * 2);
            const drawSize1 = s * 2.8;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.drawImage(s1, -drawSize1 / 2, -drawSize1 / 2, drawSize1, drawSize1);
            ctx.restore();
            // Layer 2: sun2 (face) - static
            const drawSize2 = s * 2.0;
            ctx.drawImage(s2, x - drawSize2 / 2, y - drawSize2 / 2, drawSize2, drawSize2);
          } else {
            // Fallback: use single sun image
            const sImg = sunImg.current;
            if (sImg && sImg.complete) {
              const drawSize = s * 2.5;
              ctx.drawImage(sImg, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
            }
          }
          ctx.globalAlpha = 1;
        };

        const drawMoonImage = (x: number, y: number, s: number, alpha: number) => {
          ctx.globalAlpha = alpha;
          const mImg = moonImg.current;
          if (mImg && mImg.complete) {
            // Soft moon glow
            const moonGlow = ctx.createRadialGradient(x, y, s * 0.3, x, y, s * 2);
            moonGlow.addColorStop(0, `rgba(200,220,255,${0.3 * alpha})`);
            moonGlow.addColorStop(0.5, `rgba(150,180,220,${0.15 * alpha})`);
            moonGlow.addColorStop(1, 'rgba(100,150,200,0)');
            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(x, y, s * 2, 0, Math.PI * 2);
            ctx.fill();
            // Draw moon image
            const drawSize = s * 2.5;
            ctx.drawImage(mImg, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
          }
          ctx.globalAlpha = 1;
        };

        if (fromType === 'sun' && toType === 'sun') {
          drawSunImage(cx, cy, size, 1);
        } else if (fromType === 'moon' && toType === 'moon') {
          drawMoonImage(cx, cy, size, 1);
        } else {
          // Transitioning between sun and moon - crossfade
          const sunAlpha = fromType === 'sun' ? (1 - t) : t;
          const moonAlpha = 1 - sunAlpha;
          if (sunAlpha > 0.01) {
            drawSunImage(cx, cy, size, sunAlpha);
          }
          if (moonAlpha > 0.01) {
            drawMoonImage(cx, cy, size, moonAlpha);
          }
        }
      }

      // Level text overlay
      const textAlpha = t < 0.3 ? t / 0.3 : (t > 0.7 ? (1 - t) / 0.3 : 1);
      ctx.globalAlpha = Math.max(0, Math.min(1, textAlpha));
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(`第${levelTransition.toLevel + 1} 关`, w / 2, h / 2 - 10);
      ctx.font = '16px sans-serif';
      const timeLabels = ['黎明', '清晨', '正午', '午后', '傍晚', '夜晚', '深夜', '凌晨', '黎明', '清晨'];
      ctx.fillText(timeLabels[levelTransition.toLevel] || '', w / 2, h / 2 + 20);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Fade edges (vignette)
      const fadeAlpha = Math.sin(progress * Math.PI) * 0.3;
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h * 0.05);
      ctx.fillRect(0, h * 0.95, w, h * 0.05);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      } else {
        // Transition complete - start the new level
        resetGame(levelTransition.toLevel);
        setLevelTransition(null);
      }
    };

    animate();
    return () => { if (animFrame) cancelAnimationFrame(animFrame); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelTransition]);

  // Function to start level transition
  const startLevelTransition = (fromLevel: number, toLevel: number) => {
    setLevelTransition({
      active: true,
      fromLevel,
      toLevel,
      startTime: Date.now(),
    });
  };

  // Trigger star pulse animation when stars reach 3
  useEffect(() => {
    if (gameState.stars >= 3 && !starPulseStart) {
      setStarPulseStart(Date.now());
    }
    if (gameState.stars < 3 && starPulseStart) {
      setStarPulseStart(null);
    }
  }, [gameState.stars, starPulseStart]);

  const handleStarExchange = (accept: boolean) => {
    if (accept) {
      setGameState(prev => {
        if (prev.stars >= 3 && prev.lives < 3) {
          return { ...prev, stars: prev.stars - 3, lives: prev.lives + 1 };
        }
        return prev;
      });
    }
    setShowStarExchange(false);
    setStarPulseStart(null);
  };

  // Death animation state
  const deathAnimRef = useRef<{active: boolean; phase: 'bounce' | 'fall'; startTime: number; startX: number; startY: number; cameraX: number} | null>(null);
  // Respawn flash state
  const respawnFlashRef = useRef<{active: boolean; startTime: number} | null>(null);

  const keys = useRef<Record<string, boolean>>({});
  const lastJumpPressed = useRef(false);
  const lastAttackPressed = useRef(false);
  const touchState = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Track when gameWon was set to prevent immediate auto-advance
  const gameWonTimeRef = useRef<number>(0);
  useEffect(() => {
    if (gameState.gameWon) {
      gameWonTimeRef.current = Date.now();
    }
  }, [gameState.gameWon]);

  // Ref to track when Level 2 is entered (for bird immediate appearance)
  const level2StartTimeRef = useRef(0);
  const level3SubWorldStartTimeRef = useRef(0);
  const level3SubWorldMoleSpawnRef = useRef(0);
  const level1RecoveryRef = useRef({ lastX: 0, lastY: 0, lastMoveTime: 0 });
  // Ref to track current level for game-over restart (avoids stale closure)
  const currentLevelRef = useRef(0);
  useEffect(() => {
    currentLevelRef.current = gameState.currentLevel;
    // Record when Level 2 (index 1) is entered
    if (gameState.currentLevel === 1) {
      level2StartTimeRef.current = Date.now();
    }
    if (gameState.currentLevel === 2 && !gameState.inSubWorld) {
      level3SubWorldStartTimeRef.current = 0;
      level3SubWorldMoleSpawnRef.current = 0;
    }
    if (gameState.currentLevel === 0) {
      level1RecoveryRef.current = {
        lastX: gameState.player.x,
        lastY: gameState.player.y,
        lastMoveTime: Date.now(),
      };
    }
  }, [gameState.currentLevel]);
  const gameOverRef = useRef(false);
  useEffect(() => { gameOverRef.current = gameState.gameOver; }, [gameState.gameOver]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resetGameRef = useRef<(levelIdx?: number) => void>(null as any);

  const resetGame = (levelIdx = 0) => {
    const level = LEVELS[levelIdx];
    const initialPlayer = createPlayer(level);
    // Clear all animation refs to prevent stale state crashes
    pipeAnimRef.current = null;
    deathAnimRef.current = null;
    respawnFlashRef.current = { active: true, startTime: Date.now() };
    fireworkSparksRef.current = [];
    // Reset key states to prevent stuck keys after restart
    keys.current = {};
    touchState.current = {};
    lastJumpPressed.current = false;
    lastAttackPressed.current = false;
    // Wind sound: start on Level 9, stop on other levels
    if (levelIdx === 8) {
      startWindSound();
    } else {
      stopWindSound();
    }
      setGameState(prev => ({
      ...prev, player: initialPlayer, entities: createEntities(level, false, levelIdx), projectiles: [],
      score: levelIdx === 0 ? 0 : prev.score, coins: levelIdx === 0 ? 0 : prev.coins,
      stars: levelIdx === 0 ? 0 : prev.stars,
      lives: (levelIdx === 0 || prev.lives <= 0) ? 3 : prev.lives, currentLevel: levelIdx,
      inSubWorld: false, gameOver: false, gameWon: false, gameStarted: true,
      cameraX: 0, lastDamageTime: 0, isClimbing: false,
    }));
  };
  resetGameRef.current = resetGame;

  // Transition handler: game over (any key restarts), Enter for start/next level
  useEffect(() => {
    const handleTransition = (e: KeyboardEvent) => {
      // Ignore input during level transition
      if (levelTransition?.active) return;
      // Game over: any key restarts current level
      if (gameOverRef.current) {
        resetGameRef.current(currentLevelRef.current);
        return;
      }
      // Only Enter key triggers other transitions (Space is reserved for jump during gameplay)
      if (e.code !== 'Enter') return;
      setGameState(prev => {
      if (!prev.gameStarted) {
          return { ...prev, player: createPlayer(LEVELS[0]), entities: createEntities(LEVELS[0], false, 0), projectiles: [], score: 0, coins: 0, stars: 0, lives: 3, currentLevel: 0, inSubWorld: false, gameOver: false, gameWon: false, gameStarted: true, cameraX: 0, lastDamageTime: 0, isClimbing: false };
        }
        if (prev.gameWon) {
          // Require at least 1 second delay before allowing level advance to prevent accidental skip
          if (Date.now() - gameWonTimeRef.current < 1000) return prev;
          const next = (prev.currentLevel + 1) % LEVELS.length;
          // Use transition animation instead of direct reset
          startLevelTransition(prev.currentLevel, next);
          return prev; // Don't change state yet - transition will handle it
        }
        return prev;
      });
    };
    window.addEventListener('keydown', handleTransition);
    return () => window.removeEventListener('keydown', handleTransition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelTransition]);

  // 鈹€鈹€鈹€ Game Update Loop 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const update = useCallback(() => {
    setGameState(prev => {
      if (!prev.gameStarted || prev.gameOver || prev.gameWon) return prev;
      try {

      const now = Date.now();
      const pipeAnim = pipeAnimRef.current;
      if (pipeAnim && pipeAnim.active) {
        const elapsed = now - pipeAnim.startTime;
        if (elapsed < 360) {
          return prev;
        }
        if (pipeAnim.phase === 'sink') {
          const nextPlayer = { ...prev.player };
          nextPlayer.x = pipeAnim.spawnX;
          nextPlayer.y = pipeAnim.spawnY;
          nextPlayer.vx = 0;
          nextPlayer.vy = 0;
          nextPlayer.onGround = false;
          nextPlayer.jumpsRemaining = 2;
          nextPlayer.squashX = 1;
          nextPlayer.squashY = 1;
          const nextCameraX = Math.max(0, nextPlayer.x - CANVAS_WIDTH / 3);
          pipeAnimRef.current = {
            ...pipeAnim,
            phase: 'bounce',
            startTime: now,
            pipeX: pipeAnim.destPipeX,
            pipeY: pipeAnim.destPipeY,
          };
          return {
            ...prev,
            player: nextPlayer,
            entities: pipeAnim.nextEntities.map(e => ({ ...e })),
            projectiles: [],
            inSubWorld: pipeAnim.targetInSubWorld,
            cameraX: nextCameraX,
            isClimbing: false,
          };
        }
        pipeAnimRef.current = null;
        return prev;
      }

      if (prev.currentLevel === 2 && !prev.inSubWorld) {
        const hasLevelGround = prev.entities.some(e => e.type === 'platform' && !e.subWorld);
        const hasPipe = prev.entities.some(e => e.type === 'pipe' && !e.subWorld);
        const playerMissing = !Number.isFinite(prev.player.x) || !Number.isFinite(prev.player.y) || prev.player.y > CANVAS_HEIGHT + 20;
        if (!hasLevelGround || !hasPipe || playerMissing) {
          return {
            ...prev,
            player: createPlayer(LEVELS[2]),
            entities: createEntities(LEVELS[2], false, 2),
            projectiles: [],
            inSubWorld: false,
            cameraX: 0,
            isClimbing: false,
          };
        }
      }
      const player = { ...prev.player };
      let entities = prev.entities.map(e => ({ ...e }));
      let score = prev.score;
      let coins = prev.coins;
      let lives = prev.lives;
      let stars = prev.stars || 0;
      let gameOver = false;
      let gameWon = false;

      // 鈹€鈹€鈹€ Pre-compute entity type lookups (avoids repeated .filter() per frame) 鈹€鈹€鈹€
      const currentLevelIdx = prev.currentLevel;
      let inSubWorld = prev.inSubWorld;
      const activeLevel = inSubWorld ? SUB_WORLD_LEVELS[0] : LEVELS[currentLevelIdx];
      const activeLevelWidth = activeLevel[0].length * TILE_SIZE;
      if (currentLevelIdx === 7) {
        entities = entities.filter(e => !(e.type === 'enemy' && e.enemyType === 'piranha'));
      }

      let nextProjectiles: Projectile[] = prev.projectiles.map(p => ({ ...p }));
      let lastDamageTime = prev.lastDamageTime;
      let cameraXOverride: number | null = null;
      let exitSubWorldFromStar = false;
      let isClimbing = prev.isClimbing;

      // 鈹€鈹€鈹€ Pre-compute entity type arrays (computed ONCE per frame, reused everywhere) 鈹€鈹€鈹€
      const _platforms: Entity[] = [];
      const _enemies: Entity[] = [];
      const _vines: Entity[] = [];
      const _items: Entity[] = [];
      const _hazards: Entity[] = [];
      const _muds: Entity[] = [];
      const _thorns: Entity[] = [];
      const _pipes: Entity[] = [];
      const _goals: Entity[] = [];
      const _pillars: Entity[] = [];
      const _slopes: Entity[] = [];
      const _cannons: Entity[] = [];
      const _peaShooters: Entity[] = [];
      const _windmills: Entity[] = [];
      const _caveIntakes: Entity[] = [];
      const _caveExhausts: Entity[] = [];
      for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.subWorld !== inSubWorld) continue;
        switch (e.type) {
          case 'platform': _platforms.push(e); break;
          case 'enemy': if (!e.isDead) _enemies.push(e); break;
          case 'vine': _vines.push(e); break;
          case 'item': _items.push(e); break;
          case 'hazard': _hazards.push(e); break;
          case 'mud': _muds.push(e); break;
          case 'thorn': _thorns.push(e); break;
          case 'pipe': _pipes.push(e); break;
          case 'goal': _goals.push(e); break;
          case 'pillar': _pillars.push(e); break;
          case 'slope': _slopes.push(e); break;
          case 'cannon': _cannons.push(e); break;
          case 'pea-shooter': _peaShooters.push(e); break;
          case 'windmill': _windmills.push(e); break;
          case 'cave-intake': _caveIntakes.push(e); break;
          case 'cave-exhaust': _caveExhausts.push(e); break;
        }
      }
      // Solids = platforms + pipes + pillars (for collision)
      const _allSolids = [..._platforms, ..._pipes, ..._pillars];

      const isLeft = keys.current['ArrowLeft'] || keys.current['KeyA'] || touchState.current['left'];
      const isRight = keys.current['ArrowRight'] || keys.current['KeyD'] || touchState.current['right'];
      const isJump = keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['Space'] || touchState.current['jump'];
      const isDown = keys.current['ArrowDown'] || keys.current['KeyS'] || touchState.current['down'];
      const isAttack = keys.current['KeyF'] || touchState.current['attack'];

      if (prev.currentLevel === 0) {
        const moved = Math.abs(player.x - level1RecoveryRef.current.lastX) > 1 || Math.abs(player.y - level1RecoveryRef.current.lastY) > 1;
        if (moved) {
          level1RecoveryRef.current.lastX = player.x;
          level1RecoveryRef.current.lastY = player.y;
          level1RecoveryRef.current.lastMoveTime = now;
        } else if ((isLeft || isRight || isJump || isAttack) && now - level1RecoveryRef.current.lastMoveTime > 1400) {
          resetGameRef.current(0);
          return prev;
        }
      }

      // Vine climbing
      const vines = _vines;
      const isOnVine = vines.some(v => player.x < v.x + v.width && player.x + player.width > v.x && player.y < v.y + v.height && player.y + player.height > v.y);
      if (isOnVine && (isJump || isDown)) isClimbing = true;
      if (!isOnVine) isClimbing = false;

      if (isClimbing) {
        player.vx = 0; player.vy = 0;
        if (isJump) { player.vy = -5; playSfx('jump'); }
        if (isDown) player.vy = 5;
        if (isLeft) { player.vx = -4; player.facing = 'left'; }
        if (isRight) { player.vx = 4; player.facing = 'right'; }
      } else {
        if (isLeft) { player.vx = -MOVE_SPEED; player.facing = 'left'; }
        else if (isRight) { player.vx = MOVE_SPEED; player.facing = 'right'; }
        else { player.vx *= FRICTION; }
      }

      if (isJump && !lastJumpPressed.current && !isClimbing) {
        if (player.onGround) {
          player.vy = JUMP_STRENGTH; player.onGround = false; player.jumpsRemaining = 1; playSfx('jump');
          // Jump dust puff
          for (let i = 0; i < 6; i++) {
            charParticlesRef.current.push({
              x: player.x + player.width / 2 + (Math.random() - 0.5) * 20,
              y: player.y + player.height,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2 - 0.5,
              life: 20 + Math.random() * 10, maxLife: 30,
              size: 3 + Math.random() * 4, r: 200, g: 180, b: 150,
              type: 'dust', gravity: 0.05
            });
          }
        } else if (player.jumpsRemaining > 0) {
          player.vy = JUMP_STRENGTH; player.jumpsRemaining -= 1; playSfx('jump');
          // Double jump star burst
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            charParticlesRef.current.push({
              x: player.x + player.width / 2,
              y: player.y + player.height / 2,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3 - 1,
              life: 25 + Math.random() * 10, maxLife: 35,
              size: 3 + Math.random() * 2, r: 255, g: 220, b: 50,
              type: 'star', gravity: 0.08, rotation: Math.random() * Math.PI * 2, rotSpeed: 0.15
            });
          }
          // Expanding ring
          charParticlesRef.current.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: 0, vy: 0,
            life: 15, maxLife: 15,
            size: 10, r: 255, g: 255, b: 200,
            type: 'ring', gravity: 0, scale: 1
          });
        }
      }
      lastJumpPressed.current = isJump;

      if (isAttack && !lastAttackPressed.current) {
        player.shootTime = now; // Track shoot time for mouth animation
        nextProjectiles.push({ id: `seed-${now}-${Math.random()}`, x: player.x + (player.facing === 'right' ? player.width + 2 : -10), y: player.y + player.height / 2 - 4, vx: player.facing === 'right' ? 16 : -16, vy: 0, width: 8, height: 8, subWorld: inSubWorld, isDead: false, color: '#FF5722', projectileType: 'seed' });
      }
      lastAttackPressed.current = isAttack;

      if (!isClimbing) player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;

      // Player boundary constraints - prevent jumping out of game area
      if (player.x < 0) { player.x = 0; player.vx = 0; }
      if (currentLevelIdx === 2 && inSubWorld) {
        const subWorldWidth = SUB_WORLD_LEVELS[0][SUB_WORLD_LEVELS[0].length - 1].length * TILE_SIZE;
        if (player.x + player.width > subWorldWidth) {
          player.x = subWorldWidth - player.width;
          player.vx = 0;
        }
      } else if (!inSubWorld && player.x + player.width > activeLevelWidth) {
        player.x = activeLevelWidth - player.width;
        player.vx = 0;
      }
      if (player.y < -player.height) { player.y = -player.height; player.vy = 0; }

      // Platform collision
      player.onGround = false;
      const allSolids = _allSolids;
      allSolids.forEach(plat => {
        // For pipes: use the top lip area as the solid standing surface
        let solidX = plat.x, solidY = plat.y, solidW = plat.width, solidH = plat.height;
        if (plat.type === 'pipe' && !plat.isCeiling) {
          // Upward pipe: player can stand on the top lip (first 16px)
          solidY = plat.y;
          solidH = 16;
          solidX = plat.x;
          solidW = plat.width;
        } else if (plat.type === 'pipe' && plat.isCeiling && !plat.subWorld) {
          // Ceiling pipe in overworld: no standing on it from above, skip normal collision
          return;
        } else if (plat.type === 'pipe' && plat.subWorld) {
          // Underground pipes are visual only; don't block the underground corridor
          return;
        } else if (plat.type === 'pipe' && plat.isCeiling && plat.subWorld) {
          // Sub-world ground pipe: player can stand on top lip
          solidY = plat.y;
          solidH = 16;
          solidX = plat.x;
          solidW = plat.width;
        }

        if (player.x < solidX + solidW && player.x + player.width > solidX && player.y < solidY + solidH && player.y + player.height > solidY) {
          const ox = Math.min(player.x + player.width, solidX + solidW) - Math.max(player.x, solidX);
          const oy = Math.min(player.y + player.height, solidY + solidH) - Math.max(player.y, solidY);
          if (oy < ox) {
            if (player.vy > 0 && player.y < solidY) { player.y = solidY - player.height; player.vy = 0; player.onGround = true; player.jumpsRemaining = 2; }
            else if (player.vy < 0 && player.y > solidY) { player.y = solidY + solidH; player.vy = 0; }
          } else {
            if (player.vx > 0 && player.x < solidX) { player.x = solidX - player.width; player.vx = 0; }
            else if (player.vx < 0 && player.x > solidX) { player.x = solidX + solidW; player.vx = 0; }
          }
        }
      });

      // Slope collision - player can walk on slopes (large triangle: height = width)
      _slopes.forEach(slope => {
        if (player.x + player.width > slope.x && player.x < slope.x + slope.width) {
          // Calculate slope surface Y at player's center X
          // The slope is a triangle: top-left corner is the peak, bottom-right is the base
          const playerCenterX = player.x + player.width / 2;
          const relX = Math.max(0, Math.min(1, (playerCenterX - slope.x) / slope.width));
          let surfaceY: number;
          if (slope.slopeDirection === 'right') {
            // High on left (slope.y), low on right (slope.y + slope.height)
            surfaceY = slope.y + relX * slope.height;
          } else {
            // High on right, low on left
            surfaceY = slope.y + (1 - relX) * slope.height;
          }
          // If player is falling onto or standing on slope surface
          if (player.vy >= 0 && player.y + player.height > surfaceY && player.y + player.height < surfaceY + 20) {
            player.y = surfaceY - player.height;
            player.vy = 0;
            player.onGround = true;
            player.jumpsRemaining = 2;
          }
          // Solid area below the slope surface - prevent falling through
          if (player.y + player.height > surfaceY + 20 && player.y < slope.y + slope.height) {
            // Push player up to slope surface
            if (player.vy >= 0) {
              player.y = surfaceY - player.height;
              player.vy = 0;
              player.onGround = true;
              player.jumpsRemaining = 2;
            }
          }
        }
      });

      // Squash/stretch
      if (player.vy !== 0) { const s = Math.min(0.2, Math.abs(player.vy) * 0.015); player.squashY = 1 + s; player.squashX = 1 - s; }
      else { player.squashY = (player.squashY || 1) + (1 - (player.squashY || 1)) * 0.2; player.squashX = (player.squashX || 1) + (1 - (player.squashX || 1)) * 0.2; }

      // Landing impact dust
      if (player.onGround && !prevOnGroundRef.current) {
        for (let i = 0; i < 8; i++) {
          const side = i < 4 ? -1 : 1;
          charParticlesRef.current.push({
            x: player.x + player.width / 2 + side * (5 + Math.random() * 12),
            y: player.y + player.height,
            vx: side * (1.5 + Math.random() * 2),
            vy: -Math.random() * 1.5 - 0.5,
            life: 18 + Math.random() * 8, maxLife: 26,
            size: 3 + Math.random() * 3, r: 180, g: 160, b: 130,
            type: 'dust', gravity: 0.1
          });
        }
      }
      prevOnGroundRef.current = player.onGround;

      // Running trail particles
      if (player.onGround && Math.abs(player.vx) > 2) {
        runTrailTimerRef.current++;
        if (runTrailTimerRef.current % 4 === 0) {
          charParticlesRef.current.push({
            x: player.x + player.width / 2 + (player.facing === 'right' ? -8 : 8),
            y: player.y + player.height - 2,
            vx: (player.facing === 'right' ? -1 : 1) * (0.5 + Math.random()),
            vy: -Math.random() * 0.8,
            life: 12 + Math.random() * 6, maxLife: 18,
            size: 2 + Math.random() * 2, r: 190, g: 170, b: 140,
            type: 'trail', gravity: 0.03
          });
        }
      } else {
        runTrailTimerRef.current = 0;
      }

      // Update character particles
      charParticlesRef.current = charParticlesRef.current.filter(p => {
        p.life--;
        if (p.life <= 0) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.96;
        if (p.rotation !== undefined && p.rotSpeed) p.rotation += p.rotSpeed;
        if (p.type === 'ring' && p.scale !== undefined) p.scale += 1.5;
        return true;
      });
      // Cap particle count
      if (charParticlesRef.current.length > 100) {
        charParticlesRef.current = charParticlesRef.current.slice(-100);
      }

      // Projectiles (seeds/photo-balls only - peas and pea3 handled separately below)
      nextProjectiles = nextProjectiles.map(p => {
        if (p.isDead || p.projectileType === 'pea' || p.projectileType === 'pea3' || p.projectileType === 'eagle-bullet') return p;
        p.x += p.vx;
        // Use pre-computed platforms (same subWorld as player in most cases)
        const pPlats = p.subWorld === inSubWorld ? _platforms : entities.filter(e => e.type === 'platform' && e.subWorld === p.subWorld);
        for (let pi = 0; pi < pPlats.length; pi++) {
          const plat = pPlats[pi];
          if (p.x < plat.x + plat.width && p.x + p.width > plat.x && p.y < plat.y + plat.height && p.y + p.height > plat.y) { p.isDead = true; break; }
        }
        if (p.projectileType === 'seed') {
          const seedEnemies = p.subWorld === inSubWorld ? _enemies : entities.filter(e => e.type === 'enemy' && !e.isDead && e.subWorld === p.subWorld);
          seedEnemies.forEach(e => {
            if (p.x < e.x + e.width && p.x + p.width > e.x && p.y < e.y + e.height && p.y + p.height > e.y) {
              p.isDead = true;
              if (e.enemyType === 'rabbit') {
                if (e.rabbitMode !== 'leak') {
                  e.rabbitMode = 'leak';
                  e.rabbitModeStart = now;
                  e.rabbitModeSeed = Math.random() * Math.PI * 2;
                  e.rabbitModeBaseX = e.x;
                  e.rabbitModeBaseY = e.y;
                  e.rabbitModeDriftX = Math.random() * 2 - 1;
                  e.rabbitModeDriftY = -1.4 - Math.random() * 0.6;
                  e.rabbitModeSpinDir = Math.random() > 0.5 ? 1 : -1;
                  e.renderScale = Math.max(2, e.renderScale || 2);
                  score += 50;
                }
              } else {
                e.isDead = true; e.isSquashed = true; e.deathTime = now; e.vx = 0; score += 50;
              }
            }
          });
        }
        if (p.projectileType === 'photo-ball' && !p.isDead) {
          if (p.x < player.x + player.width && p.x + p.width > player.x && p.y < player.y + player.height && p.y + p.height > player.y) {
            p.isDead = true;
            if (now - lastDamageTime > 1500) { lives -= 1; lastDamageTime = now; player.vy = -12; playSfx("hit"); if (lives <= 0) { if (!deathAnimRef.current) { deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX }; } gameOver = true; } }
          }
        }
        return p;
      }).filter(p => !p.isDead && Math.abs(p.x - player.x) < 800);

      if (currentLevelIdx === 2) {
        const carrots = _items.filter(item => item.itemType === 'carrot' && !item.collectingInfo);
        const rabbits = _enemies.filter(e => e.enemyType === 'rabbit' && !e.isDead);
        carrots.forEach(carrot => {
          rabbits.forEach(rabbit => {
            if (
              rabbit.x < carrot.x + carrot.width &&
              rabbit.x + rabbit.width > carrot.x &&
              rabbit.y < carrot.y + carrot.height &&
              rabbit.y + rabbit.height > carrot.y
            ) {
              carrot.collectingInfo = { startTime: now, type: 'carrot' };
              if (rabbit.rabbitMode !== 'inflate' && rabbit.rabbitMode !== 'leak') {
                rabbit.rabbitMode = 'inflate';
                rabbit.rabbitModeStart = now;
                rabbit.rabbitModeSeed = Math.random() * Math.PI * 2;
                rabbit.rabbitModeBaseX = rabbit.x;
                rabbit.rabbitModeBaseY = rabbit.y;
                rabbit.rabbitModeDriftX = Math.random() * 2 - 1;
                rabbit.rabbitModeDriftY = -1.2 - Math.random() * 0.5;
                rabbit.rabbitModeSpinDir = Math.random() > 0.5 ? 1 : -1;
                rabbit.renderScale = 1;
              }
            }
          });
        });
      }

      // Enemy AI
      _enemies.forEach(enemy => {
        const platforms = _platforms;
        if (enemy.enemyType === 'snail') {
          if (!enemy.isCeiling) enemy.vy += GRAVITY;
          enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.onGround = false;
          platforms.forEach(plat => {
            if (enemy.x < plat.x + plat.width && enemy.x + enemy.width > plat.x && enemy.y < plat.y + plat.height && enemy.y + enemy.height > plat.y) {
                if (enemy.isCeiling) { enemy.y = plat.y + plat.height; enemy.onGround = true; }
                else if (enemy.y + enemy.height - enemy.vy <= plat.y + 4) { enemy.y = plat.y - enemy.height; enemy.vy = 0; enemy.onGround = true; }
                else { enemy.vx *= -1; enemy.facing = enemy.vx > 0 ? 'right' : 'left'; enemy.x += enemy.vx; }
              }
          });
          // Improved edge detection: check both feet edges with a lookahead
          if (enemy.onGround && !enemy.isCeiling) {
            const lookAhead = 6;
            const footRight = enemy.x + enemy.width + lookAhead;
            const footLeft = enemy.x - lookAhead;
            const footY = enemy.y + enemy.height;
            if (enemy.vx > 0) {
              const hasFloorRight = platforms.some(p => footRight >= p.x && footRight <= p.x + p.width && Math.abs(footY - p.y) < 10);
              if (!hasFloorRight) { enemy.vx = -Math.abs(enemy.vx); enemy.facing = 'left'; enemy.x += enemy.vx * 2; }
            } else {
              const hasFloorLeft = platforms.some(p => footLeft >= p.x && footLeft <= p.x + p.width && Math.abs(footY - p.y) < 10);
              if (!hasFloorLeft) { enemy.vx = Math.abs(enemy.vx); enemy.facing = 'right'; enemy.x += enemy.vx * 2; }
            }
            const cruise = ENEMY_SPEED * 0.1;
            const desiredVx = enemy.facing === 'right' ? cruise : -cruise;
            enemy.vx += (desiredVx - enemy.vx) * 0.05;
          }
        } else if (enemy.enemyType === 'monster1') {
          enemy.vy += GRAVITY; enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.onGround = false;
          platforms.forEach(plat => {
            if (enemy.x < plat.x + plat.width && enemy.x + enemy.width > plat.x && enemy.y < plat.y + plat.height && enemy.y + enemy.height > plat.y) {
              if (enemy.y + enemy.height - enemy.vy <= plat.y + 5) { enemy.y = plat.y - enemy.height; enemy.vy = 0; enemy.onGround = true; }
              else { enemy.vx *= -1; enemy.facing = enemy.vx > 0 ? 'right' : 'left'; }
            }
          });
          // Bounce periodically (not every frame) - use a timer to prevent excessive bouncing
          if (enemy.onGround) {
            if (!enemy.lastBounceTime || now - enemy.lastBounceTime > 800) {
              enemy.vy = -8; enemy.onGround = false; enemy.lastBounceTime = now;
            }
          }
          // Edge detection for monster1 to prevent falling off platforms
          if (enemy.onGround) {
            const lookAhead = 6;
            const footRight = enemy.x + enemy.width + lookAhead;
            const footLeft = enemy.x - lookAhead;
            const footY = enemy.y + enemy.height;
            if (enemy.vx > 0) {
              const hasFloorRight = platforms.some(p => footRight >= p.x && footRight <= p.x + p.width && Math.abs(footY - p.y) < 10);
              if (!hasFloorRight) { enemy.vx = -Math.abs(enemy.vx); enemy.facing = 'left'; }
            } else {
              const hasFloorLeft = platforms.some(p => footLeft >= p.x && footLeft <= p.x + p.width && Math.abs(footY - p.y) < 10);
              if (!hasFloorLeft) { enemy.vx = Math.abs(enemy.vx); enemy.facing = 'right'; }
            }
          }
          if (!enemy.lastAttackTime) enemy.lastAttackTime = now;
          if (now - enemy.lastAttackTime > 2000 && Math.abs(player.x - enemy.x) < 400) {
            enemy.lastAttackTime = now;
            const dir = player.x > enemy.x ? 1 : -1;
            enemy.facing = dir > 0 ? 'right' : 'left';
            nextProjectiles.push({ id: `pb-${enemy.id}-${now}`, x: enemy.x + (dir > 0 ? enemy.width : -16), y: enemy.y + enemy.height / 2 - 8, vx: dir * 10, vy: 0, width: 16, height: 16, subWorld: inSubWorld, isDead: false, color: '#00E5FF', projectileType: 'photo-ball' });
          }
        } else if (enemy.enemyType === 'rabbit') {
          const rabbitMode = enemy.rabbitMode || 'idle';
          if (rabbitMode !== 'idle') {
            const startTime = enemy.rabbitModeStart || now;
            const baseX = enemy.rabbitModeBaseX ?? enemy.x;
            const baseY = enemy.rabbitModeBaseY ?? enemy.y;
            const seed = enemy.rabbitModeSeed ?? 0;
            const spinDir = enemy.rabbitModeSpinDir ?? 1;
            const driftX = enemy.rabbitModeDriftX ?? 0;
            const driftY = enemy.rabbitModeDriftY ?? -1.2;
            const elapsed = Math.max(0, now - startTime);

            enemy.vx = 0;
            enemy.vy = 0;
            enemy.onGround = true;

            if (rabbitMode === 'inflate') {
              const stepDuration = 400;
              const growDuration = 100;
              const maxStage = 3;
              const stage = Math.min(maxStage - 1, Math.floor(elapsed / stepDuration));
              const stageElapsed = elapsed - stage * stepDuration;
              const growP = Math.min(1, stageElapsed / growDuration);
              enemy.renderScale = 1 + stage * 0.35 + growP * 0.3;
              const shake = (1 - growP) * (Math.sin(elapsed * 0.05 + seed) * 2.8 + Math.sin(elapsed * 0.13 + seed * 0.7) * 1.2);
              enemy.x = baseX + shake;
              enemy.y = baseY + (1 - growP) * Math.sin(elapsed * 0.09 + seed) * 1.4;
              if (elapsed >= stepDuration * maxStage) {
                enemy.rabbitMode = 'bounce';
                enemy.rabbitModeStart = now;
                enemy.rabbitModeBaseX = baseX;
                enemy.rabbitModeBaseY = baseY;
              }
            } else if (rabbitMode === 'bounce') {
              const duration = 1500;
              const p = (elapsed % duration) / duration;
              const bouncePulse = Math.abs(Math.sin(p * Math.PI * 5));
              enemy.renderScale = 2 + bouncePulse * 0.06;
              enemy.x = baseX + Math.sin(elapsed * 0.05 + seed) * 1.5;
              enemy.y = baseY - bouncePulse * 12;
            } else if (rabbitMode === 'hold') {
              enemy.renderScale = 2;
              enemy.x = baseX;
              enemy.y = baseY;
            } else if (rabbitMode === 'leak') {
              const duration = 2200;
              const p = Math.min(1, elapsed / duration);
              const travel = p * p;
              const angle = seed + elapsed * 0.04 * spinDir;
              const spiralRadius = (1 - p) * 42;
              enemy.renderScale = Math.max(0.08, 2 * (1 - p));
              enemy.x = baseX + driftX * travel * 220 + Math.cos(angle) * spiralRadius;
              enemy.y = baseY - travel * 340 + driftY * travel * 60 + Math.sin(angle) * spiralRadius;
              if (p > 0.72) {
                const starP = Math.min(1, (p - 0.72) / 0.28);
                (enemy as any).leakStarAlpha = 1 - starP;
              } else {
                (enemy as any).leakStarAlpha = 0;
              }
              if (p >= 1) {
                enemy.isDead = true;
                enemy.rabbitMode = 'idle';
              }
            }
          } else {
            enemy.vy += GRAVITY; enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.onGround = false;
            platforms.forEach(plat => {
              if (enemy.x < plat.x + plat.width && enemy.x + enemy.width > plat.x && enemy.y < plat.y + plat.height && enemy.y + enemy.height > plat.y) {
                if (enemy.y + enemy.height - enemy.vy <= plat.y + 5) { enemy.y = plat.y - enemy.height; enemy.vy = 0; enemy.onGround = true; }
                else { enemy.vx *= -1; enemy.facing = enemy.vx > 0 ? 'right' : 'left'; }
              }
            });
            if (enemy.onGround && Math.random() < 0.04) { enemy.vy = -14; enemy.vx = (Math.random() - 0.5) * 9; enemy.onGround = false; }
            else if (enemy.onGround) { enemy.vx *= 0.9; }
          }
        } else if (enemy.enemyType === 'frog') {
          enemy.vy += GRAVITY; enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.onGround = false;
          platforms.forEach(plat => {
            if (enemy.x < plat.x + plat.width && enemy.x + enemy.width > plat.x && enemy.y < plat.y + plat.height && enemy.y + enemy.height > plat.y) {
              if (enemy.y + enemy.height - enemy.vy <= plat.y + 5) { enemy.y = plat.y - enemy.height; enemy.vy = 0; enemy.onGround = true; }
              else { enemy.vx *= -1; enemy.facing = enemy.vx > 0 ? 'right' : 'left'; }
            }
          });
          if (enemy.onGround && Math.random() < 0.03) { enemy.vy = -11; enemy.vx = (Math.random() - 0.5) * 8; enemy.onGround = false; }
          else if (enemy.onGround) { enemy.vx *= 0.85; }
          // Tongue attack damage check
          const tongueCycle = (now + (enemy.x * 100)) % 2000;
          if (tongueCycle < 600) {
            const tongueProgress = tongueCycle < 300 ? tongueCycle / 300 : (600 - tongueCycle) / 300;
            const tongueLen = tongueProgress * 35;
            const tongueDir = enemy.facing === 'left' ? -1 : 1;
            const tongueTipX = enemy.x + enemy.width / 2 + tongueDir * (enemy.width / 2 + tongueLen);
            const tongueTipY = enemy.y + enemy.height / 2;
            if (Math.abs(player.x + player.width / 2 - tongueTipX) < 20 && Math.abs(player.y + player.height / 2 - tongueTipY) < 20) {
              if (now - lastDamageTime > 1500) { lives -= 1; lastDamageTime = now; player.vy = -12; playSfx("hit"); player.vx = player.x < enemy.x ? -8 : 8; if (lives <= 0) { if (!deathAnimRef.current) { deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX }; } gameOver = true; } }
            }
          }
        } else if (enemy.enemyType === 'piranha') {
          enemy.phase = (enemy.phase || 0) + 0.025;
          // Piranha bobs up and down WITHIN the pond area only
          // Pond spans 2 tile rows (80px). Wave surface is 14px at top.
          // Piranha must stay within the pond body (below wave, above floor)
          const POND_HEIGHT = TILE_SIZE * 2; // 2 rows = 80px
          const WAVE_HEIGHT = 14;
          const cycle = Math.sin(enemy.phase);
          const origY = enemy.originalY || enemy.y;
          // Piranha range: from wave bottom to pond bottom
          const pondTop = origY + WAVE_HEIGHT; // below the wave surface
          const pondBottom = origY + POND_HEIGHT; // bottom of pond (land floor)
          const availableRange = pondBottom - pondTop - enemy.height;
          const centerY = pondTop + availableRange / 2;
          enemy.y = centerY + cycle * (availableRange / 2);
          // Clamp strictly within pond body bounds
          enemy.y = Math.max(pondTop, Math.min(enemy.y, pondBottom - enemy.height));
          // Open mouth when rising (cycle > 0.3), close when sinking
          enemy.mouthOpen = cycle > 0.3;
        } else if (enemy.enemyType === 'bat') {
          // Bat with dive-bombing behavior
          enemy.batPhase = (enemy.batPhase || 0) + 0.02;
          const baseY = enemy.originalY || 60;
          enemy.facing = player.x > enemy.x ? 'right' : 'left';

          // Initialize dive state if not set
          if (!enemy.batDiveState) enemy.batDiveState = 'flying';
          if (!enemy.lastDiveTime) enemy.lastDiveTime = now - Math.random() * 4000;
          if (!enemy.diveTargetX) enemy.diveTargetX = 0;
          if (!enemy.diveTargetY) enemy.diveTargetY = 0;

          if (enemy.batDiveState === 'flying') {
            // Normal sinusoidal flight
            enemy.y = baseY + Math.sin(enemy.batPhase) * 40 + Math.sin(enemy.batPhase * 2.3) * 20;
            // Drift toward player
            if (Math.abs(player.x - enemy.x) > 20) {
              enemy.x += (player.x > enemy.x ? 1.2 : -1.2);
            }
            // Trigger dive-bomb every 4 seconds when close to player
            const distToPlayer = Math.abs(player.x - enemy.x);
            if (now - enemy.lastDiveTime > 4000 && distToPlayer < 250 && distToPlayer > 40) {
              enemy.batDiveState = 'diving';
              enemy.lastDiveTime = now;
              enemy.diveTargetX = player.x;
              enemy.diveTargetY = player.y - 10;
              enemy.diveStartX = enemy.x;
              enemy.diveStartY = enemy.y;
              enemy.diveProgress = 0;
            }
          } else if (enemy.batDiveState === 'diving') {
            // Aggressive dive toward player's last position
            enemy.diveProgress = (enemy.diveProgress || 0) + 0.04;
            const t = Math.min(enemy.diveProgress, 1);
            // Ease-in curve for acceleration feel
            const eased = t * t * (3 - 2 * t);
            enemy.x = enemy.diveStartX + (enemy.diveTargetX - enemy.diveStartX) * eased;
            enemy.y = enemy.diveStartY + (enemy.diveTargetY - enemy.diveStartY) * eased;
            // When dive completes, swoop back up
            if (t >= 1) {
              enemy.batDiveState = 'ascending';
              enemy.ascentStart = now;
            }
          } else if (enemy.batDiveState === 'ascending') {
            // Swoop back up to original height
            const ascentDuration = 800;
            const elapsed = now - (enemy.ascentStart || now);
            const t = Math.min(elapsed / ascentDuration, 1);
            enemy.y = enemy.diveTargetY + (baseY - enemy.diveTargetY) * t;
            // Drift slightly away after dive
            enemy.x += (enemy.facing === 'right' ? -2 : 2);
            if (t >= 1) {
              enemy.batDiveState = 'flying';
              enemy.originalY = baseY;
            }
          }

          // Shoot eggs every 2.5 seconds when player is within range
          if (!enemy.lastShootTime) enemy.lastShootTime = now - Math.random() * 2000;
          if (now - enemy.lastShootTime > 2500 && Math.abs(player.x - enemy.x) < 350) {
            enemy.lastShootTime = now;
            // Shoot egg downward toward player
            const dx2 = player.x - enemy.x;
            const dy2 = player.y - enemy.y;
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
            const speed = 7;
            nextProjectiles.push({
              id: `egg-${enemy.id}-${now}`,
              x: enemy.x + enemy.width / 2 - 10,
              y: enemy.y + enemy.height,
              vx: (dx2 / dist) * speed,
              vy: (dy2 / dist) * speed * 0.6 + 3,
              width: 20,
              height: 24,
              subWorld: inSubWorld,
              isDead: false,
              color: '#FFF8E1',
              projectileType: 'egg',
              rotation: 0,
              gravity: 0.12,
            });
          }
        } else if (enemy.enemyType === 'eagle') {
          if (enemy.diveState === 'cruising') {
            enemy.x += (enemy.facing === 'right' ? 3 : -3);
            if (Math.abs(player.x - enemy.x) < 300 && player.y > enemy.y) enemy.diveState = 'diving';
            if (enemy.x < player.x - 400) enemy.facing = 'right';
            if (enemy.x > player.x + 400) enemy.facing = 'left';
          } else if (enemy.diveState === 'diving') {
            // Eagle dives all the way to ground level
            enemy.y += 8; enemy.x += (enemy.facing === 'right' ? 2 : -2);
            // Check vine collision - eagle can get tangled in vines
            let hitVine: Entity | undefined;
            for (let vi = 0; vi < _vines.length; vi++) {
              const v = _vines[vi];
              if (enemy.x < v.x + v.width && enemy.x + enemy.width > v.x && enemy.y < v.y + v.height && enemy.y + enemy.height > v.y) { hitVine = v; break; }
            }
            // Only stop on ground-level platforms (bottom rows), not floating platforms
            // Ground platforms are those at y >= CANVAS_HEIGHT - TILE_SIZE * 5 (bottom area)
            const groundThreshold = CANVAS_HEIGHT - TILE_SIZE * 5;
            const hitGround = platforms.some(p => p.y >= groundThreshold && enemy.x < p.x + p.width && enemy.x + enemy.width > p.x && enemy.y + enemy.height > p.y && enemy.y + enemy.height < p.y + 20);
            if (hitVine) {
              // Eagle gets caught by vine
              enemy.diveState = 'stuck'; enemy.struggleCount = 0; enemy.lastStruggleTime = now;
            } else if (hitGround) {
              // Eagle hits ground, gets stuck briefly
              enemy.diveState = 'stuck'; enemy.struggleCount = 0; enemy.lastStruggleTime = now;
            }
            // Safety: don't go below canvas
            if (enemy.y > CANVAS_HEIGHT - 60) {
              enemy.diveState = 'stuck'; enemy.struggleCount = 0; enemy.lastStruggleTime = now;
            }
          } else if (enemy.diveState === 'stuck') {
            if (now - (enemy.lastStruggleTime || 0) > 600) {
              enemy.struggleCount = (enemy.struggleCount || 0) + 1;
              enemy.lastStruggleTime = now;
              if (enemy.struggleCount >= 5) {
                enemy.diveState = 'returning';
                enemy.returnDir = enemy.facing === 'right' ? 1 : -1;
                enemy.returnBoost = 26;
                enemy.lastStruggleTime = now;
              }
            }
          } else if (enemy.diveState === 'returning') {
            const returnDir = enemy.returnDir || (enemy.facing === 'right' ? 1 : -1);
            const boost = enemy.returnBoost || 22;
            enemy.x += returnDir * 4;
            enemy.y -= boost;
            enemy.returnBoost = Math.max(16, boost - 1.2);
            if (enemy.y <= (enemy.originalY || 50) - 8) enemy.diveState = 'cruising';
          }
        }
      });

      // Pillar movement (Level 6) - pillars move down uniformly, then reset
      _pillars.forEach(pillar => {
        pillar.phase = (pillar.phase || 0) + 0.015;
        // Pillar extends downward in a cycle: slowly descend, pause at bottom, quickly retract
        const cycle = Math.sin(pillar.phase);
        const minY = pillar.pillarMinY || pillar.y;
        const maxExtend = (pillar.pillarMaxY || CANVAS_HEIGHT) - minY;
        // When cycle > 0, pillar is extending down
        const extension = Math.max(0, cycle) * maxExtend * 0.7;
        const baseHeight = TILE_SIZE * 3; // minimum visible pillar height
        pillar.height = baseHeight + extension;
        
        // Check if pillar bottom crushes player - ONLY crush damage (sandwiched between pillar and platform)
        const pillarBottom = pillar.y + pillar.height;
        
        if (player.x + player.width > pillar.x && player.x < pillar.x + pillar.width) {
          // Only deal damage when player is CRUSHED: standing on ground and pillar presses down on them
          if (player.onGround && pillarBottom >= player.y && pillarBottom <= player.y + player.height + 5 && cycle > 0) {
            if (now - lastDamageTime > 1500) {
              lives -= 1; lastDamageTime = now; player.vy = -10; playSfx("hit");
              player.vx = player.x < pillar.x + pillar.width / 2 ? -6 : 6;
              if (lives <= 0) {
                if (!deathAnimRef.current) {
                  deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX };
                }
                gameOver = true;
              }
            }
          }
        }
      });

      // Popcorn bucket logic (Level 8) - charges for 2s then shoots 3-5 popcorn pieces
      _cannons.forEach(cannon => {
        if (!cannon.lastShootTime) cannon.lastShootTime = now - Math.random() * 2000;
        const timeSinceLastShot = now - cannon.lastShootTime;
        const shootInterval = cannon.shootInterval || 3000;
        const chargeTime = 2000; // 2 second charge/inflate animation

        // Start charging phase when interval elapses
        if (!cannon.isCharging && timeSinceLastShot > shootInterval) {
          cannon.isCharging = true;
          cannon.chargeStartTime = now;
        }

        // After charge completes, fire!
        if (cannon.isCharging && now - (cannon.chargeStartTime || 0) >= chargeTime) {
          cannon.isCharging = false;
          cannon.lastShootTime = now;
          cannon.squishTime = now; // trigger burst animation
          // Shoot 3-5 popcorn pieces in random directions
          const numPopcorn = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < numPopcorn; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2; // mostly upward, spread wide
            const speed = 7 + Math.random() * 4;
            nextProjectiles.push({
              id: `popcorn-${cannon.id}-${now}-${i}`,
              x: cannon.x + cannon.width / 2 - 16,
              y: cannon.y + 2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              width: 32,
              height: 32,
              subWorld: inSubWorld,
              isDead: false,
              color: '#FFF8E1',
              projectileType: 'popcorn',
              rotation: Math.random() * Math.PI * 2,
              gravity: 0.15,
            });
          }
        }
      });

      // Popcorn/egg projectile physics - arcs with gravity, hits player
      nextProjectiles = nextProjectiles.map(p => {
        if (p.isDead) return p;
        if (p.projectileType === 'eagle-bullet' || p.projectileType === 'popcorn' || p.projectileType === 'egg') {
          p.x += p.vx;
          p.vy += (p.gravity || 0.15);
          p.y += p.vy;
          // Eggs spin much faster for dramatic tumbling effect
          const rotSpeed = p.projectileType === 'egg' ? 0.35 : 0.08;
          p.rotation = (p.rotation || 0) + rotSpeed;

          // Popcorn hits player - deals damage
          if (p.x < player.x + player.width && p.x + p.width > player.x && p.y < player.y + player.height && p.y + p.height > player.y) {
            p.isDead = true;
            if (now - lastDamageTime > 1500) {
              lives -= 1; lastDamageTime = now; player.vy = -12; playSfx("hit");
              player.vx = player.x < p.x ? -5 : 5;
              // Level 10 egg hit: trigger thunder + lightning flash + enhanced screen effects
              if (p.projectileType === 'egg' && currentLevelIdx === 9) {
                playSfx("thunder");
                lightningFlashRef.current = { active: true, startTime: now, intensity: 1.0 };
                lastThunderTimeRef.current = now;
                // Camera shake on egg hit
                cameraShakeRef.current = { intensity: 12, startTime: now, duration: 300 };
              }

              if (lives <= 0) {
                if (!deathAnimRef.current) {
                  deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX };
                }
                gameOver = true;
              }
            }
          }

          // Remove if off-screen
          if (p.x < player.x - 800 || p.x > player.x + 1200 || p.y > CANVAS_HEIGHT + 100) p.isDead = true;
        }
        return p;
      });

      // Cave openings with airflow (Level 9) - blow player upward when above
      // Cave teleportation system: intake caves suck player in, teleport to paired exhaust cave
      const intakeCaves = _caveIntakes;
      const exhaustCaves = _caveExhausts;
      // Update cave phases for animation
      [...intakeCaves, ...exhaustCaves].forEach(cave => { cave.phase = (cave.phase || 0) + 0.01; });
      
      // Intake caves: suction effect pulling player toward cave center
      intakeCaves.forEach((cave, idx) => {
        const caveCenterX = cave.x + cave.width / 2;
        const caveCenterY = cave.y + cave.height / 2;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const dx = caveCenterX - playerCenterX;
        const dy = caveCenterY - playerCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const suctionRadius = TILE_SIZE * 3; // suction range
        
        // Apply suction force when player is within range
        if (dist < suctionRadius && dist > 5) {
          const strength = Math.pow(1 - dist / suctionRadius, 2) * 0.6;
          player.vx += (dx / dist) * strength;
          player.vy += (dy / dist) * strength;
        }
        
        // Teleport when player overlaps with intake cave center
        if (dist < TILE_SIZE * 0.6 && exhaustCaves.length > idx) {
          // Check cooldown to prevent rapid re-teleportation
          if (!player.lastTeleportTime || now - player.lastTeleportTime > 1500) {
            const target = exhaustCaves[idx];
            player.x = target.x + target.width / 2 - player.width / 2;
            player.y = target.y - player.height - TILE_SIZE * 0.8; // appear hovering above exhaust cave
            player.vy = 0; // no launch velocity, will be caught by float logic
            player.vx = 0;
            player.lastTeleportTime = now;
            playSfx('jump');
          }
        }
      });
      
      // Exhaust caves: float player above cave with gentle half-body-height oscillation
      exhaustCaves.forEach(cave => {
        const caveCenterX = cave.x + cave.width / 2;
        const playerCenterX = player.x + player.width / 2;
        const horizontalDist = Math.abs(caveCenterX - playerCenterX);
        const blowRadius = TILE_SIZE * 1.5;
        
        // Player must be within horizontal range and above/at the cave
        if (horizontalDist < blowRadius && 
            player.y + player.height >= cave.y - TILE_SIZE * 2 && 
            player.y + player.height <= cave.y + cave.height + TILE_SIZE) {
          // Target hover position: player bottom sits ~1 tile above cave top
          // with sine oscillation of half player height amplitude, fast speed
          const hoverBase = cave.y - player.height - TILE_SIZE * 0.8;
          const oscillation = Math.sin(now * 0.004) * (player.height * 0.25); // half body amplitude, doubled speed
          const targetY = hoverBase + oscillation;
          
          // Smoothly move player toward target position (spring-like damping)
          const diff = targetY - player.y;
          player.vy = diff * 0.12; // gentle spring constant for smooth floating
          // Override gravity while floating
          player.onGround = false;
        }
      });

      // Windmill logic (Level 9) - clear acceleration/deceleration cycle, flames scale with speed
      _windmills.forEach(windmill => {
        const support = _platforms
          .filter(p => p.x + p.width > windmill.x + 8 && p.x < windmill.x + windmill.width - 8 && p.y >= windmill.y)
          .sort((a, b) => a.y - b.y)[0];
        if (support) {
          windmill.y = support.y - windmill.height;
        }
        const cycleDuration = 10000; // 10s full cycle
        const cycleTime = (now + (windmill.cycleStart || 0)) % cycleDuration;
        // Phase: 0-3s accelerate, 3-7s fast, 7-10s decelerate
        let speedMultiplier: number;
        if (cycleTime < 3000) {
          // Accelerating phase: 0锟? (ease-in)
          const t = cycleTime / 3000;
          speedMultiplier = t * t; // quadratic ease-in
        } else if (cycleTime < 7000) {
          // Fast phase: stay at max
          speedMultiplier = 1.0;
        } else {
          // Decelerating phase: 1锟?.05 (ease-out)
          const t = (cycleTime - 7000) / 3000;
          speedMultiplier = 1.0 - t * t * 0.95; // quadratic ease-out, never fully stops
        }
        const baseSpeed = 0.45; // Very fast rotation speed for dramatic spinning effect
        const currentSpeed = baseSpeed * (0.06 + speedMultiplier * 0.94);
        windmill.rotation = (windmill.rotation || 0) + currentSpeed;
        windmill.isSpinning = speedMultiplier > 0.1;
        windmill.speedMultiplier = speedMultiplier;
        // Update wind sound volume based on rotation speed
        updateWindSoundVolume(speedMultiplier);

        // Flame frequency scales with rotation speed
        // At max speed: every 250ms, at min speed: every 2000ms (faster due to 3x speed)
        const flameInterval = 2000 - speedMultiplier * 1750;
        if (speedMultiplier > 0.15 && (!windmill.lastFireworkTime || now - windmill.lastFireworkTime > flameInterval)) {
          windmill.lastFireworkTime = now;
          const cx = windmill.x + windmill.width / 2;
          const cy = windmill.y + windmill.height * 0.6; // Hub position (matches short pole: bottom - 40% height)
          const bladeLength = windmill.width * 0.44;
          // More blades shoot at higher speed
          const bladesToShoot = speedMultiplier > 0.8 ? 4 : speedMultiplier > 0.5 ? 3 : speedMultiplier > 0.3 ? 2 : 1;
          for (let i = 0; i < bladesToShoot; i++) {
            const bladeAngle = (windmill.rotation || 0) + (i * Math.PI / 2);
            const tipX = cx + Math.cos(bladeAngle) * bladeLength;
            const tipY = cy + Math.sin(bladeAngle) * bladeLength;
            // Flame shoots outward from blade tip
            const spreadAngle = bladeAngle + (Math.random() - 0.5) * 0.3;
            const speed = 5 + Math.random() * 3 + speedMultiplier * 5;
            nextProjectiles.push({
              id: `firework-${windmill.id}-${now}-${i}`,
              x: tipX - 6,
              y: tipY - 6,
              vx: Math.cos(spreadAngle) * speed,
              vy: Math.sin(spreadAngle) * speed,
              width: 12,
              height: 12,
              subWorld: inSubWorld,
              isDead: false,
              color: '#FFFFFF',
              projectileType: 'firework',
              rotation: spreadAngle,
              gravity: 0.1,
              spawnTime: now,
              maxRange: windmill.width * 6,
              originX: cx,
              originY: cy,
              bounceCount: 0,
            });
          }
        }
      });

      // Spawn explosion sparks when firework impacts a surface
      const spawnFireworkSparks = (cx: number, cy: number, impactSpeed: number) => {
        const sparkCount = Math.min(Math.floor(8 + impactSpeed * 1.5), 18);
        const sparks = fireworkSparksRef.current;
        for (let i = 0; i < sparkCount; i++) {
          const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.6;
          const speed = 1.5 + Math.random() * 3 + impactSpeed * 0.3;
          const life = 400 + Math.random() * 400; // 400-800ms lifetime
          // Color temperature: mix of white-hot, yellow, orange, red sparks
          const colorChoice = Math.random();
          let r = 255, g = 255, b = 200;
          if (colorChoice < 0.25) { r = 255; g = 255; b = 220; } // white-hot
          else if (colorChoice < 0.5) { r = 255; g = 220; b = 60; } // yellow
          else if (colorChoice < 0.75) { r = 255; g = 140; b = 30; } // orange
          else { r = 255; g = 70; b = 20; } // red
          sparks.push({
            x: cx + (Math.random() - 0.5) * 6,
            y: cy - 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - Math.random() * 2, // bias upward
            life, maxLife: life,
            size: 1.2 + Math.random() * 2,
            r, g, b,
            gravity: 0.08 + Math.random() * 0.04,
          });
        }
      };

      // Firework projectile physics - flies outward, bounces 3 times on platforms/ground then disappears
      nextProjectiles = nextProjectiles.map(p => {
        if (p.isDead || p.projectileType !== 'firework') return p;
        p.x += p.vx;
        p.vy += (p.gravity || 0.12);
        p.y += p.vy;
        p.rotation = (p.rotation || 0) + 0.15;
        // Horizontal friction
        p.vx *= 0.995;

        // Bounce off platforms and ground (3 bounces then die)
        const groundY = CANVAS_HEIGHT - TILE_SIZE - p.height;
        let bounced = false;
        // Check ground bounce
        if (p.y >= groundY) {
          const impactSpeed = Math.abs(p.vy);
          p.y = groundY;
          p.vy = -Math.abs(p.vy) * 0.55; // Bounce up with energy loss
          p.vx *= 0.8;
          p.bounceCount = (p.bounceCount || 0) + 1;
          bounced = true;
          spawnFireworkSparks(p.x + p.width / 2, p.y + p.height, impactSpeed);
        }
        // Check platform collision for bounce
        if (!bounced) {
          for (const solid of allSolids) {
            if (p.x + p.width > solid.x && p.x < solid.x + solid.width &&
                p.y + p.height > solid.y && p.y + p.height < solid.y + 12 && p.vy > 0) {
              const impactSpeed = Math.abs(p.vy);
              p.y = solid.y - p.height;
              p.vy = -Math.abs(p.vy) * 0.5;
              p.vx *= 0.75;
              p.bounceCount = (p.bounceCount || 0) + 1;
              spawnFireworkSparks(p.x + p.width / 2, p.y + p.height, impactSpeed);
              break;
            }
          }
        }

        // Die after 3 bounces
        if ((p.bounceCount || 0) >= 3) { p.isDead = true; return p; }

        // Expire after 4 seconds (safety)
        if (now - (p.spawnTime || 0) > 4000) { p.isDead = true; return p; }

        // Hit player
        if (p.x < player.x + player.width && p.x + p.width > player.x && p.y < player.y + player.height && p.y + p.height > player.y) {
          p.isDead = true;
          if (now - lastDamageTime > 1500) {
            lives -= 1; lastDamageTime = now; player.vy = -12; playSfx("hit");
            player.vx = player.x < p.x ? -5 : 5;
            if (lives <= 0) {
              if (!deathAnimRef.current) {
                deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX };
              }
              gameOver = true;
            }
          }
        }

        // Remove if off-screen
        if (p.y > CANVAS_HEIGHT + 100 || p.x < player.x - 800 || p.x > player.x + 1200) p.isDead = true;
        return p;
      });

      // Update firework spark particles
      const sparks = fireworkSparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= 16; // ~60fps
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.vy += s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.97; // air friction
        s.size *= 0.985; // shrink over time
      }

      // Player-Enemy collision
      _enemies.forEach(enemy => {
        const rabbitScale = enemy.enemyType === 'rabbit' ? (enemy.renderScale || 1) : 1;
        const enemyHitX = enemy.enemyType === 'rabbit' ? enemy.x + enemy.width / 2 - (enemy.width * rabbitScale) / 2 : enemy.x;
        const enemyHitY = enemy.enemyType === 'rabbit' ? enemy.y + enemy.height - enemy.height * rabbitScale : enemy.y;
        const enemyHitW = enemy.enemyType === 'rabbit' ? enemy.width * rabbitScale : enemy.width;
        const enemyHitH = enemy.enemyType === 'rabbit' ? enemy.height * rabbitScale : enemy.height;
        if (player.x < enemyHitX + enemyHitW && player.x + player.width > enemyHitX && player.y < enemyHitY + enemyHitH && player.y + player.height > enemyHitY) {
          const isStomp = player.vy > 0 && player.y + player.height - player.vy <= enemyHitY + enemyHitH / 2;
          if (isStomp && enemy.enemyType !== 'piranha') {
            enemy.isDead = true; enemy.isSquashed = true; enemy.deathTime = now; enemy.vx = 0; player.vy = JUMP_STRENGTH / 1.5; score += 100;
          } else {
            if (now - lastDamageTime > 1500) { lives -= 1; lastDamageTime = now; player.vy = -12; playSfx("hit"); player.vx = player.x < enemyHitX ? -8 : 8; if (lives <= 0) { if (!deathAnimRef.current) { deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX }; } gameOver = true; } }
          }
        }
      });

      // Cannon body collision - touching the popcorn bucket hurts the player
      _cannons.forEach(cannon => {
        const cannonHitX = cannon.x + 6;
        const cannonHitY = cannon.y + 8;
        const cannonHitW = cannon.width - 12;
        const cannonHitH = cannon.height - 10;
        if (player.x < cannonHitX + cannonHitW && player.x + player.width > cannonHitX && player.y < cannonHitY + cannonHitH && player.y + player.height > cannonHitY) {
          if (now - lastDamageTime > 1500) {
            lives -= 1;
            lastDamageTime = now;
            player.vy = -12;
            playSfx("hit");
            if (lives <= 0) {
              if (!deathAnimRef.current) {
                deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX };
              }
              gameOver = true;
            }
          }
        }
      });

      // Hazard/Mud
      const hazardMudArr = [..._hazards, ..._muds];
      for (let hmi = 0; hmi < hazardMudArr.length; hmi++) {
        const e = hazardMudArr[hmi];
        // Water hazard: check if this is a top water tile, use upper portion for collision
        let hasWaterAboveCol = false;
        if (e.type === 'hazard') {
          for (let hi = 0; hi < _hazards.length; hi++) {
            const other = _hazards[hi];
            if (other.subWorld === e.subWorld && Math.abs(other.x - e.x) < 2 && Math.abs(other.y - (e.y - TILE_SIZE)) < 2) { hasWaterAboveCol = true; break; }
          }
        }
        // Top water tile: collision starts at upper third; lower water tile: full tile collision
        const hazardY = e.type === 'hazard' ? (hasWaterAboveCol ? e.y : e.y + TILE_SIZE / 3) : e.y;
        const hazardH = e.type === 'hazard' ? (hasWaterAboveCol ? TILE_SIZE : TILE_SIZE * 2 / 3) : e.height;
        if (player.x < e.x + e.width - 5 && player.x + player.width > e.x + 5 && player.y < hazardY + hazardH - 5 && player.y + player.height > hazardY + 5) {
          if (e.type === 'mud') {
            // Mud slows player and deals damage over time (sink effect)
            player.vx *= 0.3;
            player.vy = Math.min(player.vy, 1.5); // slow sinking
            if (now - lastDamageTime > 2000) {
              lives -= 1; lastDamageTime = now; playSfx("hit");
              if (lives <= 0) { if (!deathAnimRef.current) { deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX }; } gameOver = true; }
            }
          }
          else { if (now - lastDamageTime > 1000) { lives -= 1; lastDamageTime = now; player.vy = -10; playSfx("hit"); if (lives <= 0) { if (!deathAnimRef.current) { deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX }; } gameOver = true; } } }
        }
      }

      // Thorn collision - repeated damage while in contact
      _thorns.forEach(e => {
        const thornPad = 8;
        if (player.x < e.x + e.width + thornPad && player.x + player.width > e.x - thornPad && player.y < e.y + e.height + thornPad && player.y + player.height > e.y - thornPad) {
          e.thornHitTime = now;
          if (now - lastDamageTime > 280) {
            lives -= 1;
            lastDamageTime = now;
            playSfx("hit");
            if (lives <= 0) {
              if (!deathAnimRef.current) { deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: player.y, cameraX: prev.cameraX }; }
              gameOver = true;
            }
          }
          const leftPen = (player.x + player.width) - e.x;
          const rightPen = (e.x + e.width) - player.x;
          const topPen = (player.y + player.height) - e.y;
          const bottomPen = (e.y + e.height) - player.y;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) {
            player.x = e.x - player.width - 1;
            player.vx = -Math.max(8, Math.abs(player.vx));
          } else if (minPen === rightPen) {
            player.x = e.x + e.width + 1;
            player.vx = Math.max(8, Math.abs(player.vx));
          } else if (minPen === topPen) {
            player.y = e.y - player.height - 1;
            player.vy = -10;
          } else {
            player.y = e.y + e.height + 1;
            player.vy = Math.max(6, Math.abs(player.vy));
          }
          player.onGround = false;
        }
      });

      // Level 3 pipe travel: overworld pipe drops into sub-world. The underground star returns to overworld.
      if (currentLevelIdx === 2 && !pipeAnimRef.current?.active) {
        const pipesHere = _pipes.filter(p => p.subWorld === inSubWorld).sort((a, b) => a.x - b.x);
        const sourcePipe = !inSubWorld ? pipesHere[0] : null;
        if (sourcePipe) {
          const onPipeTop =
            player.x + player.width > sourcePipe.x + 8 &&
            player.x < sourcePipe.x + sourcePipe.width - 8 &&
            player.y + player.height >= sourcePipe.y - 10 &&
            player.y + player.height <= sourcePipe.y + 18 &&
            player.vy >= 0;
          const shouldTrigger = onPipeTop && isDown;
          if (shouldTrigger) {
            const targetInSubWorld = !inSubWorld;
            const nextEntities = createEntities(
              targetInSubWorld ? SUB_WORLD_LEVELS[0] : LEVELS[2],
              targetInSubWorld,
              targetInSubWorld ? 0 : 2,
            );
            const nextPipes = nextEntities.filter(e => e.type === 'pipe').sort((a, b) => a.x - b.x);
            const destPipe = targetInSubWorld ? nextPipes[0] : nextPipes[nextPipes.length - 1];
            const spawnX = destPipe
              ? (targetInSubWorld
                ? destPipe.x + destPipe.width + 8
                : destPipe.x - player.width - 8)
              : player.x;
            const spawnY = targetInSubWorld ? 398 - player.height - 2 : (destPipe ? destPipe.y - player.height - 2 : player.y);
            pipeAnimRef.current = {
              active: true,
              phase: 'sink',
              startTime: now,
              pipeX: sourcePipe.x,
              pipeY: sourcePipe.y,
              targetInSubWorld,
              nextEntities,
              spawnX,
              spawnY,
              destPipeX: destPipe ? destPipe.x : sourcePipe.x,
              destPipeY: destPipe ? destPipe.y : sourcePipe.y,
            };
            playSfx('jump');
            return prev;
          }
        }
      }

      // Items - flower has two phases: shake (0-400ms) then coin pop (400-1200ms)
      _items.forEach(item => {
        if (item.itemType === 'mushroom') {
          const pad = 2;
          if (player.x < item.x + item.width - pad && player.x + player.width > item.x + pad && player.y < item.y + item.height - pad && player.y + player.height > item.y + pad) {
            if (now - (item.lastHitTime || 0) > 350) {
              item.lastHitTime = now;
              player.vy = JUMP_STRENGTH * 1.15;
              player.onGround = false;
              player.jumpsRemaining = 2;
              playSfx('jump');
            }
          }
          return;
        }
        // Phase 1: Player touches flower -> start shaking (use expanded hitbox for flowers)
        if (!item.collectingInfo) {
          // Expand flower hitbox by 8px on each side for easier triggering
          if (item.itemType === 'carrot') return;
          const hitPad = item.itemType === 'flower' ? 8 : 0;
          const hitX = item.x - hitPad;
          const hitY = item.y - hitPad;
          const hitW = item.width + hitPad * 2;
          const hitH = item.height + hitPad * 2;
        if (player.x < hitX + hitW && player.x + player.width > hitX && player.y < hitY + hitH && player.y + player.height > hitY) {
          item.collectingInfo = { startTime: now, type: item.itemType || 'coin' };
          item.thornHitTime = now;
          if (item.itemType === 'star') {
            score += 1000;
            coins += 3;
            stars += 1;
            playSfx('star');
            if (currentLevelIdx === 2 && inSubWorld) {
              exitSubWorldFromStar = true;
            }
          }
          else if (item.itemType === 'flower') {
            // Don't add score yet - coin needs to pop out and be collected
            item.coinPopInfo = { startTime: now }; // Coin appears immediately
            item.coinCollected = false;
          }
            else { coins += 1; score += 50; playSfx('coin'); }
          }
        }

        // Phase 2: For flowers, check if coin has popped out and player collects it
        if (item.itemType === 'flower' && item.coinPopInfo && !item.coinCollected) {
          const coinElapsed = now - item.coinPopInfo.startTime;
          if (coinElapsed > 900 && !item.coinCollected) {
            item.coinCollected = true;
            score += 100;
            coins += 1;
            playSfx('coin');
          }
        }
      });

      if (exitSubWorldFromStar) {
        const nextEntities = createEntities(LEVELS[2], false, 2);
        const overworldPipes = nextEntities.filter(e => e.type === 'pipe').sort((a, b) => a.x - b.x);
        const returnPipe = overworldPipes[overworldPipes.length - 1];
        if (returnPipe) {
          player.x = returnPipe.x - player.width - 8;
          player.y = returnPipe.y - player.height - 2;
          player.vx = 0;
          player.vy = 0;
          player.onGround = false;
          player.jumpsRemaining = 2;
          entities = nextEntities;
          inSubWorld = false;
          nextProjectiles = [];
          cameraXOverride = Math.max(0, player.x - CANVAS_WIDTH / 3);
        }
      }

      // Goal
      _goals.forEach(goal => {
        if (player.x < goal.x + goal.width && player.x + player.width > goal.x && player.y < goal.y + goal.height && player.y + player.height > goal.y) { gameWon = true; playSfx('win'); }
      });

      // Cleanup
      entities = entities.filter(e => {
        if (e.collectingInfo) {
          const elapsed = now - e.collectingInfo.startTime;
          // Flowers stay forever - never remove them
          if (e.itemType === 'flower') {
            return true;
          } else if (e.itemType === 'carrot') {
            if (elapsed > 300) return false;
          } else if (e.itemType === 'star') {
            if (elapsed > 1200) return false; // star animation is 1200ms
          } else {
            if (elapsed > 800) return false;
          }
        }
        if (e.deathTime && now - e.deathTime > 300) return false;
        return true;
      });

      // Fall death
      if (player.y > CANVAS_HEIGHT + 100) {
        lives -= 1;
        if (lives <= 0) {
          // Trigger death animation instead of immediate game over
          if (!deathAnimRef.current) {
            deathAnimRef.current = { active: true, phase: 'bounce', startTime: Date.now(), startX: player.x, startY: CANVAS_HEIGHT - player.height * 2, cameraX: prev.cameraX };
          }
          gameOver = true;
        } else {
          const lev = inSubWorld ? SUB_WORLD_LEVELS[0] : LEVELS[prev.currentLevel];
          const sp = createPlayer(lev);
          player.x = sp.x; player.y = sp.y; player.vx = 0; player.vy = 0; cameraXOverride = 0;
        }
      }

      const maxCameraX = Math.max(0, activeLevelWidth - CANVAS_WIDTH);
      const targetCXRaw = cameraXOverride !== null ? cameraXOverride : player.x - CANVAS_WIDTH / 3;
      const targetCX = Math.max(0, Math.min(targetCXRaw, maxCameraX));
      const cameraX = cameraXOverride !== null
        ? targetCX
        : Math.max(0, Math.min(prev.cameraX + (targetCX - prev.cameraX) * 0.08, maxCameraX));

      // Periodic random atmospheric lightning for Level 10 (every 5-8 seconds)
      if (currentLevelIdx === 9 && now - lastThunderTimeRef.current > 5000) {
        if (Math.random() < 0.012) {
          playSfx("thunder");
          lightningFlashRef.current = { active: true, startTime: now, intensity: 0.5 + Math.random() * 0.5 };
          lastThunderTimeRef.current = now;
          cameraShakeRef.current = { intensity: 4 + Math.random() * 6, startTime: now, duration: 200 };
        }
      }

      return { ...prev, player, entities, projectiles: nextProjectiles, score, coins, lives, stars, gameOver, gameWon, inSubWorld, cameraX, lastDamageTime, isClimbing };
      } catch (err) {
        // Prevent crash from propagating - return previous state unchanged
        console.error('Game update error:', err);
        return prev;
      }
    });
  }, []);

  useGameLoop(update, gameState.gameStarted && !gameState.gameOver && !gameState.gameWon);

  // Death animation using a transparent overlay canvas
  const [deathAnimDone, setDeathAnimDone] = useState(false);
  const deathCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!gameState.gameOver) { setDeathAnimDone(false); return; }
    const deathAnim = deathAnimRef.current;
    if (!deathAnim || !deathAnim.active) { setDeathAnimDone(true); return; }

    const canvas = deathCanvasRef.current;
    if (!canvas) { setDeathAnimDone(true); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { setDeathAnimDone(true); return; }

    const playerHeight = 40;
    const playerWidth = 40;
    const bounceHeight = playerHeight * 5;
    const bounceDuration = 600;
    const fallDuration = 800;

    let raf: number;
    const animate = () => {
      if (!deathAnim.active) { setDeathAnimDone(true); return; }
      const elapsed = Date.now() - deathAnim.startTime;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const animX = deathAnim.startX - deathAnim.cameraX;
      const animY = deathAnim.startY;

      ctx.save();
      if (deathAnim.phase === 'bounce') {
        if (elapsed >= bounceDuration) {
          deathAnim.phase = 'fall';
          deathAnim.startTime = Date.now();
        } else {
          const progress = elapsed / bounceDuration;
          const eased = Math.sin(progress * Math.PI);
          const y = animY - eased * bounceHeight;
          ctx.translate(animX + playerWidth / 2, y + playerHeight / 2);
          if (littleTomatoImg.current && littleTomatoImg.current.complete) {
            ctx.drawImage(littleTomatoImg.current, -playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
          } else {
            ctx.fillStyle = '#FF4545';
            ctx.beginPath(); ctx.arc(0, 0, playerWidth / 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (deathAnim.phase === 'fall') {
        const fallElapsed = Date.now() - deathAnim.startTime;
        if (fallElapsed >= fallDuration) {
          deathAnim.active = false;
          setDeathAnimDone(true);
          ctx.restore();
          return;
        }
        const progress = fallElapsed / fallDuration;
        const rotation = Math.PI * progress;
        const fallY = (animY - bounceHeight) + progress * (CANVAS_HEIGHT + 100);
        ctx.translate(animX + playerWidth / 2, fallY + playerHeight / 2);
        ctx.rotate(rotation);
        if (littleTomatoImg.current && littleTomatoImg.current.complete) {
          ctx.drawImage(littleTomatoImg.current, -playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
        } else {
          ctx.fillStyle = '#FF4545';
          ctx.beginPath(); ctx.arc(0, 0, playerWidth / 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [gameState.gameOver]);

  // 鈹€鈹€鈹€ Game Over Rain + Thunder Sound Effect 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const rainNoiseRef = useRef<AudioBufferSourceNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    if (!gameState.gameOver || !deathAnimDone) {
      // Stop rain sound when leaving game over
      if (rainNoiseRef.current) {
        try { rainNoiseRef.current.stop(); } catch (_) { /* ignore */ }
        rainNoiseRef.current = null;
      }
      return;
    }
    if (isMutedRef.current) return;

    try {
      const ctx = getAudioCtx();

      // Rain ambient: filtered white noise
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Bandpass filter for rain-like sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.5;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.5);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      noiseNode.start();

      rainNoiseRef.current = noiseNode;
      rainGainRef.current = gainNode;

      // Thunder crack after 0.5s
      setTimeout(() => {
        if (!gameState.gameOver || isMutedRef.current) return;
        try {
          const t = ctx.currentTime;
          // Low rumble
          const osc1 = ctx.createOscillator();
          const g1 = ctx.createGain();
          osc1.connect(g1); g1.connect(ctx.destination);
          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(80, t);
          osc1.frequency.linearRampToValueAtTime(25, t + 1.2);
          g1.gain.setValueAtTime(0.25, t);
          g1.gain.linearRampToValueAtTime(0.15, t + 0.3);
          g1.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
          osc1.start(t); osc1.stop(t + 1.5);

          // Crackle
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.connect(g2); g2.connect(ctx.destination);
          osc2.type = 'square';
          osc2.frequency.setValueAtTime(200, t);
          osc2.frequency.linearRampToValueAtTime(50, t + 0.6);
          g2.gain.setValueAtTime(0.12, t);
          g2.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
          osc2.start(t); osc2.stop(t + 0.7);
        } catch (_) { /* ignore audio errors */ }
      }, 500);

      // Second distant thunder at 2.5s
      setTimeout(() => {
        if (!gameState.gameOver || isMutedRef.current) return;
        try {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(50, t);
          osc.frequency.linearRampToValueAtTime(20, t + 1.0);
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
          osc.start(t); osc.stop(t + 1.2);
        } catch (_) { /* ignore audio errors */ }
      }, 2500);

    } catch (_) { /* audio not supported */ }

    return () => {
      if (rainNoiseRef.current) {
        try {
          if (rainGainRef.current) {
            const ctx = audioCtxRef.current;
            if (ctx) {
              rainGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            }
          }
          setTimeout(() => {
            try { rainNoiseRef.current?.stop(); } catch (_) { /* ignore */ }
            rainNoiseRef.current = null;
          }, 300);
        } catch (_) { /* ignore cleanup errors */
          rainNoiseRef.current = null;
        }
      }
    };
  }, [gameState.gameOver, deathAnimDone]);

  // 鈹€鈹€鈹€ Rendering 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Apply camera shake offset
    const shake = cameraShakeRef.current;
    let shakeX = 0, shakeY = 0;
    if (shake.intensity > 0 && shake.duration > 0) {
      const elapsed = Date.now() - shake.startTime;
      if (elapsed < shake.duration) {
        const progress = elapsed / shake.duration;
        const decay = 1 - progress; // Linear decay
        const freq = 30; // High frequency for snappy shake
        shakeX = Math.sin(elapsed * freq * 0.05) * shake.intensity * decay * (Math.random() > 0.5 ? 1 : -1);
        shakeY = Math.cos(elapsed * freq * 0.07) * shake.intensity * decay * (Math.random() > 0.5 ? 1 : -1);
      } else {
        cameraShakeRef.current.intensity = 0;
      }
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const { player, entities, projectiles, cameraX, inSubWorld, currentLevel } = gameState;

    // Background with parallax
    if (!inSubWorld) {
      drawParallaxBackground(ctx, cameraX, cloudImg, mountainImg, treeImg, tree2Img, gameState.currentLevel, sunImg, dawnBgImg, moonImg, level5BgImg, sun1Img, sun2Img, level9BgImg, level10BgImg, bCloudImg, bCloud2Img);
    } else {
      // Sub-world background: draw the original image size without stretching
      if (bBackgroundImg.current && bBackgroundImg.current.complete && bBackgroundImg.current.naturalWidth > 0) {
        const bg = bBackgroundImg.current;
        const bgY = CANVAS_HEIGHT - bg.naturalHeight;
        const bgX = -cameraX;
        ctx.drawImage(bg, bgX, bgY);
      } else {
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }

    // 鈹€鈹€鈹€ Pre-compute spatial lookup sets for O(1) checks (avoids O(n虏) .some() per entity) 鈹€鈹€鈹€
    const platformKeySet = new Set<string>();
    const hazardKeySet = new Set<string>();
    const mudKeySet = new Set<string>();
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.subWorld !== inSubWorld) continue;
      if (ent.type === 'platform') platformKeySet.add(`${Math.round(ent.x)},${Math.round(ent.y)}`);
      else if (ent.type === 'hazard') hazardKeySet.add(`${Math.round(ent.x)},${Math.round(ent.y)}`);
      else if (ent.type === 'mud') mudKeySet.add(`${Math.round(ent.x)},${Math.round(ent.y)}`);
    }

    // Entities
    for (let _ei = 0; _ei < entities.length; _ei++) {
      const e = entities[_ei];
      if (e.subWorld !== inSubWorld) continue;
      const dx = e.x - cameraX;
      if (dx + e.width < -100 || dx > CANVAS_WIDTH + 100) continue;

      if (e.type === 'goal') {
        ctx.save();
        const bob = Math.sin(Date.now() * 0.004 + e.x * 0.01) * 3;
        ctx.translate(dx + e.width / 2, e.y + e.height / 2 + bob);
        if (seedImg.current && seedImg.current.complete && seedImg.current.naturalWidth > 0) {
          const drawW = e.width * 1.15;
          const drawH = e.height * 0.72;
          ctx.drawImage(seedImg.current, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          ctx.fillStyle = '#FFB300';
          ctx.beginPath();
          ctx.ellipse(0, 0, e.width * 0.38, e.height * 0.25, Math.PI / 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === 'platform') {
        if (e.hidden) continue;
        if (inSubWorld) {
          ctx.fillStyle = '#5D4037';
          ctx.fillRect(dx, e.y, e.width, e.height);
          ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 1; ctx.strokeRect(dx, e.y, e.width, e.height);
        } else {
          // O(1) lookup instead of O(n) entities.some()
          const hasPlatformAbove = platformKeySet.has(`${Math.round(e.x)},${Math.round(e.y - TILE_SIZE)}`);
          if (!hasPlatformAbove && grassImg.current && grassImg.current.complete && grassImg.current.naturalWidth > 0) {
            // Top tile: draw grass image
            ctx.drawImage(grassImg.current, dx, e.y, e.width, e.height);
          } else if (hasPlatformAbove && landImg.current && landImg.current.complete && landImg.current.naturalWidth > 0) {
            // Lower tile: draw land image
            ctx.drawImage(landImg.current, dx, e.y, e.width, e.height);
          } else {
            // Fallback
            ctx.fillStyle = '#C67B30';
            ctx.fillRect(dx, e.y, e.width, e.height);
            if (!hasPlatformAbove) { ctx.fillStyle = '#48D048'; ctx.fillRect(dx, e.y, e.width, 8); }
            ctx.strokeStyle = '#8F563B'; ctx.lineWidth = 1; ctx.strokeRect(dx, e.y, e.width, e.height);
          }
        }
      } else if (e.type === 'slope') {
        const img = e.slopeDirection === 'left' ? slopeLeftImg.current : slopeRightImg.current;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, dx, e.y, e.width, e.height);
        } else {
          ctx.save();
          ctx.fillStyle = '#A46A3C';
          ctx.fillRect(dx, e.y, e.width, e.height);
          ctx.strokeStyle = '#6D4C41';
          ctx.lineWidth = 1;
          ctx.strokeRect(dx, e.y, e.width, e.height);
          ctx.fillStyle = '#8BC34A';
          ctx.beginPath();
          if (e.slopeDirection === 'left') {
            ctx.moveTo(dx, e.y);
            ctx.lineTo(dx + e.width, e.y + e.height);
            ctx.lineTo(dx + e.width, e.y);
          } else {
            ctx.moveTo(dx, e.y + e.height);
            ctx.lineTo(dx, e.y);
            ctx.lineTo(dx + e.width, e.y + e.height);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else if (e.type === 'pipe') {
        if (pipeImg.current && pipeImg.current.complete) {
          ctx.save();
          if (e.isCeiling && !e.subWorld) {
            // Flip vertically for ceiling pipe in overworld only
            ctx.translate(dx + e.width / 2, e.y + e.height / 2);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg.current, -e.width / 2, -e.height / 2, e.width, e.height);
          } else {
            // Normal upright pipe (overworld ground pipes + sub-world ground pipes)
            ctx.drawImage(pipeImg.current, dx, e.y, e.width, e.height);
          }
          ctx.restore();
        } else {
          const pg = ctx.createLinearGradient(dx, 0, dx + e.width, 0);
          pg.addColorStop(0, '#006400'); pg.addColorStop(0.3, '#00BF00'); pg.addColorStop(0.7, '#00BF00'); pg.addColorStop(1, '#006400');
          ctx.fillStyle = pg;
          if (e.isCeiling && !e.subWorld) {
            ctx.fillRect(dx + 10, e.y, e.width - 20, e.height - 16);
            ctx.fillRect(dx, e.y + e.height - 16, e.width, 16);
          } else {
            ctx.fillRect(dx, e.y, e.width, 16);
            ctx.fillRect(dx + 10, e.y + 16, e.width - 20, e.height - 16);
          }
          ctx.strokeStyle = '#004D00'; ctx.lineWidth = 2; ctx.strokeRect(dx, e.y, e.width, e.height);
        }
        if (currentLevel === 2 && !inSubWorld && !e.subWorld && !e.isCeiling) {
          const hintBob = Math.sin(Date.now() * 0.005) * 5;
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y - 34 + hintBob);
          ctx.fillStyle = '#FFD54F';
          ctx.strokeStyle = '#F57F17';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 16);
          ctx.lineTo(15, 0);
          ctx.lineTo(7, 0);
          ctx.lineTo(7, -14);
          ctx.lineTo(-7, -14);
          ctx.lineTo(-7, 0);
          ctx.lineTo(-15, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFF8B0';
          ctx.beginPath();
          ctx.arc(0, -4, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Show a bobbing arrow above the underground exit pipe.
        if (e.isCeiling && e.subWorld && inSubWorld) {
          const hintBob = Math.sin(Date.now() * 0.005) * 4;
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y - 34 + hintBob);
          ctx.fillStyle = '#FFD54F';
          ctx.strokeStyle = '#F57F17';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(12, 4);
          ctx.lineTo(5, 4);
          ctx.lineTo(5, 14);
          ctx.lineTo(-5, 14);
          ctx.lineTo(-5, 4);
          ctx.lineTo(-12, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFF8B0';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (e.type === 'vine') {
        ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(dx + e.width / 2, e.y); ctx.lineTo(dx + e.width / 2, e.y + e.height); ctx.stroke();
        ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < Math.floor(e.height / 20); i++) { const ly = e.y + i * 20 + 10; const isL = i % 2 === 0; ctx.beginPath(); ctx.ellipse(dx + e.width / 2 + (isL ? -10 : 10), ly, 10, 5, isL ? -0.3 : 0.3, 0, Math.PI * 2); ctx.fill(); }
      } else if (e.type === 'hazard') {
        // Determine if this is a top water tile (no water tile directly above)
        // O(1) lookup instead of O(n) entities.some()
        const hasWaterAbove = hazardKeySet.has(`${Math.round(e.x)},${Math.round(e.y - TILE_SIZE)}`);
        const waterTop = e.y;
        if (currentLevel === 3 || currentLevel === 9) {
          const isLeftEdge = !hazardKeySet.has(`${Math.round(e.x - TILE_SIZE)},${Math.round(e.y)}`);
          if (!hasWaterAbove && isLeftEdge) {
            let runLeft = e.x;
            while (hazardKeySet.has(`${Math.round(runLeft - TILE_SIZE)},${Math.round(waterTop)}`)) runLeft -= TILE_SIZE;
            let runRight = e.x;
            while (hazardKeySet.has(`${Math.round(runRight + TILE_SIZE)},${Math.round(waterTop)}`)) runRight += TILE_SIZE;
            const runWidth = runRight - runLeft + TILE_SIZE;
            const totalHeight = TILE_SIZE * 2;
            const waveHeight = 16;
            const bodyTop = waterTop + waveHeight;
            const bodyHeight = totalHeight - waveHeight;
            const t = Date.now() * 0.001;

            ctx.save();
            ctx.beginPath();
            ctx.rect(runLeft - cameraX, waterTop, runWidth, totalHeight);
            ctx.clip();

            const bodyGrad = ctx.createLinearGradient(0, waterTop, 0, waterTop + totalHeight);
            bodyGrad.addColorStop(0, 'rgba(88, 210, 255, 0.58)');
            bodyGrad.addColorStop(0.22, 'rgba(26, 168, 235, 0.52)');
            bodyGrad.addColorStop(0.7, 'rgba(14, 118, 210, 0.45)');
            bodyGrad.addColorStop(1, 'rgba(5, 72, 160, 0.54)');
            ctx.fillStyle = bodyGrad;
            ctx.fillRect(runLeft - cameraX, waterTop, runWidth, totalHeight);

            // Soft depth bands for a shader-like feel
            for (let band = 0; band < 3; band++) {
              const bandY = waterTop + waveHeight + band * 13;
              const bandAlpha = 0.08 + band * 0.03;
              const phase = t * (1.1 + band * 0.25);
              ctx.fillStyle = `rgba(255,255,255,${bandAlpha})`;
              ctx.beginPath();
              for (let x = 0; x <= runWidth + 8; x += 8) {
                const worldX = runLeft + x;
                const y = bandY + Math.sin(worldX * 0.035 + phase) * (2.4 - band * 0.4) + Math.cos(worldX * 0.017 - phase * 1.2) * 1.2;
                if (x === 0) ctx.moveTo(runLeft - cameraX + x, y);
                else ctx.lineTo(runLeft - cameraX + x, y);
              }
              ctx.strokeStyle = `rgba(255,255,255,${bandAlpha})`;
              ctx.lineWidth = 2.5 - band * 0.4;
              ctx.stroke();
            }

            // Top wave surface - one continuous strip, not tiled pieces
            const surfaceGrad = ctx.createLinearGradient(0, waterTop, 0, waterTop + waveHeight);
            surfaceGrad.addColorStop(0, 'rgba(255,255,255,0.32)');
            surfaceGrad.addColorStop(0.45, 'rgba(138,231,255,0.36)');
            surfaceGrad.addColorStop(1, 'rgba(27,173,240,0.12)');
            ctx.fillStyle = surfaceGrad;
            ctx.fillRect(runLeft - cameraX, waterTop, runWidth, waveHeight);

            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x <= runWidth; x += 4) {
              const worldX = runLeft + x;
              const y = waterTop + waveHeight * 0.62 + Math.sin(worldX * 0.06 + t * 2.4) * 2.4 + Math.sin(worldX * 0.018 - t * 1.4) * 1.2;
              if (x === 0) ctx.moveTo(runLeft - cameraX + x, y);
              else ctx.lineTo(runLeft - cameraX + x, y);
            }
            ctx.stroke();

            // Lower highlight so the wave and body feel fused
            ctx.strokeStyle = 'rgba(170,245,255,0.24)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let x = 0; x <= runWidth; x += 5) {
              const worldX = runLeft + x;
              const y = bodyTop + bodyHeight * 0.18 + Math.sin(worldX * 0.045 + t * 1.8) * 1.4;
              if (x === 0) ctx.moveTo(runLeft - cameraX + x, y);
              else ctx.lineTo(runLeft - cameraX + x, y);
            }
            ctx.stroke();

            ctx.restore();
          }
        }
      } else if (e.type === 'mud') {
        // Level 5 swamp liquid: contiguous mud tiles render as one connected liquid run
        const isSwampLevel = currentLevel === 4;
        if (isSwampLevel) {
          const isLeftEdge = !mudKeySet.has(`${Math.round(e.x - TILE_SIZE)},${Math.round(e.y)}`);
          if (isLeftEdge) {
            let runLeft = e.x;
            while (mudKeySet.has(`${Math.round(runLeft - TILE_SIZE)},${Math.round(e.y)}`)) runLeft -= TILE_SIZE;
            let runRight = e.x;
            while (mudKeySet.has(`${Math.round(runRight + TILE_SIZE)},${Math.round(e.y)}`)) runRight += TILE_SIZE;
            const runWidth = runRight - runLeft + TILE_SIZE;
            const liquidTop = e.y;
            const liquidHeight = TILE_SIZE;
            const runDx = runLeft - cameraX;
            const t = Date.now() * 0.001;

            ctx.save();
            ctx.beginPath();
            ctx.rect(runDx, liquidTop, runWidth, liquidHeight);
            ctx.clip();

            const liquidGrad = ctx.createLinearGradient(0, liquidTop, 0, liquidTop + liquidHeight);
            liquidGrad.addColorStop(0, 'rgba(53, 90, 48, 0.98)');
            liquidGrad.addColorStop(0.45, 'rgba(34, 64, 38, 0.96)');
            liquidGrad.addColorStop(1, 'rgba(12, 28, 18, 0.98)');
            ctx.fillStyle = liquidGrad;
            ctx.fillRect(runDx, liquidTop, runWidth, liquidHeight);

            for (let band = 0; band < 3; band++) {
              const bandY = liquidTop + 9 + band * 8;
              ctx.strokeStyle = `rgba(142, 255, 160, ${0.07 - band * 0.015})`;
              ctx.lineWidth = 1.2 + band * 0.2;
              ctx.beginPath();
              for (let x = 0; x <= runWidth + 6; x += 6) {
                const worldX = runLeft + x;
                const y = bandY + Math.sin(worldX * 0.045 + t * (1.6 + band * 0.2)) * (1.2 + band * 0.15) + Math.cos(worldX * 0.016 - t * 1.1) * 0.8;
                if (x === 0) ctx.moveTo(runDx + x, y);
                else ctx.lineTo(runDx + x, y);
              }
              ctx.stroke();
            }

            ctx.fillStyle = 'rgba(104, 153, 94, 0.22)';
            ctx.fillRect(runDx, liquidTop, runWidth, 7);
            ctx.strokeStyle = 'rgba(205, 255, 197, 0.18)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let x = 0; x <= runWidth; x += 4) {
              const worldX = runLeft + x;
              const y = liquidTop + 5 + Math.sin(worldX * 0.07 + t * 2.6) * 1.8 + Math.cos(worldX * 0.023 - t * 1.8) * 0.9;
              if (x === 0) ctx.moveTo(runDx + x, y);
              else ctx.lineTo(runDx + x, y);
            }
            ctx.stroke();

            const bubblePhase = Date.now() * 0.0012;
            for (let b = 0; b < 5; b++) {
              const bubbleT = (bubblePhase + b * 0.37) % 1;
              const bx = runDx + runWidth * (((b * 0.18) + (Math.sin(t * 0.7 + b * 3.1) * 0.06) + 0.18) % 1);
              const rise = bubbleT * liquidHeight * 0.9;
              const by = liquidTop + liquidHeight - rise;
              const radius = 3 + (1 - bubbleT) * 5;
              ctx.fillStyle = `rgba(210, 255, 184, ${0.18 + (1 - bubbleT) * 0.25})`;
              ctx.beginPath();
              ctx.arc(bx, by, radius, 0, Math.PI * 2);
              ctx.fill();
              if (bubbleT > 0.86) {
                const pop = (bubbleT - 0.86) / 0.14;
                ctx.strokeStyle = `rgba(255,255,255,${0.45 - pop * 0.35})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(bx, liquidTop + 5, 5 + pop * 11, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = `rgba(255,255,255,${0.2 - pop * 0.15})`;
                for (let s = 0; s < 4; s++) {
                  const ang = pop * Math.PI * 2 + s * Math.PI / 2;
                  ctx.fillRect(bx + Math.cos(ang) * (4 + pop * 7), liquidTop + 5 + Math.sin(ang) * (4 + pop * 7), 2, 2);
                }
              }
            }

            ctx.restore();
          }
        }
      } else if (e.type === 'thorn') {
        const img = thornsImg.current;
        const thornPulse = e.thornHitTime ? Math.max(0, 1 - (Date.now() - e.thornHitTime) / 220) : 0;
        const pulseScale = 1 + thornPulse * 0.22;
        const pulseLift = thornPulse * 3;
        if (img && img.complete && img.naturalWidth > 0) {
          const natW = img.naturalWidth;
          const natH = img.naturalHeight;
          const drawW = natW * pulseScale;
          const drawH = natH * pulseScale;
          const drawX = dx + e.width / 2 - drawW / 2;
          const drawY = e.y + e.height - drawH - pulseLift;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else {
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y + e.height);
          ctx.scale(pulseScale, pulseScale);
          ctx.translate(0, -pulseLift);
          ctx.fillStyle = '#5D4A1F';
          ctx.fillRect(-e.width / 2, -e.height, e.width, e.height * 0.45);
          ctx.fillStyle = '#7B6B2A';
          ctx.beginPath();
          ctx.moveTo(-e.width / 2, -e.height * 0.65);
          ctx.lineTo(-e.width / 2 + e.width * 0.4, -e.height);
          ctx.lineTo(-e.width / 2 + e.width * 0.7, -e.height * 0.65);
          ctx.lineTo(e.width / 2, -e.height * 0.88);
          ctx.lineTo(e.width / 2, -e.height * 0.4);
          ctx.lineTo(-e.width / 2 + e.width * 0.25, -e.height * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else if (e.type === 'pillar') {
        ctx.save();
        const pulse = 1 + Math.sin(Date.now() * 0.004 + (e.phase || 0)) * 0.02;
        const topY = e.y;
        const bottomY = e.y + e.height;
        const pillarW = e.width;
        const woodGrad = ctx.createLinearGradient(dx, topY, dx + pillarW, topY);
        woodGrad.addColorStop(0, '#4C331F');
        woodGrad.addColorStop(0.18, '#7A5533');
        woodGrad.addColorStop(0.5, '#A06D42');
        woodGrad.addColorStop(0.82, '#6D492B');
        woodGrad.addColorStop(1, '#3B2518');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(dx, topY, pillarW, e.height * pulse);
        ctx.strokeStyle = 'rgba(37, 22, 13, 0.75)';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx + 1, topY + 1, pillarW - 2, e.height * pulse - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (let i = 0; i < 5; i++) {
          const y = topY + 8 + i * 24;
          ctx.fillRect(dx + 3, y, pillarW - 6, 3);
        }
        ctx.beginPath();
        ctx.fillStyle = '#2B1A10';
        ctx.arc(dx + pillarW / 2, topY + 5, pillarW * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.type === 'pea-shooter') {
        ctx.save();
        const bob = Math.sin(Date.now() * 0.004 + e.x * 0.02) * 2.5;
        const centerX = dx + e.width / 2;
        const peaIdleImg = pea1Img.current;
        const peaChargeImg = pea2Img.current;
        const img = e.isSquashing ? peaChargeImg : peaIdleImg;
        const anchorY = e.y + 14 + bob;
        ctx.translate(centerX + 2, anchorY);
        ctx.scale(1, 1);
        if (img && img.complete && img.naturalWidth > 0) {
          const fit = 36 / img.naturalHeight;
          const drawW = img.naturalWidth * fit;
          const drawH = img.naturalHeight * fit;
          if (e.isSquashing) {
            ctx.translate(2, 2);
            ctx.scale(1, 0.88);
          }
          ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
        } else {
          ctx.fillStyle = e.isSquashing ? '#9CCC65' : '#7CB342';
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#2E7D32';
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === 'cannon') {
        ctx.save();
        const isCharging = !!e.isCharging;
        const chargeElapsed = e.isCharging ? Math.max(0, Date.now() - (e.chargeStartTime || Date.now())) : 0;
        const chargeP = isCharging ? Math.min(1, chargeElapsed / 2000) : 0;
        const squishX = isCharging ? 1.15 + chargeP * 0.35 : (e.squishTime && Date.now() - e.squishTime < 220 ? 0.92 : 1);
        const squishY = isCharging ? 0.7 - chargeP * 0.08 : (e.squishTime && Date.now() - e.squishTime < 220 ? 0.84 : 1);
        const bob = Math.sin(Date.now() * 0.005 + e.x * 0.03) * 1.0;
        ctx.translate(dx + e.width / 2, e.y + e.height / 2 + bob);
        if (e.facing === 'right') ctx.scale(-1, 1);
        ctx.scale(squishX, squishY);
        const popcorn = popcornImg.current;
        if (popcorn && popcorn.complete && popcorn.naturalWidth > 0) {
          const drawW = e.width * 1.15;
          const drawH = e.height * 1.15;
          ctx.drawImage(popcorn, -drawW / 2, -drawH / 2, drawW, drawH);
          if (isCharging) {
            ctx.globalAlpha = 0.18 + chargeP * 0.22;
            ctx.fillStyle = '#FFF8E1';
            ctx.beginPath();
            ctx.arc(0, -6, 22 + chargeP * 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = '#A46A3C';
          ctx.beginPath();
          ctx.roundRect(-18, -8, 34, 18, 6);
          ctx.fill();
          ctx.fillStyle = '#5D4037';
          ctx.beginPath();
          ctx.roundRect(-8, -2, 26, 9, 4);
          ctx.fill();
          ctx.fillStyle = isCharging ? '#FFE082' : '#D7CCC8';
          ctx.beginPath();
          ctx.arc(-4, -1, isCharging ? 8 : 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3E2723';
          ctx.beginPath();
          ctx.arc(10, -1, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === 'cave-intake' || e.type === 'cave-exhaust') {
        ctx.save();
        const phase = e.phase || 0;
        const cavePulse = 1;
        if (caveImg.current && caveImg.current.complete && caveImg.current.naturalWidth > 0) {
          const caveW = caveImg.current.naturalWidth;
          const caveH = caveImg.current.naturalHeight;
          const caveX = dx + e.width / 2 - caveW / 2;
          const caveY = e.y + e.height / 2 - caveH / 2;
          ctx.translate(caveX + caveW / 2, caveY + caveH / 2);
          ctx.drawImage(caveImg.current, -caveW / 2, -caveH / 2, caveW, caveH);

          // Cave airflow particles
          const now = Date.now();
          const centerX = dx + e.width / 2;
          const centerY = e.y + e.height / 2;
          const particleCount = 9;
          for (let i = 0; i < particleCount; i++) {
            const t = ((now * 0.0015) + phase * 2 + i / particleCount) % 1;
            const side = e.type === 'cave-intake' ? -1 : 1;
            const swirl = Math.sin((now * 0.006) + i * 1.3 + phase) * 8;
            const arc = Math.cos(t * Math.PI * 2) * 10;
            const px = centerX + side * (14 + t * 18) + swirl * 0.3;
            const py = centerY + (Math.sin(t * Math.PI * 2) * 6) - 4;
            const alpha = e.type === 'cave-intake' ? (1 - t) * 0.55 : t * 0.55;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = e.type === 'cave-intake' ? '#D8D8D8' : '#CFCFCF';
            ctx.beginPath();
            ctx.arc(px + arc * 0.15, py - t * 10, 1.5 + t * 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // One drifting leaf above the cave
          const leafT = (now * 0.00035 + phase) % 1;
          const leafX = centerX + Math.sin(now * 0.0012 + phase) * 22;
          const leafY = caveY - 16 - Math.cos(now * 0.0015 + phase) * 4;
          ctx.save();
          ctx.translate(leafX, leafY);
          ctx.rotate(Math.sin(now * 0.002 + phase) * 0.25);
          ctx.fillStyle = '#7CB342';
          ctx.strokeStyle = '#558B2F';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 4.5, Math.sin(leafT * Math.PI * 2) * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#558B2F';
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.quadraticCurveTo(0, 2, 6, 0);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = e.type === 'cave-intake' ? '#3A1F16' : '#5D4037';
          ctx.beginPath();
          ctx.arc(dx + e.width / 2, e.y + e.height / 2, e.width * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#20110B';
          ctx.beginPath();
          ctx.arc(dx + e.width / 2, e.y + e.height / 2 + 2, e.width * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === 'windmill') {
        ctx.save();
        const cx = dx + e.width / 2;
        const baseY = e.y + e.height;
        const cy = baseY - 48;
        const spin = e.rotation || 0;
        const pole = pinwheel2Img.current;
        const blade = pinwheel1Img.current;
        if (pole && pole.complete && pole.naturalWidth > 0) {
          const poleDrawH = 46;
          const poleDrawW = (pole.naturalWidth / pole.naturalHeight) * poleDrawH;
          ctx.drawImage(pole, cx - poleDrawW / 2, baseY - poleDrawH, poleDrawW, poleDrawH);
        } else {
          ctx.strokeStyle = '#A67C52';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(cx, baseY);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        if (blade && blade.complete && blade.naturalWidth > 0) {
          const drawSize = 96;
          ctx.drawImage(blade, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
          for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2;
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = i % 2 === 0 ? '#F06292' : '#FFD54F';
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(38, -10);
            ctx.lineTo(40, 0);
            ctx.lineTo(38, 10);
            ctx.lineTo(0, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();
        ctx.restore();
      } else if (e.enemyType === 'mole') {
          ctx.save();
          const elapsed = Math.max(0, Date.now() - (e.phase || Date.now()));
          const emerge = elapsed < 260
            ? elapsed / 260
            : elapsed < 1260
              ? 1
              : Math.max(0, 1 - (elapsed - 1260) / 260);
          const bounce = elapsed < 1260 ? Math.sin(Math.min(1, elapsed / 260) * Math.PI) * 3 : 0;
          const centerX = dx + e.width / 2;
          const baseY = (e.moleBaseY ?? e.y) + e.height;
          ctx.beginPath();
          ctx.rect(centerX - e.width * 0.9, baseY - e.height * 1.2, e.width * 1.8, e.height * 1.4);
          ctx.clip();
          ctx.translate(centerX, baseY - emerge * e.height - bounce);
          ctx.fillStyle = '#8D5A3B';
          ctx.beginPath();
          ctx.ellipse(0, 0, e.width * 0.48, e.height * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#C08A61';
          ctx.beginPath();
          ctx.ellipse(0, 2, e.width * 0.32, e.height * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#2B160E';
          ctx.beginPath();
          ctx.arc(-6, -8, 2.2, 0, Math.PI * 2);
          ctx.arc(6, -8, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#F6C3AD';
          ctx.beginPath();
          ctx.arc(0, -2, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (e.enemyType === 'rabbit') {
          const rabbitScale = e.renderScale || 1;
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y + e.height);
          if (e.facing === 'right') ctx.scale(-1, 1);
          if (e.rabbitMode === 'leak') {
            const leakElapsed = Math.max(0, Date.now() - (e.rabbitModeStart || Date.now()));
            ctx.rotate(leakElapsed * 0.045 * (e.rabbitModeSpinDir || 1));
            const flash = Math.max(0, 1 - leakElapsed / 260);
            if (flash > 0) {
              ctx.save();
              ctx.globalAlpha = flash;
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              const starSize = 12 + flash * 8;
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const ang = (Math.PI / 4) * i - Math.PI / 2;
                const r = i % 2 === 0 ? starSize : starSize * 0.42;
                const sx = Math.cos(ang) * r;
                const sy = Math.sin(ang) * r;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
              }
              ctx.closePath();
              ctx.stroke();
              ctx.restore();
            }
            const endStarAlpha = (e as any).leakStarAlpha ?? 0;
            if (endStarAlpha > 0) {
              ctx.save();
              ctx.globalAlpha = endStarAlpha;
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#FFFDE7';
              ctx.lineWidth = 2.5;
              const starSize = 16 + endStarAlpha * 4;
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const ang = (Math.PI / 4) * i - Math.PI / 2;
                const r = i % 2 === 0 ? starSize : starSize * 0.38;
                const sx = Math.cos(ang) * r;
                const sy = Math.sin(ang) * r;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
              }
              ctx.closePath();
              ctx.stroke();
              ctx.fillStyle = 'rgba(255,255,255,0.35)';
              ctx.fill();
              ctx.restore();
            }
          }
          ctx.scale(rabbitScale, rabbitScale);
          if (rabbitImg.current && rabbitImg.current.complete) {
            const rabbitDrawW = e.width + 8;
            const rabbitDrawH = e.height + 8;
            ctx.drawImage(rabbitImg.current, -rabbitDrawW / 2, -rabbitDrawH, rabbitDrawW, rabbitDrawH);
          } else {
            ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#CCC'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(0, -14, 12, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(-5, -36, 4, 10, -0.2, 0, Math.PI * 2); ctx.ellipse(5, -36, 4, 10, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFB6C1'; ctx.beginPath(); ctx.ellipse(-5, -36, 2, 6, -0.2, 0, Math.PI * 2); ctx.ellipse(5, -36, 2, 6, 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#F00'; ctx.beginPath(); ctx.arc(-4, -18, 3, 0, Math.PI * 2); ctx.arc(4, -18, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
            ctx.fillRect(-3, -8, 3, 6); ctx.strokeRect(-3, -8, 3, 6); ctx.fillRect(0, -8, 3, 6); ctx.strokeRect(0, -8, 3, 6);
          }
          ctx.restore();
        } else if (e.enemyType === 'frog') {
          ctx.save(); ctx.translate(dx + e.width / 2, e.y + e.height / 2);
          if (e.facing === 'right') ctx.scale(-1, 1);
          const tongueCycle = (Date.now() + (e.x * 100)) % 2000;
          if (tongueCycle < 600) {
            const tongueProgress = tongueCycle < 300 ? tongueCycle / 300 : (600 - tongueCycle) / 300;
            const tongueLen = tongueProgress * 35;
            ctx.fillStyle = '#FF69B4';
            ctx.strokeStyle = '#FF1493';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-e.width / 2, 0);
            ctx.lineTo(-e.width / 2 - tongueLen, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-e.width / 2 - tongueLen, 0, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          if (frogImg.current && frogImg.current.complete && frogImg.current.naturalWidth > 0) {
            ctx.drawImage(frogImg.current, -e.width / 2 - 6, -e.height / 2 - 6, e.width + 12, e.height + 12);
          } else {
            ctx.fillStyle = '#4CAF50'; ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 2, 14, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          ctx.restore();
        } else if (e.enemyType === 'snail') {
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y + e.height);
          if (e.facing === 'right') ctx.scale(-1, 1);
          const snailPhase = e.snailPhase || 0;
          const stride = Math.sin(Date.now() * 0.012 + snailPhase);
          const squashX = 1 + stride * 0.1;
          const squashY = 1 - stride * 0.06;
          ctx.scale(squashX, squashY);
          if (snailImg.current && snailImg.current.complete && snailImg.current.naturalWidth > 0) {
            const natW = snailImg.current.naturalWidth;
            const natH = snailImg.current.naturalHeight;
            const fit = Math.min(e.width / natW, e.height / natH);
            const drawW = natW * fit;
            const drawH = natH * fit;
            ctx.drawImage(snailImg.current, -drawW / 2, -drawH, drawW, drawH);
          } else {
            ctx.fillStyle = '#8D6E63';
            ctx.beginPath();
            ctx.ellipse(0, 4, 14, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#BCAAA4';
            ctx.beginPath();
            ctx.arc(-2, -2, 8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (e.enemyType === 'monster1') {
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y + e.height / 2);
          if (e.facing === 'right') ctx.scale(-1, 1);
          const bounce = 1 + Math.sin(Date.now() * 0.01 + e.x * 0.02) * 0.05;
          ctx.scale(bounce, bounce);
          if (monster1Img.current && monster1Img.current.complete && monster1Img.current.naturalWidth > 0) {
            ctx.drawImage(monster1Img.current, -e.width / 2 - 6, -e.height / 2 - 6, e.width + 12, e.height + 12);
          } else {
            ctx.fillStyle = '#7C4DFF';
            ctx.beginPath();
            ctx.roundRect(-18, -18, 36, 36, 10);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(-6, -4, 4, 0, Math.PI * 2);
            ctx.arc(6, -4, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (e.enemyType === 'piranha') {
          ctx.save();
          const pImg = e.mouthOpen ? piraImg.current : piraCloseImg.current;
          if (pImg && pImg.complete && pImg.naturalWidth > 0) {
            ctx.drawImage(pImg, dx + e.width / 2 - 20, e.y + e.height / 2 - 20, 40, 40);
          } else {
            ctx.translate(dx + e.width / 2, e.y + e.height / 2);
            ctx.fillStyle = '#F44336'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(16, 0); ctx.lineTo(10, 2); ctx.fill();
          }
          ctx.restore();
        } else if (e.enemyType === 'bat') {
          ctx.save();
          ctx.translate(dx + e.width / 2, e.y + e.height / 2);
          if (e.facing === 'left') ctx.scale(-1, 1);
          ctx.rotate(Math.sin(Date.now() * 0.015) * 0.15);
          if (batImg.current && batImg.current.complete) {
            ctx.drawImage(batImg.current, -e.width / 2, -e.height / 2, e.width, e.height);
          } else {
            ctx.fillStyle = '#2D1B4E';
            ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        } else if (e.enemyType === 'eagle') {
          const useOwl = currentLevel === 4;
          if (useOwl) {
            ctx.save();
            ctx.translate(dx + e.width / 2, e.y + e.height / 2);
            if (e.facing === 'left') ctx.scale(-1, 1);
            const isStuck = e.diveState === 'stuck';
            const wingSpeed = isStuck ? 0.028 : 0.012;
            const wingPower = isStuck ? 0.55 : 0.22;
            const wingLiftPower = isStuck ? 11 : 4;
            const wingCycle = Math.sin(Date.now() * wingSpeed);
            const wingLift = Math.sin(Date.now() * wingSpeed * 2) * wingLiftPower;
            const wingAngle = (isStuck ? 0.38 : 0.18) + wingCycle * wingPower;
            const wingL = owlWingLImg.current;
            const wingR = owlWingRImg.current;
            const body = owlImg.current;

            if (wingL && wingL.complete && wingL.naturalWidth > 0) {
              ctx.save();
              ctx.translate(-24, -4 + wingLift * 0.4);
              ctx.rotate(-wingAngle);
              ctx.drawImage(wingL, -28, -20, 56, 40);
              ctx.restore();
            }
            if (wingR && wingR.complete && wingR.naturalWidth > 0) {
              ctx.save();
              ctx.translate(24, -4 - wingLift * 0.4);
              ctx.rotate(wingAngle);
              ctx.drawImage(wingR, -28, -20, 56, 40);
              ctx.restore();
            }
            if (body && body.complete && body.naturalWidth > 0) {
              const bodyW = 78;
              const bodyH = 76;
              ctx.drawImage(body, -bodyW / 2, -bodyH / 2 + 2, bodyW, bodyH);
            } else {
              ctx.fillStyle = '#6E6655';
              ctx.beginPath(); ctx.ellipse(0, 6, 18, 20, 0, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#CFC7B2';
              ctx.beginPath(); ctx.ellipse(0, 10, 14, 15, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
          } else {
            ctx.save();
            ctx.translate(dx + e.width / 2, e.y + e.height / 2);
            if (e.facing === 'left') ctx.scale(-1, 1);
            const breathe = Math.sin(Date.now() / 400) * 0.04;
            ctx.save(); ctx.scale(1 + breathe, 1 - breathe);
            ctx.fillStyle = '#D4A574';
            ctx.beginPath(); ctx.ellipse(0, 2, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.fillStyle = '#FFF8E1';
            ctx.beginPath(); ctx.ellipse(0, 6, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.ellipse(-4, -12, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(9, -12, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5D4037';
            ctx.beginPath(); ctx.arc(-3, -11, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, -11, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FF8F00';
            ctx.beginPath(); ctx.moveTo(2, -5); ctx.quadraticCurveTo(5, -1, 2, 1); ctx.quadraticCurveTo(-1, -1, 2, -5); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
      } else if (e.type === 'item') {
          ctx.save();
          if (e.itemType === 'mushroom') {
            const img = mushroomImg.current;
            const pulse = e.lastHitTime ? Math.max(0, 1 - (Date.now() - e.lastHitTime) / 250) : 0;
            const squash = 1 + pulse * 0.18;
            const lift = pulse * 6;
            const baseX = dx + e.width / 2;
            const baseY = e.y + e.height;
            ctx.translate(baseX, baseY - lift);
            ctx.scale(squash, 1 + pulse * 0.06);
            if (img && img.complete && img.naturalWidth > 0) {
              const drawW = 48;
              const fit = drawW / img.naturalWidth;
              const drawH = img.naturalHeight * fit;
              ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
            } else {
              ctx.fillStyle = '#D84315';
              ctx.beginPath();
              ctx.ellipse(0, -18, 20, 13, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#E08A4D';
              ctx.fillRect(-6, -18, 12, 18);
            }
            ctx.restore();
            return;
          }
          if (e.itemType === 'carrot') {
            const img = carrotImg.current;
            const eaten = e.collectingInfo ? Math.max(0, 1 - (Date.now() - e.collectingInfo.startTime) / 300) : 1;
            const baseX = dx + e.width / 2;
            const baseY = e.y + e.height;
            ctx.translate(baseX, baseY);
            ctx.scale(eaten, eaten);
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, -e.width / 2, -e.height, e.width, e.height);
            } else {
              ctx.fillStyle = '#F36C21';
              ctx.beginPath();
              ctx.ellipse(0, -e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#4CAF50';
              ctx.fillRect(e.width / 2 - 6, -e.height + 4, 10, 8);
            }
            ctx.restore();
            return;
          }
          const collecting = e.collectingInfo ? Math.min(1, (Date.now() - e.collectingInfo.startTime) / 1200) : 0;
          const scale = 1 + (e.itemType === 'star' ? 0.08 : 0.04) - collecting * 0.1;
          const sway = e.itemType === 'star' ? 0 : Math.sin(Date.now() * 0.0045 + e.x * 0.01) * 1.6;
          const stemBend = e.itemType === 'star' ? 0 : Math.sin(Date.now() * 0.0035 + e.x * 0.008) * 0.03;
          const starBob = 0;
          const baseX = dx + e.width / 2 + sway;
          const baseY = e.y + e.height / 2 + starBob;
          ctx.translate(baseX, baseY);
          const flowerHitPulse = e.itemType === 'flower' && e.thornHitTime ? Math.max(0, 1 - (Date.now() - e.thornHitTime) / 280) : 0;
          ctx.rotate(stemBend + flowerHitPulse * Math.sin(Date.now() * 0.08) * 0.2);
          ctx.scale(scale, scale);

        if (e.itemType === 'flower') {
          const img = e.flowerVariant === 'bunch' ? flowersImg.current : flowerImg.current;
          if (img && img.complete && img.naturalWidth > 0) {
            const drawW = e.width + 20;
            const drawH = (img.naturalHeight / img.naturalWidth) * drawW;
            ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
            if (e.coinPopInfo && !e.coinCollected) {
              const coinElapsed = Math.max(0, Date.now() - e.coinPopInfo.startTime);
              const coinP = Math.min(1, coinElapsed / 900);
              const targetX = -112;
              const targetY = 28;
              const startX = 0;
              const startY = 10;
              const popPeak = -44;
              let coinX = startX;
              let coinY = startY;
              if (coinP < 0.2) {
                const riseP = coinP / 0.2;
                coinY = startY + (popPeak - startY) * riseP;
                coinX = startX + Math.sin(riseP * Math.PI) * 2;
              } else {
                const flyP = (coinP - 0.2) / 0.8;
                coinX = startX + (targetX - startX) * flyP;
                coinY = popPeak + (targetY - popPeak) * flyP - Math.sin(flyP * Math.PI) * 30;
              }
              const coinSpin = coinP * Math.PI * 4.5;
              const coinScale = 1.25 + (1 - coinP) * 0.18;
              ctx.save();
              ctx.globalCompositeOperation = 'source-over';
              ctx.shadowColor = 'rgba(255, 213, 79, 0.75)';
              ctx.shadowBlur = 14;
              ctx.translate(coinX, coinY);
              ctx.scale(coinScale, coinScale);
              ctx.rotate(coinSpin);
              const coinFrame = Math.sin(coinP * Math.PI * 2) > 0 ? coinImg.current : coinAltImg.current;
              if (coinFrame && coinFrame.complete && coinFrame.naturalWidth > 0) {
                ctx.drawImage(coinFrame, -15, -15, 30, 30);
              } else {
                ctx.fillStyle = '#FFD54F';
                ctx.strokeStyle = '#E0A800';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              ctx.restore();
            }
          } else {
            drawFlowerShape(ctx, 0, -10);
            }
          } else if (e.itemType === 'star') {
            const glowPulse = 1 + Math.sin(Date.now() * 0.006 + e.x * 0.01) * 0.08;
            const img = starImg.current;
            if (img && img.complete && img.naturalWidth > 0) {
              if (!e.collectingInfo) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 235, 59, 0.18)';
                ctx.beginPath();
                ctx.arc(0, 0, 18 * glowPulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.scale(1, 1);
                const draw = Math.max(e.width, e.height) * 1.35;
                ctx.drawImage(img, -draw / 2, -draw / 2, draw, draw);
              } else {
                const p = Math.min(1, (Date.now() - e.collectingInfo.startTime) / 1200);
                const burst = p < 0.16 ? 1 + (p / 0.16) * 1.5 : Math.max(0.04, 2.5 * (1 - ((p - 0.16) / 0.84)));
                const targetX = 112;
                const targetY = 28;
                const startX = baseX;
                const startY = baseY - 8;
                const tx = startX + (targetX - startX) * p;
                const ty = startY + (targetY - startY) * p - Math.sin(p * Math.PI) * 72;
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.translate(tx, ty);
                ctx.rotate(p * Math.PI * 4.5);
                ctx.scale(burst, burst);
                const draw = Math.max(e.width, e.height) * 1.4;
                ctx.drawImage(img, -draw / 2, -draw / 2, draw, draw);
                if (p > 0.72) {
                  ctx.globalAlpha = Math.max(0, 1 - (p - 0.72) / 0.28);
                  ctx.fillStyle = '#FFFDE7';
                  ctx.beginPath();
                  ctx.arc(0, 0, Math.max(1.5, (1 - p) * 9), 0, Math.PI * 2);
                  ctx.fill();
                }
                ctx.restore();
              }
            } else {
              ctx.fillStyle = '#FFD54F';
              ctx.strokeStyle = '#FFB300';
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 0; i < 5; i++) {
                const outer = -Math.PI / 2 + i * (Math.PI * 2 / 5);
                const inner = outer + Math.PI / 5;
                const ox = Math.cos(outer) * 10;
                const oy = Math.sin(outer) * 10;
                const ix = Math.cos(inner) * 4.5;
                const iy = Math.sin(inner) * 4.5;
                if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
                ctx.lineTo(ix, iy);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          }

          ctx.restore();
      }
    }

    // Decorative flowers are now interactive item entities - no separate rendering needed

    // Decorative flowers are now interactive item entities - no separate rendering needed

    // Player rendering (with pipe animation support)
    ctx.save();
    const pipeAnim = pipeAnimRef.current;
    let playerDrawX = player.x - cameraX;
    let playerDrawY = player.y;
    // Hide player during death animation (it's rendered separately as part of the animation)
    const playerVisible = !gameState.gameOver;

    if (pipeAnim && pipeAnim.active) {
      const elapsed = Date.now() - pipeAnim.startTime;
      const pipeDx = pipeAnim.pipeX - cameraX;
      const pipeCenterX = pipeDx + TILE_SIZE; // center of pipe
      playerDrawX = pipeCenterX - player.width / 2;

      if (pipeAnim.phase === 'bounce') {
        // Bounce up
        const bounceProgress = Math.min(elapsed / 300, 1);
        const bounceHeight = Math.sin(bounceProgress * Math.PI) * 30;
        playerDrawY = pipeAnim.pipeY - player.height - bounceHeight;
      } else if (pipeAnim.phase === 'sink') {
        // Sink into pipe
        const sinkProgress = Math.min(elapsed / 400, 1);
        playerDrawY = pipeAnim.pipeY - player.height + sinkProgress * (player.height + 10);
        // Clip player below pipe top
        if (sinkProgress > 0.3) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, CANVAS_WIDTH, pipeAnim.pipeY + 2);
          ctx.clip();
        }
      }
    }

    if (playerVisible) {
      if (Date.now() - gameState.lastDamageTime < 600 && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.4;
      ctx.translate(playerDrawX + player.width / 2, playerDrawY + player.height);
      if (!pipeAnim?.active) {
        ctx.scale(player.squashX || 1, player.squashY || 1);
      }
      if (player.facing === 'left') ctx.scale(-1, 1);
      ctx.translate(-player.width / 2, -player.height);

      // Check if player is in shoot animation (stretch the tomato image forward for mouth protrusion)
      const shootElapsed = player.shootTime ? Date.now() - player.shootTime : 999;
      const isShooting = shootElapsed < 250;

      // Use the same tomato image in both overworld and underground
      const playerImg = littleTomatoImg.current;
      if (playerImg && playerImg.complete) {
        if (isShooting) {
          // Stretch the tomato image horizontally to simulate mouth protruding forward
          const mouthProgress = shootElapsed < 100 ? shootElapsed / 100 : (250 - shootElapsed) / 150;
          const stretchX = mouthProgress * 10; // pixels to extend forward
          // Draw the tomato stretched wider on the front (right) side
          ctx.drawImage(playerImg, -4, -4, player.width + 8 + stretchX, player.height + 8);
        } else {
          ctx.drawImage(playerImg, -4, -4, player.width + 8, player.height + 8);
        }
      } else {
        ctx.fillStyle = '#FF4545'; ctx.beginPath(); ctx.ellipse(player.width / 2, player.height / 2 + 2, player.width / 2 - 2, player.height / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    // Restore clip if sink phase was active
    if (pipeAnim?.active && pipeAnim.phase === 'sink') {
      const elapsed = Date.now() - pipeAnim.startTime;
      const sinkProgress = Math.min(elapsed / 400, 1);
      if (sinkProgress > 0.3) ctx.restore();
    }

    // Projectiles
    projectiles.filter(p => !p.isDead && p.subWorld === inSubWorld).forEach(p => {
      const pdx = p.x - cameraX;
      // Off-screen culling for projectiles
      if (pdx + p.width < -50 || pdx > CANVAS_WIDTH + 50 || p.y + p.height < -50 || p.y > CANVAS_HEIGHT + 50) return;
      if (p.projectileType === 'photo-ball') {
        ctx.save();
        ctx.fillStyle = '#00E5FF'; ctx.beginPath(); ctx.arc(pdx + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(pdx + p.width / 2, p.y + p.height / 2, p.width / 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (p.projectileType === 'seed') {
        ctx.save();
        ctx.translate(pdx + p.width / 2, p.y + p.height / 2);
        ctx.rotate((p.rotation || 0) + 0.08);
        if (seedImg.current && seedImg.current.complete && seedImg.current.naturalWidth > 0) {
          ctx.drawImage(seedImg.current, -p.width / 2 - 2, -p.height / 2 - 2, p.width + 4, p.height + 4);
        } else {
          ctx.fillStyle = '#FFB300';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.width / 2 + 1, p.height / 2 + 1, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFF8E1';
          ctx.beginPath();
          ctx.arc(1, -1, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (p.projectileType === 'pea' || p.projectileType === 'pea3') {
        // Pea / pea3 projectile
        ctx.save();
        ctx.translate(pdx + p.width / 2, p.y + p.height / 2);
        ctx.rotate(p.rotation || 0);
        const peaProjImg = pea3Img.current;
        if (peaProjImg && peaProjImg.complete && peaProjImg.naturalWidth > 0) {
          const scale = p.projectileType === 'pea3' ? 0.92 : 1;
          ctx.drawImage(peaProjImg, -p.width * scale / 2, -p.height * scale / 2, p.width * scale, p.height * scale);
        } else {
          // Fallback green circle
          ctx.fillStyle = '#4CAF50';
          ctx.beginPath();
          ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (p.projectileType === 'egg') {
        // Egg projectile - render using egg.png or fallback oval
        ctx.save();
        ctx.translate(pdx + p.width / 2, p.y + p.height / 2);
        ctx.rotate(p.rotation || 0);
        if (eggImg.current && eggImg.current.complete) {
          ctx.drawImage(eggImg.current, -p.width / 2, -p.height / 2, p.width, p.height);
        } else {
          // Fallback: draw egg shape
          const eGrad = ctx.createRadialGradient(0, -2, 2, 0, 0, 10);
          eGrad.addColorStop(0, '#FFFDE7');
          eGrad.addColorStop(0.7, '#FFF8E1');
          eGrad.addColorStop(1, '#FFECB3');
          ctx.fillStyle = eGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          // Spots
          ctx.fillStyle = 'rgba(188,170,140,0.4)';
          ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(2, 2, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      } else if (p.projectileType === 'eagle-bullet' || p.projectileType === 'popcorn') {
        // Popcorn kernel - fluffy white/cream blob tumbling through the air
        ctx.save();
        ctx.translate(pdx + p.width / 2, p.y + p.height / 2);
        ctx.rotate(p.rotation || 0);
        const kernelScale = p.projectileType === 'popcorn' ? 2 : 1;
        // Popcorn body - lumpy cloud shape
        const pcGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 8);
        pcGrad.addColorStop(0, '#FFFDE7');
        pcGrad.addColorStop(0.6, '#FFF8E1');
        pcGrad.addColorStop(1, '#FFE0B2');
        ctx.fillStyle = pcGrad;
        // Main blob
        ctx.scale(kernelScale, kernelScale);
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        // Extra lumps for popcorn shape
        ctx.beginPath(); ctx.arc(-4, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(1, 4, 3.5, 0, Math.PI * 2); ctx.fill();
        // Kernel center detail - golden brown spot
        ctx.fillStyle = 'rgba(255,183,77,0.5)';
        ctx.beginPath(); ctx.arc(0, 1, 3, 0, Math.PI * 2); ctx.fill();
        // Subtle outline
        ctx.strokeStyle = 'rgba(255,152,0,0.3)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (p.projectileType === 'firework') {
        // Optimized firework trail - no shadowBlur (major perf gain)
        ctx.save();
        const fcx = pdx + p.width / 2;
        const fcy = p.y + p.height / 2;
        const fadeAlpha = Math.max(0.3, 1 - (p.bounceCount || 0) * 0.25);
        ctx.globalAlpha = fadeAlpha;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const age = (Date.now() - (p.spawnTime || Date.now())) * 0.001;
        const tailAngle = Math.atan2(-p.vy, -p.vx);

        // Scatter trail particles - no shadowBlur, use larger circles for glow effect
        const particleCount = Math.min(Math.floor(speed * 2), 10);
        for (let i = 0; i < particleCount; i++) {
          const t = (i + 1) / (particleCount + 1);
          const dist = t * Math.min(speed * 5, 45);
          const px = fcx + Math.cos(tailAngle) * dist + (Math.sin(age * 8 + i * 1.7)) * 2.5 * t;
          const py = fcy + Math.sin(tailAngle) * dist + (Math.cos(age * 7 + i * 2.3)) * 2.5 * t;
          const size = (1 - t * 0.7) * 3;
          const r = 255;
          const g = Math.floor(255 - t * 180);
          const b = Math.floor(220 - t * 210);
          const alpha = (1 - t * 0.8) * 0.7;
          // Outer glow circle (larger, semi-transparent) instead of shadowBlur
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
          ctx.beginPath(); ctx.arc(px, py, size * 2.5, 0, Math.PI * 2); ctx.fill();
          // Core dot
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
        }

        // Head glow - simple radial gradient, no shadowBlur
        ctx.fillStyle = 'rgba(255, 200, 50, 0.35)';
        ctx.beginPath(); ctx.arc(fcx, fcy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 230, 0.7)';
        ctx.beginPath(); ctx.arc(fcx, fcy, 5, 0, Math.PI * 2); ctx.fill();
        // White-hot center
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(fcx, fcy, 3, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        ctx.fillStyle = p.color || '#FF5722'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(pdx + p.width / 2, p.y + p.height / 2, p.width / 2, p.height / 2, Math.PI / 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    });

    // Render firework bounce spark particles
    const drawSparks = fireworkSparksRef.current;
    if (drawSparks.length > 0) {
      ctx.save();
      for (const s of drawSparks) {
        const lifeRatio = s.life / s.maxLife;
        const alpha = lifeRatio * 0.9;
        const sparkScreenX = s.x - cameraX;
        if (sparkScreenX < -20 || sparkScreenX > CANVAS_WIDTH + 20) continue;
        // Outer glow - no shadowBlur
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(sparkScreenX, s.y, s.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
        // Bright core
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(${Math.min(255, s.r + 40)}, ${Math.min(255, s.g + 40)}, ${Math.min(255, s.b + 20)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sparkScreenX, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        // White-hot center for fresh sparks
        if (lifeRatio > 0.5) {
          ctx.globalAlpha = alpha * (lifeRatio - 0.5) * 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(sparkScreenX, s.y, s.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Death animation is handled by a dedicated useEffect loop above

    // Enhanced hit flash effect - dramatic red/white screen flash with shockwave
    const respawnFlash = respawnFlashRef.current;
    if (respawnFlash && respawnFlash.active) {
      const elapsed = Date.now() - respawnFlash.startTime;
      if (elapsed < 1500) {
        const px = player.x - cameraX;
        const py = player.y;
        
        // Phase 1: Intense red screen flash (first 200ms)
        if (elapsed < 200) {
          const intensity = 1 - elapsed / 200;
          ctx.save();
          ctx.globalAlpha = intensity * 0.35;
          ctx.fillStyle = '#FF2020';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
        }
        
        // Phase 2: Expanding shockwave ring (first 400ms) - no shadowBlur
        if (elapsed < 400) {
          const ringProgress = elapsed / 400;
          const ringRadius = ringProgress * 120;
          ctx.save();
          ctx.globalAlpha = (1 - ringProgress) * 0.6;
          ctx.strokeStyle = '#FF6600';
          ctx.lineWidth = 6 * (1 - ringProgress);
          ctx.beginPath();
          ctx.arc(px + player.width / 2, py + player.height / 2, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2 * (1 - ringProgress);
          ctx.stroke();
          ctx.restore();
        }
        
        // Phase 3: Player blink with white/red alternating glow - no shadowBlur
        const flashCycle = Math.floor(elapsed / 80) % 3;
        if (flashCycle === 0) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(px + player.width / 2, py + player.height / 2, player.width / 2 + 10, player.height / 2 + 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (flashCycle === 1) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#FF4444';
          ctx.beginPath();
          ctx.ellipse(px + player.width / 2, py + player.height / 2, player.width / 2 + 6, player.height / 2 + 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        respawnFlashRef.current = null;
      }
    }

    // Level 10 lightning flash effect - white screen flash triggered by thunder/egg hits
    const lFlash = lightningFlashRef.current;
    if (lFlash && lFlash.active) {
      const elapsed = Date.now() - lFlash.startTime;
      const duration = 400; // 400ms total flash
      if (elapsed < duration) {
        const progress = elapsed / duration;
        // Quick bright flash that fades: peaks at 50ms then decays
        let alpha: number;
        if (elapsed < 50) {
          alpha = (elapsed / 50) * lFlash.intensity;
        } else {
          alpha = (1 - (elapsed - 50) / (duration - 50)) * lFlash.intensity;
        }
        ctx.save();
        // White-blue lightning flash
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#E8F0FF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Lightning bolt silhouette (jagged line from top) - no shadowBlur
        if (elapsed < 200) {
          const boltX = CANVAS_WIDTH * (0.3 + Math.sin(lFlash.startTime) * 0.2);
          // Outer glow layer (wider, semi-transparent blue)
          ctx.globalAlpha = alpha * 0.4;
          ctx.strokeStyle = '#88CCFF';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(boltX, 0);
          ctx.lineTo(boltX - 20, CANVAS_HEIGHT * 0.2);
          ctx.lineTo(boltX + 15, CANVAS_HEIGHT * 0.35);
          ctx.lineTo(boltX - 10, CANVAS_HEIGHT * 0.5);
          ctx.lineTo(boltX + 25, CANVAS_HEIGHT * 0.65);
          ctx.lineTo(boltX - 5, CANVAS_HEIGHT * 0.8);
          ctx.lineTo(boltX + 10, CANVAS_HEIGHT);
          ctx.stroke();
          // Core white bolt
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.stroke();
          // Second thinner branch
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.moveTo(boltX + 15, CANVAS_HEIGHT * 0.35);
          ctx.lineTo(boltX + 45, CANVAS_HEIGHT * 0.5);
          ctx.lineTo(boltX + 35, CANVAS_HEIGHT * 0.6);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        lightningFlashRef.current = { active: false, startTime: 0, intensity: 0 };
      }
    }

    // Draw foreground flowers, grass, and creatures
    drawForegroundFlowers(
      ctx, cameraX, gameState.currentLevel,
      bigFlowerImg, ladybugImg, ladybugBodyImg, ladybugFlyImg, ladybugWingImg,
      birdDecoImg, level2StartTimeRef, lawnImg, lawnFlowerImg,
      bigFlowerBlueImg, bigFlowerYellowImg, bigFlowerRedImg,
    );

    if (inSubWorld && bBackgroundFrontImg.current && bBackgroundFrontImg.current.complete && bBackgroundFrontImg.current.naturalWidth > 0) {
      const front = bBackgroundFrontImg.current;
      const frontX = -cameraX;
      const frontY = CANVAS_HEIGHT - front.naturalHeight;
      ctx.drawImage(front, frontX, frontY);
    }

    // End camera shake transform
    ctx.restore();

  }, [gameState]);

  const handlePointerDown = (key: string) => { touchState.current[key] = true; };
  const handlePointerUp = (key: string) => { touchState.current[key] = false; };

  return (
    <div ref={gameContainerRef} className="relative w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a3e] via-[#2d1b69] to-[#0f0f2a] overflow-hidden select-none">
      <div className={`relative overflow-hidden ${isFullscreen ? 'w-full h-full' : 'w-full max-w-[1920px] aspect-video rounded-3xl border-4 border-[#4a3a8a] shadow-[0_8px_32px_rgba(100,60,200,0.4),0_0_0_2px_rgba(255,255,255,0.15)_inset]'}`}>
        {/* HUD - Clean Simple Icon Style */}
        {gameState.gameStarted && !gameState.gameOver && !gameState.gameWon && (
          <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
            {/* Top HUD Bar */}
            <div className="flex items-center justify-between px-3 py-2 pointer-events-auto"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 80%, transparent 100%)',
              }}>
              {/* Left: Stats */}
              <div className="flex items-center gap-3">
                {/* Score - purple diamond icon */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L20 12L12 22L4 12L12 2Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="1.5"/>
                    <path d="M12 5L17 12L12 19L7 12L12 5Z" fill="#c084fc" opacity="0.5"/>
                  </svg>
                  <span className="text-white font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.score}</span>
                </div>
                {/* Coins */}
                {/* Coins */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <img src={assetUrl('coin.png')} alt="" className="w-7 h-7 object-contain" />
                  <span className="text-white font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.coins}</span>
                </div>
                {/* Stars - yellow five-pointed star, clickable for exchange */}
                <button
                  className={"flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer " + (starPulseStart && Date.now() - starPulseStart < 5000 ? "animate-pulse ring-2 ring-yellow-300" : "") + (gameState.stars >= 3 ? " hover:bg-white/25" : " pointer-events-none")}
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  onClick={() => { if (gameState.stars >= 3) setShowStarExchange(true); }}
                >
                  <img src={assetUrl('assets/star.png')} alt="" className="w-7 h-7 object-contain drop-shadow-sm" />
                  <span className="text-white font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.stars}</span>
                </button>
              </div>
              {/* Center: Lives */}
              <div className="flex items-center gap-1 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={"text-2xl transition-all " + (i < gameState.lives ? "" : "opacity-30")} style={{ color: i < gameState.lives ? '#ff4444' : '#888' }}>♥</span>
                ))}
              </div>
              {/* Right: Level + Settings */}
              <div className="flex items-center gap-2">
                {/* Level indicator */}
                <div className="flex items-center gap-1 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-white font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>关卡 {gameState.currentLevel + 1}/{LEVELS.length}</span>
                </div>
                <button
                  className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  onClick={() => setShowSettingsPanel(prev => !prev)}
                  title="设置"
                >
                  <div className="flex flex-col items-center justify-center gap-[4px]">
                    <div className="w-[6px] h-[6px] rounded-full bg-white"></div>
                    <div className="w-[6px] h-[6px] rounded-full bg-white"></div>
                    <div className="w-[6px] h-[6px] rounded-full bg-white"></div>
                  </div>
                </button>
              </div>
            </div>

            {/* Settings Panel Dropdown */}
            {showSettingsPanel && (
              <div className="absolute top-16 right-3 pointer-events-auto z-50" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                <div className="flex flex-col gap-2 p-3 rounded-2xl shadow-xl"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                  }}>
                  {/* Home button - flat house icon, no text */}
                  <button
                    className="w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-gray-100 active:scale-90 transition-all cursor-pointer"
                    onClick={() => { setShowSettingsPanel(false); setGameState(prev => ({ ...prev, gameStarted: false, gameOver: false, gameWon: false })); }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12L12 4L21 12" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 11V19C5 19.5523 5.44772 20 6 20H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V20H18C18.5523 20 19 19.5523 19 19V11" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {/* Sound toggle - no text */}
                  <button
                    className="w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-gray-100 active:scale-90 transition-all cursor-pointer"
                    onClick={toggleSound}
                  >
                    {isMuted ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="#999" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="18" y1="9" x2="22" y2="15" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="22" y1="9" x2="18" y2="15" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="#555" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15.5 8.5C16.5 9.5 17 10.7 17 12C17 13.3 16.5 14.5 15.5 15.5" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/>
                        <path d="M18 6C19.8 7.8 21 10 21 12C21 14 19.8 16.2 18 18" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                  {/* Restart - no text, no yellow background */}
                  <button
                    className="w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-gray-100 active:scale-90 transition-all cursor-pointer"
                    onClick={() => { setShowSettingsPanel(false); resetGame(gameState.currentLevel); }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.51472 21 7.26472 20.0196 5.63604 18.364" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M3 7V12H8" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Star Exchange Dialog - Clean Simple Style */}
        {showStarExchange && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[60]" style={{ animation: 'fadeIn 0.15s ease-out' }}>
            <div className="relative p-6 text-center max-w-xs rounded-2xl shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
              {/* Header */}
              <div className="mb-4">
                <span className="text-gray-800 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>星星兑换</span>
              </div>
              {/* Stars animation */}
              <div className="flex justify-center gap-3 mb-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="text-3xl animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>⭐</span>
                ))}
              </div>
              <p className="text-gray-700 font-bold text-base mb-1" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>兑换 1 枚生命</p>
              <p className="text-gray-400 text-sm mb-4" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>消耗 3 枚星星</p>
              {gameState.lives >= 3 ? (
                <p className="text-red-500 text-sm mb-3 py-1.5 px-3 rounded-lg bg-red-50 font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>生命已满</p>
              ) : null}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleStarExchange(true)}
                  disabled={gameState.lives >= 3}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    gameState.lives >= 3
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600 active:scale-95 shadow-md'
                  }`}
                  style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}
                >
                  确认
                </button>
                <button
                  onClick={() => handleStarExchange(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-95 transition-all cursor-pointer"
                  style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />
        {/* Death animation overlay canvas */}
        <canvas
          ref={deathCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`absolute inset-0 w-full h-full z-40 pointer-events-none ${gameState.gameOver && !deathAnimDone ? '' : 'hidden'}`}
        />

        {/* Level Transition Animation Overlay */}
        {levelTransition?.active && (
          <canvas
            ref={transitionCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 w-full h-full z-[60] pointer-events-none"
          />
        )}

        {/* Start Screen - Homepage */}
        {!gameState.gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden">
            <img src={assetUrl('assets/homepage.jpg')} className="absolute inset-0 w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 border-[4px] border-[#2f1b53] rounded-[14px] pointer-events-none" />

            {/* 浜戞湹 - CSS drawn */}
            <div className="absolute top-[5%] left-[8%] w-[16%] aspect-[2.5/1] opacity-90 animate-cloud-sway-1 z-10">
              <div className="relative w-full h-full">
                <div className="absolute bottom-0 left-[10%] w-[80%] h-[60%] bg-white rounded-full" />
                <div className="absolute bottom-[20%] left-[20%] w-[40%] h-[80%] bg-white rounded-full" />
                <div className="absolute bottom-[15%] left-[45%] w-[35%] h-[70%] bg-white rounded-full" />
              </div>
            </div>
            <div className="absolute top-[12%] right-[10%] w-[13%] aspect-[2.5/1] opacity-80 animate-cloud-sway-2 z-10">
              <div className="relative w-full h-full">
                <div className="absolute bottom-0 left-[10%] w-[80%] h-[60%] bg-white rounded-full" />
                <div className="absolute bottom-[20%] left-[25%] w-[35%] h-[75%] bg-white rounded-full" />
                <div className="absolute bottom-[15%] left-[50%] w-[30%] h-[65%] bg-white rounded-full" />
              </div>
            </div>
            <div className="absolute top-[18%] left-[35%] w-[10%] aspect-[2.5/1] opacity-70 animate-cloud-sway-1 z-10" style={{animationDelay: '-4s'}}>
              <div className="relative w-full h-full">
                <div className="absolute bottom-0 left-[10%] w-[80%] h-[60%] bg-white rounded-full" />
                <div className="absolute bottom-[20%] left-[30%] w-[35%] h-[70%] bg-white rounded-full" />
              </div>
            </div>

            <div className="absolute top-[3%] left-1/2 -translate-x-1/2 z-20 w-[64%] max-w-[920px]">
              <img
                src={assetUrl('assets/homepage-title.svg')}
                alt="小西嘻的奇幻冒险"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* 右侧叶子 */}
            <img
              src={assetUrl('homepage-leaves-1.png')}
              className="absolute z-30 animate-leaf-sway-right"
              style={{ right: '-5%', bottom: '-18%', width: '37%', transformOrigin: 'bottom right' }}
              alt=""
            />
            {/* 左侧叶子 */}
            <img
              src={assetUrl('homepage-leaves-2.png')}
              className="absolute z-30 animate-leaf-sway-left"
              style={{ left: '-5%', bottom: '-18%', width: '37%', transformOrigin: 'bottom left' }}
              alt=""
            />

            {/* 小西红柿 - 更大更靠近按键 */}
            <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-20">
              <img
                src={assetUrl('homepage-tomato.png')}
                className="w-[330px] md:w-[430px] animate-tomato-bounce"
                alt=""
              />
            </div>

            {/* 按钮区域 - 更大，更靠近 */}
            <div className="absolute bottom-[5.5%] left-1/2 -translate-x-1/2 z-40 flex items-center gap-4">
              {/* 选择关卡 */}
              <button
                onClick={() => setShowLevelSelect(true)}
                className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200"
              >
                <img src={assetUrl('homepage-button1.png')} className="w-[92px] h-[92px] md:w-[110px] md:h-[110px] object-contain drop-shadow-lg" alt="选择关卡" />
              </button>
              {/* 开始游戏 */}
              <button
                onClick={() => resetGame(0)}
                className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200"
              >
                <img src={assetUrl('homepage-button.png')} className="h-[88px] md:h-[108px] object-contain drop-shadow-lg" alt="开始游戏" />
              </button>
            </div>

            {/* Level Selection Overlay - Flat 3D Chunky Cartoon Style */}
            {showLevelSelect && (
              <div className="absolute inset-0 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-out', background: 'rgba(0,0,0,0.4)' }}>
                <div className="relative max-w-[92%] w-[420px] max-h-[88%] overflow-visible rounded-3xl"
                  style={{
                    background: 'linear-gradient(180deg, #fff8e1 0%, #ffecb3 100%)',
                    border: '5px solid #22c55e',
                    boxShadow: '0 8px 0 #16a34a, 0 12px 24px rgba(0,0,0,0.2)',
                    padding: '28px 20px 24px',
                    marginTop: '10px',
                  }}>
                  {/* Decorative corner circles */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-yellow-400 border-3 border-green-600" style={{ boxShadow: '0 3px 0 #ca8a04' }}></div>
                  <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-pink-400 border-3 border-green-600" style={{ boxShadow: '0 3px 0 #be185d' }}></div>
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-blue-400 border-3 border-green-600" style={{ boxShadow: '0 3px 0 #1d4ed8' }}></div>
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-purple-400 border-3 border-green-600" style={{ boxShadow: '0 3px 0 #7e22ce' }}></div>
                  {/* Header Banner */}
                  <div className="text-center mb-5 -mt-1">
                    <div className="inline-block px-8 py-2 rounded-full relative" style={{ background: '#ef4444', border: '4px solid #b91c1c', boxShadow: '0 5px 0 #991b1b' }}>
                      <span className="text-white font-bold text-lg tracking-wide" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif', textShadow: '1px 2px 0 rgba(0,0,0,0.3)' }}>选择关卡</span>
                    </div>
                  </div>
                  {/* Level grid - colorful 3D chunky buttons */}
                  <div className="grid grid-cols-5 gap-3 mb-5 px-1">
                    {LEVELS.map((_, idx) => {
                      const btnColors = [
                        { bg: '#4ade80', border: '#16a34a', shadow: '#15803d', text: '#fff' },
                        { bg: '#fb923c', border: '#ea580c', shadow: '#c2410c', text: '#fff' },
                        { bg: '#f472b6', border: '#db2777', shadow: '#be185d', text: '#fff' },
                        { bg: '#a78bfa', border: '#7c3aed', shadow: '#6d28d9', text: '#fff' },
                        { bg: '#60a5fa', border: '#2563eb', shadow: '#1d4ed8', text: '#fff' },
                        { bg: '#fbbf24', border: '#d97706', shadow: '#b45309', text: '#fff' },
                        { bg: '#f87171', border: '#dc2626', shadow: '#b91c1c', text: '#fff' },
                        { bg: '#22d3ee', border: '#0891b2', shadow: '#0e7490', text: '#fff' },
                        { bg: '#a3e635', border: '#65a30d', shadow: '#4d7c0f', text: '#fff' },
                        { bg: '#e879f9', border: '#c026d3', shadow: '#a21caf', text: '#fff' },
                      ];
                      const c = btnColors[idx % btnColors.length];
                      return (
                        <button
                          key={idx}
                          onClick={() => { setShowLevelSelect(false); resetGame(idx); }}
                          className="relative cursor-pointer hover:translate-y-[-2px] active:translate-y-[3px] transition-all duration-100 mx-auto"
                          style={{
                            width: '58px',
                            height: '58px',
                            borderRadius: '14px',
                            background: c.bg,
                            border: `4px solid ${c.border}`,
                            boxShadow: `0 5px 0 ${c.shadow}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span className="font-bold text-xl" style={{
                            color: c.text,
                            fontFamily: '"ZCOOL KuaiLe", sans-serif',
                            fontSize: '20px',
                            textShadow: '1px 2px 0 rgba(0,0,0,0.2)',
                          }}>{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Back button - chunky orange, no icon */}
                  <button
                    onClick={() => setShowLevelSelect(false)}
                    className="w-full cursor-pointer hover:translate-y-[-2px] active:translate-y-[2px] transition-all duration-100 flex items-center justify-center py-3 rounded-2xl"
                    style={{
                      background: '#fb923c',
                      border: '4px solid #ea580c',
                      boxShadow: '0 5px 0 #c2410c',
                    }}
                  >
                    <span className="text-white font-bold text-base" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif', textShadow: '1px 2px 0 rgba(0,0,0,0.2)' }}>返回</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Over - Rainy Cloud Style */}
        {gameState.gameOver && deathAnimDone && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-out', background: 'rgba(0,0,0,0.55)' }}>
            {/* Falling raindrop images (start from below b-clouds at 18%, original size 41x48) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
              {Array.from({length: 20}).map((_, i) => {
                const left = (i * 5.1 + 2) % 98;
                const delay = (i * 0.2) % 2;
                const duration = 1.5 + (i % 4) * 0.4;
                return (
                  <img key={i} src={assetUrl('assets/raindrop.png')} alt="raindrop"
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      top: '18%',
                      width: '41px',
                      height: '48px',
                      animation: `raindropFall ${duration}s ${delay}s linear infinite`,
                    }}
                  />
                );
              })}
            </div>
            {/* B-clouds covering the top */}
            <div className="absolute top-0 left-0 right-0 pointer-events-none z-[2]" style={{ height: '18%' }}>
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[-10%] left-[-5%]" style={{ width: '35%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[-5%] left-[18%]" style={{ width: '30%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[-8%] left-[40%]" style={{ width: '32%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[-3%] left-[60%]" style={{ width: '28%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[-10%] left-[78%]" style={{ width: '30%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[5%] left-[5%]" style={{ width: '25%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[3%] left-[30%]" style={{ width: '28%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[8%] left-[55%]" style={{ width: '26%', opacity: 1 }} />
              <img src={assetUrl('assets/b-cloud.png')} alt="cloud" className="absolute top-[6%] left-[80%]" style={{ width: '25%', opacity: 1 }} />
            </div>

            {/* Card content */}
            <div className="relative rounded-2xl px-10 py-8 flex flex-col items-center shadow-2xl z-10" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)' }}>
              {/* Header */}
              <div className="mb-4 text-center">
                <span className="text-red-500 font-bold text-xl" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>失败</span>
              </div>
              {/* Character */}
              <div className="relative mb-4">
                <div className="w-20 h-20 flex items-center justify-center">
                  <img src={assetUrl('little tomato.png')} alt="sad tomato" className="w-16 h-16 object-contain" style={{ filter: 'saturate(0.7) brightness(0.85)' }} />
                </div>
              </div>
              {/* Stats */}
              <div className="flex items-center gap-4 mb-5">
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-yellow-50">
                  <span className="text-yellow-600 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>得分</span>
                  <span className="text-yellow-700 text-lg font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.score}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-blue-50">
                  <span className="text-blue-600 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>关卡</span>
                  <span className="text-blue-700 text-lg font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.currentLevel + 1}</span>
                </div>
              </div>
              {/* Buttons */}
              <div className="flex gap-3">
                <button onClick={() => resetGame(gameState.currentLevel)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-md"
                  style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.51472 21 7.26472 20.0196 5.63604 18.364" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M3 7V12H8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  重试
                </button>
                <button onClick={() => setGameState(prev => ({ ...prev, gameStarted: false, gameOver: false }))}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-md"
                  style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12L12 4L21 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 11V19C5 19.5523 5.44772 20 6 20H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V20H18C18.5523 20 19 19.5523 19 19V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  主页
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Level Complete - Clean Simple Style */}
        {gameState.gameWon && gameState.currentLevel === LEVELS.length - 1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ animation: 'fadeIn 0.3s ease-out', background: 'radial-gradient(ellipse at center, rgba(15,5,40,0.92) 0%, rgba(0,0,0,0.97) 100%)' }}>
            {/* Firework bursts */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({length: 40}).map((_, i) => {
                const colors = ['#FFD700','#FF6B6B','#4ECDC4','#A78BFA','#F472B6','#60A5FA','#FBBF24','#34D399','#FB923C','#E879F9'];
                const color = colors[i % colors.length];
                const left = 5 + Math.random() * 90;
                const top = 5 + Math.random() * 70;
                const delay = Math.random() * 2;
                const size = 4 + Math.random() * 8;
                return (
                  <div key={i} className="absolute rounded-full" style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    animation: `fireworkBurst 2s ${delay}s ease-out infinite`,
                    boxShadow: `0 0 ${size * 2}px ${color}`,
                  }}></div>
                );
              })}
            </div>
            {/* Shooting stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({length: 6}).map((_, i) => (
                <div key={`star-${i}`} className="absolute" style={{
                  left: `${10 + i * 15}%`,
                  top: `${5 + i * 8}%`,
                  width: '3px',
                  height: '3px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px #fff, 0 0 12px #FFD700',
                  animation: `shootingStar 3s ${i * 0.5}s linear infinite`,
                }}></div>
              ))}
            </div>
            {/* Golden confetti rain */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({length: 30}).map((_, i) => {
                const colors = ['#FFD700','#FFA500','#FF6347','#FF69B4','#00CED1','#7B68EE','#32CD32'];
                const color = colors[i % colors.length];
                const left = 3 + (i * 3.3) % 94;
                const delay = i * 0.08;
                const width = 6 + Math.random() * 10;
                const height = 4 + Math.random() * 6;
                return (
                  <div key={`conf-${i}`} className="absolute" style={{
                    left: `${left}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: color,
                    top: '-15px',
                    animation: `confettiFall 4s ${delay}s linear infinite`,
                    opacity: 0.85,
                    borderRadius: '2px',
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}></div>
                );
              })}
            </div>
            {/* Victory card */}
            <div className="relative rounded-3xl px-10 py-8 flex flex-col items-center shadow-2xl border-2 border-yellow-400/50" style={{ background: 'linear-gradient(135deg, rgba(255,250,230,0.97) 0%, rgba(255,240,200,0.97) 100%)', backdropFilter: 'blur(12px)', animation: 'victoryCardPop 0.6s ease-out' }}>
              <div className="text-6xl mb-2" style={{ animation: 'trophyBounce 1.5s ease-in-out infinite', filter: 'drop-shadow(0 4px 12px rgba(255,215,0,0.5))' }}>🏆</div>
              <div className="mb-2 text-center">
                <span className="font-bold text-2xl bg-clip-text text-transparent" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif', backgroundImage: 'linear-gradient(135deg, #FFD700, #FF8C00, #FF4500)', WebkitBackgroundClip: 'text' }}>恭喜通关！</span>
              </div>
              <div className="mb-3">
                <img src={assetUrl('seed.png')} alt="" className="w-12 h-12 object-contain animate-bounce" />
              </div>
              <p className="text-amber-700 text-sm mb-4" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>你是真正的冒险英雄！</p>
              <div className="flex justify-center gap-2 mb-3">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className="text-3xl" style={{ animation: `starSpin 1s ${i * 0.2}s ease-out forwards`, opacity: 0 }}>⭐</span>
                ))}
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-yellow-100 border border-yellow-300">
                  <span className="text-yellow-700 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>总得分</span>
                  <span className="text-yellow-800 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.score}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-orange-100 border border-orange-300">
                  <span className="text-orange-700 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>金币</span>
                  <span className="text-orange-800 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.coins}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-purple-100 border border-purple-300">
                  <span className="text-purple-700 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>星星</span>
                  <span className="text-purple-800 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.stars}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-red-100 border border-red-300">
                  <span className="text-red-700 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>生命</span>
                  <span className="text-red-800 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.lives}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => startLevelTransition(gameState.currentLevel, 0)}
                  className="px-6 py-2.5 rounded-xl font-bold text-base text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
                  style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif', background: 'linear-gradient(135deg, #FFD700, #FF8C00)' }}>
                  再来一次
                </button>
                <button onClick={() => setGameState(prev => ({ ...prev, gameStarted: false, gameOver: false, gameWon: false }))}
                  className="px-6 py-2.5 rounded-xl font-bold text-base text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
                  style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  返回首页
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal level complete (not final level) */}
        {gameState.gameWon && gameState.currentLevel !== LEVELS.length - 1 && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({length: 20}).map((_, i) => {
                const colors = ['#4ade80','#f472b6','#60a5fa','#fbbf24','#a78bfa','#22d3ee','#fb923c','#a3e635'];
                const color = colors[i % colors.length];
                const left = 8 + (i * 4.5) % 84;
                const delay = i * 0.12;
                return (
                  <div key={i} className="absolute rounded-sm" style={{
                    left: `${left}%`,
                    width: '8px',
                    height: '8px',
                    backgroundColor: color,
                    top: '-10px',
                    animation: `confettiFall 3.5s ${delay}s linear forwards`,
                    opacity: 0.9,
                  }}></div>
                );
              })}
            </div>
            <div className="relative rounded-2xl px-10 py-8 flex flex-col items-center shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
              {/* Header */}
              {/* Header */}
              <div className="mb-3 text-center">
                <span className="text-green-600 font-bold text-xl" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>恭喜过关！</span>
              </div>
              <div className="mb-3">
                <img src={assetUrl('seed.png')} alt="" className="w-11 h-11 object-contain animate-bounce" />
              </div>
              {/* Stars */}
              <div className="flex justify-center gap-3 mb-2">
                {[0, 1, 2].map(i => (
                  <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>⭐</span>
                ))}
              </div>
              <p className="text-gray-500 text-sm mb-4" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>下一关：第{gameState.currentLevel + 2} 关</p>
              {/* Stats */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-yellow-50">
                  <span className="text-yellow-600 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>得分</span>
                  <span className="text-yellow-700 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.score}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-orange-50">
                  <span className="text-orange-600 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>金币</span>
                  <span className="text-orange-700 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.coins}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-purple-50">
                  <span className="text-purple-600 text-xs font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>星星</span>
                  <span className="text-purple-700 font-bold text-lg" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>{gameState.stars}</span>
                </div>
              </div>
              {/* Next button */}
              <button onClick={() => startLevelTransition(gameState.currentLevel, gameState.currentLevel + 1)}
                className="px-8 py-2.5 rounded-xl font-bold text-base bg-green-500 text-white hover:bg-green-600 active:scale-95 transition-all cursor-pointer shadow-md"
                style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                下一关
              </button>
          </div>
          </div>
        )}

        {/* Mobile Touch Controls - Clean Simple Style */}
        {gameState.gameStarted && !gameState.gameOver && !gameState.gameWon && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-end justify-between p-4 md:hidden">
            <div className="pointer-events-auto relative w-[140px] h-[140px]">
              <div className="absolute inset-[38px] rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
              <button className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.25)' }}
                onPointerDown={() => handlePointerDown('jump')} onPointerUp={() => handlePointerUp('jump')} onPointerLeave={() => handlePointerUp('jump')}>
                <span className="text-white text-lg font-bold">↑</span>
              </button>
              <button className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.25)' }}
                onPointerDown={() => handlePointerDown('down')} onPointerUp={() => handlePointerUp('down')} onPointerLeave={() => handlePointerUp('down')}>
                <span className="text-white text-lg font-bold">↓</span>
              </button>
              <button className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.25)' }}
                onPointerDown={() => handlePointerDown('left')} onPointerUp={() => handlePointerUp('left')} onPointerLeave={() => handlePointerUp('left')}>
                <span className="text-white text-lg font-bold">←</span>
              </button>
              <button className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.25)' }}
                onPointerDown={() => handlePointerDown('right')} onPointerUp={() => handlePointerUp('right')} onPointerLeave={() => handlePointerUp('right')}>
                <span className="text-white text-lg font-bold">→</span>
              </button>
            </div>
            <div className="pointer-events-auto flex gap-3 items-end">
              <button className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg"
                style={{ background: 'rgba(239,68,68,0.8)' }}
                onPointerDown={() => handlePointerDown('attack')} onPointerUp={() => handlePointerUp('attack')} onPointerLeave={() => handlePointerUp('attack')}>
                <span className="text-white font-bold text-sm" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>攻</span>
              </button>
              <button className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg"
                style={{ background: 'rgba(34,197,94,0.8)' }}
                onPointerDown={() => handlePointerDown('jump')} onPointerUp={() => handlePointerUp('jump')} onPointerLeave={() => handlePointerUp('jump')}>
                <span className="text-white font-bold text-sm" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>跳</span>
              </button>
            </div>
          </div>
        )}

      {/* Keyboard Hints - Clean Simple Style (hidden in fullscreen) */}
      {!isFullscreen && (
      <div className="mt-3 hidden md:flex gap-4 px-5 py-2.5 rounded-xl shadow-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
        <span className="flex items-center gap-1.5">
          <kbd className="border border-gray-300 rounded-md px-2 py-0.5 text-xs font-bold text-gray-600 bg-gray-50">←</kbd>
          <span className="text-gray-500 text-xs font-medium" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>移动</span>
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1.5">
          <kbd className="border border-gray-300 rounded-md px-2 py-0.5 text-xs font-bold text-gray-600 bg-gray-50">↑</kbd>
          <span className="text-gray-500 text-xs font-medium" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>跳跃</span>
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1.5">
          <kbd className="border border-gray-300 rounded-md px-2 py-0.5 text-xs font-bold text-gray-600 bg-gray-50">F</kbd>
          <span className="text-gray-500 text-xs font-medium" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>攻击</span>
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1.5">
          <kbd className="border border-gray-300 rounded-md px-2 py-0.5 text-xs font-bold text-gray-600 bg-gray-50">↓</kbd>
          <span className="text-gray-500 text-xs font-medium" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>下蹲</span>
        </span>
      </div>
      )}

      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-50 w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,0.4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
        title={isFullscreen ? '退出全屏' : '全屏'}
      >
        {isFullscreen ? (
          /* Shrink icon: 4 arrows pointing inward */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <polyline points="14 20 14 14 20 14"/>
            <polyline points="10 4 10 10 4 10"/>
          </svg>
        ) : (
          /* Expand icon: 4 arrows pointing outward from corners */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <polyline points="21 15 21 21 15 21"/>
            <polyline points="3 9 3 3 9 3"/>
          </svg>
        )}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes cloud-sway-1 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(30px); } }
        @keyframes cloud-sway-2 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-25px); } }
        @keyframes leaf-sway-right { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes leaf-sway-left { 0%, 100% { transform: rotate(3deg); } 50% { transform: rotate(-3deg); } }
        @keyframes tomato-bounce {
          0%, 80%, 100% { transform: scaleX(1) scaleY(1) translateY(0); }
          85% { transform: scaleX(1.05) scaleY(0.9) translateY(5px); }
          90% { transform: scaleX(0.95) scaleY(1.15) translateY(-20px); }
          95% { transform: scaleX(1.02) scaleY(0.95) translateY(3px); }
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(calc(100vh + 20px)) rotate(720deg); opacity: 0.4; }
        }
        @keyframes raindrop {
          0% { transform: translateY(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.7; }
          100% { transform: translateY(calc(100vh + 20px)); opacity: 0; }
        }
        @keyframes raindropFall {
          0% { transform: translateY(0px); opacity: 0.9; }
          100% { transform: translateY(calc(82vh + 48px)); opacity: 0.7; }
        }
        @keyframes floatCloud {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes fireworkBurst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.8; }
          70% { transform: scale(2); opacity: 0.4; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes shootingStar {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate(200px, 150px); opacity: 0; }
        }
        @keyframes victoryCardPop {
          0% { transform: scale(0.3) rotate(-5deg); opacity: 0; }
          60% { transform: scale(1.05) rotate(1deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(-3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-6px) rotate(3deg); }
        }
        @keyframes starSpin {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(20deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-cloud-sway-1 { animation: cloud-sway-1 12s ease-in-out infinite; }
        .animate-cloud-sway-2 { animation: cloud-sway-2 16s ease-in-out infinite; }
        .animate-leaf-sway-right { animation: leaf-sway-right 6s ease-in-out infinite; }
        .animate-leaf-sway-left { animation: leaf-sway-left 7s ease-in-out infinite; }
        .animate-tomato-bounce { animation: tomato-bounce 5s ease-in-out infinite; }
      `}</style>
    </div>
    </div>
  );
}


