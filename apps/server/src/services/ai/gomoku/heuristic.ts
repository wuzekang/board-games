import type { GomokuBoardState } from '@board-games/shared/gomoku';
import { PieceColor } from '@board-games/shared/gomoku';

const FIVE = 1_000_000;
const OPEN_FOUR = 100_000;
const BLOCKED_FOUR = 10_000;
const OPEN_THREE = 5_000;
const BLOCKED_THREE = 500;
const OPEN_TWO = 200;
const BLOCKED_TWO = 50;

type Cell = PieceColor | null;

function buildGrid(board: GomokuBoardState): Cell[][] {
  const grid: Cell[][] = Array.from({ length: 15 }, () => Array(15).fill(null));
  for (const s of board.stones) {
    grid[s.position.row][s.position.col] = s.color;
  }
  return grid;
}

function scoreLine(
  grid: Cell[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  color: PieceColor,
  scored: Set<string>,
): number {
  const key = `${row},${col},${dr},${dc}`;
  if (scored.has(key)) return 0;
  scored.add(key);

  let count = 1;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === color) {
    count++;
    scored.add(`${r},${c},${dr},${dc}`);
    r += dr;
    c += dc;
  }
  const openEnd1 = r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === null;

  r = row - dr;
  c = col - dc;
  while (r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === color) {
    count++;
    scored.add(`${r},${c},${dr},${dc}`);
    r -= dr;
    c -= dc;
  }
  const openEnd2 = r >= 0 && r < 15 && c >= 0 && c < 15 && grid[r][c] === null;

  const openEnds = (openEnd1 ? 1 : 0) + (openEnd2 ? 1 : 0);

  if (count >= 5) return FIVE;
  if (openEnds === 0) return 0;

  if (count === 4) {
    return openEnds === 2 ? OPEN_FOUR : BLOCKED_FOUR;
  }
  if (count === 3) {
    return openEnds === 2 ? OPEN_THREE : BLOCKED_THREE;
  }
  if (count === 2) {
    return openEnds === 2 ? OPEN_TWO : BLOCKED_TWO;
  }
  return 0;
}

export function evaluateGomokuBoard(board: GomokuBoardState, aiColor: PieceColor): number {
  const grid = buildGrid(board);
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  let aiScore = 0;
  let humanScore = 0;

  const aiScored = new Set<string>();
  const humanScored = new Set<string>();

  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const stone of board.stones) {
    const { row, col } = stone.position;
    for (const { dr, dc } of dirs) {
      if (stone.color === aiColor) {
        aiScore += scoreLine(grid, row, col, dr, dc, aiColor, aiScored);
      } else {
        humanScore += scoreLine(grid, row, col, dr, dc, humanColor, humanScored);
      }
    }
  }

  return aiScore - humanScore;
}
