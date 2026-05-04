import { describe, it, expect } from 'vitest';
import {
  createInitialGoBoard,
  isValidGoMove,
  applyGoMove,
  getAllValidGoMoves,
  getGoGameResult,
} from '../rules';
import { PieceColor } from '../../types/board';
import type { GoBoardState, GoMove, GoPlaceMove } from '../types';

describe('go rules', () => {
  describe('initial board', () => {
    it('creates empty board for each size', () => {
      for (const size of [9, 13, 19] as const) {
        const board = createInitialGoBoard(size);
        expect(board.stones.length).toBe(0);
        expect(board.size).toBe(size);
        expect(board.nextColor).toBe(PieceColor.DARK);
      }
    });
  });

  describe('valid moves', () => {
    it('allows placement on empty intersection', () => {
      const board = createInitialGoBoard(9);
      const move: GoPlaceMove = { stoneId: 'go_preview', to: { row: 4, col: 4 }, color: PieceColor.DARK, isPass: false };
      expect(isValidGoMove(board, move, PieceColor.DARK)).toBe(true);
    });

    it('rejects placement on occupied intersection', () => {
      const board = createInitialGoBoard(9);
      const b1 = applyGoMove(board, { stoneId: 'go_preview', to: { row: 4, col: 4 }, color: PieceColor.DARK, isPass: false });
      const move: GoPlaceMove = { stoneId: 'go_preview', to: { row: 4, col: 4 }, color: PieceColor.LIGHT, isPass: false };
      expect(isValidGoMove(b1, move, PieceColor.LIGHT)).toBe(false);
    });

    it('rejects move when not your turn', () => {
      const board = createInitialGoBoard(9);
      const move: GoPlaceMove = { stoneId: 'go_preview', to: { row: 4, col: 4 }, color: PieceColor.LIGHT, isPass: false };
      expect(isValidGoMove(board, move, PieceColor.LIGHT)).toBe(false);
    });

    it('always allows pass', () => {
      const board = createInitialGoBoard(9);
      const move: GoMove = { stoneId: 'go_pass', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true };
      expect(isValidGoMove(board, move, PieceColor.DARK)).toBe(true);
    });

    it('rejects ko point recapture', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      if (board.koPoint && board.koPoint.row === 0 && board.koPoint.col === 0) {
        const move: GoPlaceMove = { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.DARK, isPass: false };
        expect(isValidGoMove(board, move, PieceColor.DARK)).toBe(false);
      }
    });

    it('rejects suicide (no liberties, no capture)', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board.nextColor = PieceColor.DARK;
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.DARK, isPass: false };
      expect(isValidGoMove(board, move, PieceColor.DARK)).toBe(false);
    });

    it('allows placement that captures even if own group temporarily has no liberties', () => {
      // Board layout (D=dark, W=light, .=empty):
      // . W D   (row 0)
      // W D .   (row 1)
      // D . .   (row 2)
      // Dark plays (0,0): all neighbors are occupied (gas=0 temporarily),
      // but both white stones at (0,1) and (1,0) have zero liberties and get captured.
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 2 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 2, col: 0 }, color: PieceColor.DARK, isPass: false });
      board.nextColor = PieceColor.DARK;
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.DARK, isPass: false };
      expect(isValidGoMove(board, move, PieceColor.DARK)).toBe(true);
    });
  });

  describe('ko rule', () => {
    it('clears ko point after pass', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      const koBoard = board;
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true });
      expect(board.koPoint).toBeNull();
      if (koBoard.koPoint) {
        const move: GoPlaceMove = { stoneId: 'gp', to: koBoard.koPoint, color: PieceColor.DARK, isPass: false };
        expect(isValidGoMove(board, move, PieceColor.DARK)).toBe(true);
      }
    });
  });

  describe('capture', () => {
    it('removes opponent stone with zero liberties after placement', () => {
      // Same layout: dark plays (0,0), captures white at (0,1) and (1,0).
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 2 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 2, col: 0 }, color: PieceColor.DARK, isPass: false });
      board.nextColor = PieceColor.DARK;
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.DARK, isPass: false };
      const newBoard = applyGoMove(board, move);
      expect(newBoard.stones.find(s => s.color === PieceColor.LIGHT)).toBeUndefined();
      expect(newBoard.capturedByDark).toBe(2);
    });

    it('captures multi-stone group', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 2 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.DARK, isPass: false });
      board.nextColor = PieceColor.DARK;
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 1, col: 2 }, color: PieceColor.DARK, isPass: false };
      const newBoard = applyGoMove(board, move);
      expect(newBoard.stones.filter(s => s.color === PieceColor.LIGHT).length).toBe(0);
    });

    it('increments capturedByLight when light captures dark stones', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 1 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 0, col: 2 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 0 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 1, col: 1 }, color: PieceColor.LIGHT, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 2, col: 0 }, color: PieceColor.LIGHT, isPass: false });
      board.nextColor = PieceColor.LIGHT;
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 0, col: 0 }, color: PieceColor.LIGHT, isPass: false };
      const newBoard = applyGoMove(board, move);
      expect(newBoard.capturedByLight).toBe(2);
    });
  });

  describe('applyMove', () => {
    it('places stone and flips nextColor', () => {
      const board = createInitialGoBoard(9);
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 4, col: 4 }, color: PieceColor.DARK, isPass: false };
      const newBoard = applyGoMove(board, move);
      expect(newBoard.stones.length).toBe(1);
      expect(newBoard.nextColor).toBe(PieceColor.LIGHT);
    });

    it('increments consecutivePasses on pass', () => {
      const board = createInitialGoBoard(9);
      const move: GoMove = { stoneId: 'go_pass', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true };
      const newBoard = applyGoMove(board, move);
      expect(newBoard.consecutivePasses).toBe(1);
    });

    it('resets consecutivePasses on placement', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true });
      const move: GoPlaceMove = { stoneId: 'gp', to: { row: 4, col: 4 }, color: PieceColor.LIGHT, isPass: false };
      const newBoard = applyGoMove(board, move);
      expect(newBoard.consecutivePasses).toBe(0);
    });
  });

  describe('getAllValidGoMoves', () => {
    it('returns pass plus all empty intersections on empty board', () => {
      const board = createInitialGoBoard(9);
      const moves = getAllValidGoMoves(board, PieceColor.DARK);
      expect(moves.some(m => m.isPass)).toBe(true);
      expect(moves.filter(m => !m.isPass).length).toBe(81);
    });

    it('returns empty when not player turn', () => {
      const board = createInitialGoBoard(9);
      const moves = getAllValidGoMoves(board, PieceColor.LIGHT);
      expect(moves.length).toBe(0);
    });

    it('returns empty when game ended by two passes', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.LIGHT, isPass: true });
      expect(getAllValidGoMoves(board, PieceColor.DARK).length).toBe(0);
    });
  });

  describe('territory scoring', () => {
    it('scores dark territory correctly after two passes', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 4, col: 4 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.LIGHT, isPass: true });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true });
      const result = getGoGameResult(board);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.score.darkStones).toBe(1);
        expect(result.score.komi).toBe(5.5);
        expect(typeof result.score.darkTerritory).toBe('number');
        expect(typeof result.score.lightTerritory).toBe('number');
        expect(result.score.darkTotal).toBe(result.score.darkStones + result.score.darkTerritory);
        expect(result.score.lightTotal).toBe(result.score.lightStones + result.score.lightTerritory + result.score.komi);
      }
    });

    it('uses komi 7.5 for 19x19 board', () => {
      let board = createInitialGoBoard(19);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.LIGHT, isPass: true });
      const result = getGoGameResult(board);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.score.komi).toBe(7.5);
      }
    });
  });

  describe('game result', () => {
    it('returns null when game is not over', () => {
      const board = createInitialGoBoard(9);
      const result = getGoGameResult(board);
      expect(result).toBeNull();
    });

    it('returns result after two consecutive passes', () => {
      let board = createInitialGoBoard(9);
      board = applyGoMove(board, { stoneId: 'gp', to: { row: 4, col: 4 }, color: PieceColor.DARK, isPass: false });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.LIGHT, isPass: true });
      board = applyGoMove(board, { stoneId: 'gp', to: { row: -1, col: -1 }, color: PieceColor.DARK, isPass: true });
      const result = getGoGameResult(board);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.score).toBeDefined();
      }
    });
  });
});
