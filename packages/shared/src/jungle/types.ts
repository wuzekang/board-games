import type { Position } from '../types/board';
import { PieceColor } from '../types/board';
export { PieceColor };

export enum JunglePieceType {
  ELEPHANT = 'elephant',
  LION = 'lion',
  TIGER = 'tiger',
  LEOPARD = 'leopard',
  DOG = 'dog',
  WOLF = 'wolf',
  CAT = 'cat',
  RAT = 'rat',
}

export const JUNGLE_PIECE_CHAR: Record<JunglePieceType, string> = {
  [JunglePieceType.ELEPHANT]: '象',
  [JunglePieceType.LION]: '狮',
  [JunglePieceType.TIGER]: '虎',
  [JunglePieceType.LEOPARD]: '豹',
  [JunglePieceType.DOG]: '狗',
  [JunglePieceType.WOLF]: '狼',
  [JunglePieceType.CAT]: '猫',
  [JunglePieceType.RAT]: '鼠',
};

export const JUNGLE_PIECE_RANK: Record<JunglePieceType, number> = {
  [JunglePieceType.ELEPHANT]: 8,
  [JunglePieceType.LION]: 7,
  [JunglePieceType.TIGER]: 6,
  [JunglePieceType.LEOPARD]: 5,
  [JunglePieceType.DOG]: 4,
  [JunglePieceType.WOLF]: 3,
  [JunglePieceType.CAT]: 2,
  [JunglePieceType.RAT]: 1,
};

export interface JunglePiece {
  id: string;
  type: JunglePieceType;
  color: PieceColor;
  position: Position;
}

export enum JungleMoveType {
  NORMAL = 'normal',
  CAPTURE = 'capture',
}

export interface JungleMove {
  pieceId: string;
  from: Position;
  to: Position;
  type: JungleMoveType;
  capturedPieceId: string | null;
}

export interface JungleBoardState {
  size: 7;
  rows: 9;
  pieces: JunglePiece[];
  nextColor: PieceColor;
  halfMoveClock: number;
}

export interface JungleGameResult {
  winner: PieceColor | null;
  isDraw: boolean;
  reason?: string;
}
