import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialGomokuBoard,
  getAllValidMoves as getAllGomokuValidMoves,
  isValidGomokuMove,
  applyGomokuMove,
  getGomokuGameResult,
} from '@board-games/shared/gomoku';
import { createGomokuAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

export class GomokuStrategy implements GameStrategy<GomokuBoardState, GomokuMove> {
  createBoard(): GomokuBoardState {
    return createInitialGomokuBoard();
  }

  isValidMove(board: GomokuBoardState, move: GomokuMove, color: PieceColor): boolean {
    return isValidGomokuMove(board, move, color);
  }

  applyMove(board: GomokuBoardState, move: GomokuMove): GomokuBoardState {
    return applyGomokuMove(board, move);
  }

  getAllValidMoves(board: GomokuBoardState, color: PieceColor): GomokuMove[] {
    return getAllGomokuValidMoves(board, color);
  }

  getValidMovesForPiece(_board: GomokuBoardState, _pieceId: string): GomokuMove[] {
    return [];
  }

  resolveWinner(board: GomokuBoardState, _currentColor: PieceColor): WinResult {
    const result = getGomokuGameResult(board);
    if (!result) return { winner: null, isDraw: false };
    if (result.isDraw) return { winner: null, isDraw: true, drawReason: 'board_full' };
    return { winner: result.winner!, isDraw: false };
  }

  buildMoveInsert(move: GomokuMove, _boardAfter: GomokuBoardState): MoveInsertPayload {
    return {
      fromPos: JSON.stringify({ row: -1, col: -1 }),
      toPos: JSON.stringify(move.to),
      moveType: 'place',
      capturedPieces: '[]',
      capturePath: null,
      promoted: false,
      promotionTo: null,
    };
  }

  getAiMove(board: GomokuBoardState, aiColor: PieceColor, difficulty: string): GomokuMove | null {
    const ai = createGomokuAI(difficulty);
    return ai.getBestMove(board, aiColor);
  }
}
