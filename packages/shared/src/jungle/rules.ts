import {
  type Position,
  PieceColor,
  posKey,
} from '../types/board';
import {
  type JungleBoardState,
  type JunglePiece,
  type JungleMove,
  type JungleGameResult,
  JunglePieceType,
  JungleMoveType,
  JUNGLE_PIECE_RANK,
} from './types';

let pieceIdCounter = 0;

function nextPieceId(): string {
  return `jl${++pieceIdCounter}`;
}

const COLS = 7;
const ROWS = 9;

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < ROWS && pos.col >= 0 && pos.col < COLS;
}

function opponentColor(color: PieceColor): PieceColor {
  return color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
}

const RIVER_CELLS = new Set<string>();
for (let r = 3; r <= 5; r++) {
  for (const c of [1, 2, 4, 5]) {
    RIVER_CELLS.add(`${r},${c}`);
  }
}

function isRiver(pos: Position): boolean {
  return RIVER_CELLS.has(`${pos.row},${pos.col}`);
}

const DARK_TRAPS: Position[] = [
  { row: 8, col: 2 },
  { row: 8, col: 4 },
  { row: 7, col: 3 },
];

const LIGHT_TRAPS: Position[] = [
  { row: 0, col: 2 },
  { row: 0, col: 4 },
  { row: 1, col: 3 },
];

const DARK_TRAP_SET = new Set(DARK_TRAPS.map((p) => posKey(p)));
const LIGHT_TRAP_SET = new Set(LIGHT_TRAPS.map((p) => posKey(p)));

const DARK_DEN: Position = { row: 8, col: 3 };
const LIGHT_DEN: Position = { row: 0, col: 3 };

function isTrap(pos: Position, color: PieceColor): boolean {
  const key = posKey(pos);
  if (color === PieceColor.DARK) return DARK_TRAP_SET.has(key);
  return LIGHT_TRAP_SET.has(key);
}

function isDen(pos: Position, color: PieceColor): boolean {
  if (color === PieceColor.DARK) return pos.row === DARK_DEN.row && pos.col === DARK_DEN.col;
  return pos.row === LIGHT_DEN.row && pos.col === LIGHT_DEN.col;
}

function buildJunglePieceMap(pieces: JunglePiece[]): Map<string, JunglePiece> {
  const map = new Map<string, JunglePiece>();
  for (const p of pieces) map.set(posKey(p.position), p);
  return map;
}

function isInRiver(piece: JunglePiece): boolean {
  return isRiver(piece.position);
}

function canCapture(
  attacker: JunglePiece,
  defender: JunglePiece,
  attackerInRiver: boolean,
  defenderInRiver: boolean,
): boolean {
  if (attacker.color === defender.color) return false;

  if (attackerInRiver !== defenderInRiver) return false;

  let attackerRank = JUNGLE_PIECE_RANK[attacker.type];
  let defenderRank = JUNGLE_PIECE_RANK[defender.type];

  const defenderOnAttackerTrap = isTrap(defender.position, attacker.color);
  if (defenderOnAttackerTrap) {
    defenderRank = 0;
  }

  const attackerOnDefenderTrap = isTrap(attacker.position, defender.color);
  if (attackerOnDefenderTrap) {
    attackerRank = 0;
  }

  if (attackerRank === 0 && defenderRank === 0) return true;

  if (attacker.type === JunglePieceType.RAT && defender.type === JunglePieceType.ELEPHANT) {
    if (attackerInRiver) return false;
    return true;
  }

  if (attacker.type === JunglePieceType.ELEPHANT && defender.type === JunglePieceType.RAT) {
    return false;
  }

  return attackerRank >= defenderRank;
}

const ORTHOGONAL = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function getLionTigerJumps(board: JungleBoardState, piece: JunglePiece): Position[] {
  const jumps: Position[] = [];
  const pieceMap = buildJunglePieceMap(board.pieces);

  for (const dir of ORTHOGONAL) {
    let r = piece.position.row + dir.dr;
    let c = piece.position.col + dir.dc;

    if (!inBounds({ row: r, col: c }) || !isRiver({ row: r, col: c })) continue;

    let blocked = false;
    while (inBounds({ row: r, col: c }) && isRiver({ row: r, col: c })) {
      const occupant = pieceMap.get(posKey({ row: r, col: c }));
      if (occupant && occupant.type === JunglePieceType.RAT) {
        blocked = true;
        break;
      }
      r += dir.dr;
      c += dir.dc;
    }

    if (blocked) continue;

    if (!inBounds({ row: r, col: c })) continue;

    const landing = { row: r, col: c };

    if (isDen(landing, piece.color)) continue;

    const target = pieceMap.get(posKey(landing));
    if (target) {
      if (target.color !== piece.color) {
        if (canCapture(piece, target, false, isInRiver(target))) {
          jumps.push(landing);
        }
      }
    } else {
      jumps.push(landing);
    }
  }

  return jumps;
}

export function createInitialJungleBoard(): JungleBoardState {
  pieceIdCounter = 0;
  const pieces: JunglePiece[] = [];

  const lightBack: [JunglePieceType, number, number][] = [
    [JunglePieceType.TIGER, 0, 0],
    [JunglePieceType.LION, 0, 6],
    [JunglePieceType.CAT, 1, 1],
    [JunglePieceType.DOG, 1, 5],
    [JunglePieceType.WOLF, 2, 0],
    [JunglePieceType.LEOPARD, 2, 2],
    [JunglePieceType.RAT, 2, 4],
    [JunglePieceType.ELEPHANT, 2, 6],
  ];

  for (const [type, row, col] of lightBack) {
    pieces.push({
      id: nextPieceId(),
      type,
      color: PieceColor.LIGHT,
      position: { row, col },
    });
  }

  const darkBack: [JunglePieceType, number, number][] = [
    [JunglePieceType.ELEPHANT, 6, 0],
    [JunglePieceType.LEOPARD, 6, 2],
    [JunglePieceType.WOLF, 6, 4],
    [JunglePieceType.RAT, 6, 6],
    [JunglePieceType.DOG, 7, 1],
    [JunglePieceType.CAT, 7, 5],
    [JunglePieceType.LION, 8, 0],
    [JunglePieceType.TIGER, 8, 6],
  ];

  for (const [type, row, col] of darkBack) {
    pieces.push({
      id: nextPieceId(),
      type,
      color: PieceColor.DARK,
      position: { row, col },
    });
  }

  return {
    size: 7,
    rows: 9,
    pieces,
    nextColor: PieceColor.DARK,
    halfMoveClock: 0,
  };
}

export function cloneJungleBoard(board: JungleBoardState): JungleBoardState {
  return {
    size: 7,
    rows: 9,
    pieces: board.pieces.map((p) => ({
      ...p,
      position: { ...p.position },
    })),
    nextColor: board.nextColor,
    halfMoveClock: board.halfMoveClock,
  };
}

export function getJungleValidMovesForPiece(
  board: JungleBoardState,
  pieceId: string,
): JungleMove[] {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) return [];

  const pieceMap = buildJunglePieceMap(board.pieces);
  const moves: JungleMove[] = [];
  const attackerInRiver = isInRiver(piece);

  if (
    piece.type === JunglePieceType.LION ||
    piece.type === JunglePieceType.TIGER
  ) {
    const jumps = getLionTigerJumps(board, piece);
    for (const landing of jumps) {
      const target = pieceMap.get(posKey(landing));
      if (target) {
        if (
          canCapture(piece, target, false, isInRiver(target))
        ) {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to: landing,
            type: JungleMoveType.CAPTURE,
            capturedPieceId: target.id,
          });
        }
      } else {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: landing,
          type: JungleMoveType.NORMAL,
          capturedPieceId: null,
        });
      }
    }
  }

  for (const dir of ORTHOGONAL) {
    const to: Position = {
      row: piece.position.row + dir.dr,
      col: piece.position.col + dir.dc,
    };

    if (!inBounds(to)) continue;

    if (isDen(to, piece.color)) continue;

    if (!attackerInRiver && isRiver(to)) {
      if (piece.type === JunglePieceType.RAT) {
        const target = pieceMap.get(posKey(to));
        if (target) {
          if (target.type === JunglePieceType.RAT && target.color !== piece.color) {
            moves.push({
              pieceId: piece.id,
              from: { ...piece.position },
              to,
              type: JungleMoveType.CAPTURE,
              capturedPieceId: target.id,
            });
          }
        } else {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to,
            type: JungleMoveType.NORMAL,
            capturedPieceId: null,
          });
        }
      }
      continue;
    }

    if (attackerInRiver && !isRiver(to)) {
      const target = pieceMap.get(posKey(to));
      if (target) {
        if (target.color !== piece.color && target.type === JunglePieceType.RAT) {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to,
            type: JungleMoveType.CAPTURE,
            capturedPieceId: target.id,
          });
        }
      } else {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to,
          type: JungleMoveType.NORMAL,
          capturedPieceId: null,
        });
      }
      continue;
    }

    if (attackerInRiver && isRiver(to)) {
      if (piece.type !== JunglePieceType.RAT) continue;
      const target = pieceMap.get(posKey(to));
      if (target) {
        if (target.type === JunglePieceType.RAT && target.color !== piece.color) {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to,
            type: JungleMoveType.CAPTURE,
            capturedPieceId: target.id,
          });
        }
      } else {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to,
          type: JungleMoveType.NORMAL,
          capturedPieceId: null,
        });
      }
      continue;
    }

    const target = pieceMap.get(posKey(to));
    if (target) {
      if (
        canCapture(piece, target, attackerInRiver, isInRiver(target))
      ) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to,
          type: JungleMoveType.CAPTURE,
          capturedPieceId: target.id,
        });
      }
    } else {
      moves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to,
        type: JungleMoveType.NORMAL,
        capturedPieceId: null,
      });
    }
  }

  return moves;
}

export function getAllJungleValidMoves(
  board: JungleBoardState,
  color: PieceColor,
): JungleMove[] {
  const moves: JungleMove[] = [];
  for (const piece of board.pieces) {
    if (piece.color !== color) continue;
    moves.push(...getJungleValidMovesForPiece(board, piece.id));
  }
  return moves;
}

export function isValidJungleMove(
  board: JungleBoardState,
  move: JungleMove,
  color: PieceColor,
): boolean {
  if (board.nextColor !== color) return false;
  const validMoves = getJungleValidMovesForPiece(board, move.pieceId);
  return validMoves.some(
    (m) =>
      m.pieceId === move.pieceId &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      m.type === move.type,
  );
}

export function applyJungleMove(
  board: JungleBoardState,
  move: JungleMove,
): JungleBoardState {
  const newBoard = cloneJungleBoard(board);

  const pieceIdx = newBoard.pieces.findIndex((p) => p.id === move.pieceId);
  if (pieceIdx === -1) return newBoard;

  newBoard.pieces[pieceIdx].position = { ...move.to };

  if (move.capturedPieceId) {
    const capturedIdx = newBoard.pieces.findIndex(
      (p) => p.id === move.capturedPieceId,
    );
    if (capturedIdx !== -1) {
      newBoard.pieces.splice(capturedIdx, 1);
    }
  }

  newBoard.nextColor = opponentColor(board.nextColor);

  if (move.type === JungleMoveType.CAPTURE) {
    newBoard.halfMoveClock = 0;
  } else {
    newBoard.halfMoveClock = board.halfMoveClock + 1;
  }

  return newBoard;
}

export function getJungleGameResult(
  board: JungleBoardState,
  currentColor: PieceColor,
): JungleGameResult | null {
  const opponent = opponentColor(currentColor);

  for (const piece of board.pieces) {
    if (piece.color === currentColor && isDen(piece.position, opponent)) {
      return { winner: currentColor, isDraw: false, reason: 'den_entered' };
    }
    if (piece.color === opponent && isDen(piece.position, currentColor)) {
      return { winner: opponent, isDraw: false, reason: 'den_entered' };
    }
  }

  const darkPieces = board.pieces.filter((p) => p.color === PieceColor.DARK);
  const lightPieces = board.pieces.filter((p) => p.color === PieceColor.LIGHT);

  if (darkPieces.length === 0) {
    return { winner: PieceColor.LIGHT, isDraw: false, reason: 'all_captured' };
  }
  if (lightPieces.length === 0) {
    return { winner: PieceColor.DARK, isDraw: false, reason: 'all_captured' };
  }

  const currentMoves = getAllJungleValidMoves(board, currentColor);
  if (currentMoves.length === 0) {
    return { winner: opponent, isDraw: false, reason: 'no_valid_moves' };
  }

  const opponentMoves = getAllJungleValidMoves(board, opponent);
  if (opponentMoves.length === 0) {
    return { winner: currentColor, isDraw: false, reason: 'no_valid_moves' };
  }

  if (board.halfMoveClock >= 100) {
    return { winner: null, isDraw: true, reason: 'fifty_move_rule' };
  }

  return null;
}
