import {
  type BoardState,
  type Piece,
  PieceColor,
  PieceType,
  type Position,
  posKey,
  buildPieceMap,
} from '../types/board';
import {
  type Move,
  MoveType,
} from '../types/move';
import { DIAGONAL_DIRS, FORWARD_DIRS_DARK, FORWARD_DIRS_LIGHT } from './constants';
import { getInitialPieces100 } from './constants-100';
import { getInitialPieces64 } from './constants-64';

let pieceIdCounter = 0;
function resetPieceIdCounter() {
  pieceIdCounter = 0;
}
function nextPieceId(): string {
  return `p${++pieceIdCounter}`;
}

export function createInitialBoard(size: 10 | 8): BoardState {
  resetPieceIdCounter();
  const raw = size === 10 ? getInitialPieces100() : getInitialPieces64();
  const pieces: Piece[] = raw.map((r) => ({
    id: nextPieceId(),
    type: PieceType.MAN,
    color: r.color as PieceColor,
    position: { row: r.row, col: r.col },
  }));
  return { size, pieces };
}

export function cloneBoard(board: BoardState): BoardState {
  return {
    size: board.size,
    pieces: board.pieces.map((p) => ({ ...p, position: { ...p.position } })),
  };
}

function inBounds(pos: Position, size: number): boolean {
  return pos.row >= 0 && pos.row < size && pos.col >= 0 && pos.col < size;
}

function forwardDirs(color: PieceColor) {
  return color === PieceColor.DARK ? FORWARD_DIRS_DARK : FORWARD_DIRS_LIGHT;
}

function promotionRow(color: PieceColor, size: number): number {
  return color === PieceColor.DARK ? size - 1 : 0;
}

interface CaptureNode {
  to: Position;
  capturedId: string;
  children: CaptureNode[];
  promoted: boolean;
}

function buildCaptureTree(
  board: BoardState,
  piece: Piece,
  from: Position,
  capturedSet: Set<string>,
  pieceMap: Map<string, Piece>,
  size: number,
  is100: boolean,
): CaptureNode[] {
  const nodes: CaptureNode[] = [];
  const isKing = piece.type === PieceType.KING;
  const color = piece.color;
  const promoRow = promotionRow(color, size);

  for (const dir of DIAGONAL_DIRS) {
    if (isKing) {
      let r = from.row + dir.dr;
      let c = from.col + dir.dc;
      let enemyPos: Position | null = null;
      let enemyId: string | null = null;

      while (inBounds({ row: r, col: c }, size)) {
        const key = posKey({ row: r, col: c });
        const occupant = pieceMap.get(key);
        if (occupant) {
          if (enemyPos) break;
          if (occupant.color !== color && !capturedSet.has(occupant.id)) {
            enemyPos = { row: r, col: c };
            enemyId = occupant.id;
          } else {
            break;
          }
        } else if (enemyPos && enemyId) {
          const to = { row: r, col: c };
          const promoted = !isKing && to.row === promoRow;
          const newCaptured = new Set(capturedSet);
          newCaptured.add(enemyId);

          const child: CaptureNode = {
            to,
            capturedId: enemyId,
            promoted,
            children: [],
          };

          if (is100 && promoted) {
            // 100格: 升变后停止连跳
          } else {
            // 更新 pieceMap: 移动棋子, 移除被吃棋子
            const fromKey = posKey(from);
            pieceMap.delete(fromKey);
            pieceMap.delete(posKey(enemyPos!));
            pieceMap.set(posKey(to), { ...piece, position: to, type: promoted ? PieceType.KING : piece.type });

            child.children = buildCaptureTree(
              board,
              { ...piece, position: to, type: promoted ? PieceType.KING : piece.type },
              to,
              newCaptured,
              pieceMap,
              size,
              is100,
            );

            // 还原 pieceMap
            pieceMap.delete(posKey(to));
            pieceMap.set(fromKey, piece);
            pieceMap.set(posKey(enemyPos!), { id: enemyId!, type: PieceType.MAN, color: color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK, position: enemyPos! });
          }

          nodes.push(child);
        }
        r += dir.dr;
        c += dir.dc;
      }
    } else {
      // MAN: 跳过相邻敌方棋子
      const midR = from.row + dir.dr;
      const midC = from.col + dir.dc;
      const toR = from.row + dir.dr * 2;
      const toC = from.col + dir.dc * 2;
      const mid: Position = { row: midR, col: midC };
      const to: Position = { row: toR, col: toC };

      if (!inBounds(mid, size) || !inBounds(to, size)) continue;

      const midKey = posKey(mid);
      const toKey = posKey(to);
      const midPiece = pieceMap.get(midKey);
      if (!midPiece || midPiece.color === color || capturedSet.has(midPiece.id)) continue;
      if (pieceMap.has(toKey)) continue;

      const promoted = to.row === promoRow;
      const newCaptured = new Set(capturedSet);
      newCaptured.add(midPiece.id);

      const child: CaptureNode = {
        to,
        capturedId: midPiece.id,
        promoted,
        children: [],
      };

      if (is100 && promoted) {
        // 停止
      } else {
        // 更新 pieceMap
        const fromKey = posKey(from);
        pieceMap.delete(fromKey);
        pieceMap.delete(midKey);
        pieceMap.set(toKey, { ...piece, position: to, type: promoted ? PieceType.KING : piece.type });

        child.children = buildCaptureTree(
          board,
          { ...piece, position: to, type: promoted ? PieceType.KING : piece.type },
          to,
          newCaptured,
          pieceMap,
          size,
          is100,
        );

        // 还原
        pieceMap.delete(toKey);
        pieceMap.set(fromKey, piece);
        pieceMap.set(midKey, midPiece);
      }

      nodes.push(child);
    }
  }
  return nodes;
}

interface CapturePath {
  path: Position[];
  capturedIds: string[];
  promoted: boolean;
}

function extractPaths(nodes: CaptureNode[], prefix: Position[], capturedPrefix: string[], promotedSoFar: boolean): CapturePath[] {
  const results: CapturePath[] = [];
  for (const node of nodes) {
    const currentPath = [...prefix, node.to];
    const currentCaptured = [...capturedPrefix, node.capturedId];
    const currentPromoted = promotedSoFar || node.promoted;
    if (node.children.length === 0) {
      results.push({ path: currentPath, capturedIds: currentCaptured, promoted: currentPromoted });
    } else {
      results.push(...extractPaths(node.children, currentPath, currentCaptured, currentPromoted));
    }
  }
  return results;
}

function generateStepMoves(
  piece: Piece,
  pieceMap: Map<string, Piece>,
  size: number,
): Move[] {
  const moves: Move[] = [];
  const isKing = piece.type === PieceType.KING;
  const promoRow = promotionRow(piece.color, size);

  if (isKing) {
    for (const dir of DIAGONAL_DIRS) {
      let r = piece.position.row + dir.dr;
      let c = piece.position.col + dir.dc;
      while (inBounds({ row: r, col: c }, size)) {
        if (pieceMap.has(posKey({ row: r, col: c }))) break;
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: { row: r, col: c },
          type: MoveType.STEP,
          capturedPieceIds: [],
          path: [{ ...piece.position }, { row: r, col: c }],
          promoted: false,
        });
        r += dir.dr;
        c += dir.dc;
      }
    }
  } else {
    for (const dir of forwardDirs(piece.color)) {
      const to: Position = {
        row: piece.position.row + dir.dr,
        col: piece.position.col + dir.dc,
      };
      if (inBounds(to, size) && !pieceMap.has(posKey(to))) {
        const promoted = to.row === promoRow;
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to,
          type: MoveType.STEP,
          capturedPieceIds: [],
          path: [{ ...piece.position }, to],
          promoted,
        });
      }
    }
  }
  return moves;
}

function generateCaptureMoves(
  piece: Piece,
  board: BoardState,
  pieceMap: Map<string, Piece>,
  is100: boolean,
): Move[] {
  const tree = buildCaptureTree(
    board,
    piece,
    piece.position,
    new Set(),
    pieceMap,
    board.size,
    is100,
  );
  const paths = extractPaths(tree, [piece.position], [], false);
  return paths.map((p) => ({
    pieceId: piece.id,
    from: { ...piece.position },
    to: p.path[p.path.length - 1],
    type: p.capturedIds.length > 1 ? MoveType.CHAIN_CAPTURE : MoveType.CAPTURE,
    capturedPieceIds: p.capturedIds,
    path: p.path,
    promoted: p.promoted,
  }));
}

export function getValidMovesForPiece(
  board: BoardState,
  pieceId: string,
): Move[] {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) return [];

  const is100 = board.size === 10;
  const playerPieces = board.pieces.filter((p) => p.color === piece.color);

  let globalMaxCapture = 0;
  let globalHasCapture = false;

  for (const p of playerPieces) {
    const pm = buildPieceMap(board.pieces);
    const caps = generateCaptureMoves(p, board, pm, is100);
    if (caps.length > 0) {
      globalHasCapture = true;
      globalMaxCapture = Math.max(
        globalMaxCapture,
        Math.max(...caps.map((m) => m.capturedPieceIds.length)),
      );
    }
  }

  if (globalHasCapture) {
    const pieceMap = buildPieceMap(board.pieces);
    const captures = generateCaptureMoves(piece, board, pieceMap, is100);
    if (captures.length === 0) return [];
    return captures.filter((m) => m.capturedPieceIds.length === globalMaxCapture);
  }

  const pieceMap = buildPieceMap(board.pieces);
  return generateStepMoves(piece, pieceMap, board.size);
}

export function getAllValidMoves(
  board: BoardState,
  color: PieceColor,
): Move[] {
  const playerPieces = board.pieces.filter((p) => p.color === color);
  let allMoves: Move[] = [];
  let hasCapture = false;
  let maxCapture = 0;

  for (const piece of playerPieces) {
    const pieceMap = buildPieceMap(board.pieces);
    const is100 = board.size === 10;
    const captures = generateCaptureMoves(piece, board, pieceMap, is100);
    if (captures.length > 0) {
      hasCapture = true;
      const localMax = Math.max(...captures.map((m) => m.capturedPieceIds.length));
      maxCapture = Math.max(maxCapture, localMax);
      allMoves.push(...captures);
    }
  }

  if (hasCapture) {
    return allMoves.filter((m) => m.capturedPieceIds.length === maxCapture);
  }

  for (const piece of playerPieces) {
    const pieceMap = buildPieceMap(board.pieces);
    allMoves.push(...generateStepMoves(piece, pieceMap, board.size));
  }

  return allMoves;
}

export function isValidMove(board: BoardState, move: Move, color: PieceColor): boolean {
  const validMoves = getAllValidMoves(board, color);
  return validMoves.some((m) => {
    if (
      m.pieceId !== move.pieceId ||
      m.to.row !== move.to.row ||
      m.to.col !== move.to.col ||
      m.type !== move.type ||
      m.promoted !== move.promoted ||
      m.capturedPieceIds.length !== move.capturedPieceIds.length
    ) {
      return false;
    }
    if (m.capturedPieceIds.length === 0) return true;
    const sortedA = [...m.capturedPieceIds].sort();
    const sortedB = [...move.capturedPieceIds].sort();
    return sortedA.every((id, i) => id === sortedB[i]);
  });
}

export function applyMove(board: BoardState, move: Move): BoardState {
  const newPieces = board.pieces
    .filter((p) => !move.capturedPieceIds.includes(p.id))
    .map((p) => {
      if (p.id === move.pieceId) {
        return {
          ...p,
          position: { ...move.to },
          type: move.promoted ? PieceType.KING : p.type,
        };
      }
      return { ...p };
    });

  return { size: board.size, pieces: newPieces };
}

export function checkWin(board: BoardState): PieceColor | null {
  const darkPieces = board.pieces.filter((p) => p.color === PieceColor.DARK);
  const lightPieces = board.pieces.filter((p) => p.color === PieceColor.LIGHT);

  if (darkPieces.length === 0) return PieceColor.LIGHT;
  if (lightPieces.length === 0) return PieceColor.DARK;

  if (getAllValidMoves(board, PieceColor.DARK).length === 0) return PieceColor.LIGHT;
  if (getAllValidMoves(board, PieceColor.LIGHT).length === 0) return PieceColor.DARK;

  return null;
}
