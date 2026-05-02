import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChineseChessBoardState, ChineseChessMove } from '@board-games/shared/chinese_chess';
import { isInCheck as checkIsInCheck } from '@board-games/shared/chinese_chess';
import { orpc } from '../orpc-client';

type ChineseChessSelectionState =
  | { type: 'idle' }
  | { type: 'pieceSelected'; pieceId: string; validMoves: ChineseChessMove[] };

export function useChineseChessGame(
  gameId: string | undefined,
  board: ChineseChessBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<ChineseChessSelectionState>({ type: 'idle' });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  const makeMoveMutation = useMutation({
    mutationFn: (move: ChineseChessMove) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  const isInCheck = useCallback(() => {
    if (!board) return false;
    return checkIsInCheck(board, humanColor);
  }, [board, humanColor]);

  const handleCellClick = useCallback(
    async (pos: Position) => {
      if (!board || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;

      if (selection.type === 'pieceSelected') {
        const targetMove = selection.validMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col,
        );
        if (targetMove) {
          setLastMove({ from: targetMove.from, to: targetMove.to });
          makeMoveMutation.mutate(targetMove, {
            onSuccess: (data) => {
              if (data.aiMove) {
                const aiMove = data.aiMove as ChineseChessMove;
                setLastMove({ from: aiMove.from, to: aiMove.to });
              }
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
          });
          return;
        }

        const clickedPiece = board.pieces.find(
          (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
        );
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id });
          setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves as ChineseChessMove[] });
          return;
        }

        setSelection({ type: 'idle' });
        return;
      }

      const clickedPiece = board.pieces.find(
        (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
      );
      if (clickedPiece) {
        const moves = await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id });
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves as ChineseChessMove[] });
      }
    },
    [board, isHumanTurn, isFinished, selection, humanColor, gameId, makeMoveMutation, queryClient],
  );

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;
  const validMoves = selection.type === 'pieceSelected' ? selection.validMoves : [];

  const resetSelection = useCallback(() => {
    setSelection({ type: 'idle' });
    setLastMove(null);
  }, []);

  return {
    selectedPieceId,
    validMoves,
    lastMove,
    isInCheck: !isFinished && isInCheck(),
    isPending: makeMoveMutation.isPending,
    handleCellClick,
    resetSelection,
  };
}
