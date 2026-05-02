import type { Position } from '../types/board';
import { PieceColor } from '../types/board';

export { PieceColor };

export enum ChineseChessPieceType {
  KING = 'king',
  ADVISOR = 'advisor',
  ELEPHANT = 'elephant',
  HORSE = 'horse',
  ROOK = 'rook',
  CANNON = 'cannon',
  PAWN = 'pawn',
}

export enum ChineseChessMoveType {
  NORMAL = 'normal',
  CAPTURE = 'capture',
}

export interface ChineseChessPiece {
  id: string;
  type: ChineseChessPieceType;
  color: PieceColor;
  position: Position;
}

export interface ChineseChessBoardState {
  size: 10;
  pieces: ChineseChessPiece[];
  nextColor: PieceColor;
  halfMoveClock: number;
}

export interface ChineseChessMove {
  pieceId: string;
  from: Position;
  to: Position;
  type: ChineseChessMoveType;
  capturedPieceId: string | null;
}

export interface ChineseChessGameResult {
  winner: PieceColor | null;
  isDraw: boolean;
  reason?: string;
}
