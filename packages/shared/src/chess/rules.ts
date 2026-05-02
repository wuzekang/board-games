import {
  type Position,
  PieceColor,
  posKey,
  buildPieceMap,
} from '../types/board';
import {
  type ChessBoardState,
  type ChessPiece,
  type ChessMove,
  type ChessGameResult,
  ChessPieceType,
  ChessMoveType,
} from './types';

let pieceIdCounter = 0;

function nextPieceId(): string {
  return `cp${++pieceIdCounter}`;
}

export function createInitialChessBoard(): ChessBoardState {
  pieceIdCounter = 0;
  const pieces: ChessPiece[] = [];

  const backRank: ChessPieceType[] = [
    ChessPieceType.ROOK,
    ChessPieceType.KNIGHT,
    ChessPieceType.BISHOP,
    ChessPieceType.QUEEN,
    ChessPieceType.KING,
    ChessPieceType.BISHOP,
    ChessPieceType.KNIGHT,
    ChessPieceType.ROOK,
  ];

  for (let col = 0; col < 8; col++) {
    pieces.push({
      id: nextPieceId(),
      type: backRank[col],
      color: PieceColor.LIGHT,
      position: { row: 0, col },
      hasMoved: false,
    });
    pieces.push({
      id: nextPieceId(),
      type: ChessPieceType.PAWN,
      color: PieceColor.LIGHT,
      position: { row: 1, col },
      hasMoved: false,
    });
    pieces.push({
      id: nextPieceId(),
      type: ChessPieceType.PAWN,
      color: PieceColor.DARK,
      position: { row: 6, col },
      hasMoved: false,
    });
    pieces.push({
      id: nextPieceId(),
      type: backRank[col],
      color: PieceColor.DARK,
      position: { row: 7, col },
      hasMoved: false,
    });
  }

  return {
    size: 8,
    pieces,
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
  };
}

export function cloneChessBoard(board: ChessBoardState): ChessBoardState {
  return {
    size: 8,
    pieces: board.pieces.map((p) => ({
      ...p,
      position: { ...p.position },
    })),
    enPassantTarget: board.enPassantTarget
      ? { ...board.enPassantTarget }
      : null,
    halfMoveClock: board.halfMoveClock,
    fullMoveNumber: board.fullMoveNumber,
  };
}

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

function opponentColor(color: PieceColor): PieceColor {
  return color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
}

function buildChessPieceMap(
  pieces: ChessPiece[],
): Map<string, ChessPiece> {
  const map = new Map<string, ChessPiece>();
  for (const p of pieces) map.set(posKey(p.position), p);
  return map;
}

const KNIGHT_OFFSETS = [
  { dr: -2, dc: -1 },
  { dr: -2, dc: 1 },
  { dr: -1, dc: -2 },
  { dr: -1, dc: 2 },
  { dr: 1, dc: -2 },
  { dr: 1, dc: 2 },
  { dr: 2, dc: -1 },
  { dr: 2, dc: 1 },
];

const KING_OFFSETS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
];

const BISHOP_DIRS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

const ROOK_DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

function pawnForwardDir(color: PieceColor): number {
  return color === PieceColor.LIGHT ? 1 : -1;
}

function pawnStartRow(color: PieceColor): number {
  return color === PieceColor.LIGHT ? 1 : 6;
}

function promotionRow(color: PieceColor): number {
  return color === PieceColor.LIGHT ? 7 : 0;
}

function generatePawnMoves(
  piece: ChessPiece,
  pieceMap: Map<string, ChessPiece>,
  enPassantTarget: Position | null,
): ChessMove[] {
  const moves: ChessMove[] = [];
  const dir = pawnForwardDir(piece.color);
  const startRow = pawnStartRow(piece.color);
  const promoRow = promotionRow(piece.color);

  const oneStep: Position = {
    row: piece.position.row + dir,
    col: piece.position.col,
  };
  if (inBounds(oneStep) && !pieceMap.has(posKey(oneStep))) {
    if (oneStep.row === promoRow) {
      for (const pt of [
        ChessPieceType.QUEEN,
        ChessPieceType.ROOK,
        ChessPieceType.BISHOP,
        ChessPieceType.KNIGHT,
      ]) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: oneStep,
          type: ChessMoveType.PROMOTION,
          capturedPieceId: null,
          promotionPiece: pt,
          rookFrom: null,
          rookTo: null,
          rookId: null,
        });
      }
    } else {
      moves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to: oneStep,
        type: ChessMoveType.NORMAL,
        capturedPieceId: null,
        promotionPiece: null,
        rookFrom: null,
        rookTo: null,
        rookId: null,
      });

      if (piece.position.row === startRow) {
        const twoStep: Position = {
          row: piece.position.row + dir * 2,
          col: piece.position.col,
        };
        if (!pieceMap.has(posKey(twoStep))) {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to: twoStep,
            type: ChessMoveType.NORMAL,
            capturedPieceId: null,
            promotionPiece: null,
            rookFrom: null,
            rookTo: null,
            rookId: null,
          });
        }
      }
    }
  }

  for (const dc of [-1, 1]) {
    const capturePos: Position = {
      row: piece.position.row + dir,
      col: piece.position.col + dc,
    };
    if (!inBounds(capturePos)) continue;

    const target = pieceMap.get(posKey(capturePos));
    if (target && target.color !== piece.color) {
      if (capturePos.row === promoRow) {
        for (const pt of [
          ChessPieceType.QUEEN,
          ChessPieceType.ROOK,
          ChessPieceType.BISHOP,
          ChessPieceType.KNIGHT,
        ]) {
          moves.push({
            pieceId: piece.id,
            from: { ...piece.position },
            to: capturePos,
            type: ChessMoveType.PROMOTION_CAPTURE,
            capturedPieceId: target.id,
            promotionPiece: pt,
            rookFrom: null,
            rookTo: null,
            rookId: null,
          });
        }
      } else {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: capturePos,
          type: ChessMoveType.CAPTURE,
          capturedPieceId: target.id,
          promotionPiece: null,
          rookFrom: null,
          rookTo: null,
          rookId: null,
        });
      }
    }

    if (
      enPassantTarget &&
      capturePos.row === enPassantTarget.row &&
      capturePos.col === enPassantTarget.col
    ) {
      const epPawnPos: Position = {
        row: piece.position.row,
        col: capturePos.col,
      };
      const epPawn = pieceMap.get(posKey(epPawnPos));
      if (epPawn && epPawn.color !== piece.color) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: capturePos,
          type: ChessMoveType.EN_PASSANT,
          capturedPieceId: epPawn.id,
          promotionPiece: null,
          rookFrom: null,
          rookTo: null,
          rookId: null,
        });
      }
    }
  }

  return moves;
}

function generateSlidingMoves(
  piece: ChessPiece,
  pieceMap: Map<string, ChessPiece>,
  dirs: { dr: number; dc: number }[],
): ChessMove[] {
  const moves: ChessMove[] = [];
  for (const dir of dirs) {
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
            type: ChessMoveType.CAPTURE,
            capturedPieceId: target.id,
            promotionPiece: null,
            rookFrom: null,
            rookTo: null,
            rookId: null,
          });
        }
        break;
      }
      moves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to: pos,
        type: ChessMoveType.NORMAL,
        capturedPieceId: null,
        promotionPiece: null,
        rookFrom: null,
        rookTo: null,
        rookId: null,
      });
      r += dir.dr;
      c += dir.dc;
    }
  }
  return moves;
}

function generateKnightMoves(
  piece: ChessPiece,
  pieceMap: Map<string, ChessPiece>,
): ChessMove[] {
  const moves: ChessMove[] = [];
  for (const off of KNIGHT_OFFSETS) {
    const pos: Position = {
      row: piece.position.row + off.dr,
      col: piece.position.col + off.dc,
    };
    if (!inBounds(pos)) continue;
    const target = pieceMap.get(posKey(pos));
    if (target) {
      if (target.color !== piece.color) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: pos,
          type: ChessMoveType.CAPTURE,
          capturedPieceId: target.id,
          promotionPiece: null,
          rookFrom: null,
          rookTo: null,
          rookId: null,
        });
      }
      continue;
    }
    moves.push({
      pieceId: piece.id,
      from: { ...piece.position },
      to: pos,
      type: ChessMoveType.NORMAL,
      capturedPieceId: null,
      promotionPiece: null,
      rookFrom: null,
      rookTo: null,
      rookId: null,
    });
  }
  return moves;
}

function generateKingMoves(
  piece: ChessPiece,
  board: ChessBoardState,
  pieceMap: Map<string, ChessPiece>,
): ChessMove[] {
  const moves: ChessMove[] = [];
  const opp = opponentColor(piece.color);

  for (const off of KING_OFFSETS) {
    const pos: Position = {
      row: piece.position.row + off.dr,
      col: piece.position.col + off.dc,
    };
    if (!inBounds(pos)) continue;
    const target = pieceMap.get(posKey(pos));
    if (target) {
      if (target.color !== piece.color) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: pos,
          type: ChessMoveType.CAPTURE,
          capturedPieceId: target.id,
          promotionPiece: null,
          rookFrom: null,
          rookTo: null,
          rookId: null,
        });
      }
      continue;
    }
    moves.push({
      pieceId: piece.id,
      from: { ...piece.position },
      to: pos,
      type: ChessMoveType.NORMAL,
      capturedPieceId: null,
      promotionPiece: null,
      rookFrom: null,
      rookTo: null,
      rookId: null,
    });
  }

  if (!piece.hasMoved) {
    const row = piece.position.row;

    const kingSideRook = pieceMap.get(posKey({ row, col: 7 }));
    if (
      kingSideRook &&
      kingSideRook.type === ChessPieceType.ROOK &&
      !kingSideRook.hasMoved &&
      kingSideRook.color === piece.color
    ) {
      const fPos: Position = { row, col: 5 };
      const gPos: Position = { row, col: 6 };
      if (
        !pieceMap.has(posKey(fPos)) &&
        !pieceMap.has(posKey(gPos)) &&
        !isSquareAttackedBy(board, { row, col: 4 }, opp) &&
        !isSquareAttackedBy(board, fPos, opp) &&
        !isSquareAttackedBy(board, gPos, opp)
      ) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: gPos,
          type: ChessMoveType.CASTLING,
          capturedPieceId: null,
          promotionPiece: null,
          rookFrom: { row, col: 7 },
          rookTo: fPos,
          rookId: kingSideRook.id,
        });
      }
    }

    const queenSideRook = pieceMap.get(posKey({ row, col: 0 }));
    if (
      queenSideRook &&
      queenSideRook.type === ChessPieceType.ROOK &&
      !queenSideRook.hasMoved &&
      queenSideRook.color === piece.color
    ) {
      const dPos: Position = { row, col: 3 };
      const cPos: Position = { row, col: 2 };
      const bPos: Position = { row, col: 1 };
      if (
        !pieceMap.has(posKey(dPos)) &&
        !pieceMap.has(posKey(cPos)) &&
        !pieceMap.has(posKey(bPos)) &&
        !isSquareAttackedBy(board, { row, col: 4 }, opp) &&
        !isSquareAttackedBy(board, dPos, opp) &&
        !isSquareAttackedBy(board, cPos, opp)
      ) {
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: cPos,
          type: ChessMoveType.CASTLING,
          capturedPieceId: null,
          promotionPiece: null,
          rookFrom: { row, col: 0 },
          rookTo: dPos,
          rookId: queenSideRook.id,
        });
      }
    }
  }

  return moves;
}

function generatePseudoLegalMoves(
  piece: ChessPiece,
  board: ChessBoardState,
  pieceMap: Map<string, ChessPiece>,
): ChessMove[] {
  switch (piece.type) {
    case ChessPieceType.PAWN:
      return generatePawnMoves(piece, pieceMap, board.enPassantTarget);
    case ChessPieceType.KNIGHT:
      return generateKnightMoves(piece, pieceMap);
    case ChessPieceType.BISHOP:
      return generateSlidingMoves(piece, pieceMap, BISHOP_DIRS);
    case ChessPieceType.ROOK:
      return generateSlidingMoves(piece, pieceMap, ROOK_DIRS);
    case ChessPieceType.QUEEN:
      return generateSlidingMoves(piece, pieceMap, QUEEN_DIRS);
    case ChessPieceType.KING:
      return generateKingMoves(piece, board, pieceMap);
    default:
      return [];
  }
}

export function isSquareAttackedBy(
  board: ChessBoardState,
  pos: Position,
  attackerColor: PieceColor,
): boolean {
  const pieceMap = buildChessPieceMap(board.pieces);

  for (const piece of board.pieces) {
    if (piece.color !== attackerColor) continue;

    switch (piece.type) {
      case ChessPieceType.PAWN: {
        const dir = pawnForwardDir(attackerColor);
        for (const dc of [-1, 1]) {
          const attackPos: Position = {
            row: piece.position.row + dir,
            col: piece.position.col + dc,
          };
          if (
            attackPos.row === pos.row &&
            attackPos.col === pos.col
          ) {
            return true;
          }
        }
        break;
      }

      case ChessPieceType.KNIGHT: {
        for (const off of KNIGHT_OFFSETS) {
          const nPos: Position = {
            row: piece.position.row + off.dr,
            col: piece.position.col + off.dc,
          };
          if (nPos.row === pos.row && nPos.col === pos.col) {
            return true;
          }
        }
        break;
      }

      case ChessPieceType.BISHOP: {
        for (const dir of BISHOP_DIRS) {
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

      case ChessPieceType.ROOK: {
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

      case ChessPieceType.QUEEN: {
        for (const dir of QUEEN_DIRS) {
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

      case ChessPieceType.KING: {
        for (const off of KING_OFFSETS) {
          const kPos: Position = {
            row: piece.position.row + off.dr,
            col: piece.position.col + off.dc,
          };
          if (kPos.row === pos.row && kPos.col === pos.col) {
            return true;
          }
        }
        break;
      }
    }
  }

  return false;
}

export function isInCheck(board: ChessBoardState, color: PieceColor): boolean {
  const king = board.pieces.find(
    (p) => p.type === ChessPieceType.KING && p.color === color,
  );
  if (!king) return false;
  return isSquareAttackedBy(board, king.position, opponentColor(color));
}

export function applyChessMove(
  board: ChessBoardState,
  move: ChessMove,
): ChessBoardState {
  const newBoard = cloneChessBoard(board);
  const pieceMap = buildChessPieceMap(newBoard.pieces);

  const movingPiece = pieceMap.get(posKey(move.from));
  if (!movingPiece || movingPiece.id !== move.pieceId) {
    return newBoard;
  }

  movingPiece.position = { ...move.to };
  movingPiece.hasMoved = true;

  if (move.capturedPieceId) {
    const capturedIdx = newBoard.pieces.findIndex(
      (p) => p.id === move.capturedPieceId,
    );
    if (capturedIdx !== -1) {
      newBoard.pieces.splice(capturedIdx, 1);
    }
  }

  if (move.type === ChessMoveType.CASTLING && move.rookId) {
    const rook = newBoard.pieces.find((p) => p.id === move.rookId);
    if (rook && move.rookTo) {
      rook.position = { ...move.rookTo };
      rook.hasMoved = true;
    }
  }

  if (move.type === ChessMoveType.EN_PASSANT && move.capturedPieceId) {
    const epPawnIdx = newBoard.pieces.findIndex(
      (p) => p.id === move.capturedPieceId,
    );
    if (epPawnIdx !== -1) {
      newBoard.pieces.splice(epPawnIdx, 1);
    }
  }

  if (
    (move.type === ChessMoveType.PROMOTION ||
      move.type === ChessMoveType.PROMOTION_CAPTURE) &&
    move.promotionPiece
  ) {
    movingPiece.type = move.promotionPiece;
  }

  if (
    movingPiece.type === ChessPieceType.PAWN &&
    Math.abs(move.to.row - move.from.row) === 2
  ) {
    const dir = pawnForwardDir(movingPiece.color);
    newBoard.enPassantTarget = {
      row: move.from.row + dir,
      col: move.from.col,
    };
  } else {
    newBoard.enPassantTarget = null;
  }

  if (
    movingPiece.type === ChessPieceType.PAWN ||
    move.capturedPieceId !== null
  ) {
    newBoard.halfMoveClock = 0;
  } else {
    newBoard.halfMoveClock = board.halfMoveClock + 1;
  }

  if (movingPiece.color === PieceColor.DARK) {
    newBoard.fullMoveNumber = board.fullMoveNumber + 1;
  }

  return newBoard;
}

export function getValidMovesForPiece(
  board: ChessBoardState,
  pieceId: string,
): ChessMove[] {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) return [];

  const pieceMap = buildChessPieceMap(board.pieces);
  const pseudoLegal = generatePseudoLegalMoves(piece, board, pieceMap);

  return pseudoLegal.filter((move) => {
    const newBoard = applyChessMove(board, move);
    return !isInCheck(newBoard, piece.color);
  });
}

export function getAllValidMoves(
  board: ChessBoardState,
  color: PieceColor,
): ChessMove[] {
  const moves: ChessMove[] = [];
  for (const piece of board.pieces) {
    if (piece.color !== color) continue;
    moves.push(...getValidMovesForPiece(board, piece.id));
  }
  return moves;
}

export function isValidChessMove(
  board: ChessBoardState,
  move: ChessMove,
  color: PieceColor,
): boolean {
  const validMoves = getAllValidMoves(board, color);
  return validMoves.some(
    (m) =>
      m.pieceId === move.pieceId &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      m.type === move.type &&
      m.promotionPiece === move.promotionPiece,
  );
}

function isInsufficientMaterial(board: ChessBoardState): boolean {
  const pieces = board.pieces;
  if (pieces.length === 2) return true;

  if (pieces.length === 3) {
    const nonKing = pieces.find((p) => p.type !== ChessPieceType.KING);
    if (
      nonKing &&
      (nonKing.type === ChessPieceType.BISHOP ||
        nonKing.type === ChessPieceType.KNIGHT)
    ) {
      return true;
    }
  }

  if (pieces.length === 4) {
    const bishops = pieces.filter(
      (p) => p.type === ChessPieceType.BISHOP,
    );
    if (bishops.length === 2) {
      const color1 = (bishops[0].position.row + bishops[0].position.col) % 2;
      const color2 = (bishops[1].position.row + bishops[1].position.col) % 2;
      if (color1 === color2 && bishops[0].color !== bishops[1].color) {
        return true;
      }
    }
  }

  return false;
}

export function getChessGameResult(
  board: ChessBoardState,
  currentColor: PieceColor,
): ChessGameResult | null {
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
        winner: null,
        isDraw: true,
        reason: 'stalemate',
      };
    }
  }

  if (board.halfMoveClock >= 100) {
    return {
      winner: null,
      isDraw: true,
      reason: 'fifty_move_rule',
    };
  }

  if (isInsufficientMaterial(board)) {
    return {
      winner: null,
      isDraw: true,
      reason: 'insufficient_material',
    };
  }

  return null;
}
