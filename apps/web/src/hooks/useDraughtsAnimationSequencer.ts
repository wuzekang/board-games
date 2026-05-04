import { useState, useRef, useCallback, useEffect } from 'react';
import { PieceType } from '@board-games/shared';
import type { BoardState } from '@board-games/shared';
import type { DraughtsAnimationFrame, DraughtsAnimationState } from '../types/draughtsAnimation';

export { type DraughtsAnimationState };

export function useDraughtsAnimationSequencer() {
  const [animState, setAnimState] = useState<DraughtsAnimationState | null>(null);
  const seqRef = useRef<{
    frames: DraughtsAnimationFrame[];
    index: number;
    onComplete: () => void;
    onFrame?: (frame: DraughtsAnimationFrame) => void;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processNextFrame = useCallback(() => {
    const seq = seqRef.current;
    if (!seq) return;

    if (seq.index >= seq.frames.length) {
      seqRef.current = null;
      seq.onComplete();
      return;
    }

    const frame = seq.frames[seq.index];
    seq.index++;
    seq.onFrame?.(frame);

    if (frame.type === 'move') {
      setAnimState((prev) => {
        if (!prev) return prev;
        const next = new Map(prev.movingPieces);
        next.set(frame.pieceId, { from: frame.from, to: frame.to });
        return { ...prev, movingPieces: next };
      });
      timeoutRef.current = setTimeout(() => {
        setAnimState((prev) => {
          if (!prev) return prev;
          const next = new Map(prev.movingPieces);
          next.delete(frame.pieceId);
          const nextBoard = {
            ...prev.boardSnapshot,
            pieces: prev.boardSnapshot.pieces.map((p) =>
              p.id === frame.pieceId ? { ...p, position: { ...frame.to } } : p,
            ),
          };
          return { ...prev, movingPieces: next, boardSnapshot: nextBoard };
        });
        processNextFrame();
      }, frame.duration);
    } else if (frame.type === 'capture') {
      setAnimState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fadingPieceIds: new Set([...prev.fadingPieceIds, ...frame.pieceIds]),
        };
      });
      timeoutRef.current = setTimeout(() => {
        setAnimState((prev) => {
          if (!prev) return prev;
          const newFading = new Set(prev.fadingPieceIds);
          const newRemoved = new Set(prev.removedPieceIds);
          const newBoard = {
            ...prev.boardSnapshot,
            pieces: prev.boardSnapshot.pieces.filter((p) => {
              if (frame.pieceIds.includes(p.id)) {
                newFading.delete(p.id);
                newRemoved.add(p.id);
                return false;
              }
              return true;
            }),
          };
          return {
            ...prev,
            fadingPieceIds: newFading,
            removedPieceIds: newRemoved,
            boardSnapshot: newBoard,
          };
        });
        processNextFrame();
      }, frame.duration);
    } else if (frame.type === 'promote') {
      setAnimState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          promotingPieceIds: new Set([...prev.promotingPieceIds, frame.pieceId]),
        };
      });
      timeoutRef.current = setTimeout(() => {
        setAnimState((prev) => {
          if (!prev) return prev;
          const next = new Set(prev.promotingPieceIds);
          next.delete(frame.pieceId);
          const nextBoard = {
            ...prev.boardSnapshot,
            pieces: prev.boardSnapshot.pieces.map((p) =>
              p.id === frame.pieceId ? { ...p, type: PieceType.KING } : p,
            ),
          };
          return { ...prev, promotingPieceIds: next, boardSnapshot: nextBoard };
        });
        processNextFrame();
      }, frame.duration);
    }
  }, []);

  const runSequence = useCallback(
    (frames: DraughtsAnimationFrame[], boardSnapshot: BoardState, onComplete: () => void, onFrame?: (frame: DraughtsAnimationFrame) => void) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setAnimState({
        boardSnapshot,
        movingPieces: new Map(),
        fadingPieceIds: new Set(),
        promotingPieceIds: new Set(),
        removedPieceIds: new Set(),
      });
      seqRef.current = { frames, index: 0, onComplete, onFrame };
      timeoutRef.current = setTimeout(() => processNextFrame(), 0);
    },
    [processNextFrame],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clearAnim = useCallback(() => {
    setAnimState(null);
  }, []);

  return { animState, runSequence, clearAnim };
}
