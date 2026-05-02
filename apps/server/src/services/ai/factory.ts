import type { AIEngine } from './interface';
import type { BoardState, Move } from '@board-games/shared';
import type { ChessBoardState, ChessMove } from '@board-games/shared/chess';
import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import type { GoBoardState, GoMove } from '@board-games/shared/go';
import type { ChineseChessBoardState, ChineseChessMove } from '@board-games/shared/chinese_chess';
import type { LudoBoardState, AnyLudoMove } from '@board-games/shared/ludo';
import { DraughtsAI } from './draughts';
import { ChessAI } from './chess';
import { GomokuAI } from './gomoku';
import { GoAI } from './go';
import { ChineseChessAI } from './chinese_chess';
import { LudoAI } from './ludo';

export function createDraughtsAI(difficulty: string): AIEngine<BoardState, Move> {
  return new DraughtsAI(difficulty);
}

export function createChessAI(difficulty: string): AIEngine<ChessBoardState, ChessMove> {
  return new ChessAI(difficulty);
}

export function createGomokuAI(difficulty: string): AIEngine<GomokuBoardState, GomokuMove> {
  return new GomokuAI(difficulty);
}

export function createGoAI(difficulty: string): AIEngine<GoBoardState, GoMove> {
  return new GoAI(difficulty);
}

export function createChineseChessAI(difficulty: string): AIEngine<ChineseChessBoardState, ChineseChessMove> {
  return new ChineseChessAI(difficulty);
}

export function createLudoAI(difficulty: string): AIEngine<LudoBoardState, AnyLudoMove> {
  return new LudoAI(difficulty);
}
