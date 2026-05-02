import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BoardState, Move, Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import { applyMove, getAllValidMoves } from '@board-games/shared/draughts';
import { orpc } from '../orpc-client';
import { useDraughtsAnimationSequencer } from './useDraughtsAnimationSequencer';
import { buildDraughtsMoveFrames } from '../types/draughtsAnimation';
import { addToast } from './useToast';

type SelectionState =
  | { type: 'idle' }
  | { type: 'pieceSelected'; pieceId: string; validMoves: Move[] };

export function useDraughtsGame(
  gameId: string | undefined,
  board: BoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<SelectionState>({ type: 'idle' });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const { animState, runSequence } = useDraughtsAnimationSequencer();
  const isAnimating = animState !== null;

  const makeMoveMutation = useMutation({
    mutationFn: (move: Move) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  const handleDraughtsMove = useCallback(
    (targetMove: Move, currentBoard: BoardState) => {
      const prevLastMove = lastMove;
      setSelection({ type: 'idle' });
      setLastMove({ from: targetMove.from, to: targetMove.to });

      const humanFrames = buildDraughtsMoveFrames(targetMove);
      runSequence(humanFrames, currentBoard, () => {
        makeMoveMutation.mutate(targetMove, {
          onSuccess: (data) => {
            if (data.aiMove) {
              const aiMove = data.aiMove as Move;
              const boardAfterHuman = applyMove(currentBoard, targetMove);
              const aiFrames = buildDraughtsMoveFrames(data.aiMove as Move);
              runSequence(aiFrames, boardAfterHuman, () => {
                setLastMove({ from: aiMove.from, to: aiMove.to });
                queryClient.invalidateQueries({ queryKey: ['game', gameId] });
              });
            } else {
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            }
          },
          onError: () => {
            setLastMove(prevLastMove);
            addToast('Move failed, please try again');
            queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          },
        });
      });
    },
    [runSequence, makeMoveMutation, queryClient, gameId],
  );

  const handleCellClick = useCallback(
    async (pos: Position) => {
      if (!board || !isHumanTurn || isFinished || makeMoveMutation.isPending || isAnimating) return;

      if (selection.type === 'pieceSelected') {
        const targetMove = selection.validMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col,
        );
        if (targetMove) {
          handleDraughtsMove(targetMove, board);
          return;
        }

        const clickedPiece = board.pieces.find(
          (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
        );
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = (await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id })) as unknown as Move[];
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
        const moves = (await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id })) as unknown as Move[];
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
      }
    },
    [board, isHumanTurn, isFinished, selection, humanColor, gameId, makeMoveMutation, isAnimating, handleDraughtsMove],
  );

  const validTargets =
    selection.type === 'pieceSelected' && !isAnimating
      ? selection.validMoves.map((m) => m.to)
      : [];

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;

  const resetSelection = useCallback(() => {
    setSelection({ type: 'idle' });
    setLastMove(null);
  }, []);

  const forcedCaptureHint =
    isHumanTurn && !isFinished && board
      ? (() => {
          const allMoves = getAllValidMoves(board, humanColor);
          const hasCapture = allMoves.some((m) => m.capturedPieceIds.length > 0);
          if (!hasCapture) return null;
          const selectedMoves =
            selection.type === 'pieceSelected' ? selection.validMoves : [];
          const selectedHasCapture = selectedMoves.some(
            (m) => m.capturedPieceIds.length > 0,
          );
          if (selectedHasCapture) return null;
          if (selection.type === 'pieceSelected' && selectedMoves.length === 0) {
            return '必须吃子！请选择可以吃子的棋子';
          }
          return '提示：有吃子机会时必须吃子';
        })()
      : null;

  const movablePieceIds =
    isHumanTurn && !isFinished && board
      ? (() => {
          const allMoves = getAllValidMoves(board, humanColor);
          const ids = new Set(allMoves.map(m => m.pieceId));
          return ids;
        })()
      : null;

  return {
    selectedPieceId,
    validTargets,
    lastMove,
    animState,
    isAnimating,
    isPending: makeMoveMutation.isPending,
    forcedCaptureHint,
    movablePieceIds,
    handleCellClick,
    resetSelection,
  };
}
