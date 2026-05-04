import { useState, useCallback, useRef, useMemo } from 'react';
import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState, ChessMove, ChessPieceType } from '@board-games/shared/chess';
import { applyChessMove, getAllValidMoves, getValidMovesForPiece, isInCheck as checkIsInCheck } from '@board-games/shared/chess';
import { useOptimisticBoard } from './useOptimisticBoard';
import { usePieceSelection } from './usePieceSelection';
import { useCheckSound } from './useCheckSound';
import { playSound, type SoundName } from '../utils/sounds';

function playChessMoveSound(move: ChessMove): SoundName | undefined {
  const soundMap: Partial<Record<ChessMove['type'], SoundName>> = {
    normal: 'move',
    capture: 'capture',
    en_passant: 'capture',
    promotion_capture: 'capture',
    castling: 'castle',
    promotion: 'promote',
  };
  return soundMap[move.type] ?? 'move';
}

function findChessPieceAt(board: ChessBoardState, pos: Position, color: PieceColor) {
  return board.pieces.find(
    (p) => p.position.row === pos.row && p.position.col === pos.col && p.color === color,
  );
}
const getChessMoveTarget = (m: ChessMove) => m.to;

export function useChessGame(
  gameId: string | undefined,
  board: ChessBoardState | null,
  humanColor: PieceColor,
  isHumanTurn: boolean,
  isFinished: boolean,
) {
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [promotionState, setPromotionState] = useState<{
    move: ChessMove;
    validMoves: ChessMove[];
  } | null>(null);

  const { localBoard, isPending, executeMove } = useOptimisticBoard<ChessBoardState, ChessMove>({
    gameId,
    board,
    applyMove: applyChessMove,
  });

  const dispatchChessMove = useCallback(
    (move: ChessMove) => {
      setLastMove({ from: move.from, to: move.to });
      setPromotionState(null);
      executeMove(move, {
        humanSound: playChessMoveSound(move),
        aiSound: (ai) => playChessMoveSound(ai),
        onAIMoveReceived: (ai) => setLastMove({ from: ai.from, to: ai.to }),
        onErrorReset: () => { setLastMove(null); setPromotionState(null); },
      });
    },
    [executeMove],
  );

  const onMoveRef = useRef<(m: ChessMove) => void>(() => {});

  const { selectedPieceId, validMoves, handleCellClick, resetSelection } =
    usePieceSelection<ChessBoardState, ChessMove>({
      board: localBoard,
      humanColor,
      isHumanTurn,
      isFinished,
      isPending: isPending || !!promotionState,
      getValidMovesForPiece,
      findPieceAt: findChessPieceAt,
      getMoveTarget: getChessMoveTarget,
      onMove: useCallback((m) => onMoveRef.current(m), []),
    });

  onMoveRef.current = (move: ChessMove) => {
    if (move.type === 'promotion' || move.type === 'promotion_capture') {
      const promotionMoves = (validMoves as ChessMove[]).filter(
        (m) =>
          m.to.row === move.to.row &&
          m.to.col === move.to.col &&
          (m.type === 'promotion' || m.type === 'promotion_capture'),
      );
      if (promotionMoves.length > 1) {
        resetSelection();
        setPromotionState({ move: promotionMoves[0], validMoves: promotionMoves });
        return;
      }
    }
    resetSelection();
    dispatchChessMove(move);
  };

  const handlePromotionSelect = useCallback(
    (pieceType: ChessPieceType) => {
      if (!promotionState) return;
      const move = promotionState.validMoves.find((m) => m.promotionPiece === pieceType);
      if (move) dispatchChessMove(move);
    },
    [promotionState, dispatchChessMove],
  );

  const cancelPromotion = useCallback(() => setPromotionState(null), []);

  const isInCheckNow = !isFinished && !!localBoard && checkIsInCheck(localBoard, humanColor);
  useCheckSound(isInCheckNow);

  const aiColor = humanColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
  const threatenedPieceIds = useMemo(() => {
    if (!isHumanTurn || isFinished || !localBoard) return new Set<string>();
    const ids = new Set<string>();
    for (const m of getAllValidMoves(localBoard, aiColor)) {
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
    isAwaitingPromotion: !!promotionState,
    isPending,
    handleCellClick,
    handlePromotionSelect,
    cancelPromotion,
    reset: useCallback(() => { resetSelection(); setLastMove(null); setPromotionState(null); }, [resetSelection]),
  };
}
