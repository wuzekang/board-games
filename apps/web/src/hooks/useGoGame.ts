import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GoBoardState, GoMove } from '@board-games/shared/go';
import { getGoGameResult } from '@board-games/shared/go';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';

export function useGoGame(
  gameId: string | undefined,
  board: GoBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  const makeMoveMutation = useMutation({
    mutationFn: (move: GoMove) => orpc.makeMove({ gameId: gameId!, move }),
  });

  const handleIntersectionClick = useCallback(
    (pos: Position) => {
      if (!board || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
      const occupied = board.stones.some(
        (s) => s.position.row === pos.row && s.position.col === pos.col,
      );
      if (occupied) return;

      const move: GoMove = {
        stoneId: 'go_preview',
        to: pos,
        color: humanColor,
        isPass: false,
      };
      setLastMove({ from: pos, to: pos });
      makeMoveMutation.mutate(move, {
        onSuccess: (data) => {
          if (data.aiMove) {
            const aiGoMove = data.aiMove as unknown as GoMove;
            if (!aiGoMove.isPass) {
              setLastMove({ from: aiGoMove.to, to: aiGoMove.to });
            }
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

  const handlePass = useCallback(() => {
    if (!board || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
    const passMove: GoMove = {
      stoneId: 'go_pass',
      to: { row: -1, col: -1 },
      color: humanColor,
      isPass: true,
    };
    makeMoveMutation.mutate(passMove, {
      onSuccess: (data) => {
        if (data.aiMove) {
          const aiGoMove = data.aiMove as unknown as GoMove;
          if (!aiGoMove.isPass) {
            setLastMove({ from: aiGoMove.to, to: aiGoMove.to });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      },
      onError: () => {
        addToast('Pass failed, please try again');
        queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      },
    });
  }, [board, isHumanTurn, isFinished, makeMoveMutation, humanColor, queryClient, gameId]);

  const goScore = (() => {
    if (!board || !isFinished) return null;
    const result = getGoGameResult(board);
    return result?.score ?? null;
  })();

  const resetLastMove = useCallback(() => {
    setLastMove(null);
  }, []);

  return {
    lastMove: lastMove?.to ?? null,
    goScore,
    isPending: makeMoveMutation.isPending,
    handleIntersectionClick,
    handlePass,
    resetLastMove,
  };
}
