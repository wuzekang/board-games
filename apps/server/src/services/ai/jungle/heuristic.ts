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
  [JunglePieceType.ELEPHANT]: 800,
  [JunglePieceType.LION]: 700,
  [JunglePieceType.TIGER]: 600,
  [JunglePieceType.LEOPARD]: 500,
  [JunglePieceType.DOG]: 400,
  [JunglePieceType.WOLF]: 300,
  [JunglePieceType.CAT]: 200,
  [JunglePieceType.RAT]: 250,
};

const LIGHT_DEN: Position = { row: 0, col: 3 };
const DARK_DEN: Position = { row: 8, col: 3 };

const LIGHT_GUARD_SET = new Set(['0,2', '0,4', '1,3']);
const DARK_GUARD_SET = new Set(['8,2', '8,4', '7,3']);

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
  [ 5, 15, 20, 25, 20, 15,  5],
  [ 0,  5, 10, 15, 10,  5,  0],
  [-5,  0,  5, 10,  5,  0, -5],
  [-5, -5,  0,  5,  0, -5, -5],
  [-10, -5, -5,  0, -5, -5, -10],
  [-10,-10,  0, -5,  0,-10, -10],
];

const LION_PST: number[][] = [
  [ 0,  5, 10, 15, 10,  5,  0],
  [ 5, 10, 15, 20, 15, 10,  5],
  [ 5, 10, 15, 20, 15, 10,  5],
  [ 0, 20, 20, 20, 20, 20,  0],
  [ 0, 20, 20, 20, 20, 20,  0],
  [ 0, 20, 20, 20, 20, 20,  0],
  [ 0,  5, 10, 10, 10,  5,  0],
  [ 0,  0,  5,  5,  5,  0,  0],
  [-5,  0, 10, -5, 10,  0, -5],
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
  [ 0, 10, 15, 25, 15, 10,  0],
  [10, 15, 20, 30, 20, 15, 10],
  [10, 20, 25, 30, 25, 20, 10],
  [ 0, 35, 35, 15, 35, 35,  0],
  [ 0, 35, 35, 15, 35, 35,  0],
  [ 0, 35, 35, 15, 35, 35,  0],
  [ 0, 10, 10, 15, 10, 10,  0],
  [-5,  0,  0,  5,  0,  0, -5],
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
    bonus += 200;
  }
  if (hasElephant(color) && !hasRat(color) && hasRat(opponentColor)) {
    bonus -= 150;
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

function denProximityScore(board: JungleBoardState, color: PieceColor): number {
  const opponentColor = color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const opponentDen = opponentColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  const ownDen = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  let score = 0;

  for (const piece of board.pieces) {
    const rank = JUNGLE_PIECE_RANK[piece.type];
    if (piece.color === color) {
      const dist = manhattan(piece.position, opponentDen);
      score += (12 - dist) * rank * 3;
    } else {
      const dist = manhattan(piece.position, ownDen);
      score -= (12 - dist) * rank * 5;
    }
  }
  return score;
}

function threatRank(piece: JunglePiece): number {
  if (piece.type === JunglePieceType.ELEPHANT) return 3;
  if (piece.type === JunglePieceType.LION || piece.type === JunglePieceType.TIGER) return 2;
  return 1;
}

export function denShieldScore(board: JungleBoardState, color: PieceColor): number {
  const ownDen = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  const ownPieces = board.pieces.filter((p) => p.color === color);
  const enemyPieces = board.pieces.filter((p) => p.color !== color);

  let bestTtG = 99;
  for (const own of ownPieces) {
    const ttg = manhattan(own.position, ownDen);
    bestTtG = Math.min(bestTtG, ttg);
  }

  let score = 0;

  for (const enemy of enemyPieces) {
    const ttd = manhattan(enemy.position, ownDen);
    if (ttd > 10) continue;

    const gap = ttd - bestTtG;
    const tr = threatRank(enemy);

    if (gap <= -2) score -= 20000 * tr;
    else if (gap === -1) score -= 12000 * tr;
    else if (gap === 0) score -= 8000 * tr;
    else if (gap === 1) score -= 4000 * tr;
    else if (gap === 2) score -= 2000 * tr;
    else if (gap === 3) score -= 1000 * tr;
    else if (gap === 4) score -= 500 * tr;
    else if (gap === 5) score -= 250 * tr;
    else score -= gap * 80;
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
  const denScore = denProximityScore(board, aiColor) - denProximityScore(board, humanColor);
  const shieldScore = denShieldScore(board, aiColor) - denShieldScore(board, humanColor);
  const huntScore = ratHuntScore(board, aiColor) - ratHuntScore(board, humanColor);
  const blockScore = ratRiverBlockScore(board, aiColor) - ratRiverBlockScore(board, humanColor);

  return materialScore + pstScore + trapScore + denScore + shieldScore + huntScore + blockScore;
}

function isAdjacentToDen(pos: Position, den: Position): boolean {
  return manhattan(pos, den) === 1;
}

function isOnPath(from: Position, to: Position, pos: Position): boolean {
  if (pos.row === from.row && pos.col === from.col) return true;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  let r = from.row;
  let c = from.col;
  const sr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
  const sc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
  while (r !== to.row || c !== to.col) {
    if (r !== from.row || c !== from.col) {
      if (pos.row === r && pos.col === c) return true;
    }
    if (Math.abs(to.row - r) >= Math.abs(to.col - c)) {
      r += sr;
    } else {
      c += sc;
    }
  }
  return false;
}

function isGuardSquare(pos: Position, color: PieceColor): boolean {
  const guardSet = color === PieceColor.DARK ? DARK_GUARD_SET : LIGHT_GUARD_SET;
  return guardSet.has(posKey(pos));
}

export function moveOrderScore(move: JungleMove, board: JungleBoardState, aiColor: PieceColor): number {
  let score = 0;
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const humanDen = humanColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  const aiDen = aiColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;

  if (move.to.row === humanDen.row && move.to.col === humanDen.col) return 100000;

  if (move.type === JungleMoveType.CAPTURE) {
    const captured = board.pieces.find((p) => p.id === move.capturedPieceId);
    if (captured) score += 10000 + BASE_VALUES[captured.type];
  }

  const opponentTrapSet = aiColor === PieceColor.DARK ? LIGHT_TRAP_SET : DARK_TRAP_SET;
  if (opponentTrapSet.has(posKey(move.to))) score += 5000;

  const piece = board.pieces.find((p) => p.id === move.pieceId);
  if (!piece) return score;

  if (piece.type === JunglePieceType.RAT) {
    const enemyElephant = board.pieces.find(
      (p) => p.type === JunglePieceType.ELEPHANT && p.color !== piece.color,
    );
    if (enemyElephant) {
      const distBefore = manhattan(piece.position, enemyElephant.position);
      const distAfter = manhattan(move.to, enemyElephant.position);
      if (distAfter < distBefore && distAfter <= 4) score += 3000;
    }
  }

  if (piece.color === aiColor) {
    const enemyPieces = board.pieces.filter((p) => p.color === humanColor);
    let minTtD = 99;
    let threatId: string | null = null;
    let threatPos: Position | null = null;
    for (const t of enemyPieces) {
      const ttd = manhattan(t.position, aiDen);
      if (ttd < minTtD) {
        minTtD = ttd;
        threatId = t.id;
        threatPos = t.position;
      }
    }

    if (minTtD <= 6 && threatId && threatPos) {
      const ownPieces = board.pieces.filter((p) => p.color === aiColor);
      let bestTtG = 99;
      for (const own of ownPieces) {
        bestTtG = Math.min(bestTtG, manhattan(own.position, aiDen));
      }
      const gap = minTtD - bestTtG;

      if (move.type === JungleMoveType.CAPTURE && move.capturedPieceId === threatId) {
        score += 20000;
      }

      if (gap <= 4) {
        const fromIsGuard = isGuardSquare(piece.position, aiColor);
        const toIsGuard = isGuardSquare(move.to, aiColor);

        if (fromIsGuard && !toIsGuard) {
          score -= 10000;
        }

        if (isAdjacentToDen(move.to, aiDen) && !isAdjacentToDen(piece.position, aiDen)) {
          score += 12000;
        }

        if (isGuardSquare(move.to, aiColor) && !isGuardSquare(piece.position, aiColor)) {
          score += 8000;
        }

        const threatDistBefore = manhattan(threatPos, aiDen);
        let blockedBefore = false;
        for (const own of ownPieces) {
          if (isOnPath(threatPos, aiDen, own.position)) {
            blockedBefore = true;
            break;
          }
        }
        const otherOwnPieces = ownPieces.filter((p) => p.id !== piece.id);
        let blockedAfter = false;
        for (const own of otherOwnPieces) {
          if (isOnPath(threatPos, aiDen, own.position)) {
            blockedAfter = true;
            break;
          }
        }
        if (!isOnPath(threatPos, aiDen, move.to)) {
          // moving piece doesn't block the path
        } else {
          blockedAfter = true;
        }

        if (blockedBefore && !blockedAfter) {
          score -= 15000;
        }

        const pieceTtG = manhattan(piece.position, aiDen);
        const newTtG = manhattan(move.to, aiDen);

        let otherBestTtG = 99;
        for (const op of otherOwnPieces) {
          otherBestTtG = Math.min(otherBestTtG, manhattan(op.position, aiDen));
        }
        const newGap = minTtD - Math.min(otherBestTtG, newTtG);

        if (newGap < gap && newGap <= 2) {
          score += 10000;
        } else if (newGap < gap) {
          score += 5000;
        }
      }
    }

    const distBefore = manhattan(piece.position, humanDen);
    const distAfter = manhattan(move.to, humanDen);
    if (distAfter < distBefore) {
      score += (distBefore - distAfter) * 50 * JUNGLE_PIECE_RANK[piece.type];
    }
  } else {
    const distBefore = manhattan(piece.position, aiDen);
    const distAfter = manhattan(move.to, aiDen);
    if (distAfter < distBefore && distAfter <= 3) score += 2000;
  }

  return score;
}
