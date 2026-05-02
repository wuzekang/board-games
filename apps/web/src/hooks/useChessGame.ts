import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState, ChessMove, ChessPieceType } from '@board-games/shared/chess';
import { isInCheck as checkIsInCheck } from '@board-games/shared/chess';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';

type ChessSelectionState =
  | { type: 'idle' }
  | { type: 'pieceSelected'; pieceId: string; validMoves: ChessMove[] }
  | { type: 'awaitingPromotion'; move: ChessMove; validMoves: ChessMove[] };

export function useChessGame(
  gameId: string | undefined,
  board: ChessBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<ChessSelectionState>({ type: 'idle' });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  const makeMoveMutation = useMutation({
    mutationFn: (move: ChessMove) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  const isInCheck = useCallback(() => {
    if (!board) return false;
    return checkIsInCheck(board, humanColor);
  }, [board, humanColor]);

  const handleCellClick = useCallback(
    async (pos: Position) => {
      if (!board || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
      if (selection.type === 'awaitingPromotion') return;

      if (selection.type === 'pieceSelected') {
        const targetMove = selection.validMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col,
        );
        if (targetMove) {
          const chessMove = targetMove as ChessMove;
          if (chessMove.type === 'promotion' || chessMove.type === 'promotion_capture') {
            const promotionMoves = selection.validMoves.filter(
              (m) =>
                m.to.row === pos.row &&
                m.to.col === pos.col &&
                (m.type === 'promotion' || m.type === 'promotion_capture'),
            ) as ChessMove[];
            if (promotionMoves.length > 1) {
              setSelection({
                type: 'awaitingPromotion',
                move: promotionMoves[0],
                validMoves: promotionMoves,
              });
              return;
            }
          }
          setLastMove({ from: targetMove.from, to: targetMove.to });
          makeMoveMutation.mutate(chessMove, {
            onSuccess: (data) => {
              if (data.aiMove) {
                const aiMove = data.aiMove as ChessMove;
                setLastMove({ from: aiMove.from, to: aiMove.to });
              }
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
            onError: () => {
              setLastMove(null);
              setSelection({ type: 'idle' });
              addToast('Move failed, please try again');
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
          });
          return;
        }

        const clickedPiece = board.pieces.find(
          (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
        );
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = (await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id })) as unknown as ChessMove[];
          setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
          return;
        }

        setSelection({ type: 'idle' });
        return;
      }

      const clickedPiece = board.pieces.find(
        (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
      );
      if (clickedPiece) {
        const moves = (await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id })) as unknown as ChessMove[];
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
      }
    },
    [board, isHumanTurn, isFinished, selection, humanColor, gameId, makeMoveMutation, queryClient],
  );

  const handlePromotionSelect = useCallback(
    (pieceType: ChessPieceType) => {
      if (selection.type !== 'awaitingPromotion') return;
      const move = (selection.validMoves as ChessMove[]).find(
        (m) =>
          m.to.row === selection.move.to.row &&
          m.to.col === selection.move.to.col &&
          m.promotionPiece === pieceType,
      );
      if (move) {
        setLastMove({ from: move.from, to: move.to });
        makeMoveMutation.mutate(move, {
          onSuccess: (data) => {
            if (data.aiMove) {
              const aiMove = data.aiMove as ChessMove;
              setLastMove({ from: aiMove.from, to: aiMove.to });
            }
            queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          },
          onError: () => {
            setLastMove(null);
            setSelection({ type: 'idle' });
            addToast('Move failed, please try again');
            queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          },
        });
      }
    },
    [selection, makeMoveMutation, queryClient, gameId],
  );

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;
  const validMoves = selection.type === 'pieceSelected' ? selection.validMoves : [];
  const isAwaitingPromotion = selection.type === 'awaitingPromotion';

  const cancelPromotion = useCallback(() => {
    if (selection.type === 'awaitingPromotion') {
      setSelection({ type: 'idle' });
    }
  }, [selection]);

  const resetSelection = useCallback(() => {
    setSelection({ type: 'idle' });
    setLastMove(null);
  }, []);

  return {
    selectedPieceId,
    validMoves,
    lastMove,
    isInCheck: !isFinished && isInCheck(),
    isAwaitingPromotion,
    isPending: makeMoveMutation.isPending,
    handleCellClick,
    handlePromotionSelect,
    cancelPromotion,
    resetSelection,
  };
}
