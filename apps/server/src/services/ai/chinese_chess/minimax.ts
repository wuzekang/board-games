import type { PieceColor } from '@board-games/shared';
import {
  type ChineseChessBoardState,
  type ChineseChessMove,
  ChineseChessMoveType,
  PieceColor as SharedPieceColor,
} from '@board-games/shared/chinese_chess';
import {
  getAllValidMoves,
  applyChineseChessMove,
  getChineseChessGameResult,
} from '@board-games/shared/chinese_chess';
import { evaluateChineseChessBoard } from './heuristic';
import type { AIEngine } from '../interface';

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export class ChineseChessAI implements AIEngine<ChineseChessBoardState, ChineseChessMove> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: ChineseChessBoardState, aiColor: PieceColor): ChineseChessMove | null {
    const moves = getAllValidMoves(board, aiColor);
    if (moves.length === 0) return null;

    const depth = DEPTH_BY_DIFFICULTY[this.difficulty] ?? 2;
    const humanColor =
      aiColor === SharedPieceColor.DARK ? SharedPieceColor.LIGHT : SharedPieceColor.DARK;

    const sorted = [...moves].sort((a, b) => moveOrderScore(b) - moveOrderScore(a));

    let bestMove = sorted[0];
    let bestScore = -Infinity;

    for (const move of sorted) {
      const newBoard = applyChineseChessMove(board, move);
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
    board: ChineseChessBoardState,
    depth: number,
    alpha: number,
    beta: number,
    isHumanTurn: boolean,
    aiColor: SharedPieceColor,
    humanColor: SharedPieceColor,
  ): number {
    const currentColor = isHumanTurn ? humanColor : aiColor;
    const result = getChineseChessGameResult(board, currentColor);
    if (result) {
      if (result.winner === aiColor) return 100000 + depth;
      if (result.winner === humanColor) return -100000 - depth;
      if (result.isDraw) return 0;
    }
    if (depth === 0) return evaluateChineseChessBoard(board, aiColor);

    const moves = getAllValidMoves(board, currentColor);
    if (moves.length === 0) return isHumanTurn ? 100000 : -100000;

    const sorted = [...moves].sort((a, b) => moveOrderScore(b) - moveOrderScore(a));

    if (isHumanTurn) {
      let minEval = Infinity;
      for (const move of sorted) {
        const val = this.minimax(
          applyChineseChessMove(board, move),
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
          applyChineseChessMove(board, move),
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

function moveOrderScore(move: ChineseChessMove): number {
  if (move.type === ChineseChessMoveType.CAPTURE) return 1000;
  return 0;
}
