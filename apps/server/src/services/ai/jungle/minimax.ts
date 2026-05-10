import type { PieceColor } from '@board-games/shared';
import {
  type JungleBoardState,
  type JungleMove,
  type Position,
  PieceColor as SharedPieceColor,
  JungleMoveType,
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

const MAX_QUIESCENCE_DEPTH = 4;

function canBeCaptured(board: JungleBoardState, piecePos: Position, pieceColor: PieceColor): boolean {
  const opp = pieceColor === SharedPieceColor.DARK ? SharedPieceColor.LIGHT : SharedPieceColor.DARK;
  const oppMoves = getAllJungleValidMoves(board, opp);
  return oppMoves.some(
    (m) => m.type === JungleMoveType.CAPTURE && m.to.row === piecePos.row && m.to.col === piecePos.col,
  );
}

function quiescence(
  board: JungleBoardState,
  isHumanTurn: boolean,
  alpha: number,
  beta: number,
  aiColor: SharedPieceColor,
  humanColor: SharedPieceColor,
  qDepth: number,
): number {
  const standPat = evaluateJungleBoard(board, aiColor);

  if (qDepth === 0) return standPat;

  const currentColor = isHumanTurn ? humanColor : aiColor;
  const moves = getAllJungleValidMoves(board, currentColor);

  const tactical: JungleMove[] = moves.filter((m) => m.type === JungleMoveType.CAPTURE);

  for (const piece of board.pieces) {
    if (piece.color === currentColor && canBeCaptured(board, piece.position, piece.color)) {
      for (const m of moves) {
        if (
          m.pieceId === piece.id &&
          m.type !== JungleMoveType.CAPTURE &&
          !tactical.some((t) => t.pieceId === m.pieceId && t.to.row === m.to.row && t.to.col === m.to.col)
        ) {
          tactical.push(m);
        }
      }
    }
  }

  if (tactical.length === 0) return standPat;

  const oppDen = currentColor === SharedPieceColor.DARK
    ? { row: 0, col: 3 }
    : { row: 8, col: 3 };
  for (const m of tactical) {
    if (m.to.row === oppDen.row && m.to.col === oppDen.col) {
      return isHumanTurn ? -99999 : 99999;
    }
  }

  tactical.sort((a, b) => {
    const sa = a.type === JungleMoveType.CAPTURE ? 1 : 0;
    const sb = b.type === JungleMoveType.CAPTURE ? 1 : 0;
    return sb - sa;
  });

  if (isHumanTurn) {
    let best = Math.min(standPat, beta);
    for (const m of tactical) {
      const val = quiescence(
        applyJungleMove(board, m),
        !isHumanTurn,
        alpha,
        best,
        aiColor,
        humanColor,
        qDepth - 1,
      );
      best = Math.min(best, val);
      if (best <= alpha) break;
    }
    return best;
  } else {
    let best = Math.max(standPat, alpha);
    for (const m of tactical) {
      const val = quiescence(
        applyJungleMove(board, m),
        !isHumanTurn,
        best,
        beta,
        aiColor,
        humanColor,
        qDepth - 1,
      );
      best = Math.max(best, val);
      if (beta <= best) break;
    }
    return best;
  }
}

export class JungleAI implements AIEngine<JungleBoardState, JungleMove> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: JungleBoardState, aiColor: PieceColor): JungleMove | null {
    const moves = getAllJungleValidMoves(board, aiColor);
    if (moves.length === 0) return null;

    const maxDepth = DEPTH_BY_DIFFICULTY[this.difficulty] ?? 2;
    const humanColor =
      aiColor === SharedPieceColor.DARK ? SharedPieceColor.LIGHT : SharedPieceColor.DARK;

    const oppDen = aiColor === SharedPieceColor.DARK
      ? { row: 0, col: 3 }
      : { row: 8, col: 3 };
    const instantWin = moves.find((m) => m.to.row === oppDen.row && m.to.col === oppDen.col);
    if (instantWin) return instantWin;

    let bestMove = moves[0];

    for (let d = 1; d <= maxDepth; d++) {
      const sorted = [...moves].sort(
        (a, b) => moveOrderScore(b, board, aiColor) - moveOrderScore(a, board, aiColor),
      );

      let bestScore = -Infinity;

      for (let i = 0; i < sorted.length; i++) {
        const move = sorted[i];
        const newBoard = applyJungleMove(board, move);
        const score = i === 0
          ? this.minimax(newBoard, d - 1, -Infinity, Infinity, true, aiColor, humanColor)
          : this.pvsProbe(newBoard, d - 1, -Infinity, bestScore, true, aiColor, humanColor, bestScore);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  private pvsProbe(
    board: JungleBoardState,
    depth: number,
    alpha: number,
    beta: number,
    isHumanTurn: boolean,
    aiColor: SharedPieceColor,
    humanColor: SharedPieceColor,
    currentBest: number,
  ): number {
    if (isHumanTurn) {
      const v = this.minimax(board, depth, beta - 1, beta, isHumanTurn, aiColor, humanColor);
      if (v < beta && v > alpha) {
        return this.minimax(board, depth, alpha, v, isHumanTurn, aiColor, humanColor);
      }
      return v;
    } else {
      const v = this.minimax(board, depth, alpha, alpha + 1, isHumanTurn, aiColor, humanColor);
      if (v > alpha && v < beta) {
        return this.minimax(board, depth, v, beta, isHumanTurn, aiColor, humanColor);
      }
      return v;
    }
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
    if (depth === 0) {
      return quiescence(board, isHumanTurn, alpha, beta, aiColor, humanColor, MAX_QUIESCENCE_DEPTH);
    }

    const moves = getAllJungleValidMoves(board, currentColor);
    if (moves.length === 0) return isHumanTurn ? 100000 : -100000;

    const sorted = [...moves].sort(
      (a, b) => moveOrderScore(b, board, aiColor) - moveOrderScore(a, board, aiColor),
    );

    if (isHumanTurn) {
      let minEval = Infinity;
      for (let i = 0; i < sorted.length; i++) {
        const move = sorted[i];
        let val: number;
        if (i === 0) {
          val = this.minimax(
            applyJungleMove(board, move),
            depth - 1,
            alpha,
            beta,
            false,
            aiColor,
            humanColor,
          );
        } else {
          val = this.minimax(
            applyJungleMove(board, move),
            depth - 1,
            beta - 1,
            beta,
            true,
            aiColor,
            humanColor,
          );
          if (val < beta && val > alpha) {
            val = this.minimax(
              applyJungleMove(board, move),
              depth - 1,
              alpha,
              val,
              true,
              aiColor,
              humanColor,
            );
          }
        }
        minEval = Math.min(minEval, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return minEval;
    } else {
      let maxEval = -Infinity;
      for (let i = 0; i < sorted.length; i++) {
        const move = sorted[i];
        let val: number;
        if (i === 0) {
          val = this.minimax(
            applyJungleMove(board, move),
            depth - 1,
            alpha,
            beta,
            true,
            aiColor,
            humanColor,
          );
        } else {
          val = this.minimax(
            applyJungleMove(board, move),
            depth - 1,
            alpha,
            alpha + 1,
            false,
            aiColor,
            humanColor,
          );
          if (val > alpha && val < beta) {
            val = this.minimax(
              applyJungleMove(board, move),
              depth - 1,
              val,
              beta,
              false,
              aiColor,
              humanColor,
            );
          }
        }
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    }
  }
}
