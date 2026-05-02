import type { Position } from '../types/board';
import { PieceColor } from '../types/board';
import type {
  GoBoardState,
  GoBoardSize,
  GoStone,
  GoMove,
  GoGameResult,
  GoScore,
  GoPlaceMove,
} from './types';

const ORTHO: readonly { dr: number; dc: number }[] = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

const KOMI_19 = 7.5;
const KOMI_OTHER = 5.5;

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function pk(row: number, col: number): string {
  return `${row},${col}`;
}

type ColorGrid = (PieceColor | null)[][];

function buildGrid(board: GoBoardState): ColorGrid {
  const g: ColorGrid = Array.from({ length: board.size }, () =>
    Array(board.size).fill(null),
  );
  for (const s of board.stones) {
    g[s.position.row][s.position.col] = s.color;
  }
  return g;
}

interface Group {
  stones: Position[];
  liberties: Set<string>;
}

function getGroup(
  grid: ColorGrid,
  startRow: number,
  startCol: number,
  size: number,
): Group {
  const color = grid[startRow][startCol];
  if (!color) return { stones: [], liberties: new Set() };

  const visited = new Set<string>();
  const liberties = new Set<string>();
  const queue: Position[] = [{ row: startRow, col: startCol }];
  const stones: Position[] = [];

  visited.add(pk(startRow, startCol));

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    stones.push({ row, col });

    for (const { dr, dc } of ORTHO) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc, size)) continue;

      const key = pk(nr, nc);
      const cell = grid[nr][nc];

      if (cell === null) {
        liberties.add(key);
      } else if (cell === color && !visited.has(key)) {
        visited.add(key);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return { stones, liberties };
}

function captureDeadGroups(
  grid: ColorGrid,
  placedRow: number,
  placedCol: number,
  placedColor: PieceColor,
  size: number,
): Position[] {
  const opponentColor =
    placedColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const captured: Position[] = [];
  const checkedGroups = new Set<string>();

  for (const { dr, dc } of ORTHO) {
    const nr = placedRow + dr;
    const nc = placedCol + dc;
    if (!inBounds(nr, nc, size)) continue;
    if (grid[nr][nc] !== opponentColor) continue;

    const key = pk(nr, nc);
    if (checkedGroups.has(key)) continue;

    const group = getGroup(grid, nr, nc, size);
    for (const pos of group.stones) checkedGroups.add(pk(pos.row, pos.col));

    if (group.liberties.size === 0) {
      for (const pos of group.stones) {
        grid[pos.row][pos.col] = null;
      }
      captured.push(...group.stones);
    }
  }

  return captured;
}

function computeKoPoint(
  captured: Position[],
  placedRow: number,
  placedCol: number,
  grid: ColorGrid,
  placedColor: PieceColor,
  size: number,
): Position | null {
  if (captured.length !== 1) return null;

  const placedGroup = getGroup(grid, placedRow, placedCol, size);
  if (placedGroup.stones.length === 1 && placedGroup.liberties.size === 1) {
    return captured[0];
  }
  return null;
}

let stoneIdCounter = 0;

function nextStoneId(): string {
  stoneIdCounter++;
  return `go${stoneIdCounter}`;
}

function resetStoneIdCounter(): void {
  stoneIdCounter = 0;
}

export function createInitialGoBoard(size: GoBoardSize): GoBoardState {
  resetStoneIdCounter();
  return {
    size,
    stones: [],
    nextColor: PieceColor.DARK,
    koPoint: null,
    consecutivePasses: 0,
    capturedByDark: 0,
    capturedByLight: 0,
  };
}

export function cloneGoBoard(board: GoBoardState): GoBoardState {
  return {
    size: board.size,
    stones: board.stones.map((s) => ({ ...s, position: { ...s.position } })),
    nextColor: board.nextColor,
    koPoint: board.koPoint ? { ...board.koPoint } : null,
    consecutivePasses: board.consecutivePasses,
    capturedByDark: board.capturedByDark,
    capturedByLight: board.capturedByLight,
  };
}

export function isValidGoMove(
  board: GoBoardState,
  move: GoMove,
  color: PieceColor,
): boolean {
  if (board.nextColor !== color) return false;
  if (move.color !== color) return false;

  if (move.isPass) return true;

  const { row, col } = move.to;
  const size = board.size;

  if (!inBounds(row, col, size)) return false;

  const grid = buildGrid(board);
  if (grid[row][col] !== null) return false;

  if (board.koPoint && board.koPoint.row === row && board.koPoint.col === col) {
    return false;
  }

  grid[row][col] = color;

  const opponentColor =
    color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  let capturesOpponent = false;
  for (const { dr, dc } of ORTHO) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc, size)) continue;
    if (grid[nr][nc] !== opponentColor) continue;
    const g = getGroup(grid, nr, nc, size);
    if (g.liberties.size === 0) {
      capturesOpponent = true;
      break;
    }
  }

  if (capturesOpponent) return true;

  const ownGroup = getGroup(grid, row, col, size);
  return ownGroup.liberties.size > 0;
}

export function applyGoMove(board: GoBoardState, move: GoMove): GoBoardState {
  const newBoard = cloneGoBoard(board);
  const opponentColor =
    move.color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  if (move.isPass) {
    newBoard.consecutivePasses += 1;
    newBoard.koPoint = null;
    newBoard.nextColor = opponentColor;
    return newBoard;
  }

  const { row, col } = move.to;

  stoneIdCounter++;
  const stoneId = `go${stoneIdCounter}`;

  const stone: GoStone = {
    id: stoneId,
    color: move.color,
    position: { row, col },
  };
  newBoard.stones.push(stone);
  newBoard.consecutivePasses = 0;

  const grid = buildGrid(newBoard);

  const captured = captureDeadGroups(grid, row, col, move.color, board.size);

  if (captured.length > 0) {
    const capturedKeys = new Set(captured.map((p) => pk(p.row, p.col)));
    newBoard.stones = newBoard.stones.filter(
      (s) => !capturedKeys.has(pk(s.position.row, s.position.col)),
    );

    if (move.color === PieceColor.DARK) {
      newBoard.capturedByDark += captured.length;
    } else {
      newBoard.capturedByLight += captured.length;
    }
  }

  const gridAfter = buildGrid(newBoard);
  newBoard.koPoint = computeKoPoint(captured, row, col, gridAfter, move.color, board.size);

  newBoard.nextColor = opponentColor;
  return newBoard;
}

export function getAllValidGoMoves(board: GoBoardState, color: PieceColor): GoMove[] {
  if (board.nextColor !== color) return [];
  if (board.consecutivePasses >= 2) return [];

  const moves: GoMove[] = [];

  moves.push({
    stoneId: 'go_pass',
    to: { row: -1, col: -1 },
    color,
    isPass: true,
  });

  const size = board.size;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const previewMove: GoPlaceMove = {
        stoneId: 'go_preview',
        to: { row, col },
        color,
        isPass: false,
      };
      if (isValidGoMove(board, previewMove, color)) {
        moves.push(previewMove);
      }
    }
  }

  return moves;
}

function countTerritory(board: GoBoardState): {
  darkTerritory: number;
  lightTerritory: number;
} {
  const size = board.size;
  const grid = buildGrid(board);
  const visited = new Set<string>();
  let darkTerritory = 0;
  let lightTerritory = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== null) continue;
      const key = pk(row, col);
      if (visited.has(key)) continue;

      const region: Position[] = [];
      const borders = new Set<PieceColor>();
      const queue: Position[] = [{ row, col }];
      visited.add(key);

      while (queue.length > 0) {
        const { row: r, col: c } = queue.shift()!;
        region.push({ row: r, col: c });

        for (const { dr, dc } of ORTHO) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc, size)) continue;

          const nkey = pk(nr, nc);
          const cell = grid[nr][nc];

          if (cell !== null) {
            borders.add(cell);
          } else if (!visited.has(nkey)) {
            visited.add(nkey);
            queue.push({ row: nr, col: nc });
          }
        }
      }

      if (borders.size === 1) {
        const owner = [...borders][0];
        if (owner === PieceColor.DARK) {
          darkTerritory += region.length;
        } else {
          lightTerritory += region.length;
        }
      }
    }
  }

  return { darkTerritory, lightTerritory };
}

export function getGoGameResult(board: GoBoardState): GoGameResult | null {
  if (board.consecutivePasses < 2) return null;

  const komi = board.size === 19 ? KOMI_19 : KOMI_OTHER;
  const { darkTerritory, lightTerritory } = countTerritory(board);

  const darkStones = board.stones.filter((s) => s.color === PieceColor.DARK).length;
  const lightStones = board.stones.filter((s) => s.color === PieceColor.LIGHT).length;

  const darkTotal = darkStones + darkTerritory;
  const lightTotal = lightStones + lightTerritory + komi;

  const score: GoScore = {
    darkStones,
    lightStones,
    darkTerritory,
    lightTerritory,
    komi,
    darkTotal,
    lightTotal,
  };

  const winner =
    darkTotal > lightTotal
      ? PieceColor.DARK
      : lightTotal > darkTotal
        ? PieceColor.LIGHT
        : null;

  return {
    winner,
    isDraw: winner === null,
    score,
    drawReason: winner === null ? 'equal_score' : undefined,
  };
}
