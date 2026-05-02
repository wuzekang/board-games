import type { Position } from '../types/board';
import { PieceColor } from '../types/board';

export { PieceColor };

export type GoBoardSize = 9 | 13 | 19;

export interface GoStone {
  id: string;
  color: PieceColor;
  position: Position;
}

export interface GoBoardState {
  size: GoBoardSize;
  stones: GoStone[];
  nextColor: PieceColor;
  koPoint: Position | null;
  consecutivePasses: number;
  capturedByDark: number;
  capturedByLight: number;
}

export interface GoPlaceMove {
  stoneId: string;
  to: Position;
  color: PieceColor;
  isPass: false;
}

export interface GoPassMove {
  stoneId: string;
  to: Position;
  color: PieceColor;
  isPass: true;
}

export type GoMove = GoPlaceMove | GoPassMove;

export interface GoScore {
  darkStones: number;
  lightStones: number;
  darkTerritory: number;
  lightTerritory: number;
  komi: number;
  darkTotal: number;
  lightTotal: number;
}

export interface GoGameResult {
  winner: PieceColor | null;
  isDraw: boolean;
  score: GoScore;
  drawReason?: string;
}
