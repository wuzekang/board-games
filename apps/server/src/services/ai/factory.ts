import type { AIEngine } from './interface';
import type { BoardState, Move } from '@board-games/shared';
import type { ChessBoardState, ChessMove } from '@board-games/shared/chess';
import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import type { GoBoardState, GoMove } from '@board-games/shared/go';
import type { XiangqiBoardState, XiangqiMove } from '@board-games/shared/xiangqi';
import type { LudoBoardState, AnyLudoMove } from '@board-games/shared/ludo';
import type { JungleBoardState, JungleMove } from '@board-games/shared/jungle';
import { DraughtsAI } from './draughts';
import { ChessAI } from './chess';
import { GomokuAI } from './gomoku';
import { GoAI } from './go';
import { XiangqiAI } from './xiangqi';
import { LudoAI } from './ludo';
import { JungleAI } from './jungle';

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

export function createXiangqiAI(difficulty: string): AIEngine<XiangqiBoardState, XiangqiMove> {
  return new XiangqiAI(difficulty);
}

export function createLudoAI(difficulty: string): AIEngine<LudoBoardState, AnyLudoMove> {
  return new LudoAI(difficulty);
}

export function createJungleAI(difficulty: string): AIEngine<JungleBoardState, JungleMove> {
  return new JungleAI(difficulty);
}
