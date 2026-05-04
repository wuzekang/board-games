import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';
import type { LudoBoardState, AnyLudoMove } from '@board-games/shared/ludo';
import { applyLudoMove, getAllValidLudoMoves } from '@board-games/shared/ludo';
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
  const [localBoard, setLocalBoard] = useState<LudoBoardState | null>(null);
  const isSubmittingPass = useRef(false);
  const hasMovedThisRoll = useRef(false);

  useEffect(() => {
    if (board) setLocalBoard(board);
  }, [board]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: AnyLudoMove) =>
      orpc.makeMove({ gameId: gameId!, move: move as ContractLudoMove }),
    onSuccess: (data) => {
      isSubmittingPass.current = false;
      hasMovedThisRoll.current = true;
      setPhase({ type: 'idle' });
      if (data.game) queryClient.setQueryData(['game', gameId], data.game);
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
    },
    onError: () => {
      isSubmittingPass.current = false;
      hasMovedThisRoll.current = true;
      setPhase({ type: 'idle' });
      if (localBoard && board) setLocalBoard(board);
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });

  useEffect(() => {
    if (!localBoard || !isHumanTurn || isFinished || localBoard.diceValue === null) {
      if (!isHumanTurn || isFinished) {
        setPhase({ type: 'idle' });
        isSubmittingPass.current = false;
      }
      return;
    }

    if (hasMovedThisRoll.current) return;

    const validMoves = getAllValidLudoMoves(localBoard, localBoard.currentPlayerIndex, localBoard.diceValue);

    if (validMoves.length === 1 && validMoves[0].pieceId === '') {
      if (!isSubmittingPass.current && !makeMoveMutation.isPending) {
        isSubmittingPass.current = true;
        addToast('没有可走的棋，自动跳过');
        setPhase({ type: 'thinking' });
        const boardBeforeMove = localBoard;
        setLocalBoard(applyLudoMove(localBoard, validMoves[0]));
        makeMoveMutation.mutate(validMoves[0]);
      }
    } else {
      setPhase({ type: 'rolled', diceValue: localBoard.diceValue, validMoves });
    }
  }, [localBoard, isHumanTurn, isFinished]);

  const rollDiceMutation = useMutation({
    mutationFn: () => orpc.rollDice({ gameId: gameId! }),
    onSuccess: (data) => {
      hasMovedThisRoll.current = false;
      const validMoves = (data.validMoves as ContractLudoMove[]).map(
        (m): AnyLudoMove => ({ ...m }),
      );
      if (data.game) queryClient.setQueryData(['game', gameId], data.game);
      if (validMoves.length === 1 && validMoves[0].pieceId === '') {
        queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        return;
      }
      setPhase({ type: 'rolled', diceValue: data.diceValue, validMoves });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
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
      if (phase.type !== 'rolled' || !localBoard) return;
      const move = phase.validMoves.find((m) => m.pieceId === pieceId);
      if (!move) return;
      setPhase({ type: 'thinking' });
      const boardBeforeMove = localBoard;
      setLocalBoard(applyLudoMove(localBoard, move));
      makeMoveMutation.mutate(move, {
        onError: () => {
          setLocalBoard(boardBeforeMove);
        },
      });
    },
    [phase, localBoard, makeMoveMutation],
  );

  return {
    localBoard,
    phase,
    isPending: rollDiceMutation.isPending || makeMoveMutation.isPending,
    handleRollDice,
    handlePieceClick,
  };
}
