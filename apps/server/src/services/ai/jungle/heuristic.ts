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
  [5, 10, 20, 30, 20, 10, 5],
  [10, 15, 25, 30, 25, 15, 10],
  [10, 20, 25, 30, 25, 20, 10],
  [5, 15, 20, 30, 20, 15, 5],
  [0, 5, 10, 25, 10, 5, 0],
  [-5, 0, 5, 20, 5, 0, -5],
  [-5, -5, 0, 5, 0, -5, -5],
  [-10, -5, -5, 0, -5, -5, -10],
  [5, 10, 20, 30, 20, 10, 5],
];

const LION_PST: number[][] = [
  [0, 5, 12, 15, 12, 5, 0],
  [10, 20, 30, 35, 30, 20, 10],
  [10, 20, 25, 25, 25, 20, 10],
  [5, 15, 15, 15, 15, 15, 5],
  [0, 10, 10, 8, 10, 10, 0],
  [0, 10, 10, 8, 10, 10, 0],
  [5, 12, 12, 10, 12, 12, 5],
  [0, 5, 5, 5, 5, 5, 0],
  [0, 5, 12, 15, 12, 5, 0],
];

const TIGER_PST: number[][] = LION_PST;

const LEOPARD_PST: number[][] = [
  [0, 5, 10, 15, 10, 5, 0],
  [5, 10, 15, 20, 15, 10, 5],
  [5, 10, 15, 20, 15, 10, 5],
  [0, 10, 15, 15, 15, 10, 0],
  [0, 5, 10, 15, 10, 5, 0],
  [0, 0, 5, 10, 5, 0, 0],
  [-5, 0, 0, 5, 0, 0, -5],
  [-5, -5, -5, 0, -5, -5, -5],
  [-10, -10, 0, -10, 0, -10, -10],
];

const DOG_PST: number[][] = [
  [0, 5, 8, 10, 8, 5, 0],
  [5, 8, 10, 12, 10, 8, 5],
  [5, 8, 10, 15, 10, 8, 5],
  [0, 5, 8, 10, 8, 5, 0],
  [0, 0, 5, 8, 5, 0, 0],
  [0, 0, 0, 5, 0, 0, 0],
  [-5, -5, 0, 0, 0, -5, -5],
  [-5, -5, -5, 5, -5, -5, -5],
  [-10, -10, 5, -10, 5, -10, -10],
];

const WOLF_PST: number[][] = DOG_PST;

const CAT_PST: number[][] = [
  [0, 3, 5, 8, 5, 3, 0],
  [3, 5, 8, 10, 8, 5, 3],
  [3, 5, 8, 10, 8, 5, 3],
  [0, 3, 5, 8, 5, 3, 0],
  [0, 0, 3, 5, 3, 0, 0],
  [0, 0, 0, 3, 0, 0, 0],
  [-5, -5, 0, 0, 0, -5, -5],
  [-5, -5, -5, 5, -5, -5, -5],
  [-8, -8, 0, -8, 0, -8, -8],
];

const RAT_PST: number[][] = [
  [0, 12, 18, 25, 18, 12, 0],
  [12, 18, 22, 30, 22, 18, 12],
  [12, 22, 28, 30, 28, 22, 12],
  [5, 38, 38, 18, 38, 38, 5],
  [5, 35, 35, 15, 35, 35, 5],
  [5, 32, 32, 15, 32, 32, 5],
  [0, 12, 12, 15, 12, 12, 0],
  [-5, 0, 2, 5, 2, 0, -5],
  [-10, -10, 0, -5, 0, -10, -10],
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
      score += rank * 80 * Math.max(0, 3 - d);
    } else {
      const d = Math.min(manhattan(piece.position, ownDen), 12);
      score -= rank * 45 * (12 - d);
      score -= rank * 400 * Math.max(0, 3 - d);
    }
  }
  return score;
}

function denShieldScore(board: JungleBoardState, color: PieceColor): number {
  const ownDen = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  let bestTtg = 99;

  for (const piece of board.pieces) {
    const dist = manhattan(piece.position, ownDen);
    if (piece.color === color && dist < bestTtg) {
      bestTtg = dist;
    }
  }

  let score = 0;

  for (const enemy of board.pieces) {
    if (enemy.color === color) continue;
    const ttd = manhattan(enemy.position, ownDen);
    if (ttd > 10) continue;

    const gap = ttd - bestTtg;
    const tr = JUNGLE_PIECE_RANK[enemy.type];

    if (gap <= -2) score -= 1500 * tr;
    else if (gap === -1) score -= 900 * tr;
    else if (gap === 0) score -= 600 * tr;
    else if (gap === 1) score -= 300 * tr;
    else if (gap === 2) score -= 150 * tr;
    else if (gap === 3) score -= 75 * tr;
    else if (gap === 4) score -= 40 * tr;
    else if (gap === 5) score -= 20 * tr;
    else score += gap * 8;
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

function urgentDenThreat(board: JungleBoardState, aiColor: PieceColor): number {
  const ownDen = aiColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  const opponentColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  let score = 0;

  for (const enemy of board.pieces) {
    if (enemy.color !== opponentColor) continue;
    const d = manhattan(enemy.position, ownDen);
    if (d === 1) {
      const validMoves = getValidMovesForPiece(board, enemy, opponentColor);
      if (validMoves.some((m) => m.to.row === ownDen.row && m.to.col === ownDen.col)) {
        score -= 8000 * JUNGLE_PIECE_RANK[enemy.type];
      }
    } else if (d === 2) {
      for (const dir of ORTHOGONAL) {
        const nr = enemy.position.row + dir.dr;
        const nc = enemy.position.col + dir.dc;
        if (!inBounds({ row: nr, col: nc })) continue;
        const next: Position = { row: nr, col: nc };
        if (manhattan(next, ownDen) !== 1) continue;
        const occupied = board.pieces.some(
          (p) => p.position.row === next.row && p.position.col === next.col,
        );
        if (occupied) continue;
        const testBoard = applyJungleMoveForEval(board, enemy, next);
        const movedPiece = testBoard.pieces.find(
          (p) => p.id === enemy.id,
        );
        if (movedPiece) {
          const validMoves = getValidMovesForPiece(testBoard, movedPiece, opponentColor);
          if (validMoves.some((m) => m.to.row === ownDen.row && m.to.col === ownDen.col)) {
            score -= 4000 * JUNGLE_PIECE_RANK[enemy.type];
          }
        }
      }
    }
  }

  return score;
}

function getValidMovesForPiece(
  board: JungleBoardState,
  piece: JunglePiece,
  color: PieceColor,
): JungleMove[] {
  const moves: JungleMove[] = [];
  for (const dir of ORTHOGONAL) {
    const nr = piece.position.row + dir.dr;
    const nc = piece.position.col + dir.dc;
    if (!inBounds({ row: nr, col: nc })) continue;
    const to: Position = { row: nr, col: nc };
    if (isRiver(to) && piece.type !== JunglePieceType.RAT) continue;
    if (
      piece.type !== JunglePieceType.RAT &&
      piece.position.row >= 3 &&
      piece.position.row <= 5 &&
      isRiver(piece.position)
    ) {
      if (!isRiver(to)) {
      } else {
        continue;
      }
    }
    const ownDen = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
    if (to.row === ownDen.row && to.col === ownDen.col) continue;
    const target = board.pieces.find(
      (p) => p.position.row === to.row && p.position.col === to.col,
    );
    if (!target) {
      moves.push({
        pieceId: piece.id,
        from: piece.position,
        to,
        type: JungleMoveType.NORMAL,
        capturedPieceId: null,
      });
    } else if (target.color !== color) {
      const attackerRank = JUNGLE_PIECE_RANK[piece.type];
      const defenderRank = JUNGLE_PIECE_RANK[target.type];
      const opponentTrapSet =
        color === PieceColor.DARK ? LIGHT_TRAP_SET : DARK_TRAP_SET;
      const isTargetTrapped = opponentTrapSet.has(posKey(target.position));
      if (isTargetTrapped || attackerRank >= defenderRank) {
        if (piece.type === JunglePieceType.ELEPHANT && target.type === JunglePieceType.RAT)
          continue;
        if (piece.type === JunglePieceType.RAT && target.type === JunglePieceType.ELEPHANT) {
          if (isRiver(piece.position) && !isRiver(target.position)) continue;
        }
        moves.push({
          pieceId: piece.id,
          from: piece.position,
          to,
          type: JungleMoveType.CAPTURE,
          capturedPieceId: target.id,
        });
      }
    }
  }
  if (
    piece.type === JunglePieceType.LION ||
    piece.type === JunglePieceType.TIGER
  ) {
    for (const dir of ORTHOGONAL) {
      let r = piece.position.row + dir.dr;
      let c = piece.position.col + dir.dc;
      if (!inBounds({ row: r, col: c }) || !isRiver({ row: r, col: c })) continue;
      let blocked = false;
      while (inBounds({ row: r, col: c }) && isRiver({ row: r, col: c })) {
        if (
          board.pieces.some(
            (p) =>
              p.position.row === r &&
              p.position.col === c &&
              p.type === JunglePieceType.RAT,
          )
        ) {
          blocked = true;
          break;
        }
        r += dir.dr;
        c += dir.dc;
      }
      if (blocked || !inBounds({ row: r, col: c })) continue;
      const landing: Position = { row: r, col: c };
      const ownDen = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
      if (landing.row === ownDen.row && landing.col === ownDen.col) continue;
      const target = board.pieces.find(
        (p) => p.position.row === landing.row && p.position.col === landing.col,
      );
      if (!target) {
        moves.push({
          pieceId: piece.id,
          from: piece.position,
          to: landing,
          type: JungleMoveType.NORMAL,
          capturedPieceId: null,
        });
      } else if (target.color !== color) {
        const attackerRank = JUNGLE_PIECE_RANK[piece.type];
        const defenderRank = JUNGLE_PIECE_RANK[target.type];
        const opponentTrapSet =
          color === PieceColor.DARK ? LIGHT_TRAP_SET : DARK_TRAP_SET;
        const isTargetTrapped = opponentTrapSet.has(posKey(target.position));
        if (isTargetTrapped || attackerRank >= defenderRank) {
          moves.push({
            pieceId: piece.id,
            from: piece.position,
            to: landing,
            type: JungleMoveType.CAPTURE,
            capturedPieceId: target.id,
          });
        }
      }
    }
  }
  return moves;
}

function applyJungleMoveForEval(
  board: JungleBoardState,
  piece: JunglePiece,
  to: Position,
): JungleBoardState {
  const newPieces = board.pieces.map((p) => {
    if (p.id === piece.id) {
      return { ...p, position: to };
    }
    if (p.position.row === to.row && p.position.col === to.col) {
      return null;
    }
    return p;
  }).filter(Boolean) as JunglePiece[];
  return { ...board, pieces: newPieces };
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

  const denScore = denProximityScore(board, aiColor);
  const huntScore = ratHuntScore(board, aiColor) - ratHuntScore(board, humanColor);
  const blockScore = ratRiverBlockScore(board, aiColor) - ratRiverBlockScore(board, humanColor);
  const urgentScore = urgentDenThreat(board, aiColor);

  return materialScore + pstScore + denScore + huntScore + blockScore + urgentScore;
}

function isGuardSquare(pos: Position, color: PieceColor): boolean {
  const den = color === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  return manhattan(pos, den) <= 2;
}

function isAdjacentToDen(pos: Position, den: Position): boolean {
  return manhattan(pos, den) === 1;
}

function isOnPath(from: Position, to: Position, pos: Position): boolean {
  if (pos.row === from.row && pos.col === from.col) return true;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const sr = dr === 0 ? 0 : dr > 0 ? 1 : -1;
  const sc = dc === 0 ? 0 : dc > 0 ? 1 : -1;
  let r = from.row;
  let c = from.col;
  while (r !== to.row || c !== to.col) {
    if (r !== from.row || c !== from.col) {
      if (pos.row === r && pos.col === c) return true;
    }
    if (Math.abs(to.row - r) >= Math.abs(to.col - c)) r += sr;
    else c += sc;
  }
  return false;
}

export function moveOrderScore(move: JungleMove, board: JungleBoardState, aiColor: PieceColor): number {
  let score = 0;
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const humanDen = humanColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;
  const aiDen = aiColor === PieceColor.DARK ? DARK_DEN : LIGHT_DEN;

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

  const enemyPieces = board.pieces.filter((p) => p.color !== aiColor);
  let minTtd = 99;
  let threatPos: Position | null = null;
  for (const t of enemyPieces) {
    const ttd = manhattan(t.position, aiDen);
    if (ttd < minTtd) {
      minTtd = ttd;
      threatPos = t.position;
    }
  }

  const ownPieces = board.pieces.filter((p) => p.color === aiColor);
  const bestTtg = ownPieces.reduce((min, p) => Math.min(min, manhattan(p.position, aiDen)), 99);

  if (move.type === JungleMoveType.CAPTURE && threatPos) {
    const captured = board.pieces.find((p) => p.id === move.capturedPieceId);
    if (captured && captured.position.row === threatPos.row && captured.position.col === threatPos.col) {
      score += 25000;
    }
  }

  const denUnderThreat = minTtd <= 3;

  if (denUnderThreat || bestTtg <= 3 || manhattan(piece.position, aiDen) <= 3) {
    const gap = minTtd - bestTtg;
    const fromDistDen = manhattan(piece.position, aiDen);
    const toDistDen = manhattan(move.to, aiDen);

    if (fromDistDen <= 2 && toDistDen > 2 && gap <= 2) {
      if (threatPos && manhattan(move.to, threatPos) < manhattan(piece.position, threatPos)) {
        score += 8000;
      } else {
        score -= 20000;
      }
    }

    if (toDistDen === 1 && fromDistDen > 1 && denUnderThreat) {
      const nearThreat = threatPos && manhattan(move.to, threatPos) <= 2;
      if (nearThreat) {
        score += 20000;
      } else {
        score += 2000;
      }
    }

    if (toDistDen <= 2 && fromDistDen > 2 && denUnderThreat) {
      const nearThreat = threatPos && manhattan(move.to, threatPos) <= 3;
      if (nearThreat) {
        score += 12000;
      } else {
        score += 1000;
      }
    }

    if (threatPos) {
      const toDistThreat = manhattan(move.to, threatPos);
      if (toDistThreat === 1) {
        const enemyAtThreat = enemyPieces.find(
          (p) => p.position.row === threatPos!.row && p.position.col === threatPos!.col,
        );
        if (enemyAtThreat && JUNGLE_PIECE_RANK[piece.type] >= JUNGLE_PIECE_RANK[enemyAtThreat.type]) {
          score += 18000;
        }
      }

      const otherOwn = ownPieces.filter((p) => p.id !== piece.id).map((p) => p.position);
      const blockedBefore = [...otherOwn, piece.position].some((op) => isOnPath(threatPos!, aiDen, op));
      const blockedAfter = [...otherOwn, move.to].some((op) => isOnPath(threatPos!, aiDen, op));

      if (blockedBefore && !blockedAfter) {
        score -= 15000;
      }
      if (!blockedBefore && blockedAfter) {
        score += 10000;
      }
    }
  }

  const distBefore = manhattan(piece.position, humanDen);
  const distAfter = manhattan(move.to, humanDen);
  if (distAfter < distBefore) {
    const base = (distBefore - distAfter) * 50 * JUNGLE_PIECE_RANK[piece.type];
    if (manhattan(piece.position, aiDen) <= 2 && manhattan(move.to, aiDen) > 2) {
      score += Math.floor(base / 3);
    } else {
      score += base;
    }
  }

  if (isRiver(move.to) && piece.type !== JunglePieceType.RAT) {
    score -= 1000;
  }

  return score;
}
