import type { ChessBoardState, ChessMove } from '@board-games/shared/chess';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialChessBoard,
  getAllValidMoves as getAllChessValidMoves,
  getValidMovesForPiece as getChessValidMovesForPiece,
  isValidChessMove,
  applyChessMove,
  getChessGameResult,
} from '@board-games/shared/chess';
import { createChessAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

export class ChessStrategy implements GameStrategy<ChessBoardState, ChessMove> {
  createBoard(): ChessBoardState {
    return createInitialChessBoard();
  }

  isValidMove(board: ChessBoardState, move: ChessMove, color: PieceColor): boolean {
    return isValidChessMove(board, move, color);
  }

  applyMove(board: ChessBoardState, move: ChessMove): ChessBoardState {
    return applyChessMove(board, move);
  }

  getAllValidMoves(board: ChessBoardState, color: PieceColor): ChessMove[] {
    return getAllChessValidMoves(board, color);
  }

  getValidMovesForPiece(board: ChessBoardState, pieceId: string): ChessMove[] {
    return getChessValidMovesForPiece(board, pieceId);
  }

  resolveWinner(board: ChessBoardState, currentColor: PieceColor): WinResult {
    const result = getChessGameResult(board, currentColor);
    if (!result) return { winner: null, isDraw: false };
    if (result.isDraw) return { winner: null, isDraw: true, drawReason: result.reason };
    return { winner: result.winner!, isDraw: false };
  }

  buildMoveInsert(move: ChessMove, boardAfter: ChessBoardState): MoveInsertPayload {
    return {
      fromPos: JSON.stringify(move.from),
      toPos: JSON.stringify(move.to),
      moveType: move.type,
      capturedPieces: JSON.stringify([move.capturedPieceId].filter(Boolean)),
      capturePath: null,
      promoted: false,
      promotionTo: move.promotionPiece,
    };
  }

  getAiMove(board: ChessBoardState, aiColor: PieceColor, difficulty: string): ChessMove | null {
    const ai = createChessAI(difficulty);
    const moves = this.getAllValidMoves(board, aiColor);
    return moves.length > 0 ? ai.getBestMove(board, aiColor) : null;
  }
}
