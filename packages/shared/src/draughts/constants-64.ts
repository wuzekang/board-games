import { isDarkSquare } from '../types/board';

export function getInitialPieces64() {
  const pieces: { row: number; col: number; color: 'dark' | 'light' }[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!isDarkSquare(row, col)) continue;
      if (row < 3) pieces.push({ row, col, color: 'dark' });
      else if (row >= 5) pieces.push({ row, col, color: 'light' });
    }
  }
  return pieces;
}
