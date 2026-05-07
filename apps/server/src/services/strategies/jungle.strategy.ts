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
import { getNeuralMove } from '../ai/jungle/neural';
import { JungleAI } from '../ai/jungle/minimax';
import { getWasmMove, warmUpWasm } from '../ai/jungle/wasm-minimax';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

warmUpWasm();

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

  async getAiMove(board: JungleBoardState, aiColor: PieceColor, difficulty: string): Promise<JungleMove | null> {
    if (difficulty === 'hard') {
      const wasmMove = await getWasmMove(board, aiColor, difficulty);
      if (wasmMove !== null) return wasmMove;
      const ai = new JungleAI('hard');
      return ai.getBestMove(board, aiColor);
    }
    return getNeuralMove(board, aiColor, difficulty);
  }
}
