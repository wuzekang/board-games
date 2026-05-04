import { useState, useCallback, useRef, useEffect } from 'react';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GoBoardState, GoMove } from '@board-games/shared/go';
import { applyGoMove, getGoGameResult } from '@board-games/shared/go';
import { useOptimisticBoard } from './useOptimisticBoard';
import { playSound } from '../utils/sounds';

export function useGoGame(
  gameId: string | undefined,
  board: GoBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const [lastMove, setLastMove] = useState<Position | null>(null);

  const { localBoard, isPending, executeMove } = useOptimisticBoard<GoBoardState, GoMove>({
    gameId,
    board,
    applyMove: applyGoMove,
  });

  const handleIntersectionClick = useCallback(
    (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || isPending) return;
      const occupied = localBoard.stones.some(
        (s) => s.position.row === pos.row && s.position.col === pos.col,
      );
      if (occupied) return;

      const move: GoMove = { stoneId: 'go_preview', to: pos, color: humanColor, isPass: false };
      setLastMove(pos);
      executeMove(move, {
        humanSound: 'place',
        aiSound: (ai) => (!ai.isPass ? 'place' : undefined),
        onAIMoveReceived: (ai) => { if (!ai.isPass) setLastMove(ai.to); },
        onErrorReset: () => setLastMove(null),
      });
    },
    [localBoard, isHumanTurn, isFinished, isPending, humanColor, executeMove],
  );

  const handlePass = useCallback(() => {
    if (!localBoard || !isHumanTurn || isFinished || isPending) return;
    const passMove: GoMove = {
      stoneId: 'go_pass',
      to: { row: -1, col: -1 },
      color: humanColor,
      isPass: true,
    };
    executeMove(passMove, {
      aiSound: (ai) => (!ai.isPass ? 'place' : undefined),
      onAIMoveReceived: (ai) => { if (!ai.isPass) setLastMove(ai.to); },
    });
  }, [localBoard, isHumanTurn, isFinished, isPending, humanColor, executeMove]);

  const prevCaptureCountRef = useRef(0);
  useEffect(() => {
    if (!localBoard) return;
    const total = localBoard.capturedByDark + localBoard.capturedByLight;
    if (total > prevCaptureCountRef.current) playSound('capture');
    prevCaptureCountRef.current = total;
  }, [localBoard]);

  const goScore = (() => {
    if (!localBoard || !isFinished) return null;
    return getGoGameResult(localBoard)?.score ?? null;
  })();

  return {
    localBoard,
    lastMove,
    goScore,
    isPending,
    handleIntersectionClick,
    handlePass,
    reset: useCallback(() => setLastMove(null), []),
  };
}
