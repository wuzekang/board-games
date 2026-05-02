import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';
import type { LudoBoardState, AnyLudoMove } from '@board-games/shared/ludo';
import { getAllValidLudoMoves } from '@board-games/shared/ludo';
import type { ContractLudoMove } from '@board-games/shared/contracts';

type LudoPhase =
  | { type: 'idle' }
  | { type: 'rolled'; diceValue: number; validMoves: AnyLudoMove[] }
  | { type: 'thinking' };

export function useLudoGame(
  gameId: string | undefined,
  board: LudoBoardState | null,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<LudoPhase>({ type: 'idle' });
  const isSubmittingPass = useRef(false);
  const hasMovedThisRoll = useRef(false);

  const makeMoveMutation = useMutation({
    mutationFn: (move: AnyLudoMove) =>
      orpc.makeMove({ gameId: gameId!, move: move as ContractLudoMove }),
    onSuccess: () => {
      isSubmittingPass.current = false;
      hasMovedThisRoll.current = true;
      setPhase({ type: 'idle' });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: () => {
      isSubmittingPass.current = false;
      hasMovedThisRoll.current = true;
      setPhase({ type: 'idle' });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });

  useEffect(() => {
    if (!board || !isHumanTurn || isFinished || board.diceValue === null) {
      if (!isHumanTurn || isFinished) {
        setPhase({ type: 'idle' });
        isSubmittingPass.current = false;
      }
      return;
    }

    if (hasMovedThisRoll.current) return;

    const validMoves = getAllValidLudoMoves(board, board.currentPlayerIndex, board.diceValue);

    if (validMoves.length === 1 && validMoves[0].pieceId === '') {
      if (!isSubmittingPass.current && !makeMoveMutation.isPending) {
        isSubmittingPass.current = true;
        addToast('没有可走的棋，自动跳过');
        setPhase({ type: 'thinking' });
        makeMoveMutation.mutate(validMoves[0]);
      }
    } else {
      setPhase({ type: 'rolled', diceValue: board.diceValue, validMoves });
    }
  }, [board, isHumanTurn, isFinished]);

  const rollDiceMutation = useMutation({
    mutationFn: () => orpc.rollDice({ gameId: gameId! }),
    onSuccess: (data) => {
      hasMovedThisRoll.current = false;
      const validMoves = (data.validMoves as ContractLudoMove[]).map(
        (m): AnyLudoMove => ({ ...m }),
      );
      if (validMoves.length === 1 && validMoves[0].pieceId === '') {
        queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        return;
      }
      setPhase({ type: 'rolled', diceValue: data.diceValue, validMoves });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: () => {
      addToast('掷骰子失败，请重试');
    },
  });

  const handleRollDice = useCallback(() => {
    if (!isHumanTurn || isFinished || phase.type !== 'idle') return;
    rollDiceMutation.mutate();
  }, [isHumanTurn, isFinished, phase, rollDiceMutation]);

  const handlePieceClick = useCallback(
    (pieceId: string) => {
      if (phase.type !== 'rolled') return;
      const move = phase.validMoves.find((m) => m.pieceId === pieceId);
      if (!move) return;
      setPhase({ type: 'thinking' });
      makeMoveMutation.mutate(move);
    },
    [phase, makeMoveMutation],
  );

  return {
    phase,
    isPending: rollDiceMutation.isPending || makeMoveMutation.isPending,
    handleRollDice,
    handlePieceClick,
  };
}
