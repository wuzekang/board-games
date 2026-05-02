import {
  type Position,
  PieceColor,
  posKey,
  buildPieceMap,
} from '../types/board';
import {
  type ChineseChessBoardState,
  type ChineseChessPiece,
  type ChineseChessMove,
  type ChineseChessGameResult,
  ChineseChessPieceType,
  ChineseChessMoveType,
} from './types';

let pieceIdCounter = 0;

function nextPieceId(): string {
  return `xq${++pieceIdCounter}`;
}

const ROWS = 10;
const COLS = 9;

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < ROWS && pos.col >= 0 && pos.col < COLS;
}

function opponentColor(color: PieceColor): PieceColor {
  return color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
}

function inPalace(pos: Position, color: PieceColor): boolean {
  if (pos.col < 3 || pos.col > 5) return false;
  if (color === PieceColor.LIGHT) return pos.row >= 0 && pos.row <= 2;
  return pos.row >= 7 && pos.row <= 9;
}

function onOwnSide(pos: Position, color: PieceColor): boolean {
  if (color === PieceColor.DARK) return pos.row >= 5;
  return pos.row <= 4;
}

function buildXiangqiPieceMap(pieces: ChineseChessPiece[]): Map<string, ChineseChessPiece> {
  const map = new Map<string, ChineseChessPiece>();
  for (const p of pieces) map.set(posKey(p.position), p);
  return map;
}

export function createInitialChineseChessBoard(): ChineseChessBoardState {
  pieceIdCounter = 0;
  const pieces: ChineseChessPiece[] = [];

  const backRank: ChineseChessPieceType[] = [
    ChineseChessPieceType.ROOK,
    ChineseChessPieceType.HORSE,
    ChineseChessPieceType.ELEPHANT,
    ChineseChessPieceType.ADVISOR,
    ChineseChessPieceType.KING,
    ChineseChessPieceType.ADVISOR,
    ChineseChessPieceType.ELEPHANT,
    ChineseChessPieceType.HORSE,
    ChineseChessPieceType.ROOK,
  ];

  for (let col = 0; col < 9; col++) {
    pieces.push({
      id: nextPieceId(),
      type: backRank[col],
      color: PieceColor.LIGHT,
      position: { row: 0, col },
    });
  }

  pieces.push({
    id: nextPieceId(),
    type: ChineseChessPieceType.CANNON,
    color: PieceColor.LIGHT,
    position: { row: 2, col: 1 },
  });
  pieces.push({
    id: nextPieceId(),
    type: ChineseChessPieceType.CANNON,
    color: PieceColor.LIGHT,
    position: { row: 2, col: 7 },
  });

  for (let col = 0; col < 9; col += 2) {
    pieces.push({
      id: nextPieceId(),
      type: ChineseChessPieceType.PAWN,
      color: PieceColor.LIGHT,
      position: { row: 3, col },
    });
  }

  for (let col = 0; col < 9; col++) {
    pieces.push({
      id: nextPieceId(),
      type: backRank[col],
      color: PieceColor.DARK,
      position: { row: 9, col },
    });
  }

  pieces.push({
    id: nextPieceId(),
    type: ChineseChessPieceType.CANNON,
    color: PieceColor.DARK,
    position: { row: 7, col: 1 },
  });
  pieces.push({
    id: nextPieceId(),
    type: ChineseChessPieceType.CANNON,
    color: PieceColor.DARK,
    position: { row: 7, col: 7 },
  });

  for (let col = 0; col < 9; col += 2) {
    pieces.push({
      id: nextPieceId(),
      type: ChineseChessPieceType.PAWN,
      color: PieceColor.DARK,
      position: { row: 6, col },
    });
  }

  return {
    size: 10,
    pieces,
    nextColor: PieceColor.DARK,
    halfMoveClock: 0,
  };
}

export function cloneChineseChessBoard(board: ChineseChessBoardState): ChineseChessBoardState {
  return {
    size: 10,
    pieces: board.pieces.map((p) => ({
      ...p,
      position: { ...p.position },
    })),
    nextColor: board.nextColor,
    halfMoveClock: board.halfMoveClock,
  };
}

const KING_OFFSETS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

const ADVISOR_OFFSETS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

const ELEPHANT_MOVES = [
  { dr: -2, dc: -2, lr: -1, lc: -1 },
  { dr: -2, dc: 2, lr: -1, lc: 1 },
  { dr: 2, dc: -2, lr: 1, lc: -1 },
  { dr: 2, dc: 2, lr: 1, lc: 1 },
];

const HORSE_MOVES = [
  { dr: -2, dc: -1, lr: -1, lc: 0 },
  { dr: -2, dc: 1, lr: -1, lc: 0 },
  { dr: 2, dc: -1, lr: 1, lc: 0 },
  { dr: 2, dc: 1, lr: 1, lc: 0 },
  { dr: -1, dc: -2, lr: 0, lc: -1 },
  { dr: 1, dc: -2, lr: 0, lc: -1 },
  { dr: -1, dc: 2, lr: 0, lc: 1 },
  { dr: 1, dc: 2, lr: 0, lc: 1 },
];

const ROOK_DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function addMoveIfValid(
  moves: ChineseChessMove[],
  piece: ChineseChessPiece,
  to: Position,
  pieceMap: Map<string, ChineseChessPiece>,
): void {
  if (!inBounds(to)) return;
  const target = pieceMap.get(posKey(to));
  if (target) {
    if (target.color !== piece.color) {
      moves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to,
        type: ChineseChessMoveType.CAPTURE,
        capturedPieceId: target.id,
      });
    }
    return;
  }
  moves.push({
    pieceId: piece.id,
    from: { ...piece.position },
    to,
    type: ChineseChessMoveType.NORMAL,
    capturedPieceId: null,
  });
}

function generateKingMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const off of KING_OFFSETS) {
    const to: Position = {
      row: piece.position.row + off.dr,
      col: piece.position.col + off.dc,
    };
    if (!inBounds(to) || !inPalace(to, piece.color)) continue;
    addMoveIfValid(moves, piece, to, pieceMap);
  }
  return moves;
}

function generateAdvisorMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const off of ADVISOR_OFFSETS) {
    const to: Position = {
      row: piece.position.row + off.dr,
      col: piece.position.col + off.dc,
    };
    if (!inBounds(to) || !inPalace(to, piece.color)) continue;
    addMoveIfValid(moves, piece, to, pieceMap);
  }
  return moves;
}

function generateElephantMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const em of ELEPHANT_MOVES) {
    const to: Position = {
      row: piece.position.row + em.dr,
      col: piece.position.col + em.dc,
    };
    if (!inBounds(to)) continue;
    if (!onOwnSide(to, piece.color)) continue;
    const legPos: Position = {
      row: piece.position.row + em.lr,
      col: piece.position.col + em.lc,
    };
    if (pieceMap.has(posKey(legPos))) continue;
    addMoveIfValid(moves, piece, to, pieceMap);
  }
  return moves;
}

function generateHorseMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const hm of HORSE_MOVES) {
    const to: Position = {
      row: piece.position.row + hm.dr,
      col: piece.position.col + hm.dc,
    };
    if (!inBounds(to)) continue;
    const legPos: Position = {
      row: piece.position.row + hm.lr,
      col: piece.position.col + hm.lc,
    };
    if (pieceMap.has(posKey(legPos))) continue;
    addMoveIfValid(moves, piece, to, pieceMap);
  }
  return moves;
}

function generateRookMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const dir of ROOK_DIRS) {
    let r = piece.position.row + dir.dr;
    let c = piece.position.col + dir.dc;
    while (inBounds({ row: r, col: c })) {
      const pos: Position = { row: r, col: c };
      const target = pieceMap.get(posKey(pos));
      if (target) {
        if (target.color !== piece.color) {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to: pos,
            type: ChineseChessMoveType.CAPTURE,
            capturedPieceId: target.id,
          });
        }
        break;
      }
      moves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to: pos,
        type: ChineseChessMoveType.NORMAL,
        capturedPieceId: null,
      });
      r += dir.dr;
      c += dir.dc;
    }
  }
  return moves;
}

function generateCannonMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const dir of ROOK_DIRS) {
    let r = piece.position.row + dir.dr;
    let c = piece.position.col + dir.dc;
    let screenFound = false;
    while (inBounds({ row: r, col: c })) {
      const pos: Position = { row: r, col: c };
      const target = pieceMap.get(posKey(pos));
      if (!screenFound) {
        if (target) {
          screenFound = true;
        } else {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to: pos,
            type: ChineseChessMoveType.NORMAL,
            capturedPieceId: null,
          });
        }
      } else {
        if (target) {
          if (target.color !== piece.color) {
            moves.push({
              pieceId: piece.id,
              from: { ...piece.position },
              to: pos,
              type: ChineseChessMoveType.CAPTURE,
              capturedPieceId: target.id,
            });
          }
          break;
        }
      }
      r += dir.dr;
      c += dir.dc;
    }
  }
  return moves;
}

function generatePawnMoves(
  piece: ChineseChessPiece,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  const forward = piece.color === PieceColor.DARK ? -1 : 1;
  const crossed = !onOwnSide(piece.position, piece.color);

  const fwd: Position = {
    row: piece.position.row + forward,
    col: piece.position.col,
  };
  if (inBounds(fwd)) {
    addMoveIfValid(moves, piece, fwd, pieceMap);
  }

  if (crossed) {
    for (const dc of [-1, 1]) {
      const side: Position = {
        row: piece.position.row,
        col: piece.position.col + dc,
      };
      if (inBounds(side)) {
        addMoveIfValid(moves, piece, side, pieceMap);
      }
    }
  }

  return moves;
}

function generatePseudoLegalMoves(
  piece: ChineseChessPiece,
  board: ChineseChessBoardState,
  pieceMap: Map<string, ChineseChessPiece>,
): ChineseChessMove[] {
  switch (piece.type) {
    case ChineseChessPieceType.KING:
      return generateKingMoves(piece, pieceMap);
    case ChineseChessPieceType.ADVISOR:
      return generateAdvisorMoves(piece, pieceMap);
    case ChineseChessPieceType.ELEPHANT:
      return generateElephantMoves(piece, pieceMap);
    case ChineseChessPieceType.HORSE:
      return generateHorseMoves(piece, pieceMap);
    case ChineseChessPieceType.ROOK:
      return generateRookMoves(piece, pieceMap);
    case ChineseChessPieceType.CANNON:
      return generateCannonMoves(piece, pieceMap);
    case ChineseChessPieceType.PAWN:
      return generatePawnMoves(piece, pieceMap);
    default:
      return [];
  }
}

function isKingsFacing(board: ChineseChessBoardState): boolean {
  const darkKing = board.pieces.find(
    (p) => p.type === ChineseChessPieceType.KING && p.color === PieceColor.DARK,
  );
  const lightKing = board.pieces.find(
    (p) => p.type === ChineseChessPieceType.KING && p.color === PieceColor.LIGHT,
  );
  if (!darkKing || !lightKing) return false;
  if (darkKing.position.col !== lightKing.position.col) return false;

  const pieceMap = buildXiangqiPieceMap(board.pieces);
  const minRow = Math.min(darkKing.position.row, lightKing.position.row);
  const maxRow = Math.max(darkKing.position.row, lightKing.position.row);
  for (let r = minRow + 1; r < maxRow; r++) {
    if (pieceMap.has(posKey({ row: r, col: darkKing.position.col }))) {
      return false;
    }
  }
  return true;
}

function isSquareAttackedBy(
  board: ChineseChessBoardState,
  pos: Position,
  attackerColor: PieceColor,
): boolean {
  const pieceMap = buildXiangqiPieceMap(board.pieces);

  for (const piece of board.pieces) {
    if (piece.color !== attackerColor) continue;

    switch (piece.type) {
      case ChineseChessPieceType.KING: {
        for (const off of KING_OFFSETS) {
          const aPos: Position = {
            row: piece.position.row + off.dr,
            col: piece.position.col + off.dc,
          };
          if (aPos.row === pos.row && aPos.col === pos.col && inPalace(aPos, piece.color)) {
            return true;
          }
        }
        break;
      }

      case ChineseChessPieceType.ADVISOR: {
        for (const off of ADVISOR_OFFSETS) {
          const aPos: Position = {
            row: piece.position.row + off.dr,
            col: piece.position.col + off.dc,
          };
          if (aPos.row === pos.row && aPos.col === pos.col && inPalace(aPos, piece.color)) {
            return true;
          }
        }
        break;
      }

      case ChineseChessPieceType.ELEPHANT: {
        for (const em of ELEPHANT_MOVES) {
          const to: Position = {
            row: piece.position.row + em.dr,
            col: piece.position.col + em.dc,
          };
          if (to.row !== pos.row || to.col !== pos.col) continue;
          if (!onOwnSide(to, piece.color)) continue;
          const legPos: Position = {
            row: piece.position.row + em.lr,
            col: piece.position.col + em.lc,
          };
          if (pieceMap.has(posKey(legPos))) continue;
          return true;
        }
        break;
      }

      case ChineseChessPieceType.HORSE: {
        for (const hm of HORSE_MOVES) {
          const to: Position = {
            row: piece.position.row + hm.dr,
            col: piece.position.col + hm.dc,
          };
          if (to.row !== pos.row || to.col !== pos.col) continue;
          const legPos: Position = {
            row: piece.position.row + hm.lr,
            col: piece.position.col + hm.lc,
          };
          if (pieceMap.has(posKey(legPos))) continue;
          return true;
        }
        break;
      }

      case ChineseChessPieceType.ROOK: {
        for (const dir of ROOK_DIRS) {
          let r = piece.position.row + dir.dr;
          let c = piece.position.col + dir.dc;
          while (inBounds({ row: r, col: c })) {
            if (r === pos.row && c === pos.col) return true;
            if (pieceMap.has(posKey({ row: r, col: c }))) break;
            r += dir.dr;
            c += dir.dc;
          }
        }
        break;
      }

      case ChineseChessPieceType.CANNON: {
        for (const dir of ROOK_DIRS) {
          let r = piece.position.row + dir.dr;
          let c = piece.position.col + dir.dc;
          let screenFound = false;
          while (inBounds({ row: r, col: c })) {
            const curPos: Position = { row: r, col: c };
            if (!screenFound) {
              if (pieceMap.has(posKey(curPos))) {
                screenFound = true;
              }
            } else {
              if (r === pos.row && c === pos.col && pieceMap.has(posKey(curPos))) {
                return true;
              }
              if (pieceMap.has(posKey(curPos))) break;
            }
            r += dir.dr;
            c += dir.dc;
          }
        }
        break;
      }

      case ChineseChessPieceType.PAWN: {
        const forward = piece.color === PieceColor.DARK ? -1 : 1;
        const fwdPos: Position = {
          row: piece.position.row + forward,
          col: piece.position.col,
        };
        if (fwdPos.row === pos.row && fwdPos.col === pos.col && inBounds(fwdPos)) {
          return true;
        }
        const crossed = !onOwnSide(piece.position, piece.color);
        if (crossed) {
          for (const dc of [-1, 1]) {
            const sidePos: Position = {
              row: piece.position.row,
              col: piece.position.col + dc,
            };
            if (sidePos.row === pos.row && sidePos.col === pos.col && inBounds(sidePos)) {
              return true;
            }
          }
        }
        break;
      }
    }
  }

  return false;
}

export function isInCheck(board: ChineseChessBoardState, color: PieceColor): boolean {
  const king = board.pieces.find(
    (p) => p.type === ChineseChessPieceType.KING && p.color === color,
  );
  if (!king) return false;
  return isSquareAttackedBy(board, king.position, opponentColor(color));
}

export function applyChineseChessMove(
  board: ChineseChessBoardState,
  move: ChineseChessMove,
): ChineseChessBoardState {
  const newBoard = cloneChineseChessBoard(board);

  const pieceIdx = newBoard.pieces.findIndex((p) => p.id === move.pieceId);
  if (pieceIdx === -1) return newBoard;

  newBoard.pieces[pieceIdx].position = { ...move.to };

  if (move.capturedPieceId) {
    const capturedIdx = newBoard.pieces.findIndex((p) => p.id === move.capturedPieceId);
    if (capturedIdx !== -1) {
      newBoard.pieces.splice(capturedIdx, 1);
    }
  }

  newBoard.nextColor = opponentColor(board.nextColor);

  if (move.type === ChineseChessMoveType.CAPTURE) {
    newBoard.halfMoveClock = 0;
  } else {
    newBoard.halfMoveClock = board.halfMoveClock + 1;
  }

  return newBoard;
}

export function getValidMovesForPiece(
  board: ChineseChessBoardState,
  pieceId: string,
): ChineseChessMove[] {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) return [];

  const pieceMap = buildXiangqiPieceMap(board.pieces);
  const pseudoLegal = generatePseudoLegalMoves(piece, board, pieceMap);

  return pseudoLegal.filter((move) => {
    const newBoard = applyChineseChessMove(board, move);
    return !isInCheck(newBoard, piece.color) && !isKingsFacing(newBoard);
  });
}

export function getAllValidMoves(
  board: ChineseChessBoardState,
  color: PieceColor,
): ChineseChessMove[] {
  const moves: ChineseChessMove[] = [];
  for (const piece of board.pieces) {
    if (piece.color !== color) continue;
    moves.push(...getValidMovesForPiece(board, piece.id));
  }
  return moves;
}

export function isValidChineseChessMove(
  board: ChineseChessBoardState,
  move: ChineseChessMove,
  color: PieceColor,
): boolean {
  if (board.nextColor !== color) return false;
  const validMoves = getAllValidMoves(board, color);
  return validMoves.some(
    (m) =>
      m.pieceId === move.pieceId &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      m.type === move.type,
  );
}

export function getChineseChessGameResult(
  board: ChineseChessBoardState,
  currentColor: PieceColor,
): ChineseChessGameResult | null {
  const allMoves = getAllValidMoves(board, currentColor);
  const inCheck = isInCheck(board, currentColor);

  if (allMoves.length === 0) {
    if (inCheck) {
      return {
        winner: opponentColor(currentColor),
        isDraw: false,
        reason: 'checkmate',
      };
    } else {
      return {
        winner: opponentColor(currentColor),
        isDraw: false,
        reason: 'stalemate',
      };
    }
  }

  if (board.halfMoveClock >= 120) {
    return {
      winner: null,
      isDraw: true,
      reason: 'sixty_move_rule',
    };
  }

  return null;
}
