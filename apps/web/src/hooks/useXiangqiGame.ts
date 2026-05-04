import { useState, useCallback, useRef, useMemo } from 'react';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { XiangqiBoardState, XiangqiMove } from '@board-games/shared/xiangqi';
import {
  applyXiangqiMove, getAllXiangqiValidMoves,
  getXiangqiValidMovesForPiece, isXiangqiInCheck,
} from '@board-games/shared/xiangqi';
import { useOptimisticBoard } from './useOptimisticBoard';
import { usePieceSelection } from './usePieceSelection';
import { useCheckSound } from './useCheckSound';

function findXiangqiPieceAt(board: XiangqiBoardState, pos: Position, color: PieceColor) {
  return board.pieces.find(
    (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === color,
  );
}
const getXiangqiMoveTarget = (m: XiangqiMove) => m.to;

export function useXiangqiGame(
  gameId: string | undefined,
  board: XiangqiBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  const { localBoard, isPending, executeMove } = useOptimisticBoard<XiangqiBoardState, XiangqiMove>({
    gameId,
    board,
    applyMove: applyXiangqiMove,
    errorMessage: '走棋失败，请重试',
  });

  const handleMove = useCallback(
    (move: XiangqiMove) => {
      setLastMove({ from: move.from, to: move.to });
      executeMove(move, {
        humanSound: move.capturedPieceId ? 'capture' : 'move',
        aiSound: (ai) => ai.capturedPieceId ? 'capture' : 'move',
        onAIMoveReceived: (ai) => setLastMove({ from: ai.from, to: ai.to }),
        onErrorReset: () => setLastMove(null),
      });
    },
    [executeMove],
  );

  const onMoveRef = useRef<(m: XiangqiMove) => void>(() => {});

  const { selectedPieceId, validMoves, handleCellClick, resetSelection } =
    usePieceSelection<XiangqiBoardState, XiangqiMove>({
      board: localBoard,
      humanColor,
      isHumanTurn,
      isFinished,
      isPending,
      getValidMovesForPiece: getXiangqiValidMovesForPiece,
      findPieceAt: findXiangqiPieceAt,
      getMoveTarget: getXiangqiMoveTarget,
      onMove: useCallback((m) => onMoveRef.current(m), []),
    });

  onMoveRef.current = (move: XiangqiMove) => {
    resetSelection();
    handleMove(move);
  };

  const isInCheckNow = !isFinished && !!localBoard && isXiangqiInCheck(localBoard, humanColor);
  useCheckSound(isInCheckNow);

  const aiColor = humanColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const threatenedPieceIds = useMemo(() => {
    if (!isHumanTurn || isFinished || !localBoard) return new Set<string>();
    const ids = new Set<string>();
    for (const m of getAllXiangqiValidMoves(localBoard, aiColor)) {
      if (m.capturedPieceId) ids.add(m.capturedPieceId);
    }
    return ids;
  }, [isHumanTurn, isFinished, localBoard, aiColor]);

  return {
    localBoard,
    selectedPieceId,
    validMoves,
    lastMove,
    isInCheck: isInCheckNow,
    threatenedPieceIds,
    isPending,
    handleCellClick,
    reset: useCallback(() => { resetSelection(); setLastMove(null); }, [resetSelection]),
  };
}
