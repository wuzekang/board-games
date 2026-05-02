import type { PieceColor } from '@board-games/shared';

export interface AIEngine<B, M> {
  getBestMove(board: B, aiColor: PieceColor): M | null;
}
