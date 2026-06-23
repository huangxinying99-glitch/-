/**
 * Spatial partitioning grid for efficient collision detection.
 * Divides the game world into cells and allows fast lookups of nearby entities.
 */

import { CANVAS_HEIGHT, TILE_SIZE } from './constants';

// Cell size should be larger than the biggest entity for efficiency
const CELL_SIZE = TILE_SIZE * 4; // 160px cells

export interface SpatialEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

export class SpatialGrid {
  private cells: Map<string, SpatialEntity[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number = CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: SpatialEntity): void {
    const minCX = Math.floor(entity.x / this.cellSize);
    const maxCX = Math.floor((entity.x + entity.width) / this.cellSize);
    const minCY = Math.floor(entity.y / this.cellSize);
    const maxCY = Math.floor((entity.y + entity.height) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = this.getKey(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  /**
   * Query all entities that could potentially overlap with the given bounds.
   * Returns a Set to avoid duplicates from multi-cell entities.
   */
  query(x: number, y: number, width: number, height: number): SpatialEntity[] {
    const minCX = Math.floor(x / this.cellSize);
    const maxCX = Math.floor((x + width) / this.cellSize);
    const minCY = Math.floor(y / this.cellSize);
    const maxCY = Math.floor((y + height) / this.cellSize);

    const seen = new Set<SpatialEntity>();
    const result: SpatialEntity[] = [];

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(this.getKey(cx, cy));
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const e = cell[i];
            if (!seen.has(e)) {
              seen.add(e);
              result.push(e);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Query nearby entities within an expanded search area (for broad-phase).
   */
  queryNearby(x: number, y: number, width: number, height: number, margin: number): SpatialEntity[] {
    return this.query(x - margin, y - margin, width + margin * 2, height + margin * 2);
  }
}

// Particle pool limits
export const MAX_FIREWORK_SPARKS = 120;
export const MAX_PROJECTILES = 40;
export const MAX_AURORA_PARTICLES = 50;

// Off-screen culling margin (pixels beyond visible area)
export const CULL_MARGIN = 200;

/**
 * Check if an entity is within the visible area (with margin).
 */
export function isOnScreen(entityX: number, entityWidth: number, cameraX: number, canvasWidth: number, margin: number = CULL_MARGIN): boolean {
  const screenX = entityX - cameraX;
  return screenX + entityWidth > -margin && screenX < canvasWidth + margin;
}

/**
 * Check if an entity is within the active physics area (wider than visible).
 * Entities far off-screen don't need physics updates.
 */
export function isInActiveZone(entityX: number, playerX: number, activeRange: number = 1200): boolean {
  return Math.abs(entityX - playerX) < activeRange;
}

/**
 * Simple AABB overlap test.
 */
export function aabbOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Reusable grid instance to avoid GC pressure
let _sharedGrid: SpatialGrid | null = null;
export function getSharedGrid(): SpatialGrid {
  if (!_sharedGrid) {
    _sharedGrid = new SpatialGrid();
  }
  return _sharedGrid;
}