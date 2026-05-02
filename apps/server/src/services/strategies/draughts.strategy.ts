import type { BoardState, Move } from '@board-games/shared';
import type { PieceColor } from '@board-games/shared';
import {
  createInitialBoard,
  getAllValidMoves,
  getValidMovesForPiece,
  isValidMove,
  applyMove,
  checkWin,
} from '@board-games/shared/draughts';
import { createDraughtsAI } from '../ai/factory';
import type { GameStrategy, WinResult, MoveInsertPayload } from './interface';

function boardToJson(board: BoardState): string {
  return JSON.stringify(board);
}

function jsonToBoard(json: string): BoardState {
  return JSON.parse(json);
}

export class DraughtsStrategy implements GameStrategy<BoardState, Move> {
  private size: number;

  constructor(size: number) {
    this.size = size;
  }

  createBoard(opts?: { boardSize?: number }): BoardState {
    const size = (opts?.boardSize ?? this.size) as 10 | 8;
    return createInitialBoard(size);
  }

  isValidMove(board: BoardState, move: Move, color: PieceColor): boolean {
    return isValidMove(board, move, color);
  }

  applyMove(board: BoardState, move: Move): BoardState {
    return applyMove(board, move);
  }

  getAllValidMoves(board: BoardState, color: PieceColor): Move[] {
    return getAllValidMoves(board, color);
  }

  getValidMovesForPiece(board: BoardState, pieceId: string): Move[] {
    return getValidMovesForPiece(board, pieceId);
  }

  resolveWinner(board: BoardState, _currentColor: PieceColor): WinResult {
    const winner = checkWin(board);
    return { winner, isDraw: false };
  }

  buildMoveInsert(move: Move, boardAfter: BoardState): MoveInsertPayload {
    return {
      fromPos: JSON.stringify(move.from),
      toPos: JSON.stringify(move.to),
      moveType: move.type,
      capturedPieces: JSON.stringify(move.capturedPieceIds),
      capturePath: move.path.length > 2 ? JSON.stringify(move.path) : null,
      promoted: move.promoted,
      promotionTo: null,
    };
  }

  getAiMove(board: BoardState, aiColor: PieceColor, difficulty: string): Move | null {
    const ai = createDraughtsAI(difficulty);
    return ai.getBestMove(board, aiColor);
  }
}
