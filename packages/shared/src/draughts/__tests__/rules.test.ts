import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  getAllValidMoves,
  getValidMovesForPiece,
  isValidMove,
  applyMove,
  checkWin,
} from '../rules';
import { PieceColor, PieceType } from '../../types/board';
import type { BoardState, Move, Piece } from '../../types/board';

function makeBoard(
  pieces: Array<{ color: PieceColor; type: PieceType; row: number; col: number }>,
  size: 10 | 8 = 10,
): BoardState {
  return {
    size,
    pieces: pieces.map((p, i) => ({
      id: `d${i + 1}`,
      type: p.type,
      color: p.color,
      position: { row: p.row, col: p.col },
    })),
  };
}

describe('draughts rules', () => {
  describe('initial board', () => {
    it('100-cell board has 40 pieces', () => {
      const board = createInitialBoard(10);
      expect(board.pieces.length).toBe(40);
    });

    it('64-cell board has 24 pieces', () => {
      const board = createInitialBoard(8);
      expect(board.pieces.length).toBe(24);
    });
  });

  describe('multi-jump capture', () => {
    it('MAN captures two pieces in a chain', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 7, col: 0 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 6, col: 1 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 4, col: 3 },
      ], 10);
      const moves = getAllValidMoves(board, PieceColor.DARK);
      expect(moves.some(m => m.capturedPieceIds.length === 2)).toBe(true);
    });

    it('KING captures two pieces in a chain across distance', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.KING, row: 9, col: 0 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 7, col: 2 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 4, col: 5 },
      ], 10);
      const moves = getAllValidMoves(board, PieceColor.DARK);
      expect(moves.some(m => m.capturedPieceIds.length >= 2)).toBe(true);
    });
  });

  describe('backward capture', () => {
    it('MAN can capture backward', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 4, col: 4 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 5, col: 5 },
      ], 10);
      const moves = getAllValidMoves(board, PieceColor.DARK);
      expect(moves.some(m => m.capturedPieceIds.length > 0 && m.to.row === 6)).toBe(true);
    });
  });

  describe('100-cell vs 64-cell', () => {
    it('100-cell: promotion stops multi-jump mid-chain', () => {
      // DARK MAN at (7,2) captures (8,3) → lands at (9,4) = promotion row (row 9).
      // 100-cell rules stop the jump sequence upon promotion.
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 7, col: 2 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 8, col: 3 },
      ], 10);
      const moves = getAllValidMoves(board, PieceColor.DARK);
      const promoCapture = moves.find(m => m.promoted && m.capturedPieceIds.length === 1);
      expect(promoCapture).toBeDefined();
      expect(promoCapture!.to.row).toBe(9);
    });

    it('64-cell board has 24 pieces initially', () => {
      const board = createInitialBoard(8);
      expect(board.pieces.filter(p => p.color === PieceColor.DARK).length).toBe(12);
      expect(board.pieces.filter(p => p.color === PieceColor.LIGHT).length).toBe(12);
    });

    it('KING on 100-cell board can slide multiple squares diagonally', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.KING, row: 5, col: 4 },
      ], 10);
      const moves = getValidMovesForPiece(board, 'd1');
      const maxDist = Math.max(...moves.map(m => Math.abs(m.to.row - 5)));
      expect(maxDist).toBeGreaterThan(1);
    });
  });

  describe('normal moves', () => {
    it('MAN moves forward diagonally one square', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 5, col: 4 },
      ], 10);
      const moves = getValidMovesForPiece(board, 'd1');
      const normalMoves = moves.filter(m => m.type === 'step');
      expect(normalMoves.length).toBeGreaterThan(0);
      for (const m of normalMoves) {
        expect(m.to.row).toBeGreaterThan(5);
      }
    });

    it('KING moves diagonally in all directions', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.KING, row: 5, col: 4 },
      ], 10);
      const moves = getValidMovesForPiece(board, 'd1');
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('forced capture', () => {
    it('must capture when capture is available', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 5, col: 4 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 4, col: 5 },
      ], 10);
      const allMoves = getAllValidMoves(board, PieceColor.DARK);
      expect(allMoves.length).toBeGreaterThan(0);
      expect(allMoves.every(m => m.capturedPieceIds.length > 0)).toBe(true);
    });

    it('non-capture moves are invalid when capture exists', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 5, col: 4 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 4, col: 5 },
        { color: PieceColor.DARK, type: PieceType.MAN, row: 6, col: 2 },
      ], 10);
      const moves = getValidMovesForPiece(board, 'd3');
      expect(moves.length).toBe(0);
    });
  });

  describe('max capture rule', () => {
    it('only moves with max captures are valid', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.KING, row: 5, col: 4 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 4, col: 5 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 2, col: 7 },
      ], 10);
      const moves = getAllValidMoves(board, PieceColor.DARK);
      if (moves.some(m => m.capturedPieceIds.length >= 2)) {
        expect(moves.every(m => m.capturedPieceIds.length >= 2)).toBe(true);
      }
    });
  });

  describe('applyMove', () => {
    it('moves piece and removes captured pieces', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 5, col: 4 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 4, col: 5 },
      ], 10);
      const captures = getAllValidMoves(board, PieceColor.DARK);
      if (captures.length > 0) {
        const newBoard = applyMove(board, captures[0]);
        expect(newBoard.pieces.find(p => p.id === 'd2')).toBeUndefined();
        const movedPiece = newBoard.pieces.find(p => p.id === 'd1')!;
        expect(movedPiece.position).toEqual(captures[0].to);
      }
    });

    it('promotes MAN to KING on reaching last row', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 1, col: 4 },
      ], 10);
      const move: Move = {
        pieceId: 'd1',
        from: { row: 1, col: 4 },
        to: { row: 0, col: 5 },
        type: 'step',
        capturedPieceIds: [],
        path: [{ row: 1, col: 4 }, { row: 0, col: 5 }],
        promoted: true,
      };
      const newBoard = applyMove(board, move);
      const piece = newBoard.pieces.find(p => p.id === 'd1')!;
      expect(piece.type).toBe(PieceType.KING);
    });
  });

  describe('win detection', () => {
    it('detects win when opponent has no pieces', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 5, col: 4 },
      ], 10);
      expect(checkWin(board)).toBe(PieceColor.DARK);
    });

    it('detects win when opponent has no valid moves', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, type: PieceType.MAN, row: 5, col: 4 },
        { color: PieceColor.LIGHT, type: PieceType.MAN, row: 0, col: 1 },
      ], 8);
      expect(checkWin(board)).toBe(PieceColor.DARK);
    });

    it('returns null when game is not over', () => {
      const board = createInitialBoard(10);
      expect(checkWin(board)).toBeNull();
    });
  });
});
