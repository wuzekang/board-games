import type { Position } from '../types/board';
import { PieceColor } from '../types/board';

export { PieceColor };

export enum ChessPieceType {
  KING = 'king',
  QUEEN = 'queen',
  ROOK = 'rook',
  BISHOP = 'bishop',
  KNIGHT = 'knight',
  PAWN = 'pawn',
}

export interface ChessPiece {
  id: string;
  type: ChessPieceType;
  color: PieceColor;
  position: Position;
  hasMoved: boolean;
}

export interface ChessBoardState {
  size: 8;
  pieces: ChessPiece[];
  enPassantTarget: Position | null;
  halfMoveClock: number;
  fullMoveNumber: number;
}

export enum ChessMoveType {
  NORMAL = 'normal',
  CAPTURE = 'capture',
  CASTLING = 'castling',
  EN_PASSANT = 'en_passant',
  PROMOTION = 'promotion',
  PROMOTION_CAPTURE = 'promotion_capture',
}

export interface ChessMove {
  pieceId: string;
  from: Position;
  to: Position;
  type: ChessMoveType;
  capturedPieceId: string | null;
  promotionPiece: ChessPieceType | null;
  rookFrom: Position | null;
  rookTo: Position | null;
  rookId: string | null;
}

export interface ChessGameResult {
  winner: PieceColor | null;
  isDraw: boolean;
  reason?: string;
}
