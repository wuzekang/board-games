import { describe, it, expect } from 'vitest';
import {
  createInitialChessBoard,
  getAllValidMoves,
  getValidMovesForPiece,
  isValidChessMove,
  applyChessMove,
  getChessGameResult,
  isInCheck,
} from '../rules';
import {
  ChessPieceType,
  ChessMoveType,
} from '../types';
import { PieceColor } from '../../types/board';
import type { ChessBoardState, ChessMove, ChessPiece } from '../types';

function makeBoard(
  pieces: Array<{ type: ChessPieceType; color: PieceColor; row: number; col: number; hasMoved?: boolean }>,
  enPassantTarget: { row: number; col: number } | null = null,
  halfMoveClock: number = 0,
): ChessBoardState {
  return {
    size: 8,
    pieces: pieces.map((p, i) => ({
      id: `ct${i + 1}`,
      type: p.type,
      color: p.color,
      position: { row: p.row, col: p.col },
      hasMoved: p.hasMoved ?? true,
    })),
    enPassantTarget,
    halfMoveClock,
    fullMoveNumber: 1,
  };
}

describe('chess rules', () => {
  describe('initial board', () => {
    it('creates 32 pieces', () => {
      const board = createInitialChessBoard();
      expect(board.pieces.length).toBe(32);
    });

    it('each side has 16 pieces', () => {
      const board = createInitialChessBoard();
      expect(board.pieces.filter(p => p.color === PieceColor.LIGHT).length).toBe(16);
      expect(board.pieces.filter(p => p.color === PieceColor.DARK).length).toBe(16);
    });
  });

  describe('pawn moves', () => {
    it('can move one or two squares from starting position', () => {
      const board = makeBoard([
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 6, col: 4, hasMoved: false },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const fwdMoves = moves.filter(m => m.to.col === 4);
      expect(fwdMoves.length).toBe(2);
    });

    it('moves only one square after moving', () => {
      const board = makeBoard([
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 5, col: 4, hasMoved: true },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const fwdMoves = moves.filter(m => m.to.col === 4 && m.to.row === 4);
      expect(fwdMoves.length).toBe(1);
    });

    it('captures diagonally', () => {
      const board = makeBoard([
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 4, col: 4, hasMoved: true },
        { type: ChessPieceType.PAWN, color: PieceColor.LIGHT, row: 3, col: 5, hasMoved: true },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const capture = moves.find(m => m.to.row === 3 && m.to.col === 5);
      expect(capture).toBeDefined();
      expect(capture!.type).toBe(ChessMoveType.CAPTURE);
    });
  });

  describe('knight moves', () => {
    it('moves in L-shape', () => {
      const board = makeBoard([
        { type: ChessPieceType.KNIGHT, color: PieceColor.DARK, row: 4, col: 4 },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.length).toBeGreaterThan(0);
    });

    it('can jump over pieces', () => {
      const board = makeBoard([
        { type: ChessPieceType.KNIGHT, color: PieceColor.DARK, row: 7, col: 1, hasMoved: false },
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 6, col: 1, hasMoved: false },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.some(m => m.to.row === 5 && m.to.col === 2)).toBe(true);
    });
  });

  describe('castling', () => {
    it('allows kingside castling when path is clear and no check', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4, hasMoved: false },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 7, hasMoved: false },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const castle = moves.find(m => m.type === ChessMoveType.CASTLING);
      expect(castle).toBeDefined();
    });

    it('prevents castling when king has moved', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4, hasMoved: true },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 7, hasMoved: false },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.every(m => m.type !== ChessMoveType.CASTLING)).toBe(true);
    });

    it('prevents castling through check', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4, hasMoved: false },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 7, hasMoved: false },
        { type: ChessPieceType.ROOK, color: PieceColor.LIGHT, row: 0, col: 5 },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.every(m => m.type !== ChessMoveType.CASTLING)).toBe(true);
    });
  });

  describe('queen moves', () => {
    it('moves in all 8 directions', () => {
      const board = makeBoard([
        { type: ChessPieceType.QUEEN, color: PieceColor.DARK, row: 4, col: 4 },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const cols = new Set(moves.map(m => m.to.col));
      const rows = new Set(moves.map(m => m.to.row));
      expect(cols.size).toBeGreaterThan(1);
      expect(rows.size).toBeGreaterThan(1);
      expect(moves.length).toBe(27);
    });

    it('is blocked by friendly piece', () => {
      const board = makeBoard([
        { type: ChessPieceType.QUEEN, color: PieceColor.DARK, row: 4, col: 4 },
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 4, col: 6 },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.every(m => !(m.to.row === 4 && m.to.col >= 6))).toBe(true);
    });
  });

  describe('bishop moves', () => {
    it('moves only diagonally', () => {
      const board = makeBoard([
        { type: ChessPieceType.BISHOP, color: PieceColor.DARK, row: 4, col: 4 },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(Math.abs(m.to.row - 4)).toBe(Math.abs(m.to.col - 4));
      }
    });
  });

  describe('rook moves', () => {
    it('moves only horizontally or vertically', () => {
      const board = makeBoard([
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 4, col: 4 },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.to.row === 4 || m.to.col === 4).toBe(true);
      }
    });
  });

  describe('castling', () => {
    it('allows queenside castling when path is clear', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4, hasMoved: false },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 0, hasMoved: false },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const castle = moves.find(m => m.type === ChessMoveType.CASTLING && m.to.col === 2);
      expect(castle).toBeDefined();
    });

    it('prevents castling when rook has moved', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4, hasMoved: false },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 7, hasMoved: true },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      expect(moves.every(m => m.type !== ChessMoveType.CASTLING)).toBe(true);
    });

    it('moves rook during castling apply', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4, hasMoved: false },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 7, hasMoved: false },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const castle = moves.find(m => m.type === ChessMoveType.CASTLING)!;
      expect(castle).toBeDefined();
      const newBoard = applyChessMove(board, castle);
      const king = newBoard.pieces.find(p => p.id === 'ct1')!;
      const rook = newBoard.pieces.find(p => p.id === 'ct2')!;
      expect(king.position.col).toBe(6);
      expect(rook.position.col).toBe(5);
    });
  });

  describe('pinned piece', () => {
    it('pinned piece cannot move off pin line', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4 },
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 2 },
        { type: ChessPieceType.ROOK, color: PieceColor.LIGHT, row: 7, col: 0 },
      ]);
      const pinnedRook = board.pieces.find(p => p.id === 'ct2')!;
      const moves = getValidMovesForPiece(board, pinnedRook.id);
      expect(moves.every(m => m.to.row === 7)).toBe(true);
    });
  });

  describe('insufficient material draw', () => {
    it('K vs K is draw', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4 },
        { type: ChessPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
      ]);
      const result = getChessGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.isDraw).toBe(true);
        expect(result.reason).toBe('insufficient_material');
      }
    });

    it('K+N vs K is draw', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4 },
        { type: ChessPieceType.KNIGHT, color: PieceColor.DARK, row: 5, col: 4 },
        { type: ChessPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
      ]);
      const result = getChessGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.isDraw).toBe(true);
        expect(result.reason).toBe('insufficient_material');
      }
    });
  });

  describe('en passant', () => {
    it('allows en passant capture after opponent double pawn push', () => {
      const board = makeBoard([
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 3, col: 4, hasMoved: true },
        { type: ChessPieceType.PAWN, color: PieceColor.LIGHT, row: 3, col: 5, hasMoved: true },
      ], { row: 2, col: 5 });
      const moves = getValidMovesForPiece(board, 'ct1');
      const ep = moves.find(m => m.type === ChessMoveType.EN_PASSANT);
      expect(ep).toBeDefined();
    });
  });

  describe('promotion', () => {
    it('generates promotion moves when pawn reaches last rank', () => {
      const board = makeBoard([
        { type: ChessPieceType.PAWN, color: PieceColor.DARK, row: 1, col: 4, hasMoved: true },
      ]);
      const moves = getValidMovesForPiece(board, 'ct1');
      const promoMoves = moves.filter(m => m.type === ChessMoveType.PROMOTION || m.type === ChessMoveType.PROMOTION_CAPTURE);
      expect(promoMoves.length).toBeGreaterThan(0);
      const promotionPieces = promoMoves.map(m => m.promotionPiece);
      expect(promotionPieces).toContain(ChessPieceType.QUEEN);
      expect(promotionPieces).toContain(ChessPieceType.ROOK);
      expect(promotionPieces).toContain(ChessPieceType.BISHOP);
      expect(promotionPieces).toContain(ChessPieceType.KNIGHT);
    });
  });

  describe('check detection', () => {
    it('detects king in check', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4 },
        { type: ChessPieceType.ROOK, color: PieceColor.LIGHT, row: 7, col: 0 },
      ]);
      expect(isInCheck(board, PieceColor.DARK)).toBe(true);
    });

    it('detects king safe', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4 },
        { type: ChessPieceType.ROOK, color: PieceColor.LIGHT, row: 0, col: 0 },
      ]);
      expect(isInCheck(board, PieceColor.DARK)).toBe(false);
    });
  });

  describe('game result', () => {
    it('detects checkmate', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 0, col: 0 },
        { type: ChessPieceType.KING, color: PieceColor.LIGHT, row: 7, col: 7 },
        { type: ChessPieceType.QUEEN, color: PieceColor.LIGHT, row: 1, col: 2 },
        { type: ChessPieceType.ROOK, color: PieceColor.LIGHT, row: 0, col: 3 },
      ]);
      const result = getChessGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.winner).toBe(PieceColor.LIGHT);
        expect(result.isDraw).toBe(false);
        expect(result.reason).toBe('checkmate');
      }
    });

    it('detects stalemate as draw', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 0, col: 0 },
        { type: ChessPieceType.QUEEN, color: PieceColor.LIGHT, row: 2, col: 1 },
        { type: ChessPieceType.KING, color: PieceColor.LIGHT, row: 7, col: 7 },
      ]);
      const result = getChessGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.isDraw).toBe(true);
        expect(result.reason).toBe('stalemate');
      }
    });

    it('detects 50-move draw rule', () => {
      const board = makeBoard([
        { type: ChessPieceType.KING, color: PieceColor.DARK, row: 7, col: 4 },
        { type: ChessPieceType.KING, color: PieceColor.LIGHT, row: 0, col: 4 },
      ], null, 100);
      const result = getChessGameResult(board, PieceColor.DARK);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.isDraw).toBe(true);
        expect(result.reason).toBe('fifty_move_rule');
      }
    });

    it('returns null when game continues', () => {
      const board = createInitialChessBoard();
      const result = getChessGameResult(board, PieceColor.LIGHT);
      expect(result).toBeNull();
    });
  });

  describe('applyMove', () => {
    it('moves piece correctly', () => {
      const board = makeBoard([
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 7, col: 0 },
      ]);
      const move: ChessMove = {
        pieceId: 'ct1',
        from: { row: 7, col: 0 },
        to: { row: 5, col: 0 },
        type: ChessMoveType.NORMAL,
        capturedPieceId: null,
        promotionPiece: null,
        rookFrom: null,
        rookTo: null,
        rookId: null,
      };
      const newBoard = applyChessMove(board, move);
      const rook = newBoard.pieces.find(p => p.id === 'ct1')!;
      expect(rook.position).toEqual({ row: 5, col: 0 });
    });

    it('removes captured piece', () => {
      const board = makeBoard([
        { type: ChessPieceType.ROOK, color: PieceColor.DARK, row: 5, col: 0 },
        { type: ChessPieceType.PAWN, color: PieceColor.LIGHT, row: 5, col: 4 },
      ]);
      const move: ChessMove = {
        pieceId: 'ct1',
        from: { row: 5, col: 0 },
        to: { row: 5, col: 4 },
        type: ChessMoveType.CAPTURE,
        capturedPieceId: 'ct2',
        promotionPiece: null,
        rookFrom: null,
        rookTo: null,
        rookId: null,
      };
      const newBoard = applyChessMove(board, move);
      expect(newBoard.pieces.find(p => p.id === 'ct2')).toBeUndefined();
    });
  });
});
