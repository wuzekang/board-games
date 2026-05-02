import type { LudoPlayerIndex } from './types';

export const GRID_COLS = 12;
export const GRID_ROWS = 16;

export const OUTER_TRACK_COORDS: readonly [number, number][] = [
  [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],
  [1,11],[2,11],[3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11],[13,11],[14,11],[15,11],
  [15,10],[15,9],[15,8],[15,7],[15,6],[15,5],[15,4],[15,3],[15,2],[15,1],[15,0],
  [14,0],[13,0],[12,0],[11,0],[10,0],[9,0],[8,0],[7,0],[6,0],[5,0],[4,0],[3,0],[2,0],[1,0],
];

export const HOME_STRETCH_COORDS: Record<LudoPlayerIndex, readonly [number, number][]> = {
  0: [[1,1],[2,1],[3,1],[4,1],[5,1],[6,1]],
  1: [[3,10],[3,9],[3,8],[3,7],[3,6],[3,5]],
  2: [[14,9],[13,9],[12,9],[11,9],[10,9],[9,9]],
  3: [[11,1],[11,2],[11,3],[11,4],[11,5],[11,6]],
};

export const HANGAR_COORDS: Record<LudoPlayerIndex, readonly [number, number][]> = {
  0: [[2,8],[2,10],[3,8],[3,10]],
  1: [[2,2],[2,4],[3,2],[3,4]],
  2: [[12,8],[12,10],[13,8],[13,10]],
  3: [[12,1],[12,3],[13,1],[13,3]],
};

export const GOAL_COORDS: Record<LudoPlayerIndex, [number, number]> = {
  0: [7,4],
  1: [7,6],
  2: [8,6],
  3: [8,4],
};

export const HANGAR_ZONES: Record<LudoPlayerIndex, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }> = {
  0: { rowStart: 1, rowEnd: 4, colStart: 7, colEnd: 11 },
  1: { rowStart: 1, rowEnd: 4, colStart: 1, colEnd: 5 },
  2: { rowStart: 11, rowEnd: 14, colStart: 7, colEnd: 11 },
  3: { rowStart: 11, rowEnd: 14, colStart: 0, colEnd: 4 },
};
