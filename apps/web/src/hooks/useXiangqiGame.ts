import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { XiangqiBoardState, XiangqiMove } from '@board-games/shared/xiangqi';
import { applyXiangqiMove, getAllXiangqiValidMoves, isXiangqiInCheck as checkIsInCheck } from '@board-games/shared/xiangqi';
import { orpc } from '../orpc-client';
import { playSound } from '../utils/sounds';

type XiangqiSelectionState =
  | { type: 'idle' }
  | { type: 'pieceSelected'; pieceId: string; validMoves: XiangqiMove[] };

export function useXiangqiGame(
  gameId: string | undefined,
  board: XiangqiBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<XiangqiSelectionState>({ type: 'idle' });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [localBoard, setLocalBoard] = useState<XiangqiBoardState | null>(null);

  useEffect(() => {
    if (board) setLocalBoard(board);
  }, [board]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: XiangqiMove) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  const isInCheck = useCallback(() => {
    if (!localBoard) return false;
    return checkIsInCheck(localBoard, humanColor);
  }, [localBoard, humanColor]);

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
          setLocalBoard(applyXiangqiMove(localBoard, targetMove));
          makeMoveMutation.mutate(targetMove, {
            onSuccess: (data) => {
              queryClient.setQueryData(['game', gameId], data.game);
              playSound(targetMove.capturedPieceId ? 'capture' : 'move');
              if (data.aiMove) {
                const aiMove = data.aiMove as XiangqiMove;
                playSound(aiMove.capturedPieceId ? 'capture' : 'move');
                setLastMove({ from: aiMove.from, to: aiMove.to });
                setLocalBoard(applyXiangqiMove(applyXiangqiMove(boardBeforeMove, targetMove), aiMove));
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
          setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves as XiangqiMove[] });
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
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves as XiangqiMove[] });
        playSound('click');
      }
    },
    [localBoard, isHumanTurn, isFinished, selection, humanColor, gameId, makeMoveMutation, queryClient],
  );

  const prevIsInCheckRef = useRef(false);
  const isInCheckNow = !isFinished && isInCheck();
  useEffect(() => {
    if (isInCheckNow && !prevIsInCheckRef.current) {
      playSound('check');
    }
    prevIsInCheckRef.current = isInCheckNow;
  }, [isInCheckNow]);

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;
  const validMoves = selection.type === 'pieceSelected' ? selection.validMoves : [];

  const aiColor = humanColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  const threatenedPieceIds =
    isHumanTurn && !isFinished && localBoard
      ? (() => {
          const aiMoves = getAllXiangqiValidMoves(localBoard, aiColor);
          const ids = new Set<string>();
          for (const m of aiMoves) {
            if (m.capturedPieceId) ids.add(m.capturedPieceId);
          }
          return ids;
        })()
      : new Set<string>();

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
    isInCheck: !isFinished && isInCheck(),
    threatenedPieceIds,
    isPending: makeMoveMutation.isPending,
    handleCellClick,
    resetSelection,
  };
}
