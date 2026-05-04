import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GomokuBoardState, GomokuMove } from '@board-games/shared/gomoku';
import { applyGomokuMove, getGomokuGameResult } from '@board-games/shared/gomoku';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';
import { playSound } from '../utils/sounds';

export function useGomokuGame(
  gameId: string | undefined,
  board: GomokuBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [localBoard, setLocalBoard] = useState<GomokuBoardState | null>(null);

  useEffect(() => {
    if (board) setLocalBoard(board);
  }, [board]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: GomokuMove) => orpc.makeMove({ gameId: gameId!, move }),
  });

  const handleIntersectionClick = useCallback(
    (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
      const occupied = localBoard.stones.some(
        (s) => s.position.row === pos.row && s.position.col === pos.col,
      );
      if (occupied) return;

      const move: GomokuMove = {
        stoneId: `gs_${Date.now()}`,
        to: pos,
        color: humanColor,
      };
      setLastMove({ from: pos, to: pos });
      const boardBeforeMove = localBoard;
      setLocalBoard(applyGomokuMove(localBoard, move));
      makeMoveMutation.mutate(move, {
        onSuccess: (data) => {
          queryClient.setQueryData(['game', gameId], data.game);
          playSound('place');
          if (data.aiMove) {
            const aiGomokuMove = data.aiMove as unknown as GomokuMove;
            playSound('place');
            setLastMove({ from: aiGomokuMove.to, to: aiGomokuMove.to });
            setLocalBoard(applyGomokuMove(applyGomokuMove(boardBeforeMove, move), aiGomokuMove));
          }
          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
        },
        onError: () => {
          setLastMove(null);
          setLocalBoard(boardBeforeMove);
          addToast('Move failed, please try again');
          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        },
      });
    },
    [localBoard, isHumanTurn, isFinished, makeMoveMutation, humanColor, queryClient, gameId],
  );

  const winningLine = (() => {
    if (!localBoard || !isFinished) return null;
    const result = getGomokuGameResult(localBoard);
    return result?.winningLine ?? null;
  })();

  const resetLastMove = useCallback(() => {
    setLastMove(null);
    if (board) setLocalBoard(board);
  }, [board]);

  return {
    localBoard,
    lastMove: lastMove?.to ?? null,
    winningLine,
    isPending: makeMoveMutation.isPending,
    handleIntersectionClick,
    resetLastMove,
  };
}
