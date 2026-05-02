import type { PieceColor } from '@board-games/shared';
import {
  type ChessBoardState,
  type ChessMove,
  ChessPieceType,
  ChessMoveType,
  PieceColor as SharedPieceColor,
} from '@board-games/shared/chess';
import {
  getAllValidMoves,
  applyChessMove,
  getChessGameResult,
} from '@board-games/shared/chess';
import { evaluateChessBoard } from './heuristic';
import type { AIEngine } from '../interface';

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 1,
  medium: 3,
  hard: 4,
};

export class ChessAI implements AIEngine<ChessBoardState, ChessMove> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: ChessBoardState, aiColor: PieceColor): ChessMove | null {
    const moves = getAllValidMoves(board, aiColor);
    if (moves.length === 0) return null;

    const depth = DEPTH_BY_DIFFICULTY[this.difficulty] ?? 3;
    const humanColor =
      aiColor === SharedPieceColor.DARK
        ? SharedPieceColor.LIGHT
        : SharedPieceColor.DARK;

    const sorted = [...moves].sort((a, b) => {
      return moveOrderScore(b) - moveOrderScore(a);
    });

    let bestMove = sorted[0];
    let bestScore = -Infinity;

    for (const move of sorted) {
      const newBoard = applyChessMove(board, move);
      const score = this.minimax(
        newBoard,
        depth - 1,
        -Infinity,
        Infinity,
        true,
        aiColor,
        humanColor,
      );
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    board: ChessBoardState,
    depth: number,
    alpha: number,
    beta: number,
    isHumanTurn: boolean,
    aiColor: SharedPieceColor,
    humanColor: SharedPieceColor,
  ): number {
    const currentColor = isHumanTurn ? humanColor : aiColor;
    const result = getChessGameResult(board, currentColor);
    if (result) {
      if (result.winner === aiColor) return 100000 + depth;
      if (result.winner === humanColor) return -100000 - depth;
      if (result.isDraw) return 0;
    }
    if (depth === 0) return evaluateChessBoard(board, aiColor);

    const moves = getAllValidMoves(board, currentColor);
    if (moves.length === 0) return isHumanTurn ? 100000 : -100000;

    const sorted = [...moves].sort((a, b) => {
      return moveOrderScore(b) - moveOrderScore(a);
    });

    if (isHumanTurn) {
      let minEval = Infinity;
      for (const move of sorted) {
        const val = this.minimax(
          applyChessMove(board, move),
          depth - 1,
          alpha,
          beta,
          false,
          aiColor,
          humanColor,
        );
        minEval = Math.min(minEval, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return minEval;
    } else {
      let maxEval = -Infinity;
      for (const move of sorted) {
        const val = this.minimax(
          applyChessMove(board, move),
          depth - 1,
          alpha,
          beta,
          true,
          aiColor,
          humanColor,
        );
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    }
  }
}

function moveOrderScore(move: ChessMove): number {
  let score = 0;
  if (
    move.type === ChessMoveType.CAPTURE ||
    move.type === ChessMoveType.PROMOTION_CAPTURE
  ) {
    score += 1000;
  }
  if (
    move.type === ChessMoveType.PROMOTION ||
    move.type === ChessMoveType.PROMOTION_CAPTURE
  ) {
    score += 500;
  }
  if (move.type === ChessMoveType.CASTLING) {
    score += 50;
  }
  return score;
}
