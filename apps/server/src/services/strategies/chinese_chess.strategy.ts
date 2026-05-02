import type { ChineseChessBoardState, ChineseChessMove } from '@board-games/shared/chinese_chess';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialChineseChessBoard,
  getAllValidMoves as getAllChineseChessValidMoves,
  getValidMovesForPiece as getChineseChessValidMovesForPiece,
  isValidChineseChessMove,
  applyChineseChessMove,
  getChineseChessGameResult,
} from '@board-games/shared/chinese_chess';
import { createChineseChessAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

export class ChineseChessStrategy implements GameStrategy<ChineseChessBoardState, ChineseChessMove> {
  createBoard(): ChineseChessBoardState {
    return createInitialChineseChessBoard();
  }

  isValidMove(board: ChineseChessBoardState, move: ChineseChessMove, color: PieceColor): boolean {
    return isValidChineseChessMove(board, move, color);
  }

  applyMove(board: ChineseChessBoardState, move: ChineseChessMove): ChineseChessBoardState {
    return applyChineseChessMove(board, move);
  }

  getAllValidMoves(board: ChineseChessBoardState, color: PieceColor): ChineseChessMove[] {
    return getAllChineseChessValidMoves(board, color);
  }

  getValidMovesForPiece(board: ChineseChessBoardState, pieceId: string): ChineseChessMove[] {
    return getChineseChessValidMovesForPiece(board, pieceId);
  }

  resolveWinner(board: ChineseChessBoardState, currentColor: PieceColor): WinResult {
    const result = getChineseChessGameResult(board, currentColor);
    if (!result) return { winner: null, isDraw: false };
    if (result.isDraw) return { winner: null, isDraw: true, drawReason: result.reason };
    return { winner: result.winner!, isDraw: false };
  }

  buildMoveInsert(move: ChineseChessMove, _boardAfter: ChineseChessBoardState): MoveInsertPayload {
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

  getAiMove(board: ChineseChessBoardState, aiColor: PieceColor, difficulty: string): ChineseChessMove | null {
    const ai = createChineseChessAI(difficulty);
    const moves = this.getAllValidMoves(board, aiColor);
    return moves.length > 0 ? ai.getBestMove(board, aiColor) : null;
  }
}
