import type { JungleBoardState } from '@board-games/shared/jungle';
import { JunglePieceType, PieceColor } from '@board-games/shared/jungle';

const ROWS = 9;
const COLS = 7;
const CELLS = ROWS * COLS;
const CHANNELS = 20;

const PIECE_TYPE_ORDER: JunglePieceType[] = [
  JunglePieceType.ELEPHANT,
  JunglePieceType.LION,
  JunglePieceType.TIGER,
  JunglePieceType.LEOPARD,
  JunglePieceType.DOG,
  JunglePieceType.WOLF,
  JunglePieceType.CAT,
  JunglePieceType.RAT,
];

const PIECE_TYPE_IDX = new Map<JunglePieceType, number>();
for (let i = 0; i < PIECE_TYPE_ORDER.length; i++) {
  PIECE_TYPE_IDX.set(PIECE_TYPE_ORDER[i], i);
}

const RIVER_CELLS = new Set<number>();
for (let r = 3; r <= 5; r++) {
  for (const c of [1, 2, 4, 5]) {
    RIVER_CELLS.add(r * COLS + c);
  }
}

const DARK_TRAP_CELLS = new Set([
  8 * COLS + 2,
  8 * COLS + 4,
  7 * COLS + 3,
]);

const LIGHT_TRAP_CELLS = new Set([
  0 * COLS + 2,
  0 * COLS + 4,
  1 * COLS + 3,
]);

const MAX_MOVE_IDX = 63 * 63;

export function encodeJungleBoard(board: JungleBoardState): Float32Array {
  const data = new Float32Array(CHANNELS * CELLS);

  for (const piece of board.pieces) {
    const typeIdx = PIECE_TYPE_IDX.get(piece.type);
    if (typeIdx === undefined) continue;
    const ch = typeIdx + (piece.color === PieceColor.DARK ? 0 : 8);
    const pos = piece.position.row * COLS + piece.position.col;
    data[ch * CELLS + pos] = 1.0;
  }

  const turnVal = board.nextColor === PieceColor.DARK ? 1.0 : 0.0;
  const turnOffset = 16 * CELLS;
  for (let i = 0; i < CELLS; i++) {
    data[turnOffset + i] = turnVal;
  }

  const riverOffset = 17 * CELLS;
  for (const idx of RIVER_CELLS) {
    data[riverOffset + idx] = 1.0;
  }

  const trapOffset = 18 * CELLS;
  const ownTraps = board.nextColor === PieceColor.DARK ? DARK_TRAP_CELLS : LIGHT_TRAP_CELLS;
  for (const idx of ownTraps) {
    data[trapOffset + idx] = 1.0;
  }

  const clockVal = Math.min(board.halfMoveClock, 100) / 100.0;
  const clockOffset = 19 * CELLS;
  for (let i = 0; i < CELLS; i++) {
    data[clockOffset + i] = clockVal;
  }

  return data;
}

export function moveIndex(from: { row: number; col: number }, to: { row: number; col: number }): number {
  const fromIdx = from.row * COLS + from.col;
  const toIdx = to.row * COLS + to.col;
  return fromIdx * 63 + toIdx;
}

export { ROWS, COLS, CELLS, CHANNELS, MAX_MOVE_IDX };
