import type { JungleBoardState, JungleMove } from '@board-games/shared/jungle';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialJungleBoard,
  getAllJungleValidMoves,
  getJungleValidMovesForPiece,
  isValidJungleMove,
  applyJungleMove,
  getJungleGameResult,
} from '@board-games/shared/jungle';
import { createJungleAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

export class JungleStrategy implements GameStrategy<JungleBoardState, JungleMove> {
  createBoard(): JungleBoardState {
    return createInitialJungleBoard();
  }

  isValidMove(board: JungleBoardState, move: JungleMove, color: PieceColor): boolean {
    return isValidJungleMove(board, move, color);
  }

  applyMove(board: JungleBoardState, move: JungleMove): JungleBoardState {
    return applyJungleMove(board, move);
  }

  getAllValidMoves(board: JungleBoardState, color: PieceColor): JungleMove[] {
    return getAllJungleValidMoves(board, color);
  }

  getValidMovesForPiece(board: JungleBoardState, pieceId: string): JungleMove[] {
    return getJungleValidMovesForPiece(board, pieceId);
  }

  resolveWinner(board: JungleBoardState, currentColor: PieceColor): WinResult {
    const result = getJungleGameResult(board, currentColor);
    if (!result) return { winner: null, isDraw: false };
    if (result.isDraw) return { winner: null, isDraw: true, drawReason: result.reason };
    return { winner: result.winner!, isDraw: false };
  }

  buildMoveInsert(move: JungleMove, _boardAfter: JungleBoardState): MoveInsertPayload {
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

  getAiMove(board: JungleBoardState, aiColor: PieceColor, difficulty: string): JungleMove | null {
    const ai = createJungleAI(difficulty);
    return ai.getBestMove(board, aiColor);
  }
}
