import { useState, useCallback, useRef } from 'react';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import { playSound } from '../utils/sounds';

type SelectionState<M> =
  | { type: 'idle' }
  | { type: 'pieceSelected'; pieceId: string; validMoves: M[] };

export interface UsePieceSelectionConfig<B, M> {
  board: B | null;
  humanColor: PieceColor;
  isHumanTurn: boolean;
  isFinished: boolean;
  isPending: boolean;
  isAnimating?: boolean;
  getValidMovesForPiece: (board: B, pieceId: string) => M[];
  findPieceAt: (board: B, pos: Position, color: PieceColor) => { id: string } | undefined;
  getMoveTarget: (move: M) => Position;
  onMove: (move: M) => void;
}

export function usePieceSelection<B, M>({
  board,
  humanColor,
  isHumanTurn,
  isFinished,
  isPending,
  isAnimating = false,
  getValidMovesForPiece,
  findPieceAt,
  getMoveTarget,
  onMove,
}: UsePieceSelectionConfig<B, M>) {
  const [selection, setSelection] = useState<SelectionState<M>>({ type: 'idle' });
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const stableOnMove = useCallback((m: M) => onMoveRef.current(m), []);

  const handleCellClick = useCallback(
    (pos: Position) => {
      if (!board || !isHumanTurn || isFinished || isPending || isAnimating) return;

      if (selection.type === 'pieceSelected') {
        const targetMove = selection.validMoves.find(
          (m) => {
            const t = getMoveTarget(m);
            return t.row === pos.row && t.col === pos.col;
          },
        );
        if (targetMove) {
          stableOnMove(targetMove);
          return;
        }

        const clickedPiece = findPieceAt(board, pos, humanColor);
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = getValidMovesForPiece(board, clickedPiece.id);
          setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
          playSound('click');
          return;
        }

        setSelection({ type: 'idle' });
        return;
      }

      const clickedPiece = findPieceAt(board, pos, humanColor);
      if (clickedPiece) {
        const moves = getValidMovesForPiece(board, clickedPiece.id);
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
        playSound('click');
      }
    },
    [board, isHumanTurn, isFinished, isPending, isAnimating, selection, humanColor, getValidMovesForPiece, findPieceAt, getMoveTarget, stableOnMove],
  );

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;
  const validMoves = selection.type === 'pieceSelected' ? selection.validMoves : [];
  const isIdle = selection.type === 'idle';

  const resetSelection = useCallback(() => {
    setSelection({ type: 'idle' });
  }, []);

  return {
    selection,
    selectedPieceId,
    validMoves,
    isIdle,
    handleCellClick,
    resetSelection,
    setSelection,
  };
}
