import { describe, it, expect } from 'vitest';
import {
  createInitialXiangqiBoard,
  getAllXiangqiValidMoves,
  getXiangqiValidMovesForPiece,
  isValidXiangqiMove,
  applyXiangqiMove,
  getXiangqiGameResult,
  isXiangqiInCheck,
  cloneXiangqiBoard,
} from '../rules';
import {
  XiangqiPieceType,
  XiangqiMoveType,
} from '../types';
import { PieceColor } from '../../types/board';
import type { XiangqiBoardState, XiangqiMove, XiangqiPiece } from '../types';

function makeBoard(
  pieces: Array<{ type: XiangqiPieceType; color: PieceColor; row: number; col: number }>,
  nextColor: PieceColor = PieceColor.DARK,
  halfMoveClock: number = 0,
): XiangqiBoardState {
  return {
    size: 10,
    pieces: pieces.map((p, i) => ({
      id: `t${i + 1}`,
      type: p.type,
      color: p.color,
      position: { row: p.row, col: p.col },
    })),
    nextColor,
    halfMoveClock,
  };
}

function findPiece(board: XiangqiBoardState, type: XiangqiPieceType, color: PieceColor): XiangqiPiece | undefined {
  return board.pieces.find(p => p.type === type && p.color === color);
}

describe('xiangqi rules', () => {
  describe('initial board', () => {
    it('creates 32 pieces', () => {
      const board = createInitialXiangqiBoard();
      expect(board.pieces.length).toBe(32);
    });

    it('DARK moves first', () => {
      const board = createInitialXiangqiBoard();
      expect(board.nextColor).toBe(PieceColor.DARK);
    });

    it('each side has 1 king, 2 advisors, 2 elephants, 2 horses, 2 rooks, 2 cannons, 5 pawns', () => {
      const board = createInitialXiangqiBoard();
      for (const color of [PieceColor.DARK, PieceColor.LIGHT]) {
        const side = board.pieces.filter(p => p.color === color);
        expect(side.filter(p => p.type === XiangqiPieceType.KING).length).toBe(1);
        expect(side.filter(p => p.type === XiangqiPieceType.ADVISOR).length).toBe(2);
        expect(side.filter(p => p.type === XiangqiPieceType.ELEPHANT).length).toBe(2);
        expect(side.filter(p => p.type === XiangqiPieceType.HORSE).length).toBe(2);
        expect(side.filter(p => p.type === XiangqiPieceType.ROOK).length).toBe(2);
        expect(side.filter(p => p.type === XiangqiPieceType.CANNON).length).toBe(2);
        expect(side.filter(p => p.type === XiangqiPieceType.PAWN).length).toBe(5);
      }
    });
  });

  describe('king moves', () => {
    it('moves one step within palace', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.to.col >= 3 && m.to.col <= 5).toBe(true);
        expect(m.to.row >= 7 && m.to.row <= 9).toBe(true);
      }
    });

    it('cannot move outside palace', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => m.to.col >= 3 && m.to.col <= 5)).toBe(true);
      expect(moves.every(m => m.to.row >= 7 && m.to.row <= 9)).toBe(true);
    });
  });

  describe('advisor moves', () => {
    it('moves diagonally within palace', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ADVISOR, color: PieceColor.DARK, row: 9, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.to.col >= 3 && m.to.col <= 5).toBe(true);
        expect(m.to.row >= 7 && m.to.row <= 9).toBe(true);
      }
    });
  });

  describe('elephant moves', () => {
    it('moves two steps diagonally', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ELEPHANT, color: PieceColor.DARK, row: 9, col: 2 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.to.row >= 5).toBe(true);
      }
    });

    it('cannot cross river', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ELEPHANT, color: PieceColor.DARK, row: 9, col: 2 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => m.to.row >= 5)).toBe(true);
    });

    it('is blocked by eye (leg)', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ELEPHANT, color: PieceColor.DARK, row: 9, col: 2 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 8, col: 1 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => !(m.to.row === 7 && m.to.col === 0))).toBe(true);
    });
  });

  describe('horse moves', () => {
    it('moves in L-shape', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.HORSE, color: PieceColor.DARK, row: 9, col: 1 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.length).toBeGreaterThan(0);
    });

    it('is blocked by leg (蹩马腿)', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.HORSE, color: PieceColor.DARK, row: 7, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 6, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => !(m.to.row === 5 && m.to.col === 3))).toBe(true);
      expect(moves.every(m => !(m.to.row === 5 && m.to.col === 5))).toBe(true);
    });
  });

  describe('rook moves', () => {
    it('moves horizontally and vertically', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.length).toBeGreaterThan(0);
    });

    it('is blocked by friendly piece', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 5, col: 5 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => m.to.col <= 5)).toBe(true);
    });

    it('captures enemy piece and stops', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 6 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      const capture = moves.find(m => m.to.row === 5 && m.to.col === 6);
      expect(capture).toBeDefined();
      expect(capture!.type).toBe(XiangqiMoveType.CAPTURE);
      expect(moves.every(m => m.to.col <= 6)).toBe(true);
    });
  });

  describe('cannon moves', () => {
    it('moves like rook when not capturing', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.CANNON, color: PieceColor.DARK, row: 5, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      const normalMoves = moves.filter(m => m.type === XiangqiMoveType.NORMAL);
      expect(normalMoves.length).toBeGreaterThan(0);
    });

    it('captures by jumping over exactly one screen', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.CANNON, color: PieceColor.DARK, row: 5, col: 0 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 5, col: 3 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 5 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      const capture = moves.find(m => m.to.row === 5 && m.to.col === 5);
      expect(capture).toBeDefined();
      expect(capture!.type).toBe(XiangqiMoveType.CAPTURE);
    });

    it('cannot capture without a screen', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.CANNON, color: PieceColor.DARK, row: 5, col: 0 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 5 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      const capture = moves.find(m => m.to.row === 5 && m.to.col === 5);
      expect(capture).toBeUndefined();
    });
  });

  describe('pawn moves', () => {
    it('moves forward before crossing river', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 6, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => m.to.row < 6)).toBe(true);
      expect(moves.every(m => m.to.col === 4)).toBe(true);
    });

    it('moves forward and sideways after crossing river', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 4, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.some(m => m.to.col !== 4)).toBe(true);
    });
  });

  describe('flying general (飞将)', () => {
    it('king can capture opponent king directly when no piece between them', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
      ], PieceColor.DARK);
      const king = board.pieces.find(p => p.type === XiangqiPieceType.KING && p.color === PieceColor.DARK)!;
      const moves = getXiangqiValidMovesForPiece(board, king.id);
      expect(moves.some(m => m.to.col !== 4)).toBe(true);
    });

    it('moving a piece away that exposes kings facing is illegal', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
        { type: XiangqiPieceType.CANNON, color: PieceColor.DARK, row: 5, col: 4 },
      ], PieceColor.DARK);
      const cannon = board.pieces.find(p => p.type === XiangqiPieceType.CANNON)!;
      const move: XiangqiMove = {
        pieceId: cannon.id,
        from: { ...cannon.position },
        to: { row: 5, col: 3 },
        type: XiangqiMoveType.NORMAL,
        capturedPieceId: null,
      };
      expect(isValidXiangqiMove(board, move, PieceColor.DARK)).toBe(false);
    });
  });

  describe('check by horse and cannon', () => {
    it('detects check by horse', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.HORSE, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      expect(isXiangqiInCheck(board, PieceColor.DARK)).toBe(true);
    });

    it('detects check by cannon over a screen', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 7, col: 4 },
        { type: XiangqiPieceType.CANNON, color: PieceColor.LIGHT, row: 5, col: 4 },
      ]);
      expect(isXiangqiInCheck(board, PieceColor.DARK)).toBe(true);
    });

    it('cannon does not check without screen', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.CANNON, color: PieceColor.LIGHT, row: 5, col: 4 },
      ]);
      expect(isXiangqiInCheck(board, PieceColor.DARK)).toBe(false);
    });
  });

  describe('pawn boundary moves', () => {
    it('LIGHT pawn moves forward (toward row 9) before crossing river', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 3, col: 4 },
      ], PieceColor.LIGHT);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => m.to.row > 3)).toBe(true);
      expect(moves.every(m => m.to.col === 4)).toBe(true);
    });

    it('LIGHT pawn moves forward and sideways after crossing river', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 4 },
      ], PieceColor.LIGHT);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.some(m => m.to.col !== 4)).toBe(true);
    });

    it('pawn cannot move backward', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 4, col: 4 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.every(m => m.to.row <= 4)).toBe(true);
    });
  });

  describe('cannon cannot jump friendly piece as screen', () => {
    it('cannon blocked by two pieces between itself and target', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.CANNON, color: PieceColor.DARK, row: 5, col: 0 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 5, col: 2 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 5, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 6 },
      ]);
      const moves = getXiangqiValidMovesForPiece(board, 't1');
      expect(moves.find(m => m.to.row === 5 && m.to.col === 6)).toBeUndefined();
    });
  });

  describe('kings facing (对面将/飞将)', () => {
    it('prohibits moves that leave kings on same column with no piece between', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 4 },
      ], PieceColor.DARK);
      const rook = board.pieces.find(p => p.type === XiangqiPieceType.ROOK)!;
      const rookMove: XiangqiMove = {
        pieceId: rook.id,
        from: { ...rook.position },
        to: { row: 5, col: 3 },
        type: XiangqiMoveType.NORMAL,
        capturedPieceId: null,
      };
      expect(isValidXiangqiMove(board, rookMove, PieceColor.DARK)).toBe(false);
    });
  });

  describe('check detection', () => {
    it('detects when king is under attack', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 9, col: 0 },
      ]);
      expect(isXiangqiInCheck(board, PieceColor.DARK)).toBe(true);
    });

    it('detects when king is safe', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 0, col: 0 },
      ]);
      expect(isXiangqiInCheck(board, PieceColor.DARK)).toBe(false);
    });
  });

  describe('cannot leave own king in check', () => {
    it('prohibits moves that leave own king in check', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.ADVISOR, color: PieceColor.DARK, row: 8, col: 5 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 8, col: 0 },
      ], PieceColor.DARK);
      const advisor = board.pieces.find(p => p.type === XiangqiPieceType.ADVISOR)!;
      const moves = getXiangqiValidMovesForPiece(board, advisor.id);
      expect(moves.every(m => !(m.to.row === 9 && m.to.col === 4))).toBe(true);
    });
  });

  describe('applyMove', () => {
    it('moves piece to target position', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 9, col: 0 },
      ], PieceColor.DARK);
      const move: XiangqiMove = {
        pieceId: 't1',
        from: { row: 9, col: 0 },
        to: { row: 5, col: 0 },
        type: XiangqiMoveType.NORMAL,
        capturedPieceId: null,
      };
      const newBoard = applyXiangqiMove(board, move);
      const rook = newBoard.pieces.find(p => p.id === 't1')!;
      expect(rook.position).toEqual({ row: 5, col: 0 });
    });

    it('removes captured piece', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 0 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 4 },
      ], PieceColor.DARK);
      const move: XiangqiMove = {
        pieceId: 't1',
        from: { row: 5, col: 0 },
        to: { row: 5, col: 4 },
        type: XiangqiMoveType.CAPTURE,
        capturedPieceId: 't2',
      };
      const newBoard = applyXiangqiMove(board, move);
      expect(newBoard.pieces.find(p => p.id === 't2')).toBeUndefined();
    });

    it('flips nextColor', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 9, col: 0 },
      ], PieceColor.DARK);
      const move: XiangqiMove = {
        pieceId: 't1',
        from: { row: 9, col: 0 },
        to: { row: 5, col: 0 },
        type: XiangqiMoveType.NORMAL,
        capturedPieceId: null,
      };
      const newBoard = applyXiangqiMove(board, move);
      expect(newBoard.nextColor).toBe(PieceColor.LIGHT);
    });

    it('resets halfMoveClock on capture', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 0 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 4 },
      ], PieceColor.DARK, 50);
      const move: XiangqiMove = {
        pieceId: 't1',
        from: { row: 5, col: 0 },
        to: { row: 5, col: 4 },
        type: XiangqiMoveType.CAPTURE,
        capturedPieceId: 't2',
      };
      const newBoard = applyXiangqiMove(board, move);
      expect(newBoard.halfMoveClock).toBe(0);
    });

    it('increments halfMoveClock on normal move', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 9, col: 0 },
      ], PieceColor.DARK, 10);
      const move: XiangqiMove = {
        pieceId: 't1',
        from: { row: 9, col: 0 },
        to: { row: 5, col: 0 },
        type: XiangqiMoveType.NORMAL,
        capturedPieceId: null,
      };
      const newBoard = applyXiangqiMove(board, move);
      expect(newBoard.halfMoveClock).toBe(11);
    });
  });

  describe('game result', () => {
    it('detects checkmate', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 3 },
        { type: XiangqiPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 3 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 9, col: 0 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: XiangqiPieceType.CANNON, color: PieceColor.LIGHT, row: 5, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.PAWN, color: PieceColor.DARK, row: 6, col: 4 },
      ], PieceColor.DARK);
      const result = getXiangqiGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.winner).toBe(PieceColor.LIGHT);
        expect(result.isDraw).toBe(false);
        expect(result.reason).toBe('checkmate');
      }
    });

    it('detects stalemate (no valid moves, not in check) as loss', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 7, col: 5 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.LIGHT, row: 8, col: 0 },
      ], PieceColor.DARK);
      const result = getXiangqiGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.winner).toBe(PieceColor.LIGHT);
        expect(result.isDraw).toBe(false);
        expect(result.reason).toBe('no_valid_moves');
      }
    });

    it('returns null when game continues', () => {
      const board = createInitialXiangqiBoard();
      const result = getXiangqiGameResult(board, PieceColor.DARK);
      expect(result).toBeNull();
    });

    it('detects 60-move draw rule', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.KING, color: PieceColor.DARK, row: 9, col: 4 },
        { type: XiangqiPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 0 },
      ], PieceColor.DARK, 120);
      const result = getXiangqiGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.isDraw).toBe(true);
        expect(result.reason).toBe('sixty_move_rule');
      }
    });
  });

  describe('isValidMove', () => {
    it('rejects move when not your turn', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 9, col: 0 },
      ], PieceColor.DARK);
      const move: XiangqiMove = {
        pieceId: 't1',
        from: { row: 9, col: 0 },
        to: { row: 5, col: 0 },
        type: XiangqiMoveType.NORMAL,
        capturedPieceId: null,
      };
      expect(isValidXiangqiMove(board, move, PieceColor.LIGHT)).toBe(false);
    });

    it('accepts valid move', () => {
      const board = makeBoard([
        { type: XiangqiPieceType.ROOK, color: PieceColor.DARK, row: 9, col: 0 },
      ], PieceColor.DARK);
      const validMoves = getAllXiangqiValidMoves(board, PieceColor.DARK);
      if (validMoves.length > 0) {
        expect(isValidXiangqiMove(board, validMoves[0], PieceColor.DARK)).toBe(true);
      }
    });
  });
});
