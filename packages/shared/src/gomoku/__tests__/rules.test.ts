import { describe, it, expect } from 'vitest';
import {
  createInitialGomokuBoard,
  getAllValidMoves,
  isValidGomokuMove,
  applyGomokuMove,
  getGomokuGameResult,
} from '../rules';
import { PieceColor } from '../../types/board';
import type { GomokuBoardState, GomokuMove, GomokuStone } from '../types';

function makeBoard(stones: Array<{ color: PieceColor; row: number; col: number }>, nextColor: PieceColor = PieceColor.DARK): GomokuBoardState {
  return {
    size: 15,
    stones: stones.map((s, i) => ({
      id: `gs${i + 1}`,
      color: s.color,
      position: { row: s.row, col: s.col },
    })),
    nextColor,
  };
}

describe('gomoku rules', () => {
  describe('initial board', () => {
    it('creates empty board', () => {
      const board = createInitialGomokuBoard();
      expect(board.stones.length).toBe(0);
    });

    it('DARK moves first', () => {
      const board = createInitialGomokuBoard();
      expect(board.nextColor).toBe(PieceColor.DARK);
    });
  });

  describe('valid moves', () => {
    it('allows placement on empty cell', () => {
      const board = createInitialGomokuBoard();
      const move: GomokuMove = { stoneId: 'gs1', to: { row: 7, col: 7 }, color: PieceColor.DARK };
      expect(isValidGomokuMove(board, move, PieceColor.DARK)).toBe(true);
    });

    it('rejects placement on occupied cell', () => {
      const board = makeBoard([{ color: PieceColor.DARK, row: 7, col: 7 }]);
      const move: GomokuMove = { stoneId: 'gs_preview', to: { row: 7, col: 7 }, color: PieceColor.LIGHT };
      expect(isValidGomokuMove(board, move, PieceColor.LIGHT)).toBe(false);
    });

    it('rejects move when not your turn', () => {
      const board = createInitialGomokuBoard();
      const move: GomokuMove = { stoneId: 'gs1', to: { row: 7, col: 7 }, color: PieceColor.LIGHT };
      expect(isValidGomokuMove(board, move, PieceColor.LIGHT)).toBe(false);
    });

    it('rejects out-of-bounds placement', () => {
      const board = createInitialGomokuBoard();
      const move: GomokuMove = { stoneId: 'gs1', to: { row: -1, col: 7 }, color: PieceColor.DARK };
      expect(isValidGomokuMove(board, move, PieceColor.DARK)).toBe(false);
    });
  });

  describe('applyMove', () => {
    it('places stone and flips nextColor', () => {
      const board = createInitialGomokuBoard();
      const move: GomokuMove = { stoneId: 'gs_preview', to: { row: 7, col: 7 }, color: PieceColor.DARK };
      const newBoard = applyGomokuMove(board, move);
      expect(newBoard.stones.length).toBe(1);
      expect(newBoard.nextColor).toBe(PieceColor.LIGHT);
    });

    it('assigns canonical stone ID', () => {
      const board = createInitialGomokuBoard();
      const move: GomokuMove = { stoneId: 'gs_preview', to: { row: 7, col: 7 }, color: PieceColor.DARK };
      const newBoard = applyGomokuMove(board, move);
      expect(newBoard.stones[0].id).toBe('gs1');
    });
  });

  describe('game result', () => {
    it('detects horizontal five-in-a-row', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, row: 7, col: 3 },
        { color: PieceColor.DARK, row: 7, col: 4 },
        { color: PieceColor.DARK, row: 7, col: 5 },
        { color: PieceColor.DARK, row: 7, col: 6 },
        { color: PieceColor.DARK, row: 7, col: 7 },
      ], PieceColor.LIGHT);
      const result = getGomokuGameResult(board);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.winner).toBe(PieceColor.DARK);
        expect(result.isDraw).toBe(false);
        expect(result.winningLine!.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('detects vertical five-in-a-row', () => {
      const board = makeBoard([
        { color: PieceColor.LIGHT, row: 3, col: 7 },
        { color: PieceColor.LIGHT, row: 4, col: 7 },
        { color: PieceColor.LIGHT, row: 5, col: 7 },
        { color: PieceColor.LIGHT, row: 6, col: 7 },
        { color: PieceColor.LIGHT, row: 7, col: 7 },
      ], PieceColor.DARK);
      const result = getGomokuGameResult(board);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.winner).toBe(PieceColor.LIGHT);
      }
    });

    it('detects diagonal five-in-a-row', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, row: 3, col: 3 },
        { color: PieceColor.DARK, row: 4, col: 4 },
        { color: PieceColor.DARK, row: 5, col: 5 },
        { color: PieceColor.DARK, row: 6, col: 6 },
        { color: PieceColor.DARK, row: 7, col: 7 },
      ], PieceColor.LIGHT);
      const result = getGomokuGameResult(board);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.winner).toBe(PieceColor.DARK);
      }
    });

    it('returns null when no winner and board not full', () => {
      const board = makeBoard([
        { color: PieceColor.DARK, row: 7, col: 7 },
      ], PieceColor.LIGHT);
      const result = getGomokuGameResult(board);
      expect(result).toBeNull();
    });

    it('detects draw when board is full with no winner', () => {
      const stones: Array<{ color: PieceColor; row: number; col: number }> = [];
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const color = ((r * 15 + c) % 3 === 0) ? PieceColor.DARK : PieceColor.LIGHT;
          stones.push({ color, row: r, col: c });
        }
      }
      const board = makeBoard(stones, PieceColor.DARK);
      expect(board.stones.length).toBe(225);
      const result = getGomokuGameResult(board);
      if (result && !result.winner) {
        expect(result.isDraw).toBe(true);
      }
    });
  });
});
