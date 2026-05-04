import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState, ChessMove, ChessPieceType } from '@board-games/shared/chess';
import { applyChessMove, getAllValidMoves, isInCheck as checkIsInCheck } from '@board-games/shared/chess';
import { orpc } from '../orpc-client';
import { addToast } from './useToast';
import { playSound, type SoundName } from '../utils/sounds';

function playChessMoveSound(move: ChessMove): void {
  const soundMap: Partial<Record<ChessMove['type'], SoundName>> = {
    normal: 'move',
    capture: 'capture',
    en_passant: 'capture',
    promotion_capture: 'capture',
    castling: 'castle',
    promotion: 'promote',
  };
  playSound(soundMap[move.type] ?? 'move');
}

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
  const [localBoard, setLocalBoard] = useState<ChessBoardState | null>(null);

  useEffect(() => {
    if (board) setLocalBoard(board);
  }, [board]);

  const makeMoveMutation = useMutation({
    mutationFn: (move: ChessMove) => orpc.makeMove({ gameId: gameId!, move: move as any }),
  });

  const isInCheck = useCallback(() => {
    if (!localBoard) return false;
    return checkIsInCheck(localBoard, humanColor);
  }, [localBoard, humanColor]);

  const handleCellClick = useCallback(
    async (pos: Position) => {
      if (!localBoard || !isHumanTurn || isFinished || makeMoveMutation.isPending) return;
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
          setSelection({ type: 'idle' });
          const boardBeforeMove = localBoard;
          setLocalBoard(applyChessMove(localBoard, chessMove));
          makeMoveMutation.mutate(chessMove, {
            onSuccess: (data) => {
              queryClient.setQueryData(['game', gameId], data.game);
              playChessMoveSound(chessMove);
              if (data.aiMove) {
                const aiMove = data.aiMove as ChessMove;
                playChessMoveSound(aiMove);
                setLastMove({ from: aiMove.from, to: aiMove.to });
                setLocalBoard(applyChessMove(applyChessMove(boardBeforeMove, chessMove), aiMove));
              }
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
            onError: () => {
              setLastMove(null);
              setSelection({ type: 'idle' });
              setLocalBoard(boardBeforeMove);
              addToast('Move failed, please try again');
              queryClient.invalidateQueries({ queryKey: ['game', gameId] });
            },
          });
          return;
        }

        const clickedPiece = localBoard.pieces.find(
          (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === humanColor,
        );
        if (clickedPiece && clickedPiece.id !== selection.pieceId) {
          const moves = (await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id })) as unknown as ChessMove[];
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
        const moves = (await orpc.getValidMoves({ gameId: gameId!, pieceId: clickedPiece.id })) as unknown as ChessMove[];
        setSelection({ type: 'pieceSelected', pieceId: clickedPiece.id, validMoves: moves });
        playSound('click');
      }
    },
    [localBoard, isHumanTurn, isFinished, selection, humanColor, gameId, makeMoveMutation, queryClient],
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
        setSelection({ type: 'idle' });
        const boardBeforeMove = localBoard!;
        setLocalBoard(applyChessMove(localBoard!, move));
        makeMoveMutation.mutate(move, {
          onSuccess: (data) => {
            queryClient.setQueryData(['game', gameId], data.game);
            playSound('promote');
            if (data.aiMove) {
              const aiMove = data.aiMove as ChessMove;
              playChessMoveSound(aiMove);
              setLastMove({ from: aiMove.from, to: aiMove.to });
              setLocalBoard(applyChessMove(applyChessMove(boardBeforeMove, move), aiMove));
            }
            queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          },
          onError: () => {
            setLastMove(null);
            setSelection({ type: 'idle' });
            setLocalBoard(boardBeforeMove);
            addToast('Move failed, please try again');
            queryClient.invalidateQueries({ queryKey: ['game', gameId] });
          },
        });
      }
    },
    [selection, localBoard, makeMoveMutation, queryClient, gameId],
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
  const isAwaitingPromotion = selection.type === 'awaitingPromotion';

  const aiColor = humanColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  const threatenedPieceIds =
    isHumanTurn && !isFinished && localBoard
      ? (() => {
          const aiMoves = getAllValidMoves(localBoard, aiColor);
          const ids = new Set<string>();
          for (const m of aiMoves) {
            if (m.capturedPieceId) ids.add(m.capturedPieceId);
          }
          return ids;
        })()
      : new Set<string>();

  const cancelPromotion = useCallback(() => {
    if (selection.type === 'awaitingPromotion') {
      setSelection({ type: 'idle' });
    }
  }, [selection]);

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
    isAwaitingPromotion,
    isPending: makeMoveMutation.isPending,
    handleCellClick,
    handlePromotionSelect,
    cancelPromotion,
    resetSelection,
  };
}
