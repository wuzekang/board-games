import type { PieceColor } from '@board-games/shared';
import {
  type JungleBoardState,
  type JungleMove,
  PieceColor as SharedPieceColor,
} from '@board-games/shared/jungle';
import {
  getAllJungleValidMoves,
  applyJungleMove,
  getJungleGameResult,
} from '@board-games/shared/jungle';
import { evaluateJungleBoard, moveOrderScore } from './heuristic';
import type { AIEngine } from '../interface';

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export class JungleAI implements AIEngine<JungleBoardState, JungleMove> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: JungleBoardState, aiColor: PieceColor): JungleMove | null {
    const moves = getAllJungleValidMoves(board, aiColor);
    if (moves.length === 0) return null;

    const depth = DEPTH_BY_DIFFICULTY[this.difficulty] ?? 2;
    const humanColor =
      aiColor === SharedPieceColor.DARK ? SharedPieceColor.LIGHT : SharedPieceColor.DARK;

    const sorted = [...moves].sort(
      (a, b) => moveOrderScore(b, board, aiColor) - moveOrderScore(a, board, aiColor),
    );

    let bestMove = sorted[0];
    let bestScore = -Infinity;

    for (const move of sorted) {
      const newBoard = applyJungleMove(board, move);
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
    board: JungleBoardState,
    depth: number,
    alpha: number,
    beta: number,
    isHumanTurn: boolean,
    aiColor: SharedPieceColor,
    humanColor: SharedPieceColor,
  ): number {
    const currentColor = isHumanTurn ? humanColor : aiColor;
    const result = getJungleGameResult(board, currentColor);
    if (result) {
      if (result.winner === aiColor) return 100000 + depth;
      if (result.winner === humanColor) return -100000 - depth;
      if (result.isDraw) return 0;
    }
    if (depth === 0) return evaluateJungleBoard(board, aiColor);

    const moves = getAllJungleValidMoves(board, currentColor);
    if (moves.length === 0) return isHumanTurn ? 100000 : -100000;

    const sorted = [...moves].sort(
      (a, b) => moveOrderScore(b, board, aiColor) - moveOrderScore(a, board, aiColor),
    );

    if (isHumanTurn) {
      let minEval = Infinity;
      for (const move of sorted) {
        const val = this.minimax(
          applyJungleMove(board, move),
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
          applyJungleMove(board, move),
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
