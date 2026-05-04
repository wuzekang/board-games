import { useState, useCallback, useRef } from 'react';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { JungleBoardState, JungleMove } from '@board-games/shared/jungle';
import { applyJungleMove, getJungleValidMovesForPiece } from '@board-games/shared/jungle';
import { useOptimisticBoard } from './useOptimisticBoard';
import { usePieceSelection } from './usePieceSelection';

function findJunglePieceAt(board: JungleBoardState, pos: Position, color: PieceColor) {
  return board.pieces.find(
    (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === color,
  );
}
const getJungleMoveTarget = (m: JungleMove) => m.to;

export function useJungleGame(
  gameId: string | undefined,
  board: JungleBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  const { localBoard, isPending, executeMove } = useOptimisticBoard<JungleBoardState, JungleMove>({
    gameId,
    board,
    applyMove: applyJungleMove,
    errorMessage: '走棋失败，请重试',
  });

  const handleMove = useCallback(
    (move: JungleMove) => {
      setLastMove({ from: move.from, to: move.to });
      executeMove(move, {
        humanSound: move.capturedPieceId ? 'capture' : 'move',
        aiSound: (ai) => ai.capturedPieceId ? 'capture' : 'move',
        onAIMoveReceived: (ai) => setLastMove({ from: ai.from, to: ai.to }),
        onErrorReset: () => { setLastMove(null); },
      });
    },
    [executeMove],
  );

  const onMoveRef = useRef<(m: JungleMove) => void>(() => {});

  const { selectedPieceId, validMoves, handleCellClick, resetSelection } =
    usePieceSelection<JungleBoardState, JungleMove>({
      board: localBoard,
      humanColor,
      isHumanTurn,
      isFinished,
      isPending,
      getValidMovesForPiece: getJungleValidMovesForPiece,
      findPieceAt: findJunglePieceAt,
      getMoveTarget: getJungleMoveTarget,
      onMove: useCallback((m) => onMoveRef.current(m), []),
    });

  onMoveRef.current = (move: JungleMove) => {
    resetSelection();
    handleMove(move);
  };

  return {
    localBoard,
    selectedPieceId,
    validMoves,
    lastMove,
    isPending,
    handleCellClick,
    reset: useCallback(() => { resetSelection(); setLastMove(null); }, [resetSelection]),
  };
}
