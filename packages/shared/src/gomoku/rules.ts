import type { Position } from '../types/board';
import { PieceColor } from '../types/board';
import type { GomokuBoardState, GomokuMove, GomokuStone, GomokuGameResult } from './types';

const SIZE = 15;
const DIRECTIONS: readonly { dr: number; dc: number }[] = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

let stoneIdCounter = 0;

function nextStoneId(): string {
  stoneIdCounter++;
  return `gs${stoneIdCounter}`;
}

function resetStoneIdCounter(): void {
  stoneIdCounter = 0;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function buildStoneMap(stones: GomokuStone[]): Map<string, GomokuStone> {
  const map = new Map<string, GomokuStone>();
  for (const s of stones) {
    map.set(`${s.position.row},${s.position.col}`, s);
  }
  return map;
}

export function createInitialGomokuBoard(): GomokuBoardState {
  resetStoneIdCounter();
  return { size: SIZE, stones: [], nextColor: PieceColor.DARK };
}

export function cloneGomokuBoard(board: GomokuBoardState): GomokuBoardState {
  return {
    size: board.size,
    stones: board.stones.map((s) => ({ ...s, position: { ...s.position } })),
    nextColor: board.nextColor,
  };
}

export function getAllValidMoves(board: GomokuBoardState, color: PieceColor): GomokuMove[] {
  if (board.nextColor !== color) return [];
  const stoneMap = buildStoneMap(board.stones);
  const moves: GomokuMove[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!stoneMap.has(`${row},${col}`)) {
        moves.push({ stoneId: 'gs_preview', to: { row, col }, color });
      }
    }
  }
  return moves;
}

export function isValidGomokuMove(board: GomokuBoardState, move: GomokuMove, color: PieceColor): boolean {
  if (board.nextColor !== color) return false;
  if (move.color !== color) return false;
  if (!inBounds(move.to.row, move.to.col)) return false;
  const stoneMap = buildStoneMap(board.stones);
  if (stoneMap.has(`${move.to.row},${move.to.col}`)) return false;
  return true;
}

export function applyGomokuMove(board: GomokuBoardState, move: GomokuMove): GomokuBoardState {
  const newBoard = cloneGomokuBoard(board);
  const stone: GomokuStone = {
    id: nextStoneId(),
    color: move.color,
    position: { ...move.to },
  };
  newBoard.stones.push(stone);
  newBoard.nextColor = move.color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  return newBoard;
}

export function getGomokuGameResult(board: GomokuBoardState): GomokuGameResult | null {
  const stoneMap = buildStoneMap(board.stones);

  for (const stone of board.stones) {
    const { row, col } = stone.position;
    const color = stone.color;

    for (const { dr, dc } of DIRECTIONS) {
      let count = 1;
      const line: Position[] = [{ row, col }];

      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const s = stoneMap.get(`${r},${c}`);
        if (!s || s.color !== color) break;
        count++;
        line.push({ row: r, col: c });
        r += dr;
        c += dc;
      }

      r = row - dr;
      c = col - dc;
      while (inBounds(r, c)) {
        const s = stoneMap.get(`${r},${c}`);
        if (!s || s.color !== color) break;
        count++;
        line.unshift({ row: r, col: c });
        r -= dr;
        c -= dc;
      }

      if (count >= 5) {
        return { winner: color, isDraw: false, winningLine: line };
      }
    }
  }

  if (board.stones.length >= SIZE * SIZE) {
    return { winner: null, isDraw: true };
  }

  return null;
}
