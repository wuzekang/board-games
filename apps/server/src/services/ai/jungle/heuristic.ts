import {
  type JungleBoardState,
  type JunglePiece,
  type JungleMove,
  JunglePieceType,
  JungleMoveType,
  PieceColor,
} from '@board-games/shared/jungle';
import type { Position } from '@board-games/shared';
import { JUNGLE_PIECE_RANK } from '@board-games/shared/jungle';
import { posKey } from '@board-games/shared';

const BASE_VALUES: Record<JunglePieceType, number> = {
  [JunglePieceType.ELEPHANT]: 900,
  [JunglePieceType.LION]: 750,
  [JunglePieceType.TIGER]: 650,
  [JunglePieceType.LEOPARD]: 500,
  [JunglePieceType.DOG]: 400,
  [JunglePieceType.WOLF]: 300,
  [JunglePieceType.CAT]: 200,
  [JunglePieceType.RAT]: 350,
};

const LIGHT_DEN: Position = { row: 0, col: 3 };
const DARK_DEN: Position = { row: 8, col: 3 };

const LIGHT_TRAP_SET = new Set(['0,2', '0,4', '1,3']);
const DARK_TRAP_SET = new Set(['8,2', '8,4', '7,3']);

const ROWS = 9;
const COLS = 7;

const ORTHOGONAL = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

const RIVER_CELLS = new Set<string>();
for (let r = 3; r <= 5; r++) {
  for (const c of [1, 2, 4, 5]) {
    RIVER_CELLS.add(`${r},${c}`);
  }
}

function isRiver(pos: Position): boolean {
  return RIVER_CELLS.has(`${pos.row},${pos.col}`);
}

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < ROWS && pos.col >= 0 && pos.col < COLS;
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

const ELEPHANT_PST: number[][] = [
  [ 0, 10, 15, 25, 15, 10,  0],
  [10, 15, 25, 30, 25, 15, 10],
  [10, 20, 25, 30, 25, 20, 10],
  [ 5, 15, 20, 30, 20, 15,  5],
  [ 0,  5, 10, 25, 10,  5,  0],
  [-5,  0,  5, 20,  5,  0, -5],
  [-5, -5,  0,  5,  0, -5, -5],
  [-10, -5, -5,  0, -5, -5, -10],
  [-10,-10,  0, -5,  0,-10, -10],
];

const LION_PST: number[][] = [
  [ 5, 15, 25,  0, 25, 15,  5],
  [10, 20, 30, 35, 30, 20, 10],
  [10, 20, 25, 25, 25, 20, 10],
  [ 5, 15, 15, 15, 15, 15,  5],
  [ 0, 10, 10,  8, 10, 10,  0],
  [ 0, 10, 10,  8, 10, 10,  0],
  [ 5, 12, 12, 10, 12, 12,  5],
  [ 0,  5,  5,  5,  5,  5,  0],
  [-5,  0,  8, -5,  8,  0, -5],
];

const TIGER_PST: number[][] = LION_PST;

const LEOPARD_PST: number[][] = [
  [ 0,  5, 10, 15, 10,  5,  0],
  [ 5, 10, 15, 20, 15, 10,  5],
  [ 5, 10, 15, 20, 15, 10,  5],
  [ 0, 10, 15, 15, 15, 10,  0],
  [ 0,  5, 10, 15, 10,  5,  0],
  [ 0,  0,  5, 10,  5,  0,  0],
  [-5,  0,  0,  5,  0,  0, -5],
  [-5, -5, -5,  0, -5, -5, -5],
  [-10,-10, 0,-10,  0,-10,-10],
];

const DOG_PST: number[][] = [
  [ 0,  5,  8, 10,  8,  5,  0],
  [ 5,  8, 10, 12, 10,  8,  5],
  [ 5,  8, 10, 15, 10,  8,  5],
  [ 0,  5,  8, 10,  8,  5,  0],
  [ 0,  0,  5,  8,  5,  0,  0],
  [ 0,  0,  0,  5,  0,  0,  0],
  [-5, -5,  0,  0,  0, -5, -5],
  [-5, -5, -5,  5, -5, -5, -5],
  [-10,-10,  5,-10,  5,-10,-10],
];

const WOLF_PST: number[][] = DOG_PST;

const CAT_PST: number[][] = [
  [ 0,  3,  5,  8,  5,  3,  0],
  [ 3,  5,  8, 10,  8,  5,  3],
  [ 3,  5,  8, 10,  8,  5,  3],
  [ 0,  3,  5,  8,  5,  3,  0],
  [ 0,  0,  3,  5,  3,  0,  0],
  [ 0,  0,  0,  3,  0,  0,  0],
  [-5, -5,  0,  0,  0, -5, -5],
  [-5, -5, -5,  5, -5, -5, -5],
  [ -8, -8,  0, -8,  0, -8, -8],
];

const RAT_PST: number[][] = [
  [ 0, 12, 18, 25, 18, 12,  0],
  [12, 18, 22, 30, 22, 18, 12],
  [12, 22, 28, 30, 28, 22, 12],
  [ 5, 38, 38, 18, 38, 38,  5],
  [ 5, 35, 35, 15, 35, 35,  5],
  [ 5, 32, 32, 15, 32, 32,  5],
  [ 0, 12, 12, 15, 12, 12,  0],
  [-5,  0,  2,  5,  2,  0, -5],
  [-10,-10,  0, -5,  0,-10,-10],
];

const PST: Record<JunglePieceType, number[][]> = {
  [JunglePieceType.ELEPHANT]: ELEPHANT_PST,
  [JunglePieceType.LION]: LION_PST,
  [JunglePieceType.TIGER]: TIGER_PST,
  [JunglePieceType.LEOPARD]: LEOPARD_PST,
  [JunglePieceType.DOG]: DOG_PST,
  [JunglePieceType.WOLF]: WOLF_PST,
  [JunglePieceType.CAT]: CAT_PST,
  [JunglePieceType.RAT]: RAT_PST,
};

function getPstValue(piece: JunglePiece): number {
  const table = PST[piece.type];
  const row = piece.color === PieceColor.DARK ? piece.position.row : 8 - piece.position.row;
  const clampedRow = Math.max(0, Math.min(8, row));
  const col = Math.max(0, Math.min(6, piece.position.col));
  return table[clampedRow][col];
}

function counterBonus(board: JungleBoardState, color: PieceColor): number {
  const opponentColor = color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const hasElephant = (c: PieceColor) =>
    board.pieces.some((p) => p.type === JunglePieceType.ELEPHANT && p.color === c);
  const hasRat = (c: PieceColor) =>
    board.pieces.some((p) => p.type === JunglePieceType.RAT && p.color === c);

  let bonus = 0;
  if (hasElephant(opponentColor) && hasRat(color)) {
    bonus += 500;
  }
  if (hasElephant(color) && !hasRat(color) && hasRat(opponentColor)) {
    bonus -= 400;
  }
  if (hasElephant(opponentColor)) {
    const ratInRiver = board.pieces.some(
      (p) => p.color === color && p.type === JunglePieceType.RAT && isRiver(p.position),
    );
    if (ratInRiver) {
      bonus += 200;
    }
  }
  return bonus;
}

function trapControlScore(board: JungleBoardState, color: PieceColor): number {
  const opponentTrapSet = color === PieceColor.DARK ? LIGHT_TRAP_SET : DARK_TRAP_SET;
  let score = 0;
  for (const piece of board.pieces) {
    if (piece.color !== color) continue;
    if (opponentTrapSet.has(posKey(piece.position))) score += 100;
  }
  return score;
}

function denProximityScore(board: JungleBoardState, aiColor: PieceColor): number {
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const opponentDen = humanColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  const ownDen = aiColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  let score = 0;

  for (const piece of board.pieces) {
    const rank = JUNGLE_PIECE_RANK[piece.type];
    if (piece.color === aiColor) {
      const d = Math.min(manhattan(piece.position, opponentDen), 12);
      score += rank * 15 * (12 - d);
    } else {
      const d = Math.min(manhattan(piece.position, ownDen), 12);
      score -= rank * 15 * (12 - d);
    }
  }
  return score;
}

export function ratHuntScore(board: JungleBoardState, color: PieceColor): number {
  const opponentColor = color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const opponentElephants = board.pieces.filter(
    (p) => p.type === JunglePieceType.ELEPHANT && p.color === opponentColor,
  );
  if (opponentElephants.length === 0) return 0;

  const ownRats = board.pieces.filter(
    (p) => p.type === JunglePieceType.RAT && p.color === color,
  );
  if (ownRats.length === 0) return 0;

  let score = 0;
  for (const rat of ownRats) {
    for (const ele of opponentElephants) {
      const dist = manhattan(rat.position, ele.position);
      if (dist <= 2) score += 150;
      else if (dist <= 4) score += 80;
      else if (dist <= 6) score += 30;
    }
  }
  return score;
}

function isInJumpLane(from: Position, to: Position, pos: Position): boolean {
  if (from.row === to.row) {
    const minC = Math.min(from.col, to.col);
    const maxC = Math.max(from.col, to.col);
    return pos.row === from.row && pos.col > minC && pos.col < maxC;
  }
  if (from.col === to.col) {
    const minR = Math.min(from.row, to.row);
    const maxR = Math.max(from.row, to.row);
    return pos.col === from.col && pos.row > minR && pos.row < maxR;
  }
  return false;
}

function ratRiverBlockScore(board: JungleBoardState, color: PieceColor): number {
  const opponentColor = color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const ownDen = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;

  const enemyJumpers = board.pieces.filter(
    (p) => p.color === opponentColor &&
      (p.type === JunglePieceType.LION || p.type === JunglePieceType.TIGER),
  );

  const ownRats = board.pieces.filter(
    (p) => p.color === color && p.type === JunglePieceType.RAT && isRiver(p.position),
  );

  let score = 0;

  for (const jumper of enemyJumpers) {
    for (const dir of ORTHOGONAL) {
      let r = jumper.position.row + dir.dr;
      let c = jumper.position.col + dir.dc;
      if (!inBounds({ row: r, col: c }) || !isRiver({ row: r, col: c })) continue;

      const from = jumper.position;
      while (inBounds({ row: r, col: c }) && isRiver({ row: r, col: c })) {
        r += dir.dr;
        c += dir.dc;
      }
      if (!inBounds({ row: r, col: c })) continue;
      const landing: Position = { row: r, col: c };

      const distToDen = manhattan(landing, ownDen);
      if (distToDen > 5) continue;

      const blocked = ownRats.some((rat) => isInJumpLane(from, landing, rat.position));
      if (blocked) score += 300;
      else score -= 150;
    }
  }

  return score;
}


export function evaluateJungleBoard(
  board: JungleBoardState,
  aiColor: PieceColor,
): number {
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  let materialScore = 0;
  let pstScore = 0;

  for (const piece of board.pieces) {
    const val = BASE_VALUES[piece.type];
    const pst = getPstValue(piece);
    if (piece.color === aiColor) {
      materialScore += val;
      pstScore += pst;
    } else {
      materialScore -= val;
      pstScore -= pst;
    }
  }

  materialScore += counterBonus(board, aiColor) - counterBonus(board, humanColor);

  const trapScore = trapControlScore(board, aiColor) - trapControlScore(board, humanColor);
  const denScore = denProximityScore(board, aiColor);
  const huntScore = ratHuntScore(board, aiColor) - ratHuntScore(board, humanColor);
  const blockScore = ratRiverBlockScore(board, aiColor) - ratRiverBlockScore(board, humanColor);

  return materialScore + pstScore + trapScore + denScore + huntScore + blockScore;
}


export function moveOrderScore(move: JungleMove, board: JungleBoardState, aiColor: PieceColor): number {
  let score = 0;
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const humanDen = humanColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;

  if (move.to.row === humanDen.row && move.to.col === humanDen.col) return 100000;

  if (move.type === JungleMoveType.CAPTURE) {
    const captured = board.pieces.find((p) => p.id === move.capturedPieceId);
    if (captured) {
      score += 10000 + BASE_VALUES[captured.type];
    }
  }

  const opponentTrapSet = aiColor === PieceColor.DARK ? LIGHT_TRAP_SET : DARK_TRAP_SET;
  if (opponentTrapSet.has(posKey(move.to))) score += 5000;

  const piece = board.pieces.find((p) => p.id === move.pieceId);
  if (!piece) return score;

  const distBefore = manhattan(piece.position, humanDen);
  const distAfter = manhattan(move.to, humanDen);
  if (distAfter < distBefore) {
    score += (distBefore - distAfter) * 50 * JUNGLE_PIECE_RANK[piece.type];
  }

  if (isRiver(move.to) && piece.type !== JunglePieceType.RAT) {
    score -= 1000;
  }

  return score;
}
