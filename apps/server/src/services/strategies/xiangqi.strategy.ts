import type { XiangqiBoardState, XiangqiMove } from '@board-games/shared/xiangqi';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialXiangqiBoard,
  getAllXiangqiValidMoves,
  getXiangqiValidMovesForPiece,
  isValidXiangqiMove,
  applyXiangqiMove,
  getXiangqiGameResult,
} from '@board-games/shared/xiangqi';
import { createXiangqiAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

export class XiangqiStrategy implements GameStrategy<XiangqiBoardState, XiangqiMove> {
  createBoard(): XiangqiBoardState {
    return createInitialXiangqiBoard();
  }

  isValidMove(board: XiangqiBoardState, move: XiangqiMove, color: PieceColor): boolean {
    return isValidXiangqiMove(board, move, color);
  }

  applyMove(board: XiangqiBoardState, move: XiangqiMove): XiangqiBoardState {
    return applyXiangqiMove(board, move);
  }

  getAllValidMoves(board: XiangqiBoardState, color: PieceColor): XiangqiMove[] {
    return getAllXiangqiValidMoves(board, color);
  }

  getValidMovesForPiece(board: XiangqiBoardState, pieceId: string): XiangqiMove[] {
    return getXiangqiValidMovesForPiece(board, pieceId);
  }

  resolveWinner(board: XiangqiBoardState, currentColor: PieceColor): WinResult {
    const result = getXiangqiGameResult(board, currentColor);
    if (!result) return { winner: null, isDraw: false };
    if (result.isDraw) return { winner: null, isDraw: true, drawReason: result.reason };
    return { winner: result.winner!, isDraw: false };
  }

  buildMoveInsert(move: XiangqiMove, _boardAfter: XiangqiBoardState): MoveInsertPayload {
    return {
      fromPos: JSON.stringify(move.from),
      toPos: JSON.stringify(move.to),
      moveType: move.type,
      capturedPieces: JSON.stringify([move.capturedPieceId].filter(Boolean)),
      capturePath: null,
      promoted: false,
      promotionTo: null,
    };
  }

  getAiMove(board: XiangqiBoardState, aiColor: PieceColor, difficulty: string): XiangqiMove | null {
    const ai = createXiangqiAI(difficulty);
    const moves = this.getAllValidMoves(board, aiColor);
    return moves.length > 0 ? ai.getBestMove(board, aiColor) : null;
  }
}
