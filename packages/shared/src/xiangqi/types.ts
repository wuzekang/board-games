import type { Position } from '../types/board';
import { PieceColor } from '../types/board';

export { PieceColor };

export enum XiangqiPieceType {
  KING = 'king',
  ADVISOR = 'advisor',
  ELEPHANT = 'elephant',
  HORSE = 'horse',
  ROOK = 'rook',
  CANNON = 'cannon',
  PAWN = 'pawn',
}

export enum XiangqiMoveType {
  NORMAL = 'normal',
  CAPTURE = 'capture',
}

export interface XiangqiPiece {
  id: string;
  type: XiangqiPieceType;
  color: PieceColor;
  position: Position;
}

export interface XiangqiBoardState {
  size: 10;
  pieces: XiangqiPiece[];
  nextColor: PieceColor;
  halfMoveClock: number;
}

export interface XiangqiMove {
  pieceId: string;
  from: Position;
  to: Position;
  type: XiangqiMoveType;
  capturedPieceId: string | null;
}

export interface XiangqiGameResult {
  winner: PieceColor | null;
  isDraw: boolean;
  reason?: string;
}
