import type { Position } from '../types/board';
import type { GoBoardSize } from './types';

export const STAR_POINTS: Record<GoBoardSize, Position[]> = {
  19: [
    { row: 3, col: 3 }, { row: 3, col: 9 }, { row: 3, col: 15 },
    { row: 9, col: 3 }, { row: 9, col: 9 }, { row: 9, col: 15 },
    { row: 15, col: 3 }, { row: 15, col: 9 }, { row: 15, col: 15 },
  ],
  13: [
    { row: 3, col: 3 }, { row: 3, col: 9 },
    { row: 6, col: 6 },
    { row: 9, col: 3 }, { row: 9, col: 9 },
  ],
  9: [
    { row: 2, col: 2 }, { row: 2, col: 6 },
    { row: 4, col: 4 },
    { row: 6, col: 2 }, { row: 6, col: 6 },
  ],
};
