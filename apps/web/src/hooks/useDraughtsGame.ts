import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BoardState, Move, Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import { applyMove, getAllValidMoves, getValidMovesForPiece } from '@board-games/shared/draughts';
import { orpc } from '../orpc-client';
import { useDraughtsAnimationSequencer } from './useDraughtsAnimationSequencer';
import { buildDraughtsMoveFrames } from '../types/draughtsAnimation';
import { addToast } from './useToast';
import { playSound } from '../utils/sounds';

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
  const [localBoard, setLocalBoard] = useState<BoardState | null>(null);
  const { animState, runSequence, clearAnim } = useDraughtsAnimationSequencer();
  const isAnimating = animState !== null;

  const makeMoveMutation = useMutation({
    mutationFn: (move: Move) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  useEffect(() => {
    if (!animState && board && !makeMoveMutation.isPending) {
      setLocalBoard(board);
    }
  }, [board, animState, makeMoveMutation.isPending]);

  const handleDraughtsMove = useCallback(
    (targetMove: Move, currentBoard: BoardState) => {
      const prevLastMove = lastMove;
      setSelection({ type: 'idle' });
      setLastMove({ from: targetMove.from, to: targetMove.to });

      const boardAfterHuman = applyMove(currentBoard, targetMove);
      setLocalBoard(boardAfterHuman);

      const humanFrames = buildDraughtsMoveFrames(targetMove);
      runSequence(humanFrames, currentBoard, () => {
        clearAnim();

        makeMoveMutation.mutate(targetMove, {
          onSuccess: (data) => {
            queryClient.setQueryData(['game', gameId], data.game);
            if (data.aiMove) {
              const aiMove = data.aiMove as Move;
              const boardAfterAI = applyMove(boardAfterHuman, aiMove);
              setLocalBoard(boardAfterAI);

              const aiFrames = buildDraughtsMoveFrames(data.aiMove as Move);
              runSequence(aiFrames, boardAfterHuman, () => {
                setLastMove({ from: aiMove.from, to: aiMove.to });
                clearAnim();
                queryClient.invalidateQueries({ queryKey: ['game', gameId] });
                queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
              }, (frame) => {
                if (frame.type === 'move') playSound('move');
                if (frame.type === 'capture') playSound('capture');
                if (frame.type === 'promote') playSound('promote');
              });
            } else {
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
              queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
            }
          },
          onError: () => {
            setLastMove(prevLastMove);
            setLocalBoard(currentBoard);
            addToast('Move failed, please try again');
            queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          },
        });
      }, (frame) => {
        if (frame.type === 'move') playSound('move');
        if (frame.type === 'capture') playSound('capture');
        if (frame.type === 'promote') playSound('promote');
      });
    },
    [runSequence, clearAnim, makeMoveMutation, queryClient, gameId],
  );

  const handleCellClick = useCallback(
    (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending || isAnimating) return;

      if (selection.type === 'pieceSelected') {
        const targetMove = selection.validMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col,
        );
        if (targetMove) {
          handleDraughtsMove(targetMove, localBoard);
          return;
        }

        const clickedPiece = localBoard.pieces.find(
          (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
        );
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = getValidMovesForPiece(localBoard, clickedPiece.id);
          setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
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
        const moves = getValidMovesForPiece(localBoard, clickedPiece.id);
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
        playSound('click');
      }
    },
    [localBoard, isHumanTurn, isFinished, selection, humanColor, makeMoveMutation, isAnimating, handleDraughtsMove],
  );

  useEffect(() => {
    if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending || isAnimating || selection.type !== 'idle') return;
    const allMoves = getAllValidMoves(localBoard, humanColor);
    if (allMoves.length !== 1) return;
    const uniquePieceIds = new Set(allMoves.map(m => m.pieceId));
    if (uniquePieceIds.size !== 1) return;
    handleDraughtsMove(allMoves[0], localBoard);
  }, [localBoard, isHumanTurn, isFinished, isAnimating, selection, humanColor, handleDraughtsMove, makeMoveMutation.isPending]);

  const validMoves =
    selection.type === 'pieceSelected' && !isAnimating
      ? selection.validMoves
      : [];

  const dangerousTargets: Position[] =
    selection.type === 'pieceSelected' && !isAnimating && localBoard
      ? (() => {
          const pieceId = selection.pieceId;
          const opponentColor = humanColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
          const results: Position[] = [];
          for (const m of selection.validMoves) {
            const afterMove = applyMove(localBoard, m);
            const movedPiece = afterMove.pieces.find((p) => p.id === pieceId);
            if (!movedPiece) continue;
            const opponentMoves = getAllValidMoves(afterMove, opponentColor);
            const isDangerous = opponentMoves.some((om) =>
              om.capturedPieceIds.includes(pieceId),
            );
            if (isDangerous) results.push(m.to);
          }
          return results;
        })()
      : [];

  const validTargets =
    selection.type === 'pieceSelected' && !isAnimating
      ? selection.validMoves.map((m) => m.to)
      : [];

  const selectedPieceId = selection.type === 'pieceSelected' ? selection.pieceId : null;

  const resetSelection = useCallback(() => {
    setSelection({ type: 'idle' });
    setLastMove(null);
    if (board) setLocalBoard(board);
  }, [board]);

  const forcedCaptureHint =
    isHumanTurn && !isFinished && localBoard
      ? (() => {
          const allMoves = getAllValidMoves(localBoard, humanColor);
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
          return '必须吃子！请选择高亮的棋子';
        })()
      : null;

  const aiColor = humanColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  const threatenedPieceIds =
    isHumanTurn && !isFinished && localBoard
      ? (() => {
          const aiMoves = getAllValidMoves(localBoard, aiColor);
          const ids = new Set<string>();
          for (const m of aiMoves) {
            for (const cid of m.capturedPieceIds) {
              ids.add(cid);
            }
          }
          return ids;
        })()
      : new Set<string>();

  const movablePieceIds =
    isHumanTurn && !isFinished && localBoard
      ? (() => {
          const allMoves = getAllValidMoves(localBoard, humanColor);
          const ids = new Set(allMoves.map(m => m.pieceId));
          return ids;
        })()
      : null;

  return {
    localBoard,
    selectedPieceId,
    validTargets,
    validMoves,
    lastMove,
    animState,
    isAnimating,
    isPending: makeMoveMutation.isPending,
    forcedCaptureHint,
    movablePieceIds,
    threatenedPieceIds,
    dangerousTargets,
    handleCellClick,
    resetSelection,
    reset: useCallback(() => { resetSelection(); setLastMove(null); }, [resetSelection]),
  };
}
