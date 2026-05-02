import type { PieceColor } from '@board-games/shared';
import type { LudoBoardState, AnyLudoMove, LudoPlayerIndex } from '@board-games/shared/ludo';
import { getAllValidLudoMoves, applyLudoMove, getLudoGameResult } from '@board-games/shared/ludo';
import type { AIEngine } from '../interface';

export class LudoAI implements AIEngine<LudoBoardState, AnyLudoMove> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: LudoBoardState, _aiColor: PieceColor): AnyLudoMove | null {
    if (board.diceValue === null) return null;
    const moves = getAllValidLudoMoves(
      board,
      board.currentPlayerIndex,
      board.diceValue,
    );
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    if (this.difficulty === 'easy') {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const score = this.scoreMove(move, board);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private scoreMove(move: AnyLudoMove, board: LudoBoardState): number {
    if (move.pieceId === '') return -1000;

    let score = 0;
    const after = applyLudoMove(board, move);
    const result = getLudoGameResult(after);
    const playerIdx = board.currentPlayerIndex;

    if (result?.winner === playerIdx) {
      score += 1_000_000;
    }

    if (move.reachedGoal) score += 100_000;
    if (move.capturedPieceId) score += 10_000;
    if (move.enteredHomeStretch) score += 5_000;
    if (move.fromTrackIndex === -1 && move.toTrackIndex === 0) score += 3_000;

    score += move.toTrackIndex * 10;

    if (this.difficulty === 'hard' && move.toTrackIndex >= 0 && move.toTrackIndex < 52) {
      const dangerPenalty = this.dangerScore(move.toTrackIndex, playerIdx, board);
      score -= dangerPenalty * 500;
    }

    return score;
  }

  private dangerScore(toTrackIndex: number, playerIdx: LudoPlayerIndex, board: LudoBoardState): number {
    const abs = (PLAYER_LAUNCH_ABSOLUTE[playerIdx] + toTrackIndex) % 52;
    let danger = 0;

    for (const p of board.pieces) {
      if (p.playerIndex === playerIdx) continue;
      if (p.trackIndex < 0 || p.trackIndex >= 52) continue;

      const pAbs = (PLAYER_LAUNCH_ABSOLUTE[p.playerIndex] + p.trackIndex) % 52;
      const dist = (abs - pAbs + 52) % 52;

      if (dist >= 1 && dist <= 6) {
        danger += (7 - dist);
      }
    }

    return danger;
  }
}

import { PLAYER_LAUNCH_ABSOLUTE } from '@board-games/shared/ludo';
