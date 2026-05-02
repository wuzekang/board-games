import { DraughtsStrategy } from './draughts.strategy';
import { ChessStrategy } from './chess.strategy';
import { GomokuStrategy } from './gomoku.strategy';
import { GoStrategy } from './go.strategy';
import { ChineseChessStrategy } from './chinese_chess.strategy';
import { LudoStrategy } from './ludo.strategy';
import type { GameStrategy } from './interface';

const REGISTRY: Record<string, GameStrategy<any, any>> = {
  draughts: new DraughtsStrategy(10),
  chess: new ChessStrategy(),
  chinese_chess: new ChineseChessStrategy(),
  gomoku: new GomokuStrategy(),
  go: new GoStrategy(),
  ludo: new LudoStrategy(),
};

export function getStrategy(gameType: string, boardSize?: number): GameStrategy<any, any> {
  if (gameType === 'go' && boardSize) {
    return new GoStrategy(boardSize);
  }
  if (gameType === 'draughts' && boardSize) {
    return new DraughtsStrategy(boardSize);
  }
  const strategy = REGISTRY[gameType];
  if (!strategy) throw new Error(`Unknown game type: ${gameType}`);
  return strategy;
}
