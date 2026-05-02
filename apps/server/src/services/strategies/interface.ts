import type { PieceColor } from '@board-games/shared';

export interface WinResult {
  winner: PieceColor | null;
  isDraw: boolean;
  drawReason?: string;
}

export interface MoveInsertPayload {
  fromPos: string;
  toPos: string;
  moveType: string;
  capturedPieces: string;
  capturePath: string | null;
  promoted: boolean;
  promotionTo: string | null;
}

export interface GameStrategy<B, M> {
  createBoard(opts?: { boardSize?: number }): B;
  isValidMove(board: B, move: M, color: PieceColor): boolean;
  applyMove(board: B, move: M): B;
  getAllValidMoves(board: B, color: PieceColor): M[];
  getValidMovesForPiece(board: B, pieceId: string): M[];
  resolveWinner(board: B, currentColor: PieceColor): WinResult;
  buildMoveInsert(move: M, boardAfter: B): MoveInsertPayload;
  getAiMove(board: B, aiColor: PieceColor, difficulty: string): M | null;
}
