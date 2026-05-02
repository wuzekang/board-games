import type { GoBoardState, GoMove } from '@board-games/shared/go';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialGoBoard,
  getAllValidGoMoves,
  isValidGoMove,
  applyGoMove,
  getGoGameResult,
} from '@board-games/shared/go';
import { createGoAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

export class GoStrategy implements GameStrategy<GoBoardState, GoMove> {
  private size: number;

  constructor(size: number = 19) {
    this.size = size;
  }

  createBoard(): GoBoardState {
    return createInitialGoBoard(this.size as 9 | 13 | 19);
  }

  isValidMove(board: GoBoardState, move: GoMove, color: PieceColor): boolean {
    return isValidGoMove(board, move, color);
  }

  applyMove(board: GoBoardState, move: GoMove): GoBoardState {
    return applyGoMove(board, move);
  }

  getAllValidMoves(board: GoBoardState, color: PieceColor): GoMove[] {
    return getAllValidGoMoves(board, color);
  }

  getValidMovesForPiece(_board: GoBoardState, _pieceId: string): GoMove[] {
    return [];
  }

  resolveWinner(board: GoBoardState, _currentColor: PieceColor): WinResult {
    const result = getGoGameResult(board);
    if (!result) return { winner: null, isDraw: false };
    if (result.isDraw) return { winner: null, isDraw: true, drawReason: result.drawReason };
    return { winner: result.winner!, isDraw: false };
  }

  buildMoveInsert(move: GoMove, _boardAfter: GoBoardState): MoveInsertPayload {
    return {
      fromPos: JSON.stringify({ row: -1, col: -1 }),
      toPos: JSON.stringify(move.to),
      moveType: move.isPass ? 'pass' : 'place',
      capturedPieces: '[]',
      capturePath: null,
      promoted: false,
      promotionTo: null,
    };
  }

  getAiMove(board: GoBoardState, aiColor: PieceColor, difficulty: string): GoMove | null {
    const ai = createGoAI(difficulty);
    return ai.getBestMove(board, aiColor);
  }
}
