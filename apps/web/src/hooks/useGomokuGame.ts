import { useState, useCallback } from 'react';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import { applyGomokuMove, getGomokuGameResult } from '@board-games/shared/gomoku';
import { useOptimisticBoard } from './useOptimisticBoard';

export function useGomokuGame(
  gameId: string | undefined,
  board: GomokuBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const [lastMove, setLastMove] = useState<Position | null>(null);

  const { localBoard, isPending, executeMove } = useOptimisticBoard<GomokuBoardState, GomokuMove>({
    gameId,
    board,
    applyMove: applyGomokuMove,
  });

  const handleIntersectionClick = useCallback(
    (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || isPending) return;
      const occupied = localBoard.stones.some(
        (s) => s.position.row === pos.row && s.position.col === pos.col,
      );
      if (occupied) return;

      const move: GomokuMove = {
        stoneId: `gs_${Date.now()}`,
        to: pos,
        color: humanColor,
      };
      setLastMove(pos);
      executeMove(move, {
        humanSound: 'place',
        aiSound: 'place',
        onAIMoveReceived: (ai) => setLastMove(ai.to),
        onErrorReset: () => setLastMove(null),
      });
    },
    [localBoard, isHumanTurn, isFinished, isPending, humanColor, executeMove],
  );

  const winningLine = (() => {
    if (!localBoard || !isFinished) return null;
    return getGomokuGameResult(localBoard)?.winningLine ?? null;
  })();

  return {
    localBoard,
    lastMove,
    winningLine,
    isPending,
    handleIntersectionClick,
    reset: useCallback(() => setLastMove(null), []),
  };
}
