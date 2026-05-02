import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import { getGomokuGameResult } from '@board-games/shared/gomoku';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';

export function useGomokuGame(
  gameId: string | undefined,
  board: GomokuBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  const makeMoveMutation = useMutation({
    mutationFn: (move: GomokuMove) => orpc.makeMove({ gameId: gameId!, move }),
  });

  const handleIntersectionClick = useCallback(
    (pos: Position) => {
      if (!board || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
      const occupied = board.stones.some(
        (s) => s.position.row === pos.row && s.position.col === pos.col,
      );
      if (occupied) return;

      const move: GomokuMove = {
        stoneId: `gs_${Date.now()}`,
        to: pos,
        color: humanColor,
      };
      setLastMove({ from: pos, to: pos });
      makeMoveMutation.mutate(move, {
        onSuccess: (data) => {
          if (data.aiMove) {
            const aiGomokuMove = data.aiMove as unknown as GomokuMove;
            setLastMove({ from: aiGomokuMove.to, to: aiGomokuMove.to });
          }
          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        },
        onError: () => {
          setLastMove(null);
          addToast('Move failed, please try again');
          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        },
      });
    },
    [board, isHumanTurn, isFinished, makeMoveMutation, humanColor, queryClient, gameId],
  );

  const winningLine = (() => {
    if (!board || !isFinished) return null;
    const result = getGomokuGameResult(board);
    return result?.winningLine ?? null;
  })();

  const resetLastMove = useCallback(() => {
    setLastMove(null);
  }, []);

  return {
    lastMove: lastMove?.to ?? null,
    winningLine,
    isPending: makeMoveMutation.isPending,
    handleIntersectionClick,
    resetLastMove,
  };
}
