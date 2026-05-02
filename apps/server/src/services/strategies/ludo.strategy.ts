import type { LudoBoardState, AnyLudoMove, LudoPlayerIndex } from '@board-games/shared/ludo';
import { PieceColor } from '@board-games/shared';
import {
  createInitialLudoBoard,
  getAllValidLudoMoves,
  isValidLudoMove,
  applyLudoMove,
  getLudoGameResult,
} from '@board-games/shared/ludo';
import { createLudoAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

const HUMAN_PLAYER_INDEX: LudoPlayerIndex = 0;

export class LudoStrategy implements GameStrategy<LudoBoardState, AnyLudoMove> {
  createBoard(): LudoBoardState {
    return createInitialLudoBoard();
  }

  isValidMove(board: LudoBoardState, move: AnyLudoMove, _color: PieceColor): boolean {
    return isValidLudoMove(board, move, HUMAN_PLAYER_INDEX);
  }

  applyMove(board: LudoBoardState, move: AnyLudoMove): LudoBoardState {
    return applyLudoMove(board, move);
  }

  getAllValidMoves(board: LudoBoardState, _color: PieceColor): AnyLudoMove[] {
    if (board.diceValue === null) return [];
    return getAllValidLudoMoves(board, board.currentPlayerIndex, board.diceValue);
  }

  getValidMovesForPiece(board: LudoBoardState, _pieceId: string): AnyLudoMove[] {
    if (board.diceValue === null) return [];
    return getAllValidLudoMoves(board, board.currentPlayerIndex, board.diceValue);
  }

  resolveWinner(board: LudoBoardState, _currentColor: PieceColor): WinResult {
    const result = getLudoGameResult(board);
    if (!result) return { winner: null, isDraw: false };
    const winner =
      result.winner === HUMAN_PLAYER_INDEX
        ? PieceColor.DARK
        : PieceColor.LIGHT;
    return { winner, isDraw: false };
  }

  buildMoveInsert(move: AnyLudoMove, _boardAfter: LudoBoardState): MoveInsertPayload {
    const moveType =
      move.pieceId === ''
        ? 'pass'
        : move.reachedGoal
          ? 'goal'
          : move.capturedPieceId
            ? 'capture'
            : move.enteredHomeStretch
              ? 'enter_home'
              : 'move';
    return {
      fromPos: JSON.stringify({ row: move.fromTrackIndex, col: 0 }),
      toPos: JSON.stringify({ row: move.toTrackIndex, col: 0 }),
      moveType,
      capturedPieces: move.capturedPieceId
        ? JSON.stringify([move.capturedPieceId])
        : '[]',
      capturePath: null,
      promoted: false,
      promotionTo: null,
    };
  }

  getAiMove(board: LudoBoardState, _aiColor: PieceColor, difficulty: string): AnyLudoMove | null {
    const ai = createLudoAI(difficulty);
    return ai.getBestMove(board, PieceColor.LIGHT);
  }
}
