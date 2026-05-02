import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { orpc } from '../orpc-client';
import { addToast } from '../hooks/useToast';
import { Board } from '../components/game/Board';
import { ChessBoard } from '../components/game/ChessBoard';
import { ChineseChessBoard } from '../components/game/ChineseChessBoard';
import { GomokuBoard } from '../components/game/GomokuBoard';
import { GoBoard } from '../components/game/GoBoard';
import { LudoBoard } from '../components/game/LudoBoard';
import { LudoDicePanel } from '../components/game/LudoDicePanel';
import { PromotionDialog } from '../components/game/PromotionDialog';
import { GameStatus } from '../components/game/GameStatus';
import { GameControls } from '../components/game/GameControls';
import { MoveHistory } from '../components/game/MoveHistory';
import type { BoardState, Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState } from '@board-games/shared/chess';
import type { ChineseChessBoardState } from '@board-games/shared/chinese_chess';
import type { GomokuBoardState } from '@board-games/shared/gomoku';
import type { GoBoardState } from '@board-games/shared/go';
import type { LudoBoardState } from '@board-games/shared/ludo';
import type { DraughtsAnimationState } from '../types/draughtsAnimation';
import { useDraughtsGame } from '../hooks/useDraughtsGame';
import { useChessGame } from '../hooks/useChessGame';
import { useChineseChessGame } from '../hooks/useChineseChessGame';
import { useGomokuGame } from '../hooks/useGomokuGame';
import { useGoGame } from '../hooks/useGoGame';
import { useLudoGame } from '../hooks/useLudoGame';

type AnyBoard = BoardState | ChessBoardState | ChineseChessBoardState | GomokuBoardState | GoBoardState | LudoBoardState;

export function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => orpc.getGame({ gameId: gameId! }),
    enabled: !!gameId,
    refetchInterval: false,
  });

  const undoMutation = useMutation({
    mutationFn: () => orpc.undoMove({ gameId: gameId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: () => {
      addToast('悔棋失败，请重试');
    },
  });

  const resignMutation = useMutation({
    mutationFn: () => orpc.resignGame({ gameId: gameId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: () => {
      addToast('认输失败，请重试');
    },
  });

  const isChineseChess = game?.gameType === 'chinese_chess';
  const isChess = game?.gameType === 'chess';
  const isGomoku = game?.gameType === 'gomoku';
  const isGo = game?.gameType === 'go';
  const isLudo = game?.gameType === 'ludo';

  const titleMap: Record<string, string> = {
    draughts: '国际跳棋',
    chinese_chess: '中国象棋',
    chess: '国际象棋',
    gomoku: '五子棋',
    go: '围棋',
    ludo: '飞行棋',
  };

  useEffect(() => {
    if (game?.gameType) {
      document.title = titleMap[game.gameType] ?? '棋趣乐园';
    }
    return () => { document.title = '棋趣乐园'; };
  }, [game?.gameType]);
  const board: AnyBoard | null = game
    ? (JSON.parse(game.boardState) as AnyBoard)
    : null;
  const humanColor: PieceColor = game?.humanColor === 'dark' ? PieceColor.DARK : PieceColor.LIGHT;
  const isHumanTurn = game?.currentPlayer === 'human';
  const isFinished = game?.status === 'finished';
  const isDraw = game?.winner === 'draw';

  const draughts = useDraughtsGame(
    gameId,
    !isChineseChess && !isChess && !isGomoku && !isGo && !isLudo ? (board as BoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const chess = useChessGame(
    gameId,
    isChess ? (board as ChessBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const chineseChess = useChineseChessGame(
    gameId,
    isChineseChess ? (board as ChineseChessBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const gomoku = useGomokuGame(
    gameId,
    isGomoku ? (board as GomokuBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const go = useGoGame(
    gameId,
    isGo ? (board as GoBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const ludo = useLudoGame(
    gameId,
    isLudo ? (board as LudoBoardState) : null,
    isHumanTurn,
    isFinished,
  );

  if (isLoading || !game || !board) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-warm-200 border-t-warm-500" />
      </div>
    );
  }

  const colorLabel = isChineseChess
    ? humanColor === PieceColor.DARK ? '红方' : '黑方'
    : isGo
      ? humanColor === PieceColor.DARK ? '黑棋' : '白棋'
      : isGomoku
        ? humanColor === PieceColor.DARK ? '黑棋' : '白棋'
        : isChess
          ? humanColor === PieceColor.LIGHT ? '白方' : '黑方'
          : isLudo
            ? '红方'
            : humanColor === PieceColor.DARK ? '深色' : '浅色';

  const gameResult = isFinished
    ? isGo && go.goScore
      ? isDraw
        ? '🤝 和棋'
        : game.winner === 'human'
          ? `🎉 你赢了！(黑:${go.goScore.darkTotal.toFixed(1)} 白:${go.goScore.lightTotal.toFixed(1)})`
          : `AI 赢了 (黑:${go.goScore.darkTotal.toFixed(1)} 白:${go.goScore.lightTotal.toFixed(1)})`
      : isDraw
        ? game.drawReason === 'stalemate'
          ? '🤝 逼和'
          : game.drawReason === 'fifty_move_rule'
            ? '🤝 50步和棋'
            : game.drawReason === 'insufficient_material'
              ? '🤝 子力不足和棋'
              : game.drawReason === 'board_full'
                ? '🤝 棋盘满了，平局'
                : game.drawReason === 'equal-score'
                  ? '🤝 和棋'
                  : game.drawReason === 'sixty_move_rule'
                    ? '🤝 60步和棋'
                    : '🤝 和棋'
        : game.winner === 'human'
          ? '🎉 恭喜你赢了！'
          : 'AI 赢了，再试一次！'
    : null;

  const isProcessing = draughts.isPending || chess.isPending || chineseChess.isPending || gomoku.isPending || go.isPending || ludo.isPending || undoMutation.isPending;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div className="flex flex-1 flex-col items-center gap-3 min-w-0">
          <GameStatus
            currentTurn={game.currentPlayer}
            humanColor={game.humanColor}
            winner={game.winner}
            isFinished={isFinished}
            isThinking={isProcessing && game.currentPlayer === 'human'}
            customResult={gameResult}
            colorLabel={colorLabel}
            isInCheck={chess.isInCheck || chineseChess.isInCheck}
          />
          {isLudo && (
            <LudoDicePanel
              phase={ludo.phase}
              isHumanTurn={isHumanTurn}
              isFinished={isFinished}
              currentPlayerIndex={(board as LudoBoardState).currentPlayerIndex}
              onRollDice={ludo.handleRollDice}
              isPending={ludo.isPending}
            />
          )}
          {isGo ? (
            <GoBoard
              board={board as GoBoardState}
              onIntersectionClick={go.handleIntersectionClick}
              humanColor={humanColor}
              isHumanTurn={isHumanTurn}
              lastMove={go.lastMove}
              isFinished={isFinished}
            />
          ) : isGomoku ? (
            <GomokuBoard
              board={board as GomokuBoardState}
              onIntersectionClick={gomoku.handleIntersectionClick}
              humanColor={humanColor}
              isHumanTurn={isHumanTurn}
              lastMove={gomoku.lastMove}
              winningLine={gomoku.winningLine}
              isFinished={isFinished}
            />
          ) : isChineseChess ? (
            <ChineseChessBoard
              board={board as ChineseChessBoardState}
              selectedPieceId={chineseChess.selectedPieceId}
              validMoves={chineseChess.validMoves}
              onCellClick={chineseChess.handleCellClick}
              humanColor={humanColor}
              isInCheck={chineseChess.isInCheck}
              lastMove={chineseChess.lastMove}
            />
          ) : isChess ? (
            <ChessBoard
              board={board as ChessBoardState}
              selectedPieceId={chess.selectedPieceId}
              validMoves={chess.validMoves}
              onCellClick={chess.handleCellClick}
              humanColor={humanColor}
              isInCheck={chess.isInCheck}
              lastMove={chess.lastMove}
            />
          ) : isLudo ? (
            <LudoBoard
              board={board as LudoBoardState}
              phase={ludo.phase}
              onPieceClick={ludo.handlePieceClick}
            />
          ) : (
            <>
              {draughts.forcedCaptureHint && (
                <p className="mb-1 text-center text-xs font-extrabold text-warm-600 animate-wiggle" style={{ fontFamily: 'var(--font-display)' }}>
                  {draughts.forcedCaptureHint}
                </p>
              )}
              <Board
                board={board as BoardState}
                selectedPieceId={draughts.selectedPieceId}
                validTargets={draughts.validTargets}
                onCellClick={draughts.isAnimating ? () => {} : draughts.handleCellClick}
                humanColor={humanColor}
                animState={draughts.animState as DraughtsAnimationState | null}
                movablePieceIds={draughts.movablePieceIds}
              />
            </>
          )}
        </div>

        <aside className="w-full flex-shrink-0 lg:w-[280px]">
          <div className="sticky top-4 space-y-3">
            <GameControls
              onNewGame={() => navigate('/')}
              onUndo={() => {
                undoMutation.mutate();
                if (isChineseChess) chineseChess.resetSelection();
                else if (isChess) chess.resetSelection();
                else if (isGomoku) gomoku.resetLastMove();
                else if (isGo) go.resetLastMove();
                else if (isLudo) { }
                else draughts.resetSelection();
              }}
              onResign={() => resignMutation.mutate()}
              onPass={isGo ? go.handlePass : undefined}
              canUndo={game.moveCount >= 2 && !isFinished && !isLudo}
              isFinished={isFinished}
              isProcessing={isProcessing}
            />
            <MoveHistory gameId={gameId!} />
          </div>
        </aside>
      </div>

      {chess.isAwaitingPromotion && (
        <PromotionDialog
          color={humanColor}
          onSelect={chess.handlePromotionSelect}
          onCancel={chess.cancelPromotion}
        />
      )}
    </div>
  );
}
