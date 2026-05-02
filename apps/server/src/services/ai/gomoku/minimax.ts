import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import { PieceColor } from '@board-games/shared/gomoku';
import {
  applyGomokuMove,
  getGomokuGameResult,
} from '@board-games/shared/gomoku';
import { evaluateGomokuBoard } from './heuristic';
import type { AIEngine } from '../interface';

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function getCandidateMoves(board: GomokuBoardState, color: PieceColor): GomokuMove[] {
  if (board.stones.length === 0) {
    return [{ stoneId: 'gs_preview', to: { row: 7, col: 7 }, color }];
  }

  const occupied = new Set<string>();
  for (const s of board.stones) {
    occupied.add(`${s.position.row},${s.position.col}`);
  }

  const candidateSet = new Set<string>();
  const radius = 2;
  for (const s of board.stones) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const r = s.position.row + dr;
        const c = s.position.col + dc;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && !occupied.has(`${r},${c}`)) {
          candidateSet.add(`${r},${c}`);
        }
      }
    }
  }

  const grid: (PieceColor | null)[][] = Array.from({ length: 15 }, () => Array(15).fill(null));
  for (const s of board.stones) {
    grid[s.position.row][s.position.col] = s.color;
  }

  const scored: { move: GomokuMove; nc: number }[] = [];
  for (const key of candidateSet) {
    const [rs, cs] = key.split(',');
    const row = parseInt(rs);
    const col = parseInt(cs);
    let nc = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const ndc = col + dc;
        if (nr >= 0 && nr < 15 && ndc >= 0 && ndc < 15 && grid[nr][ndc] !== null) {
          nc++;
        }
      }
    }
    scored.push({ move: { stoneId: 'gs_preview', to: { row, col }, color }, nc });
  }

  scored.sort((a, b) => b.nc - a.nc);
  return scored.map((s) => s.move);
}

function moveQuickScore(board: GomokuBoardState, move: GomokuMove): number {
  const { row, col } = move.to;
  const grid: (PieceColor | null)[][] = Array.from({ length: 15 }, () => Array(15).fill(null));
  for (const s of board.stones) {
    grid[s.position.row][s.position.col] = s.color;
  }

  const opponentColor = move.color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  let score = 0;
  for (const { dr, dc } of dirs) {
    let ownCount = 1;
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === move.color) {
      ownCount++;
      r += dr;
      c += dc;
    }
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === move.color) {
      ownCount++;
      r -= dr;
      c -= dc;
    }

    if (ownCount >= 5) score += 1_000_000;
    else if (ownCount === 4) score += 50_000;
    else if (ownCount === 3) score += 5_000;
    else if (ownCount === 2) score += 500;

    let oppCount = 1;
    r = row + dr;
    c = col + dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === opponentColor) {
      oppCount++;
      r += dr;
      c += dc;
    }
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === opponentColor) {
      oppCount++;
      r -= dr;
      c -= dc;
    }

    if (oppCount >= 4) score += 100_000;
    else if (oppCount >= 3) score += 10_000;
  }

  const centerDist = Math.abs(row - 7) + Math.abs(col - 7);
  score += (14 - centerDist) * 10;

  return score;
}

export class GomokuAI implements AIEngine<GomokuBoardState, GomokuMove> {
  private difficulty: string;
  private maxDepth: number;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
    this.maxDepth = DEPTH_BY_DIFFICULTY[difficulty] ?? 2;
  }

  getBestMove(board: GomokuBoardState, aiColor: PieceColor): GomokuMove | null {
    const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
    let candidates = getCandidateMoves(board, aiColor);

    if (candidates.length === 0) return null;

    const scored = candidates
      .map((m) => ({ move: m, score: moveQuickScore(board, m) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    let bestMove = scored[0].move;
    let bestScore = -Infinity;

    for (const { move } of scored) {
      const newBoard = applyGomokuMove(board, move);
      const result = getGomokuGameResult(newBoard);
      let score: number;
      if (result && result.winner === aiColor) {
        score = 10_000_000 + this.maxDepth;
      } else if (result && result.winner === humanColor) {
        score = -10_000_000 - this.maxDepth;
      } else if (result && result.isDraw) {
        score = 0;
      } else {
        score = this.minimax(newBoard, this.maxDepth - 1, -Infinity, Infinity, false, aiColor, humanColor);
      }
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    board: GomokuBoardState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    aiColor: PieceColor,
    humanColor: PieceColor,
  ): number {
    const result = getGomokuGameResult(board);
    if (result) {
      if (result.winner === aiColor) return 10_000_000 + depth;
      if (result.winner === humanColor) return -10_000_000 - depth;
      return 0;
    }
    if (depth === 0) {
      return evaluateGomokuBoard(board, aiColor);
    }

    const currentColor = maximizing ? aiColor : humanColor;
    let candidates = getCandidateMoves(board, currentColor);

    if (candidates.length === 0) {
      return evaluateGomokuBoard(board, aiColor);
    }

    const scored = candidates
      .map((m) => ({ move: m, score: moveQuickScore(board, m) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    if (maximizing) {
      let maxEval = -Infinity;
      for (const { move } of scored) {
        const newBoard = applyGomokuMove(board, move);
        const evalScore = this.minimax(newBoard, depth - 1, alpha, beta, false, aiColor, humanColor);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const { move } of scored) {
        const newBoard = applyGomokuMove(board, move);
        const evalScore = this.minimax(newBoard, depth - 1, alpha, beta, true, aiColor, humanColor);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
