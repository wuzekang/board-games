import type { LudoPlayerIndex } from './types';

export const GRID_COLS = 15;
export const GRID_ROWS = 15;

export const OUTER_TRACK_COORDS: readonly [number, number][] = [
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],[0,6],
  [1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],
];

export const HOME_STRETCH_COORDS: Record<LudoPlayerIndex, readonly [number, number][]> = {
  0: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  1: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  2: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  3: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
};

export const HANGAR_COORDS: Record<LudoPlayerIndex, readonly [number, number][]> = {
  0: [[10,10],[10,12],[12,10],[12,12]],
  1: [[2,10],[2,12],[4,10],[4,12]],
  2: [[2,2],[2,4],[4,2],[4,4]],
  3: [[10,2],[10,4],[12,2],[12,4]],
};

export const GOAL_COORDS: Record<LudoPlayerIndex, [number, number]> = {
  0: [8,7],
  1: [7,8],
  2: [6,7],
  3: [7,6],
};

export const HANGAR_ZONES: Record<LudoPlayerIndex, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }> = {
  0: { rowStart: 9, rowEnd: 14, colStart: 9, colEnd: 14 },
  1: { rowStart: 0, rowEnd: 5, colStart: 9, colEnd: 14 },
  2: { rowStart: 0, rowEnd: 5, colStart: 0, colEnd: 5 },
  3: { rowStart: 9, rowEnd: 14, colStart: 0, colEnd: 5 },
};
