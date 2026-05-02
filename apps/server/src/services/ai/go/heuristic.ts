import type { GoBoardState } from '@board-games/shared/go';
import { PieceColor } from '@board-games/shared/go';

const ORTHO = [[-1,0],[1,0],[0,-1],[0,1]] as const;

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function buildGrid(board: GoBoardState): (PieceColor | null)[][] {
  const g: (PieceColor | null)[][] = Array.from({ length: board.size }, () => Array(board.size).fill(null));
  for (const s of board.stones) {
    g[s.position.row][s.position.col] = s.color;
  }
  return g;
}

function getGroupLiberties(grid: (PieceColor | null)[][], row: number, col: number, size: number): { count: number; stones: number } {
  const color = grid[row][col];
  if (!color) return { count: 0, stones: 0 };
  const visited = new Set<string>();
  const liberties = new Set<string>();
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
        liberties.add(key);
        visited.add(key);
      } else if (cell === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return { count: liberties.size, stones: stoneCount };
}

export function evaluateGoBoard(board: GoBoardState, aiColor: PieceColor): number {
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const size = board.size;
  const center = (size - 1) / 2;
  const grid = buildGrid(board);

  let aiStones = 0, humanStones = 0;
  let aiLiberties = 0, humanLiberties = 0;
  const aiGroupVisited = new Set<string>();
  const humanGroupVisited = new Set<string>();

  for (const s of board.stones) {
    if (s.color === aiColor) aiStones++;
    else humanStones++;

    const key = `${s.position.row},${s.position.col}`;
    const groupVisited = s.color === aiColor ? aiGroupVisited : humanGroupVisited;
    if (!groupVisited.has(key)) {
      const group = getGroupLiberties(grid, s.position.row, s.position.col, size);
      if (s.color === aiColor) {
        aiLiberties += group.count;
        for (const sk of getGroupStones(grid, s.position.row, s.position.col, size)) {
          aiGroupVisited.add(sk);
        }
      } else {
        humanLiberties += group.count;
        for (const sk of getGroupStones(grid, s.position.row, s.position.col, size)) {
          humanGroupVisited.add(sk);
        }
      }
    }
  }

  let aiInfluence = 0, humanInfluence = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== null) continue;
      let minAiDist = Infinity, minHumanDist = Infinity;
      for (const s of board.stones) {
        const dist = Math.abs(s.position.row - r) + Math.abs(s.position.col - c);
        if (s.color === aiColor && dist < minAiDist) minAiDist = dist;
        if (s.color === humanColor && dist < minHumanDist) minHumanDist = dist;
      }
      if (minAiDist < minHumanDist) aiInfluence++;
      else if (minHumanDist < minAiDist) humanInfluence++;
    }
  }

  const aiCaptures = aiColor === PieceColor.DARK ? board.capturedByDark : board.capturedByLight;
  const humanCaptures = aiColor === PieceColor.DARK ? board.capturedByLight : board.capturedByDark;

  return (
    (aiStones - humanStones) * 10 +
    (aiLiberties - humanLiberties) * 2 +
    (aiInfluence - humanInfluence) * 3 +
    (aiCaptures - humanCaptures) * 10
  );
}

function getGroupStones(grid: (PieceColor | null)[][], row: number, col: number, size: number): string[] {
  const color = grid[row][col];
  if (!color) return [];
  const visited = new Set<string>();
  const queue: [number, number][] = [[row, col]];
  const stones: string[] = [];
  visited.add(`${row},${col}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    stones.push(`${r},${c}`);
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc, size)) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      if (grid[nr][nc] === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return stones;
}
