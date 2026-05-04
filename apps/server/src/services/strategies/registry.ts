import { DraughtsStrategy } from './draughts.strategy';
import { ChessStrategy } from './chess.strategy';
import { GomokuStrategy } from './gomoku.strategy';
import { GoStrategy } from './go.strategy';
import { XiangqiStrategy } from './xiangqi.strategy';
import { LudoStrategy } from './ludo.strategy';
import { JungleStrategy } from './jungle.strategy';
import type { GameStrategy } from './interface';

const REGISTRY: Record<string, GameStrategy<any, any>> = {
  draughts: new DraughtsStrategy(10),
  chess: new ChessStrategy(),
  xiangqi: new XiangqiStrategy(),
  gomoku: new GomokuStrategy(),
  go: new GoStrategy(),
  ludo: new LudoStrategy(),
  jungle: new JungleStrategy(),
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
