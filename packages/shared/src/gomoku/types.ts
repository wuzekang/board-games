import type { Position } from '../types/board';
import { PieceColor } from '../types/board';

export { PieceColor };

export interface GomokuStone {
  id: string;
  color: PieceColor;
  position: Position;
}

export interface GomokuBoardState {
  size: 15;
  stones: GomokuStone[];
  nextColor: PieceColor;
}

export interface GomokuMove {
  stoneId: string;
  to: Position;
  color: PieceColor;
}

export interface GomokuGameResult {
  winner: PieceColor | null;
  isDraw: boolean;
  winningLine?: Position[];
}
