import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';
import { playSound, type SoundName } from '../utils/sounds';

export interface UseOptimisticBoardConfig<B, M> {
  gameId: string | undefined;
  board: B | null;
  applyMove: (board: B, move: M) => B;
  errorMessage?: string;
}

export interface ExecuteMoveOptions<M> {
  humanSound?: SoundName | ((move: M) => SoundName | undefined);
  aiSound?: SoundName | ((aiMove: M) => SoundName | undefined);
  onAIMoveReceived?: (aiMove: M) => void;
  onErrorReset?: () => void;
}

export function useOptimisticBoard<B, M>({
  gameId,
  board,
  applyMove,
  errorMessage = 'Move failed, please try again',
}: UseOptimisticBoardConfig<B, M>) {
  const queryClient = useQueryClient();
  const [localBoard, setLocalBoard] = useState<B | null>(null);
  const localBoardRef = useRef<B | null>(null);

  useEffect(() => {
    localBoardRef.current = localBoard;
  }, [localBoard]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: M) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  useEffect(() => {
    if (board && !makeMoveMutation.isPending) {
      setLocalBoard(board);
    }
  }, [board, makeMoveMutation.isPending]);

  const executeMove = useCallback(
    (move: M, options: ExecuteMoveOptions<M> = {}) => {
      const boardBeforeMove = localBoardRef.current!;
      setLocalBoard(applyMove(boardBeforeMove, move));

      makeMoveMutation.mutate(move as any, {
        onSuccess: (data) => {
          queryClient.setQueryData(['game', gameId], data.game);

          if (options.humanSound) {
            const snd =
              typeof options.humanSound === 'function'
                ? options.humanSound(move)
                : options.humanSound;
            if (snd) playSound(snd);
          }

          if (data.aiMove) {
            const aiMove = data.aiMove as unknown as M;

            if (options.aiSound) {
              const snd =
                typeof options.aiSound === 'function'
                  ? options.aiSound(aiMove)
                  : options.aiSound;
              if (snd) playSound(snd);
            }

            options.onAIMoveReceived?.(aiMove);
            setLocalBoard(applyMove(applyMove(boardBeforeMove, move), aiMove));
          }

          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
        },
        onError: () => {
          setLocalBoard(boardBeforeMove);
          options.onErrorReset?.();
          addToast(errorMessage);
          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        },
      });
    },
    [gameId, applyMove, makeMoveMutation, queryClient, errorMessage],
  );

  return {
    localBoard,
    setLocalBoard,
    isPending: makeMoveMutation.isPending,
    executeMove,
    makeMoveMutation,
  };
}
