import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { JungleBoardState, JungleMove } from '@board-games/shared/jungle';
import { applyJungleMove } from '@board-games/shared/jungle';
import { orpc } from '../orpc-client';
import { playSound } from '../utils/sounds';

type JungleSelectionState =
  | { type: 'idle' }
  | { type: 'pieceSelected'; pieceId: string; validMoves: JungleMove[] };

export function useJungleGame(
  gameId: string | undefined,
  board: JungleBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<JungleSelectionState>({ type: 'idle' });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [localBoard, setLocalBoard] = useState<JungleBoardState | null>(null);

  useEffect(() => {
    if (board) setLocalBoard(board);
  }, [board]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: JungleMove) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  const handleCellClick = useCallback(
    async (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;

      if (selection.type === 'pieceSelected') {
        const targetMove = selection.validMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col,
        );
        if (targetMove) {
          setLastMove({ from: targetMove.from, to: targetMove.to });
          setSelection({ type: 'idle' });
          const boardBeforeMove = localBoard;
          setLocalBoard(applyJungleMove(localBoard, targetMove));
          makeMoveMutation.mutate(targetMove, {
            onSuccess: (data) => {
              queryClient.setQueryData(['game', gameId], data.game);
              playSound(targetMove.capturedPieceId ? 'capture' : 'move');
              if (data.aiMove) {
                const aiMove = data.aiMove as unknown as JungleMove;
                playSound(aiMove.capturedPieceId ? 'capture' : 'move');
                setLastMove({ from: aiMove.from, to: aiMove.to });
                setLocalBoard(applyJungleMove(applyJungleMove(boardBeforeMove, targetMove), aiMove));
              }
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
            onError: () => {
              setLastMove(null);
              setSelection({ type: 'idle' });
              setLocalBoard(boardBeforeMove);
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
          });
          return;
        }

        const clickedPiece = localBoard.pieces.find(
          (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
        );
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id });
          setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves as JungleMove[] });
          playSound('click');
          return;
        }

        setSelection({ type: 'idle' });
        return;
      }

      const clickedPiece = localBoard.pieces.find(
        (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
      );
      if (clickedPiece) {
        const moves = await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id });
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves as JungleMove[] });
        playSound('click');
      }
    },
    [localBoard, isHumanTurn, isFinished, selection, humanColor, gameId, makeMoveMutation, queryClient],
  );

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;
  const validMoves = selection.type === 'pieceSelected' ? selection.validMoves : [];

  const resetSelection = useCallback(() => {
    setSelection({ type: 'idle' });
    setLastMove(null);
    if (board) setLocalBoard(board);
  }, [board]);

  return {
    localBoard,
    selectedPieceId,
    validMoves,
    lastMove,
    isPending: makeMoveMutation.isPending,
    handleCellClick,
    resetSelection,
  };
}
