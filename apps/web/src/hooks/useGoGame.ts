import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GoBoardState, GoMove } from '@board-games/shared/go';
import { applyGoMove, getGoGameResult } from '@board-games/shared/go';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';
import { playSound } from '../utils/sounds';

export function useGoGame(
  gameId: string | undefined,
  board: GoBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [localBoard, setLocalBoard] = useState<GoBoardState | null>(null);

  useEffect(() => {
    if (board) setLocalBoard(board);
  }, [board]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: GoMove) => orpc.makeMove({ gameId: gameId!, move }),
  });

  const handleIntersectionClick = useCallback(
    (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
      const occupied = localBoard.stones.some(
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
      const boardBeforeMove = localBoard;
      setLocalBoard(applyGoMove(localBoard, move));
      makeMoveMutation.mutate(move, {
        onSuccess: (data) => {
          queryClient.setQueryData(['game', gameId], data.game);
          playSound('place');
          if (data.aiMove) {
            const aiGoMove = data.aiMove as unknown as GoMove;
            if (!aiGoMove.isPass) {
              playSound('place');
              setLastMove({ from: aiGoMove.to, to: aiGoMove.to });
              setLocalBoard(applyGoMove(applyGoMove(boardBeforeMove, move), aiGoMove));
            }
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

  const handlePass = useCallback(() => {
    if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
    const passMove: GoMove = {
      stoneId: 'go_pass',
      to: { row: -1, col: -1 },
      color: humanColor,
      isPass: true,
    };
    const boardBeforeMove = localBoard;
    setLocalBoard(applyGoMove(localBoard, passMove));
    makeMoveMutation.mutate(passMove, {
      onSuccess: (data) => {
        queryClient.setQueryData(['game', gameId], data.game);
        if (data.aiMove) {
          const aiGoMove = data.aiMove as unknown as GoMove;
          if (!aiGoMove.isPass) {
            playSound('place');
            setLastMove({ from: aiGoMove.to, to: aiGoMove.to });
            setLocalBoard(applyGoMove(applyGoMove(boardBeforeMove, passMove), aiGoMove));
          }
        }
        queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
      },
      onError: () => {
        setLocalBoard(boardBeforeMove);
        addToast('Pass failed, please try again');
        queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      },
    });
  }, [localBoard, isHumanTurn, isFinished, makeMoveMutation, humanColor, queryClient, gameId]);

  const prevCaptureCountRef = useRef(0);
  useEffect(() => {
    if (!localBoard) return;
    const total = localBoard.capturedByDark + localBoard.capturedByLight;
    if (total > prevCaptureCountRef.current) {
      playSound('capture');
    }
    prevCaptureCountRef.current = total;
  }, [localBoard]);

  const goScore = (() => {
    if (!localBoard || !isFinished) return null;
    const result = getGoGameResult(localBoard);
    return result?.score ?? null;
  })();

  const resetLastMove = useCallback(() => {
    setLastMove(null);
    if (board) setLocalBoard(board);
  }, [board]);

  return {
    localBoard,
    lastMove: lastMove?.to ?? null,
    goScore,
    isPending: makeMoveMutation.isPending,
    handleIntersectionClick,
    handlePass,
    resetLastMove,
  };
}
