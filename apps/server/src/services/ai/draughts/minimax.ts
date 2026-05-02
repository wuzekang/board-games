import { getAllValidMoves, applyMove, checkWin } from '@board-games/shared/draughts';
import type { BoardState, Move } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import { evaluateBoard } from './heuristic';
import type { AIEngine } from '../interface';

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

export class DraughtsAI implements AIEngine<BoardState, Move> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: BoardState, aiColor: PieceColor): Move | null {
    const moves = getAllValidMoves(board, aiColor);
    if (moves.length === 0) return null;

    const depth = DEPTH_BY_DIFFICULTY[this.difficulty] ?? 3;
    const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

    const sorted = [...moves].sort((a, b) => {
      const aScore = moveQuickScore(a);
      const bScore = moveQuickScore(b);
      return bScore - aScore;
    });

    let bestMove = sorted[0];
    let bestScore = -Infinity;

    for (const move of sorted) {
      const newBoard = applyMove(board, move);
      const score = this.minimax(newBoard, depth - 1, -Infinity, Infinity, true, aiColor, humanColor);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    board: BoardState,
    depth: number,
    alpha: number,
    beta: number,
    isHumanTurn: boolean,
    aiColor: PieceColor,
    humanColor: PieceColor,
  ): number {
    const winner = checkWin(board);
    if (winner === aiColor) return 10000 + depth;
    if (winner === humanColor) return -10000 - depth;
    if (depth === 0) return evaluateBoard(board, aiColor);

    const currentColor = isHumanTurn ? humanColor : aiColor;
    const moves = getAllValidMoves(board, currentColor);
    if (moves.length === 0) return isHumanTurn ? 10000 : -10000;

    const sorted = [...moves].sort((a, b) => {
      const aScore = moveQuickScore(a);
      const bScore = moveQuickScore(b);
      return bScore - aScore;
    });

    if (isHumanTurn) {
      let minEval = Infinity;
      for (const move of sorted) {
        const val = this.minimax(applyMove(board, move), depth - 1, alpha, beta, false, aiColor, humanColor);
        minEval = Math.min(minEval, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return minEval;
    } else {
      let maxEval = -Infinity;
      for (const move of sorted) {
        const val = this.minimax(applyMove(board, move), depth - 1, alpha, beta, true, aiColor, humanColor);
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    }
  }
}

function moveQuickScore(move: Move): number {
  let score = 0;
  score += move.capturedPieceIds.length * 100;
  if (move.promoted) score += 50;
  if (move.type === 'chain_capture') score += 20;
  return score;
}
