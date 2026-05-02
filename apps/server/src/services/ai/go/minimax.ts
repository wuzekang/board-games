import type { GoBoardState, GoMove, GoPlaceMove } from '@board-games/shared/go';
import { PieceColor, applyGoMove, getGoGameResult, isValidGoMove } from '@board-games/shared/go';
import { evaluateGoBoard } from './heuristic';
import type { AIEngine } from '../interface';

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const MAX_CANDIDATES = 20;
const CANDIDATE_RADIUS = 2;

const ORTHO = [[-1,0],[1,0],[0,-1],[0,1]] as const;

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function getCandidateMoves(board: GoBoardState, color: PieceColor): GoMove[] {
  const size = board.size;
  const center = Math.floor(size / 2);

  const passMove: GoMove = {
    stoneId: 'go_pass',
    to: { row: -1, col: -1 },
    color,
    isPass: true,
  };

  if (board.stones.length === 0) {
    return [
      { stoneId: 'go_preview', to: { row: center, col: center }, color, isPass: false },
      passMove,
    ];
  }

  const occupied = new Set<string>();
  for (const s of board.stones) {
    occupied.add(`${s.position.row},${s.position.col}`);
  }

  const candidateSet = new Set<string>();
  for (const s of board.stones) {
    for (let dr = -CANDIDATE_RADIUS; dr <= CANDIDATE_RADIUS; dr++) {
      for (let dc = -CANDIDATE_RADIUS; dc <= CANDIDATE_RADIUS; dc++) {
        const nr = s.position.row + dr;
        const nc = s.position.col + dc;
        if (inBounds(nr, nc, size) && !occupied.has(`${nr},${nc}`)) {
          candidateSet.add(`${nr},${nc}`);
        }
      }
    }
  }

  const previewMove = (r: number, c: number): GoMove => ({
    stoneId: 'go_preview',
    to: { row: r, col: c },
    color,
    isPass: false,
  });

  const scored: { move: GoMove; score: number }[] = [];
  for (const key of candidateSet) {
    const [rs, cs] = key.split(',');
    const r = parseInt(rs), c = parseInt(cs);
    const m = previewMove(r, c);
    if (!isValidGoMove(board, m, color)) continue;
    scored.push({ move: m, score: moveQuickScore(board, m) });
  }

  scored.sort((a, b) => b.score - a.score);

  const result: GoMove[] = scored.slice(0, MAX_CANDIDATES).map((s) => s.move);
  result.push(passMove);

  return result;
}

function moveQuickScore(board: GoBoardState, move: GoMove): number {
  if (move.isPass) return -1000;

  const { row, col } = move.to;
  const size = board.size;
  const center = (size - 1) / 2;
  const opponentColor = move.color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  const grid: (PieceColor | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  for (const s of board.stones) {
    grid[s.position.row][s.position.col] = s.color;
  }

  let score = 0;

  grid[row][col] = move.color;
  for (const [dr, dc] of ORTHO) {
    const nr = row + dr, nc = col + dc;
    if (!inBounds(nr, nc, size)) continue;
    if (grid[nr][nc] !== opponentColor) continue;

    const group = getGroupLiberties(grid, nr, nc, size);
    if (group.liberties === 0) score += 500;
  }
  grid[row][col] = null;

  grid[row][col] = move.color;
  const ownAfterPlace = getGroupLiberties(grid, row, col, size);
  grid[row][col] = null;

  if (ownAfterPlace.liberties === 1 && ownAfterPlace.stones === 1) {
    const adjOpp = ORTHO.some(([dr, dc]) => {
      const nr = row + dr, nc = col + dc;
      return inBounds(nr, nc, size) && grid[nr][nc] === opponentColor;
    });
    if (adjOpp) score -= 100;
  }

  const dist = Math.abs(row - center) + Math.abs(col - center);
  score += Math.max(0, size - dist) * 5;

  return score;
}

function getGroupLiberties(grid: (PieceColor | null)[][], row: number, col: number, size: number): { liberties: number; stones: number } {
  const color = grid[row][col];
  if (!color) return { liberties: 0, stones: 0 };
  const visited = new Set<string>();
  const libertySet = new Set<string>();
  const queue: [number, number][] = [[row, col]];
  visited.add(`${row},${col}`);
  let stoneCount = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    stoneCount++;
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc, size)) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      const cell = grid[nr][nc];
      if (cell === null) {
        libertySet.add(key);
        visited.add(key);
      } else if (cell === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return { liberties: libertySet.size, stones: stoneCount };
}

export class GoAI implements AIEngine<GoBoardState, GoMove> {
  private maxDepth: number;

  constructor(difficulty: string) {
    this.maxDepth = DEPTH_BY_DIFFICULTY[difficulty] ?? 2;
  }

  getBestMove(board: GoBoardState, aiColor: PieceColor): GoMove | null {
    if (board.consecutivePasses >= 2) return null;

    const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
    const candidates = getCandidateMoves(board, aiColor);

    if (candidates.length === 0) {
      return { stoneId: 'go_pass', to: { row: -1, col: -1 }, color: aiColor, isPass: true };
    }

    let bestMove: GoMove = candidates[candidates.length - 1];
    let bestScore = -Infinity;

    for (const move of candidates) {
      const newBoard = applyGoMove(board, move);
      const result = getGoGameResult(newBoard);

      let score: number;
      if (result) {
        if (result.winner === aiColor) score = 10_000_000 + this.maxDepth;
        else if (result.winner === humanColor) score = -10_000_000 - this.maxDepth;
        else score = 0;
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
    board: GoBoardState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    aiColor: PieceColor,
    humanColor: PieceColor,
  ): number {
    const result = getGoGameResult(board);
    if (result) {
      if (result.winner === aiColor) return 10_000_000 + depth;
      if (result.winner === humanColor) return -10_000_000 - depth;
      return 0;
    }
    if (depth === 0) return evaluateGoBoard(board, aiColor);

    const currentColor = maximizing ? aiColor : humanColor;
    const candidates = getCandidateMoves(board, currentColor);

    if (candidates.length === 0) return evaluateGoBoard(board, aiColor);

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of candidates) {
        const newBoard = applyGoMove(board, move);
        const val = this.minimax(newBoard, depth - 1, alpha, beta, false, aiColor, humanColor);
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of candidates) {
        const newBoard = applyGoMove(board, move);
        const val = this.minimax(newBoard, depth - 1, alpha, beta, true, aiColor, humanColor);
        minEval = Math.min(minEval, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
