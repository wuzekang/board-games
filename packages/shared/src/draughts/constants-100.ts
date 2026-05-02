import { isDarkSquare, type Position } from '../types/board';

export function getDarkSquares100(): Position[] {
  const squares: Position[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (isDarkSquare(row, col)) squares.push({ row, col });
    }
  }
  return squares;
}

export function getInitialPieces100() {
  const pieces: { row: number; col: number; color: 'dark' | 'light' }[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (!isDarkSquare(row, col)) continue;
      if (row < 4) pieces.push({ row, col, color: 'dark' });
      else if (row >= 6) pieces.push({ row, col, color: 'light' });
    }
  }
  return pieces;
}
