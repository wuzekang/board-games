/** Draughts-only animation types and frame builder. Not used by chess or gomoku. */
import type { Position, BoardState, Move } from '@board-games/shared';

export interface DraughtsAnimationState {
  boardSnapshot: BoardState;
  movingPieces: Map<string, { from: Position; to: Position }>;
  fadingPieceIds: Set<string>;
  promotingPieceIds: Set<string>;
  removedPieceIds: Set<string>;
}

export type DraughtsAnimationFrame =
  | { type: 'move'; pieceId: string; from: Position; to: Position; duration: number }
  | { type: 'capture'; pieceIds: string[]; duration: number }
  | { type: 'promote'; pieceId: string; duration: number };

export function buildDraughtsMoveFrames(move: Move): DraughtsAnimationFrame[] {
  const frames: DraughtsAnimationFrame[] = [];

  if (move.type === 'step') {
    frames.push({ type: 'move', pieceId: move.pieceId, from: move.from, to: move.to, duration: 300 });
  } else if (move.type === 'capture') {
    frames.push({ type: 'move', pieceId: move.pieceId, from: move.from, to: move.to, duration: 250 });
    frames.push({ type: 'capture', pieceIds: move.capturedPieceIds, duration: 200 });
  } else {
    const hops = move.path.length - 1;
    for (let i = 0; i < hops; i++) {
      frames.push({
        type: 'move',
        pieceId: move.pieceId,
        from: move.path[i],
        to: move.path[i + 1],
        duration: 250,
      });
      frames.push({
        type: 'capture',
        pieceIds: [move.capturedPieceIds[i]],
        duration: 200,
      });
    }
  }

  if (move.promoted) {
    frames.push({ type: 'promote', pieceId: move.pieceId, duration: 400 });
  }

  return frames;
}
