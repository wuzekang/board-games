/** Draughts-only animation types and frame builder. Not used by chess or gomoku. */
import type { Position, BoardState, Move, PieceColor } from '@board-games/shared';

export interface DraughtsAnimationState {
  boardSnapshot: BoardState;
  movingPieces: Map<string, { from: Position; to: Position }>;
  fadingPieceIds: Set<string>;
  promotingPieceIds: Set<string>;
  removedPieceIds: Set<string>;
  captureEffects: Map<string, { position: Position; count: number; pieceColor: PieceColor }>;
  flashCells: Set<string>;
}

export type DraughtsAnimationFrame =
  | { type: 'move'; pieceId: string; from: Position; to: Position; duration: number }
  | { type: 'capture'; pieceIds: string[]; duration: number; captureIndex: number; positions: { pieceId: string; position: Position; pieceColor: PieceColor }[] }
  | { type: 'promote'; pieceId: string; duration: number };

export function buildDraughtsMoveFrames(move: Move, board: BoardState): DraughtsAnimationFrame[] {
  const frames: DraughtsAnimationFrame[] = [];
  let captureIndex = 0;

  const buildCaptureFrame = (pieceIds: string[]) => {
    const positions = pieceIds.map((pid) => {
      const p = board.pieces.find((pp) => pp.id === pid)!;
      return { pieceId: pid, position: { ...p.position }, pieceColor: p.color };
    });
    const index = ++captureIndex;
    return { type: 'capture' as const, pieceIds, duration: 350, captureIndex: index, positions };
  };

  if (move.type === 'step') {
    frames.push({ type: 'move', pieceId: move.pieceId, from: move.from, to: move.to, duration: 300 });
  } else if (move.type === 'capture') {
    frames.push({ type: 'move', pieceId: move.pieceId, from: move.from, to: move.to, duration: 250 });
    frames.push(buildCaptureFrame(move.capturedPieceIds));
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
      frames.push(buildCaptureFrame([move.capturedPieceIds[i]]));
    }
  }

  if (move.promoted) {
    frames.push({ type: 'promote', pieceId: move.pieceId, duration: 400 });
  }

  return frames;
}
